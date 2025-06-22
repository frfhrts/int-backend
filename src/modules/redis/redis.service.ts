import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { ChainableCommander, Pipeline } from 'ioredis';
import { User } from '../users/interfaces/users.interface';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.redisClient = new Redis(
      this.configService.getOrThrow('REDIS_CONNECTION_URI'),
    );

    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  //   async createUserWithBalance(user: User) {
  //     const userKey = `user:${user.user_id}`;
  //     const balanceKey = `balance:${user.user_id}`;

  //     const userFromRedis = await this.getUserById(user.user_id);
  //     if (userFromRedis) {
  //       return userFromRedis;
  //     }

  //     const newUser = await this.redisClient.set(userKey, JSON.stringify(user));
  //     await this.redisClient.set(balanceKey, this.DEFAULT_BALANCE * 100);

  //     return newUser;
  //   }

  //   async getUserById(userId: string) {
  //     const userKey = `user:${userId}`;
  //     const user = await this.redisClient.get(userKey);
  //     return user ? JSON.parse(user) : null;
  //   }

  //   async getUserBalance(userId: string) {
  //     const balanceKey = `balance:${userId}`;
  //     const balance = await this.redisClient.get(balanceKey);
  //     return balance ? parseInt(balance) : 0;
  //   }

  //   async updateUserBalance(userId: string, amount: number) {
  // const balanceKey = `balance:${userId}`;
  // await this.redisClient.incrby(balanceKey, amount);
  //   }

  async set(key: string, value: string | number, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.setex(key, ttl, value.toString());
    } else {
      await this.redisClient.set(key, value.toString());
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async incrby(key: string, increment: number): Promise<number> {
    return await this.redisClient.incrby(key, increment);
  }

  async decrby(key: string, decrement: number): Promise<number> {
    return await this.redisClient.decrby(key, decrement);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.redisClient.mget(keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  // Transaction support
  async multi(): Promise<ChainableCommander> {
    return this.redisClient.multi();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async lpush(key: string, value: string): Promise<number> {
    return await this.redisClient.lpush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    return await this.redisClient.rpush(key, value);
  }

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    return await this.redisClient.lrange(key, start, end);
  }
}
