export class CreateTransactionDto {
  user_id: string;
  game_id: string;
  action_id: string;
  action_type: 'bet' | 'win' | 'rollback';
  amount: number;
  currency: string;
  game: string;
  processed_at: string;
}
