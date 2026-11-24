import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { NotificationsStream } from './notifications-stream.service';

type StreamRequest = Request & { user?: AuthUser; streamUserId?: string };

@Injectable()
export class StreamAuthGuard implements CanActivate {
  constructor(private readonly stream: NotificationsStream) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<StreamRequest>();
    if (request.user) {
      request.streamUserId = request.user.id;
      return true;
    }
    const ticket =
      typeof request.query.ticket === 'string'
        ? request.query.ticket
        : undefined;
    request.streamUserId = this.stream.verifyTicket(ticket);
    return true;
  }
}

export const StreamUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<StreamRequest>().streamUserId as string,
);
