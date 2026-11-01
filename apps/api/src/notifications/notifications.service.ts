import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { NotificationsStream } from './notifications-stream.service';
import { User } from '../users/entities/user.entity';
import { isSafeLink } from '../utils/safe-link';

export interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  receiver: User;
  sender?: User | null;
  data?: Record<string, unknown>;
  link?: string;
}

export interface NotificationListOptions {
  limit?: number;
  cursor?: string;
  unread?: boolean;
}

export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
}

export interface RetentionOptions {
  readOlderThanDays: number;
  anyOlderThanDays: number;
}

const CURSOR_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|([0-9a-f-]{36})$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly stream: NotificationsStream,
  ) {}

  async create(
    input: CreateNotificationInput,
    manager?: EntityManager,
  ): Promise<Notification> {
    if (input.link !== undefined && !isSafeLink(input.link)) {
      throw new Error(`Unsafe notification link: ${input.link}`);
    }
    const repository = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;
    return repository.save(
      repository.create({
        type: input.type,
        message: input.message,
        receiver: input.receiver,
        ...(input.sender && { sender: input.sender }),
        data: input.data ?? null,
        link: input.link ?? null,
      }),
    );
  }

  publish(notification: Notification): void {
    this.stream.publish(notification);
  }

  async findMyNotifications(
    userId: string,
    options: NotificationListOptions = {},
  ): Promise<NotificationPage> {
    this.logger.debug(
      `[findMyNotifications] Fetching notifications for userId=${userId}`,
    );
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.sender', 'sender')
      .leftJoinAndSelect('notification.receiver', 'receiver')
      .where('receiver.id = :userId', { userId })
      .orderBy('notification.sentAt', 'DESC')
      .addOrderBy('notification.id', 'DESC');

    if (options.unread) query.andWhere('notification.readAt IS NULL');
    if (options.cursor) {
      const { sentAt, id } = this.decodeCursor(options.cursor);
      query.andWhere(
        '(notification.sentAt < :sentAt OR (notification.sentAt = :sentAt AND notification.id < :id))',
        { sentAt, id },
      );
    }
    if (options.limit) query.limit(options.limit + 1);

    const rows = await query.getMany();
    const hasMore = options.limit !== undefined && rows.length > options.limit;
    const items = hasMore ? rows.slice(0, options.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last) : null,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { receiver: { id: userId }, readAt: IsNull() },
    });
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    this.logger.debug(`[findOne] Looking up notification id=${id}`);
    const notification = await this.notificationRepository.findOne({
      where: { id, receiver: { id: userId } },
    });
    if (!notification) {
      this.logger.warn(`[findOne] Notification #${id} not found`);
      throw new NotFoundException(`Notification #${id} not found`);
    }
    return notification;
  }

  async markAsSeen(id: string, userId: string): Promise<Notification> {
    this.logger.debug(`[markAsSeen] Marking notification id=${id} as seen`);
    const notification = await this.findOne(id, userId);
    if (notification.readAt) return notification;

    notification.status = NotificationStatus.SEEN;
    notification.readAt = new Date();
    const updated = await this.notificationRepository.save(notification);
    this.logger.log(`[markAsSeen] Notification id=${id} marked as seen`);
    return updated;
  }

  async markAllAsSeen(userId: string): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ status: NotificationStatus.SEEN, readAt: new Date() })
      .where('receiver_id = :userId', { userId })
      .andWhere('"readAt" IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async markRelationshipRequestSeen(
    relationshipId: string,
    receiverId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;
    await repository
      .createQueryBuilder()
      .update(Notification)
      .set({ status: NotificationStatus.SEEN, readAt: new Date() })
      .where('receiver_id = :receiverId', { receiverId })
      .andWhere('"type" = :type', {
        type: NotificationType.RELATIONSHIP_REQUESTED,
      })
      .andWhere(`"data" ->> 'relationshipId' = :relationshipId`, {
        relationshipId,
      })
      .andWhere('"readAt" IS NULL')
      .execute();
  }

  async deleteOne(id: string, userId: string): Promise<void> {
    this.logger.debug(`[deleteOne] Deleting notification id=${id}`);
    const notification = await this.findOne(id, userId);
    await this.notificationRepository.remove(notification);
    this.logger.log(`[deleteOne] Notification id=${id} deleted`);
  }

  async deleteExpired(options: RetentionOptions): Promise<number> {
    const now = Date.now();
    const conditions: string[] = [];
    const parameters: Record<string, Date> = {};

    if (options.readOlderThanDays > 0) {
      conditions.push('("readAt" IS NOT NULL AND "readAt" < :readCutoff)');
      parameters.readCutoff = new Date(
        now - options.readOlderThanDays * DAY_MS,
      );
    }
    if (options.anyOlderThanDays > 0) {
      conditions.push('"sentAt" < :anyCutoff');
      parameters.anyCutoff = new Date(now - options.anyOlderThanDays * DAY_MS);
    }
    if (conditions.length === 0) return 0;

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where(conditions.join(' OR '), parameters)
      .execute();
    return result.affected ?? 0;
  }

  private encodeCursor(notification: Notification): string {
    return Buffer.from(
      `${notification.sentAt.toISOString()}|${notification.id}`,
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): { sentAt: Date; id: string } {
    const match = CURSOR_PATTERN.exec(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (!match) throw new BadRequestException('Invalid cursor');
    return { sentAt: new Date(match[1]), id: match[2] };
  }
}
