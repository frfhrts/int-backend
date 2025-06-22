import { IsString, IsNotEmpty, IsNumber, IsIn, Min } from 'class-validator';

export class ActionDto {
  @IsString()
  @IsIn(['bet', 'win'])
  action: 'bet' | 'win';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  action_id: string;
}
