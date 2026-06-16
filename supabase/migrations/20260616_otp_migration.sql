-- 1. Add phone column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update trigger function to sync phone number with COALESCE to prevent data wipes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
BEGIN
  INSERT INTO public.profiles (id, email, phone)
  VALUES (new.id, new.email, new.phone)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN new;
END;
$$;
