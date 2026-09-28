import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { CoachDocumentsService } from './coach-documents.service';
import { CoachDocument } from './entities/coach-document.entity';
import { Coach } from '../coachs/entities/coach.entity';

interface S3Command {
  input: Record<string, unknown>;
}

const mockSend = jest.fn<Promise<unknown>, [unknown]>();
const mockGetSignedUrl = jest.fn<
  Promise<string>,
  [unknown, unknown, unknown]
>();

jest.mock('@aws-sdk/client-s3', () => {
  const actual =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>(
      '@aws-sdk/client-s3',
    );
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (client: unknown, command: unknown, options: unknown) =>
    mockGetSignedUrl(client, command, options),
}));

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

describe('CoachDocumentsService', () => {
  let service: CoachDocumentsService;

  const documentRepositoryMock = {
    create: jest.fn((input: Partial<CoachDocument>) => input as CoachDocument),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const coachRepositoryMock = { findOne: jest.fn(), update: jest.fn() };

  const configMock = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  const coach = { id: 'coach-1' } as Coach;

  const document = {
    id: 'doc-1',
    coach,
    originalName: 'diploma.pdf',
    mimeType: 'application/pdf',
    s3Key: 'coach-documents/coach-1/fixed-uuid.pdf',
  } as CoachDocument;

  const file = {
    originalname: 'diploma.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    buffer: Buffer.from('%PDF-1.7'),
  } as Express.Multer.File;

  const commandsSent = (): S3Command[] => {
    const calls = mockSend.mock.calls;
    return calls.map((call) => call[0] as S3Command);
  };

  // Several tests assert on deliberately failing S3 calls, and the service logs
  // the underlying error before rethrowing it. Keep that noise out of the report.
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue('http://localhost:9000/presigned');
    configMock.get.mockImplementation(
      (_key: string, fallback: string) => fallback,
    );
    documentRepositoryMock.create.mockImplementation(
      (input: Partial<CoachDocument>) => input as CoachDocument,
    );
    documentRepositoryMock.save.mockImplementation((input: CoachDocument) =>
      Promise.resolve({ ...input, id: 'doc-1' }),
    );
    documentRepositoryMock.remove.mockImplementation((input: CoachDocument) =>
      Promise.resolve(input),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachDocumentsService,
        {
          provide: getRepositoryToken(CoachDocument),
          useValue:
            documentRepositoryMock as unknown as Repository<CoachDocument>,
        },
        {
          provide: getRepositoryToken(Coach),
          useValue: coachRepositoryMock as unknown as Repository<Coach>,
        },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<CoachDocumentsService>(CoachDocumentsService);
  });

  describe('onModuleInit', () => {
    it('does not create the bucket when it already exists', async () => {
      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(commandsSent()[0]).toBeInstanceOf(HeadBucketCommand);
    });

    it('creates the bucket when the head request fails', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(commandsSent()[0]).toBeInstanceOf(HeadBucketCommand);
      expect(commandsSent()[1]).toBeInstanceOf(CreateBucketCommand);
    });

    it('rethrows when the bucket cannot be created', async () => {
      mockSend.mockRejectedValue(new Error('S3 unavailable'));

      await expect(service.onModuleInit()).rejects.toThrow('S3 unavailable');
    });
  });

  describe('upload', () => {
    it('stores the file under a coach-scoped key with the right content type', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);

      await service.upload(file, coach.id);

      const put = commandsSent().find((cmd) => cmd instanceof PutObjectCommand);
      expect(put?.input).toEqual({
        Bucket: 'coach-documents',
        Key: 'coach-documents/coach-1/fixed-uuid.pdf',
        Body: file.buffer,
        ContentType: 'application/pdf',
      });
    });

    it('persists the coach, original name and generated key', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);

      const result = await service.upload(file, coach.id);

      expect(documentRepositoryMock.save).toHaveBeenCalledWith({
        coach,
        originalName: 'diploma.pdf',
        mimeType: 'application/pdf',
        s3Key: 'coach-documents/coach-1/fixed-uuid.pdf',
      });
      expect(result.id).toBe('doc-1');
    });

    it('raises NotFound and touches neither S3 nor the DB for an unknown coach', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.upload(file, 'ghost')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSend).not.toHaveBeenCalled();
      expect(documentRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('does not persist a document when the S3 upload fails', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);
      mockSend.mockRejectedValue(new Error('S3 put failed'));

      await expect(service.upload(file, coach.id)).rejects.toThrow(
        'S3 put failed',
      );
      expect(documentRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns every document with a presigned URL attached', async () => {
      documentRepositoryMock.find.mockResolvedValue([document]);

      const result = await service.findAll();

      expect(result).toEqual([
        { ...document, url: 'http://localhost:9000/presigned' },
      ]);
    });

    it('signs the document for fifteen minutes', async () => {
      documentRepositoryMock.find.mockResolvedValue([document]);

      await service.findAll();

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 900 },
      );
    });

    it('propagates a presigning failure instead of returning a broken URL', async () => {
      documentRepositoryMock.find.mockResolvedValue([document]);
      mockGetSignedUrl.mockRejectedValue(new Error('signing failed'));

      await expect(service.findAll()).rejects.toThrow('signing failed');
    });
  });

  describe('accept', () => {
    it('approves the coach, then removes the document from S3 and the DB', async () => {
      documentRepositoryMock.findOne.mockResolvedValue(document);

      const result = await service.accept(document.id);

      expect(coachRepositoryMock.update).toHaveBeenCalledWith(coach.id, {
        isApproved: true,
      });
      const del = commandsSent().find(
        (cmd) => cmd instanceof DeleteObjectCommand,
      );
      expect(del?.input).toEqual({
        Bucket: 'coach-documents',
        Key: document.s3Key,
      });
      expect(documentRepositoryMock.remove).toHaveBeenCalledWith(document);
      expect(result.message).toContain(`Coach ${coach.id} approved`);
    });

    it('raises NotFound without approving or deleting anything', async () => {
      documentRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.accept('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(coachRepositoryMock.update).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
      expect(documentRepositoryMock.remove).not.toHaveBeenCalled();
    });

    it('keeps the DB row when the S3 delete fails, leaving no orphan in S3', async () => {
      documentRepositoryMock.findOne.mockResolvedValue(document);
      mockSend.mockRejectedValue(new Error('S3 delete failed'));

      await expect(service.accept(document.id)).rejects.toThrow(
        'S3 delete failed',
      );
      expect(documentRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });

  describe('refuse', () => {
    it('deletes the document without approving the coach', async () => {
      documentRepositoryMock.findOne.mockResolvedValue(document);

      const result = await service.refuse(document.id);

      expect(coachRepositoryMock.update).not.toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(commandsSent()[0]).toBeInstanceOf(DeleteObjectCommand);
      expect(documentRepositoryMock.remove).toHaveBeenCalledWith(document);
      expect(result.message).toContain(document.id);
    });

    it('raises NotFound when the document does not exist', async () => {
      documentRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.refuse('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(documentRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
