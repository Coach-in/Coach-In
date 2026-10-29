import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthUser } from './auth.types';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../utils/types/jwt.types';

describe('JwtAuthGuard', () => {
  const secret = 'unit-test-secret';
  const storedUser = {
    id: 'user-1',
    email: 'jane@example.com',
    role: UserRole.COACH,
  } as User;

  const reflector = { getAllAndOverride: jest.fn() };
  const userRepository = { findOneBy: jest.fn() };
  const config = { getOrThrow: jest.fn(() => secret) };

  let guard: JwtAuthGuard;

  const contextFor = (request: object): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  const requestWith = (authorization?: string) => ({
    headers: { authorization },
    user: undefined as AuthUser | undefined,
  });

  const tokenFor = (payload: object, options: jwt.SignOptions = {}) =>
    jwt.sign(payload, secret, options);

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    userRepository.findOneBy.mockResolvedValue(storedUser);
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      config as unknown as ConfigService,
      userRepository as unknown as Repository<User>,
    );
  });

  it('rejects a request without Authorization header', async () => {
    await expect(guard.canActivate(contextFor(requestWith()))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a header that is not a bearer scheme', async () => {
    const token = tokenFor({ userId: storedUser.id });

    await expect(
      guard.canActivate(contextFor(requestWith(`Basic ${token}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with another secret with a 401, not a 500', async () => {
    const token = jwt.sign({ userId: storedUser.id }, 'not-the-secret');

    await expect(
      guard.canActivate(contextFor(requestWith(`Bearer ${token}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = tokenFor({ userId: storedUser.id }, { expiresIn: -10 });

    await expect(
      guard.canActivate(contextFor(requestWith(`Bearer ${token}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    userRepository.findOneBy.mockResolvedValue(null);
    const token = tokenFor({ userId: 'deleted-user' });

    await expect(
      guard.canActivate(contextFor(requestWith(`Bearer ${token}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the user with the role stored in the database', async () => {
    const token = tokenFor({ userId: storedUser.id, email: storedUser.email });
    const request = requestWith(`Bearer ${token}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(request.user).toEqual({
      id: storedUser.id,
      email: storedUser.email,
      role: UserRole.COACH,
    });
  });

  describe('on a public route', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('lets anonymous requests through', async () => {
      const request = requestWith();

      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });

    it('lets requests with an invalid token through as anonymous', async () => {
      const request = requestWith('Bearer garbage');

      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });

    it('still identifies the caller when a valid token is sent', async () => {
      const token = tokenFor({ userId: storedUser.id });
      const request = requestWith(`Bearer ${token}`);

      await guard.canActivate(contextFor(request));

      expect(request.user?.id).toBe(storedUser.id);
    });
  });
});
