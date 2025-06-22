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

@Injectable()
export class WalletGatewayService {
  private readonly logger = new Logger(WalletGatewayService.name);

  constructor(
    private readonly balanceService: BalanceService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async processPlayRequest(playRequest: PlayRequestDto): Promise<PlayResponse> {
    try {
      let { user_id, currency, game, game_id, finished, actions } = playRequest;
      finished = finished || false;
      const user = await this.usersService.getUserById(user_id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      console.log('ActionsList: ', playRequest);
      const transactions: TransactionResponse[] = [];
      for (const action of actions || []) {
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
    await this.balanceService.updateUserBalance(userId, amount);
  }

  async processRollback(rollbackRequest: RollbackRequestDto) {
    try {
      this.logger.debug(
        `Processing rollback for user: ${rollbackRequest.user_id}`,
      );
      const transactions: TransactionResponse[] = [];
      const userBalance = await this.balanceService.getUserBalance(
        rollbackRequest.user_id,
      );
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
          return {
            balance: userBalance,
            game_id: rollbackRequest.game_id,
            transactions: [
              {
                action_id: action.action_id,
                tx_id: '',
                processed_at: new Date().toISOString(),
              },
            ],
          };
        }
        if (originalTransaction.action_type === 'bet') {
          console.log('Processing bet rollback');
          await this.balanceService.updateUserBalance(
            rollbackRequest.user_id,
            originalTransaction.amount,
          );
        }
        if (originalTransaction.action_type === 'win') {
          console.log('Processing win rollback');
          await this.balanceService.updateUserBalance(
            rollbackRequest.user_id,
            -originalTransaction.amount,
          );
        }
        transactions.push({
          action_id: action.action_id,
          tx_id: originalTransaction.id,
          processed_at: originalTransaction.processed_at,
        });
      }

      return {
        balance: userBalance,
        game_id: rollbackRequest.game_id,
        transactions,
      };
    } catch (error) {
      this.logger.error('Error while processing rollback:', error);
      throw new HttpException(
        'Error while processing rollback',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processBet(userId: string, amount: number) {
    console.log('Processing bet for user:', userId, 'amount:', amount);
    const usersBalance = await this.balanceService.getUserBalance(userId);
    if (usersBalance < amount) {
      console.log('Throwing insufficient balance error');
      const errorResponse = {
        code: 100,
        message: 'Not enough funds.',
        balance: usersBalance,
      };
      throw new HttpException(errorResponse, 412);
    }
    await this.balanceService.updateUserBalance(userId, -amount);
  }

  async startGameSession(
    sessionData: StartGameSessionDto,
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

      this.logger.log(
        `Starting game session for game: ${sessionData.game}, user: ${sessionData.user.nickname}`,
      );

      // Transform the request data to match GCP API format
      const gcpRequestData = {
        game_id: parseInt(sessionData.game),
        locale: sessionData.locale,
        client_type: sessionData.client_type,
        ip: sessionData.ip,
        currency: sessionData.currency,
        rtp: sessionData.rtp,
        url: {
          return_url: sessionData.urls.return_url,
          deposit_url: sessionData.urls.deposit_url,
        },
        user: {
          user_id: sessionData.user.user_id,
          nickname: sessionData.user.nickname,
          firstname: sessionData.user.firstname,
          lastname: sessionData.user.lastname,
          country: sessionData.user.country,
          city: sessionData.user.city,
          date_of_birth: sessionData.user.date_of_birth,
          registred_at: sessionData.user.registered_at, // Note: GCP expects "registred_at" (typo in their API)
          gender: sessionData.user.gender,
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
      throw new HttpException(
        'Failed to start game session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listGames() {
    const gcpUrl = this.configService.getOrThrow<string>('GCP_URL');
    const key = this.configService.getOrThrow<string>('GCP_KEY');
    const response = await firstValueFrom(
      this.httpService.get<any>(`${gcpUrl}/games`, {
        headers: {
          'allingame-key': key,
        },
      }),
    );
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
}
