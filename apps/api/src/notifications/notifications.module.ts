import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsStream } from './notifications-stream.service';
import { NotificationsRetention } from './notifications-retention.service';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsStream,
    NotificationsRetention,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
