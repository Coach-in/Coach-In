import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProgrammesService } from './programmes.service';
import { Programme } from './entities/programme.entity';
import { ProgrammeDay } from './entities/programme-day.entity';
import { ProgrammeExercise } from './entities/programme-exercise.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Relationship } from '../relationships/entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { CreateProgrammeDto } from './dto/create-programme.dto';

type Mock = jest.Mock;
interface RepoMock {
  find: Mock;
  findOne: Mock;
  create: Mock;
  save: Mock;
  update: Mock;
  remove: Mock;
}

const repoMock = (): RepoMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: object) => data),
  save: jest.fn((data: object) => Promise.resolve({ id: 'saved', ...data })),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('ProgrammesService', () => {
  let service: ProgrammesService;

  const coachUser = { id: 'user-coach', username: 'jane', password: 'hash' };
  const athleteUser = { id: 'user-athlete', username: 'john' };
  const coach = { id: 'coach-1', user: coachUser } as unknown as Coach;
  const athlete = { id: 'athlete-1', user: athleteUser } as unknown as Athlete;
  const programme = {
    id: 'prog-1',
    name: 'Block',
    startDate: '2026-10-05',
    endDate: null,
    coach,
    athlete,
  } as unknown as Programme;

  const programmes = repoMock();
  const days = repoMock();
  const programmeExercises = repoMock();
  const exercises = repoMock();
  const coaches = repoMock();
  const athletes = repoMock();
  const relationships = repoMock();
  const notifications = repoMock();

  const baseDto: CreateProgrammeDto = {
    athleteId: 'athlete-1',
    name: 'Block',
    startDate: '2026-10-05',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    coaches.findOne.mockResolvedValue(coach);
    athletes.findOne.mockResolvedValue(athlete);
    relationships.findOne.mockResolvedValue({ id: 'rel-1' });
    programmes.findOne.mockResolvedValue({ ...programme });
    exercises.find.mockResolvedValue([]);
    days.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgrammesService,
        { provide: getRepositoryToken(Programme), useValue: programmes },
        { provide: getRepositoryToken(ProgrammeDay), useValue: days },
        {
          provide: getRepositoryToken(ProgrammeExercise),
          useValue: programmeExercises,
        },
        { provide: getRepositoryToken(Exercise), useValue: exercises },
        { provide: getRepositoryToken(Coach), useValue: coaches },
        { provide: getRepositoryToken(Athlete), useValue: athletes },
        { provide: getRepositoryToken(Relationship), useValue: relationships },
        { provide: getRepositoryToken(Notification), useValue: notifications },
      ],
    }).compile();

    service = module.get<ProgrammesService>(ProgrammesService);
  });

  describe('create', () => {
    it('saves days and exercises in one call and notifies the athlete', async () => {
      exercises.find.mockResolvedValue([{ id: 'ex-1' }]);

      await service.create(coachUser.id, {
        ...baseDto,
        days: [
          {
            dayIndex: 1,
            exercises: [{ exerciseId: 'ex-1', order: 1, sets: 4, reps: 8 }],
          },
        ],
      });

      expect(programmes.save).toHaveBeenCalledTimes(1);
      expect(programmes.save).toHaveBeenCalledWith(
        expect.objectContaining({
          coach,
          athlete,
          days: [
            {
              dayIndex: 1,
              exercises: [
                { order: 1, sets: 4, reps: 8, exercise: { id: 'ex-1' } },
              ],
            },
          ],
        }),
      );
      expect(notifications.save).toHaveBeenCalledWith(
        expect.objectContaining({ sender: coachUser, receiver: athleteUser }),
      );
    });

    it('rejects callers that are not coaches', async () => {
      coaches.findOne.mockResolvedValue(null);

      await expect(service.create('user-x', baseDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns 404 for an unknown athlete', async () => {
      athletes.findOne.mockResolvedValue(null);

      await expect(
        service.create(coachUser.id, baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires an accepted relationship with the athlete', async () => {
      relationships.findOne.mockResolvedValue(null);

      await expect(
        service.create(coachUser.id, baseDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(programmes.save).not.toHaveBeenCalled();
    });

    it('rejects an endDate before the startDate', async () => {
      await expect(
        service.create(coachUser.id, { ...baseDto, endDate: '2026-10-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate dayIndex values in the payload', async () => {
      await expect(
        service.create(coachUser.id, {
          ...baseDto,
          days: [{ dayIndex: 1 }, { dayIndex: 1 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unknown catalogue exercises', async () => {
      exercises.find.mockResolvedValue([{ id: 'ex-1' }]);

      await expect(
        service.create(coachUser.id, {
          ...baseDto,
          days: [
            {
              dayIndex: 1,
              exercises: [
                { exerciseId: 'ex-1', order: 1, sets: 3, reps: 5 },
                { exerciseId: 'ex-404', order: 2, sets: 3, reps: 5 },
              ],
            },
          ],
        }),
      ).rejects.toThrow('ex-404');
    });
  });

  describe('findOne', () => {
    it('lets the athlete read the programme without credentials', async () => {
      const result = await service.findOne(athleteUser.id, 'prog-1');

      expect(result.id).toBe('prog-1');
      expect(result.coach.user).not.toHaveProperty('password');
    });

    it('forbids users outside the programme', async () => {
      await expect(
        service.findOne('someone-else', 'prog-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 for an unknown programme', async () => {
      programmes.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(coachUser.id, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update / remove', () => {
    it('forbids the athlete from modifying the programme', async () => {
      await expect(
        service.update(athleteUser.id, 'prog-1', { name: 'Hacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.remove(athleteUser.id, 'prog-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(programmes.update).not.toHaveBeenCalled();
      expect(programmes.remove).not.toHaveBeenCalled();
    });

    it('checks the date range against the stored startDate', async () => {
      await expect(
        service.update(coachUser.id, 'prog-1', { endDate: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('skips the write for an empty body', async () => {
      await service.update(coachUser.id, 'prog-1', {});

      expect(programmes.update).not.toHaveBeenCalled();
    });
  });

  describe('days', () => {
    it('rejects a dayIndex already used in the programme', async () => {
      days.findOne.mockResolvedValue({ id: 'day-1', dayIndex: 1 });

      await expect(
        service.addDay(coachUser.id, 'prog-1', { dayIndex: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 404 for a day of another programme', async () => {
      await expect(
        service.removeDay(coachUser.id, 'prog-1', 'foreign-day'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(days.remove).not.toHaveBeenCalled();
    });
  });

  describe('exercises of a day', () => {
    beforeEach(() => {
      days.findOne.mockResolvedValue({ id: 'day-1', dayIndex: 1 });
    });

    it('returns 404 for an exercise entry of another day', async () => {
      programmeExercises.findOne.mockResolvedValue(null);

      await expect(
        service.removeExercise(coachUser.id, 'prog-1', 'day-1', 'pe-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('can swap the catalogue exercise of an entry', async () => {
      programmeExercises.findOne.mockResolvedValue({ id: 'pe-1' });
      exercises.find.mockResolvedValue([{ id: 'ex-2' }]);

      await service.updateExercise(coachUser.id, 'prog-1', 'day-1', 'pe-1', {
        exerciseId: 'ex-2',
        reps: 10,
      });

      expect(programmeExercises.update).toHaveBeenCalledWith('pe-1', {
        reps: 10,
        exercise: { id: 'ex-2' },
      });
    });
  });
});
