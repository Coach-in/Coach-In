import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { StreamAuthGuard } from './stream-auth.guard';
import { NotificationsStream } from './notifications-stream.service';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('StreamAuthGuard', () => {
  const streamMock = { verifyTicket: jest.fn() };
  const guard = new StreamAuthGuard(
    streamMock as unknown as NotificationsStream,
  );

  const user: AuthUser = {
    id: 'user-1',
    email: 'john@example.com',
    role: UserRole.ATHLETE,
  };

  const requestWith = (request: object) => {
    const target = request as { streamUserId?: string };
    const context = {
      switchToHttp: () => ({ getRequest: () => target }),
    } as unknown as ExecutionContext;
    return { context, target };
  };

  beforeEach(() => jest.clearAllMocks());

  it('accepts a caller already identified by a Bearer token', () => {
    const { context, target } = requestWith({ user, query: {} });

    expect(guard.canActivate(context)).toBe(true);
    expect(target.streamUserId).toBe(user.id);
    expect(streamMock.verifyTicket).not.toHaveBeenCalled();
  });

  it('accepts a valid ticket and resolves its user', () => {
    streamMock.verifyTicket.mockReturnValue('user-9');
    const { context, target } = requestWith({
      query: { ticket: 'the-ticket' },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(streamMock.verifyTicket).toHaveBeenCalledWith('the-ticket');
    expect(target.streamUserId).toBe('user-9');
  });

  it('rejects before the stream opens when the ticket is invalid', () => {
    streamMock.verifyTicket.mockImplementation(() => {
      throw new UnauthorizedException();
    });
    const { context } = requestWith({ query: { ticket: 'bad' } });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('treats a repeated ticket parameter as a missing ticket', () => {
    streamMock.verifyTicket.mockImplementation(() => {
      throw new UnauthorizedException();
    });
    const { context } = requestWith({ query: { ticket: ['a', 'b'] } });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(streamMock.verifyTicket).toHaveBeenCalledWith(undefined);
  });
});
