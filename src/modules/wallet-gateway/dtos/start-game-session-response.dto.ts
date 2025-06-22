import { ApiProperty } from '@nestjs/swagger';

export class StartGameSessionResponseDto {
  @ApiProperty({
    description: 'Game session URL',
    example: 'https://provider_game.com/entry?JSESSIONID=XXXXXXXXXXXXXX',
  })
  url: string;
}
