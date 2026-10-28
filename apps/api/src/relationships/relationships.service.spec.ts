import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { RelationshipsService } from './relationships.service';
import {
  Relationship,
  RelationshipStatus,
} from './entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('RelationshipsService', () => {
  let service: RelationshipsService;

  const athleteUser = { id: 'user-a', username: 'john_athlete' } as User;
  const coachUser = { id: 'user-c', username: 'jane_coach' } as User;
  const athlete = { id: 'ath-1', user: athleteUser } as Athlete;
  const coach = { id: 'coach-1', isApproved: true, user: coachUser } as Coach;

  const athleteAuth: AuthUser = {
    id: athleteUser.id,
    email: 'john@example.com',
    role: UserRole.ATHLETE,
  };
  const coachAuth: AuthUser = {
    id: coachUser.id,
    email: 'jane@example.com',
    role: UserRole.COACH,
  };
  const strangerAuth: AuthUser = {
    id: 'user-x',
    email: 'x@example.com',
    role: UserRole.COACH,
  };

  const transactionalRelationships = {
    create: jest.fn((input: Partial<Relationship>) => input),
    save: jest.fn((input: Partial<Relationship>) =>
      Promise.resolve({ id: 'rel-1', ...input }),
    ),
  };
  const transactionalNotifications = {
    create: jest.fn((input: Partial<Notification>) => input),
    save: jest.fn((input: Partial<Notification>) => Promise.resolve(input)),
  };
  const managerMock = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Notification
        ? transactionalNotifications
        : transactionalRelationships,
    ),
  };

  const relationshipRepositoryMock = {
    findOne: jest.fn(),
    find: jest.fn(),
    manager: {
      transaction: jest.fn((work: (manager: unknown) => Promise<unknown>) =>
        work(managerMock),
      ),
    },
  };
  const athleteRepositoryMock = { findOne: jest.fn() };
  const coachRepositoryMock = { findOne: jest.fn() };

  const pending = (): Relationship =>
    ({
      id: 'rel-1',
      athlete,
      coach,
      status: RelationshipStatus.PENDING,
    }) as Relationship;

  beforeEach(async () => {
    jest.clearAllMocks();

    athleteRepositoryMock.findOne.mockResolvedValue(athlete);
    coachRepositoryMock.findOne.mockResolvedValue(coach);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipsService,
        {
          provide: getRepositoryToken(Relationship),
          useValue: relationshipRepositoryMock,
        },
        {
          provide: getRepositoryToken(Athlete),
          useValue: athleteRepositoryMock,
        },
        { provide: getRepositoryToken(Coach), useValue: coachRepositoryMock },
      ],
    }).compile();

    service = module.get<RelationshipsService>(RelationshipsService);
  });

  describe('create', () => {
    const dto = { athleteId: athlete.id, coachId: coach.id };

    it('saves a pending relationship and notifies the coach in one transaction', async () => {
      relationshipRepositoryMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pending());

      const result = await service.create(dto, athleteAuth);

      expect(relationshipRepositoryMock.manager.transaction).toHaveBeenCalled();
      expect(transactionalRelationships.create).toHaveBeenCalledWith({
        athlete,
        coach,
        status: RelationshipStatus.PENDING,
      });
      expect(transactionalNotifications.create).toHaveBeenCalledWith({
        message: 'john_athlete souhaite être coaché par vous.',
        sender: athleteUser,
        receiver: coachUser,
      });
      expect(result.id).toBe('rel-1');
    });

    it('forbids requesting a relationship for another athlete', async () => {
      await expect(service.create(dto, strangerAuth)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        relationshipRepositoryMock.manager.transaction,
      ).not.toHaveBeenCalled();
    });

    it('raises NotFound for an unknown athlete', async () => {
      athleteRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto, athleteAuth)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('raises NotFound for an unknown coach', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto, athleteAuth)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses a coach whose documents are not approved yet', async () => {
      coachRepositoryMock.findOne.mockResolvedValue({
        ...coach,
        isApproved: false,
      });

      await expect(service.create(dto, athleteAuth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses a duplicate of a pending or accepted relationship', async () => {
      relationshipRepositoryMock.findOne.mockResolvedValue(pending());

      await expect(service.create(dto, athleteAuth)).rejects.toThrow(
        ConflictException,
      );
      expect(
        relationshipRepositoryMock.manager.transaction,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the relationships where the user is the athlete or the coach', async () => {
      relationshipRepositoryMock.find.mockResolvedValue([pending()]);

      const result = await service.findAll(athleteUser.id);

      expect(relationshipRepositoryMock.find).toHaveBeenCalledWith({
        where: [
          { athlete: { user: { id: athleteUser.id } } },
          { coach: { user: { id: athleteUser.id } } },
        ],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe.each([
    ['accept', RelationshipStatus.ACCEPTED, 'a accepté'],
    ['refuse', RelationshipStatus.REFUSED, 'a refusé'],
  ] as const)('%s', (method, status, wording) => {
    it(`marks the relationship ${status} and notifies the athlete`, async () => {
      const relationship = pending();
      relationshipRepositoryMock.findOne
        .mockResolvedValueOnce(relationship)
        .mockResolvedValueOnce({ ...relationship, status });

      const result = await service[method](relationship.id, coachAuth);

      expect(transactionalRelationships.save).toHaveBeenCalledWith(
        expect.objectContaining({ status }),
      );
      expect(transactionalNotifications.create).toHaveBeenCalledWith({
        message: `jane_coach ${wording} votre demande de coaching.`,
        sender: coachUser,
        receiver: athleteUser,
      });
      expect(result.status).toBe(status);
    });

    it('raises NotFound for an unknown relationship', async () => {
      relationshipRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service[method]('missing', coachAuth)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('forbids anyone but the coach of the relationship', async () => {
      relationshipRepositoryMock.findOne.mockResolvedValue(pending());

      await expect(service[method]('rel-1', strangerAuth)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service[method]('rel-1', athleteAuth)).rejects.toThrow(
        ForbiddenException,
      );
      expect(transactionalRelationships.save).not.toHaveBeenCalled();
    });

    it('refuses to answer a request that is not pending anymore', async () => {
      relationshipRepositoryMock.findOne.mockResolvedValue({
        ...pending(),
        status: RelationshipStatus.REFUSED,
      });

      await expect(service[method]('rel-1', coachAuth)).rejects.toThrow(
        ConflictException,
      );
      expect(transactionalRelationships.save).not.toHaveBeenCalled();
    });
  });
});
