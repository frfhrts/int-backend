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

export class UserDto {
  @ApiProperty({
    description: 'Unique identifier of a player in a casino. For GCP side only',
    example: '123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({
    description: 'Player first name',
    example: 'TEST_FN',
  })
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty({
    description: 'Player last name',
    example: 'TEST_LN',
  })
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({
    description: 'Player nickname (may be displayed in the game)',
    example: 'TEST',
  })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({
    description: 'Player city',
    example: 'FRANKFURT',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'Player date of birth in YYYY-MM-DD format',
    example: '1992-08-11',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_of_birth must be in YYYY-MM-DD format',
  })
  date_of_birth: string;

  @ApiProperty({
    description: 'Player registration date in YYYY-MM-DD format',
    example: '2022-08-11',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'registered_at must be in YYYY-MM-DD format',
  })
  registered_at: string;

  @ApiProperty({
    description: 'Player gender - m for male, f for female',
    example: 'm',
    enum: ['m', 'f'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['m', 'f'], { message: 'gender must be either "m" or "f"' })
  gender: string;

  @ApiProperty({
    description: '2 letters identifier of country (ISO 3166-1)',
    example: 'DE',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, {
    message: 'country must be a 2-letter ISO 3166-1 country code',
  })
  country: string;
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
