import { ExecutionContext, HttpException } from '@nestjs/common';
import { LoginThrottleGuard } from './login-throttle.guard';

describe('LoginThrottleGuard', () => {
  let guard: LoginThrottleGuard;

  const contextFor = (email: unknown, ip = '10.0.0.1'): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ ip, body: { email } }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.useFakeTimers();
    guard = new LoginThrottleGuard();
  });

  afterEach(() => jest.useRealTimers());

  it('allows ten attempts and blocks the eleventh with a 429', () => {
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(contextFor('john@example.com'))).toBe(true);
    }

    expect(() => guard.canActivate(contextFor('john@example.com'))).toThrow(
      HttpException,
    );
  });

  it('counts the same email in different casing together', () => {
    for (let i = 0; i < 10; i++)
      guard.canActivate(contextFor('John@Example.com'));

    expect(() => guard.canActivate(contextFor('john@example.com'))).toThrow(
      HttpException,
    );
  });

  it('keeps separate counters per email and per address', () => {
    for (let i = 0; i < 10; i++)
      guard.canActivate(contextFor('john@example.com'));

    expect(guard.canActivate(contextFor('jane@example.com'))).toBe(true);
    expect(guard.canActivate(contextFor('john@example.com', '10.0.0.2'))).toBe(
      true,
    );
  });

  it('forgets the attempts once the window has passed', () => {
    for (let i = 0; i < 10; i++)
      guard.canActivate(contextFor('john@example.com'));

    jest.advanceTimersByTime(16 * 60 * 1000);

    expect(guard.canActivate(contextFor('john@example.com'))).toBe(true);
  });

  it('does not crash on a body without a string email', () => {
    expect(guard.canActivate(contextFor(undefined))).toBe(true);
    expect(guard.canActivate(contextFor({ $ne: '' }))).toBe(true);
  });
});
