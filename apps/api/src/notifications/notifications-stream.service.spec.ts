import { MessageEvent, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { NotificationsStream } from './notifications-stream.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

describe('NotificationsStream', () => {
  const secret = 'unit-test-secret';
  const ticketSecret = `${secret}:notifications-stream`;
  const config = { getOrThrow: jest.fn(() => secret) };

  let stream: NotificationsStream;

  const notificationFor = (receiverId: string, id = 'notif-1') =>
    ({ id, receiver: { id: receiverId } as User }) as Notification;

  beforeEach(() => {
    jest.useFakeTimers();
    stream = new NotificationsStream(config as unknown as ConfigService);
  });

  afterEach(() => jest.useRealTimers());

  describe('forUser', () => {
    it('delivers the notifications addressed to that user as notification events', () => {
      const received: MessageEvent[] = [];
      const subscription = stream.forUser('user-1').subscribe((e) => {
        received.push(e);
      });
      const mine = notificationFor('user-1', 'notif-mine');

      stream.publish(mine);

      expect(received).toEqual([
        { type: 'notification', id: 'notif-mine', data: mine },
      ]);
      subscription.unsubscribe();
    });

    it('never delivers the notifications of someone else', () => {
      const received: MessageEvent[] = [];
      const subscription = stream.forUser('user-1').subscribe((e) => {
        received.push(e);
      });

      stream.publish(notificationFor('user-2'));

      expect(received).toEqual([]);
      subscription.unsubscribe();
    });

    it('delivers to every open connection of the same user', () => {
      const first: MessageEvent[] = [];
      const second: MessageEvent[] = [];
      const a = stream.forUser('user-1').subscribe((e) => first.push(e));
      const b = stream.forUser('user-1').subscribe((e) => second.push(e));

      stream.publish(notificationFor('user-1'));

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      a.unsubscribe();
      b.unsubscribe();
    });

    it('stops delivering once the client disconnects', () => {
      const received: MessageEvent[] = [];
      const subscription = stream.forUser('user-1').subscribe((e) => {
        received.push(e);
      });

      subscription.unsubscribe();
      stream.publish(notificationFor('user-1'));

      expect(received).toEqual([]);
    });

    it('sends a heartbeat every 25 seconds to keep the connection alive', () => {
      const received: MessageEvent[] = [];
      const subscription = stream.forUser('user-1').subscribe((e) => {
        received.push(e);
      });

      jest.advanceTimersByTime(25000);
      jest.advanceTimersByTime(25000);

      expect(received).toEqual([
        { type: 'heartbeat', data: '' },
        { type: 'heartbeat', data: '' },
      ]);
      subscription.unsubscribe();
    });
  });

  describe('tickets', () => {
    it('issues a ticket that gives back the user id', () => {
      const { ticket, expiresIn } = stream.issueTicket('user-1');

      expect(expiresIn).toBe(60);
      expect(stream.verifyTicket(ticket)).toBe('user-1');
    });

    it('refuses a missing ticket', () => {
      expect(() => stream.verifyTicket(undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('refuses a garbage ticket', () => {
      expect(() => stream.verifyTicket('garbage')).toThrow(
        UnauthorizedException,
      );
    });

    it('refuses an expired ticket', () => {
      const expired = jwt.sign(
        { userId: 'user-1', purpose: 'notifications-stream' },
        ticketSecret,
        { expiresIn: -10 },
      );

      expect(() => stream.verifyTicket(expired)).toThrow(UnauthorizedException);
    });

    it('refuses a ticket signed for another purpose', () => {
      const other = jwt.sign(
        { userId: 'user-1', purpose: 'other' },
        ticketSecret,
      );

      expect(() => stream.verifyTicket(other)).toThrow(UnauthorizedException);
    });

    it('refuses a regular access token used as a ticket', () => {
      const accessToken = jwt.sign({ userId: 'user-1' }, secret);

      expect(() => stream.verifyTicket(accessToken)).toThrow(
        UnauthorizedException,
      );
    });

    it('issues tickets that cannot be used as access tokens', () => {
      const { ticket } = stream.issueTicket('user-1');

      expect(() => jwt.verify(ticket, secret)).toThrow();
    });
  });
});
