-- Migration: Add weight and price_per_kg columns to capital_records_v2 table

ALTER TABLE capital_records_v2 ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE capital_records_v2 ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC;
