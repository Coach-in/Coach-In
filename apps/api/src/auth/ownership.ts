import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../utils/types/jwt.types';
import { AuthUser } from './auth.types';

export function isAdmin(requester: AuthUser): boolean {
  return requester.role === UserRole.ADMIN;
}

export function assertSelfOrAdmin(
  requester: AuthUser,
  ownerUserId: string | undefined,
): void {
  if (!isAdmin(requester) && requester.id !== ownerUserId) {
    throw new ForbiddenException('You can only access your own resources');
  }
}
