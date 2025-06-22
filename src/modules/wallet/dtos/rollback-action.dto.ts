import { IsString, IsNotEmpty } from 'class-validator';

export class RollbackActionDto {
  @IsString()
  @IsNotEmpty()
  original_action_id: string;

  @IsString()
  @IsNotEmpty()
  action_id: string;

  @IsString()
  action: string;
}
