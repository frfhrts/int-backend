import { TransactionResponse } from "./transaction-response.interface";

export interface PlayResponse {
  balance: number;
  game_id: string;
  transactions: TransactionResponse[];
}
