import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggingConfigService {
  constructor(private readonly configService: ConfigService) {}

  get shouldLogRequests(): boolean {
    return this.configService.get<boolean>('LOG_REQUESTS', true);
  }

  get shouldLogResponses(): boolean {
    return this.configService.get<boolean>('LOG_RESPONSES', true);
  }

  get shouldLogHeaders(): boolean {
    return this.configService.get<boolean>('LOG_HEADERS', false);
  }

  get shouldLogBody(): boolean {
    return this.configService.get<boolean>('LOG_BODY', false);
  }

  get shouldLog404s(): boolean {
    return this.configService.get<boolean>('LOG_404S', true);
  }

  get shouldLogExceptions(): boolean {
    return this.configService.get<boolean>('LOG_EXCEPTIONS', true);
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get sensitiveHeaders(): string[] {
    const defaultSensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'allingame-key',
      'password',
      'token',
      'secret',
      'key',
    ];

    const customSensitiveHeaders =
      this.configService.get<string>('SENSITIVE_HEADERS');
    if (customSensitiveHeaders) {
      return [
        ...defaultSensitiveHeaders,
        ...customSensitiveHeaders.split(',').map((h) => h.trim()),
      ];
    }

    return defaultSensitiveHeaders;
  }
}
