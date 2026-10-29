import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const PRUNE_THRESHOLD = 10000;

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email : '';
    const key = `${request.ip}:${email.trim().toLowerCase()}`;
    const now = Date.now();

    if (this.attempts.size > PRUNE_THRESHOLD) this.prune(now);

    const recent = (this.attempts.get(key) ?? []).filter(
      (at) => now - at < WINDOW_MS,
    );
    if (recent.length >= MAX_ATTEMPTS) {
      this.attempts.set(key, recent);
      throw new HttpException(
        'Too many login attempts, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }

  private prune(now: number): void {
    for (const [key, times] of this.attempts) {
      if (times.every((at) => now - at >= WINDOW_MS)) this.attempts.delete(key);
    }
  }
}
