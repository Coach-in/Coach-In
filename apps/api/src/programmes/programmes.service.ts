import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { Programme } from './entities/programme.entity';
import { ProgrammeDay } from './entities/programme-day.entity';
import { ProgrammeExercise } from './entities/programme-exercise.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { User } from '../users/entities/user.entity';
import {
  Relationship,
  RelationshipStatus,
} from '../relationships/entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { CreateProgrammeDayDto } from './dto/create-programme-day.dto';
import { UpdateProgrammeDayDto } from './dto/update-programme-day.dto';
import { CreateProgrammeExerciseDto } from './dto/create-programme-exercise.dto';
import { UpdateProgrammeExerciseDto } from './dto/update-programme-exercise.dto';

@Injectable()
export class ProgrammesService {
  private readonly logger = new Logger(ProgrammesService.name);

  constructor(
    @InjectRepository(Programme)
    private readonly programmeRepository: Repository<Programme>,
    @InjectRepository(ProgrammeDay)
    private readonly dayRepository: Repository<ProgrammeDay>,
    @InjectRepository(ProgrammeExercise)
    private readonly programmeExerciseRepository: Repository<ProgrammeExercise>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  // ---------- Programmes ----------

  async create(userId: string, dto: CreateProgrammeDto): Promise<Programme> {
    const coach = await this.getCoachForUser(userId);

    const athlete = await this.athleteRepository.findOne({
      where: { id: dto.athleteId },
    });
    if (!athlete) {
      throw new NotFoundException(`Athlete #${dto.athleteId} not found`);
    }

    const relationship = await this.relationshipRepository.findOne({
      where: {
        coach: { id: coach.id },
        athlete: { id: athlete.id },
        status: RelationshipStatus.ACCEPTED,
      },
    });
    if (!relationship) {
      throw new ForbiddenException(
        'You can only create programmes for athletes you coach',
      );
    }

    this.assertDateRange(dto.startDate, dto.endDate);
    const days = dto.days ?? [];
    this.assertUniqueDayIndexes(days);
    await this.assertExercisesExist(
      days.flatMap((day) => (day.exercises ?? []).map((e) => e.exerciseId)),
    );

    // Single save: TypeORM cascades days and exercises inside one transaction
    const programme = await this.programmeRepository.save(
      this.programmeRepository.create({
        name: dto.name,
        objectives: dto.objectives,
        startDate: dto.startDate,
        endDate: dto.endDate,
        coach,
        athlete,
        days: days.map((day) => this.toDayEntity(day)),
      }),
    );
    this.logger.log(
      `[create] Programme ${programme.id} created by coach ${coach.id} for athlete ${athlete.id}`,
    );

    await this.notificationRepository.save(
      this.notificationRepository.create({
        message: `${coach.user.username} vous a créé un nouveau programme : ${programme.name}.`,
        sender: coach.user,
        receiver: athlete.user,
      }),
    );

    return this.findOne(userId, programme.id);
  }

  async findAll(userId: string): Promise<Programme[]> {
    const programmes = await this.programmeRepository.find({
      where: [
        { coach: { user: { id: userId } } },
        { athlete: { user: { id: userId } } },
      ],
      order: { createdAt: 'DESC' },
    });
    return programmes.map((programme) => this.stripCredentials(programme));
  }

  async findOne(userId: string, id: string): Promise<Programme> {
    const programme = await this.programmeRepository.findOne({
      where: { id },
      relations: { days: { exercises: { exercise: true } } },
      order: { days: { dayIndex: 'ASC', exercises: { order: 'ASC' } } },
    });
    if (!programme) throw new NotFoundException(`Programme #${id} not found`);

    const isCoach = programme.coach.user.id === userId;
    const isAthlete = programme.athlete.user.id === userId;
    if (!isCoach && !isAthlete) {
      throw new ForbiddenException('You do not have access to this programme');
    }
    return this.stripCredentials(programme);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateProgrammeDto,
  ): Promise<Programme> {
    const programme = await this.getOwnedProgramme(userId, id);
    this.assertDateRange(
      dto.startDate ?? programme.startDate,
      dto.endDate ?? programme.endDate,
    );

    if (this.hasChanges(dto)) await this.programmeRepository.update(id, dto);
    this.logger.log(`[update] Programme ${id} updated`);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const programme = await this.getOwnedProgramme(userId, id);
    // Days and prescriptions are removed by the ON DELETE CASCADE foreign keys
    await this.programmeRepository.remove(programme);
    this.logger.log(`[remove] Programme ${id} deleted`);
  }

  // ---------- Days ----------

  async addDay(
    userId: string,
    programmeId: string,
    dto: CreateProgrammeDayDto,
  ): Promise<Programme> {
    const programme = await this.getOwnedProgramme(userId, programmeId);
    await this.assertDayIndexAvailable(programmeId, dto.dayIndex);
    await this.assertExercisesExist(
      (dto.exercises ?? []).map((e) => e.exerciseId),
    );

    await this.dayRepository.save(
      this.dayRepository.create({ ...this.toDayEntity(dto), programme }),
    );
    this.logger.log(`[addDay] Day ${dto.dayIndex} added to ${programmeId}`);
    return this.findOne(userId, programmeId);
  }

  async updateDay(
    userId: string,
    programmeId: string,
    dayId: string,
    dto: UpdateProgrammeDayDto,
  ): Promise<Programme> {
    await this.getOwnedProgramme(userId, programmeId);
    const day = await this.getDay(programmeId, dayId);
    if (dto.dayIndex !== undefined && dto.dayIndex !== day.dayIndex) {
      await this.assertDayIndexAvailable(programmeId, dto.dayIndex);
    }

    if (this.hasChanges(dto)) await this.dayRepository.update(dayId, dto);
    return this.findOne(userId, programmeId);
  }

  async removeDay(
    userId: string,
    programmeId: string,
    dayId: string,
  ): Promise<void> {
    await this.getOwnedProgramme(userId, programmeId);
    const day = await this.getDay(programmeId, dayId);
    await this.dayRepository.remove(day);
    this.logger.log(`[removeDay] Day ${dayId} removed from ${programmeId}`);
  }

  // ---------- Exercises of a day ----------

  async addExercise(
    userId: string,
    programmeId: string,
    dayId: string,
    dto: CreateProgrammeExerciseDto,
  ): Promise<Programme> {
    await this.getOwnedProgramme(userId, programmeId);
    const day = await this.getDay(programmeId, dayId);
    await this.assertExercisesExist([dto.exerciseId]);

    await this.programmeExerciseRepository.save(
      this.programmeExerciseRepository.create({
        ...this.toProgrammeExerciseEntity(dto),
        day,
      }),
    );
    return this.findOne(userId, programmeId);
  }

  async updateExercise(
    userId: string,
    programmeId: string,
    dayId: string,
    id: string,
    dto: UpdateProgrammeExerciseDto,
  ): Promise<Programme> {
    await this.getOwnedProgramme(userId, programmeId);
    await this.getDay(programmeId, dayId);
    await this.getProgrammeExercise(dayId, id);

    const { exerciseId, ...fields } = dto;
    if (exerciseId) await this.assertExercisesExist([exerciseId]);

    const changes = {
      ...fields,
      ...(exerciseId && { exercise: { id: exerciseId } }),
    };
    if (this.hasChanges(changes)) {
      await this.programmeExerciseRepository.update(id, changes);
    }
    return this.findOne(userId, programmeId);
  }

  async removeExercise(
    userId: string,
    programmeId: string,
    dayId: string,
    id: string,
  ): Promise<void> {
    await this.getOwnedProgramme(userId, programmeId);
    await this.getDay(programmeId, dayId);
    const programmeExercise = await this.getProgrammeExercise(dayId, id);
    await this.programmeExerciseRepository.remove(programmeExercise);
  }

  // ---------- Helpers ----------

  private async getCoachForUser(userId: string): Promise<Coach> {
    const coach = await this.coachRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!coach) {
      throw new ForbiddenException('Only coaches can manage programmes');
    }
    return coach;
  }

