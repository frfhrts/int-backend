import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { BALANCE_PREFIX } from 'src/utils/constants';

@Injectable()
export class BalanceService {
  constructor(private readonly redisService: RedisService) {}

  // Balance conversion is not implemented, every currency is same rate as other
  async getUserBalance(userId: string) {
    const balanceKey = `${BALANCE_PREFIX}:${userId}`;
    const balance = await this.redisService.get(balanceKey);
    return balance ? parseFloat(balance) : 0;
  }

  async updateUserBalance(userId: string, amount: number) {
    const balanceKey = `${BALANCE_PREFIX}:${userId}`;
    await this.redisService.incrby(balanceKey, amount);
  }
}
