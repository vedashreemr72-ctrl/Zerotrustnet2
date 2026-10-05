-- ==============================================================================
-- ZeroTrustNet: Supabase PostgreSQL Schema & Row Level Security (RLS) Policies
-- Enterprise Adaptive MFA, Session Management, and Insider Threat Monitoring
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'employee');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_severity') THEN
    CREATE TYPE risk_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mfa_type') THEN
    CREATE TYPE mfa_type AS ENUM ('adaptive_login', 'step_up', 'new_device', 'admin_sensitive');
  END IF;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Engineering',
    emp_type TEXT NOT NULL DEFAULT 'Full-Time Employee',
    role user_role NOT NULL DEFAULT 'employee',
    mfa_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    baseline_device TEXT DEFAULT 'Corporate Laptop',
    baseline_location TEXT DEFAULT 'Bengaluru, India',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user/role queries
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function to check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRUSTED DEVICES TABLE (For Adaptive Device-Trust Verification)
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
    trust_level TEXT NOT NULL DEFAULT 'verified', -- 'verified', 'provisional', 'untrusted'
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_devid ON public.trusted_devices(device_id);

-- 5. SESSIONS TABLE (Continuous Session Monitoring)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    role user_role NOT NULL,
    department TEXT,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_addr TEXT NOT NULL,
    device TEXT NOT NULL,
    device_id TEXT NOT NULL,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Bengaluru, India',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    risk_score INTEGER NOT NULL DEFAULT 0,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    step_up_verified_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON public.sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON public.sessions(is_active);

-- 6. MFA CHALLENGES & VERIFICATION EVENTS
CREATE TABLE IF NOT EXISTS public.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    challenge_type mfa_type NOT NULL DEFAULT 'adaptive_login',
    reason TEXT NOT NULL,
    otp_code_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'failed'
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mfa_user_status ON public.mfa_challenges(user_id, status);

-- 7. BEHAVIOR METRICS & INSIDER THREAT SIGNALS
CREATE TABLE IF NOT EXISTS public.behavior_metrics (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_time_hour INTEGER NOT NULL DEFAULT 9,
    file_access_count INTEGER NOT NULL DEFAULT 0,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    device_known INTEGER NOT NULL DEFAULT 1,
    downloads_count INTEGER NOT NULL DEFAULT 0,
    sensitive_file_count INTEGER NOT NULL DEFAULT 0,
    unusual_requests_count INTEGER NOT NULL DEFAULT 0,
    unusual_db_access_count INTEGER NOT NULL DEFAULT 0,
    privilege_change_flag INTEGER NOT NULL DEFAULT 0,
    location_change_flag INTEGER NOT NULL DEFAULT 0,
    last_known_ip TEXT NOT NULL DEFAULT '192.168.1.15',
    last_known_location TEXT NOT NULL DEFAULT 'Bengaluru, India',
    baseline_login_time TEXT NOT NULL DEFAULT '09:00',
    baseline_file_limit INTEGER NOT NULL DEFAULT 20,
    risk_score INTEGER NOT NULL DEFAULT 10,
    severity risk_severity NOT NULL DEFAULT 'Low',
    threat_classification TEXT NOT NULL DEFAULT 'Normal', -- 'Normal', 'Suspicious', 'Malicious'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SECURITY AUDIT EVENTS (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.security_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    user_name TEXT,
    department TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    event_details TEXT NOT NULL,
    ip_addr TEXT,
    device TEXT,
    risk_contrib INTEGER NOT NULL DEFAULT 0,
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_user_ts ON public.security_audit_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_suspicious ON public.security_audit_events(is_suspicious);

-- 9. SECURITY ALERTS TABLE (For SOC Admin Notifications)
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    severity risk_severity NOT NULL DEFAULT 'Medium',
    priority TEXT NOT NULL DEFAULT 'P2', -- 'P1', 'P2', 'P3'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Acknowledged', 'Resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.security_alerts(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Zero-Trust Data Isolation:
-- Employees access ONLY their own data.
-- Admins access security-management data.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- B. TRUSTED DEVICES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "devices_select_own_or_admin" ON public.trusted_devices
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "devices_insert_own_or_admin" ON public.trusted_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "devices_update_own_or_admin" ON public.trusted_devices
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "devices_delete_own_or_admin" ON public.trusted_devices
    FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- C. SESSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "sessions_select_own_or_admin" ON public.sessions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "sessions_update_admin_or_own" ON public.sessions
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- D. MFA CHALLENGES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "mfa_select_own_or_admin" ON public.mfa_challenges
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "mfa_update_own_or_admin" ON public.mfa_challenges
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- E. BEHAVIOR METRICS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "metrics_select_own_or_admin" ON public.behavior_metrics
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "metrics_admin_manage" ON public.behavior_metrics
    FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- F. SECURITY AUDIT EVENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_select_own_or_admin" ON public.security_audit_events
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Audit logs are inserted by the backend/service role or authenticated actions
CREATE POLICY "audit_insert_authenticated" ON public.security_audit_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin() OR auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- G. SECURITY ALERTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "alerts_select_admin_or_relevant_user" ON public.security_alerts
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "alerts_admin_manage" ON public.security_alerts
    FOR ALL USING (public.is_admin());

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (ON auth.users)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role := 'employee';
  user_username TEXT;
  user_name TEXT;
  user_dept TEXT := 'Engineering';
  user_emp_type TEXT := 'Full-Time Employee';
BEGIN
  -- Extract metadata or set defaults
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', user_username);
  
  IF NEW.raw_user_meta_data->>'role' = 'admin' OR user_username = 'admin' THEN
    assigned_role := 'admin';
  END IF;

  IF NEW.raw_user_meta_data->>'department' IS NOT NULL THEN
    user_dept := NEW.raw_user_meta_data->>'department';
  END IF;

  IF NEW.raw_user_meta_data->>'emp_type' IS NOT NULL THEN
    user_emp_type := NEW.raw_user_meta_data->>'emp_type';
  END IF;

  INSERT INTO public.profiles (id, username, email, full_name, department, emp_type, role, mfa_enrolled)
  VALUES (NEW.id, user_username, NEW.email, user_name, user_dept, user_emp_type, assigned_role, TRUE)
  ON CONFLICT (id) DO UPDATE 
  SET username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  -- Initialize behavior metrics
  INSERT INTO public.behavior_metrics (user_id, risk_score, severity, threat_classification)
  VALUES (NEW.id, 10, 'Low', 'Normal')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
