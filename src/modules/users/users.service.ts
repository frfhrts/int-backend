import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { User } from './interfaces/users.interface';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_BALANCE } from 'src/utils/constants';
import { BALANCE_PREFIX } from 'src/utils/constants';

@Injectable()
export class UsersService {
  private usersList: Map<string, User> = new Map();
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly redisService: RedisService) {
    // this.loadUsersFromRedis();
  }

  // FOR LOCAL TESTING & DEVELOPMENT USE THIS FUNCTION TO LOAD USERS FROM REDIS TO HASHMAP
  // async loadUsersFromRedis() {
  //   console.log('Loading users from Redis');
  //   const userKeys = await this.redisService.keys(`${BALANCE_PREFIX}:*`);

  //   for (const key of userKeys) {
  //     const userId = key.split(':')[1];
  //     const userData = await this.redisService.get(key);

  //     if (userData) {
  //       this.usersList.set(userId, {
  //         user_id: userId,
  //         firstname: 'John',
  //         lastname: 'Doe',
  //         nickname: `JohnDoe-${uuidv4().slice(0, 8)}`,
  //         city: 'New York',
  //         date_of_birth: '1990-01-01',
  //         registered_at: new Date().toISOString(),
  //         gender: 'm',
  //         country: 'US',
  //       });
  //     }
  //   }
  // }

  // When user connects to websocket and no userId is provided, this function creaates a new user
  // and returns the user object with a default balance.
  // This is for local testing and development purposes only.
  // In production, user creation should be handled through a registration process.
  async createNewUser() {
    try {
      const newUser: User = {
        user_id: uuidv4(),
        nickname: 'TEST',
        firstname: 'TEST_FN',
        lastname: 'TEST_LN',
        city: 'New York',
        date_of_birth: '1990-01-01',
        registered_at: new Date().toISOString(),
        gender: 'm',
        country: 'US',
      };
      const balanceKey = `${BALANCE_PREFIX}:${newUser.user_id}`;
      await this.redisService.set(balanceKey, DEFAULT_BALANCE * 100);
      this.usersList.set(newUser.user_id, newUser);
      console.log(newUser);
      return { ...newUser, balance: DEFAULT_BALANCE * 100 };
    } catch (error) {
      this.logger.error('Error creating new user', error);
      throw error;
    }
  }

  async getUserById(userId: string) {
    try {
      const user = this.usersList.get(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      const userBalance = await this.redisService.get(
        `${BALANCE_PREFIX}:${userId}`,
      );
      return {
        ...user,
        balance: parseFloat(userBalance || '0'),
      };
    } catch (error) {
      throw error;
    }
  }

  getAllUsers() {
    return Array.from(this.usersList.values());
  }
}
