-- Jalankan query ini di SQL Editor Supabase Anda

CREATE TABLE public.capital_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  buy_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.capital_records ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar user hanya bisa melihat, menambah, mengubah, dan menghapus datanya sendiri
CREATE POLICY "Users can view their own capital records"
ON public.capital_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own capital records"
ON public.capital_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own capital records"
ON public.capital_records FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own capital records"
ON public.capital_records FOR DELETE
USING (auth.uid() = user_id);
