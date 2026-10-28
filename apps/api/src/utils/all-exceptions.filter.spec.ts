import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/users' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  const databaseError = (code: string) =>
    new QueryFailedError(
      'SELECT 1',
      [],
      Object.assign(new Error('driver message with secrets'), { code }),
    );

  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => errorLog.mockRestore());

  it('keeps the standard Nest shape for HTTP exceptions', () => {
    filter.catch(new NotFoundException('User not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('keeps the list of validation messages', () => {
    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['email must be an email'] }),
    );
  });

  it('keeps conflicts raised by services', () => {
    filter.catch(new ConflictException('Email already in use'), host);

    expect(status).toHaveBeenCalledWith(409);
  });

  it('turns a unique violation into a 409', () => {
    filter.catch(databaseError('23505'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Resource already exists' }),
    );
  });

  it('turns an invalid input syntax error into a 400', () => {
    filter.catch(databaseError('22P02'), host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('hides unexpected errors behind a generic 500 and logs them', () => {
    filter.catch(new Error('connection string leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    expect(errorLog).toHaveBeenCalled();
  });

  it('hides unknown database errors behind a generic 500', () => {
    filter.catch(databaseError('99999'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
