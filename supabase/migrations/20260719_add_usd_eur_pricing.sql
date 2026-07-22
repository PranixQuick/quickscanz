-- Add price_usd and price_eur columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_usd numeric(10, 2) not null default 0.00;

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_eur numeric(10, 2) not null default 0.00;

-- Update the plans with the correct values
UPDATE public.subscription_plans SET price_usd = 1.99, price_eur = 1.89 WHERE id = 'pro' OR id = 'pro_monthly';
UPDATE public.subscription_plans SET price_usd = 11.99, price_eur = 10.99 WHERE id = 'yearly' OR id = 'pro_yearly';
UPDATE public.subscription_plans SET price_usd = 0.00, price_eur = 0.00 WHERE id = 'free';
