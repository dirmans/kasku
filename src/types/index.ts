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

export interface Supplier {
  id: number;
  user_id: string;
  name: string;
  contact_info?: string | null;
  description?: string | null;
  created_at?: string;
}

export interface CustomerInvoice {
  id: number;
  user_id: string;
  customer_name: string;
  invoice_number: string;
  date: string;
  status: 'lunas' | 'dp' | 'belum_lunas';
  total_amount: number;
  paid_amount: number;
  note?: string | null;
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
  supplier_id?: number | null;
  customer_invoice_id?: number | null;
  weight?: number | null;
  price_per_kg?: number | null;
  suppliers?: {
    name: string;
  } | null;
}

export interface SupplierPayment {
  id: number;
  user_id: string;
  supplier_id: number;
  payment_method_id?: number | null;
  amount: number;
  payment_date: string;
  note?: string | null;
  created_at?: string;
  payment_methods?: {
    name: string;
    emoji?: string;
  } | null;
}

export interface CustomerPayment {
  id: number;
  user_id: string;
  customer_invoice_id: number;
  payment_method_id?: number | null;
  amount: number;
  payment_date: string;
  note?: string | null;
  created_at?: string;
  payment_methods?: {
    name: string;
    emoji?: string;
  } | null;
}

export interface PaymentMethod {
  id: number;
  user_id: string;
  name: string;
  emoji?: string;
  created_at?: string;
}
