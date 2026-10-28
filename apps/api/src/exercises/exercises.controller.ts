import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import jwt from 'jsonwebtoken';
import { memoryStorage } from 'multer';
import { TokenContent } from '../utils/types/jwt.types';
import { ExerciseResponse, ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const exerciseExample = {
  id: 'exercise-uuid',
  name: 'Bench press',
  description: 'Lie on a flat bench, lower the bar to mid-chest, press up.',
  s3Key: 'exercises/exercise-uuid/file-uuid.png',
  createdById: 'coach-uuid',
  createdAt: '2026-09-29T10:00:00.000Z',
  imageUrl:
    'http://localhost:9000/coach-documents/exercises/...?X-Amz-Signature=...',
};

const idParam = {
  name: 'id',
  example: 'exercise-uuid',
  description: 'UUID of the exercise',
};

@ApiTags('Exercises')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Token is missing or invalid.' })
@Controller('exercices')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ExercisesController {
  private readonly logger = new Logger(ExercisesController.name);

  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly config: ConfigService,
  ) {}

  private extractUserId(authHeader: string): string {
    const [name, token] = authHeader?.split(' ') ?? [];
    if (name !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token is missing or invalid');
    }
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    try {
      const payload = jwt.verify(token, secret) as TokenContent;
      return payload.userId;
    } catch {
      throw new UnauthorizedException('Token is missing or invalid');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List the exercise catalogue' })
  @ApiResponse({
    status: 200,
    description: 'All exercises sorted by name, with a 15 min image URL.',
    schema: { example: [exerciseExample] },
  })
  findAll(@Headers('authorization') auth: string): Promise<ExerciseResponse[]> {
    this.extractUserId(auth);
    return this.exercisesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one exercise' })
  @ApiParam(idParam)
  @ApiResponse({ status: 200, schema: { example: exerciseExample } })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  findOne(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExerciseResponse> {
    this.extractUserId(auth);
    return this.exercisesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Coach adds an exercise to the catalogue' })
  @ApiBody({ type: CreateExerciseDto })
  @ApiResponse({ status: 201, schema: { example: exerciseExample } })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 403, description: 'Caller is not a coach.' })
  @ApiResponse({ status: 409, description: 'Name already used.' })
  async create(
    @Headers('authorization') auth: string,
    @Body() dto: CreateExerciseDto,
  ): Promise<ExerciseResponse> {
    const userId = this.extractUserId(auth);
    const result = await this.exercisesService.create(userId, dto);
    this.logger.log(`[POST /exercices] Exercise created id=${result.id}`);
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Creator coach updates an exercise' })
  @ApiParam(idParam)
  @ApiBody({ type: UpdateExerciseDto })
  @ApiResponse({ status: 200, schema: { example: exerciseExample } })
  @ApiResponse({ status: 403, description: 'Caller did not create it.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  @ApiResponse({ status: 409, description: 'Name already used.' })
  update(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<ExerciseResponse> {
    const userId = this.extractUserId(auth);
    return this.exercisesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Creator coach deletes an exercise' })
  @ApiParam(idParam)
  @ApiResponse({ status: 204, description: 'Exercise deleted.' })
  @ApiResponse({ status: 403, description: 'Caller did not create it.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  @ApiResponse({ status: 409, description: 'Exercise used in a programme.' })
  remove(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const userId = this.extractUserId(auth);
    return this.exercisesService.remove(userId, id);
  }

  @Post(':id/image')
  @ApiOperation({
    summary: 'Creator coach uploads or replaces the exercise image',
  })
  @ApiParam(idParam)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PNG, JPEG or WEBP (max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, schema: { example: exerciseExample } })
  @ApiResponse({ status: 400, description: 'Invalid or missing file.' })
  @ApiResponse({ status: 403, description: 'Caller did not create it.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PNG, JPEG and WEBP images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadImage(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ExerciseResponse> {
    const userId = this.extractUserId(auth);
    if (!file) throw new BadRequestException('File is required');
    return this.exercisesService.uploadImage(userId, id, file);
  }
}
