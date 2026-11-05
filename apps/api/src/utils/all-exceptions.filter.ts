import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { errorMessage, errorStack } from './error';

const SERVER_ERROR_THRESHOLD = 500;

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

const DATABASE_ERRORS: Record<string, ErrorBody> = {
  '23505': {
    statusCode: HttpStatus.CONFLICT,
    message: 'Resource already exists',
    error: 'Conflict',
  },
  '23503': {
    statusCode: HttpStatus.CONFLICT,
    message: 'Resource is referenced by or references another resource',
    error: 'Conflict',
  },
  '22P02': {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Invalid input syntax',
    error: 'Bad Request',
  },
};

const INTERNAL_ERROR: ErrorBody = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  message: 'Internal server error',
  error: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const body = this.toBody(exception);

    if (body.statusCode >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.url.split('?')[0]} → ${body.statusCode}: ${errorMessage(exception)}`,
        errorStack(exception),
      );
    }

    context.getResponse<Response>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode: status, message: response, error: exception.name };
      }
      return { ...(response as ErrorBody), statusCode: status };
    }
    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)
        ?.code;
      if (code && DATABASE_ERRORS[code]) return DATABASE_ERRORS[code];
    }
    return INTERNAL_ERROR;
  }
}
