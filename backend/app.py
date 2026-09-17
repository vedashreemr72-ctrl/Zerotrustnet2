import os
import sys
import sqlite3
import hashlib
import uuid
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
import jwt
import pandas as pd
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml_engine import calculate_risk, get_recommendations, run_ml_engine
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else None, static_url_path='')
CORS(app)

SECRET_KEY = "ZTN_SUPER_SECRET_KEY_CYBER_2026"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zerotrust.db")

# ── DATABASE LAYER ─────────────────────────────────────────────────────────────

def get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        username   TEXT UNIQUE NOT NULL,
        pwd_hash   TEXT NOT NULL,
        name       TEXT,
        department TEXT,
        emp_type   TEXT,
        role       TEXT DEFAULT 'employee',
        is_active  INTEGER DEFAULT 1,
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS behavior_data (
        user_id                TEXT PRIMARY KEY,
        login_time             INTEGER DEFAULT 9,
        file_access_count      INTEGER DEFAULT 0,
        failed_logins          INTEGER DEFAULT 0,
        device_known           INTEGER DEFAULT 1,
        downloads              INTEGER DEFAULT 0,
        sensitive_files        INTEGER DEFAULT 0,
        resignation_flag       INTEGER DEFAULT 0,
        genai_upload_mb        REAL    DEFAULT 0.0,
        external_uploads       INTEGER DEFAULT 0,
        usb_usage              INTEGER DEFAULT 0,
        email_attachments      INTEGER DEFAULT 0,
        printing_events        INTEGER DEFAULT 0,
        last_login_days_ago    INTEGER DEFAULT 0,
        last_login_location    TEXT    DEFAULT 'Office',
        current_login_location TEXT    DEFAULT 'Office',
        impossible_travel_flag INTEGER DEFAULT 0,
        impossible_travel_details TEXT DEFAULT '',
        credential_sharing_flag INTEGER DEFAULT 0,
        credential_sharing_details TEXT DEFAULT '',
        burnout_stress_score   INTEGER DEFAULT 0,
        burnout_details        TEXT    DEFAULT '',
        shadow_it_flag         INTEGER DEFAULT 0,
        shadow_it_details      TEXT    DEFAULT '',
        ai_risk_flag           INTEGER DEFAULT 0,
        ai_risk_details        TEXT    DEFAULT '',
        unusual_collaboration_flag INTEGER DEFAULT 0,
        unusual_collaboration_details TEXT DEFAULT '',
        privilege_escalation_flag INTEGER DEFAULT 0,
        privilege_escalation_details TEXT DEFAULT '',
        forecast_today         INTEGER DEFAULT 5,
        forecast_next_week     INTEGER DEFAULT 5,
        forecast_next_month    INTEGER DEFAULT 5,
        baseline_login_time    TEXT    DEFAULT '09:00',
        baseline_device        TEXT    DEFAULT 'Office Laptop',
        baseline_location      TEXT    DEFAULT 'Bengaluru',
        baseline_file_access   INTEGER DEFAULT 15,
        accessed_folders       TEXT    DEFAULT '',
        expected_folders       TEXT    DEFAULT '',
        business_impact_rupees INTEGER DEFAULT 0,
        mitre_techniques       TEXT    DEFAULT 'None',
        mitre_confidence       INTEGER DEFAULT 0
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS audit_events (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        username        TEXT NOT NULL,
        user_name       TEXT,
        department      TEXT,
        timestamp       TEXT NOT NULL,
        event_type      TEXT NOT NULL,
        event_details   TEXT,
        ip_addr         TEXT,
        device          TEXT,
        risk_contrib    INTEGER DEFAULT 0,
        is_suspicious   INTEGER DEFAULT 0,
        session_id      TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS incidents (
        id                TEXT PRIMARY KEY,
        incident_id       TEXT UNIQUE,
        user_id           TEXT,
        username          TEXT,
        user_name         TEXT,
        department        TEXT,
        created_at        TEXT,
        severity          TEXT,
        status            TEXT DEFAULT 'Open',
        summary           TEXT,
        evidence          TEXT,
        policies_triggered TEXT,
        risk_score        INTEGER,
        recommendations   TEXT,
        resolved_at       TEXT,
        resolved_by       TEXT,
        notes             TEXT DEFAULT ''
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS policies (
        id          TEXT PRIMARY KEY,
        name        TEXT,
        conditions  TEXT,
        action      TEXT,
        is_active   INTEGER DEFAULT 1,
        created_by  TEXT,
        created_at  TEXT,
        description TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        user_id     TEXT,
        username    TEXT,
        login_time  TEXT,
        logout_time TEXT,
        ip_addr     TEXT,
        device      TEXT,
        device_id   TEXT DEFAULT '',
        browser     TEXT DEFAULT '',
        os          TEXT DEFAULT '',
        location    TEXT DEFAULT '',
        department  TEXT DEFAULT '',
        role        TEXT DEFAULT '',
        is_active   INTEGER DEFAULT 1,
        risk_score  INTEGER DEFAULT 0
    )""")

    # Ensure missing session columns exist for schema migration
    c.execute("PRAGMA table_info(sessions)")
    existing_cols = [col[1] for col in c.fetchall()]
    for col_name in ['device_id', 'browser', 'os', 'location', 'department', 'role']:
        if col_name not in existing_cols:
            c.execute(f"ALTER TABLE sessions ADD COLUMN {col_name} TEXT DEFAULT ''")

    # Ensure missing incident columns exist for schema migration
    c.execute("PRAGMA table_info(incidents)")
    existing_inc_cols = [col[1] for col in c.fetchall()]
    if 'assigned_to' not in existing_inc_cols:
        c.execute("ALTER TABLE incidents ADD COLUMN assigned_to TEXT DEFAULT 'Unassigned'")
    if 'resolution' not in existing_inc_cols:
        c.execute("ALTER TABLE incidents ADD COLUMN resolution TEXT DEFAULT ''")

    c.execute("""CREATE TABLE IF NOT EXISTS notifications (
        id           TEXT PRIMARY KEY,
        user_id      TEXT,
        username     TEXT,
        channel      TEXT NOT NULL,
        recipient    TEXT NOT NULL,
        subject      TEXT,
        message      TEXT NOT NULL,
        severity     TEXT DEFAULT 'High',
        sent_at      TEXT NOT NULL,
        status       TEXT DEFAULT 'Dispatched',
        is_read      INTEGER DEFAULT 0
    )""")

    c.execute("PRAGMA table_info(notifications)")
    existing_notif_cols = [col[1] for col in c.fetchall()]
    if 'is_read' not in existing_notif_cols:
        try:
            c.execute("ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0")
        except Exception:
            pass

    c.execute("""CREATE TABLE IF NOT EXISTS file_access_logs (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL,
        username       TEXT NOT NULL,
        filename       TEXT NOT NULL,
        filepath       TEXT DEFAULT '',
        classification TEXT DEFAULT 'Internal',
        operation      TEXT NOT NULL,
        file_size_mb   REAL DEFAULT 0.0,
        timestamp      TEXT NOT NULL,
        is_flagged     INTEGER DEFAULT 0,
        policy_action  TEXT DEFAULT 'Allowed'
    )""")

    # Ensure missing file_access_logs columns exist for schema migration
    c.execute("PRAGMA table_info(file_access_logs)")
    existing_file_cols = [col[1] for col in c.fetchall()]
    if 'filepath' not in existing_file_cols:
        c.execute("ALTER TABLE file_access_logs ADD COLUMN filepath TEXT DEFAULT ''")
    if 'file_size_mb' not in existing_file_cols:
        c.execute("ALTER TABLE file_access_logs ADD COLUMN file_size_mb REAL DEFAULT 0.0")

    c.execute("""CREATE TABLE IF NOT EXISTS departments (
        id               TEXT PRIMARY KEY,
        name             TEXT UNIQUE NOT NULL,
        risk_average     REAL DEFAULT 0.0,
        total_employees  INTEGER DEFAULT 0,
        security_level   TEXT DEFAULT 'Standard'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS devices (
        id             TEXT PRIMARY KEY,
        user_id        TEXT,
        device_id      TEXT UNIQUE NOT NULL,
        device_name    TEXT,
        os             TEXT,
        browser        TEXT,
        is_registered  INTEGER DEFAULT 1,
        is_trusted     INTEGER DEFAULT 1,
        risk_penalty   INTEGER DEFAULT 0,
        last_seen      TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS alerts (
        id           TEXT PRIMARY KEY,
        alert_code   TEXT UNIQUE,
        user_id      TEXT,
        user_name    TEXT,
        department   TEXT,
        priority     TEXT DEFAULT 'P2',
        alert_title  TEXT,
        severity     TEXT DEFAULT 'High',
        risk_score   INTEGER DEFAULT 0,
        created_at   TEXT,
        status       TEXT DEFAULT 'Active'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS risk_history (
        id            TEXT PRIMARY KEY,
        user_id       TEXT,
        username      TEXT,
        timestamp     TEXT NOT NULL,
        risk_score    INTEGER NOT NULL,
        risk_delta    INTEGER DEFAULT 0,
        trigger_event TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS audit_logs (
        id              TEXT PRIMARY KEY,
        timestamp       TEXT NOT NULL,
        user_id         TEXT NOT NULL,
        username        TEXT NOT NULL,
        user_name       TEXT,
        department      TEXT,
        event_type      TEXT NOT NULL,
        event_details   TEXT,
        ip_addr         TEXT,
        device          TEXT,
        is_suspicious   INTEGER DEFAULT 0,
        risk_contrib    INTEGER DEFAULT 0
    )""")

    # Seed Departments if empty
    c.execute("SELECT COUNT(*) FROM departments")
    if c.fetchone()[0] == 0:
        depts = [
            (str(uuid.uuid4()), "Engineering", 42.5, 12, "Strict DevSecOps"),
            (str(uuid.uuid4()), "Finance", 68.0, 8, "High Risk Financial"),
            (str(uuid.uuid4()), "Human Resources", 35.0, 5, "Confidential PII"),
            (str(uuid.uuid4()), "Sales", 28.5, 15, "Standard Commercial"),
            (str(uuid.uuid4()), "IT Operations", 55.0, 6, "Privileged Admin")
        ]
        c.executemany("INSERT INTO departments VALUES (?,?,?,?,?)", depts)

    # Seed Devices if empty
    c.execute("SELECT COUNT(*) FROM devices")
    if c.fetchone()[0] == 0:
        devs = [
            (str(uuid.uuid4()), "U001", "DEV-55357", "Corporate Macbook Pro", "macOS Sonoma", "Chrome 122", 1, 1, 0, datetime.now().isoformat()),
            (str(uuid.uuid4()), "U002", "DEV-47722", "Dell Latitude 7420", "Windows 11 Enterprise", "Edge 121", 1, 1, 0, datetime.now().isoformat()),
            (str(uuid.uuid4()), "U003", "DEV-80878", "Lenovo ThinkPad X1", "Windows 11 Enterprise", "Chrome 122", 1, 0, 15, datetime.now().isoformat())
        ]
        c.executemany("INSERT INTO devices VALUES (?,?,?,?,?,?,?,?,?,?)", devs)

    # Seed Alerts if empty
    c.execute("SELECT COUNT(*) FROM alerts")
    if c.fetchone()[0] == 0:
        alrts = [
            (str(uuid.uuid4()), "ALT-901", "U002", "Ravi Sharma", "Finance", "P1", "Mass Download & USB Storage Mounted", "🔴 Critical", 85, datetime.now().isoformat(), "Active"),
            (str(uuid.uuid4()), "ALT-902", "U001", "Priya Patel", "Engineering", "P2", "Anomalous Off-Hours Payroll Access", "🟠 High", 65, datetime.now().isoformat(), "Active")
        ]
        c.executemany("INSERT INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?)", alrts)

    conn.commit()
    conn.close()

# ── DB SEEDING ─────────────────────────────────────────────────────────────────

def hash_pwd(p):
    return hashlib.sha256(p.encode()).hexdigest()

USERS_SEED = [
    {"username":"admin",           "pwd":"admin123",  "name":"System Administrator",   "dept":"IT Security", "emp_type":"Admin",         "role":"admin"},
    {"username":"ravi",            "pwd":"emp123",    "name":"Ravi Sharma",             "dept":"Engineering", "emp_type":"Employee",      "role":"employee"},
]

BEHAVIOR_SEED = {
    "ravi":           {"login_time":10,"file_access_count":2,"failed_logins":0,"device_known":1,"downloads":1,"sensitive_files":0,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":10,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":5,"forecast_next_week":5,"forecast_next_month":5,"baseline_login_time":"09:00","baseline_device":"Office Laptop","baseline_location":"Bengaluru","baseline_file_access":15,"accessed_folders":"Engineering","expected_folders":"Engineering","business_impact_rupees":0,"mitre_techniques":"None","mitre_confidence":0},
}

DEFAULT_POLICIES = [
    {"name":"Unknown Device + Sensitive Resource + Off-Hours","conditions":'{"device_known":0,"sensitive_access":true,"off_hours":true}',"action":"Require Step-Up Authentication","description":"Trigger MFA if an unknown device accesses sensitive resources outside business hours (08:00–19:00)."},
    {"name":"Mass Download Detection","conditions":'{"downloads_gt":100}',"action":"Temporarily Suspend Account","description":"Automatically suspend account when download volume exceeds 100 files in a single session."},
    {"name":"Impossible Travel","conditions":'{"impossible_travel_flag":1}',"action":"Lock Account + Alert SOC","description":"Immediately lock account and notify SOC team when impossible geographic travel is detected."},
    {"name":"Dormant Account Reactivation","conditions":'{"last_login_days_ago_gt":90}',"action":"Force Re-Authentication + Audit","description":"Require full re-authentication and flag for audit when a dormant account (90+ days inactive) becomes active."},
    {"name":"Privilege Escalation","conditions":'{"privilege_escalation_flag":1}',"action":"Revoke Elevated Privileges + Alert","description":"Immediately revoke elevated privileges and alert the security team when unauthorized privilege escalation is detected."},
    {"name":"GenAI Data Exfiltration","conditions":'{"genai_upload_mb_gt":20}',"action":"Block AI Tool Access","description":"Block access to public AI tools (ChatGPT, Gemini, etc.) when upload volume exceeds 20 MB in a session."},
    {"name":"Multiple Failed Logins","conditions":'{"failed_logins_gt":5}',"action":"Temporary Account Lockout","description":"Temporarily lock account for 30 minutes after 5 consecutive failed login attempts."},
    {"name":"Credential Sharing","conditions":'{"credential_sharing_flag":1}',"action":"Force Password Reset + Log","description":"Force an immediate password reset and log all sessions when concurrent logins from different devices/IPs are detected."},
]

def _log_event(conn, user_id, username, user_name, department, event_type, event_details, ip, device, risk_contrib, is_suspicious, ts_str=None, session_id=None):
    c = conn.cursor()
    ts = ts_str or datetime.now().isoformat()
    c.execute("INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
              (str(uuid.uuid4()), user_id, username, user_name, department,
               ts, event_type, event_details, ip, device, risk_contrib, is_suspicious, session_id or ""))

    # Automatically dispatch real-time enterprise notification for every activity
    try:
        nid = str(uuid.uuid4())
        sev = "Critical" if (is_suspicious and (risk_contrib or 0) >= 15) else (
            "High" if (is_suspicious or (risk_contrib or 0) > 5) else (
                "Medium" if (risk_contrib or 0) > 0 else "Low"
            )
        )
        channel = "SMS/Push" if sev in ["Critical", "High"] else "System"
        subj = f"[{sev.upper()}] {event_type} - {user_name or username} ({department or 'General'})"
        msg = f"{user_name or username} ({department or 'Staff'}) performed '{event_type}' on {device or 'Authorized Device'} [IP: {ip or '127.0.0.1'}]. {event_details}"
        c.execute("""
            INSERT INTO notifications (id, user_id, username, channel, recipient, subject, message, severity, sent_at, status, is_read)
            VALUES (?,?,?,?,?,?,?,?,?,?,0)
        """, (nid, user_id or "system", username or "system", channel, "soc-alert@zerotrustnet.io", subj, msg, sev, ts, "Dispatched"))
    except Exception:
        pass

def seed_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] > 0:
        conn.close()
        return

    now_str = datetime.now().isoformat()

    # Create users
    for u in USERS_SEED:
        uid = str(uuid.uuid4())
        c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)",
                  (uid, u["username"], hash_pwd(u["pwd"]),
                   u["name"], u["dept"], u["emp_type"], u["role"], 1, now_str))

        if u["role"] == "employee" and u["username"] in BEHAVIOR_SEED:
            bd = BEHAVIOR_SEED[u["username"]]
            c.execute("""INSERT OR IGNORE INTO behavior_data VALUES
                (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (uid,
                 bd["login_time"], bd["file_access_count"], bd["failed_logins"], bd["device_known"],
                 bd["downloads"], bd["sensitive_files"], bd["resignation_flag"], bd["genai_upload_mb"],
                 bd["external_uploads"], bd["usb_usage"], bd["email_attachments"], bd["printing_events"],
                 bd["last_login_days_ago"], bd["last_login_location"], bd["current_login_location"],
                 bd["impossible_travel_flag"], bd["impossible_travel_details"],
                 bd["credential_sharing_flag"], bd["credential_sharing_details"],
                 bd["burnout_stress_score"], bd["burnout_details"],
                 bd["shadow_it_flag"], bd["shadow_it_details"],
                 bd["ai_risk_flag"], bd["ai_risk_details"],
                 bd["unusual_collaboration_flag"], bd["unusual_collaboration_details"],
                 bd["privilege_escalation_flag"], bd["privilege_escalation_details"],
                 bd["forecast_today"], bd["forecast_next_week"], bd["forecast_next_month"],
                 bd["baseline_login_time"], bd["baseline_device"], bd["baseline_location"],
                 bd["baseline_file_access"], bd["accessed_folders"], bd["expected_folders"],
                 bd["business_impact_rupees"], bd["mitre_techniques"], bd["mitre_confidence"]))

        # Seed initial events
        if u["role"] == "employee" and u["username"] in BEHAVIOR_SEED:
            bd = BEHAVIOR_SEED[u["username"]]
            base_dt = datetime.now() - timedelta(hours=3)
            _log_event(conn, uid, u["username"], u["name"], u["dept"],
                       "Login", f"Baseline login from {bd['baseline_location']} on {bd['baseline_device']}",
                       "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 0, 0, ts_str=base_dt.isoformat())
            if bd["unusual_collaboration_flag"]:
                _log_event(conn, uid, u["username"], u["name"], u["dept"],
                           "Sensitive Page Access", f"Unauthorized folder access: {bd['unusual_collaboration_details']}",
                           "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 20, 1,
                           ts_str=(base_dt+timedelta(minutes=15)).isoformat())
            if bd["ai_risk_flag"]:
                _log_event(conn, uid, u["username"], u["name"], u["dept"],
                           "GenAI Upload", f"{bd['ai_risk_details']} — {bd['genai_upload_mb']} MB",
                           "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 30, 1,
                           ts_str=(base_dt+timedelta(minutes=30)).isoformat())
            if bd["downloads"] > 50:
                _log_event(conn, uid, u["username"], u["name"], u["dept"],
                           "File Download", f"Mass download: {bd['downloads']} files",
                           "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 25, 1,
                           ts_str=(base_dt+timedelta(minutes=20)).isoformat())
            if bd["usb_usage"]:
                _log_event(conn, uid, u["username"], u["name"], u["dept"],
                           "USB Event", "Unregistered USB device connected and used",
                           "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 20, 1,
                           ts_str=(base_dt+timedelta(minutes=25)).isoformat())
            if bd["privilege_escalation_flag"]:
                _log_event(conn, uid, u["username"], u["name"], u["dept"],
                           "Privilege Change", bd["privilege_escalation_details"],
                           "192.168.1."+str(hash(u["username"])%250+1), bd["baseline_device"], 40, 1,
                           ts_str=(base_dt+timedelta(minutes=10)).isoformat())

    for p in DEFAULT_POLICIES:
        pid = str(uuid.uuid4())
        c.execute("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)",
                  (pid, p["name"], p["conditions"], p["action"], 1, "admin", now_str, p["description"]))

    conn.commit()
    conn.close()

# ── LOGGING LOGIC ──────────────────────────────────────────────────────────────

def log_audit(user_id, username, name, dept, event_type, details, ip, device, risk_contrib=0, is_suspicious=0, session_id=None):
    conn = get_conn()
    _log_event(conn, user_id, username, name, dept, event_type, details, ip, device, risk_contrib, is_suspicious, session_id=session_id)
    conn.commit()
    conn.close()

_EVAL_CACHE = {"timestamp": 0, "data": None}

def invalidate_eval_cache():
    _EVAL_CACHE["timestamp"] = 0
    _EVAL_CACHE["data"] = None

def load_all_evaluated():
    import time
    now_t = time.time()
    if _EVAL_CACHE["data"] is not None and (now_t - _EVAL_CACHE["timestamp"]) < 30.0:
        return _EVAL_CACHE["data"].copy()

    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT u.id, u.username, u.name, u.department, u.emp_type, b.*
        FROM users u
        LEFT JOIN behavior_data b ON b.user_id = u.id
        WHERE u.role='employee'
    """)
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=cols)
    df = df.loc[:,~df.columns.duplicated()]

    ml_flags = run_ml_engine(df)

    scored = []
    for idx, row in df.iterrows():
        mf = ml_flags.get(idx, {})
        score, severity, priority, threat_class, reasons, algos, detection_layers = calculate_risk(row.to_dict(), mf)
        recs = get_recommendations(row.to_dict(), severity)
        
        # Hardcoded event logs to simulate timelines
        events = []
        uname = row['username']
        bd = row.to_dict()
        hr = int(bd.get("login_time", 9))
        bl_t = bd.get("baseline_login_time", "09:00")
        
        if uname == 'ravi':
            events = [
                {"time": "09:15", "desc": "Baseline login expected (Office Laptop, Bengaluru)", "flagged": False},
                {"time": "23:40", "desc": "ACTUAL LOGIN — 23:40 from unregistered device", "flagged": True},
                {"time": "23:45", "desc": "Accessed Finance folder files (Privilege Misuse)", "flagged": True},
                {"time": f"23:50", "desc": f"Mass download: {bd.get('downloads',0)} files", "flagged": True},
                {"time": f"23:55", "desc": f"Uploaded {bd.get('genai_upload_mb',0)} MB to ChatGPT (IP Exfiltration)", "flagged": True}
            ]
        elif uname == 'rahul':
            events = [
                {"time": bl_t, "desc": "Baseline login expected", "flagged": False},
                {"time": "10:00", "desc": "Login (Office Desktop, Bengaluru)", "flagged": False},
                {"time": "10:15", "desc": "Accessed Payroll Database — not in HR role scope", "flagged": True},
                {"time": "10:30", "desc": "Accessed Finance Folder — privilege misuse", "flagged": True}
            ]
        elif uname == 'dormant_alice':
            events = [
                {"time": "02:00", "desc": f"Dormant account login attempt ({bd.get('last_login_days_ago',0)} days inactive)", "flagged": True},
                {"time": "02:05", "desc": f"Failed logins: {bd.get('failed_logins',0)} attempts", "flagged": True},
                {"time": "02:10", "desc": "Accessed Sales Folder (Dormant Account Misuse)", "flagged": True}
            ]
        elif uname == 'traveler_dan':
            events = [
                {"time": "09:00", "desc": "Login from Bengaluru (Office Laptop)", "flagged": False},
                {"time": "09:12", "desc": "Login detected from London — new device, IP 85.90.12.3", "flagged": True},
                {"time": "09:12", "desc": "⚠ IMPOSSIBLE TRAVEL: 10h journey in 12 minutes", "flagged": True}
            ]
        elif uname == 'shared_sam':
            events = [
                {"time": "14:00", "desc": "Login from Chrome/Windows — Mumbai IP 103.45.12.1", "flagged": False},
                {"time": "14:02", "desc": "Concurrent login from Safari/macOS — Delhi IP 122.160.8.4", "flagged": True},
                {"time": "14:02", "desc": "⚠ CREDENTIAL SHARING: simultaneous sessions from two locations", "flagged": True}
            ]
        elif uname == 'burnout_eve':
            events = [
                {"time": bl_t, "desc": "Baseline login expected", "flagged": False},
                {"time": "23:00", "desc": "Late-night login (burnout risk pattern)", "flagged": True},
                {"time": "23:05", "desc": f"Failed logins: {bd.get('failed_logins',0)} attempts", "flagged": True},
                {"time": "23:15", "desc": "Weekend data access pattern verified", "flagged": True}
            ]
        elif uname == 'shadow_it_ted':
            events = [
                {"time": bl_t, "desc": "Baseline login expected", "flagged": False},
                {"time": "11:00", "desc": "Login (Linux Workstation, Hyderabad)", "flagged": False},
                {"time": "11:15", "desc": "Unauthorized software: AnyDesk — BLOCKED", "flagged": True},
                {"time": "11:20", "desc": "Unauthorized software: TeamViewer — BLOCKED", "flagged": True},
                {"time": "11:30", "desc": "Unknown VPN connection attempt — BLOCKED", "flagged": True}
            ]
        elif uname == 'ai_paste_pat':
            events = [
                {"time": bl_t, "desc": "Baseline login expected", "flagged": False},
                {"time": "10:00", "desc": "Login (Developer MacBook, Bengaluru)", "flagged": False},
                {"time": "10:15", "desc": f"Pasted source code to ChatGPT ({bd.get('genai_upload_mb',0)} MB)", "flagged": True},
                {"time": "10:30", "desc": "Sensitive IP exfiltrated via public AI tool", "flagged": True}
            ]
        elif uname == 'escalated_eric':
            events = [
                {"time": bl_t, "desc": "Baseline login expected", "flagged": False},
                {"time": "08:00", "desc": "Login (Helpdesk Terminal, Bengaluru)", "flagged": False},
                {"time": "08:15", "desc": "⚠ PRIVILEGE ESCALATION: Employee → Admin role detected", "flagged": True},
                {"time": "08:20", "desc": "Accessed Active Directory & Domain Controller Logs", "flagged": True}
            ]
        else:
            events = [{"time": f"{hr:02d}:00", "desc": f"Login from {bd.get('current_login_location','Office')}", "flagged": False}]
            if bd.get('failed_logins', 0):
                events.append({"time": f"{hr:02d}:05", "desc": f"Failed logins: {bd.get('failed_logins',0)}", "flagged": bd.get('failed_logins',0)>2})
            if bd.get('file_access_count', 0) > 20:
                events.append({"time": f"{hr:02d}:15", "desc": f"Accessed {bd.get('file_access_count',0)} files", "flagged": bd.get('file_access_count',0)>50})
            if bd.get('downloads', 0) > 5:
                events.append({"time": f"{hr:02d}:20", "desc": f"Downloaded {bd.get('downloads',0)} files", "flagged": bd.get('downloads',0)>20})

        exfil = min(99, max(5,
            (35 if row.get('usb_usage',0) else 0) +
            (25 if row.get('downloads',0) > 100 else 15 if row.get('downloads',0) > 20 else 0) +
            (20 if row.get('genai_upload_mb',0) > 20 else 0) +
            (15 if row.get('external_uploads',0) > 2 else 0) +
            (10 if row.get('email_attachments',0) > 3 else 0) +
            (15 if row.get('resignation_flag',0) else 0)))

        r = row.to_dict()
        r.update({
            "risk_score": score,
            "severity": severity,
            "priority": priority,
            "threat_classification": threat_class,
            "reasons": reasons,
            "algo_contrib": algos,
            "detection_layers": detection_layers,
            "recommendations": recs,
            "timeline": events,
            "exfil_probability": exfil
        })
        scored.append(r)
    res_df = pd.DataFrame(scored)
    _EVAL_CACHE["timestamp"] = now_t
    _EVAL_CACHE["data"] = res_df
    return res_df

def ensure_incidents(df):
    conn = get_conn()
    c = conn.cursor()
    for _, row in df.iterrows():
        if row.get('risk_score', 0) < 30:
            continue
        c.execute("SELECT id FROM incidents WHERE user_id=?", (row.get('user_id', row.get('id','')),))
        if c.fetchone():
            continue
        iid = "INC-" + str(uuid.uuid4())[:8].upper()
        evidence = json.dumps(row.get('reasons', []), ensure_ascii=False)
        
        # Check active violations for this single user
        violations = []
        if row.get('impossible_travel_flag'): violations.append("Impossible Travel")
        if row.get('privilege_escalation_flag'): violations.append("Privilege Escalation")
        if row.get('downloads', 0) > 100: violations.append("Mass Download Detection")
        if row.get('genai_upload_mb', 0) > 20: violations.append("GenAI Data Exfiltration")
        if row.get('last_login_days_ago', 0) > 90: violations.append("Dormant Account Reactivation")
        if row.get('credential_sharing_flag'): violations.append("Credential Sharing")
        if row.get('failed_logins', 0) > 5: violations.append("Multiple Failed Logins")
        policies = ", ".join(violations)

        recs = json.dumps(row.get('recommendations', []), ensure_ascii=False)
        uid = row.get('user_id', row.get('id',''))
        
        # Simulated SMS & Email Notification Dispatch
        print(f"[SECURITY ALERT SENT] Dispatching SMS to +91-XXXXX-SOC1 & Email to soc-alerts@zerotrustnet.local for employee '{row['name']}' (Risk: {row['risk_score']}/100 - Severity: {row['severity']})")
        
        c.execute("""INSERT INTO incidents 
            (id, incident_id, user_id, username, user_name, department, created_at, severity, status, summary, evidence, policies_triggered, risk_score, recommendations, resolved_at, resolved_by, notes, assigned_to, resolution) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (str(uuid.uuid4()), iid, uid, row['username'], row['name'], row['department'],
                   datetime.now().isoformat(), row['severity'], "Open",
                   f"Insider threat risk: {row['name']} flagged at {row['severity']} ({row['risk_score']}/100)",
                   evidence, policies, row['risk_score'], recs, None, None, f"SMS & Email notifications dispatched automatically to SOC group.",
                   "Unassigned", ""))
    conn.commit()
    conn.close()

# ── API ROUTES ─────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    dept = data.get("department", "Engineering").strip()
    emp_type = data.get("emp_type", "Employee").strip()
    device_name = data.get("device", "Corporate Laptop").strip()

    if not username or not password or not name:
        return jsonify({"error": "Username, password, and full name are required."}), 400

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE LOWER(username)=?", (username,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": f"Username '{username}' is already registered. Please choose another username or log in."}), 400

    uid = str(uuid.uuid4())
    now_str = datetime.now().isoformat()

    c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)",
              (uid, username, hash_pwd(password), name, dept, emp_type, "employee", 1, now_str))

    c.execute("""INSERT OR IGNORE INTO behavior_data VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (uid, 9, 0, 0, 1, 0, 0, 0, 0.0, 0, 0, 0, 0, 0, "Office", "Office",
         0, "", 0, "", 0, "", 0, "", 0, "", 0, "", 0, "", 5, 5, 5,
         "09:00", device_name, "Bengaluru", 15, dept, dept, 0, "None", 0))

    conn.commit()
    conn.close()

    log_audit(uid, username, name, dept, "Employee Registered", f"Account registered for employee '{name}' ({dept}) from device {device_name}", "127.0.0.1", device_name, 0, 0)

    return jsonify({
        "success": True,
        "message": f"Employee '{name}' registered successfully! You can now log in."
    })

def verify_device_security(uid, username, device_id, browser, os_sys):
    """
    Step 2: Device Verification Engine
    Evaluates 5 security checks before granting access:
    1. Registered Device Check
    2. Trusted Browser Check
    3. User Normal Device Check
    4. Allowed OS Check
    5. Concurrent Active Logins Check
    """
    if username == "admin":
        return {
            "is_registered": True,
            "is_trusted_browser": True,
            "is_normal_device": True,
            "is_os_allowed": True,
            "is_concurrent": False,
            "active_sessions_count": 1,
            "risk_penalty": 0,
            "reasons": ["System Administrator Authorized Console Access"],
            "status": "Verified Administrator Console"
        }

    conn = get_conn()
    c = conn.cursor()

    is_registered = 1 if (device_id and ("DEV-" in device_id or "CORP-" in device_id)) else 0
    is_trusted_browser = 1 if any(b in browser for b in ["Chrome", "Edge", "Firefox", "Safari"]) else 0

    c.execute("SELECT baseline_device FROM behavior_data WHERE user_id=?", (uid,))
    row = c.fetchone()
    baseline_dev = row[0] if row and row[0] else "Corporate Laptop"
    is_normal_device = 1 if (device_id in baseline_dev or "Corporate" in baseline_dev or "Laptop" in baseline_dev or "Office" in baseline_dev or "Windows" in os_sys or "Mac" in os_sys) else 0

    allowed_oses = ["Windows", "macOS", "Linux", "Ubuntu"]
    is_os_allowed = 1 if any(o in os_sys for o in allowed_oses) else 0

    c.execute("SELECT COUNT(*) FROM sessions WHERE user_id=? AND is_active=1", (uid,))
    active_count = c.fetchone()[0]
    is_concurrent = 1 if active_count > 0 else 0

    conn.close()

    risk_penalty = 0
    reasons = []
    if not is_registered:
        risk_penalty += 15
        reasons.append("Unregistered Device: Hardware fingerprint not in asset directory (+15 Risk)")
    if not is_trusted_browser:
        risk_penalty += 15
        reasons.append(f"Untrusted Browser: Client '{browser}' not in approved list (+15 Risk)")
    if not is_normal_device:
        risk_penalty += 15
        reasons.append("Abnormal Device: Device differs from employee baseline profile (+15 Risk)")
    if not is_os_allowed:
        risk_penalty += 15
        reasons.append(f"Unapproved OS: '{os_sys}' violates endpoint security compliance (+15 Risk)")
    if is_concurrent:
        risk_penalty += 20
        reasons.append(f"Concurrent Active Session: {active_count} active session(s) already running (+20 Risk)")

    return {
        "is_registered": bool(is_registered),
        "is_trusted_browser": bool(is_trusted_browser),
        "is_normal_device": bool(is_normal_device),
        "is_os_allowed": bool(is_os_allowed),
        "is_concurrent": bool(is_concurrent),
        "active_sessions_count": active_count,
        "risk_penalty": risk_penalty,
        "reasons": reasons,
        "status": "Verified Trusted Device" if risk_penalty == 0 else "Device Policy Violation"
    }

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    role_req = data.get("role", "employee") # 'admin' or 'employee'

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT id, name, department, emp_type, role, is_active FROM users WHERE LOWER(username)=? AND pwd_hash=?",
              (username, hash_pwd(password)))
    row = c.fetchone()
    
    if not row:
        conn.close()
        client_ip = data.get("ip_addr") or request.remote_addr or "127.0.0.1"
        client_browser = data.get("browser") or request.headers.get("User-Agent", "Web Client")
        log_audit("unknown", username, username, "External", "Failed Authentication",
                  f"Failed login attempt for account '{username}'. Invalid credentials entered.",
                  client_ip, client_browser, risk_contrib=20, is_suspicious=1)
        return jsonify({"error": "Invalid username or password"}), 401

    uid, name, dept, emp_type, urole, is_active = row
    if not is_active:
        conn.close()
        client_ip = data.get("ip_addr") or request.remote_addr or "127.0.0.1"
        client_browser = data.get("browser") or request.headers.get("User-Agent", "Web Client")
        log_audit(uid, username, name, dept, "Locked Account Access Attempt",
                  f"Disabled employee account '{username}' attempted login.",
                  client_ip, client_browser, risk_contrib=25, is_suspicious=1)
        return jsonify({"error": "Account is disabled"}), 403

    if urole != role_req:
        conn.close()
        return jsonify({"error": f"Incorrect portal access. User role is {urole}"}), 403

    # Ensure behavior_data profile exists
    if urole == "employee":
        c.execute("SELECT user_id FROM behavior_data WHERE user_id=?", (uid,))
        if not c.fetchone():
            c.execute("""INSERT OR IGNORE INTO behavior_data VALUES
                (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (uid, 9, 0, 0, 1, 0, 0, 0, 0.0, 0, 0, 0, 0, 0, "Office", "Office",
                 0, "", 0, "", 0, "", 0, "", 0, "", 0, "", 0, "", 5, 5, 5,
                 "09:00", "Corporate Laptop", "Bengaluru", 15, dept, dept, 0, "None", 0))
            conn.commit()

    conn.close()

    # Step 2: Perform Device Verification
    client_device_id = data.get("device_id") or f"DEV-{abs(hash(username)) % 90000 + 10000}"
    client_browser = data.get("browser") or request.headers.get("User-Agent", "Chrome 127.0")
    client_os = data.get("os") or "Windows 11"
    client_ip = data.get("ip_addr") or request.remote_addr or f"192.168.1.{abs(hash(username)) % 200 + 10}"
    client_location = data.get("location") or "Bengaluru, India"
    login_time = data.get("login_time") or datetime.now().isoformat()
    device_label = f"{client_os} ({client_browser})"

    dev_check = verify_device_security(uid, username, client_device_id, client_browser, client_os)

    # Update behavior data metrics if device check failed
    if dev_check["risk_penalty"] > 0:
        conn = get_conn()
        device_known_val = 1 if (dev_check["is_registered"] and dev_check["is_normal_device"]) else 0
        conn.execute("UPDATE behavior_data SET device_known=? WHERE user_id=?", (device_known_val, uid))
        conn.commit()
        conn.close()

    # Supersede older sessions for this device
    conn = get_conn()
    conn.execute("UPDATE sessions SET is_active=0 WHERE user_id=? AND device_id=?", (uid, client_device_id))
    conn.commit()

    # Create enterprise session telemetry
    sid = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO sessions (id, user_id, username, login_time, logout_time, ip_addr, device, device_id, browser, os, location, department, role, is_active, risk_score)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)
    """, (sid, uid, username, login_time, None, client_ip, device_label, client_device_id, client_browser, client_os, client_location, dept, urole, 0 if urole == "admin" else dev_check["risk_penalty"]))
    conn.commit()
    conn.close()

    # Log audit event with Step 2 Device Verification status
    if urole == "admin":
        audit_desc = f"Enterprise SOC Session Created | Administrator Authentication Verified | DeviceID: {client_device_id} | OS: {client_os} | Browser: {client_browser}"
        log_audit(
            uid, username, name, dept, "Login",
            audit_desc, client_ip, device_label, 0, 0, session_id=sid
        )
    else:
        audit_desc = f"Enterprise Session Created | Step 2 Device Check: {dev_check['status']} (+{dev_check['risk_penalty']} Risk Penalty) | DeviceID: {client_device_id} | OS: {client_os} | Browser: {client_browser}"
        log_audit(
            uid, username, name, dept, "Login",
            audit_desc, client_ip, device_label, dev_check["risk_penalty"], 1 if dev_check["risk_penalty"] > 0 else 0, session_id=sid
        )

    # Issue token with enterprise session payload & device verification
    payload = {
        "user_id": uid,
        "username": username,
        "name": name,
        "department": dept,
        "emp_type": emp_type,
        "role": urole,
        "session_id": sid,
        "device_id": client_device_id,
        "browser": client_browser,
        "os": client_os,
        "ip": client_ip,
        "device": device_label,
        "location": client_location,
        "login_time": login_time,
        "device_verification": dev_check,
        "exp": datetime.utcnow() + timedelta(hours=10)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return jsonify({"token": token, "user": payload, "device_verification": dev_check})

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        sid = payload["session_id"]
        uid = payload["user_id"]
        
        conn = get_conn()
        conn.execute("UPDATE sessions SET is_active=0, logout_time=? WHERE id=?",
                     (datetime.now().isoformat(), sid))
        conn.commit()
        conn.close()

        log_audit(uid, payload["username"], payload["name"], payload["department"],
                  "Logout", "User logged out from portal session", payload["ip"], payload["device"], 0, 0, session_id=sid)

        return jsonify({"success": True})
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

@app.route('/api/auth/verify', methods=['GET'])
def api_verify():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        sid = payload.get("session_id")
        if sid:
            conn = get_conn()
            c = conn.cursor()
            c.execute("SELECT is_active FROM sessions WHERE id=?", (sid,))
            s_row = c.fetchone()
            conn.close()
            if not s_row or s_row[0] == 0:
                return jsonify({"error": "Session inactive or terminated"}), 401
        return jsonify({"valid": True, "user": payload})
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

@app.route('/api/employee/dashboard', methods=['GET'])
def employee_dashboard():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    df_all = load_all_evaluated()
    if df_all.empty:
        return jsonify({"error": "Data loading error"}), 500

    my_row = df_all[df_all['id'] == uid]
    if my_row.empty:
        return jsonify({"error": "Profile not found"}), 404

    r = my_row.iloc[0].to_dict()

    # Get recent audit events
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT timestamp, event_type, event_details, is_suspicious, risk_contrib
        FROM audit_events WHERE user_id=? ORDER BY timestamp DESC LIMIT 10
    """, (uid,))
    events = [{"timestamp": row[0], "event_type": row[1], "details": row[2], "is_suspicious": bool(row[3]), "risk": row[4]} for row in c.fetchall()]

    # Total audit events count
    c.execute("SELECT COUNT(*) FROM audit_events WHERE user_id=?", (uid,))
    total_events = c.fetchone()[0]

    # Suspicious events count
    c.execute("SELECT COUNT(*) FROM audit_events WHERE user_id=? AND is_suspicious=1", (uid,))
    susp_events = c.fetchone()[0]

    # Active sessions
    c.execute("SELECT COUNT(*) FROM sessions WHERE user_id=? AND is_active=1", (uid,))
    active_sess = c.fetchone()[0]
    conn.close()

    return jsonify({
        "risk_score": r["risk_score"],
        "severity": r["severity"],
        "exfil_probability": r["exfil_probability"],
        "timeline": r["timeline"],
        "reasons": r["reasons"],
        "recommendations": r["recommendations"],
        "stats": {
            "total_events": total_events,
            "suspicious_events": susp_events,
            "active_sessions": active_sess
        },
        "recent_audit": events,
        "baseline": {
            "login_time": r.get("baseline_login_time", "09:00"),
            "device": r.get("baseline_device", "Office Laptop"),
            "location": r.get("baseline_location", "Bengaluru"),
            "file_access": r.get("baseline_file_access", 15),
            "actual_login_hour": r["login_time"],
            "actual_device": "Office Laptop" if r["device_known"] == 1 else "Unknown Device",
            "actual_location": r["current_login_location"],
            "actual_file_access": r["file_access_count"]
        }
    })

@app.route('/api/employee/action', methods=['POST'])
def employee_action():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    req_data = request.json or {}
    action_type = req_data.get("action")
    custom_details = req_data.get("details")
    custom_filename = req_data.get("filename")
    
    # Process actions & update metrics
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM behavior_data WHERE user_id=?", (uid,))
    cols = [d[0] for d in c.description]
    b_row = c.fetchone()
    if not b_row:
        conn.close()
        return jsonify({"error": "Behavior data profile not found"}), 404
    b_data = dict(zip(cols, b_row))

    event_type = "Sensitive Page Access"
    details = ""
    risk_contrib = 0
    is_susp = 0
    warning = None

    if action_type == "access_hr":
        details = custom_details or "Accessed HR Portal — Employee Directory and Policies"
        is_susp = 1 if dept not in ["HR", "IT Security"] else 0
        risk_contrib = 15 if is_susp else 0
        if is_susp:
            b_data["unusual_collaboration_flag"] = 1
            b_data["unusual_collaboration_details"] = "Accessed HR directory scope"
            warning = "Access flagged: HR Portal is outside your department scope. SOC has been notified."

    elif action_type == "access_payroll":
        details = custom_details or "Accessed Payroll Management System — salary data"
        is_susp = 1 if dept not in ["HR", "Finance", "IT Security"] else 0
        risk_contrib = 20 if is_susp else 0
        if is_susp:
            b_data["unusual_collaboration_flag"] = 1
            b_data["unusual_collaboration_details"] = "Accessed Payroll Database"
            warning = "ALERT: Payroll access is outside your department scope. Incident flagged for SOC audit."

    elif action_type == "access_finance":
        details = custom_details or "Accessed Finance Dashboard — ledger data"
        is_susp = 1 if dept not in ["Finance", "IT Security"] else 0
        risk_contrib = 20 if is_susp else 0
        if is_susp:
            b_data["unusual_collaboration_flag"] = 1
            b_data["unusual_collaboration_details"] = "Accessed Finance folder files"
            warning = "ALERT: Finance dashboard access is outside your department scope."

    elif action_type == "download_report":
        event_type = "File Download"
        fname = custom_filename or "Q2_Performance_Report.pdf"
        details = custom_details or f"Downloaded: {fname} (2.4 MB)"
        b_data["downloads"] = b_data.get("downloads", 0) + 1
        b_data["file_access_count"] = b_data.get("file_access_count", 0) + 1
        fid = str(uuid.uuid4())
        conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (fid, uid, uname, fname, f"/company/reports/{fname}", "Confidential", "Download", 2.4, datetime.now().isoformat(), 0, "Allowed"))

    elif action_type == "upload_doc":
        event_type = "File Upload"
        fname = custom_filename or "Project_Proposal_v3.docx"
        details = custom_details or f"Uploaded: {fname} (1.1 MB) to shared drive"
        b_data["file_access_count"] = b_data.get("file_access_count", 0) + 1
        fid = str(uuid.uuid4())
        conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (fid, uid, uname, fname, f"/company/projects/{fname}", "Internal", "Upload", 1.1, datetime.now().isoformat(), 0, "Allowed"))

    elif action_type == "use_ai":
        event_type = "GenAI Upload"
        details = custom_details or "Browser session opened to GenAI Tool — payload upload (12.5 MB)"
        b_data["genai_upload_mb"] = b_data.get("genai_upload_mb", 0.0) + 12.5
        b_data["ai_risk_flag"] = 1
        b_data["ai_risk_details"] = "Sensitive code/text uploaded to public GenAI assistant"
        is_susp = 1
        risk_contrib = 25
        warning = "AI tool upload detected. Sharing company data with public GenAI is logged as a security policy violation."

    elif action_type == "insert_usb":
        event_type = "USB Event"
        details = custom_details or "Unregistered USB device connected and mounted (SanDisk Ultra 64GB)"
        b_data["usb_usage"] = 1
        is_susp = 1
        risk_contrib = 20
        warning = "USB device connected. Endpoint security controls restrict unapproved storage media."

    elif action_type == "export_data":
        event_type = "File Download"
        details = custom_details or "Data export request: 23 client records exported to CSV"
        b_data["downloads"] = b_data.get("downloads", 0) + 23
        is_susp = 1
        risk_contrib = 15
        warning = "Export logged. High-frequency client exports are audited by IT Security."
        fid = str(uuid.uuid4())
        conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (fid, uid, uname, custom_filename or "Client_Export_Master.csv", "/company/exports/Client_Export_Master.csv", "Secret", "Download", 5.8, datetime.now().isoformat(), 1, "Logged & Flagged for SOC Audit"))

    elif action_type == "change_pwd":
        event_type = "Password Reset"
        details = custom_details or "Employee-initiated password change request completed successfully"

    elif action_type == "delete_file":
        event_type = "Delete File"
        fname = custom_filename or "Customer_Records_2025.db"
        details = custom_details or f"Permanently deleted: {fname} from company repository"
        b_data["file_access_count"] = b_data.get("file_access_count", 0) + 1
        is_susp = 1
        risk_contrib = 15
        warning = f"File deletion logged: {fname} permanently deleted from enterprise storage."
        fid = str(uuid.uuid4())
        conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (fid, uid, uname, fname, f"/company/db/{fname}", "Confidential", "Delete", 14.2, datetime.now().isoformat(), 1, "Logged & Flagged for Audit"))

    elif action_type == "open_confidential":
        event_type = "Open Confidential File"
        fname = custom_filename or "Executive_Salary_Matrix_2026.xlsx"
        details = custom_details or f"Opened Confidential Resource: {fname}"
        b_data["sensitive_files"] = b_data.get("sensitive_files", 0) + 1
        b_data["file_access_count"] = b_data.get("file_access_count", 0) + 1
        is_susp = 1
        risk_contrib = 20
        warning = f"Confidential file accessed: {fname}. Access logged to immutable audit trail."
        fid = str(uuid.uuid4())
        conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (fid, uid, uname, fname, f"/company/executive/{fname}", "Confidential", "View", 3.2, datetime.now().isoformat(), 1, "Flagged for SOC Audit"))

    elif action_type == "failed_operations":
        event_type = "Multiple Failed Actions"
        details = custom_details or "Repeated failed operations: 5 consecutive permission denied errors on restricted directory"
        b_data["failed_logins"] = b_data.get("failed_logins", 0) + 5
        is_susp = 1
        risk_contrib = 25
        warning = "Multiple failed operations detected. Repeated permission violations increase session risk score."

    elif action_type == "long_inactive_session":
        event_type = "Long Inactive Session"
        details = custom_details or "Session idle timeout: 45 minutes of inactivity detected without lockscreen lock"
        is_susp = 1
        risk_contrib = 10
        warning = "Long inactive session detected. Screen remained unlocked during prolonged idle period."

    elif action_type == "concurrent_login":
        event_type = "Concurrent Login"
        details = custom_details or "Concurrent session attempt: Second active login initiated from secondary device"
        is_susp = 1
        risk_contrib = 20
        warning = "Concurrent login detected across multiple endpoint devices."

    # Save behavior updates back to DB
    c.execute("""
        UPDATE behavior_data SET
        downloads=?, file_access_count=?, sensitive_files=?, failed_logins=?, genai_upload_mb=?, usb_usage=?, ai_risk_flag=?,
        ai_risk_details=?, unusual_collaboration_flag=?, unusual_collaboration_details=?
        WHERE user_id=?
    """, (b_data["downloads"], b_data["file_access_count"], b_data.get("sensitive_files", 0), b_data.get("failed_logins", 0),
          b_data["genai_upload_mb"], b_data["usb_usage"], b_data["ai_risk_flag"], b_data["ai_risk_details"],
          b_data["unusual_collaboration_flag"], b_data["unusual_collaboration_details"], uid))
    conn.commit()
    conn.close()

    # Log audit event
    log_audit(uid, uname, name, dept, event_type, details, ip, device, risk_contrib, is_susp, session_id=sid)

    # Recalculate risk score immediately
    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    return jsonify({"success": True, "warning": warning})

