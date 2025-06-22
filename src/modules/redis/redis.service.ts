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

  async incrby(key: string, increment: number): Promise<number> {
    return await this.redisClient.incrby(key, increment);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.redisClient.mget(keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
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
