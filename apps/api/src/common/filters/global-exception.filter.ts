import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export interface MappedErrorResponse {
  status: number;
  body: Record<string, any>;
}

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const DRIFT_ERROR_CODES = new Set(['P2021', 'P2022']);

function isPrismaErrorWithCode(
  exception: unknown,
): exception is { name?: string; code: string; message?: string; meta?: Record<string, unknown> } {
  if (!exception || typeof exception !== 'object') return false;
  const candidate = exception as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    /^P\d{4}$/.test(candidate.code) &&
    (candidate.name === 'PrismaClientKnownRequestError' ||
      candidate.name === 'PrismaClientInitializationError' ||
      'clientVersion' in candidate)
  );
}

function getErrorName(exception: unknown): string {
  if (!exception || typeof exception !== 'object') return '';
  return typeof (exception as { name?: unknown }).name === 'string'
    ? (exception as { name: string }).name
    : '';
}

export function mapExceptionToHttpResponse(
  exception: unknown,
  requestId: string,
): MappedErrorResponse {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const rawResponse = exception.getResponse();
    const body =
      typeof rawResponse === 'string'
        ? { statusCode: status, message: rawResponse, requestId }
        : {
            statusCode: status,
            ...(typeof rawResponse === 'object' && rawResponse !== null ? rawResponse : {}),
            requestId,
          };
    return { status, body };
  }

  const errName = getErrorName(exception);

  if (isPrismaErrorWithCode(exception)) {
    const { code } = exception;

    if (code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'UNIQUE_CONFLICT',
          message: 'A matching record already exists.',
          requestId,
        },
      };
    }

    if (code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist.',
          requestId,
        },
      };
    }

    if (code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found.',
          requestId,
        },
      };
    }

    if (DRIFT_ERROR_CODES.has(code)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          code: 'MIGRATIONS_PENDING',
          message: 'This feature is temporarily unavailable while a database update is pending.',
          requestId,
        },
      };
    }

    if (CONNECTION_ERROR_CODES.has(code)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          code: 'DATABASE_UNAVAILABLE',
          message: 'The database is temporarily unavailable. Please try again shortly.',
          requestId,
        },
      };
    }

    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'DATABASE_REQUEST_ERROR',
        message: 'The request could not be processed.',
        requestId,
      },
    };
  }

  if (errName === 'PrismaClientValidationError') {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        message: 'Invalid request parameters.',
        requestId,
      },
    };
  }

  if (errName === 'PrismaClientInitializationError' || errName === 'PrismaClientRustPanicError') {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      body: {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is temporarily unavailable. Please try again shortly.',
        requestId,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      requestId,
    },
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const incomingId = request?.headers?.['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(incomingId.trim())
        ? incomingId.trim()
        : randomUUID();

    const { status, body } = mapExceptionToHttpResponse(exception, requestId);

    const method = request?.method || 'UNKNOWN';
    const url = request?.originalUrl || request?.url || 'UNKNOWN';
    if (status >= 500) {
      const errMessage = exception instanceof Error ? exception.message : String(exception);
      const errStack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`[${requestId}] ${method} ${url} -> ${status} (${errMessage})`, errStack);
    } else if (status >= 400 && !(exception instanceof HttpException)) {
      const errMessage = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`[${requestId}] ${method} ${url} -> ${status} (${errMessage})`);
    }

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-Request-Id', requestId);
    }
    response.status(status).json(body);
  }
}

