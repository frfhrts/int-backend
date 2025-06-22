import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Transaction } from './interfaces/transaction.interface';
import { TRANSACTION_PREFIX } from 'src/utils/constants';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionsService {
  constructor(private readonly redisService: RedisService) {}

  async createTransaction(transaction: CreateTransactionDto) {
    const transactionKey = `${TRANSACTION_PREFIX}:${transaction.user_id}`;
    const newTransaction: Transaction = {
      id: uuidv4(),
      ...transaction,
    };
    await this.redisService.lpush(
      transactionKey,
      JSON.stringify(newTransaction),
    );
    return newTransaction;
  }

  async getTransactions(userId: string) {
    const transactionKey = `${TRANSACTION_PREFIX}:${userId}`;
    const transactions = await this.redisService.lrange(transactionKey, 0, -1);
    return transactions.map((transaction) => JSON.parse(transaction));
  }

  async getTransactionByActionId(userId: string, actionId: string) {
    const transactionKey = `${TRANSACTION_PREFIX}:${userId}`;
    const transactions = await this.redisService.lrange(transactionKey, 0, -1);
    const transaction = transactions.find(
      (transaction) => JSON.parse(transaction).action_id === actionId,
    );
    return transaction ? JSON.parse(transaction) : null;
  }
}
