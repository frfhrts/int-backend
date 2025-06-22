import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: TransactionsService;

  const mockTransactionsService = {
    getTransactions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTransactions', () => {
    it('should return transactions for a valid user', async () => {
      const userId = 'user123';
      const expectedTransactions = [
        {
          id: 'tx1',
          user_id: 'user123',
          action_type: 'bet',
          amount: 50,
          currency: 'TRY',
          game: 'slot_game',
          game_id: 'game123',
          processed_at: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'tx2',
          user_id: 'user123',
          action_type: 'win',
          amount: 100,
          currency: 'TRY',
          game: 'slot_game',
          game_id: 'game123',
          processed_at: '2024-01-01T10:01:00.000Z',
        },
      ];

      mockTransactionsService.getTransactions.mockResolvedValue(
        expectedTransactions,
      );

      const result = await controller.getTransactions(userId);

      expect(transactionsService.getTransactions).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedTransactions);
    });

    it('should return empty array when user has no transactions', async () => {
      const userId = 'user456';
      const expectedTransactions = [];

      mockTransactionsService.getTransactions.mockResolvedValue(
        expectedTransactions,
      );

      const result = await controller.getTransactions(userId);

      expect(transactionsService.getTransactions).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedTransactions);
    });

    it('should propagate service errors', async () => {
      const userId = 'user123';
      const error = new Error('Database connection failed');

      mockTransactionsService.getTransactions.mockRejectedValue(error);

      await expect(controller.getTransactions(userId)).rejects.toThrow(
        'Database connection failed',
      );
      expect(transactionsService.getTransactions).toHaveBeenCalledWith(userId);
    });
  });
});
