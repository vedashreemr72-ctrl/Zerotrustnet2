import os
import logging
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    # Check for placeholders
    if "xyzcompany" in SUPABASE_URL or "placeholder" in SUPABASE_SERVICE_ROLE_KEY or "sample_service_role" in SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        from supabase import create_client, ClientOptions
        # Use service role key on backend to execute privileged operations & enforce RLS with auth context
        _supabase_client = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            options=ClientOptions(postgrest_client_timeout=10)
        )
        return _supabase_client
    except Exception as e:
        logging.warning(f"Could not connect to external Supabase instance: {e}. Falling back to internal engine.")
        return None

import threading

def is_supabase_connected() -> bool:
    return get_supabase_client() is not None

def _async_insert_event(audit_data):
    sb = get_supabase_client()
    if not sb:
        return
    try:
        sb.table("security_audit_events").insert(audit_data).execute()
    except Exception as e:
        logging.debug(f"Supabase sync failed (offline or table not yet migrated): {e}")

def log_event_to_supabase(audit_data: dict):
    """
    Non-blockingly synchronizes an audit log event to Supabase in a background thread.
    """
    try:
        t = threading.Thread(target=_async_insert_event, args=(audit_data,), daemon=True)
        t.start()
        return True
    except Exception:
        return False

def _async_sync_session(session_data):
    sb = get_supabase_client()
    if not sb:
        return
    try:
        sb.table("sessions").upsert(session_data).execute()
    except Exception as e:
        logging.debug(f"Supabase session sync failed: {e}")

def sync_session_to_supabase(session_data: dict):
    """
    Non-blockingly synchronizes session state to Supabase in a background thread.
    """
    try:
        t = threading.Thread(target=_async_sync_session, args=(session_data,), daemon=True)
        t.start()
        return True
    except Exception:
        return False
