import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { BalanceService } from '../balance/balance.service';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { PlayRequestDto } from './dtos/play-request.dto';
import { StartGameSessionDto } from './dtos/start-game-session.dto';
import { RollbackRequestDto } from './dtos/rollback-request.dto';
import { ActionDto } from './dtos/action.dto';

describe('WalletService', () => {
  let service: WalletService;
  let balanceService: BalanceService;
  let usersService: UsersService;
  let transactionsService: TransactionsService;
  let httpService: HttpService;
  let redisService: RedisService;
  let eventEmitter: EventEmitter2;

  const mockBalanceService = {
    getUserBalance: jest.fn(),
    updateUserBalance: jest.fn(),
  };

  const mockUsersService = {
    getUserById: jest.fn(),
  };

  const mockTransactionsService = {
    getTransactionByActionId: jest.fn(),
    createTransaction: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    mget: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: BalanceService, useValue: mockBalanceService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    balanceService = module.get<BalanceService>(BalanceService);
    usersService = module.get<UsersService>(UsersService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
    httpService = module.get<HttpService>(HttpService);
    redisService = module.get<RedisService>(RedisService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPlayRequest', () => {
    const mockUser = {
      user_id: 'user123',
      nickname: 'testuser',
      firstname: 'Test',
      lastname: 'User',
      country: 'TR',
      city: 'Istanbul',
      date_of_birth: '1990-01-01',
      registered_at: '2024-01-01T00:00:00.000Z',
      gender: 'M',
    };

    beforeEach(() => {
      mockUsersService.getUserById.mockResolvedValue(mockUser);
      mockRedisService.mget.mockResolvedValue([null]); // No duplicates
      mockTransactionsService.getTransactionByActionId.mockResolvedValue(null);
    });

    it('should process win action successfully', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: true,
        actions: [
          {
            action_id: 'action124',
            action: 'win',
            amount: 50,
          },
        ],
      };

      const mockTransaction = {
        id: 'tx124',
        processed_at: '2024-01-01T00:00:00.000Z',
      };

      mockBalanceService.getUserBalance.mockResolvedValueOnce(100); // Initial balance check
      mockBalanceService.updateUserBalance.mockResolvedValue(undefined);
      mockTransactionsService.createTransaction.mockResolvedValue(
        mockTransaction,
      );
      mockBalanceService.getUserBalance.mockResolvedValueOnce(150); // Final balance

      const result = await service.processPlayRequest(playRequest);

      expect(balanceService.updateUserBalance).toHaveBeenCalledWith(
        'user123',
        50,
      );
      expect(result.balance).toBe(150);
    });

    it('should throw error when insufficient balance', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: false,
        actions: [
          {
            action_id: 'action125',
            action: 'bet',
            amount: 1000,
          },
        ],
      };

      mockBalanceService.getUserBalance.mockResolvedValue(50);

      await expect(service.processPlayRequest(playRequest)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .processPlayRequest(playRequest)
        .catch((e) => e);
      expect(thrownError.getResponse()).toEqual({
        code: 100,
        message: 'Not enough funds.',
        balance: 50,
      });
    });

    it('should handle duplicate actions', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: false,
        actions: [
          {
            action_id: 'duplicate_action',
            action: 'bet',
            amount: 10,
          },
        ],
      };

      // Mock duplicate detection
      mockRedisService.mget.mockResolvedValue([
        JSON.stringify({
          tx_id: 'original_tx123',
          processed_at: '2024-01-01T00:00:00.000Z',
          game_id: 'game123',
        }),
      ]);
      mockBalanceService.getUserBalance.mockResolvedValue(100);

      const result = await service.processPlayRequest(playRequest);

      expect(result.transactions[0].action_id).toBe('duplicate_action');
      expect(result.transactions[0].tx_id).toBe('original_tx123');
    });

    it('should handle existing transaction', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: false,
        actions: [
          {
            action_id: 'existing_action',
            action: 'bet',
            amount: 10,
          },
        ],
      };

      const existingTransaction = {
        id: 'existing_tx123',
        processed_at: '2024-01-01T00:00:00.000Z',
      };

      mockBalanceService.getUserBalance.mockResolvedValue(100);
      mockTransactionsService.getTransactionByActionId.mockResolvedValue(
        existingTransaction,
      );

      const result = await service.processPlayRequest(playRequest);

      expect(result.transactions[0].tx_id).toBe('existing_tx123');
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('processBet', () => {
    it('should process bet successfully', async () => {
      mockBalanceService.getUserBalance.mockResolvedValue(100);
      mockBalanceService.updateUserBalance.mockResolvedValue(undefined);

      await service.processBet('user123', 10);

      expect(balanceService.getUserBalance).toHaveBeenCalledWith('user123');
      expect(balanceService.updateUserBalance).toHaveBeenCalledWith(
        'user123',
        -10,
      );
    });

    it('should throw error when insufficient balance', async () => {
      mockBalanceService.getUserBalance.mockResolvedValue(5);

      await expect(service.processBet('user123', 10)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('processWin', () => {
    it('should process win successfully', async () => {
      mockBalanceService.updateUserBalance.mockResolvedValue(undefined);

      await service.processWin('user123', 50);

      expect(balanceService.updateUserBalance).toHaveBeenCalledWith(
        'user123',
        50,
      );
    });
  });

  describe('processRollback', () => {
    it('should process rollback for existing bet transaction', async () => {
      const rollbackRequest: RollbackRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        actions: [
          {
            action_id: 'rollback123',
            original_action_id: 'original123',
            action: 'rollback',
          },
        ],
        finished: true,
      };

      const originalTransaction = {
        id: 'original_tx123',
        action_type: 'bet',
        amount: 10,
      };

      mockTransactionsService.getTransactionByActionId.mockResolvedValue(
        originalTransaction,
      );
      mockBalanceService.updateUserBalance.mockResolvedValue(undefined);
      mockBalanceService.getUserBalance.mockResolvedValue(110);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.processRollback(rollbackRequest);

      expect(balanceService.updateUserBalance).toHaveBeenCalledWith(
        'user123',
        10,
      ); // Add back bet amount
      expect(redisService.set).toHaveBeenCalledTimes(1); // Mark rollback as processed
      expect(result.balance).toBe(110);
    });

    it('should process rollback for existing win transaction', async () => {
      const rollbackRequest: RollbackRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        actions: [
          {
            action_id: 'rollback124',
            original_action_id: 'original124',
            action: 'rollback',
          },
        ],
        finished: true,
      };

      const originalTransaction = {
        id: 'original_tx124',
        action_type: 'win',
        amount: 50,
      };

      mockTransactionsService.getTransactionByActionId.mockResolvedValue(
        originalTransaction,
      );
      mockBalanceService.updateUserBalance.mockResolvedValue(undefined);
      mockBalanceService.getUserBalance.mockResolvedValue(50);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.processRollback(rollbackRequest);

      expect(balanceService.updateUserBalance).toHaveBeenCalledWith(
        'user123',
        -50,
      ); // Subtract win amount
      expect(result.balance).toBe(50);
    });

    it('should create tombstone for non-existent original transaction', async () => {
      const rollbackRequest: RollbackRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        actions: [
          {
            action_id: 'rollback125',
            original_action_id: 'nonexistent',
            action: 'rollback',
          },
        ],
        finished: true,
      };

      mockTransactionsService.getTransactionByActionId.mockResolvedValue(null);
      mockBalanceService.getUserBalance.mockResolvedValue(100);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.processRollback(rollbackRequest);

      expect(redisService.set).toHaveBeenCalledWith(
        'action:nonexistent',
        expect.stringContaining('tombstone'),
      );
      expect(result.transactions[0].tx_id).toBe('');
    });
  });

  describe('startGameSession', () => {
    const mockUser = {
      user_id: 'user123',
      nickname: 'testuser',
      firstname: 'Test',
      lastname: 'User',
      country: 'TR',
      city: 'Istanbul',
      date_of_birth: '1990-01-01',
      registered_at: '2024-01-01T00:00:00.000Z',
      gender: 'M',
    };

    const mockRequest = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'x-forwarded-for': '192.168.1.1',
      },
    } as any;

    it('should start game session successfully', async () => {
      const sessionData: StartGameSessionDto = {
        userId: 'user123',
        game: '1',
        currency: 'TRY',
        locale: 'en',
        urls: {
          deposit_url: 'https://deposit.com',
          return_url: 'https://return.com',
        },
      };

      const mockResponse = {
        url: 'https://game.example.com/session123',
        session_id: 'session123',
      };

      mockConfigService.getOrThrow.mockReturnValueOnce(
        'https://gcp.example.com',
      );
      mockConfigService.getOrThrow.mockReturnValueOnce('test-key');
      mockUsersService.getUserById.mockResolvedValue(mockUser);
      mockHttpService.post.mockReturnValue(of({ data: mockResponse }));

      const result = await service.startGameSession(sessionData, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://gcp.example.com/session',
        expect.objectContaining({
          game_id: 1,
          user: expect.objectContaining({
            user_id: 'user123',
            nickname: 'testuser',
          }),
        }),
        expect.objectContaining({
          headers: {
            'allingame-key': 'test-key',
          },
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should detect mobile client type', () => {
      const mobileRequest = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        },
      } as any;

      const clientType = service.getClientType(mobileRequest);
      expect(clientType).toBe('mobile');
    });
  });
});
