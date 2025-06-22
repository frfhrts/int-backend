import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingConfigService } from '../services/logging-config.service';

@Injectable()
export class NotFoundLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('404');

  constructor(private readonly loggingConfig: LoggingConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, headers, body, ip } = req;
    const userAgent = headers['user-agent'] || '';

    // Log the request attempt if enabled
    if (this.loggingConfig.shouldLog404s) {
      this.logger.warn(
        `404 - Endpoint Not Found: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
      );
    }

    // Log request details for debugging if enabled
    if (this.loggingConfig.shouldLogHeaders) {
      const sanitizedHeaders = this.sanitizeHeaders(headers);
      this.logger.debug(
        `404 Request Headers: ${JSON.stringify(sanitizedHeaders)}`,
      );
    }

    if (
      this.loggingConfig.shouldLogBody &&
      body &&
      Object.keys(body).length > 0
    ) {
      this.logger.debug(`404 Request Body: ${JSON.stringify(body)}`);
    }

    // Continue to the next middleware/route handler
    next();
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
