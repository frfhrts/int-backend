import { Module } from '@nestjs/common';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { NotFoundLoggingMiddleware } from './middleware/not-found-logging.middleware';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingConfigService } from './services/logging-config.service';

@Module({
  providers: [
    LoggingConfigService,
    LoggingInterceptor,
    NotFoundLoggingMiddleware,
    GlobalExceptionFilter,
  ],
  exports: [
    LoggingConfigService,
    LoggingInterceptor,
    NotFoundLoggingMiddleware,
    GlobalExceptionFilter,
  ],
})
export class CommonModule {}
