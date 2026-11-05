import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { TokenContent, UserRole } from '../utils/types/jwt.types';
import { AuthUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const user = await this.authenticate(request);
    if (user) {
      request.user = user;
      return true;
    }
    if (isPublic) return true;
    throw new UnauthorizedException('Token is missing or invalid');
  }

  private async authenticate(request: Request): Promise<AuthUser | null> {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return null;

    let payload: TokenContent;
    try {
      payload = jwt.verify(
        token,
        this.config.getOrThrow<string>('JWT_SECRET'),
      ) as TokenContent;
    } catch {
      return null;
    }

    const user = await this.userRepository.findOneBy({ id: payload.userId });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role as UserRole };
  }
}
