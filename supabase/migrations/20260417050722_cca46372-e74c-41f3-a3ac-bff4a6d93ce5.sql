-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'wallet');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- ============ PLANS ============
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  credit_value NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_name ON public.customers(name);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  staff_name TEXT NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_flat NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_applied BOOLEAN NOT NULL DEFAULT true,
  cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  upi_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  wallet_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  upi_txn_id TEXT,
  wallet_balance_after NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_customer ON public.transactions(customer_id);
CREATE INDEX idx_tx_staff ON public.transactions(staff_id);
CREATE INDEX idx_tx_created ON public.transactions(created_at DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============ TRANSACTION ITEMS ============
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_txitem_tx ON public.transaction_items(transaction_id);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- ============ STORE SETTINGS (single row) ============
CREATE TABLE public.store_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'S M Glamz Unisex Salon',
  address TEXT NOT NULL DEFAULT 'Address line 1, City, State - PIN',
  phone TEXT NOT NULL DEFAULT '+91 00000 00000',
  gstin TEXT NOT NULL DEFAULT '00AAAAA0000A0Z0',
  gst_default_on BOOLEAN NOT NULL DEFAULT true,
  twilio_from_number TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.store_settings (id) VALUES (1);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ============ HANDLE NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- First user becomes admin, rest are staff
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ WALLET SYNC TRIGGER ============
-- After a transaction inserts: deduct wallet_amount, add plan credit if any (handled in app)
CREATE OR REPLACE FUNCTION public.apply_wallet_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_balance NUMERIC(10,2);
BEGIN
  IF NEW.wallet_amount > 0 THEN
    UPDATE public.customers
    SET wallet_balance = wallet_balance - NEW.wallet_amount
    WHERE id = NEW.customer_id
    RETURNING wallet_balance INTO new_balance;

    UPDATE public.transactions SET wallet_balance_after = new_balance WHERE id = NEW.id;
  ELSE
    SELECT wallet_balance INTO new_balance FROM public.customers WHERE id = NEW.customer_id;
    UPDATE public.transactions SET wallet_balance_after = new_balance WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tx_wallet AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_wallet_change();

-- ============ RLS POLICIES ============

-- profiles: users see own; admins see all
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- user_roles: anyone authenticated can read own roles; admins manage all
CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- plans: all authenticated read; only admin writes
CREATE POLICY "Plans readable" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- services: all authenticated read; only admin writes
CREATE POLICY "Services readable" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- customers: all authenticated read+insert+update; only admin delete
CREATE POLICY "Customers readable" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers insertable" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customers updatable" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- transactions: all authenticated read+insert; only admin delete; no updates
CREATE POLICY "Transactions readable" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());
CREATE POLICY "Admins delete transactions" ON public.transactions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- transaction_items: same pattern
CREATE POLICY "TX items readable" ON public.transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "TX items insertable" ON public.transaction_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins delete tx items" ON public.transaction_items FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- store_settings: all read; admin write
CREATE POLICY "Settings readable" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));