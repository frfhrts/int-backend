import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PlayRequestDto } from './dtos/play-request.dto';
import { StartGameSessionDto } from './dtos/start-game-session.dto';
import { BalanceService } from '../balance/balance.service';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PlayResponse } from './interfaces/play-response.interface';
import { TransactionResponse } from './interfaces/transaction-response.interface';
import { StartGameSessionResponse } from './interfaces/start-game-session-response.interface';
import { ActionDto } from './dtos/action.dto';
import { firstValueFrom } from 'rxjs';
import { RollbackRequestDto } from './dtos/rollback-request.dto';
import { ACTION_PREFIX } from 'src/utils/constants';
import { RedisService } from '../redis/redis.service';
import { Server } from 'socket.io';
import { WebSocketServer } from '@nestjs/websockets';
import { Channels } from 'src/utils/enums/channels.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly balanceService: BalanceService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  //   server: Server;

  async processPlayRequest(playRequest: PlayRequestDto): Promise<PlayResponse> {
    try {
      let { user_id, currency, game, game_id, finished, actions } = playRequest;
      finished = finished || false;
      const user = await this.usersService.getUserById(user_id);
      if (!user) {
        throw new HttpException(
          { code: 101, message: 'User not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      if (actions && actions.length > 0) {
        // const checkDoubleBets = actions.filter(
        //   (action) => action.action === 'bet',
        // );
        // if (checkDoubleBets.length > 1) {
        //   const errorResponse = {
        //     code: 100, // Use 100 for multiple bet scenarios
        //     message: 'Not enough funds.',
        //   };
        //   throw new HttpException(errorResponse, 412);
        // }

        const actionIds = actions.map((action) => action.action_id);
        const duplicateIds = await this.checkDuplicateActions(actionIds);

        if (duplicateIds.length > 0) {
          // Return original response for duplicate/tombstoned actions
          return await this.getOriginalResponse(duplicateIds, user_id);
        }

        const totalBetAmount = actions
          .filter((action) => action.action === 'bet')
          .reduce((sum, action) => sum + action.amount, 0);

        // Check if user has enough balance for ALL bets
        const currentBalance =
          await this.balanceService.getUserBalance(user_id);
        if (totalBetAmount > 0 && currentBalance < totalBetAmount) {
          console.log(
            'Throwing insufficient balance error - total bets exceed balance',
          );
          const errorResponse = {
            code: 100,
            message: 'Not enough funds.',
            balance: currentBalance,
          };
          throw new HttpException(errorResponse, 412);
        }
      }

      const transactions: TransactionResponse[] = [];
      console.log('Actions: ', playRequest);

      for (const action of actions || []) {
        // throw new HttpException({ code: 100, message: 'User not found' }, 404);

        console.log('Processing action:', action);
        const checkTransaction =
          await this.transactionsService.getTransactionByActionId(
            user_id,
            action.action_id,
          );
        if (checkTransaction) {
          transactions.push({
            action_id: action.action_id,
            tx_id: checkTransaction.id,
            processed_at: checkTransaction.processed_at,
          });
          continue;
        }
        if (action.action === 'bet') {
          await this.processBet(user_id, action.amount);
        } else if (action.action === 'win') {
          await this.processWin(user_id, action.amount);
        }
        //   else if (action.action === 'rollback') {
        //     await this.processRollback(user_id, action.original_action_id);
        //   }
        const transaction = await this.transactionsService.createTransaction({
          user_id,
          game_id,
          action_id: action.action_id,
          action_type: action.action,
          amount: action.amount,
          currency,
          game,
          processed_at: new Date().toISOString(),
        });
        transactions.push({
          action_id: action.action_id,
          tx_id: transaction.id,
          processed_at: transaction.processed_at,
        });
      }

      const balance = await this.balanceService.getUserBalance(user_id);
      this.eventEmitter.emit(Channels.BALANCE_UPDATE, {
        userId: user_id,
        balance,
      });
      return {
        balance,
        game_id,
        transactions,
      };
    } catch (error) {
      this.logger.error('Error while processing play request:', error);
      throw error;
    }
  }

  async processWin(userId: string, amount: number) {
    try {
      await this.balanceService.updateUserBalance(userId, amount);
    } catch (error) {
      throw error;
    }
  }

  async processRollback(rollbackRequest: RollbackRequestDto) {
    try {
      this.logger.debug(
        `Processing rollback for user: ${rollbackRequest.user_id}`,
      );
      const transactions: TransactionResponse[] = [];

      for (const action of rollbackRequest.actions) {
        this.logger.debug(
          `Processing rollback for action: ${JSON.stringify(action)}`,
        );

        const originalTransaction =
          await this.transactionsService.getTransactionByActionId(
            rollbackRequest.user_id,
            action.original_action_id,
          );

        console.log('Original transaction:', originalTransaction);

        if (!originalTransaction) {
          // No original transaction exists - create tombstone to prevent future processing
          const tombstoneKey = `action:${action.original_action_id}`;
          await this.redisService.set(
            tombstoneKey,
            JSON.stringify({
              type: 'tombstone',
              rollback_action_id: action.action_id,
              processed_at: new Date().toISOString(),
              game_id: rollbackRequest.game_id,
            }),
          );

          transactions.push({
            action_id: action.action_id,
            tx_id: '',
            processed_at: new Date().toISOString(),
          });
        } else {
          // Original transaction exists - process the rollback
          if (originalTransaction.action_type === 'bet') {
            console.log('Processing bet rollback');
            await this.balanceService.updateUserBalance(
              rollbackRequest.user_id,
              Math.abs(originalTransaction.amount), // Add back the bet amount
            );
          }

          if (originalTransaction.action_type === 'win') {
            console.log('Processing win rollback');
            await this.balanceService.updateUserBalance(
              rollbackRequest.user_id,
              -Math.abs(originalTransaction.amount), // Subtract the win amount
            );
          }

          transactions.push({
            action_id: action.action_id,
            tx_id: originalTransaction.id,
            processed_at: new Date().toISOString(), // Current time
          });
        }

        // Mark rollback as processed to prevent duplicates
        const rollbackKey = `action:${action.action_id}`;
        await this.redisService.set(
          rollbackKey,
          JSON.stringify({
            type: 'rollback',
            original_action_id: action.original_action_id,
            processed_at: new Date().toISOString(),
            game_id: rollbackRequest.game_id,
          }),
        );
      }

      const userBalance = await this.balanceService.getUserBalance(
        rollbackRequest.user_id,
      );

      this.eventEmitter.emit(Channels.BALANCE_UPDATE, {
        userId: rollbackRequest.user_id,
        balance: userBalance,
      });

      return {
        balance: userBalance,
        game_id: rollbackRequest.game_id,
        transactions,
      };
    } catch (error) {
      this.logger.error('Error while processing rollback:', error);
      throw error;
    }
  }

  async processBet(userId: string, amount: number) {
    try {
      console.log('Processing bet for user:', userId, 'amount:', amount);
      const usersBalance = await this.balanceService.getUserBalance(userId);
      if (usersBalance < amount) {
        console.log('Throwing insufficient balance error');
        const errorResponse = {
          code: 100,
          message: 'Not enough funds.',
          balance: usersBalance,
        };
        throw new HttpException(errorResponse, 400);
      }
      await this.balanceService.updateUserBalance(userId, -amount);
    } catch (error) {
      throw error;
    }
  }

  async startGameSession(
    sessionData: StartGameSessionDto,
    req: Request,
  ): Promise<StartGameSessionResponse> {
    try {
      const gcpUrl = this.configService.getOrThrow<string>('GCP_URL');
      const key = this.configService.getOrThrow<string>('GCP_KEY');
      if (!gcpUrl) {
        throw new HttpException(
          'GCP_URL configuration is missing',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const user = await this.usersService.getUserById(sessionData.userId);
      if (!user) {
        throw new HttpException(
          { code: 101, message: 'User not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Starting game session for game: ${sessionData.game}, user: ${user.nickname}`,
      );

      const gcpRequestData = {
        game_id: parseInt(sessionData.game),
        locale: 'en',
        client_type: this.getClientType(req),
        ip: req.headers['x-forwarded-for'],
        currency: 'TRY',
        rtp: 90,
        url: {
          return_url: 'https://test.com',
          deposit_url: 'https://deposit.com',
        },
        user: {
          user_id: user.user_id,
          nickname: user.nickname,
          firstname: user.firstname,
          lastname: user.lastname,
          country: user.country,
          city: user.city,
          date_of_birth: user.date_of_birth,
          registred_at: user.registered_at,
          gender: user.gender,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post<StartGameSessionResponse>(
          `${gcpUrl}/session`,
          gcpRequestData,
          {
            headers: {
              'allingame-key': key,
            },
          },
        ),
      );

      this.logger.log(
        `Game session started successfully. URL: ${response.data.url}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to start game session:', error);
      if (error.response) {
        throw new HttpException(
          `GCP service error: ${error.response.data?.message || error.response.statusText}`,
          error.response.status,
        );
      }
      throw error;
    }
  }

  async listGames() {
    const cachedGames = await this.redisService.get('games');
    if (cachedGames) {
      return JSON.parse(cachedGames);
    }
    const gcpUrl = this.configService.getOrThrow<string>('GCP_URL');
    const key = this.configService.getOrThrow<string>('GCP_KEY');
    const response = await firstValueFrom(
      this.httpService.get<any>(`${gcpUrl}/games`, {
        headers: {
          'allingame-key': key,
        },
      }),
    );
    this.redisService.set('games', JSON.stringify(response.data), 3600); // 1 hour TTL
    return response.data;
  }

  async getUserInfo(userId: string) {
    const user = await this.usersService.getUserById(userId);
    return user;
  }

  async addActionInRedis(action: ActionDto) {
    await this.redisService.set(
      `${ACTION_PREFIX}:${action.action_id}`,
      JSON.stringify(action),
    );
  }

  async getActionFromRedis(actionId: string) {
    const action = await this.redisService.get(`${ACTION_PREFIX}:${actionId}`);
    if (!action) {
      return null;
    }
    return JSON.parse(action);
  }

  private async getOriginalResponse(
    duplicateIds: string[],
    userId: string,
  ): Promise<PlayResponse> {
    const keys = duplicateIds.map((id) => `action:${id}`);
    const results = await this.redisService.mget(keys);

    const transactions: TransactionResponse[] = [];
    let game_id = '';

    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        const existingAction = JSON.parse(results[i] as string);

        // If this is a tombstone, return empty tx_id and don't change balance
        if (existingAction.type === 'tombstone') {
          transactions.push({
            action_id: duplicateIds[i],
            tx_id: '', // Empty for tombstoned actions
            processed_at: existingAction.processed_at,
          });
        } else {
          // Normal duplicate action
          transactions.push({
            action_id: duplicateIds[i],
            tx_id: existingAction.tx_id || '',
            processed_at: existingAction.processed_at,
          });
        }

        if (!game_id && existingAction.game_id) {
          game_id = existingAction.game_id;
        }
      }
    }

    const balance = await this.balanceService.getUserBalance(userId);

    return {
      balance,
      game_id,
      transactions,
    };
  }

  private async checkDuplicateActions(actionIds: string[]): Promise<string[]> {
    const keys = actionIds.map((id) => `action:${id}`);
    const results = await this.redisService.mget(keys);

    return actionIds.filter((_, index) => results[index] !== null);
  }

  getClientType(req: Request) {
    const userAgent = req.headers['user-agent'] || '';
    const ua = userAgent.toLowerCase();

    // Mobile devices
    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone') ||
      ua.includes('ipod') ||
      ua.includes('blackberry') ||
      ua.includes('windows phone')
    ) {
      return 'mobile';
    }
    // Default to desktop
    return 'desktop';
  }
}
