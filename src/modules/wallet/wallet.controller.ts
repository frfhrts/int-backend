import { Controller, Post, Body, HttpStatus, Get, Query, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { StartGameSessionDto } from './dtos/start-game-session.dto';
import { StartGameSessionResponse } from './interfaces/start-game-session-response.interface';
import { StartGameSessionResponseDto } from './dtos/start-game-session-response.dto';
import { PlayRequestDto } from './dtos/play-request.dto';
import { RollbackActionDto } from './dtos/rollback-action.dto';
import { RollbackRequestDto } from './dtos/rollback-request.dto';

@ApiTags('')
@Controller('')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('session')
  @ApiOperation({ summary: 'Start a new game session' })
  @ApiBody({ type: StartGameSessionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Game session started successfully',
    type: StartGameSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error or GCP service error',
  })
  async startGameSession(
    @Body() sessionData: StartGameSessionDto,
    @Req() req: Request,
  ): Promise<StartGameSessionResponse> {
    return await this.walletService.startGameSession(sessionData, req);
  }

  @Get('games')
  @ApiOperation({ summary: 'List all games' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Games listed successfully',
  })
  async listGames() {
    return await this.walletService.listGames();
  }

  @Post('play')
  @ApiOperation({ summary: 'Play a game' })
  @ApiBody({ type: PlayRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Game played successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async play(@Body() playRequest: PlayRequestDto) {
    return await this.walletService.processPlayRequest(playRequest);
  }

  @Post('rollback')
  @ApiOperation({ summary: 'Rollback a game' })
  @ApiBody({ type: RollbackActionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Game rolled back successfully',
  })
  async rollback(@Body() rollbackRequest: RollbackRequestDto) {
    return await this.walletService.processRollback(rollbackRequest);
  }

  @Get('me')
  @ApiQuery({ name: 'user_id', type: String })
  async getUserInfo(@Query('user_id') userId: string) {
    return await this.walletService.getUserInfo(userId);
  }
}
