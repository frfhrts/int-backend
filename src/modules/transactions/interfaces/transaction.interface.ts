export interface Transaction {
  id: string;
  user_id: string;
  game_id: string;
  action_id: string;
  action_type: 'bet' | 'win' | 'rollback';
  amount: number;
  processed_at: string;
  currency: string;
  game: string;
}
