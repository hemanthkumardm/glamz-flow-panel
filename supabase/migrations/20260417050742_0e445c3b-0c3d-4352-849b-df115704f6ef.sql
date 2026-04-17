-- Fix search_path on remaining functions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- handle_new_user and apply_wallet_change already have search_path set, no-op
-- (already SECURITY DEFINER SET search_path = public)
SELECT 1;