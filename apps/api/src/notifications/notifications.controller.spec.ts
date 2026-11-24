import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsStream } from './notifications-stream.service';
import { Notification } from './entities/notification.entity';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsServiceMock = {
    findMyNotifications: jest.fn(),
    unreadCount: jest.fn(),
    markAllAsSeen: jest.fn(),
    markAsSeen: jest.fn(),
    deleteOne: jest.fn(),
  };
  const streamMock = {
    issueTicket: jest.fn(),
    verifyTicket: jest.fn(),
    forUser: jest.fn(),
  };

  const user: AuthUser = {
    id: 'user-1',
    email: 'john@example.com',
    role: UserRole.ATHLETE,
  };
  const items = [{ id: 'notif-1' }] as Notification[];

  const responseMock = () => {
    const setHeader = jest.fn();
    return { response: { setHeader } as unknown as Response, setHeader };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: NotificationsStream, useValue: streamMock },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('findMine', () => {
    it('returns the items as a plain array and passes the query to the service', async () => {
      notificationsServiceMock.findMyNotifications.mockResolvedValue({
        items,
        nextCursor: null,
      });
      const { response } = responseMock();

      const result = await controller.findMine(
        user,
        { limit: 20, unread: true },
        response,
      );

      expect(result).toBe(items);
      expect(notificationsServiceMock.findMyNotifications).toHaveBeenCalledWith(
        user.id,
        { limit: 20, unread: true },
      );
    });

    it('sends the next cursor in the X-Next-Cursor header', async () => {
      notificationsServiceMock.findMyNotifications.mockResolvedValue({
        items,
        nextCursor: 'abc',
      });
      const { response, setHeader } = responseMock();

      await controller.findMine(user, { limit: 1 }, response);

      expect(setHeader).toHaveBeenCalledWith('X-Next-Cursor', 'abc');
    });

    it('sends no header on the last page', async () => {
      notificationsServiceMock.findMyNotifications.mockResolvedValue({
        items,
        nextCursor: null,
      });
      const { response, setHeader } = responseMock();

      await controller.findMine(user, {}, response);

      expect(setHeader).not.toHaveBeenCalled();
    });
  });

  it('returns the unread counter', async () => {
    notificationsServiceMock.unreadCount.mockResolvedValue(3);

    await expect(controller.unreadCount(user)).resolves.toEqual({ count: 3 });
    expect(notificationsServiceMock.unreadCount).toHaveBeenCalledWith(user.id);
  });

  it('marks everything as read and reports how many were updated', async () => {
    notificationsServiceMock.markAllAsSeen.mockResolvedValue(4);

    await expect(controller.readAll(user)).resolves.toEqual({ updated: 4 });
  });

  it('issues a stream ticket for the authenticated user', () => {
    streamMock.issueTicket.mockReturnValue({ ticket: 't', expiresIn: 60 });

    expect(controller.streamTicket(user)).toEqual({
      ticket: 't',
      expiresIn: 60,
    });
    expect(streamMock.issueTicket).toHaveBeenCalledWith(user.id);
  });

  describe('stream', () => {
    it('streams the notifications of the user resolved by the guard', async () => {
      streamMock.forUser.mockReturnValue(of({ data: 'x' }));

      const event = await firstValueFrom(controller.stream('user-9'));

      expect(event).toEqual({ data: 'x' });
      expect(streamMock.forUser).toHaveBeenCalledWith('user-9');
    });
  });

  it('passes the user id when marking a notification as seen', async () => {
    await controller.markAsSeen('notif-1', user);

    expect(notificationsServiceMock.markAsSeen).toHaveBeenCalledWith(
      'notif-1',
      user.id,
    );
  });

  it('passes the user id when deleting a notification', async () => {
    await controller.deleteOne('notif-1', user);

    expect(notificationsServiceMock.deleteOne).toHaveBeenCalledWith(
      'notif-1',
      user.id,
    );
  });
});
