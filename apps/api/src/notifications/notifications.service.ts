import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findMyNotifications(userId: string): Promise<Notification[]> {
    this.logger.debug(`[findMyNotifications] Fetching notifications for userId=${userId}`);
    const notifications = await this.notificationRepository.find({
      where: { receiver: { id: userId } },
    });
    this.logger.debug(`[findMyNotifications] Found ${notifications.length} notification(s) for userId=${userId}`);
    return notifications;
  }

  async findOne(id: string): Promise<Notification> {
    this.logger.debug(`[findOne] Looking up notification id=${id}`);
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      this.logger.warn(`[findOne] Notification #${id} not found`);
      throw new NotFoundException(`Notification #${id} not found`);
    }
    return notification;
  }

  async markAsSeen(id: string): Promise<Notification> {
    this.logger.debug(`[markAsSeen] Marking notification id=${id} as seen`);
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      this.logger.warn(`[markAsSeen] Notification #${id} not found`);
      throw new NotFoundException(`Notification #${id} not found`);
    }
    notification.status = NotificationStatus.SEEN;
    const updated = await this.notificationRepository.save(notification);
    this.logger.log(`[markAsSeen] Notification id=${id} marked as seen`);
    return updated;
  }

  async deleteOne(id: string): Promise<void> {
    this.logger.debug(`[deleteOne] Deleting notification id=${id}`);
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      this.logger.warn(`[deleteOne] Notification #${id} not found`);
      throw new NotFoundException(`Notification #${id} not found`);
    }
    await this.notificationRepository.remove(notification);
    this.logger.log(`[deleteOne] Notification id=${id} deleted`);
  }
}
