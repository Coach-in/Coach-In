import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsRetention } from './notifications-retention.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsRetention', () => {
  const notificationsService = { deleteExpired: jest.fn() };
  let env: Record<string, string | undefined>;
  let retention: NotificationsRetention;

  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    env = {};
    notificationsService.deleteExpired.mockResolvedValue(0);
    retention = new NotificationsRetention(
      config,
      notificationsService as unknown as NotificationsService,
    );
  });

  afterEach(() => {
    retention.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('purges at startup with 30 days for read and 180 days for any notification', () => {
    retention.onModuleInit();

    expect(notificationsService.deleteExpired).toHaveBeenCalledWith({
      readOlderThanDays: 30,
      anyOlderThanDays: 180,
    });
  });

  it('purges again every day', async () => {
    retention.onModuleInit();

    await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(notificationsService.deleteExpired).toHaveBeenCalledTimes(3);
  });

  it('reads the retention from the environment', () => {
    env.NOTIFICATIONS_READ_RETENTION_DAYS = '7';
    env.NOTIFICATIONS_UNREAD_RETENTION_DAYS = '90';

    retention.onModuleInit();

    expect(notificationsService.deleteExpired).toHaveBeenCalledWith({
      readOlderThanDays: 7,
      anyOlderThanDays: 90,
    });
  });

  it('falls back to the defaults on an invalid value', () => {
    env.NOTIFICATIONS_READ_RETENTION_DAYS = 'abc';
    env.NOTIFICATIONS_UNREAD_RETENTION_DAYS = '-5';

    retention.onModuleInit();

    expect(notificationsService.deleteExpired).toHaveBeenCalledWith({
      readOlderThanDays: 30,
      anyOlderThanDays: 180,
    });
  });

  it('is disabled when both retentions are 0', async () => {
    env.NOTIFICATIONS_READ_RETENTION_DAYS = '0';
    env.NOTIFICATIONS_UNREAD_RETENTION_DAYS = '0';

    retention.onModuleInit();
    await jest.advanceTimersByTimeAsync(48 * 60 * 60 * 1000);

    expect(notificationsService.deleteExpired).not.toHaveBeenCalled();
  });

  it('keeps running after a failed purge', async () => {
    notificationsService.deleteExpired.mockRejectedValueOnce(
      new Error('db down'),
    );
    retention.onModuleInit();
    await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(notificationsService.deleteExpired).toHaveBeenCalledTimes(2);
  });

  it('stops the timer on shutdown', async () => {
    retention.onModuleInit();
    retention.onModuleDestroy();

    await jest.advanceTimersByTimeAsync(48 * 60 * 60 * 1000);

    expect(notificationsService.deleteExpired).toHaveBeenCalledTimes(1);
  });
});
