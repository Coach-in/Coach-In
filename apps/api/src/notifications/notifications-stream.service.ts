import {
  Injectable,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';
import { Notification } from './entities/notification.entity';

const HEARTBEAT_INTERVAL_MS = 25000;
const TICKET_LIFETIME_SECONDS = 60;
const TICKET_PURPOSE = 'notifications-stream';

interface TicketPayload {
  userId: string;
  purpose: string;
}

@Injectable()
export class NotificationsStream {
  private readonly published = new Subject<Notification>();

  constructor(private readonly config: ConfigService) {}

  publish(notification: Notification): void {
    this.published.next(notification);
  }

  forUser(userId: string): Observable<MessageEvent> {
    const notifications = this.published.pipe(
      filter((notification) => notification.receiver.id === userId),
      map(
        (notification): MessageEvent => ({
          type: 'notification',
          id: notification.id,
          data: notification,
        }),
      ),
    );
    const heartbeat = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: '' })),
    );
    return merge(notifications, heartbeat);
  }

  issueTicket(userId: string): { ticket: string; expiresIn: number } {
    const payload: TicketPayload = { userId, purpose: TICKET_PURPOSE };
    const ticket = jwt.sign(payload, this.ticketSecret(), {
      expiresIn: TICKET_LIFETIME_SECONDS,
    });
    return { ticket, expiresIn: TICKET_LIFETIME_SECONDS };
  }

  verifyTicket(ticket: string | undefined): string {
    if (!ticket) throw new UnauthorizedException('Stream ticket is missing');
    try {
      const payload = jwt.verify(ticket, this.ticketSecret()) as TicketPayload;
      if (payload.purpose === TICKET_PURPOSE && payload.userId) {
        return payload.userId;
      }
    } catch {
      throw new UnauthorizedException('Stream ticket is invalid or expired');
    }
    throw new UnauthorizedException('Stream ticket is invalid or expired');
  }

  private ticketSecret(): string {
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:${TICKET_PURPOSE}`;
  }
}
