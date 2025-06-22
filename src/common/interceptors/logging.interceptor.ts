import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingConfigService } from '../services/logging-config.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly loggingConfig: LoggingConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers, body, ip } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log incoming request if enabled
    if (this.loggingConfig.shouldLogRequests) {
      this.logger.log(
        `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
      );
    }

    // Log request details if enabled
    if (this.loggingConfig.shouldLogHeaders) {
      const sanitizedHeaders = this.sanitizeHeaders(headers);
      this.logger.debug(`Request Headers: ${JSON.stringify(sanitizedHeaders)}`);
    }

    if (
      this.loggingConfig.shouldLogBody &&
      body &&
      Object.keys(body).length > 0
    ) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = response.statusCode;

        // Log successful response if enabled
        if (this.loggingConfig.shouldLogResponses) {
          this.logger.log(
            `Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`,
          );
        }

        // Log response data if enabled
        if (
          this.loggingConfig.shouldLogBody &&
          data &&
          typeof data === 'object'
        ) {
          this.logger.debug(`Response Data: ${JSON.stringify(data)}`);
        }
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = error.status || 500;

        // Log error response if enabled
        if (this.loggingConfig.shouldLogExceptions) {
          this.logger.error(
            `Error Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${error.message}`,
          );
        }

        // Log error details if enabled
        if (this.loggingConfig.shouldLogExceptions && error.stack) {
          this.logger.error(`Error Stack: ${error.stack}`);
        }

        throw error;
      }),
    );
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
