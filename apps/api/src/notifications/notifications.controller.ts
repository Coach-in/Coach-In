import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Headers,
  Logger,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { TokenContent } from '../utils/types/jwt.types';
import { NotificationsService } from './notifications.service';

const notificationExample = {
  id: 'notif-uuid-1234',
  message: 'john_athlete souhaite être coaché par vous.',
  status: 'unseen',
  sentAt: '2026-03-12T10:00:00.000Z',
  sender: { id: 'user-athlete-uuid', username: 'john_athlete', email: 'athlete@example.com', role: 'athlete' },
  receiver: { id: 'user-coach-uuid', username: 'jane_coach', email: 'coach@example.com', role: 'coach' },
};

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private extractUserId(authHeader: string): string {
    this.logger.debug(`[extractUserId] Authorization header: ${authHeader}`);
    const [name, token] = authHeader?.split(' ') ?? [];
    if (name !== 'Bearer' || !token) {
      this.logger.warn(`[extractUserId] Missing or invalid Authorization header`);
      throw new UnauthorizedException('Token is missing or invalid');
    }
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');
    try {
      const payload = jwt.verify(token, secret) as TokenContent;
      this.logger.debug(`[extractUserId] Token valid, userId=${payload.userId}`);
      return payload.userId;
    } catch (err) {
      this.logger.warn(`[extractUserId] Token verification failed: ${err?.message}`);
      throw new UnauthorizedException('Token is missing or invalid');
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get your notifications (requires JWT)',
    description: 'Returns all notifications where the authenticated user is the receiver. Pass your JWT as a Bearer token.',
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
          sender: { id: 'user-coach-uuid', username: 'jane_coach', email: 'coach@example.com', role: 'coach' },
          receiver: { id: 'user-athlete-uuid', username: 'john_athlete', email: 'athlete@example.com', role: 'athlete' },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  async findMine(@Headers('authorization') auth: string) {
    this.logger.debug(`[GET /notifications] Received request`);
    const userId = this.extractUserId(auth);
    const result = await this.notificationsService.findMyNotifications(userId);
    this.logger.log(`[GET /notifications] Returning ${result.length} notification(s) for userId=${userId}`);
    return result;
  }

  @Patch(':id/seen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a notification as seen' })
  @ApiParam({ name: 'id', example: 'notif-uuid-1234', description: 'UUID of the notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen.',
    schema: { example: { ...notificationExample, status: 'seen' } },
  })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsSeen(@Param('id') id: string) {
    this.logger.debug(`[PATCH /notifications/${id}/seen] Received request`);
    const result = await this.notificationsService.markAsSeen(id);
    this.logger.log(`[PATCH /notifications/${id}/seen] Notification marked as seen`);
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a notification by id' })
  @ApiParam({ name: 'id', example: 'notif-uuid-1234', description: 'UUID of the notification' })
  @ApiResponse({ status: 204, description: 'Notification deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async deleteOne(@Param('id') id: string) {
    this.logger.debug(`[DELETE /notifications/${id}] Received request`);
    await this.notificationsService.deleteOne(id);
    this.logger.log(`[DELETE /notifications/${id}] Notification deleted`);
  }
}
