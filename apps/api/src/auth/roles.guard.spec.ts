import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthUser } from './auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const contextFor = (user?: AuthUser): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const user = (role: UserRole): AuthUser => ({
    id: 'user-1',
    email: 'user@example.com',
    role,
  });

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without role requirement', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor(user(UserRole.ATHLETE)))).toBe(true);
  });

  it('allows a user holding a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(user(UserRole.ADMIN)))).toBe(true);
  });

  it('forbids a user without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contextFor(user(UserRole.COACH)))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids anonymous callers on role-protected routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
