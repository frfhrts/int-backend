import { Module } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
