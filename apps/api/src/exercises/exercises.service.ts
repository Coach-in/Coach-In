import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Exercise } from './entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { ProgrammeExercise } from '../programmes/entities/programme-exercise.entity';
import { StorageService } from '../storage/storage.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

export type ExerciseResponse = Exercise & { imageUrl: string | null };

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    @InjectRepository(ProgrammeExercise)
    private readonly programmeExerciseRepository: Repository<ProgrammeExercise>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(): Promise<ExerciseResponse[]> {
    const exercises = await this.exerciseRepository.find({
      order: { name: 'ASC' },
    });
    return Promise.all(
      exercises.map((exercise) => this.withImageUrl(exercise)),
    );
  }

  async findOne(id: string): Promise<ExerciseResponse> {
    return this.withImageUrl(await this.getExercise(id));
  }

  async create(
    userId: string,
    dto: CreateExerciseDto,
  ): Promise<ExerciseResponse> {
    const coach = await this.getCoachForUser(userId);
    await this.assertNameAvailable(dto.name);

    const exercise = await this.exerciseRepository.save(
      this.exerciseRepository.create({ ...dto, createdBy: coach }),
    );
    this.logger.log(
      `[create] Exercise ${exercise.id} created by coach ${coach.id}`,
    );
    return this.findOne(exercise.id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<ExerciseResponse> {
    const exercise = await this.getOwnedExercise(userId, id);
    if (dto.name && dto.name !== exercise.name) {
      await this.assertNameAvailable(dto.name);
    }

    await this.exerciseRepository.update(id, dto);
    this.logger.log(`[update] Exercise ${id} updated`);
    return this.findOne(id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const exercise = await this.getOwnedExercise(userId, id);

    const usages = await this.programmeExerciseRepository.count({
      where: { exercise: { id } },
    });
    if (usages > 0) {
      throw new ConflictException(
        `Exercise #${id} is used in ${usages} programme(s) and cannot be deleted`,
      );
    }

    await this.exerciseRepository.remove(exercise);
    this.logger.log(`[remove] Exercise ${id} deleted`);
    if (exercise.s3Key) await this.deleteImageSafely(exercise.s3Key);
  }

  async uploadImage(
    userId: string,
    id: string,
    file: Express.Multer.File,
  ): Promise<ExerciseResponse> {
    const exercise = await this.getOwnedExercise(userId, id);
    const previousKey = exercise.s3Key;

    const ext = file.originalname.split('.').pop();
    const s3Key = `exercises/${id}/${randomUUID()}.${ext}`;
    await this.storageService.upload(s3Key, file.buffer, file.mimetype);
    await this.exerciseRepository.update(id, { s3Key });
    this.logger.log(`[uploadImage] Image ${s3Key} set on exercise ${id}`);

    if (previousKey) await this.deleteImageSafely(previousKey);
    return this.findOne(id);
  }

  private async getExercise(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException(`Exercise #${id} not found`);
    return exercise;
  }

  // Built-in exercises (no creator) cannot be modified through the API
  private async getOwnedExercise(
    userId: string,
    id: string,
  ): Promise<Exercise> {
    const coach = await this.getCoachForUser(userId);
    const exercise = await this.getExercise(id);
    if (exercise.createdById !== coach.id) {
      throw new ForbiddenException(
        'Only the coach who created this exercise can modify it',
      );
    }
    return exercise;
  }

  private async getCoachForUser(userId: string): Promise<Coach> {
    const coach = await this.coachRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!coach) {
      throw new ForbiddenException('Only coaches can manage exercises');
    }
    return coach;
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.exerciseRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`An exercise named "${name}" already exists`);
    }
  }

  private async withImageUrl(exercise: Exercise): Promise<ExerciseResponse> {
    const imageUrl = exercise.s3Key
      ? await this.storageService.getPresignedUrl(exercise.s3Key)
      : null;
    return { ...exercise, imageUrl };
  }

  // The DB is the source of truth: an orphaned object must not fail the request
  private async deleteImageSafely(s3Key: string): Promise<void> {
    try {
      await this.storageService.delete(s3Key);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Failed to delete image ${s3Key}: ${error.message}`,
        error.stack,
      );
    }
  }
}
