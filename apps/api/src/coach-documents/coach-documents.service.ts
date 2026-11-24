import {
  Injectable,
  BadRequestException,
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
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { errorMessage, errorStack } from '../utils/error';
import { extensionForContent } from '../utils/file-signature';
import { Pagination } from '../utils/pagination';
import { AuthUser } from '../auth/auth.types';
import { assertSelfOrAdmin } from '../auth/ownership';

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
    private readonly notificationsService: NotificationsService,
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
        `Bucket "${this.bucket}" not found (${errorMessage(err)}), creating...`,
      );
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created successfully.`);
      } catch (createErr) {
        this.logger.error(
          `Failed to create bucket "${this.bucket}": ${errorMessage(createErr)}`,
          errorStack(createErr),
        );
        throw createErr;
      }
    }
  }

  async upload(
    file: Express.Multer.File,
    coachId: string,
    requester: AuthUser,
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
    assertSelfOrAdmin(requester, coach.user?.id);
    this.logger.debug(`[upload] Coach #${coachId} found`);

    const ext = extensionForContent(file.mimetype, file.buffer);
    if (!ext) {
      throw new BadRequestException(
        'File content does not match its declared type',
      );
    }
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
        `[upload] S3 upload failed for key ${s3Key}: ${errorMessage(err)}`,
        errorStack(err),
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
        `[upload] Failed to save document to DB: ${errorMessage(err)}`,
        errorStack(err),
      );
      throw err;
    }
  }

  async findAll(
    page?: Pagination,
  ): Promise<(CoachDocument & { url: string })[]> {
    this.logger.debug(`[findAll] Fetching all documents from DB`);
    const documents = await this.documentRepository.find({
      order: { uploadedAt: 'ASC' },
      take: page?.limit,
      skip: page?.offset,
    });
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
            `[findAll] Failed to generate presigned URL for id=${doc.id}: ${errorMessage(err)}`,
            errorStack(err),
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

    await this.deleteStoredObject(document);

    const notification = await this.documentRepository.manager.transaction(
      async (manager) => {
        await manager
          .getRepository(Coach)
          .update(document.coach.id, { isApproved: true });
        await manager.getRepository(CoachDocument).remove(document);
        return this.notificationsService.create(
          {
            type: NotificationType.COACH_APPROVED,
            message:
              'Votre diplôme a été validé : votre profil est maintenant visible des athlètes.',
            receiver: document.coach.user,
            data: { coachId: document.coach.id },
          },
          manager,
        );
      },
    );
    this.notificationsService.publish(notification);
    this.logger.log(
      `[accept] Coach #${document.coach.id} approved, document id=${id} deleted`,
    );
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

    await this.deleteStoredObject(document);
    const notification = await this.documentRepository.manager.transaction(
      async (manager) => {
        await manager.getRepository(CoachDocument).remove(document);
        return this.notificationsService.create(
          {
            type: NotificationType.COACH_DOCUMENT_REFUSED,
            message:
              'Votre document a été refusé. Vous pouvez en envoyer un nouveau.',
            receiver: document.coach.user,
            data: { coachId: document.coach.id },
          },
          manager,
        );
      },
    );
    this.notificationsService.publish(notification);
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

  private async deleteStoredObject(document: CoachDocument): Promise<void> {
    this.logger.debug(
      `[deleteStoredObject] Deleting from S3: key=${document.s3Key}`,
    );
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: document.s3Key }),
      );
      this.logger.log(
        `[deleteStoredObject] S3 object deleted: ${document.s3Key}`,
      );
    } catch (err) {
      this.logger.error(
        `[deleteStoredObject] Failed to delete S3 object ${document.s3Key}: ${errorMessage(err)}`,
        errorStack(err),
      );
      throw err;
    }
  }
}
