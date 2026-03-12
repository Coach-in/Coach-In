import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachDocument } from './entities/coach-document.entity';
import { Coach } from '../coachs/entities/coach.entity';

@Injectable()
export class CoachDocumentsService implements OnModuleInit {
  private readonly logger = new Logger(CoachDocumentsService.name);
  private readonly s3: S3Client;
  private readonly s3Public: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(CoachDocument)
    private readonly documentRepository: Repository<CoachDocument>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'coach-documents');

    const credentials = {
      accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretAccessKey: this.config.get<string>(
        'MINIO_SECRET_KEY',
        'minioadmin',
      ),
    };

    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint: this.config.get<string>('MINIO_ENDPOINT', 'http://minio:9000'),
      credentials,
      forcePathStyle: true,
    });

    this.s3Public = new S3Client({
      region: 'us-east-1',
      endpoint: this.config.get<string>(
        'MINIO_PUBLIC_ENDPOINT',
        'http://localhost:9000',
      ),
      credentials,
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    this.logger.debug(`Checking if bucket "${this.bucket}" exists...`);
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists.`);
    } catch (err) {
      this.logger.warn(
        `Bucket "${this.bucket}" not found (${err?.message}), creating...`,
      );
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created successfully.`);
      } catch (createErr) {
        this.logger.error(
          `Failed to create bucket "${this.bucket}": ${createErr?.message}`,
          createErr?.stack,
        );
        throw createErr;
      }
    }
  }

  async upload(
    file: Express.Multer.File,
    coachId: string,
  ): Promise<CoachDocument> {
    this.logger.debug(
      `[upload] Request for coachId=${coachId}, file="${file.originalname}" (${file.mimetype}, ${file.size} bytes)`,
    );

    const coach = await this.coachRepository.findOne({
      where: { id: coachId },
    });
    if (!coach) {
      this.logger.warn(`[upload] Coach #${coachId} not found`);
      throw new NotFoundException(`Coach #${coachId} not found`);
    }
    this.logger.debug(`[upload] Coach #${coachId} found`);

    const ext = file.originalname.split('.').pop();
    const s3Key = `coach-documents/${coachId}/${uuidv4()}.${ext}`;
    this.logger.debug(`[upload] Uploading to S3 with key: ${s3Key}`);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      this.logger.log(`[upload] File uploaded to S3 successfully: ${s3Key}`);
    } catch (err) {
      this.logger.error(
        `[upload] S3 upload failed for key ${s3Key}: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }

    try {
      const document = await this.documentRepository.save(
        this.documentRepository.create({
          coach,
          originalName: file.originalname,
          mimeType: file.mimetype,
          s3Key,
        }),
      );
      this.logger.log(`[upload] Document saved to DB with id=${document.id}`);
      return document;
    } catch (err) {
      this.logger.error(
        `[upload] Failed to save document to DB: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }
  }

  async findAll(): Promise<(CoachDocument & { url: string })[]> {
    this.logger.debug(`[findAll] Fetching all documents from DB`);
    const documents = await this.documentRepository.find();
    this.logger.debug(`[findAll] Found ${documents.length} document(s)`);

    const result = await Promise.all(
      documents.map(async (doc) => {
        this.logger.debug(
          `[findAll] Generating presigned URL for document id=${doc.id}, key=${doc.s3Key}`,
        );
        try {
          const url = await this.buildPresignedUrl(doc.s3Key);
          this.logger.debug(
            `[findAll] Presigned URL generated for id=${doc.id}`,
          );
          return { ...doc, url };
        } catch (err) {
          this.logger.error(
            `[findAll] Failed to generate presigned URL for id=${doc.id}: ${err?.message}`,
            err?.stack,
          );
          throw err;
        }
      }),
    );

    this.logger.log(
      `[findAll] Returning ${result.length} document(s) with presigned URLs`,
    );
    return result;
  }

  async accept(id: string): Promise<{ message: string }> {
    this.logger.debug(`[accept] Request to accept document id=${id}`);
    const document = await this.findOne(id);
    this.logger.debug(
      `[accept] Document found, linked to coachId=${document.coach.id}`,
    );

    try {
      await this.coachRepository.update(document.coach.id, {
        isApproved: true,
      });
      this.logger.log(
        `[accept] Coach #${document.coach.id} marked as approved`,
      );
    } catch (err) {
      this.logger.error(
        `[accept] Failed to update coach approval status: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }

    await this.deleteDocument(document);
    this.logger.log(`[accept] Document id=${id} deleted after approval`);
    return {
      message: `Coach ${document.coach.id} approved and document deleted.`,
    };
  }

  async refuse(id: string): Promise<{ message: string }> {
    this.logger.debug(`[refuse] Request to refuse document id=${id}`);
    const document = await this.findOne(id);
    this.logger.debug(
      `[refuse] Document found, linked to coachId=${document.coach.id}`,
    );

    await this.deleteDocument(document);
    this.logger.log(`[refuse] Document id=${id} refused and deleted`);
    return { message: `Document ${id} refused and deleted.` };
  }

  private async findOne(id: string): Promise<CoachDocument> {
    this.logger.debug(`[findOne] Looking up document id=${id}`);
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      this.logger.warn(`[findOne] Document #${id} not found`);
      throw new NotFoundException(`Document #${id} not found`);
    }
    this.logger.debug(`[findOne] Document #${id} found`);
    return doc;
  }

  private async buildPresignedUrl(s3Key: string): Promise<string> {
    this.logger.debug(`[buildPresignedUrl] Generating URL for key=${s3Key}`);
    return getSignedUrl(
      this.s3Public,
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      { expiresIn: 900 },
    );
  }

  private async deleteDocument(document: CoachDocument): Promise<void> {
    this.logger.debug(
      `[deleteDocument] Deleting from S3: key=${document.s3Key}`,
    );
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: document.s3Key }),
      );
      this.logger.log(`[deleteDocument] S3 object deleted: ${document.s3Key}`);
    } catch (err) {
      this.logger.error(
        `[deleteDocument] Failed to delete S3 object ${document.s3Key}: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }

    try {
      await this.documentRepository.remove(document);
      this.logger.log(
        `[deleteDocument] Document id=${document.id} removed from DB`,
      );
    } catch (err) {
      this.logger.error(
        `[deleteDocument] Failed to remove document id=${document.id} from DB: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }
  }
}
