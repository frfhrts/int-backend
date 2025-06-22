import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get the logging components from the application context
  const loggingInterceptor = app.get(LoggingInterceptor);
  const globalExceptionFilter = app.get(GlobalExceptionFilter);

  // Apply global logging interceptor
  app.useGlobalInterceptors(loggingInterceptor);

  // Apply global exception filter
  app.useGlobalFilters(globalExceptionFilter);

  // Enable CORS
  app.enableCors();

  // Global prefix (optional)
  // app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Stake Backend API')
    .setDescription('API documentation for the Stake Backend application')
    .setVersion('1.0')
    .addTag('wallet-gateway', 'Wallet gateway endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('balance', 'Balance management endpoints')
    .addTag('transactions', 'Transaction management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = configService.get('APP_PORT') ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `Swagger documentation is available at: http://localhost:${port}/swagger`,
  );
  logger.log('Logging system is active - all requests will be logged');
}
bootstrap();
