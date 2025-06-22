import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { RedisService } from './modules/redis/redis.service';
import { RedisModule } from './modules/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { BalanceModule } from './modules/balance/balance.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletGatewayModule } from './modules/wallet-gateway/wallet-gateway.module';
import { CommonModule } from './common/common.module';
import { NotFoundLoggingMiddleware } from './common/middleware/not-found-logging.middleware';
import { WebsocketsModule } from './modules/websockets/websockets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    UsersModule,
    RedisModule,
    BalanceModule,
    TransactionsModule,
    WalletGatewayModule,
    WebsocketsModule,
  ],
  controllers: [],
  providers: [RedisService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the 404 logging middleware to all routes
    consumer.apply(NotFoundLoggingMiddleware).forRoutes('*');
  }
}
