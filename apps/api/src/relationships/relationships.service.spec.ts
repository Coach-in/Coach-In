import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { RelationshipsService } from './relationships.service';
import {
  Relationship,
  RelationshipStatus,
} from './entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { User } from '../users/entities/user.entity';

describe('RelationshipsService', () => {
  let service: RelationshipsService;

  const relationshipRepositoryMock = {
    create: jest.fn((input: Partial<Relationship>) => input as Relationship),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const notificationRepositoryMock = {
    create: jest.fn((input: Partial<Notification>) => input as Notification),
    save: jest.fn(),
  };

  const athleteRepositoryMock = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const coachRepositoryMock = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const userRepositoryMock = { findOne: jest.fn() };

  const athleteUser = {
    id: 'user-athlete',
    username: 'john_athlete',
  } as User;
  const coachUser = { id: 'user-coach', username: 'jane_coach' } as User;

  const athlete = {
    id: 'athlete-1',
    user: athleteUser,
  } as Athlete;
  const coach = { id: 'coach-1', user: coachUser } as Coach;

  const dto = { athleteId: athlete.id, coachId: coach.id };

  beforeEach(async () => {
    jest.clearAllMocks();

    relationshipRepositoryMock.create.mockImplementation(
      (input: Partial<Relationship>) => input as Relationship,
    );
    notificationRepositoryMock.create.mockImplementation(
      (input: Partial<Notification>) => input as Notification,
    );
    relationshipRepositoryMock.save.mockResolvedValue({ id: 'rel-1' });
    relationshipRepositoryMock.findOne.mockResolvedValue({ id: 'rel-1' });
    athleteRepositoryMock.findOne.mockResolvedValue(athlete);
    coachRepositoryMock.findOne.mockResolvedValue(coach);
    userRepositoryMock.findOne.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve(id === athleteUser.id ? athleteUser : coachUser),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipsService,
        {
          provide: getRepositoryToken(Relationship),
          useValue:
            relationshipRepositoryMock as unknown as Repository<Relationship>,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue:
            notificationRepositoryMock as unknown as Repository<Notification>,
        },
        {
          provide: getRepositoryToken(Athlete),
          useValue: athleteRepositoryMock as unknown as Repository<Athlete>,
        },
        {
          provide: getRepositoryToken(Coach),
          useValue: coachRepositoryMock as unknown as Repository<Coach>,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock as unknown as Repository<User>,
        },
      ],
    }).compile();

    service = module.get<RelationshipsService>(RelationshipsService);
  });

  describe('create', () => {
    it('raises NotFound when the athlete does not exist', async () => {
      athleteRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(relationshipRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('raises NotFound when the coach does not exist', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(relationshipRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('persists the relationship in the pending state', async () => {
      await service.create(dto);

      expect(relationshipRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RelationshipStatus.PENDING,
        }),
      );
    });

    it('notifies the coach on the athlete behalf', async () => {
      await service.create(dto);

      expect(notificationRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'john_athlete souhaite être coaché par vous.',
          sender: athleteUser,
          receiver: coachUser,
        }),
      );
    });
  });

  describe('accept', () => {
    it('flips the status to accepted and notifies the athlete', async () => {
      const pending = {
        id: 'rel-1',
        status: RelationshipStatus.PENDING,
        athlete,
        coach,
      } as Relationship;
      relationshipRepositoryMock.findOne.mockResolvedValue(pending);

      await service.accept(pending.id);

      expect(relationshipRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RelationshipStatus.ACCEPTED }),
      );
      expect(notificationRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'jane_coach a accepté votre demande de coaching.',
          sender: coachUser,
          receiver: athleteUser,
        }),
      );
    });
  });

  describe('refuse', () => {
    it('flips the status to refused and notifies the athlete', async () => {
      const pending = {
        id: 'rel-1',
        status: RelationshipStatus.PENDING,
        athlete,
        coach,
      } as Relationship;
      relationshipRepositoryMock.findOne.mockResolvedValue(pending);

      await service.refuse(pending.id);

      expect(relationshipRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RelationshipStatus.REFUSED }),
      );
      expect(notificationRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'jane_coach a refusé votre demande de coaching.',
          sender: coachUser,
          receiver: athleteUser,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('raises NotFound for an unknown relationship', async () => {
      relationshipRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.accept('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
