import {
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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import jwt from 'jsonwebtoken';
import { TokenContent } from '../utils/types/jwt.types';
import { ProgrammesService } from './programmes.service';
import { Programme } from './entities/programme.entity';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { CreateProgrammeDayDto } from './dto/create-programme-day.dto';
import { UpdateProgrammeDayDto } from './dto/update-programme-day.dto';
import { CreateProgrammeExerciseDto } from './dto/create-programme-exercise.dto';
import { UpdateProgrammeExerciseDto } from './dto/update-programme-exercise.dto';

const programmeExample = {
  id: 'programme-uuid',
  name: 'Strength block — 6 weeks',
  objectives: 'Increase squat 1RM by 10 kg',
  startDate: '2026-10-05',
  endDate: '2026-11-15',
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  coach: {
    id: 'coach-uuid',
    specialty: 'Powerlifting',
    user: { id: 'user-coach-uuid', username: 'jane_coach', role: 'coach' },
  },
  athlete: {
    id: 'athlete-uuid',
    age: 24,
    user: { id: 'user-athlete-uuid', username: 'john', role: 'athlete' },
  },
  days: [
    {
      id: 'day-uuid',
      dayIndex: 1,
      name: 'Push day',
      notes: null,
      exercises: [
        {
          id: 'programme-exercise-uuid',
          order: 1,
          sets: 4,
          reps: 8,
          weight: 80,
          rpe: 8,
          restSeconds: 120,
          notes: null,
          exercise: { id: 'exercise-uuid', name: 'Bench press' },
        },
      ],
    },
  ],
};

const programmeIdParam = {
  name: 'id',
  example: 'programme-uuid',
  description: 'UUID of the programme',
};
const dayIdParam = {
  name: 'dayId',
  example: 'day-uuid',
  description: 'UUID of the programme day',
};
const programmeExerciseIdParam = {
  name: 'exerciseId',
  example: 'programme-exercise-uuid',
  description:
    'UUID of the exercise entry within the day (not the catalogue id)',
};

@ApiTags('Programmes')
@ApiBearerAuth('access-token')
@ApiResponse({ status: 401, description: 'Token is missing or invalid.' })
@Controller('programmes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ProgrammesController {
  private readonly logger = new Logger(ProgrammesController.name);

  constructor(
    private readonly programmesService: ProgrammesService,
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

  // ---------- Programmes ----------

  @Post()
  @ApiOperation({
    summary: 'Coach creates a programme (optionally with days and exercises)',
  })
  @ApiBody({ type: CreateProgrammeDto })
  @ApiResponse({
    status: 201,
    description: 'Programme created. A notification is sent to the athlete.',
    schema: { example: programmeExample },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload, duplicate dayIndex or unknown exercise.',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a coach or does not coach this athlete.',
  })
  @ApiResponse({ status: 404, description: 'Athlete not found.' })
  async create(
    @Headers('authorization') auth: string,
    @Body() dto: CreateProgrammeDto,
  ): Promise<Programme> {
    const userId = this.extractUserId(auth);
    const result = await this.programmesService.create(userId, dto);
    this.logger.log(`[POST /programmes] Programme created id=${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({
    summary: 'List your programmes (as coach or athlete), without days',
  })
  @ApiResponse({
    status: 200,
    schema: { example: [{ ...programmeExample, days: undefined }] },
  })
  findAll(@Headers('authorization') auth: string): Promise<Programme[]> {
    return this.programmesService.findAll(this.extractUserId(auth));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a programme with its days and exercises, in order',
  })
  @ApiParam(programmeIdParam)
  @ApiResponse({ status: 200, schema: { example: programmeExample } })
  @ApiResponse({ status: 403, description: 'Not your programme.' })
  @ApiResponse({ status: 404, description: 'Programme not found.' })
  findOne(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Programme> {
    return this.programmesService.findOne(this.extractUserId(auth), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Owning coach updates programme information' })
  @ApiParam(programmeIdParam)
  @ApiBody({ type: UpdateProgrammeDto })
  @ApiResponse({ status: 200, schema: { example: programmeExample } })
  @ApiResponse({ status: 403, description: 'Not the owning coach.' })
  @ApiResponse({ status: 404, description: 'Programme not found.' })
  update(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgrammeDto,
  ): Promise<Programme> {
    return this.programmesService.update(this.extractUserId(auth), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Owning coach deletes a programme with its days and exercises',
  })
  @ApiParam(programmeIdParam)
  @ApiResponse({ status: 204, description: 'Programme deleted.' })
  @ApiResponse({ status: 403, description: 'Not the owning coach.' })
  @ApiResponse({ status: 404, description: 'Programme not found.' })
  remove(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.programmesService.remove(this.extractUserId(auth), id);
  }

  // ---------- Days ----------

  @Post(':id/days')
  @ApiOperation({
    summary: 'Owning coach adds a day (optionally with exercises)',
  })
  @ApiParam(programmeIdParam)
  @ApiBody({ type: CreateProgrammeDayDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the updated programme.',
    schema: { example: programmeExample },
  })
  @ApiResponse({ status: 409, description: 'dayIndex already used.' })
  addDay(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgrammeDayDto,
  ): Promise<Programme> {
    return this.programmesService.addDay(this.extractUserId(auth), id, dto);
  }

  @Patch(':id/days/:dayId')
  @ApiOperation({ summary: 'Owning coach updates a day' })
  @ApiParam(programmeIdParam)
  @ApiParam(dayIdParam)
  @ApiBody({ type: UpdateProgrammeDayDto })
  @ApiResponse({ status: 200, schema: { example: programmeExample } })
  @ApiResponse({ status: 404, description: 'Day not in this programme.' })
  @ApiResponse({ status: 409, description: 'dayIndex already used.' })
  updateDay(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: UpdateProgrammeDayDto,
  ): Promise<Programme> {
    return this.programmesService.updateDay(
      this.extractUserId(auth),
      id,
      dayId,
      dto,
    );
  }

  @Delete(':id/days/:dayId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Owning coach deletes a day and its exercises' })
  @ApiParam(programmeIdParam)
  @ApiParam(dayIdParam)
  @ApiResponse({ status: 204, description: 'Day deleted.' })
  @ApiResponse({ status: 404, description: 'Day not in this programme.' })
  removeDay(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
  ): Promise<void> {
    return this.programmesService.removeDay(
      this.extractUserId(auth),
      id,
      dayId,
    );
  }

  // ---------- Exercises of a day ----------

  @Post(':id/days/:dayId/exercises')
  @ApiOperation({ summary: 'Owning coach adds an exercise to a day' })
  @ApiParam(programmeIdParam)
  @ApiParam(dayIdParam)
  @ApiBody({ type: CreateProgrammeExerciseDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the updated programme.',
    schema: { example: programmeExample },
  })
  @ApiResponse({ status: 400, description: 'Unknown catalogue exercise.' })
  @ApiResponse({ status: 404, description: 'Day not in this programme.' })
  addExercise(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: CreateProgrammeExerciseDto,
  ): Promise<Programme> {
    return this.programmesService.addExercise(
      this.extractUserId(auth),
      id,
      dayId,
      dto,
    );
  }

  @Patch(':id/days/:dayId/exercises/:exerciseId')
  @ApiOperation({ summary: 'Owning coach updates an exercise of a day' })
  @ApiParam(programmeIdParam)
  @ApiParam(dayIdParam)
  @ApiParam(programmeExerciseIdParam)
  @ApiBody({ type: UpdateProgrammeExerciseDto })
  @ApiResponse({ status: 200, schema: { example: programmeExample } })
  @ApiResponse({ status: 404, description: 'Exercise not in this day.' })
  updateExercise(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: UpdateProgrammeExerciseDto,
  ): Promise<Programme> {
    return this.programmesService.updateExercise(
      this.extractUserId(auth),
      id,
      dayId,
      exerciseId,
      dto,
    );
  }

  @Delete(':id/days/:dayId/exercises/:exerciseId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Owning coach removes an exercise from a day' })
  @ApiParam(programmeIdParam)
  @ApiParam(dayIdParam)
  @ApiParam(programmeExerciseIdParam)
  @ApiResponse({ status: 204, description: 'Exercise removed from the day.' })
  @ApiResponse({ status: 404, description: 'Exercise not in this day.' })
  removeExercise(
    @Headers('authorization') auth: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ): Promise<void> {
    return this.programmesService.removeExercise(
      this.extractUserId(auth),
      id,
      dayId,
      exerciseId,
    );
  }
}
