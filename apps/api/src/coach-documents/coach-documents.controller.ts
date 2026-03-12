import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CoachDocumentsService } from './coach-documents.service';

const documentExample = {
  id: 'doc-uuid-1234',
  originalName: 'diploma.pdf',
  mimeType: 'application/pdf',
  s3Key: 'coach-documents/coach-uuid/file-uuid.pdf',
  uploadedAt: '2026-03-11T12:00:00.000Z',
  url: 'http://localhost:9000/coach-documents/...?X-Amz-Signature=...',
  coach: { id: 'coach-uuid', specialty: 'Tennis', isApproved: false },
};

@ApiTags('Coach Documents')
@Controller('coach-documents')
export class CoachDocumentsController {
  private readonly logger = new Logger(CoachDocumentsController.name);

  constructor(private readonly coachDocumentsService: CoachDocumentsService) {}

  @Post('upload/:coachId')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Coach uploads a legal document (PNG, JPEG or PDF)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'coachId',
    example: 'coach-uuid',
    description: 'UUID of the coach',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PNG, JPEG or PDF (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded, pending admin review.',
    schema: { example: documentExample },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing file.',
  })
  @ApiResponse({ status: 404, description: 'Coach not found.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only PNG, JPEG and PDF files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @Param('coachId') coachId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.debug(`[POST /upload/${coachId}] Received upload request`);
    if (!file) {
      this.logger.warn(`[POST /upload/${coachId}] No file provided`);
      throw new BadRequestException('File is required');
    }
    this.logger.debug(
      `[POST /upload/${coachId}] File: "${file.originalname}", type=${file.mimetype}, size=${file.size}`,
    );
    const result = await this.coachDocumentsService.upload(file, coachId);
    this.logger.log(
      `[POST /upload/${coachId}] Upload successful, documentId=${result.id}`,
    );
    return result;
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all pending documents with presigned URLs (admin only)',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of all documents, each with a presigned URL valid for 15 minutes.',
    schema: { example: [documentExample] },
  })
  findAll() {
    this.logger.debug(
      `[GET /coach-documents] Received request to list all documents`,
    );
    return this.coachDocumentsService.findAll();
  }

  @Post(':id/accept')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin accepts a document — sets coach as approved and deletes the document',
  })
  @ApiParam({
    name: 'id',
    example: 'doc-uuid-1234',
    description: 'UUID of the document',
  })
  @ApiResponse({
    status: 201,
    description: 'Coach approved, document deleted.',
    schema: {
      example: { message: 'Coach coach-uuid approved and document deleted.' },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  accept(@Param('id') id: string) {
    this.logger.debug(`[POST /${id}/accept] Received accept request`);
    return this.coachDocumentsService.accept(id);
  }

  @Post(':id/refuse')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin refuses a document — deletes it without approving the coach',
  })
  @ApiParam({
    name: 'id',
    example: 'doc-uuid-1234',
    description: 'UUID of the document',
  })
  @ApiResponse({
    status: 201,
    description: 'Document refused and deleted.',
    schema: {
      example: { message: 'Document doc-uuid-1234 refused and deleted.' },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  refuse(@Param('id') id: string) {
    this.logger.debug(`[POST /${id}/refuse] Received refuse request`);
    return this.coachDocumentsService.refuse(id);
  }
}
