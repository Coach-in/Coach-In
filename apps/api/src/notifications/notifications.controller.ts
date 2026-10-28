import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Logger,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

const notificationExample = {
  id: 'notif-uuid-1234',
  message: 'john_athlete souhaite être coaché par vous.',
  status: 'unseen',
  sentAt: '2026-03-12T10:00:00.000Z',
  sender: {
    id: 'user-athlete-uuid',
    username: 'john_athlete',
    email: 'athlete@example.com',
    role: 'athlete',
  },
  receiver: {
    id: 'user-coach-uuid',
    username: 'jane_coach',
    email: 'coach@example.com',
    role: 'coach',
  },
};

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get your notifications (requires JWT)',
    description:
      'Returns all notifications where the authenticated user is the receiver. Pass your JWT as a Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications received by the authenticated user.',
    schema: {
      example: [
        notificationExample,
        {
          ...notificationExample,
          id: 'notif-uuid-5678',
          message: 'jane_coach a accepté votre demande de coaching.',
          status: 'seen',
          sender: {
            id: 'user-coach-uuid',
            username: 'jane_coach',
            email: 'coach@example.com',
            role: 'coach',
          },
          receiver: {
            id: 'user-athlete-uuid',
            username: 'john_athlete',
            email: 'athlete@example.com',
            role: 'athlete',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT.',
  })
  async findMine(@CurrentUser() user: AuthUser) {
    this.logger.debug(`[GET /notifications] Received request`);
    const userId = user.id;
    const result = await this.notificationsService.findMyNotifications(userId);
    this.logger.log(
      `[GET /notifications] Returning ${result.length} notification(s) for userId=${userId}`,
    );
    return result;
  }

  @Patch(':id/seen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a notification as seen' })
  @ApiParam({
    name: 'id',
    example: 'notif-uuid-1234',
    description: 'UUID of the notification',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen.',
    schema: { example: { ...notificationExample, status: 'seen' } },
  })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsSeen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.debug(`[PATCH /notifications/${id}/seen] Received request`);
    const result = await this.notificationsService.markAsSeen(id, user.id);
    this.logger.log(
      `[PATCH /notifications/${id}/seen] Notification marked as seen`,
    );
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a notification by id' })
  @ApiParam({
    name: 'id',
    example: 'notif-uuid-1234',
    description: 'UUID of the notification',
  })
  @ApiResponse({ status: 204, description: 'Notification deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async deleteOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.debug(`[DELETE /notifications/${id}] Received request`);
    await this.notificationsService.deleteOne(id, user.id);
    this.logger.log(`[DELETE /notifications/${id}] Notification deleted`);
  }
}
