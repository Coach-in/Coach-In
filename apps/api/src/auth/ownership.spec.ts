import { ForbiddenException } from '@nestjs/common';
import { assertSelfOrAdmin, isAdmin } from './ownership';
import { AuthUser } from './auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('ownership', () => {
  const athlete: AuthUser = {
    id: 'user-1',
    email: 'a@example.com',
    role: UserRole.ATHLETE,
  };
  const admin: AuthUser = { ...athlete, id: 'user-2', role: UserRole.ADMIN };

  it('detects administrators', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(athlete)).toBe(false);
  });

  it('lets the owner through', () => {
    expect(() => assertSelfOrAdmin(athlete, 'user-1')).not.toThrow();
  });

  it('lets an administrator through', () => {
    expect(() => assertSelfOrAdmin(admin, 'user-1')).not.toThrow();
  });

  it('forbids anyone else', () => {
    expect(() => assertSelfOrAdmin(athlete, 'user-9')).toThrow(
      ForbiddenException,
    );
  });

  it('forbids access to a resource without owner', () => {
    expect(() => assertSelfOrAdmin(athlete, undefined)).toThrow(
      ForbiddenException,
    );
  });
});
