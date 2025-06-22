import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UrlsDto {
  @ApiProperty({
    description: 'URL user will be redirected in order to deposit',
    example: 'https://deposit.com',
  })
  @IsString()
  @IsNotEmpty()
  deposit_url: string;

  @ApiProperty({
    description: 'URL user will be redirected after playing session finished',
    example: 'https://test.com',
  })
  @IsString()
  @IsNotEmpty()
  return_url: string;
}

export class StartGameSessionDto {
  @ApiProperty({
    description: 'Game identifier player wants to play',
    example: '2436',
  })
  @IsString()
  @IsNotEmpty()
  game: string;

  @ApiProperty({
    description:
      '3 or 4 letters identifier of currency in upper case (ISO 4217)',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3,4}$/, {
    message: 'currency must be a 3 or 4 letter ISO 4217 currency code',
  })
  currency: string;

  @ApiProperty({
    description: '2 letters identifier of language in lower case (ISO 639-1)',
    example: 'en',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z]{2}$/, {
    message: 'locale must be a 2-letter ISO 639-1 language code',
  })
  locale: string;

  @ApiProperty({
    description: 'Parameters to redirect player',
    type: UrlsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UrlsDto)
  urls: UrlsDto;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
