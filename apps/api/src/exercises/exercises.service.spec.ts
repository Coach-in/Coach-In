import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { Exercise } from './entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { ProgrammeExercise } from '../programmes/entities/programme-exercise.entity';
import { StorageService } from '../storage/storage.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  const coach = { id: 'coach-1' } as Coach;
  const ownExercise = {
    id: 'ex-1',
    name: 'Bench press',
    createdById: 'coach-1',
    s3Key: null,
  } as unknown as Exercise;

  const exerciseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<Exercise>) => data),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const coachRepository = { findOne: jest.fn() };
  const programmeExerciseRepository = { count: jest.fn() };
  const storageService = {
    upload: jest.fn(),
    delete: jest.fn(),
    getPresignedUrl: jest.fn((key: string) => Promise.resolve(`url:${key}`)),
  };

  // findOne is called by name (uniqueness check) and by id (lookup)
  const mockExercises = (...exercises: Exercise[]): void => {
    exerciseRepository.findOne.mockImplementation(
      ({ where }: { where: Partial<Exercise> }) =>
        Promise.resolve(
          exercises.find((e) =>
            where.id ? e.id === where.id : e.name === where.name,
          ) ?? null,
        ),
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    coachRepository.findOne.mockResolvedValue(coach);
    programmeExerciseRepository.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: getRepositoryToken(Exercise), useValue: exerciseRepository },
        { provide: getRepositoryToken(Coach), useValue: coachRepository },
        {
          provide: getRepositoryToken(ProgrammeExercise),
          useValue: programmeExerciseRepository,
        },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
  });

  describe('findAll', () => {
    it('adds a presigned imageUrl only to exercises with an image', async () => {
      exerciseRepository.find.mockResolvedValue([
        { id: 'a', s3Key: 'exercises/a.png' },
        { id: 'b', s3Key: null },
      ]);

      const result = await service.findAll();

      expect(result.map((e) => e.imageUrl)).toEqual([
        'url:exercises/a.png',
        null,
      ]);
    });
  });

  describe('create', () => {
    it('creates the exercise with the caller as creator', async () => {
      mockExercises();
      exerciseRepository.save.mockImplementation((data: Exercise) => {
        mockExercises({ ...data, id: 'new' });
        return Promise.resolve({ ...data, id: 'new' });
      });

      const result = await service.create('user-1', { name: 'Squat' });

      expect(exerciseRepository.save).toHaveBeenCalledWith({
        name: 'Squat',
        createdBy: coach,
      });
      expect(result.id).toBe('new');
    });

    it('rejects callers that are not coaches', async () => {
      coachRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-1', { name: 'Squat' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a duplicate name', async () => {
      mockExercises(ownExercise);

      await expect(
        service.create('user-1', { name: 'Bench press' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(exerciseRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws 404 for an unknown exercise', async () => {
      mockExercises();

      await expect(
        service.update('user-1', 'missing', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids editing an exercise created by another coach', async () => {
      mockExercises({ ...ownExercise, createdById: 'coach-2' } as Exercise);

      await expect(
        service.update('user-1', 'ex-1', { description: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids editing a built-in exercise', async () => {
      mockExercises({ ...ownExercise, createdById: null } as Exercise);

      await expect(
        service.update('user-1', 'ex-1', { description: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updates an owned exercise', async () => {
      mockExercises(ownExercise);

      await service.update('user-1', 'ex-1', { description: 'Flat bench' });

      expect(exerciseRepository.update).toHaveBeenCalledWith('ex-1', {
        description: 'Flat bench',
      });
    });
  });

  describe('remove', () => {
    it('refuses to delete an exercise used in a programme', async () => {
      mockExercises(ownExercise);
      programmeExerciseRepository.count.mockResolvedValue(2);

      await expect(service.remove('user-1', 'ex-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(exerciseRepository.remove).not.toHaveBeenCalled();
    });

    it('deletes the exercise and its image', async () => {
      const withImage = { ...ownExercise, s3Key: 'exercises/ex-1/a.png' };
      mockExercises(withImage as Exercise);

      await service.remove('user-1', 'ex-1');

      expect(exerciseRepository.remove).toHaveBeenCalledWith(withImage);
      expect(storageService.delete).toHaveBeenCalledWith(
        'exercises/ex-1/a.png',
      );
    });

    it('still succeeds when the image cannot be deleted from storage', async () => {
      mockExercises({ ...ownExercise, s3Key: 'k' } as Exercise);
      storageService.delete.mockRejectedValueOnce(new Error('minio down'));

      await expect(service.remove('user-1', 'ex-1')).resolves.toBeUndefined();
    });
  });

  describe('uploadImage', () => {
    it('stores the new image and deletes the previous one', async () => {
      mockExercises({ ...ownExercise, s3Key: 'old.png' } as Exercise);
      const file = {
        originalname: 'bench.png',
        mimetype: 'image/png',
        buffer: Buffer.from('img'),
      } as Express.Multer.File;

      await service.uploadImage('user-1', 'ex-1', file);

      const [key] = storageService.upload.mock.calls[0] as [string];
      expect(key).toMatch(/^exercises\/ex-1\/.+\.png$/);
      expect(exerciseRepository.update).toHaveBeenCalledWith('ex-1', {
        s3Key: key,
      });
      expect(storageService.delete).toHaveBeenCalledWith('old.png');
    });
  });
});
