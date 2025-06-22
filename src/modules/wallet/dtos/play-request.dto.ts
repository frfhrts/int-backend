import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ActionDto } from './action.dto';

export class PlayRequestDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  game: string;

  @IsString()
  @IsNotEmpty()
  game_id: string;

  @IsBoolean()
  finished: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];
}
