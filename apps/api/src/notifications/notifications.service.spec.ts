import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationStatus,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const notificationRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const receiver = { id: 'user-1', username: 'john_athlete' } as User;
  const sender = { id: 'user-2', username: 'jane_coach' } as User;

  const unseen = {
    id: 'notif-1',
    message: 'New request',
    status: NotificationStatus.UNSEEN,
    sender,
    receiver,
  } as Notification;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue:
            notificationRepositoryMock as unknown as Repository<Notification>,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('findMyNotifications', () => {
    it('scopes the query to the receiver', async () => {
      notificationRepositoryMock.find.mockResolvedValue([unseen]);

      const result = await service.findMyNotifications(receiver.id);

      expect(notificationRepositoryMock.find).toHaveBeenCalledWith({
        where: { receiver: { id: receiver.id } },
      });
      expect(result).toEqual([unseen]);
    });

    it('returns an empty list when the user has no notifications', async () => {
      notificationRepositoryMock.find.mockResolvedValue([]);

      await expect(
        service.findMyNotifications('user-with-none'),
      ).resolves.toEqual([]);
    });
  });

  describe('markAsSeen', () => {
    it('flips the status to seen and persists it', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue({
        ...unseen,
      });
      notificationRepositoryMock.save.mockImplementation(
        (notification: Notification) => Promise.resolve(notification),
      );

      const result = await service.markAsSeen(unseen.id);

      expect(result.status).toBe(NotificationStatus.SEEN);
      expect(notificationRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: unseen.id,
          status: NotificationStatus.SEEN,
        }),
      );
    });

    it('raises NotFound when the notification does not exist', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.markAsSeen('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(notificationRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteOne', () => {
    it('removes the notification', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(unseen);
      notificationRepositoryMock.remove.mockResolvedValue(unseen);

      await service.deleteOne(unseen.id);

      expect(notificationRepositoryMock.remove).toHaveBeenCalledWith(unseen);
    });

    it('raises NotFound when the notification does not exist', async () => {
      notificationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.deleteOne('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(notificationRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
