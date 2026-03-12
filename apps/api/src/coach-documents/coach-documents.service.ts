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
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists.`);
    } catch {
      this.logger.log(`Bucket "${this.bucket}" not found, creating...`);
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created.`);
    }
  }

  async upload(
    file: Express.Multer.File,
    coachId: string,
  ): Promise<CoachDocument> {
    const coach = await this.coachRepository.findOne({
      where: { id: coachId },
    });
    if (!coach) throw new NotFoundException(`Coach #${coachId} not found`);

    const ext = file.originalname.split('.').pop();
    const s3Key = `coach-documents/${coachId}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return this.documentRepository.save(
      this.documentRepository.create({
        coach,
        originalName: file.originalname,
        mimeType: file.mimetype,
        s3Key,
      }),
    );
  }

  async findAll(): Promise<(CoachDocument & { url: string })[]> {
    const documents = await this.documentRepository.find();
    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        url: await this.buildPresignedUrl(doc.s3Key),
      })),
    );
  }

  async accept(id: string): Promise<{ message: string }> {
    const document = await this.findOne(id);
    await this.coachRepository.update(document.coach.id, { isApproved: true });
    await this.deleteDocument(document);
    return {
      message: `Coach ${document.coach.id} approved and document deleted.`,
    };
  }

  async refuse(id: string): Promise<{ message: string }> {
    const document = await this.findOne(id);
    await this.deleteDocument(document);
    return { message: `Document ${id} refused and deleted.` };
  }

  private async findOne(id: string): Promise<CoachDocument> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document #${id} not found`);
    return doc;
  }

  private async buildPresignedUrl(s3Key: string): Promise<string> {
    return getSignedUrl(
      this.s3Public,
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      { expiresIn: 900 },
    );
  }

  private async deleteDocument(document: CoachDocument): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: document.s3Key }),
    );
    await this.documentRepository.remove(document);
  }
}
