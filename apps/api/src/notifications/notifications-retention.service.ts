import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_READ_RETENTION_DAYS = 30;
const DEFAULT_UNREAD_RETENTION_DAYS = 180;

@Injectable()
export class NotificationsRetention implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsRetention.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    const readOlderThanDays = this.days(
      'NOTIFICATIONS_READ_RETENTION_DAYS',
      DEFAULT_READ_RETENTION_DAYS,
    );
    const anyOlderThanDays = this.days(
      'NOTIFICATIONS_UNREAD_RETENTION_DAYS',
      DEFAULT_UNREAD_RETENTION_DAYS,
    );
    if (readOlderThanDays === 0 && anyOlderThanDays === 0) {
      this.logger.log('Notification purge is disabled');
      return;
    }

    const run = () => void this.purge({ readOlderThanDays, anyOlderThanDays });
    run();
    this.timer = setInterval(run, RUN_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async purge(options: {
    readOlderThanDays: number;
    anyOlderThanDays: number;
  }): Promise<void> {
    try {
      const deleted = await this.notificationsService.deleteExpired(options);
      this.logger.log(`Purged ${deleted} expired notification(s)`);
    } catch (err) {
      this.logger.error(
        `Notification purge failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private days(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }
}
