import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';

import { NotificationsService } from './notifications.service';
import { NotificationsStream } from './notifications-stream.service';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const queryBuilderMock = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    execute: jest.fn(),
  };

  const notificationRepositoryMock = {
    create: jest.fn((input: Partial<Notification>) => input as Notification),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const streamMock = { publish: jest.fn() };

  const receiver = { id: 'user-1', username: 'john_athlete' } as User;
  const sender = { id: 'user-2', username: 'jane_coach' } as User;

  const notification = (overrides: Partial<Notification> = {}) =>
    ({
      id: '3f0c2a1e-0000-4000-8000-000000000001',
      message: 'jane_coach a accepté votre demande de coaching.',
      type: NotificationType.RELATIONSHIP_ACCEPTED,
      data: null,
      link: null,
      status: NotificationStatus.UNSEEN,
      readAt: null,
      sentAt: new Date('2026-03-11T12:00:00.123Z'),
      sender,
      receiver,
      ...overrides,
    }) as Notification;

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationRepositoryMock.createQueryBuilder.mockReturnValue(
      queryBuilderMock,
    );
    notificationRepositoryMock.save.mockImplementation((n: Notification) =>
      Promise.resolve(n),
    );
    queryBuilderMock.getMany.mockResolvedValue([]);
    queryBuilderMock.execute.mockResolvedValue({ affected: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepositoryMock,
        },
        { provide: NotificationsStream, useValue: streamMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('persists the notification with empty data and link by default', async () => {
      await service.create({
        type: NotificationType.COACH_APPROVED,
        message: 'Votre diplôme a été validé',
        receiver,
      });

      expect(notificationRepositoryMock.create).toHaveBeenCalledWith({
        type: NotificationType.COACH_APPROVED,
        message: 'Votre diplôme a été validé',
        receiver,
        data: null,
        link: null,
      });
      expect(notificationRepositoryMock.save).toHaveBeenCalledTimes(1);
    });

    it('keeps the sender, data and link when provided', async () => {
      await service.create({
        type: NotificationType.RELATIONSHIP_REQUESTED,
        message: 'john souhaite être coaché par vous.',
        sender,
        receiver,
        data: { relationshipId: 'rel-1' },
        link: '/relationships/rel-1',
      });

      expect(notificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sender,
          data: { relationshipId: 'rel-1' },
          link: '/relationships/rel-1',
        }),
      );
    });

    it('uses the repository of the given transaction manager', async () => {
      const transactionalRepository = {
        create: jest.fn((input: Partial<Notification>) => input),
        save: jest.fn((input: Partial<Notification>) => Promise.resolve(input)),
      };
      const manager = {
        getRepository: jest.fn(() => transactionalRepository),
      } as unknown as EntityManager;

      await service.create(
        { type: NotificationType.GENERIC, message: 'hello', receiver },
        manager,
      );

      expect(transactionalRepository.save).toHaveBeenCalledTimes(1);
      expect(notificationRepositoryMock.save).not.toHaveBeenCalled();
    });

    it.each(['//evil.example', 'https://evil.example', 'javascript:alert(1)'])(
      'refuses the unsafe link %s without saving anything',
      async (link) => {
        await expect(
          service.create({
            type: NotificationType.GENERIC,
            message: 'hello',
            receiver,
            link,
          }),
        ).rejects.toThrow('Unsafe notification link');
        expect(notificationRepositoryMock.save).not.toHaveBeenCalled();
      },
    );

    it('does not publish by itself, so callers can publish after their commit', async () => {
      await service.create({
        type: NotificationType.GENERIC,
        message: 'hello',
        receiver,
      });

      expect(streamMock.publish).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('forwards the notification to the live stream', () => {
      const created = notification();

      service.publish(created);

      expect(streamMock.publish).toHaveBeenCalledWith(created);
    });
  });

  describe('findMyNotifications', () => {
    it('scopes the query to the receiver and sorts newest first with a stable tie-breaker', async () => {
      await service.findMyNotifications(receiver.id);

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'receiver.id = :userId',
        { userId: receiver.id },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'notification.sentAt',
        'DESC',
      );
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith(
        'notification.id',
        'DESC',
      );
    });

    it('returns the whole list without limit and without next cursor', async () => {
      queryBuilderMock.getMany.mockResolvedValue([notification()]);

      const page = await service.findMyNotifications(receiver.id);

      expect(queryBuilderMock.limit).not.toHaveBeenCalled();
      expect(page.items).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });

    it('returns an empty page when the user has no notifications', async () => {
      await expect(
        service.findMyNotifications('user-with-none'),
      ).resolves.toEqual({
        items: [],
        nextCursor: null,
      });
    });

    it('reads one extra row to know whether another page exists', async () => {
      await service.findMyNotifications(receiver.id, { limit: 2 });

      expect(queryBuilderMock.limit).toHaveBeenCalledWith(3);
    });

    it('trims the extra row and builds a cursor from the last returned item', async () => {
      const first = notification({
        id: '3f0c2a1e-0000-4000-8000-000000000003',
      });
      const second = notification({
        id: '3f0c2a1e-0000-4000-8000-000000000002',
      });
      const extra = notification({
        id: '3f0c2a1e-0000-4000-8000-000000000001',
      });
      queryBuilderMock.getMany.mockResolvedValue([first, second, extra]);

      const page = await service.findMyNotifications(receiver.id, { limit: 2 });

      expect(page.items).toEqual([first, second]);
      expect(
        Buffer.from(page.nextCursor as string, 'base64url').toString('utf8'),
      ).toBe(`${second.sentAt.toISOString()}|${second.id}`);
    });

    it('has no next cursor on the last page', async () => {
      queryBuilderMock.getMany.mockResolvedValue([
        notification(),
        notification({ id: '3f0c2a1e-0000-4000-8000-000000000002' }),
      ]);

      const page = await service.findMyNotifications(receiver.id, { limit: 2 });

      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
    });

    it('resumes after the cursor, comparing date then id', async () => {
      const last = notification();
      const cursor = Buffer.from(
        `${last.sentAt.toISOString()}|${last.id}`,
      ).toString('base64url');

      await service.findMyNotifications(receiver.id, { limit: 2, cursor });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(notification.sentAt < :sentAt OR (notification.sentAt = :sentAt AND notification.id < :id))',
        { sentAt: last.sentAt, id: last.id },
      );
    });

    it('rejects a cursor that was not issued by the API', async () => {
      await expect(
        service.findMyNotifications(receiver.id, { cursor: 'not-a-cursor' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('only returns unread notifications when asked to', async () => {
      await service.findMyNotifications(receiver.id, { unread: true });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'notification.readAt IS NULL',
      );
    });
  });

  describe('unreadCount', () => {
    it('counts the unread notifications of the user', async () => {
      notificationRepositoryMock.count.mockResolvedValue(3);

      await expect(service.unreadCount(receiver.id)).resolves.toBe(3);
      expect(notificationRepositoryMock.count).toHaveBeenCalledWith({
        where: { receiver: { id: receiver.id }, readAt: IsNull() },
      });
    });
  });

  describe('markAsSeen', () => {
    it('flips the status to seen and stores when it was read', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(notification());

      const result = await service.markAsSeen('id', receiver.id);

      expect(result.status).toBe(NotificationStatus.SEEN);
      expect(result.readAt).toBeInstanceOf(Date);
      expect(notificationRepositoryMock.save).toHaveBeenCalledTimes(1);
    });

    it('keeps the first read date when called again', async () => {
      const readAt = new Date('2026-03-12T08:00:00.000Z');
      notificationRepositoryMock.findOne.mockResolvedValue(
        notification({ status: NotificationStatus.SEEN, readAt }),
      );

      const result = await service.markAsSeen('id', receiver.id);

      expect(result.readAt).toBe(readAt);
      expect(notificationRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('only looks up notifications owned by the requester', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.markAsSeen('id', 'someone-else')).rejects.toThrow(
        NotFoundException,
      );
      expect(notificationRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: 'id', receiver: { id: 'someone-else' } },
      });
    });

    it('raises NotFound when the notification does not exist', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.markAsSeen('missing', receiver.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(notificationRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsSeen', () => {
    it('updates only the unread notifications of the user and reports how many', async () => {
      queryBuilderMock.execute.mockResolvedValue({ affected: 4 });

      await expect(service.markAllAsSeen(receiver.id)).resolves.toBe(4);

      expect(queryBuilderMock.set).toHaveBeenCalledWith({
        status: NotificationStatus.SEEN,
        readAt: expect.any(Date) as Date,
      });
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'receiver_id = :userId',
        { userId: receiver.id },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '"readAt" IS NULL',
      );
    });

    it('reports zero when the driver gives no count', async () => {
      queryBuilderMock.execute.mockResolvedValue({});

      await expect(service.markAllAsSeen(receiver.id)).resolves.toBe(0);
    });
  });

  describe('markRelationshipRequestSeen', () => {
    it('targets the unread request notification of that relationship for that receiver', async () => {
      await service.markRelationshipRequestSeen('rel-1', receiver.id);

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'receiver_id = :receiverId',
        { receiverId: receiver.id },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('"type" = :type', {
        type: NotificationType.RELATIONSHIP_REQUESTED,
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        `"data" ->> 'relationshipId' = :relationshipId`,
        { relationshipId: 'rel-1' },
      );
    });

    it('runs inside the given transaction', async () => {
      const transactionalRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      };
      const manager = {
        getRepository: jest.fn(() => transactionalRepository),
      } as unknown as EntityManager;

      await service.markRelationshipRequestSeen('rel-1', receiver.id, manager);

      expect(transactionalRepository.createQueryBuilder).toHaveBeenCalled();
      expect(
        notificationRepositoryMock.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteOne', () => {
    it('removes the notification', async () => {
      const owned = notification();
      notificationRepositoryMock.findOne.mockResolvedValue(owned);
      notificationRepositoryMock.remove.mockResolvedValue(owned);

      await service.deleteOne(owned.id, receiver.id);

      expect(notificationRepositoryMock.remove).toHaveBeenCalledWith(owned);
    });

    it('raises NotFound when the notification does not exist', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.deleteOne('missing', receiver.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(notificationRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });

  describe('deleteExpired', () => {
    it('deletes read notifications and any notification past their own cut-off', async () => {
      queryBuilderMock.execute.mockResolvedValue({ affected: 7 });

      const deleted = await service.deleteExpired({
        readOlderThanDays: 30,
        anyOlderThanDays: 180,
      });

      expect(deleted).toBe(7);
      const [condition, parameters] = queryBuilderMock.where.mock.calls[0] as [
        string,
        Record<string, Date>,
      ];
      expect(condition).toBe(
        '("readAt" IS NOT NULL AND "readAt" < :readCutoff) OR "sentAt" < :anyCutoff',
      );
      expect(parameters.readCutoff.getTime()).toBeGreaterThan(
        parameters.anyCutoff.getTime(),
      );
      expect(
        Date.now() - parameters.readCutoff.getTime(),
      ).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000);
    });

    it('can purge read notifications only', async () => {
      await service.deleteExpired({
        readOlderThanDays: 30,
        anyOlderThanDays: 0,
      });

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        '("readAt" IS NOT NULL AND "readAt" < :readCutoff)',
        expect.any(Object),
      );
    });

    it('does nothing when both retentions are disabled', async () => {
      await expect(
        service.deleteExpired({ readOlderThanDays: 0, anyOlderThanDays: 0 }),
      ).resolves.toBe(0);
      expect(queryBuilderMock.execute).not.toHaveBeenCalled();
    });
  });
});
