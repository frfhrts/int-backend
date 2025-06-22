import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PlayRequestDto } from './dtos/play-request.dto';
import { StartGameSessionDto } from './dtos/start-game-session.dto';
import { RollbackRequestDto } from './dtos/rollback-request.dto';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: WalletService;

  const mockWalletService = {
    processPlayRequest: jest.fn(),
    startGameSession: jest.fn(),
    listGames: jest.fn(),
    getUserInfo: jest.fn(),
    processRollback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    walletService = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPlayRequest', () => {
    it('should process play request successfully with bet action', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: false,
        actions: [
          {
            action_id: 'action123',
            action: 'bet',
            amount: 10,
          },
        ],
      };

      const expectedResponse = {
        balance: 90,
        game_id: 'game123',
        transactions: [
          {
            action_id: 'action123',
            tx_id: 'tx123',
            processed_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockWalletService.processPlayRequest.mockResolvedValue(expectedResponse);

      const result = await controller.play(playRequest);

      expect(walletService.processPlayRequest).toHaveBeenCalledWith(
        playRequest,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should process play request successfully with win action', async () => {
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

      const expectedResponse = {
        balance: 150,
        game_id: 'game123',
        transactions: [
          {
            action_id: 'action124',
            tx_id: 'tx124',
            processed_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockWalletService.processPlayRequest.mockResolvedValue(expectedResponse);

      const result = await controller.play(playRequest);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle insufficient balance error', async () => {
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

      const error = new HttpException(
        { code: 100, message: 'Not enough funds.' },
        412,
      );

      mockWalletService.processPlayRequest.mockRejectedValue(error);

      await expect(controller.play(playRequest)).rejects.toThrow(HttpException);
    });

    it('should handle user not found error', async () => {
      const playRequest: PlayRequestDto = {
        user_id: 'nonexistent',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        finished: false,
        actions: [],
      };

      const error = new HttpException(
        { code: 101, message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );

      mockWalletService.processPlayRequest.mockRejectedValue(error);

      await expect(controller.play(playRequest)).rejects.toThrow(HttpException);
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

      const expectedResponse = {
        balance: 100,
        game_id: 'game123',
        transactions: [
          {
            action_id: 'duplicate_action',
            tx_id: 'original_tx123',
            processed_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockWalletService.processPlayRequest.mockResolvedValue(expectedResponse);

      const result = await controller.play(playRequest);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('startGameSession', () => {
    it('should start game session successfully', async () => {
      const sessionData: StartGameSessionDto = {
        userId: 'user123',
        game: '1',
        currency: 'USD',
        locale: 'en',
        urls: {
          deposit_url: 'https://deposit.example.com',
          return_url: 'https://return.example.com',
        },
      };

      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'x-forwarded-for': '192.168.1.1',
        },
      } as any;

      const expectedResponse = {
        url: 'https://game.example.com/session123',
      };

      mockWalletService.startGameSession.mockResolvedValue(expectedResponse);

      const result = await controller.startGameSession(
        sessionData,
        mockRequest,
      );

      expect(walletService.startGameSession).toHaveBeenCalledWith(
        sessionData,
        mockRequest,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle user not found in game session', async () => {
      const sessionData: StartGameSessionDto = {
        userId: 'nonexistent',
        game: '1',
        currency: 'USD',
        locale: 'en',
        urls: {
          deposit_url: 'https://deposit.example.com',
          return_url: 'https://return.example.com',
        },
      };

      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
        },
      } as any;

      const error = new HttpException(
        { code: 101, message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );

      mockWalletService.startGameSession.mockRejectedValue(error);

      await expect(
        controller.startGameSession(sessionData, mockRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('listGames', () => {
    it('should return list of games', async () => {
      const expectedGames = [
        {
          id: 1085,
          producer: 'evolution',
          title: 'Casino Malta Roulette',
          category: 'roulette',
          theme: 'other',
          has_freespins: false,
          feature_group: 'lightning',
          devices: ['desktop', 'mobile'],
          licenses: ['BG', 'CW', 'EE', 'MT'],
          jackpot_type: 'Not Available',
          forbid_bonus_play: false,
          lines: 0,
          payout: 0,
          volatility_rating: 'None',
          has_jackpot: false,
          hd: true,
          restrictions: {},
          has_live: true,
        },
        {
          id: 1228,
          producer: 'evolution',
          title: 'Crazy Coin Flip',
          category: 'slots',
          theme: 'luxury_life',
          has_freespins: false,
          feature_group: 'lightning',
          devices: ['desktop', 'mobile'],
          licenses: ['BG', 'CA-ON', 'CW', 'EE', 'GR', 'MT', 'NL', 'ZA'],
          jackpot_type: 'Not Available',
          forbid_bonus_play: true,
          lines: 0,
          payout: 0,
          volatility_rating: 'None',
          has_jackpot: false,
          hd: true,
          restrictions: {},
          has_live: true,
        },
      ];

      mockWalletService.listGames.mockResolvedValue(expectedGames);

      const result = await controller.listGames();

      expect(walletService.listGames).toHaveBeenCalled();
      expect(result).toEqual(expectedGames);
    });

    it('should handle games service error', async () => {
      const error = new HttpException(
        'Games service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      mockWalletService.listGames.mockRejectedValue(error);

      await expect(controller.listGames()).rejects.toThrow(HttpException);
    });
  });

  describe('getUserInfo', () => {
    it('should return user information', async () => {
      const userId = 'user123';
      const expectedUserInfo = {
        user_id: 'user123',
        nickname: 'testuser',
        firstname: 'Test',
        lastname: 'User',
        country: 'TR',
        city: 'Istanbul',
        date_of_birth: '1990-01-01',
        registered_at: '2024-01-01T00:00:00.000Z',
        gender: 'M',
        balance: 1000,
      };

      mockWalletService.getUserInfo.mockResolvedValue(expectedUserInfo);

      const result = await controller.getUserInfo(userId);

      expect(walletService.getUserInfo).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUserInfo);
    });

    it('should handle user not found', async () => {
      const userId = 'nonexistent';

      mockWalletService.getUserInfo.mockResolvedValue(null);

      const result = await controller.getUserInfo(userId);

      expect(result).toBeNull();
    });
  });

  describe('processRollback', () => {
    it('should process rollback successfully', async () => {
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

      const expectedResponse = {
        balance: 110,
        game_id: 'game123',
        transactions: [
          {
            action_id: 'rollback123',
            tx_id: 'original_tx123',
            processed_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockWalletService.processRollback.mockResolvedValue(expectedResponse);

      const result = await controller.rollback(rollbackRequest);

      expect(walletService.processRollback).toHaveBeenCalledWith(
        rollbackRequest,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle rollback with tombstone', async () => {
      const rollbackRequest: RollbackRequestDto = {
        user_id: 'user123',
        currency: 'TRY',
        game: 'slot_game',
        game_id: 'game123',
        actions: [
          {
            action_id: 'rollback124',
            original_action_id: 'nonexistent_original',
            action: 'rollback',
          },
        ],
        finished: true,
      };

      const expectedResponse = {
        balance: 100,
        game_id: 'game123',
        transactions: [
          {
            action_id: 'rollback124',
            tx_id: '',
            processed_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      mockWalletService.processRollback.mockResolvedValue(expectedResponse);

      const result = await controller.rollback(rollbackRequest);

      expect(result).toEqual(expectedResponse);
    });
  });
});
