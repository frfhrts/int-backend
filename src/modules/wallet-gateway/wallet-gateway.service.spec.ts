import { Test, TestingModule } from '@nestjs/testing';
import { WalletGatewayService } from './wallet-gateway.service';

describe('WalletGatewayService', () => {
  let service: WalletGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletGatewayService],
    }).compile();

    service = module.get<WalletGatewayService>(WalletGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
