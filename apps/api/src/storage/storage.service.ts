import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

const PRESIGNED_URL_TTL_SECONDS = 900;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  // Presigned URLs are signed against the host reachable by the browser
  private readonly s3Public: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
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

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      this.logger.warn(`Bucket "${this.bucket}" not found, creating...`);
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created successfully.`);
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`[upload] Stored object ${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`[delete] Removed object ${key}`);
  }

  getPresignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.s3Public,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_TTL_SECONDS },
    );
  }
}