  private async getOwnedProgramme(
    userId: string,
    id: string,
  ): Promise<Programme> {
    const programme = await this.programmeRepository.findOne({
      where: { id },
    });
    if (!programme) throw new NotFoundException(`Programme #${id} not found`);
    if (programme.coach.user.id !== userId) {
      throw new ForbiddenException(
        'Only the coach who created this programme can modify it',
      );
    }
    return programme;
  }

  private async getDay(
    programmeId: string,
    dayId: string,
  ): Promise<ProgrammeDay> {
    const day = await this.dayRepository.findOne({
      where: { id: dayId, programme: { id: programmeId } },
    });
    if (!day) {
      throw new NotFoundException(
        `Day #${dayId} not found in programme #${programmeId}`,
      );
    }
    return day;
  }

  private async getProgrammeExercise(
    dayId: string,
    id: string,
  ): Promise<ProgrammeExercise> {
    const programmeExercise = await this.programmeExerciseRepository.findOne({
      where: { id, day: { id: dayId } },
    });
    if (!programmeExercise) {
      throw new NotFoundException(`Exercise #${id} not found in day #${dayId}`);
    }
    return programmeExercise;
  }

  private assertDateRange(startDate: string, endDate?: string | null): void {
    // ISO dates (YYYY-MM-DD) compare correctly as strings
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private assertUniqueDayIndexes(days: CreateProgrammeDayDto[]): void {
    const indexes = days.map((day) => day.dayIndex);
    const duplicates = indexes.filter(
      (index, i) => indexes.indexOf(index) !== i,
    );
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate dayIndex in payload: ${[...new Set(duplicates)].join(', ')}`,
      );
    }
  }

  private async assertDayIndexAvailable(
    programmeId: string,
    dayIndex: number,
  ): Promise<void> {
    const existing = await this.dayRepository.findOne({
      where: { programme: { id: programmeId }, dayIndex },
    });
    if (existing) {
      throw new ConflictException(
        `Day ${dayIndex} already exists in this programme`,
      );
    }
  }

  private async assertExercisesExist(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;

    const found = await this.exerciseRepository.find({
      where: { id: In(uniqueIds) },
      select: { id: true },
    });
    const foundIds = new Set(found.map((exercise) => exercise.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown exercise id(s): ${missing.join(', ')}`,
      );
    }
  }

  // TypeORM rejects update() with an empty object
  private hasChanges(dto: object): boolean {
    return Object.keys(dto).length > 0;
  }

  private toDayEntity(dto: CreateProgrammeDayDto): DeepPartial<ProgrammeDay> {
    const { exercises, ...fields } = dto;
    return {
      ...fields,
      exercises: (exercises ?? []).map((exercise) =>
        this.toProgrammeExerciseEntity(exercise),
      ),
    };
  }

  private toProgrammeExerciseEntity(
    dto: CreateProgrammeExerciseDto,
  ): DeepPartial<ProgrammeExercise> {
    const { exerciseId, ...fields } = dto;
    return { ...fields, exercise: { id: exerciseId } };
  }

  // Coach and Athlete eagerly load their User, which includes the password
  // hash and refresh token: never send those back to the client
  private stripCredentials(programme: Programme): Programme {
    for (const user of [programme.coach?.user, programme.athlete?.user]) {
      if (!user) continue;
      delete (user as Partial<User>).password;
      delete (user as Partial<User>).refresh_token;
    }
    return programme;
  }
}