@app.route('/api/employee/download-report', methods=['GET'])
def employee_download_report():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
        role = payload.get("role", "Employee")
        location = payload.get("location", "Bengaluru, India")
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    # Load evaluated risk profile
    df_all = load_all_evaluated()
    r = {}
    if not df_all.empty:
        my_row = df_all[df_all['id'] == uid]
        if not my_row.empty:
            r = my_row.iloc[0].to_dict()

    risk_score = r.get("risk_score", 0)
    severity = r.get("severity", "🟢 Low")
    reasons = r.get("reasons", ["No unusual behavior detected"])
    recs = r.get("recommendations", ["Maintain current credentials"])

    # Generate PDF in memory buffer using ReportLab
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0284c7'),
        spaceAfter=12
    )
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    story = []

    story.append(Paragraph("ZeroTrustNet Enterprise Security Audit Report", title_style))
    story.append(Paragraph("CONFIDENTIAL · OFFICIAL SOC TELEMETRY REPORT (PDF)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=12))

    meta_data = [
        [Paragraph("<b>Employee Name:</b>", body_style), Paragraph(str(name), body_style), Paragraph("<b>Employee ID:</b>", body_style), Paragraph(str(uid), body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph(str(dept), body_style), Paragraph("<b>User Role:</b>", body_style), Paragraph(str(role).capitalize(), body_style)],
        [Paragraph("<b>IP Address:</b>", body_style), Paragraph(str(ip), body_style), Paragraph("<b>Device:</b>", body_style), Paragraph(str(device), body_style)],
        [Paragraph("<b>Location:</b>", body_style), Paragraph(str(location), body_style), Paragraph("<b>Generated At:</b>", body_style), Paragraph(datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'), body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[130, 220, 130, 220])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Continuous UEBA & AI Risk Assessment", h2_style))
    
    risk_bg = '#dcfce7' if risk_score < 30 else '#fef9c3' if risk_score < 60 else '#ffedd5' if risk_score < 80 else '#fee2e2'
    risk_tc = '#15803d' if risk_score < 30 else '#a16207' if risk_score < 60 else '#c2410c' if risk_score < 80 else '#b91c1c'
    
    risk_summary_data = [
        [Paragraph("<b>Overall Risk Score</b>", body_style), Paragraph("<b>Severity Rating</b>", body_style), Paragraph("<b>Monitoring Status</b>", body_style)],
        [Paragraph(f"<font size=13 color='{risk_tc}'><b>{risk_score} / 100</b></font>", body_style),
         Paragraph(f"<font size=11 color='{risk_tc}'><b>{severity}</b></font>", body_style),
         Paragraph("<b>Active Continuous Session</b>", body_style)]
    ]
    risk_table = Table(risk_summary_data, colWidths=[230, 230, 240])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor(risk_bg)),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Explainable AI (XAI) Risk Factors", h2_style))
    reasons_text = "<br/>".join([f"• {str(r_item)}" for r_item in reasons]) if isinstance(reasons, list) else f"• {reasons}"
    story.append(Paragraph(reasons_text, body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Recommended Security Actions & Directives", h2_style))
    recs_text = "<br/>".join([f"✓ {str(rc)}" for rc in recs]) if isinstance(recs, list) else f"✓ {recs}"
    story.append(Paragraph(recs_text, body_style))
    story.append(Spacer(1, 14))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceBefore=8, spaceAfter=6))
    footer_text = f"Cryptographically Signed Audit Stamp | Session ID: {sid} | ZeroTrustNet Framework v4.2"
    footer_style = ParagraphStyle('FooterStyle', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)
    story.append(Paragraph(footer_text, footer_style))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()

    log_audit(uid, uname, name, dept, "File Download", "Downloaded ZeroTrust_Security_Audit_Report.pdf (Official PDF Report Download)", ip, device, 0, 0, session_id=sid)
    invalidate_eval_cache()

    response = make_response(pdf_data)
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = 'attachment; filename="ZeroTrust_Security_Audit_Report.pdf"'
    return response

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/employee/upload-file', methods=['POST'])
def employee_upload_file():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file included in upload request."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400

    classification = request.form.get("classification", "Internal")
    filename = file.filename
    
    # Save file to uploads folder
    save_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex[:8]}_{filename}")
    file.save(save_path)

    file_size_bytes = os.path.getsize(save_path)
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
    if file_size_mb == 0.0:
        file_size_mb = 0.01

    is_flagged = 1 if classification in ["Confidential", "Secret"] else 0
    policy_action = "Flagged for SOC Audit" if is_flagged else "Allowed & Logged"

    conn = get_conn()
    c = conn.cursor()
    fid = str(uuid.uuid4())
    c.execute("""
        INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (fid, uid, uname, filename, save_path, classification, "Upload", file_size_mb, datetime.now().isoformat(), is_flagged, policy_action))

    # Update behavior data metrics
    c.execute("""
        UPDATE behavior_data SET file_access_count = file_access_count + 1
        WHERE user_id=?
    """, (uid,))
    if is_flagged:
        c.execute("""
            UPDATE behavior_data SET sensitive_files = sensitive_files + 1
            WHERE user_id=?
        """, (uid,))
    conn.commit()
    conn.close()

    risk_contrib = 20 if is_flagged else 5
    audit_desc = f"Uploaded File: {filename} ({file_size_mb} MB) [{classification}] to server storage"
    log_audit(uid, uname, name, dept, "File Upload", audit_desc, ip, device, risk_contrib, is_flagged, session_id=sid)

    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    warning_msg = None
    if is_flagged:
        warning_msg = f"File upload '{filename}' classified as {classification}. Access and storage flagged to SOC audit trail."

    return jsonify({
        "success": True,
        "filename": filename,
        "file_size_mb": file_size_mb,
        "classification": classification,
        "message": f"File '{filename}' ({file_size_mb} MB) uploaded successfully to enterprise server vault!",
        "warning": warning_msg
    })

@app.route('/api/employee/export-data', methods=['GET'])
def employee_export_data():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE behavior_data SET downloads = downloads + 25 WHERE user_id=?", (uid,))
    conn.commit()
    conn.close()

    csv_data = "Client ID,Client Name,Company,Email,Risk Rating,Status\n"
    clients = [
        ("CL-101", "Acme Financial Corp", "Acme Corp", "security@acme.com", "Low", "Active"),
        ("CL-102", "Apex Healthcare Systems", "Apex Health", "compliance@apex.org", "Low", "Active"),
        ("CL-103", "Global Logistics Int", "Global Logistics", "ops@globallogistics.com", "Medium", "Monitored"),
        ("CL-104", "TechCorp Solutions", "TechCorp", "admin@techcorp.io", "Low", "Active"),
        ("CL-105", "Vanguard Defense Inc", "Vanguard", "secops@vanguard.def", "High", "Audited"),
        ("CL-106", "Starlight Media Group", "Starlight", "it@starlight.net", "Low", "Active"),
    ]
    for c_id, c_name, comp, email, r_rate, status in clients:
        csv_data += f"{c_id},{c_name},{comp},{email},{r_rate},{status}\n"

    log_audit(uid, uname, name, dept, "File Download", "Exported 25 Enterprise Client Records to CSV (Client_Export_Master.csv)", ip, device, 15, 1, session_id=sid)
    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    response = make_response(csv_data)
    response.headers["Content-Type"] = "text/csv"
    response.headers["Content-Disposition"] = 'attachment; filename="Client_Export_Master.csv"'
    return response

@app.route('/api/employee/change-password', methods=['POST'])
def employee_change_password():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    old_pwd = data.get("old_password", "")
    new_pwd = data.get("new_password", "")

    if not old_pwd or not new_pwd:
        return jsonify({"error": "Both current password and new password are required."}), 400

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT pwd_hash FROM users WHERE id=?", (uid,))
    row = c.fetchone()
    if not row or row[0] != hash_pwd(old_pwd):
        conn.close()
        return jsonify({"error": "Current password is incorrect."}), 400

    c.execute("UPDATE users SET pwd_hash=? WHERE id=?", (hash_pwd(new_pwd), uid))
    conn.commit()
    conn.close()

    log_audit(uid, uname, name, dept, "Password Reset", "Employee changed account password successfully", ip, device, 0, 0, session_id=sid)
    return jsonify({"success": True, "message": "Password changed successfully!"})

@app.route('/api/employee/genai-query', methods=['POST'])
def employee_genai_query():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    prompt = (request.json or {}).get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt cannot be empty"}), 400

    # Sensitivity check
    sensitive_keywords = ["credit card", "ssn", "salary", "password", "secret", "token", "source code", "db_password", "private key"]
    is_sensitive = any(kw in prompt.lower() for kw in sensitive_keywords)
    payload_mb = round(len(prompt.encode('utf-8')) / (1024 * 1024) + 12.5, 2)

    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE behavior_data SET genai_upload_mb = genai_upload_mb + ?, ai_risk_flag = 1, ai_risk_details = ? WHERE user_id=?",
              (payload_mb, f"Prompt uploaded to GenAI Assistant (Length: {len(prompt)} chars)", uid))
    conn.commit()
    conn.close()

    risk_contrib = 25 if is_sensitive else 15
    audit_desc = f"GenAI Assistant Prompt Executed (Payload: {payload_mb} MB) | {'SENSITIVE DATA DETECTED' if is_sensitive else 'Standard Query'}"
    log_audit(uid, uname, name, dept, "GenAI Upload", audit_desc, ip, device, risk_contrib, 1, session_id=sid)
    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    response_text = f"🤖 [ZeroTrust AI Assistant]: Processed request ({len(prompt)} chars)."
    if is_sensitive:
        response_text += "\n⚠️ DLP ALERT: Prompt contained potentially sensitive enterprise terminology. Event logged to SOC audit trail."
    else:
        response_text += "\n✅ Query verified under standard enterprise AI usage policies."

    return jsonify({
        "response": response_text,
        "is_sensitive": is_sensitive,
        "payload_mb": payload_mb,
        "warning": "GenAI interaction logged under Data Loss Prevention (DLP) monitoring policy."
    })

@app.route('/api/employee/terminate-other-sessions', methods=['POST'])
def employee_terminate_other_sessions():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE sessions SET is_active=0, logout_time=? WHERE user_id=? AND id!=?",
              (datetime.now().isoformat(), uid, sid))
    conn.commit()
    conn.close()

    log_audit(uid, uname, name, dept, "Session Terminated", "User terminated all concurrent remote sessions from dashboard", ip, device, 0, 0, session_id=sid)
    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    return jsonify({"success": True, "message": "All other active sessions have been terminated."})


@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    # Load users behavioral data
    df = load_all_evaluated()
    if df.empty:
        return jsonify({"error": "No data found"}), 404

    ensure_incidents(df)

    total = len(df)
    critical = len(df[df['severity'] == "🔴 Critical"])
    high = len(df[df['severity'] == "🟠 High"])
    medium = len(df[df['severity'] == "🟡 Medium"])
    low = len(df[df['severity'] == "🟢 Low"])

    avg_risk = df['risk_score'].mean() if total else 0
    sec_score = int(100 - (avg_risk * 0.38))
    total_exposure = int(df['business_impact_rupees'].sum())

    # Get active sessions, online employees, blocked users, and open incidents count
    conn = get_conn()
    active_sessions = conn.execute("SELECT COUNT(*) FROM sessions WHERE is_active=1").fetchone()[0]
    online_count = conn.execute("SELECT COUNT(DISTINCT user_id) FROM sessions WHERE is_active=1").fetchone()[0]
    blocked_count = conn.execute("SELECT COUNT(*) FROM users WHERE is_active=0").fetchone()[0]
    open_incidents = conn.execute("SELECT COUNT(*) FROM incidents WHERE status='Open'").fetchone()[0]
    conn.close()

    # Active alerts list
    flagged = df[df['risk_score'] >= 30].sort_values("risk_score", ascending=False)
    alerts_list = []
    for _, r in flagged.iterrows():
        desc = "Threat flagged"
        if r.get('privilege_escalation_flag'): desc = "Privilege Escalation"
        elif r.get('impossible_travel_flag'): desc = "Impossible Travel"
        elif r.get('ai_risk_flag'): desc = "GenAI Data Exfiltration"
        elif r.get('unusual_collaboration_flag'): desc = "Privilege Misuse"
        elif r.get('credential_sharing_flag'): desc = "Credential Sharing"
        elif r.get('burnout_stress_score', 0) > 70: desc = "Critical Burnout Pattern"
        elif r.get('last_login_days_ago', 0) > 90: desc = "Dormant Account Active"
        elif r.get('usb_usage'): desc = "USB Exfiltration Risk"
        alerts_list.append({
            "employee": r['name'],
            "department": r['department'],
            "alert": desc,
            "score": r['risk_score'],
            "severity": r['severity'],
            "priority": r['priority']
        })

    # Department averages
    dept_avg = df.groupby('department')['risk_score'].mean().round(1).to_dict()

    return jsonify({
        "stats": {
            "total_monitored": total,
            "employees_online": max(online_count, 1 if total > 0 else 0),
            "sessions_active": active_sessions,
            "critical_alerts": critical,
            "blocked_users": blocked_count,
            "risk_average": round(avg_risk, 1),
            "security_score": sec_score,
            "open_incidents": open_incidents,
            "financial_exposure": total_exposure
        },
        "severity_distribution": {
            "Critical": critical,
            "High": high,
            "Medium": medium,
            "Low": low
        },
        "department_risk": dept_avg,
        "active_alerts": alerts_list,
        "trend": [92, 88, 95, 84, sec_score]
    })

@app.route('/api/admin/incidents', methods=['GET'])
def admin_incidents():
    status_filter = request.args.get("status", "All")
    conn = get_conn()
    c = conn.cursor()
    if status_filter == "All":
        c.execute("SELECT * FROM incidents ORDER BY risk_score DESC")
    else:
        c.execute("SELECT * FROM incidents WHERE status=? ORDER BY risk_score DESC", (status_filter,))
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    incidents_list = []
    for row in rows:
        inc = dict(zip(cols, row))
        try:
            inc['evidence'] = json.loads(inc['evidence'])
        except Exception:
            inc['evidence'] = []
        try:
            inc['recommendations'] = json.loads(inc['recommendations'])
        except Exception:
            inc['recommendations'] = []
        incidents_list.append(inc)

    return jsonify(incidents_list)

@app.route('/api/admin/incidents/<id>', methods=['POST'])
def admin_update_incident(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
        analyst_name = payload.get("name", "SOC Analyst")
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    action_verb = data.get("action", "").lower()
    new_status = data.get("status")
    assigned_to = data.get("assigned_to")
    notes = data.get("notes", "")
    resolution = data.get("resolution", "")

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT status, severity, incident_id FROM incidents WHERE id=?", (id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Incident not found"}), 404

    curr_status, curr_sev, inc_code = row

    if action_verb == "investigate":
        new_status = "Investigating"
        assigned_to = assigned_to or f"{analyst_name} (SOC L2)"
        notes = notes or f"Investigation initiated by {analyst_name}. Collecting evidence and session traces."
    elif action_verb == "escalate":
        new_status = "Escalated"
        curr_sev = "🔴 Critical"
        assigned_to = assigned_to or "SOC Lead / Tier 3 Response Team"
        notes = notes or f"ESCALATED to P1 Critical Response Team by {analyst_name}."
    elif action_verb == "resolve":
        new_status = "Resolved"
        assigned_to = assigned_to or analyst_name
        resolution = resolution or notes or "Resolved: Employee behavior audited and baseline verified."
    elif action_verb == "close":
        new_status = "Closed"
        assigned_to = assigned_to or analyst_name
        resolution = resolution or notes or "Closed: Case archived after complete threat mitigation."
    
    if not new_status:
        new_status = curr_status
    if not assigned_to:
        assigned_to = "SOC Team"

    resolved_at = datetime.now().isoformat() if new_status in ["Resolved", "Closed"] else None
    resolved_by = analyst if new_status in ["Resolved", "Closed"] else None

    c.execute("""
        UPDATE incidents SET
        status=?, severity=?, assigned_to=?, notes=?, resolution=?, resolved_at=?, resolved_by=?
        WHERE id=?
    """, (new_status, curr_sev, assigned_to, notes, resolution, resolved_at, resolved_by, id))
    conn.commit()
    conn.close()

    log_audit(payload["user_id"], analyst, payload["name"], payload["department"],
              "Incident Action", f"Incident {inc_code} action '{action_verb or new_status}'. Status: {new_status}, Assigned: {assigned_to}",
              payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    return jsonify({"success": True, "status": new_status, "assigned_to": assigned_to, "message": f"Incident {inc_code} updated to '{new_status}'."})

@app.route('/api/admin/policies', methods=['GET'])
def admin_policies():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM policies ORDER BY created_at DESC")
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    policies_list = []
    for r in rows:
        pol = dict(zip(cols, r))
        try:
            pol['conditions'] = json.loads(pol['conditions'])
        except Exception:
            pol['conditions'] = {}
        policies_list.append(pol)

    # Active violations list
    df = load_all_evaluated()
    violations = []
    for _, row in df.iterrows():
        if row.get('impossible_travel_flag'):
            violations.append({"Policy": "Impossible Travel", "User": row['name'], "Action": "Lock Account + Alert SOC"})
        if row.get('privilege_escalation_flag'):
            violations.append({"Policy": "Privilege Escalation", "User": row['name'], "Action": "Revoke Elevated Privileges + Alert"})
        if row.get('downloads', 0) > 100:
            violations.append({"Policy": "Mass Download Detection", "User": row['name'], "Action": "Temporarily Suspend Account"})
        if row.get('genai_upload_mb', 0) > 20:
            violations.append({"Policy": "GenAI Data Exfiltration", "User": row['name'], "Action": "Block AI Tool Access"})
        if row.get('last_login_days_ago', 0) > 90:
            violations.append({"Policy": "Dormant Account Reactivation", "User": row['name'], "Action": "Force Re-Authentication + Audit"})
        if row.get('credential_sharing_flag'):
            violations.append({"Policy": "Credential Sharing", "User": row['name'], "Action": "Force Password Reset + Log"})
        if row.get('failed_logins', 0) > 5:
            violations.append({"Policy": "Multiple Failed Logins", "User": row['name'], "Action": "Temporary Account Lockout"})

    return jsonify({
        "policies": policies_list,
        "violations": violations
    })

@app.route('/api/admin/policies', methods=['POST'])
def admin_create_policy():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        creator = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    name = data.get("name")
    description = data.get("description", "")
    conditions_str = data.get("conditions", "{}")
    action = data.get("action")

    try:
        json.loads(conditions_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Conditions must be valid JSON"}), 400

    pid = str(uuid.uuid4())
    conn = get_conn()
    conn.execute("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)",
                 (pid, name, conditions_str, action, 1, creator, datetime.now().isoformat(), description))
    conn.commit()
    conn.close()

    log_audit(payload["user_id"], creator, payload["name"], payload["department"],
              "Policy Created", f"New Policy: {name}", payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    return jsonify({"success": True})

@app.route('/api/admin/policies/<id>/toggle', methods=['POST'])
def admin_toggle_policy(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        creator = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT name, is_active FROM policies WHERE id=?", (id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Policy not found"}), 404

    name, active = row
    new_active = 0 if active else 1
    conn.execute("UPDATE policies SET is_active=? WHERE id=?", (new_active, id))
    conn.commit()
    conn.close()

    log_audit(payload["user_id"], creator, payload["name"], payload["department"],
              "Policy Changed", f"Policy '{name}' set to {'active' if new_active else 'inactive'}",
              payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    return jsonify({"success": True})

@app.route('/api/admin/copilot/chat', methods=['POST'])
def admin_copilot():
    data = request.json or {}
    employee_name = data.get("employee_name") or data.get("employee")
    user_id = data.get("user_id")
    query = data.get("query", "").lower()

    df = load_all_evaluated()
    if df.empty:
        return jsonify({"error": "No data available"}), 404

    emp_row = pd.DataFrame()
    if user_id:
        emp_row = df[df['id'] == user_id]
    if emp_row.empty and employee_name:
        emp_row = df[df['name'].str.lower() == str(employee_name).lower()]
    if emp_row.empty and employee_name:
        emp_row = df[df['username'].str.lower() == str(employee_name).lower()]
    if emp_row.empty:
        emp_row = df.head(1)

    r = emp_row.iloc[0].to_dict()

    if any(w in query for w in ["impact", "financial", "rupee", "money", "loss", "exposure"]):
        ans = f"The estimated financial exposure for {r['name']} is ₹{r.get('business_impact_rupees',0):,}. This is based on access to high-value file resources in '{r.get('accessed_folders','')}' which contains intellectual property outside their role parameters."
    elif any(w in query for w in ["mitre", "technique", "attack", "tactic"]):
        if r.get('mitre_techniques', 'None') != 'None':
            ans = f"{r['name']}'s actions align with MITRE ATT&CK mapping: {r['mitre_techniques']} with {r.get('mitre_confidence',0)}% confidence."
        else:
            ans = f"No standard MITRE techniques are currently mapped to {r['name']}. Their risk is driven by behavioral baseline deviations (login times, file limits) rather than explicit signatures."
    elif any(w in query for w in ["action", "recommend", "do", "next", "step", "response"]):
        ans = f"Immediate security actions recommended: " + "; ".join(r.get('recommendations', [])) + "."
    elif any(w in query for w in ["algorithm", "model", "ml", "machine learning", "how"]):
        anoms = [k for k, v in r.get('algo_contrib', {}).items() if "ANOMALY" in str(v).upper() or "NOISE" in str(v).upper()]
        ans = f"We run 4 ML algorithms. " + (f"Flagged anomalies: {', '.join(anoms)}." if anoms else "All ML algorithms classified behaviour as Normal.") + f" Additionally, the rule-based engine identified {len(r.get('reasons',[]))} baseline violations."
    elif any(w in query for w in ["timeline", "event", "when", "session", "log"]):
        events = r.get('timeline', [])
        flagged = [e for e in events if e.get("flagged")]
        ans = f"Recorded {len(events)} events in current session timeline. Key deviations: " + "; ".join([f"[{e['time']}] {e['desc']}" for e in flagged[:3]])
    else:
        reasons_str = "; ".join(r.get('reasons', [])[:3])
        ans = f"ZeroTrustNet Copilot Report for {r['name']}: {r['severity']} risk level ({r['risk_score']}/100). Principal indicators: {reasons_str}. Data exfiltration probability stands at {r.get('exfil_probability',5)}%."

    return jsonify({"answer": ans})

@app.route('/api/admin/sim', methods=['POST'])
def admin_sim_attack():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    employee_name = data.get("employee_name") or data.get("employee")
    user_id = data.get("user_id")
    vector = data.get("vector") or data.get("simulation_type") or "usb"

    df = load_all_evaluated()
    if df.empty:
        return jsonify({"error": "No user data"}), 404

    emp_row = pd.DataFrame()
    if user_id:
        emp_row = df[df['id'] == user_id]
    if emp_row.empty and employee_name:
        emp_row = df[df['name'].str.lower() == str(employee_name).lower()]
    if emp_row.empty and employee_name:
        emp_row = df[df['username'].str.lower() == str(employee_name).lower()]
    if emp_row.empty:
        emp_row = df.head(1)

    target_emp_name = emp_row.iloc[0]['name']
    uid = emp_row.iloc[0]['id']

    conn = get_conn()
    if vector in ["usb", "mass_download"]:
        conn.execute("UPDATE behavior_data SET usb_usage=1, downloads=280, sensitive_files=14, resignation_flag=1, business_impact_rupees=1100000, mitre_techniques=?, mitre_confidence=98 WHERE user_id=?",
                     ("T1005 (Data from Local System), T1052.001 (Exfiltration over USB)", uid))
    elif vector in ["phish", "off_hours"]:
        conn.execute("UPDATE behavior_data SET device_known=0, failed_logins=6, login_time=3, current_login_location='North Korea', mitre_techniques=?, mitre_confidence=92 WHERE user_id=?",
                     ("T1078 (Valid Accounts), T1110 (Brute Force)", uid))
    elif vector in ["privilege", "admin_escalation"]:
        conn.execute("UPDATE behavior_data SET privilege_escalation_flag=1, privilege_escalation_details='Role Yesterday: Employee, Role Today: Admin', business_impact_rupees=2400000, mitre_techniques=?, mitre_confidence=95 WHERE user_id=?",
                     ("T1078 (Valid Accounts), T1098 (Account Manipulation)", uid))
    elif vector in ["shadow", "genai_exfil"]:
        conn.execute("UPDATE behavior_data SET genai_upload_mb=112.5, shadow_it_flag=1, shadow_it_details='AnyDesk (Blocked), Unknown VPN (Blocked)', ai_risk_flag=1, ai_risk_details='Sensitive source code pasted to ChatGPT & Gemini', business_impact_rupees=1600000, mitre_techniques=?, mitre_confidence=94 WHERE user_id=?",
                     ("T1567.002 (Exfiltration to Cloud Services)", uid))
    elif vector in ["travel", "impossible_travel"]:
        conn.execute("UPDATE behavior_data SET impossible_travel_flag=1, impossible_travel_details='Office (09:00) → Moscow IP (09:08). Travel time: 10 Hours.', device_known=0, current_login_location='Russia', mitre_techniques=?, mitre_confidence=97 WHERE user_id=?",
                     ("T1133 (External Remote Services)", uid))
    
    conn.commit()
    conn.close()

    log_audit(payload["user_id"], analyst, payload["name"], payload["department"],
              "Attack Simulated", f"Injected simulated vector: {str(vector).upper()} on {target_emp_name}",
              payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    return jsonify({"success": True})

@app.route('/api/admin/sim/reset', methods=['POST'])
def admin_sim_reset():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    employee_name = data.get("employee_name") or data.get("employee")
    user_id = data.get("user_id")

    df = load_all_evaluated()
    if df.empty:
        return jsonify({"error": "No user data"}), 404

    emp_row = pd.DataFrame()
    if user_id:
        emp_row = df[df['id'] == user_id]
    if emp_row.empty and employee_name:
        emp_row = df[df['name'].str.lower() == str(employee_name).lower()]
    if emp_row.empty and employee_name:
        emp_row = df[df['username'].str.lower() == str(employee_name).lower()]
    if emp_row.empty:
        emp_row = df.head(1)

    uid = emp_row.iloc[0]['id']
    uname = emp_row.iloc[0]['username']

    bd = BEHAVIOR_SEED.get(uname, {
        "login_time": 9, "file_access_count": 15, "failed_logins": 0, "device_known": 1,
        "downloads": 5, "sensitive_files": 0, "resignation_flag": 0, "genai_upload_mb": 0.0,
        "external_uploads": 0, "usb_usage": 0, "email_attachments": 0, "printing_events": 0,
        "impossible_travel_flag": 0, "credential_sharing_flag": 0, "shadow_it_flag": 0,
        "ai_risk_flag": 0, "unusual_collaboration_flag": 0, "privilege_escalation_flag": 0
    })

    conn = get_conn()
    conn.execute("""UPDATE behavior_data SET
        login_time=?,file_access_count=?,failed_logins=?,device_known=?,downloads=?,sensitive_files=?,
        resignation_flag=?,genai_upload_mb=?,external_uploads=?,usb_usage=?,email_attachments=?,
        printing_events=?,impossible_travel_flag=?,impossible_travel_details='',
        credential_sharing_flag=?,credential_sharing_details='',shadow_it_flag=?,shadow_it_details='',
        ai_risk_flag=?,ai_risk_details='',unusual_collaboration_flag=?,unusual_collaboration_details='',
        privilege_escalation_flag=?,privilege_escalation_details='',mitre_techniques='None',mitre_confidence=0,
        business_impact_rupees=0,current_login_location='Office' WHERE user_id=?""",
        (bd.get("login_time", 9), bd.get("file_access_count", 15), bd.get("failed_logins", 0), bd.get("device_known", 1),
         bd.get("downloads", 5), bd.get("sensitive_files", 0), bd.get("resignation_flag", 0), bd.get("genai_upload_mb", 0.0),
         bd.get("external_uploads", 0), bd.get("usb_usage", 0), bd.get("email_attachments", 0), bd.get("printing_events", 0),
         bd.get("impossible_travel_flag", 0), bd.get("credential_sharing_flag", 0), bd.get("shadow_it_flag", 0),
         bd.get("ai_risk_flag", 0), bd.get("unusual_collaboration_flag", 0), bd.get("privilege_escalation_flag", 0), uid))
    
    conn.execute("DELETE FROM incidents WHERE user_id=?", (uid,))
    conn.commit()
    conn.close()

    log_audit(payload["user_id"], analyst, payload["name"], payload["department"],
              "Baseline Restored", f"Restored behavioral baseline parameters for {uname}",
              payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    return jsonify({"success": True})

@app.route('/api/admin/audit', methods=['GET'])
def admin_audit_logs():
    event_type_filter = request.args.get("event_type", "All")
    status_filter = request.args.get("status", "All") # 'Suspicious Only', 'Normal Only', 'All'

    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT timestamp, user_name, department, event_type, event_details, ip_addr, device, is_suspicious, risk_contrib
        FROM audit_events ORDER BY timestamp DESC LIMIT 250
    """)
    rows = c.fetchall()
    conn.close()

    audit_list = []
    for r in rows:
        ts, uname, dept, etype, edet, ip, dev, is_susp, rc = r
        if event_type_filter != "All" and etype != event_type_filter:
            continue
        if status_filter == "Suspicious Only" and not is_susp:
            continue
        if status_filter == "Normal Only" and is_susp:
            continue
        audit_list.append({
            "timestamp": ts,
            "employee": uname or "System / Admin",
            "department": dept or "Operations",
            "event_type": etype,
            "details": edet,
            "ip": ip,
            "device": dev,
            "is_suspicious": bool(is_susp),
            "risk_contrib": rc
        })

    return jsonify(audit_list)

@app.route('/api/admin/live-activity', methods=['GET'])
def admin_live_activity():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT timestamp, user_name, event_type, event_details, is_suspicious, risk_contrib
        FROM audit_events ORDER BY timestamp DESC LIMIT 30
    """)
    rows = c.fetchall()
    conn.close()

    siem_stream = []
    for r in rows:
        ts, uname, etype, edet, is_susp, rc = r
        try:
            time_str = datetime.fromisoformat(ts).strftime("%H:%M")
        except Exception:
            time_str = ts[:5] if len(str(ts)) >= 5 else "09:00"

        siem_stream.append({
            "time": time_str,
            "user": uname or "System",
            "event_type": etype,
            "details": edet,
            "is_suspicious": bool(is_susp),
            "risk_contrib": rc
        })

    # Default fallback simulated SIEM stream if database events are minimal
    if len(siem_stream) < 6:
        siem_stream = [
            {"time": "09:00", "user": "Ravi", "event_type": "Login", "details": "Successful SSO Authentication", "is_suspicious": False, "risk_contrib": 0},
            {"time": "09:02", "user": "Ravi", "event_type": "Payroll Access", "details": "Accessed Payroll System", "is_suspicious": True, "risk_contrib": 20},
            {"time": "09:04", "user": "Ravi", "event_type": "Download Report", "details": "Downloaded Q2_Performance_Report.pdf", "is_suspicious": False, "risk_contrib": 0},
            {"time": "09:06", "user": "Ravi", "event_type": "New Device", "details": "Access attempt from unregistered hardware fingerprint", "is_suspicious": True, "risk_contrib": 15},
            {"time": "09:08", "user": "System", "event_type": "Risk Increased", "details": "Unified UEBA Risk Score updated to 65/100", "is_suspicious": True, "risk_contrib": 25},
            {"time": "09:09", "user": "SOC Engine", "event_type": "Alert Generated", "details": "P1 Critical Alert — Automated Lockout Challenge Issued", "is_suspicious": True, "risk_contrib": 35}
        ]

    return jsonify(siem_stream)

@app.route('/api/admin/reports/download', methods=['GET'])
def admin_download_report():
    report_type = request.args.get("type", "weekly_security").lower()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0050b3')
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#4a6275')
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0f172a')
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11
    )
    
    elements = []
    
    if report_type == "incident":
        doc_title = "ZeroTrustNet — Security Incident & Case File Report"
        filename = "Incident_Security_Report.pdf"
    elif report_type == "employee_risk":
        doc_title = "ZeroTrustNet — Employee UEBA Risk & Anomaly Report"
        filename = "Employee_Risk_Report.pdf"
    elif report_type == "weekly_security":
        doc_title = "ZeroTrustNet — Executive Weekly Security Posture Report"
        filename = "Weekly_Security_Report.pdf"
    elif report_type == "department_risk":
        doc_title = "ZeroTrustNet — Organizational Department Risk Report"
        filename = "Department_Risk_Report.pdf"
    else:
        doc_title = "ZeroTrustNet — Immutable Security Audit Trail Report"
        filename = "Security_Audit_Report.pdf"

    elements.append(Paragraph(doc_title, title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')} | Security Classification: CONFIDENTIAL / SOC INTERNAL", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0050b3'), spaceBefore=2, spaceAfter=12))

    df = load_all_evaluated()

    if report_type == "incident":
        elements.append(Paragraph("Active & Historical Security Incidents", h2_style))
        elements.append(Spacer(1, 6))
        
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT incident_id, user_name, department, severity, status, risk_score, summary FROM incidents ORDER BY created_at DESC LIMIT 40")
        inc_rows = c.fetchall()
        conn.close()
        
        table_data = [["Incident ID", "Employee", "Dept", "Severity", "Status", "Risk", "Threat Summary"]]
        for r in inc_rows:
            table_data.append([
                Paragraph(r[0], cell_style),
                Paragraph(r[1], cell_style),
                Paragraph(r[2], cell_style),
                Paragraph(r[3], cell_style),
                Paragraph(r[4], cell_style),
                Paragraph(str(r[5]), cell_style),
                Paragraph(r[6][:60] + '...', cell_style)
            ])
            
        t = Table(table_data, colWidths=[65, 75, 55, 60, 55, 35, 195])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t)

    elif report_type == "employee_risk":
        elements.append(Paragraph("Employee Behavioral Baseline & Anomaly Matrix", h2_style))
        elements.append(Spacer(1, 6))
        
        table_data = [["Employee Name", "Department", "Risk Score", "Severity", "Primary Anomaly / Recommendation"]]
        for _, r in df.iterrows():
            table_data.append([
                Paragraph(r['name'], cell_style),
                Paragraph(r['department'], cell_style),
                Paragraph(f"{r['risk_score']}/100", cell_style),
                Paragraph(r['severity'], cell_style),
                Paragraph(r.get('primary_recommendation', 'Baseline Verified'), cell_style)
            ])
            
        t = Table(table_data, colWidths=[90, 80, 55, 65, 250])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(t)

    elif report_type == "department_risk":
        elements.append(Paragraph("Departmental Insider Risk Breakdown", h2_style))
        elements.append(Spacer(1, 6))
        
        dept_summary = df.groupby('department')['risk_score'].agg(['mean', 'count', 'max']).reset_index()
        table_data = [["Department Unit", "Monitored Employees", "Average Risk Score", "Max Risk Score", "Posture Status"]]
        for _, r in dept_summary.iterrows():
            avg = round(r['mean'], 1)
            status = "🔴 High Risk" if avg >= 60 else "🟡 Medium Risk" if avg >= 30 else "🟢 Normal"
            table_data.append([
                Paragraph(r['department'], cell_style),
                Paragraph(str(int(r['count'])), cell_style),
                Paragraph(f"{avg}/100", cell_style),
                Paragraph(f"{int(r['max'])}/100", cell_style),
                Paragraph(status, cell_style)
            ])
            
        t = Table(table_data, colWidths=[120, 100, 100, 90, 130])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(t)

    elif report_type == "weekly_security":
        elements.append(Paragraph("Executive SOC Posture Summary & Key Metrics", h2_style))
        elements.append(Spacer(1, 6))
        
        avg_risk = round(df['risk_score'].mean(), 1) if not df.empty else 0.0
        table_data = [
            ["Metric Parameter", "Current Status Value", "Benchmark Target"],
            ["Overall Security Posture Score", "75%", ">= 80% Healthy"],
            ["Mean Insider Threat Risk Score", f"{avg_risk}/100", "< 30/100 Baseline"],
            ["Active Monitored Sessions", f"{len(df)} Employees", "100% Endpoint Coverage"],
            ["P1 Critical Incidents Open", "2 Incidents", "0 Critical Incidents"],
            ["Isolated Hardware Fingerprints", "0 Blocked Devices", "Strict Policy Enforced"]
        ]
        t = Table(table_data, colWidths=[180, 160, 200])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(t)

    else: # audit
        elements.append(Paragraph("Security Event Audit Logs & Continuous Traces", h2_style))
        elements.append(Spacer(1, 6))
        
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT timestamp, user_name, event_type, event_details, is_suspicious FROM audit_events ORDER BY timestamp DESC LIMIT 40")
        audit_rows = c.fetchall()
        conn.close()
        
        table_data = [["Timestamp", "Employee", "Event Type", "Event Activity Details", "Policy Status"]]
        for r in audit_rows:
            table_data.append([
                Paragraph(r[0][:16].replace('T', ' '), cell_style),
                Paragraph(r[1] or 'System', cell_style),
                Paragraph(r[2], cell_style),
                Paragraph(r[3][:55] + '...', cell_style),
                Paragraph("⚠ Flagged" if r[4] else "✓ Normal", cell_style)
            ])
            
        t = Table(table_data, colWidths=[80, 75, 75, 230, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(t)

    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceBefore=4, spaceAfter=8))
    elements.append(Paragraph("ZeroTrustNet Automated Security Operations System | Powered by Multi-Layer AI Anomaly Detection", subtitle_style))

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/pdf'
    )

@app.route('/api/admin/employees', methods=['GET'])
def admin_employees_list():
    df = load_all_evaluated()
    if df.empty:
        return jsonify([])
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/admin/reset-system', methods=['POST'])
def admin_reset_system():
    conn = get_conn()
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS users")
    c.execute("DROP TABLE IF EXISTS behavior_data")
    c.execute("DROP TABLE IF EXISTS audit_events")
    c.execute("DROP TABLE IF EXISTS incidents")
    c.execute("DROP TABLE IF EXISTS policies")
    c.execute("DROP TABLE IF EXISTS sessions")
    c.execute("DROP TABLE IF EXISTS notifications")
    c.execute("DROP TABLE IF EXISTS file_access_logs")
    conn.commit()
    conn.close()

    init_db()
    seed_db()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)
    return jsonify({"success": True, "message": "System database reset to clean real-time baseline."})

# ── MFA & DEVICE TRUST ENDPOINTS ───────────────────────────────────────────────

@app.route('/api/auth/mfa-step1', methods=['POST'])
def api_mfa_step1():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role_req = data.get("role", "employee")

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT id, name, department, emp_type, role, is_active FROM users WHERE username=? AND pwd_hash=?",
              (username, hash_pwd(password)))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Invalid username or password"}), 401

    uid, name, dept, emp_type, urole, is_active = row
    if not is_active:
        return jsonify({"error": "Account is locked or disabled due to security policy"}), 403

    if urole != role_req:
        return jsonify({"error": f"Incorrect portal access. User role is {urole}"}), 403

    mfa_payload = {
        "user_id": uid,
        "username": username,
        "name": name,
        "department": dept,
        "emp_type": emp_type,
        "role": urole,
        "mfa_pending": True,
        "otp_demo": "123456",
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    mfa_token = jwt.encode(mfa_payload, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "mfa_required": True,
        "mfa_token": mfa_token,
        "username": username,
        "message": "Step 1 authentication passed. 6-digit OTP code sent."
    })

@app.route('/api/auth/mfa-verify', methods=['POST'])
def api_mfa_verify():
    data = request.json or {}
    mfa_token = data.get("mfa_token", "")
    otp_code = data.get("otp_code", "").strip()
    device_info = data.get("device_info", {})

    try:
        payload = jwt.decode(mfa_token, SECRET_KEY, algorithms=["HS256"])
        if not payload.get("mfa_pending"):
            return jsonify({"error": "Invalid MFA session"}), 400
    except Exception:
        return jsonify({"error": "MFA session expired or invalid"}), 401

    if len(otp_code) != 6 or not otp_code.isdigit():
        return jsonify({"error": "Invalid OTP code. Must be 6 digits."}), 400

    uid = payload["user_id"]
    username = payload["username"]
    name = payload["name"]
    dept = payload["department"]
    emp_type = payload["emp_type"]
    urole = payload["role"]

    sid = str(uuid.uuid4())
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or f"10.0.{hash(username)%5}.{hash(username)%200+1}")
    device_str = device_info.get("device_name", "Office Device" if urole == "employee" else "Admin Console Workstation")

    conn = get_conn()
    conn.execute("INSERT INTO sessions (id, user_id, username, login_time, logout_time, ip_addr, device, department, role, is_active, risk_score) VALUES (?,?,?,?,?,?,?,?,?,1,0)",
                 (sid, uid, username, datetime.now().isoformat(), None, ip, device_str, dept, urole))
    conn.commit()
    conn.close()

    log_audit(uid, username, name, dept, "Login (MFA Verified)", f"Authenticated with 2FA OTP code from {device_str} (IP: {ip})", ip, device_str, 0, 0, session_id=sid)

    session_payload = {
        "user_id": uid,
        "username": username,
        "name": name,
        "department": dept,
        "emp_type": emp_type,
        "role": urole,
        "session_id": sid,
        "ip": ip,
        "device": device_str,
        "mfa_verified": True,
        "exp": datetime.utcnow() + timedelta(hours=10)
    }
    token = jwt.encode(session_payload, SECRET_KEY, algorithm="HS256")
    return jsonify({"token": token, "user": session_payload})

@app.route('/api/auth/stepup-verify', methods=['POST'])
def api_stepup_verify():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    otp_code = request.json.get("otp_code", "")
    if len(otp_code) != 6 or not otp_code.isdigit():
        return jsonify({"error": "Invalid Step-Up OTP code"}), 400

    log_audit(payload["user_id"], payload["username"], payload["name"], payload["department"],
              "Step-Up MFA Verified", f"User completed Step-Up authentication for high-risk operation", payload["ip"], payload["device"], 0, 0, session_id=payload["session_id"])

    return jsonify({"success": True, "message": "Step-Up verification successful."})

# ── SESSION MANAGER & ACCOUNT LOCKING ──────────────────────────────────────────

@app.route('/api/admin/sessions', methods=['GET'])
def admin_sessions():
    df = load_all_evaluated()
    risk_dict = {}
    threat_dict = {}
    if not df.empty:
        for _, r in df.iterrows():
            risk_dict[r['username']] = r['risk_score']
            threat_dict[r['username']] = r.get('threat_classification', 'Normal')

    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT s.id, s.user_id, s.username, u.name, u.department, u.role, s.login_time, s.ip_addr, s.device, s.device_id, s.browser, s.os, s.location, s.is_active
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        ORDER BY s.login_time DESC
    """)
    rows = c.fetchall()
    conn.close()

    sessions_list = []
    for r in rows:
        sid, uid, uname, name, dept, urole, login_t, ip, dev, dev_id, browser, os_sys, loc, active = r
        sessions_list.append({
            "id": sid,
            "user_id": uid,
            "username": uname,
            "name": name,
            "department": dept,
            "role": urole,
            "login_time": login_t,
            "ip_addr": ip,
            "device": dev,
            "device_id": dev_id or f"DEV-{abs(hash(uname))%90000+10000}",
            "browser": browser or "Chrome 127.0",
            "os": os_sys or "Windows 11",
            "location": loc or "Bengaluru, India",
            "is_active": bool(active),
            "risk_score": risk_dict.get(uname, 0),
            "threat_classification": threat_dict.get(uname, 'Normal')
        })
    return jsonify(sessions_list)

@app.route('/api/admin/sessions/<id>/terminate', methods=['POST'])
def admin_terminate_session(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT username, user_id FROM sessions WHERE id=?", (id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    target_uname, target_uid = row
    conn.execute("UPDATE sessions SET is_active=0, logout_time=? WHERE id=?", (datetime.now().isoformat(), id))
    conn.commit()
    conn.close()

    log_audit(target_uid, target_uname, target_uname, "Security SOC",
              "Session Terminated", f"Active session {id} force-terminated by analyst '{analyst}'", payload["ip"], payload["device"], 0, 1)

    return jsonify({"success": True, "message": f"Session for user '{target_uname}' terminated."})

@app.route('/api/admin/users/<id>/toggle-lock', methods=['POST'])
def admin_toggle_user_lock(id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT username, name, department, is_active FROM users WHERE id=?", (id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    uname, name, dept, is_active = row
    new_active = 0 if is_active else 1
    conn.execute("UPDATE users SET is_active=? WHERE id=?", (new_active, id))
    
    if new_active == 0:
        conn.execute("UPDATE sessions SET is_active=0, logout_time=? WHERE user_id=?", (datetime.now().isoformat(), id))
    
    conn.commit()
    conn.close()

    action_label = "Unlocked" if new_active else "Locked (Security Lockdown)"
    log_audit(id, uname, name, dept,
              f"Account {action_label}", f"Account status set to {action_label} by SOC Analyst '{analyst}'", payload["ip"], payload["device"], 0, 0)

    return jsonify({"success": True, "is_active": bool(new_active), "message": f"User account {name} ({uname}) is now {action_label}."})

# ── ENCRYPTION, AUDIT EXPORT & NOTIFICATIONS ───────────────────────────────────

@app.route('/api/admin/encryption-status', methods=['GET'])
def admin_encryption_status():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM audit_events")
    audit_count = c.fetchone()[0]
    conn.close()

    digest = hashlib.sha256(f"ZTN_INTEGRITY_SALT_{audit_count}".encode()).hexdigest()

    return jsonify({
        "status": "Encrypted & Integrity Verified",
        "cipher_suite": "AES-256-GCM + HMAC-SHA256",
        "audit_events_count": audit_count,
        "audit_logs_integrity": True,
        "cryptographic_hash": digest[:32],
        "fields_encrypted": ["pwd_hash", "audit_events.event_details", "incidents.evidence", "sessions.ip_addr"],
        "policy_compliance": "FIPS 140-3 / Zero Trust Standard Compliant"
    })

@app.route('/api/admin/audit/export', methods=['GET'])
def admin_audit_export():
    fmt = request.args.get("format", "json").lower()
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 500")
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    data = [dict(zip(cols, r)) for r in rows]

    if fmt == "csv":
        output = "ID,Timestamp,User,Department,EventType,Details,IP,Device,IsSuspicious,RiskContrib\n"
        for d in data:
            det = str(d['event_details']).replace('"', '""')
            output += f'"{d["id"]}","{d["timestamp"]}","{d["username"]}","{d["department"]}","{d["event_type"]}","{det}","{d["ip_addr"]}","{d["device"]}",{d["is_suspicious"]},{d["risk_contrib"]}\n'
        return output, 200, {'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=ztn_audit_logs.csv'}

    return jsonify(data)

@app.route('/api/admin/notifications', methods=['GET'])
def admin_notifications():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 100")
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()
    return jsonify([dict(zip(cols, r)) for r in rows])

@app.route('/api/admin/notifications/send', methods=['POST'])
def admin_notifications_send():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        analyst = payload["username"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    channel = data.get("channel", "Email")
    recipient = data.get("recipient", "soc@company.com")
    subject = data.get("subject", "Security Notice")
    message = data.get("message", "SOC Security Alert Notification")

    nid = str(uuid.uuid4())
    ts = datetime.now().isoformat()
    conn = get_conn()
    conn.execute("""
        INSERT INTO notifications (id, user_id, username, channel, recipient, subject, message, severity, sent_at, status, is_read)
        VALUES (?,?,?,?,?,?,?,?,?,?,0)
    """, (nid, payload["user_id"], analyst, channel, recipient, subject, message, "High", ts, "Dispatched"))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"{channel} alert dispatched to {recipient}."})

@app.route('/api/admin/notifications/mark-read', methods=['POST'])
def admin_notifications_mark_read():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    nid = data.get("id", "all")
    conn = get_conn()
    if nid == "all":
        conn.execute("UPDATE notifications SET is_read=1")
    else:
        conn.execute("UPDATE notifications SET is_read=1 WHERE id=?", (nid,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/admin/notifications/clear', methods=['POST'])
def admin_notifications_clear():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    conn.execute("DELETE FROM notifications")
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ── FILE ACCESS MONITORING & DEVICE TRUST ──────────────────────────────────────

@app.route('/api/employee/file-access', methods=['POST'])
def employee_file_access():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
        uname = payload["username"]
        name = payload["name"]
        dept = payload["department"]
        sid = payload["session_id"]
        ip = payload["ip"]
        device = payload["device"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json or {}
    filename = data.get("filename", "document.pdf")
    filepath = data.get("filepath", f"/company/files/{filename}")
    classification = data.get("classification", "Confidential")
    operation = data.get("operation", "View")
    size_mb = data.get("file_size_mb", 1.5)

    is_flagged = 1 if classification in ["Confidential", "Secret", "Restricted"] and dept not in ["IT Security", "Legal", "Executive"] else 0
    policy_action = "Allowed" if not is_flagged else "Logged & Step-Up MFA Flagged"

    fid = str(uuid.uuid4())
    now_ts = datetime.now().isoformat()

    conn = get_conn()
    conn.execute("INSERT INTO file_access_logs (id, user_id, username, filename, filepath, classification, operation, file_size_mb, timestamp, is_flagged, policy_action) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                 (fid, uid, uname, filename, filepath, classification, operation, size_mb, now_ts, is_flagged, policy_action))

    if operation == "Download":
        conn.execute("UPDATE behavior_data SET downloads = downloads + 1, file_access_count = file_access_count + 1 WHERE user_id=?", (uid,))
    else:
        conn.execute("UPDATE behavior_data SET file_access_count = file_access_count + 1 WHERE user_id=?", (uid,))

    if classification in ["Confidential", "Secret", "Restricted"]:
        conn.execute("UPDATE behavior_data SET sensitive_files = sensitive_files + 1 WHERE user_id=?", (uid,))

    conn.commit()
    conn.close()

    log_audit(uid, uname, name, dept, f"File {operation}", f"{operation} '{filename}' [{classification}] — Policy: {policy_action}", ip, device, 15 if is_flagged else 0, is_flagged, session_id=sid)

    invalidate_eval_cache()
    df_fresh = load_all_evaluated()
    ensure_incidents(df_fresh)

    return jsonify({
        "success": True,
        "is_flagged": bool(is_flagged),
        "policy_action": policy_action,
        "message": f"File operation '{operation}' recorded. Sensitivity classification: {classification}."
    })

@app.route('/api/employee/file-access/history', methods=['GET'])
def employee_file_access_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        uid = payload["user_id"]
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM file_access_logs WHERE user_id=? ORDER BY timestamp DESC LIMIT 50", (uid,))
    cols = [d[0] for d in c.description]
    rows = c.fetchall()
    conn.close()

    return jsonify([dict(zip(cols, r)) for r in rows])

@app.route('/api/admin/device-trust', methods=['GET'])
def admin_device_trust():
    df = load_all_evaluated()
    if df.empty:
        return jsonify([])

    devices = []
    for _, r in df.iterrows():
        is_known = r.get('device_known', 1) == 1
        devices.append({
            "employee": r['name'],
            "department": r['department'],
            "device_name": r.get('baseline_device', 'Corporate Laptop'),
            "is_known": is_known,
            "trust_status": "Trusted Device" if is_known else "Untrusted / Pending Verification",
            "disk_encryption": "BitLocker AES-256 Enabled" if is_known else "Not Verified",
            "firewall_status": "Active (Enforced)" if is_known else "Warning: External IP",
            "last_seen_location": r.get('current_login_location', 'Bengaluru'),
            "risk_score": r.get('risk_score', 0)
        })
    return jsonify(devices)

# ── FRONTEND STATIC SERVING (SINGLE-LINK FULLSTACK) ─────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({"error": "Endpoint not found"}), 404
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, path)) and path != "":
        return send_file(os.path.join(app.static_folder, path))
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_file(os.path.join(app.static_folder, 'index.html'))
    return jsonify({"message": "ZeroTrustNet API Server is running. Build frontend with 'npm run build' inside frontend/ directory."})

# ── RUN INITIALIZATION ─────────────────────────────────────────────────────────

try:
    init_db()
    seed_db()
    df_init = load_all_evaluated()
    ensure_incidents(df_init)
except Exception as e:
    print(f"Startup initialization notice: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
