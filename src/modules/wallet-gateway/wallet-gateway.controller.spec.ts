import { Test, TestingModule } from '@nestjs/testing';
import { WalletGatewayController } from './wallet-gateway.controller';

describe('WalletGatewayController', () => {
  let controller: WalletGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletGatewayController],
    }).compile();

    controller = module.get<WalletGatewayController>(WalletGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
