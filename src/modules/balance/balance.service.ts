import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { BALANCE_PREFIX } from 'src/utils/constants';

@Injectable()
export class BalanceService {
  private readonly DEFAULT_BALANCE = 1000;
  constructor(private readonly redisService: RedisService) {}

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
