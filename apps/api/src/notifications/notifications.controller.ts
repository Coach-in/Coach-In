import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Logger,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';
import { NotificationsStream } from './notifications-stream.service';
import { StreamAuthGuard, StreamUserId } from './stream-auth.guard';

const notificationExample = {
  id: 'notif-uuid-1234',
  type: 'relationship.requested',
  message: 'john_athlete souhaite être coaché par vous.',
  data: { relationshipId: 'rel-uuid-1234', athleteName: 'john_athlete' },
  link: '/relationships/rel-uuid-1234',
  status: 'unseen',
  readAt: null,
  sentAt: '2026-03-11T12:00:00.000Z',
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

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsStream: NotificationsStream,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get your notifications (requires JWT)',
    description:
      'Returns the notifications received by the authenticated user, newest first. Without `limit` the whole list is returned. With `limit`, the cursor of the next page is sent in the `X-Next-Cursor` response header (absent on the last page).',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'unread', required: false, example: true })
  @ApiResponse({
    status: 200,
    description: 'List of notifications received by the authenticated user.',
    schema: { example: [notificationExample] },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit, cursor or unread value.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT.',
  })
  async findMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.debug(`[GET /notifications] Received request`);
    const page = await this.notificationsService.findMyNotifications(
      user.id,
      query,
    );
    if (page.nextCursor) response.setHeader('X-Next-Cursor', page.nextCursor);
    return page.items;
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of notifications you have not read yet' })
  @ApiResponse({
    status: 200,
    description: 'Unread counter, meant for the badge.',
    schema: { example: { count: 3 } },
  })
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notificationsService.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark all your notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Number of notifications that were updated.',
    schema: { example: { updated: 3 } },
  })
  async readAll(@CurrentUser() user: AuthUser) {
    return { updated: await this.notificationsService.markAllAsSeen(user.id) };
  }

  @Post('stream-ticket')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get a short-lived ticket to open the live stream',
    description:
      'Browsers cannot send an Authorization header with EventSource. Call this route with your JWT, then open `GET /notifications/stream?ticket=<ticket>`. The ticket expires after 60 seconds and only works for the stream.',
  })
  @ApiResponse({
    status: 200,
    schema: { example: { ticket: 'eyJhbGciOi…', expiresIn: 60 } },
  })
  streamTicket(@CurrentUser() user: AuthUser) {
    return this.notificationsStream.issueTicket(user.id);
  }

  @Public()
  @UseGuards(StreamAuthGuard)
  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'Live stream of your new notifications (Server-Sent Events)',
    description:
      'Keeps the connection open and pushes an `notification` event with the full notification each time one is created for you, plus a `heartbeat` event every 25 seconds. Authenticate with `?ticket=` (browsers) or with the usual Bearer header. Notifications missed while disconnected are not replayed: call `GET /notifications` again after reconnecting.',
  })
  @ApiProduces('text/event-stream')
  @ApiQuery({ name: 'ticket', required: false })
  @ApiResponse({ status: 200, description: 'Event stream.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid ticket/JWT.' })
  stream(@StreamUserId() userId: string): Observable<MessageEvent> {
    return this.notificationsStream.forUser(userId);
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
    description:
      'Notification marked as seen. Calling it again keeps the first `readAt`.',
    schema: {
      example: {
        ...notificationExample,
        status: 'seen',
        readAt: '2026-03-11T12:05:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsSeen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.debug(`[PATCH /notifications/${id}/seen] Received request`);
    return this.notificationsService.markAsSeen(id, user.id);
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
  }
}
