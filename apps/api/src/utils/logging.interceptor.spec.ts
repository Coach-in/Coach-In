import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let log: jest.SpyInstance;

  const contextFor = (url: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => log.mockRestore());

  it('logs the method, path and status of a request', async () => {
    const handler: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(
      new LoggingInterceptor().intercept(contextFor('/users/me'), handler),
    );

    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/users\/me → 200 \(\d+ms\)$/),
    );
  });

  it('never logs the query string, which can carry a stream ticket', async () => {
    const handler: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(
      new LoggingInterceptor().intercept(
        contextFor('/notifications/stream?ticket=secret-ticket'),
        handler,
      ),
    );

    const [message] = log.mock.calls[0] as [string];
    expect(message).toContain('/notifications/stream');
    expect(message).not.toContain('secret-ticket');
  });
});
