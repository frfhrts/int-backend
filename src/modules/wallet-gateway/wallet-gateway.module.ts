import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletGatewayService } from './wallet-gateway.service';
import { WalletGatewayController } from './wallet-gateway.controller';
import { BalanceModule } from '../balance/balance.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RedisModule } from '../redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    HttpModule,
    BalanceModule,
    UsersModule,
    TransactionsModule,
    RedisModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [WalletGatewayService],
  controllers: [WalletGatewayController],
})
export class WalletGatewayModule {}
