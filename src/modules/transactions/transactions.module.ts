import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { RedisModule } from '../redis/redis.module';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [RedisModule],
  providers: [TransactionsService],
  exports: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
