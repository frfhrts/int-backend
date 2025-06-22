import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingConfigService } from '../services/logging-config.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  constructor(private readonly loggingConfig: LoggingConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { method, url, headers, body, ip } = request;
    const userAgent = headers['user-agent'] || '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the exception if enabled
    if (this.loggingConfig.shouldLogExceptions) {
      this.logger.error(
        `Exception: ${method} ${url} - Status: ${status} - IP: ${ip} - User-Agent: ${userAgent} - Error: ${message}`,
      );

      // Log exception details
      if (exception instanceof Error && exception.stack) {
        this.logger.error(`Exception Stack: ${exception.stack}`);
      }
    }

    // Log request details for debugging if enabled
    if (this.loggingConfig.shouldLogHeaders) {
      const sanitizedHeaders = this.sanitizeHeaders(headers);
      this.logger.debug(
        `Exception Request Headers: ${JSON.stringify(sanitizedHeaders)}`,
      );
    }

    if (
      this.loggingConfig.shouldLogBody &&
      body &&
      Object.keys(body).length > 0
    ) {
      this.logger.debug(`Exception Request Body: ${JSON.stringify(body)}`);
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: url,
      message: message,
    });
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = this.loggingConfig.sensitiveHeaders;

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
