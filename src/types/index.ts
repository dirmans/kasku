export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface Transaction {
  id: number;
  user_id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  date: string;
  description: string;
  category: string;
  method?: string;
  note?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  type: 'pemasukan' | 'pengeluaran';
  emoji?: string;
  created_at?: string;
}

export interface CapitalRecord {
  id: number;
  user_id: string;
  item_name: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  date: string;
  note?: string;
  created_at?: string;
}
