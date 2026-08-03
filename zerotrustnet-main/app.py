# ============================================================
#  ZeroTrustNet | Enterprise Zero Trust Security Platform
#  Version 4.0 | Multi-Algorithm | Dual-Role | Audit-Driven
# ============================================================

import streamlit as st
import pandas as pd
import numpy as np
import sqlite3
import hashlib
import uuid
import json
import os
from datetime import datetime, timedelta
import time

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.svm import OneClassSVM
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

# ── PAGE CONFIG ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ZeroTrustNet | Enterprise Security",
    layout="wide",
    initial_sidebar_state="expanded",
    page_icon="🛡️"
)

# ── DATABASE PATH ─────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zerotrust.db")

# ═════════════════════════════════════════════════════════════════════════════
#  GLOBAL CSS — Dark Cyber Enterprise Theme
# ═════════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

html, body, [class*="css"], .stApp {
    font-family: 'Outfit', sans-serif !important;
    background: radial-gradient(ellipse at 15% 40%, #0d1b3e 0%, #020617 55%, #000d1a 100%) !important;
    color: #c8d6e8;
}

/* ANIMATED CYBER GRID */
.stApp::before {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width: 200%; height: 200%;
    background-image:
        linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px);
    background-size: 55px 55px;
    animation: gridMove 35s linear infinite;
    z-index: -1;
    pointer-events: none;
}
@keyframes gridMove {
    0%   { transform: translate(0,0); }
    100% { transform: translate(-55px,-55px); }
}

/* SIDEBAR */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #03091e 0%, #010614 100%) !important;
    border-right: 1px solid rgba(0,245,255,0.09) !important;
}
section[data-testid="stSidebar"] .block-container {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 1rem !important;
}

/* MAIN BLOCK */
.block-container {
    background: rgba(2,8,26,0.78) !important;
    border: 1px solid rgba(0,245,255,0.07) !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 48px rgba(0,0,0,0.65) !important;
    backdrop-filter: blur(14px) !important;
    padding: 2rem !important;
    max-width: 1800px !important;
}

/* ── TYPOGRAPHY ──────────────────────────────────────────────────────────── */
.zt-title {
    font-size: 2.2rem;
    font-weight: 800;
    background: linear-gradient(120deg, #00f5ff 0%, #0080ff 60%, #7b2fff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.15rem;
    letter-spacing: -0.5px;
    line-height: 1.2;
}
.zt-subtitle {
    color: #3d5470;
    font-size: 0.8rem;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin-bottom: 1.6rem;
}
.zt-section {
    font-size: 1rem;
    font-weight: 700;
    color: #8aafc8;
    letter-spacing: 0.5px;
    margin: 1.2rem 0 0.6rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* ── CARDS ───────────────────────────────────────────────────────────────── */
.zt-card {
    background: rgba(6,14,42,0.88);
    border: 1px solid rgba(0,245,255,0.1);
    border-radius: 12px;
    padding: 1.3rem 1.4rem;
    margin-bottom: 0.9rem;
    transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
}
.zt-card:hover {
    border-color: rgba(0,245,255,0.28);
    box-shadow: 0 4px 28px rgba(0,245,255,0.07);
    transform: translateY(-1px);
}
.zt-card.critical { border-left: 3px solid #ef4444 !important; }
.zt-card.high     { border-left: 3px solid #f97316 !important; }
.zt-card.medium   { border-left: 3px solid #eab308 !important; }
.zt-card.low      { border-left: 3px solid #22c55e !important; }
.zt-card.info     { border-left: 3px solid #00f5ff !important; }
.zt-card.emp      { border-left: 3px solid #7b2fff !important; }

/* PULSE ANIMATION */
@keyframes pulse-red {
    0%,100% { box-shadow: 0 0 8px rgba(239,68,68,0.3); border-color: rgba(239,68,68,0.3); }
    50%      { box-shadow: 0 0 22px rgba(239,68,68,0.65); border-color: rgba(239,68,68,0.65); }
}
.pulse-card { animation: pulse-red 2.2s ease-in-out infinite; }

/* ── METRIC TILES ─────────────────────────────────────────────────────────── */
.zt-metric {
    background: rgba(6,14,42,0.9);
    border: 1px solid rgba(0,245,255,0.12);
    border-radius: 10px;
    padding: 1.1rem 1rem;
    text-align: center;
    position: relative;
    overflow: hidden;
}
.zt-metric::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent);
}
.zt-metric .val {
    font-size: 1.9rem;
    font-weight: 800;
    color: #00f5ff;
    line-height: 1.1;
    text-shadow: 0 0 16px rgba(0,245,255,0.35);
}
.zt-metric .lbl {
    font-size: 0.68rem;
    color: #3d5470;
    text-transform: uppercase;
    letter-spacing: 1.8px;
    margin-top: 0.35rem;
    font-weight: 500;
}
.zt-metric .sub { font-size: 0.75rem; color: #5a7090; margin-top: 0.15rem; }
.val.c  { color: #ef4444 !important; text-shadow: 0 0 14px rgba(239,68,68,0.4) !important; }
.val.h  { color: #f97316 !important; text-shadow: 0 0 14px rgba(249,115,22,0.4) !important; }
.val.m  { color: #eab308 !important; text-shadow: 0 0 14px rgba(234,179,8,0.35) !important; }
.val.s  { color: #22c55e !important; text-shadow: 0 0 14px rgba(34,197,94,0.35) !important; }
.val.p  { color: #a855f7 !important; text-shadow: 0 0 14px rgba(168,85,247,0.35) !important; }

/* ── BADGES ──────────────────────────────────────────────────────────────── */
.badge {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.6;
}
.bc { background: rgba(239,68,68,0.12);  color: #ef4444; border: 1px solid rgba(239,68,68,0.35); }
.bh { background: rgba(249,115,22,0.12); color: #f97316; border: 1px solid rgba(249,115,22,0.35); }
.bm { background: rgba(234,179,8,0.12);  color: #eab308; border: 1px solid rgba(234,179,8,0.35); }
.bl { background: rgba(34,197,94,0.12);  color: #22c55e; border: 1px solid rgba(34,197,94,0.35); }
.bi { background: rgba(0,245,255,0.09);  color: #00f5ff; border: 1px solid rgba(0,245,255,0.25); }
.bp { background: rgba(168,85,247,0.12); color: #a855f7; border: 1px solid rgba(168,85,247,0.35); }

/* ── TIMELINE ────────────────────────────────────────────────────────────── */
.tl-wrap { padding: 4px 0 4px 4px; }
.tl-item {
    position: relative;
    padding: 8px 12px 8px 28px;
    margin-bottom: 0;
    border-left: 2px solid rgba(0,245,255,0.18);
}
.tl-item.fl { border-left-color: rgba(239,68,68,0.6); }
.tl-item::before {
    content: "";
    position: absolute;
    left: -5px; top: 12px;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #00f5ff;
    box-shadow: 0 0 5px #00f5ff;
}
.tl-item.fl::before { background: #ef4444; box-shadow: 0 0 5px #ef4444; }
.tl-t { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #3d5470; }
.tl-d { font-size: 0.85rem; color: #c8d6e8; margin-top: 1px; }
.tl-d.fl-d { color: #ef4444; font-weight: 600; }

/* ── BUTTONS ─────────────────────────────────────────────────────────────── */
.stButton > button {
    background: linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(0,80,180,0.15) 100%) !important;
    border: 1px solid rgba(0,245,255,0.25) !important;
    color: #00d4e8 !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    transition: all 0.25s ease !important;
    font-family: 'Outfit', sans-serif !important;
    font-size: 0.88rem !important;
    padding: 0.5rem 1.2rem !important;
}
.stButton > button:hover {
    background: linear-gradient(135deg, rgba(0,245,255,0.18) 0%, rgba(0,80,180,0.28) 100%) !important;
    border-color: rgba(0,245,255,0.55) !important;
    box-shadow: 0 0 18px rgba(0,245,255,0.18) !important;
    transform: translateY(-1px) !important;
}

/* ── INPUTS ──────────────────────────────────────────────────────────────── */
.stTextInput > div > div > input,
.stNumberInput > div > div > input {
    background: rgba(6,14,42,0.9) !important;
    border: 1px solid rgba(0,245,255,0.14) !important;
    color: #c8d6e8 !important;
    border-radius: 8px !important;
    font-family: 'Outfit', sans-serif !important;
}
.stTextInput > div > div > input:focus,
.stNumberInput > div > div > input:focus {
    border-color: rgba(0,245,255,0.45) !important;
    box-shadow: 0 0 10px rgba(0,245,255,0.1) !important;
}
label { color: #4a6275 !important; font-size: 0.82rem !important; letter-spacing: 0.3px !important; }
.stSelectbox > div > div { border-radius: 8px !important; }

/* ── DATAFRAME ───────────────────────────────────────────────────────────── */
[data-testid="stDataFrame"] { border-radius: 8px !important; border: 1px solid rgba(0,245,255,0.08) !important; }

/* ── RISK BAR ────────────────────────────────────────────────────────────── */
.rb-wrap { margin: 8px 0; }
.rb-track {
    height: 7px;
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
    overflow: hidden;
}
.rb-fill { height: 100%; border-radius: 4px; }
.rb-label { display: flex; justify-content: space-between; font-size: 0.72rem; color: #3d5470; margin-bottom: 3px; }

/* ── SCROLLBAR ───────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,245,255,0.18); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,245,255,0.38); }

/* ── SIDEBAR LOGO SECTION ────────────────────────────────────────────────── */
.sb-logo {
    text-align: center;
    padding: 1.2rem 0.5rem 1rem;
    border-bottom: 1px solid rgba(0,245,255,0.08);
    margin-bottom: 0.8rem;
}
.sb-logo .brand {
    font-size: 1.2rem;
    font-weight: 800;
    color: #00f5ff;
    letter-spacing: -0.3px;
}
.sb-logo .tagline {
    font-size: 0.62rem;
    color: #2d4060;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
}
.sb-logo .status {
    margin-top: 8px;
    font-size: 0.7rem;
    color: #22c55e;
    letter-spacing: 1px;
}

/* ── LOGIN ───────────────────────────────────────────────────────────────── */
.login-hero {
    text-align: center;
    padding: 2rem 0 1rem;
}
.login-hero .logo-text {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(120deg, #00f5ff, #0080ff, #7b2fff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.login-hero .tagline {
    font-size: 0.8rem;
    color: #2d4060;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 4px;
}

/* ── MISC ────────────────────────────────────────────────────────────────── */
#MainMenu, footer, header { visibility: hidden; }
.stAlert { border-radius: 8px !important; }
hr { border-color: rgba(0,245,255,0.07) !important; }
</style>
""", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
#  DATABASE LAYER
# ═════════════════════════════════════════════════════════════════════════════

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
        is_active   INTEGER DEFAULT 1,
        risk_score  INTEGER DEFAULT 0
    )""")

    conn.commit()
    conn.close()

# ──────────────────────────────────────────────────────────────────────────────
#  DEFAULT DATA SEEDER
# ──────────────────────────────────────────────────────────────────────────────

def hash_pwd(p):
    return hashlib.sha256(p.encode()).hexdigest()

USERS_SEED = [
    {"username":"admin",           "pwd":"admin123",  "name":"System Administrator",   "dept":"IT Security", "emp_type":"Admin",         "role":"admin"},
    {"username":"ravi",            "pwd":"emp123",    "name":"Ravi Sharma",             "dept":"Engineering", "emp_type":"Employee",      "role":"employee"},
    {"username":"rahul",           "pwd":"emp123",    "name":"Rahul Mehta",             "dept":"HR",          "emp_type":"Employee",      "role":"employee"},
    {"username":"dormant_alice",   "pwd":"emp123",    "name":"Alice Fernandez",         "dept":"Sales",       "emp_type":"Former Employee","role":"employee"},
    {"username":"traveler_dan",    "pwd":"emp123",    "name":"Dan Thomas",              "dept":"IT",          "emp_type":"Employee",      "role":"employee"},
    {"username":"shared_sam",      "pwd":"emp123",    "name":"Sam Wilson",              "dept":"Sales",       "emp_type":"Employee",      "role":"employee"},
    {"username":"burnout_eve",     "pwd":"emp123",    "name":"Eve Martinez",            "dept":"Finance",     "emp_type":"Employee",      "role":"employee"},
    {"username":"shadow_it_ted",   "pwd":"emp123",    "name":"Ted Kumar",               "dept":"Engineering", "emp_type":"Employee",      "role":"employee"},
    {"username":"ai_paste_pat",    "pwd":"emp123",    "name":"Pat Nair",                "dept":"Engineering", "emp_type":"Employee",      "role":"employee"},
    {"username":"escalated_eric",  "pwd":"emp123",    "name":"Eric Bose",               "dept":"IT",          "emp_type":"Employee",      "role":"employee"},
    {"username":"priya_sales",     "pwd":"emp123",    "name":"Priya Reddy",             "dept":"Sales",       "emp_type":"Employee",      "role":"employee"},
    {"username":"amit_marketing",  "pwd":"emp123",    "name":"Amit Joshi",              "dept":"Marketing",   "emp_type":"Employee",      "role":"employee"},
    {"username":"john_legal",      "pwd":"emp123",    "name":"John Varghese",           "dept":"Legal",       "emp_type":"Employee",      "role":"employee"},
]

BEHAVIOR_SEED = {
    "ravi":           {"login_time":23,"file_access_count":340,"failed_logins":1,"device_known":0,"downloads":340,"sensitive_files":12,"resignation_flag":1,"genai_upload_mb":45.2,"external_uploads":5,"usb_usage":1,"email_attachments":8,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":55,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":1,"ai_risk_details":"Sensitive code pasted to ChatGPT & Gemini","unusual_collaboration_flag":1,"unusual_collaboration_details":"Accessed Finance folder files","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":88,"forecast_next_week":92,"forecast_next_month":96,"baseline_login_time":"09:15","baseline_device":"Office Laptop","baseline_location":"Bengaluru","baseline_file_access":18,"accessed_folders":"Finance, Engineering","expected_folders":"Engineering","business_impact_rupees":1250000,"mitre_techniques":"T1005 (Data from Local System), T1567 (Exfiltration Over Web Service)","mitre_confidence":96},
    "rahul":          {"login_time":10,"file_access_count":45,"failed_logins":0,"device_known":1,"downloads":10,"sensitive_files":5,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":20,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":1,"unusual_collaboration_details":"HR Employee accessing Payroll Database and Finance Folder","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":74,"forecast_next_week":80,"forecast_next_month":85,"baseline_login_time":"09:30","baseline_device":"Office Desktop","baseline_location":"Bengaluru","baseline_file_access":12,"accessed_folders":"Payroll Database, Finance Folder","expected_folders":"HR Folder","business_impact_rupees":820000,"mitre_techniques":"T1078 (Valid Accounts)","mitre_confidence":85},
    "dormant_alice":  {"login_time":2,"file_access_count":5,"failed_logins":2,"device_known":0,"downloads":2,"sensitive_files":1,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":132,"last_login_location":"Pune","current_login_location":"Pune","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":10,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":50,"forecast_next_week":65,"forecast_next_month":78,"baseline_login_time":"10:00","baseline_device":"Work Laptop","baseline_location":"Pune","baseline_file_access":15,"accessed_folders":"Sales Folder","expected_folders":"None (Dormant)","business_impact_rupees":150000,"mitre_techniques":"T1078.004 (Cloud Accounts)","mitre_confidence":90},
    "traveler_dan":   {"login_time":9,"file_access_count":10,"failed_logins":1,"device_known":0,"downloads":2,"sensitive_files":0,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"London","impossible_travel_flag":1,"impossible_travel_details":"Bengaluru (09:00) → London (09:12). Travel Time Required: 10 Hours.","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":30,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":95,"forecast_next_week":95,"forecast_next_month":95,"baseline_login_time":"09:00","baseline_device":"Office Laptop","baseline_location":"Bengaluru","baseline_file_access":20,"accessed_folders":"IT Support Logs","expected_folders":"IT Support Logs","business_impact_rupees":950000,"mitre_techniques":"T1133 (External Remote Services)","mitre_confidence":98},
    "shared_sam":     {"login_time":14,"file_access_count":35,"failed_logins":0,"device_known":0,"downloads":15,"sensitive_files":2,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Mumbai","current_login_location":"Delhi","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":1,"credential_sharing_details":"Logins from Chrome (Windows) & Safari (macOS) under different IPs concurrently","burnout_stress_score":25,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":70,"forecast_next_week":70,"forecast_next_month":70,"baseline_login_time":"10:00","baseline_device":"Company MacBook","baseline_location":"Mumbai","baseline_file_access":30,"accessed_folders":"Sales CRM","expected_folders":"Sales CRM","business_impact_rupees":450000,"mitre_techniques":"T1078.003 (Local Accounts)","mitre_confidence":92},
    "burnout_eve":    {"login_time":23,"file_access_count":85,"failed_logins":8,"device_known":1,"downloads":12,"sensitive_files":3,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Chennai","current_login_location":"Chennai","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":78,"burnout_details":"Late night logins increasing, Weekend work increasing, Failed logins increasing","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":12,"forecast_next_week":38,"forecast_next_month":74,"baseline_login_time":"09:30","baseline_device":"Finance Desktop","baseline_location":"Chennai","baseline_file_access":40,"accessed_folders":"Finance Ledgers","expected_folders":"Finance Ledgers","business_impact_rupees":350000,"mitre_techniques":"None","mitre_confidence":0},
    "shadow_it_ted":  {"login_time":11,"file_access_count":22,"failed_logins":0,"device_known":1,"downloads":5,"sensitive_files":0,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Hyderabad","current_login_location":"Hyderabad","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":40,"burnout_details":"","shadow_it_flag":1,"shadow_it_details":"AnyDesk (Blocked), TeamViewer (Blocked), Unknown VPN (Blocked). Allowed: Zoom.","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":45,"forecast_next_week":55,"forecast_next_month":65,"baseline_login_time":"09:00","baseline_device":"Linux Workstation","baseline_location":"Hyderabad","baseline_file_access":15,"accessed_folders":"Source Code Repositories","expected_folders":"Source Code Repositories","business_impact_rupees":600000,"mitre_techniques":"T1219 (Remote Access Software)","mitre_confidence":95},
    "ai_paste_pat":   {"login_time":10,"file_access_count":50,"failed_logins":0,"device_known":1,"downloads":10,"sensitive_files":4,"resignation_flag":0,"genai_upload_mb":58.4,"external_uploads":4,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":30,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":1,"ai_risk_details":"Sensitive code pasted to ChatGPT & Gemini","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":80,"forecast_next_week":85,"forecast_next_month":90,"baseline_login_time":"09:00","baseline_device":"Developer MacBook","baseline_location":"Bengaluru","baseline_file_access":25,"accessed_folders":"Core Algorithms Repository","expected_folders":"Core Algorithms Repository","business_impact_rupees":1800000,"mitre_techniques":"T1567.002 (Exfiltration to Cloud Services)","mitre_confidence":94},
    "escalated_eric": {"login_time":8,"file_access_count":90,"failed_logins":1,"device_known":1,"downloads":40,"sensitive_files":8,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":1,"email_attachments":2,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":35,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":1,"unusual_collaboration_details":"Normal Helpdesk user accessing domain controller admin console","privilege_escalation_flag":1,"privilege_escalation_details":"Role Yesterday: Employee, Role Today: Admin","forecast_today":98,"forecast_next_week":98,"forecast_next_month":98,"baseline_login_time":"09:00","baseline_device":"Helpdesk Terminal","baseline_location":"Bengaluru","baseline_file_access":30,"accessed_folders":"Active Directory, Domain Controller Logs","expected_folders":"IT Helpdesk Tickets","business_impact_rupees":2500000,"mitre_techniques":"T1078 (Valid Accounts), T1098 (Account Manipulation)","mitre_confidence":97},
    "priya_sales":    {"login_time":10,"file_access_count":14,"failed_logins":0,"device_known":1,"downloads":4,"sensitive_files":0,"resignation_flag":0,"genai_upload_mb":1.2,"external_uploads":0,"usb_usage":0,"email_attachments":1,"printing_events":0,"last_login_days_ago":0,"last_login_location":"Mumbai","current_login_location":"Mumbai","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":15,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":5,"forecast_next_week":5,"forecast_next_month":5,"baseline_login_time":"10:00","baseline_device":"Work Laptop","baseline_location":"Mumbai","baseline_file_access":15,"accessed_folders":"Sales Folder","expected_folders":"Sales Folder","business_impact_rupees":0,"mitre_techniques":"None","mitre_confidence":0},
    "amit_marketing": {"login_time":11,"file_access_count":8,"failed_logins":1,"device_known":1,"downloads":2,"sensitive_files":0,"resignation_flag":0,"genai_upload_mb":0.5,"external_uploads":0,"usb_usage":0,"email_attachments":0,"printing_events":0,"last_login_days_ago":1,"last_login_location":"Delhi","current_login_location":"Delhi","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":12,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":8,"forecast_next_week":8,"forecast_next_month":8,"baseline_login_time":"09:30","baseline_device":"Office Desktop","baseline_location":"Delhi","baseline_file_access":10,"accessed_folders":"Marketing Assets","expected_folders":"Marketing Assets","business_impact_rupees":0,"mitre_techniques":"None","mitre_confidence":0},
    "john_legal":     {"login_time":9,"file_access_count":18,"failed_logins":0,"device_known":1,"downloads":6,"sensitive_files":2,"resignation_flag":0,"genai_upload_mb":0.0,"external_uploads":0,"usb_usage":0,"email_attachments":2,"printing_events":1,"last_login_days_ago":0,"last_login_location":"Bengaluru","current_login_location":"Bengaluru","impossible_travel_flag":0,"impossible_travel_details":"","credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":18,"burnout_details":"","shadow_it_flag":0,"shadow_it_details":"","ai_risk_flag":0,"ai_risk_details":"","unusual_collaboration_flag":0,"unusual_collaboration_details":"","privilege_escalation_flag":0,"privilege_escalation_details":"","forecast_today":10,"forecast_next_week":10,"forecast_next_month":10,"baseline_login_time":"09:00","baseline_device":"Office Desktop","baseline_location":"Bengaluru","baseline_file_access":15,"accessed_folders":"Legal Contracts","expected_folders":"Legal Contracts","business_impact_rupees":0,"mitre_techniques":"None","mitre_confidence":0},
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

def seed_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] > 0:
        conn.close()
        return

    now_str = datetime.now().isoformat()

    for u in USERS_SEED:
        uid = str(uuid.uuid4())
        c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)",
                  (uid, u["username"], hash_pwd(u["pwd"]),
                   u["name"], u["dept"], u["emp_type"], u["role"], 1, now_str))

        if u["role"] == "employee" and u["username"] in BEHAVIOR_SEED:
            bd = BEHAVIOR_SEED[u["username"]]
            c.execute("""INSERT OR IGNORE INTO behavior_data VALUES
                (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
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

        # Seed audit events for each employee
        if u["role"] == "employee" and u["username"] in BEHAVIOR_SEED:
            bd = BEHAVIOR_SEED[u["username"]]
            base_dt = datetime.now().replace(hour=int(bd["baseline_login_time"].split(":")[0]),
                                              minute=int(bd["baseline_login_time"].split(":")[1]),
                                              second=0, microsecond=0)
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

def _log_event(conn, user_id, username, user_name, department, event_type, event_details, ip, device, risk_contrib, is_suspicious, ts_str=None, session_id=None):
    c = conn.cursor()
    ts = ts_str or datetime.now().isoformat()
    c.execute("INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
              (str(uuid.uuid4()), user_id, username, user_name, department,
               ts, event_type, event_details, ip, device, risk_contrib, is_suspicious, session_id or ""))

# ══════════════════════════════════════════════════════════════════════════════
#  AUTH FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def authenticate(username, password):
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT id, name, department, emp_type, role, is_active FROM users WHERE username=? AND pwd_hash=?",
              (username.strip(), hash_pwd(password)))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    if not row[5]:
        return None
    return {"id": row[0], "username": username, "name": row[1],
            "department": row[2], "emp_type": row[3], "role": row[4]}

def log_audit(user, event_type, details, risk_contrib=0, is_suspicious=0):
    conn = get_conn()
    ip = "10.0.0." + str(hash(user["username"]) % 250 + 1)
    device = BEHAVIOR_SEED.get(user["username"], {}).get("baseline_device", "Office Device")
    sid = st.session_state.get("session_id", "")
    _log_event(conn, user["id"], user["username"], user["name"], user["department"],
               event_type, details, ip, device, risk_contrib, is_suspicious, session_id=sid)
    conn.commit()
    conn.close()

# ══════════════════════════════════════════════════════════════════════════════
#  ML ENGINE — Multi-Algorithm Risk Analysis
# ══════════════════════════════════════════════════════════════════════════════

FEATURES = ['login_time','file_access_count','failed_logins','downloads',
            'sensitive_files','genai_upload_mb','external_uploads','usb_usage',
            'burnout_stress_score','last_login_days_ago']

def run_ml_engine(df):
    """Runs 4 ML algorithms + returns per-row anomaly flags."""
    results = {}
    n = len(df)
    if n < 3 or not ML_AVAILABLE:
        return {i: {"if":-1,"lof":0,"svm":-1,"dbscan":0} for i in df.index}

    X_raw = df[FEATURES].fillna(0).values
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # 1. Isolation Forest
    if_model = IsolationForest(contamination=min(0.35, max(0.1, 4/n)), random_state=42)
    if_preds = if_model.fit_predict(X)

    # 2. Local Outlier Factor
    n_neighbors = min(5, n - 1)
    lof_model = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=min(0.35, 4/n))
    lof_preds = lof_model.fit_predict(X)

    # 3. One-Class SVM (trained on low-risk users for normal profile)
    low_risk_mask = (df['failed_logins'] <= 1) & (df['downloads'] <= 20) & (df['sensitive_files'] <= 3)
    X_train = X[low_risk_mask] if low_risk_mask.sum() >= 2 else X
    svm_model = OneClassSVM(kernel='rbf', nu=0.2, gamma='auto')
    svm_model.fit(X_train)
    svm_preds = svm_model.predict(X)

    # 4. DBSCAN (noise points = anomalies)
    db_model = DBSCAN(eps=2.0, min_samples=2)
    db_labels = db_model.fit_predict(X)

    for i in df.index:
        results[i] = {
            "if":   int(if_preds[i]),
            "lof":  int(lof_preds[i]),
            "svm":  int(svm_preds[i]),
            "dbscan": 1 if db_labels[i] == -1 else 0
        }
    return results

def calculate_risk(row, ml_flags):
    score = 0
    reasons = []
    algo_contrib = {}

    # ─ 1. Privilege Escalation ────────────────────────────────────────────
    if row.get('privilege_escalation_flag') == 1:
        score += 40
        reasons.append(f"Privilege escalation: {row.get('privilege_escalation_details')}")

    # ─ 2. Impossible Travel ───────────────────────────────────────────────
    if row.get('impossible_travel_flag') == 1:
        score += 45
        reasons.append(f"Impossible travel: {row.get('impossible_travel_details')}")

    # ─ 3. Unusual Collaboration / Folder Access ───────────────────────────
    if row.get('unusual_collaboration_flag') == 1:
        score += 25
        reasons.append(f"Unauthorized resource access: {row.get('unusual_collaboration_details')}")

    # ─ 4. Credential Sharing ─────────────────────────────────────────────
    if row.get('credential_sharing_flag') == 1:
        score += 35
        reasons.append(f"Credential sharing: {row.get('credential_sharing_details')}")

    # ─ 5. Data Exfiltration Signals ───────────────────────────────────────
    exfil = 0
    if row.get('usb_usage', 0) == 1:
        exfil += 20; reasons.append("Unapproved USB device connected")
    if row.get('downloads', 0) > 100:
        exfil += 25; reasons.append(f"Mass download: {row.get('downloads')} files")
    elif row.get('downloads', 0) > 20:
        exfil += 12; reasons.append(f"Elevated downloads: {row.get('downloads')} files")
    if row.get('genai_upload_mb', 0) > 20:
        exfil += 20; reasons.append(f"High GenAI upload: {row.get('genai_upload_mb')} MB")
    if row.get('external_uploads', 0) > 2:
        exfil += 15; reasons.append(f"External uploads: {row.get('external_uploads')} events")
    if row.get('email_attachments', 0) > 3:
        exfil += 10; reasons.append(f"Unusual email attachments: {row.get('email_attachments')} files")
    if row.get('resignation_flag', 0) == 1 and exfil > 0:
        exfil = int(exfil * 2.5)
        reasons.append("Pre-resignation exfiltration pattern — signals weighted 2.5x")
    score += exfil

    # ─ 6. AI Risk ─────────────────────────────────────────────────────────
    if row.get('ai_risk_flag') == 1:
        score += 30
        reasons.append(f"Sensitive IP shared with AI: {row.get('ai_risk_details')}")

    # ─ 7. Shadow IT ───────────────────────────────────────────────────────
    if row.get('shadow_it_flag') == 1:
        score += 20
        reasons.append(f"Shadow IT detected: {row.get('shadow_it_details')}")

    # ─ 8. Dormant Account ─────────────────────────────────────────────────
    if row.get('last_login_days_ago', 0) > 90:
        score += 20
        reasons.append(f"Dormant account reactivated after {row.get('last_login_days_ago')} days")

    # ─ 9. Burnout / Stress ────────────────────────────────────────────────
    if row.get('burnout_stress_score', 0) > 60:
        score += 15
        reasons.append(f"High stress score ({row.get('burnout_stress_score')}%): anomalous work pattern")

    # ─ 10. Unknown Device ─────────────────────────────────────────────────
    if row.get('device_known', 1) == 0:
        score += 10
        reasons.append("Login from unregistered/unknown device")

    # ─ 11. Off-Hours Login ────────────────────────────────────────────────
    hr = int(row.get('login_time', 9))
    if hr < 7 or hr > 20:
        score += 10
        reasons.append(f"Off-hours login at {hr:02d}:00 (outside 07:00–20:00 policy window)")

    # ─ 12. Behaviour Baseline Deviation ───────────────────────────────────
    baseline = row.get('baseline_file_access', 15)
    actual = row.get('file_access_count', 0)
    if baseline > 0 and actual > baseline * 2.5:
        score += 15
        reasons.append(f"File access {actual} is {actual/baseline:.1f}x above personal baseline ({baseline}/day)")

    # ─ 13. ML Anomaly Contributions ───────────────────────────────────────
    algo_flags = ml_flags or {}
    ml_score = 0
    if algo_flags.get("if") == -1:
        ml_score += 5
        algo_contrib["Isolation Forest"] = "ANOMALY — behavioral pattern deviates from population"
    else:
        algo_contrib["Isolation Forest"] = "Normal"
    if algo_flags.get("lof") == -1:
        ml_score += 5
        algo_contrib["Local Outlier Factor"] = "ANOMALY — local behavioral outlier detected"
    else:
        algo_contrib["Local Outlier Factor"] = "Normal"
    if algo_flags.get("svm") == -1:
        ml_score += 3
        algo_contrib["One-Class SVM"] = "ANOMALY — behavior outside learned normal boundary"
    else:
        algo_contrib["One-Class SVM"] = "Normal"
    if algo_flags.get("dbscan") == 1:
        ml_score += 2
        algo_contrib["DBSCAN"] = "NOISE POINT — does not belong to any behavioral cluster"
    else:
        algo_contrib["DBSCAN"] = "In cluster"

    score += ml_score

    score = min(score, 100)
    if not reasons:
        reasons.append("No unusual behavior detected — all indicators within baseline")

    if score >= 80:
        severity, priority = "🔴 Critical", "P1"
    elif score >= 60:
        severity, priority = "🟠 High", "P2"
    elif score >= 30:
        severity, priority = "🟡 Medium", "P3"
    else:
        severity, priority = "🟢 Low", "P4"

    return int(score), severity, priority, reasons, algo_contrib

def get_recommendations(row, severity):
    recs = []
    if row.get('last_login_days_ago', 0) > 90:
        return ["Disable account immediately", "Force password reset", "Audit last accessed files", "Notify IT Security"]
    if severity == "🔴 Critical":
        recs += ["Lock account immediately", "Notify manager and HR", "Disable USB port access", "Revoke active tokens & sessions", "Initiate forensic audit for 48 hours"]
    elif severity == "🟠 High":
        recs += ["Lock account", "Notify manager", "Disable USB access", "Force re-authentication", "Monitor for 24 hours"]
    elif severity == "🟡 Medium":
        recs += ["Require MFA step-up", "Force password reset", "Flag for supervisor audit", "Review accessed resources"]
    else:
        recs.append("No active recommendations — continue baseline monitoring")
    return recs

def get_timeline(row):
    uname = row['username']
    bd = BEHAVIOR_SEED.get(uname, {})
    hr = int(bd.get("login_time", 9))
    bl_t = bd.get("baseline_login_time", "09:00")
    events = []
    if uname == 'ravi':
        events = [("09:15","Baseline login expected (Office Laptop, Bengaluru)",False),("23:40","ACTUAL LOGIN — 23:40 from unregistered device",True),("23:45","Accessed Finance folder files (Privilege Misuse)",True),(f"23:50",f"Mass download: {bd.get('downloads',0)} files",True),(f"23:55",f"Uploaded {bd.get('genai_upload_mb',0)} MB to ChatGPT (IP Exfiltration)",True)]
    elif uname == 'rahul':
        events = [(bl_t,"Baseline login expected",False),("10:00","Login (Office Desktop, Bengaluru)",False),("10:15","Accessed Payroll Database — not in HR role scope",True),("10:30","Accessed Finance Folder — privilege misuse",True)]
    elif uname == 'dormant_alice':
        events = [("02:00",f"Dormant account login attempt ({bd.get('last_login_days_ago',0)} days inactive)",True),("02:05",f"Failed logins: {bd.get('failed_logins',0)} attempts",True),("02:10","Accessed Sales Folder (Dormant Account Misuse)",True)]
    elif uname == 'traveler_dan':
        events = [("09:00","Login from Bengaluru (Office Laptop)",False),("09:12","Login detected from London — new device, IP 85.90.12.3",True),("09:12","⚠ IMPOSSIBLE TRAVEL: 10h journey in 12 minutes",True)]
    elif uname == 'shared_sam':
        events = [("14:00","Login from Chrome/Windows — Mumbai IP 103.45.12.1",False),("14:02","Concurrent login from Safari/macOS — Delhi IP 122.160.8.4",True),("14:02","⚠ CREDENTIAL SHARING: simultaneous sessions from two locations",True)]
    elif uname == 'burnout_eve':
        events = [(bl_t,"Baseline login expected",False),("23:00","Late-night login (burnout risk pattern)",True),(f"23:05",f"Failed logins: {bd.get('failed_logins',0)} attempts",True),("23:15","Weekend data access pattern verified",True)]
    elif uname == 'shadow_it_ted':
        events = [(bl_t,"Baseline login expected",False),("11:00","Login (Linux Workstation, Hyderabad)",False),("11:15","Unauthorized software: AnyDesk — BLOCKED",True),("11:20","Unauthorized software: TeamViewer — BLOCKED",True),("11:30","Unknown VPN connection attempt — BLOCKED",True)]
    elif uname == 'ai_paste_pat':
        events = [(bl_t,"Baseline login expected",False),("10:00","Login (Developer MacBook, Bengaluru)",False),(f"10:15",f"Pasted source code to ChatGPT ({bd.get('genai_upload_mb',0)} MB)",True),("10:30","Sensitive IP exfiltrated via public AI tool",True)]
    elif uname == 'escalated_eric':
        events = [(bl_t,"Baseline login expected",False),("08:00","Login (Helpdesk Terminal, Bengaluru)",False),("08:15","⚠ PRIVILEGE ESCALATION: Employee → Admin role detected",True),("08:20","Accessed Active Directory & Domain Controller Logs",True)]
    else:
        events = [(f"{hr:02d}:00",f"Login from {bd.get('current_login_location','Office')}",False)]
        if bd.get('failed_logins',0):
            events.append((f"{hr:02d}:05",f"Failed logins: {bd.get('failed_logins',0)}",bd.get('failed_logins',0)>2))
        if bd.get('file_access_count',0) > 20:
            events.append((f"{hr:02d}:15",f"Accessed {bd.get('file_access_count',0)} files",bd.get('file_access_count',0)>50))
        if bd.get('downloads',0) > 5:
            events.append((f"{hr:02d}:20",f"Downloaded {bd.get('downloads',0)} files",bd.get('downloads',0)>20))
    return events

def load_all_evaluated():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT u.id, u.username, u.name, u.department, u.emp_type, b.*
        FROM users u
        JOIN behavior_data b ON b.user_id = u.id
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
        score, severity, priority, reasons, algos = calculate_risk(row.to_dict(), mf)
        recs = get_recommendations(row.to_dict(), severity)
        timeline = get_timeline(row.to_dict())
        exfil = min(99, max(5,
            (35 if row.get('usb_usage',0) else 0) +
            (25 if row.get('downloads',0) > 100 else 15 if row.get('downloads',0) > 20 else 0) +
            (20 if row.get('genai_upload_mb',0) > 20 else 0) +
            (15 if row.get('external_uploads',0) > 2 else 0) +
            (10 if row.get('email_attachments',0) > 3 else 0) +
            (15 if row.get('resignation_flag',0) else 0)))
        r = row.to_dict()
        r.update({"risk_score": score, "severity": severity, "priority": priority,
                   "reasons": reasons, "algo_contrib": algos, "recommendations": recs,
                   "timeline": timeline, "exfil_probability": exfil})
        scored.append(r)
    return pd.DataFrame(scored)

# ══════════════════════════════════════════════════════════════════════════════
#  HELPER RENDER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def sev_badge(sev):
    m = {"🔴 Critical":"bc","🟠 High":"bh","🟡 Medium":"bm","🟢 Low":"bl"}
    cls = m.get(sev,"bi")
    label = sev.split(" ",1)[-1] if " " in sev else sev
    return f"<span class='badge {cls}'>{label}</span>"

def risk_bar(score, label="Risk Score"):
    if score >= 80:   color, cls = "#ef4444", "c"
    elif score >= 60: color, cls = "#f97316", "h"
    elif score >= 30: color, cls = "#eab308", "m"
    else:             color, cls = "#22c55e", "s"
    return f"""
    <div class='rb-wrap'>
        <div class='rb-label'><span>{label}</span><span class='val {cls}' style='font-size:0.85rem;font-weight:700'>{score}/100</span></div>
        <div class='rb-track'><div class='rb-fill' style='width:{score}%;background:{color};box-shadow:0 0 8px {color}66;'></div></div>
    </div>"""

def metric_html(val, label, cls="", sub=""):
    sub_html = f"<div class='sub'>{sub}</div>" if sub else ""
    return f"<div class='zt-metric'><div class='val {cls}'>{val}</div><div class='lbl'>{label}</div>{sub_html}</div>"

def render_timeline(events):
    html = "<div class='tl-wrap'>"
    for ts, desc, flagged in events:
        fl = "fl" if flagged else ""
        fd = "fl-d" if flagged else ""
        html += f"<div class='tl-item {fl}'><div class='tl-t'>{ts}</div><div class='tl-d {fd}'>{desc}</div></div>"
    html += "</div>"
    st.markdown(html, unsafe_allow_html=True)

def policy_check_violations(df):
    violations = []
    for _, row in df.iterrows():
        if row.get('impossible_travel_flag'):
            violations.append({"Policy":"Impossible Travel","User":row['name'],"Action":"Lock Account + Alert SOC","Triggered":True})
        if row.get('privilege_escalation_flag'):
            violations.append({"Policy":"Privilege Escalation","User":row['name'],"Action":"Revoke Elevated Privileges + Alert","Triggered":True})
        if row.get('downloads',0) > 100:
            violations.append({"Policy":"Mass Download Detection","User":row['name'],"Action":"Temporarily Suspend Account","Triggered":True})
        if row.get('genai_upload_mb',0) > 20:
            violations.append({"Policy":"GenAI Data Exfiltration","User":row['name'],"Action":"Block AI Tool Access","Triggered":True})
        if row.get('last_login_days_ago',0) > 90:
            violations.append({"Policy":"Dormant Account Reactivation","User":row['name'],"Action":"Force Re-Authentication + Audit","Triggered":True})
        if row.get('credential_sharing_flag'):
            violations.append({"Policy":"Credential Sharing","User":row['name'],"Action":"Force Password Reset + Log","Triggered":True})
        if row.get('failed_logins',0) > 5:
            violations.append({"Policy":"Multiple Failed Logins","User":row['name'],"Action":"Temporary Account Lockout","Triggered":True})
    return violations

# ══════════════════════════════════════════════════════════════════════════════
#  AUTO-INCIDENT GENERATION
# ══════════════════════════════════════════════════════════════════════════════

def ensure_incidents(df):
    conn = get_conn()
    c = conn.cursor()
    for _, row in df.iterrows():
        if row.get('risk_score',0) < 30:
            continue
        c.execute("SELECT id FROM incidents WHERE user_id=?", (row.get('user_id', row.get('id','')),))
        if c.fetchone():
            continue
        iid = "INC-" + str(uuid.uuid4())[:8].upper()
        evidence = json.dumps(row.get('reasons',[]), ensure_ascii=False)
        policies = ", ".join([v["Policy"] for v in policy_check_violations(pd.DataFrame([row.to_dict()]))])
        recs = json.dumps(row.get('recommendations',[]), ensure_ascii=False)
        uid = row.get('user_id', row.get('id',''))
        c.execute("INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  (str(uuid.uuid4()), iid, uid, row['username'], row['name'], row['department'],
                   datetime.now().isoformat(), row['severity'], "Open",
                   f"Insider threat risk: {row['name']} flagged at {row['severity']} ({row['risk_score']}/100)",
                   evidence, policies, row['risk_score'], recs, None, None, ""))
    conn.commit()
    conn.close()

# ══════════════════════════════════════════════════════════════════════════════
#  INITIALIZATION
# ══════════════════════════════════════════════════════════════════════════════

init_db()
seed_db()

# ══════════════════════════════════════════════════════════════════════════════
#  SESSION STATE BOOTSTRAP
# ══════════════════════════════════════════════════════════════════════════════

for key, default in [("authenticated", False), ("user", None), ("page", "dashboard"), ("session_id", "")]:
    if key not in st.session_state:
        st.session_state[key] = default

# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════

def show_login():
    st.markdown("""
    <div class='login-hero'>
        <div class='logo-text'>🛡️ ZeroTrustNet</div>
        <div class='tagline'>Enterprise Zero Trust Security Platform</div>
    </div>
    """, unsafe_allow_html=True)

    col_l, col_c, col_r = st.columns([1, 1.1, 1])
    with col_c:
        st.markdown("<div class='zt-card info'>", unsafe_allow_html=True)
        st.markdown("<div style='text-align:center;margin-bottom:1.2rem;'><span style='color:#00f5ff;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;'>Secure Authentication</span></div>", unsafe_allow_html=True)

        tab_admin, tab_emp = st.tabs(["🔐 Admin / SOC", "👤 Employee Portal"])

        with tab_admin:
            st.markdown("<p style='color:#4a6275;font-size:0.8rem;margin-bottom:0.8rem;'>Security Operations & Admin access</p>", unsafe_allow_html=True)
            a_user = st.text_input("Username", key="a_user", placeholder="admin")
            a_pass = st.text_input("Password", type="password", key="a_pass", placeholder="••••••••")
            if st.button("🚀 Login as Admin", key="admin_btn", use_container_width=True):
                result = authenticate(a_user, a_pass)
                if result and result["role"] == "admin":
                    st.session_state.authenticated = True
                    st.session_state.user = result
                    sid = str(uuid.uuid4())
                    st.session_state.session_id = sid
                    conn = get_conn()
                    conn.execute("INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?)",
                                 (sid, result["id"], result["username"], datetime.now().isoformat(),
                                  None, "10.0.0.1", "Admin Console", 1, 0))
                    conn.commit(); conn.close()
                    log_audit(result, "Login", "Admin login to Security Operations Console", 0, 0)
                    st.rerun()
                else:
                    st.error("❌ Invalid credentials or insufficient privileges")

        with tab_emp:
            st.markdown("<p style='color:#4a6275;font-size:0.8rem;margin-bottom:0.8rem;'>Employee portal access — use your employee ID</p>", unsafe_allow_html=True)
            e_user = st.text_input("Employee Username", key="e_user", placeholder="e.g. ravi")
            e_pass = st.text_input("Password", type="password", key="e_pass", placeholder="••••••••")
            if st.button("🚀 Employee Login", key="emp_btn", use_container_width=True):
                result = authenticate(e_user, e_pass)
                if result and result["role"] == "employee":
                    st.session_state.authenticated = True
                    st.session_state.user = result
                    sid = str(uuid.uuid4())
                    st.session_state.session_id = sid
                    conn = get_conn()
                    conn.execute("INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?)",
                                 (sid, result["id"], result["username"], datetime.now().isoformat(),
                                  None, f"10.0.{hash(e_user)%5}.{hash(e_user)%200+1}", "Office Device", 1, 0))
                    conn.commit(); conn.close()
                    log_audit(result, "Login", f"Employee authenticated from office network", 0, 0)
                    st.rerun()
                elif result and result["role"] == "admin":
                    st.warning("⚠ This is the admin account. Use the Admin tab.")
                else:
                    st.error("❌ Invalid credentials")

        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("""
        <div style='margin-top:1.5rem;background:rgba(0,245,255,0.04);border:1px solid rgba(0,245,255,0.1);border-radius:8px;padding:0.8rem 1rem;'>
            <div style='font-size:0.72rem;color:#2d4060;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;'>Demo Credentials</div>
            <div style='font-size:0.8rem;color:#4a6275;font-family:"JetBrains Mono",monospace;line-height:1.9;'>
                Admin &nbsp;&nbsp;→ admin / admin123<br>
                Employee → ravi / emp123 &nbsp;(or any username below)<br>
                <span style='color:#2d4060;font-size:0.72rem;'>rahul • dormant_alice • traveler_dan • shared_sam<br>burnout_eve • shadow_it_ted • ai_paste_pat • escalated_eric</span>
            </div>
        </div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: EXECUTIVE DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

def page_executive_dashboard(df):
    st.markdown("<div class='zt-title'>Executive Dashboard</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Corporate Security Posture & Real-Time Threat Overview</div>", unsafe_allow_html=True)

    total = len(df)
    critical = len(df[df['severity']=="🔴 Critical"])
    high     = len(df[df['severity']=="🟠 High"])
    medium   = len(df[df['severity']=="🟡 Medium"])
    low      = len(df[df['severity']=="🟢 Low"])
    safe_pct = int(((total - critical - high) / total) * 100) if total else 0
    avg_risk = df['risk_score'].mean() if total else 0
    sec_score = int(100 - (avg_risk * 0.38))
    total_exposure = df['business_impact_rupees'].sum()
    if total_exposure >= 10_000_000:
        exp_str = f"₹{total_exposure/10_000_000:.2f}Cr"
    elif total_exposure >= 100_000:
        exp_str = f"₹{total_exposure/100_000:.1f}L"
    else:
        exp_str = f"₹{total_exposure:,.0f}"

    conn = get_conn()
    active_sessions = conn.execute("SELECT COUNT(*) FROM sessions WHERE is_active=1").fetchone()[0]
    open_incidents  = conn.execute("SELECT COUNT(*) FROM incidents WHERE status='Open'").fetchone()[0]
    conn.close()

    # ── Top Metrics ──────────────────────────────────────────────────────────
    c1,c2,c3,c4,c5,c6 = st.columns(6)
    with c1: st.markdown(metric_html(total,"Employees Monitored","p"), unsafe_allow_html=True)
    with c2: st.markdown(metric_html(active_sessions,"Active Sessions",""), unsafe_allow_html=True)
    with c3: st.markdown(metric_html(open_incidents,"Open Incidents","c" if open_incidents else "s"), unsafe_allow_html=True)
    with c4: st.markdown(metric_html(critical,"Critical Alerts","c" if critical else "s"), unsafe_allow_html=True)
    with c5: st.markdown(metric_html(f"{sec_score}%","Security Score","s" if sec_score>=70 else "h" if sec_score>=50 else "c"), unsafe_allow_html=True)
    with c6: st.markdown(metric_html(exp_str,"Financial Exposure","h" if total_exposure>500000 else "s"), unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    col_main, col_side = st.columns([1.65, 1])

    with col_main:
        # ── SOC Active Alerts Table ───────────────────────────────────────────
        st.markdown("<div class='zt-section'>🚨 SOC Active Alerts & Prioritization</div>", unsafe_allow_html=True)
        flagged = df[df['risk_score']>=30].sort_values("risk_score", ascending=False)
        if flagged.empty:
            st.success("✅ No active SOC alerts — all employees within baseline parameters")
        else:
            alert_rows = []
            for _, r in flagged.iterrows():
                desc = "Threat flagged"
                if r.get('privilege_escalation_flag'): desc = "Privilege Escalation"
                elif r.get('impossible_travel_flag'):   desc = "Impossible Travel"
                elif r.get('ai_risk_flag'):              desc = "GenAI Data Exfiltration"
                elif r.get('unusual_collaboration_flag'):desc = "Privilege Misuse"
                elif r.get('credential_sharing_flag'):   desc = "Credential Sharing"
                elif r.get('burnout_stress_score',0)>70: desc = "Critical Burnout Pattern"
                elif r.get('last_login_days_ago',0)>90:  desc = "Dormant Account Active"
                elif r.get('usb_usage'):                 desc = "USB Exfiltration Risk"
                alert_rows.append({"Priority":r['priority'],"Employee":r['name'],"Dept":r['department'],
                                    "Alert":desc,"Score":f"{r['risk_score']}/100","Severity":r['severity']})
            st.dataframe(pd.DataFrame(alert_rows), use_container_width=True, hide_index=True)

        # ── Security Posture Trend ─────────────────────────────────────────────
        st.markdown("<div class='zt-section'>📈 Weekly Security Posture Trend</div>", unsafe_allow_html=True)
        posture_df = pd.DataFrame({
            "Day": ["Mon","Tue","Wed","Thu","Fri (Today)"],
            "Security Score": [92, 88, 95, 84, sec_score]
        })
        st.line_chart(posture_df.set_index("Day")["Security Score"], use_container_width=True, height=180)

        # ── Risk Distribution ─────────────────────────────────────────────────
        st.markdown("<div class='zt-section'>📊 Severity Distribution</div>", unsafe_allow_html=True)
        sev_counts = {"Critical":critical,"High":high,"Medium":medium,"Low":low}
        sev_df = pd.DataFrame.from_dict(sev_counts, orient='index', columns=["Count"])
        st.bar_chart(sev_df, use_container_width=True, height=160)

    with col_side:
        st.markdown("<div class='zt-section'>⚡ Critical Incident Spotlight</div>", unsafe_allow_html=True)

        # Impossible Travel
        for _, r in df[df['impossible_travel_flag']==1].iterrows():
            st.markdown(f"""
            <div class='zt-card critical pulse-card'>
                <span class='badge bc'>Critical</span>&nbsp;<b>Impossible Travel</b><br/>
                <span style='color:#8aafc8;font-size:0.83rem;'>👤 {r['name']} · {r['department']}</span><br/>
                <span style='font-size:0.8rem;color:#c8d6e8;margin-top:4px;display:block;'>{r.get('impossible_travel_details','')}</span>
                <span style='font-size:0.75rem;color:#ef4444;font-weight:600;'>→ Account takeover risk · Lock account</span>
            </div>""", unsafe_allow_html=True)

        # Privilege Escalation
        for _, r in df[df['privilege_escalation_flag']==1].iterrows():
            st.markdown(f"""
            <div class='zt-card critical pulse-card'>
                <span class='badge bc'>Critical</span>&nbsp;<b>Privilege Escalation</b><br/>
                <span style='color:#8aafc8;font-size:0.83rem;'>👤 {r['name']} · {r['department']}</span><br/>
                <span style='font-size:0.8rem;color:#c8d6e8;margin-top:4px;display:block;'>{r.get('privilege_escalation_details','')}</span>
                <span style='font-size:0.75rem;color:#ef4444;font-weight:600;'>→ Exposure: ₹{r.get('business_impact_rupees',0):,}</span>
            </div>""", unsafe_allow_html=True)

        # Dormant Accounts
        for _, r in df[df['last_login_days_ago']>90].iterrows():
            st.markdown(f"""
            <div class='zt-card medium'>
                <span class='badge bm'>Medium</span>&nbsp;<b>Dormant Account Active</b><br/>
                <span style='color:#8aafc8;font-size:0.83rem;'>👤 {r['name']} · {r['department']}</span><br/>
                <span style='font-size:0.8rem;color:#c8d6e8;'>Last login: {r.get('last_login_days_ago',0)} days ago</span><br/>
                <span style='font-size:0.75rem;color:#eab308;font-weight:600;'>→ Disable account</span>
            </div>""", unsafe_allow_html=True)

        # AI Leak
        for _, r in df[df['ai_risk_flag']==1].iterrows():
            st.markdown(f"""
            <div class='zt-card high'>
                <span class='badge bh'>High</span>&nbsp;<b>GenAI Data Leak</b><br/>
                <span style='color:#8aafc8;font-size:0.83rem;'>👤 {r['name']} · {r['department']}</span><br/>
                <span style='font-size:0.8rem;color:#c8d6e8;'>{r.get('ai_risk_details','')}</span><br/>
                <span style='font-size:0.75rem;color:#f97316;font-weight:600;'>→ Block AI tool access</span>
            </div>""", unsafe_allow_html=True)

        # Dept Risk Summary
        st.markdown("<div class='zt-section'>🏢 Department Risk Summary</div>", unsafe_allow_html=True)
        dept_avg = df.groupby('department')['risk_score'].mean().round(0).sort_values(ascending=False)
        for dept, avg in dept_avg.items():
            cls = "c" if avg>=80 else "h" if avg>=60 else "m" if avg>=30 else "s"
            st.markdown(f"""
            <div style='display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.05);'>
                <span style='font-size:0.82rem;color:#8aafc8;'>{dept}</span>
                <span class='val {cls}' style='font-size:0.88rem;font-weight:700;'>{int(avg)}</span>
            </div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: THREAT DETECTION & UEBA
# ══════════════════════════════════════════════════════════════════════════════

def page_threat_detection(df):
    st.markdown("<div class='zt-title'>Threat Detection & UEBA</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>User Behaviour Analytics · Digital Twin Baseline · Multi-Algorithm ML</div>", unsafe_allow_html=True)

    s1,s2,s3,s4 = st.columns(4)
    with s1: st.markdown(metric_html(len(df),"Users Analysed"), unsafe_allow_html=True)
    with s2: st.markdown(metric_html(len(df[df['severity']=="🔴 Critical"]),"Critical","c"), unsafe_allow_html=True)
    with s3: st.markdown(metric_html(len(df[df['severity']=="🟠 High"]),"High","h"), unsafe_allow_html=True)
    with s4: st.markdown(metric_html(len(df[df['severity']=="🟡 Medium"]),"Medium","m"), unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    # ── Full User Table ───────────────────────────────────────────────────────
    st.markdown("<div class='zt-section'>📂 Employee Behaviour Database</div>", unsafe_allow_html=True)
    view = df[["username","name","department","login_time","file_access_count","downloads",
               "sensitive_files","genai_upload_mb","risk_score","severity","priority"]].copy()
    view.columns = ["Username","Name","Dept","Login Hour","File Access","Downloads",
                    "Sensitive Files","AI Upload (MB)","Risk Score","Severity","SOC Priority"]
    st.dataframe(view, use_container_width=True, hide_index=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    # ── Employee Drilldown ────────────────────────────────────────────────────
    st.markdown("<div class='zt-section'>🔍 Employee Digital Twin Drilldown</div>", unsafe_allow_html=True)
    names = df['name'].tolist()
    selected = st.selectbox("Select Employee", names, key="ueba_sel")
    row = df[df['name']==selected].iloc[0]
    bd = BEHAVIOR_SEED.get(row['username'], {})

    d1, d2 = st.columns(2)

    with d1:
        st.markdown("<div class='zt-section'>👥 Behavioral Baseline vs. Actual</div>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class='zt-card info'>
            <b style='color:#00f5ff;'>{row['name']}</b> &nbsp;·&nbsp; <span style='color:#4a6275;'>{row['department']}</span>
            &nbsp;·&nbsp; {sev_badge(row['severity'])}
            <table style='width:100%;margin-top:1rem;border-collapse:collapse;font-size:0.85rem;'>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.08);'>
                    <th style='text-align:left;padding:6px 0;color:#4a6275;'>Metric</th>
                    <th style='text-align:center;padding:6px 0;color:#4a6275;'>Baseline</th>
                    <th style='text-align:center;padding:6px 0;color:#00f5ff;'>Today</th>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Login Time</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_login_time','09:00')}</td>
                    <td style='text-align:center;color:{"#ef4444" if (int(row["login_time"])<7 or int(row["login_time"])>20) else "#22c55e"};'>{int(row["login_time"]):02d}:00</td>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Device</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_device','Office Laptop')}</td>
                    <td style='text-align:center;color:{"#ef4444" if row["device_known"]==0 else "#22c55e"};'>{"✓ Registered" if row["device_known"]==1 else "✗ Unknown Device"}</td>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Location</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_location','Office')}</td>
                    <td style='text-align:center;color:{"#ef4444" if row["impossible_travel_flag"]==1 else "#22c55e"};'>{row["current_login_location"]}</td>
                </tr>
                <tr>
                    <td style='padding:7px 0;'>File Access</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_file_access',15)}/day</td>
                    <td style='text-align:center;color:{"#ef4444" if row["file_access_count"]>bd.get("baseline_file_access",15)*2.5 else "#22c55e"};'>{row["file_access_count"]}/day</td>
                </tr>
            </table>
        </div>""", unsafe_allow_html=True)

        st.markdown(risk_bar(row['risk_score']), unsafe_allow_html=True)

        # ML Algorithm Details
        st.markdown("<div class='zt-section'>🤖 Multi-Algorithm Analysis</div>", unsafe_allow_html=True)
        algos = row.get('algo_contrib', {})
        for algo, result in algos.items():
            is_anom = "ANOMALY" in str(result).upper() or "NOISE" in str(result).upper()
            color = "#ef4444" if is_anom else "#22c55e"
            icon = "⚠" if is_anom else "✓"
            st.markdown(f"""
            <div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.05);font-size:0.82rem;'>
                <span style='color:#8aafc8;'>{algo}</span>
                <span style='color:{color};font-weight:600;'>{icon} {result}</span>
            </div>""", unsafe_allow_html=True)

        # Folder access misuse
        st.markdown("<div class='zt-section'>📂 Folder Privilege Monitor</div>", unsafe_allow_html=True)
        accessed = [f.strip() for f in str(row.get('accessed_folders','')).split(",") if f.strip()]
        expected = [f.strip() for f in str(row.get('expected_folders','')).split(",") if f.strip() and f.strip()!="None (Dormant)"]
        with st.container():
            for folder in accessed:
                ok = folder in expected
                color = "#22c55e" if ok else "#ef4444"
                icon = "✔" if ok else "✖"
                label = "Expected" if ok else "UNEXPECTED — Privilege Misuse"
                st.markdown(f"<span style='color:{color};font-size:0.85rem;'>{icon} {folder}</span> <span style='color:#3d5470;font-size:0.75rem;'>({label})</span>", unsafe_allow_html=True)
            if expected:
                st.markdown(f"<span style='color:#3d5470;font-size:0.75rem;'>Permitted scope: {', '.join(expected)}</span>", unsafe_allow_html=True)

    with d2:
        st.markdown("<div class='zt-section'>🕒 Session Timeline</div>", unsafe_allow_html=True)
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        render_timeline(row.get('timeline',[]))
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("<div class='zt-section'>🧠 Explainable AI — Risk Evidence</div>", unsafe_allow_html=True)
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        reasons = row.get('reasons', [])
        for r_item in reasons:
            st.markdown(f"<div style='padding:4px 0;font-size:0.84rem;color:#c8d6e8;'>◦ {r_item}</div>", unsafe_allow_html=True)
        if row.get('mitre_techniques','None') != 'None':
            st.markdown(f"""
            <div style='margin-top:0.8rem;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px 12px;'>
                <div style='font-size:0.72rem;color:#3d5470;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;'>MITRE ATT&CK Mapping</div>
                <div style='font-size:0.83rem;color:#c8d6e8;'><b>Technique:</b> {row.get('mitre_techniques','')}</div>
                <div style='font-size:0.83rem;color:#c8d6e8;'><b>Confidence:</b> {row.get('mitre_confidence',0)}%</div>
            </div>""", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("<div class='zt-section'>🛡️ Recommended Actions</div>", unsafe_allow_html=True)
        recs = row.get('recommendations',[])
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        for rec in recs:
            st.markdown(f"<div style='font-size:0.84rem;color:#c8d6e8;padding:4px 0;'>▸ {rec}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: INCIDENT RESPONSE CENTER
# ══════════════════════════════════════════════════════════════════════════════

def page_incidents(df):
    st.markdown("<div class='zt-title'>Incident Response Center</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Active Incidents · Evidence · Recommendations · Status Tracking</div>", unsafe_allow_html=True)

    ensure_incidents(df)

    conn = get_conn()
    inc_rows = conn.execute("SELECT * FROM incidents ORDER BY risk_score DESC").fetchall()
    inc_cols = [d[0] for d in conn.execute("SELECT * FROM incidents LIMIT 0").description]
    conn.close()

    if not inc_rows:
        st.info("No incidents currently. All users within acceptable risk thresholds.")
        return

    incidents_df = pd.DataFrame(inc_rows, columns=inc_cols)

    # Summary
    c1,c2,c3,c4 = st.columns(4)
    with c1: st.markdown(metric_html(len(incidents_df),"Total Incidents"), unsafe_allow_html=True)
    with c2: st.markdown(metric_html(len(incidents_df[incidents_df['status']=='Open']),"Open","c"), unsafe_allow_html=True)
    with c3: st.markdown(metric_html(len(incidents_df[incidents_df['status']=='Investigating']),"Investigating","h"), unsafe_allow_html=True)
    with c4: st.markdown(metric_html(len(incidents_df[incidents_df['status']=='Resolved']),"Resolved","s"), unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    # Status filter
    filt = st.selectbox("Filter by Status", ["All","Open","Investigating","Resolved"], key="inc_filt")
    show_df = incidents_df if filt=="All" else incidents_df[incidents_df['status']==filt]

    for _, inc in show_df.iterrows():
        sev = inc['severity']
        cls = "critical" if "Critical" in sev else "high" if "High" in sev else "medium" if "Medium" in sev else "low"
        status_color = {"Open":"#ef4444","Investigating":"#f97316","Resolved":"#22c55e"}.get(inc['status'],"#4a6275")

        with st.expander(f"🔴 {inc['incident_id']} — {inc['user_name']} ({inc['department']}) · {sev} · {inc['status']}", expanded=(inc['status']=="Open" and cls=="critical")):
            col_a, col_b = st.columns([1.4,1])

            with col_a:
                created = inc['created_at'][:16].replace("T"," ") if inc.get('created_at') else "—"
                st.markdown(f"""
                <div class='zt-card {cls}'>
                    <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;'>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Incident ID</span><br/><span style='font-family:"JetBrains Mono",monospace;color:#00f5ff;font-size:0.9rem;font-weight:700;'>{inc['incident_id']}</span></div>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Risk Score</span><br/><span style='font-size:0.9rem;font-weight:700;color:{"#ef4444" if inc["risk_score"]>=80 else "#f97316" if inc["risk_score"]>=60 else "#eab308"};'>{inc['risk_score']}/100</span></div>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Employee</span><br/><span style='color:#c8d6e8;font-size:0.88rem;'>{inc['user_name']}</span></div>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Department</span><br/><span style='color:#c8d6e8;font-size:0.88rem;'>{inc['department']}</span></div>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Created</span><br/><span style='color:#c8d6e8;font-size:0.85rem;'>{created}</span></div>
                        <div><span style='color:#3d5470;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px;'>Status</span><br/><span style='color:{status_color};font-weight:700;font-size:0.88rem;'>{inc['status']}</span></div>
                    </div>
                    <div style='margin-bottom:8px;'><b style='color:#8aafc8;'>Summary:</b><br/><span style='font-size:0.84rem;'>{inc['summary']}</span></div>
                    <div><b style='color:#8aafc8;'>Policies Triggered:</b><br/><span style='font-size:0.82rem;color:#4a6275;'>{inc.get('policies_triggered') or 'None triggered'}</span></div>
                </div>""", unsafe_allow_html=True)

                # Evidence
                try:
                    ev_list = json.loads(inc.get('evidence','[]'))
                    st.markdown("<b style='color:#8aafc8;font-size:0.85rem;'>Evidence:</b>", unsafe_allow_html=True)
                    for ev in ev_list[:5]:
                        st.markdown(f"<div style='font-size:0.8rem;color:#c8d6e8;padding:2px 0;'>◦ {ev}</div>", unsafe_allow_html=True)
                except Exception:
                    pass

            with col_b:
                # Recommendations
                try:
                    rec_list = json.loads(inc.get('recommendations','[]'))
                    st.markdown("<b style='color:#8aafc8;font-size:0.85rem;'>Recommended Actions:</b>", unsafe_allow_html=True)
                    for rec in rec_list:
                        st.markdown(f"<div style='font-size:0.82rem;color:#c8d6e8;padding:3px 0;'>▸ {rec}</div>", unsafe_allow_html=True)
                except Exception:
                    pass

                # Status management
                st.markdown("<b style='color:#8aafc8;font-size:0.85rem;'>Update Status:</b>", unsafe_allow_html=True)
                new_status = st.selectbox("", ["Open","Investigating","Resolved"],
                                          index=["Open","Investigating","Resolved"].index(inc['status']),
                                          key=f"inc_s_{inc['id']}")
                notes = st.text_input("Analyst Notes", value=inc.get('notes',''), key=f"inc_n_{inc['id']}")
                if st.button("💾 Update Incident", key=f"inc_upd_{inc['id']}"):
                    resolved_at = datetime.now().isoformat() if new_status == "Resolved" else None
                    conn2 = get_conn()
                    conn2.execute("UPDATE incidents SET status=?,notes=?,resolved_at=?,resolved_by=? WHERE id=?",
                                  (new_status, notes, resolved_at, st.session_state.user['username'], inc['id']))
                    conn2.commit(); conn2.close()
                    log_audit(st.session_state.user, "Incident Updated",
                              f"Incident {inc['incident_id']} updated to {new_status}", 0, 0)
                    st.success(f"✅ Incident {inc['incident_id']} updated to {new_status}")
                    st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: ZERO TRUST POLICY ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def page_policy_engine(df):
    st.markdown("<div class='zt-title'>Zero Trust Policy Engine</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Configurable IF / AND / THEN Security Policies · Real-Time Evaluation</div>", unsafe_allow_html=True)

    violations = policy_check_violations(df)

    conn = get_conn()
    policies = conn.execute("SELECT * FROM policies ORDER BY created_at DESC").fetchall()
    pol_cols = [d[0] for d in conn.execute("SELECT * FROM policies LIMIT 0").description]
    conn.close()

    # ── Live Policy Violations ─────────────────────────────────────────────
    st.markdown("<div class='zt-section'>🚨 Active Policy Violations (Real-Time)</div>", unsafe_allow_html=True)
    if not violations:
        st.success("✅ No active policy violations at this time")
    else:
        vdf = pd.DataFrame(violations)
        st.dataframe(vdf, use_container_width=True, hide_index=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    col_pol, col_new = st.columns([1.6, 1])

    with col_pol:
        st.markdown("<div class='zt-section'>📋 Configured Policies</div>", unsafe_allow_html=True)
        for pol in policies:
            pol_d = dict(zip(pol_cols, pol))
            status_icon = "🟢" if pol_d['is_active'] else "⭕"
            try:
                cond = json.loads(pol_d.get('conditions','{}'))
            except Exception:
                cond = {}
            with st.expander(f"{status_icon} {pol_d['name']}", expanded=False):
                st.markdown(f"""
                <div class='zt-card info'>
                    <div style='font-size:0.82rem;color:#4a6275;margin-bottom:8px;'>{pol_d.get('description','')}</div>
                    <div style='font-size:0.8rem;'><b style='color:#8aafc8;'>IF Conditions:</b><br/>
                    <code style='background:rgba(0,245,255,0.06);padding:4px 8px;border-radius:4px;font-size:0.78rem;color:#00f5ff;'>{json.dumps(cond, indent=2)}</code></div>
                    <div style='margin-top:8px;font-size:0.82rem;'><b style='color:#8aafc8;'>THEN Action:</b>&nbsp;<span style='color:#f97316;font-weight:600;'>{pol_d.get('action','')}</span></div>
                    <div style='margin-top:6px;font-size:0.75rem;color:#2d4060;'>Created by {pol_d.get('created_by','admin')} · {str(pol_d.get('created_at',''))[:10]}</div>
                </div>""", unsafe_allow_html=True)
                toggle_col, del_col = st.columns(2)
                with toggle_col:
                    new_status = 0 if pol_d['is_active'] else 1
                    btn_label = "⭕ Disable Policy" if pol_d['is_active'] else "🟢 Enable Policy"
                    if st.button(btn_label, key=f"pol_tog_{pol_d['id']}"):
                        c2 = get_conn(); c2.execute("UPDATE policies SET is_active=? WHERE id=?",(new_status,pol_d['id'])); c2.commit(); c2.close()
                        log_audit(st.session_state.user,"Policy Changed",f"Policy '{pol_d['name']}' {'disabled' if pol_d['is_active'] else 'enabled'}",0,0)
                        st.rerun()

    with col_new:
        st.markdown("<div class='zt-section'>➕ Add New Policy</div>", unsafe_allow_html=True)
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        pol_name = st.text_input("Policy Name", key="new_pol_name", placeholder="e.g. Late-Night Sensitive Access")
        pol_desc = st.text_input("Description", key="new_pol_desc", placeholder="Describe what this policy detects")
        pol_action = st.selectbox("Action", ["Require Step-Up Authentication","Temporarily Restrict Access",
                                              "Lock Account + Alert SOC","Force Password Reset",
                                              "Block AI Tool Access","Temporary Account Lockout",
                                              "Revoke Elevated Privileges + Alert"], key="new_pol_act")
        st.markdown("<b style='color:#8aafc8;font-size:0.82rem;'>Conditions (JSON):</b>", unsafe_allow_html=True)
        st.markdown("<span style='color:#4a6275;font-size:0.72rem;'>Available keys: device_known, off_hours, failed_logins_gt, downloads_gt, impossible_travel_flag, privilege_escalation_flag, genai_upload_mb_gt, last_login_days_ago_gt</span>", unsafe_allow_html=True)
        pol_cond = st.text_area("", value='{"off_hours": true, "device_known": 0}', key="new_pol_cond", height=80)
        if st.button("✅ Save Policy", key="new_pol_btn"):
            try:
                json.loads(pol_cond)
                pid = str(uuid.uuid4())
                conn3 = get_conn()
                conn3.execute("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)",
                              (pid, pol_name, pol_cond, pol_action, 1, st.session_state.user['username'], datetime.now().isoformat(), pol_desc))
                conn3.commit(); conn3.close()
                log_audit(st.session_state.user,"Policy Created",f"New policy: {pol_name}",0,0)
                st.success(f"✅ Policy '{pol_name}' created successfully")
                st.rerun()
            except json.JSONDecodeError:
                st.error("❌ Invalid JSON in conditions")
        st.markdown("</div>", unsafe_allow_html=True)

        # Policy Logic Explainer
        st.markdown("<div class='zt-section'>📖 Policy Logic Reference</div>", unsafe_allow_html=True)
        st.markdown("""
        <div class='zt-card' style='font-size:0.8rem;line-height:2;color:#4a6275;'>
            <b style='color:#00f5ff;'>Example Zero Trust Rule:</b><br/>
            <span style='color:#c8d6e8;'>IF</span> Unknown Device<br/>
            <span style='color:#c8d6e8;'>AND</span> Sensitive Resource Access<br/>
            <span style='color:#c8d6e8;'>AND</span> Outside Office Hours<br/>
            <span style='color:#f97316;font-weight:700;'>THEN</span> Require Step-Up Auth<br/><br/>
            Policies evaluate in real-time.<br/>
            Violations trigger incidents automatically.
        </div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: AI SECURITY COPILOT
# ══════════════════════════════════════════════════════════════════════════════

def page_ai_copilot(df):
    st.markdown("<div class='zt-title'>AI Security Copilot</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Multi-Algorithm Analysis · Explainable Insights · SOC Automation</div>", unsafe_allow_html=True)

    selected = st.selectbox("Select Employee to Analyse", df['name'].tolist(), key="cop_sel")
    row = df[df['name']==selected].iloc[0]

    st.markdown("<hr/>", unsafe_allow_html=True)

    col_l, col_r = st.columns([1.6,1])

    with col_l:
        s_col = "#ef4444" if row['risk_score']>=80 else "#f97316" if row['risk_score']>=60 else "#eab308" if row['risk_score']>=30 else "#22c55e"
        st.markdown(f"""
        <div class='zt-card info'>
            <div style='font-size:0.75rem;color:#3d5470;text-transform:uppercase;letter-spacing:2px;margin-bottom:0.8rem;'>🤖 Copilot Real-Time Assessment</div>
            <div style='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:1rem;'>
                <div class='zt-metric'><div class='val' style='color:{s_col};font-size:1.6rem;'>{row['risk_score']}</div><div class='lbl'>Risk Score</div></div>
                <div class='zt-metric'><div class='val' style='font-size:1rem;color:{s_col};'>{row['severity'].split(" ",1)[-1]}</div><div class='lbl'>Severity</div></div>
                <div class='zt-metric'><div class='val' style='font-size:1.3rem;'>{row['exfil_probability']}%</div><div class='lbl'>Exfil Risk</div></div>
                <div class='zt-metric'><div class='val' style='font-size:1.1rem;'>₹{row.get("business_impact_rupees",0)//100000}L</div><div class='lbl'>Exposure</div></div>
            </div>
            <div style='font-size:0.84rem;color:#8aafc8;font-weight:600;margin-bottom:6px;'>Evidence Detected:</div>
        """, unsafe_allow_html=True)
        for reason in row.get('reasons',[]):
            st.markdown(f"<li style='font-size:0.82rem;color:#c8d6e8;padding:2px 0;'>{reason}</li>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # Multi-algorithm breakdown
        st.markdown("<div class='zt-section'>🧠 Algorithm Contribution Breakdown</div>", unsafe_allow_html=True)
        algos = row.get('algo_contrib',{})
        algo_names = {
            "Isolation Forest":"Detects anomalies by isolating observations via random splits. Efficient for high-dimensional data.",
            "Local Outlier Factor":"Compares local density of each point against its neighbors. Finds local outliers.",
            "One-Class SVM":"Learns a boundary around normal behaviour. Flags anything outside as anomalous.",
            "DBSCAN":"Density-based clustering. Noise points (not in any cluster) are potential threats."
        }
        for algo, result in algos.items():
            is_anom = "ANOMALY" in str(result).upper() or "NOISE" in str(result).upper()
            color = "#ef4444" if is_anom else "#22c55e"
            badge_cls = "bc" if is_anom else "bl"
            badge_txt = "ANOMALY" if is_anom else "NORMAL"
            st.markdown(f"""
            <div class='zt-card' style='padding:0.9rem 1rem;margin-bottom:0.5rem;'>
                <div style='display:flex;justify-content:space-between;align-items:flex-start;'>
                    <div>
                        <div style='font-weight:700;font-size:0.88rem;color:#c8d6e8;'>{algo}</div>
                        <div style='font-size:0.75rem;color:#3d5470;margin-top:2px;'>{algo_names.get(algo,"")}</div>
                    </div>
                    <span class='badge {badge_cls}' style='margin-left:10px;white-space:nowrap;'>{badge_txt}</span>
                </div>
                <div style='font-size:0.78rem;color:{color};margin-top:5px;'>→ {result}</div>
            </div>""", unsafe_allow_html=True)

        # Q&A Copilot
        st.markdown("<div class='zt-section'>💬 Ask the Copilot</div>", unsafe_allow_html=True)
        query = st.text_input("Question (e.g. 'What is the business impact?' 'Explain the MITRE mapping' 'What actions should I take?')", key="cop_q")
        if query:
            q = query.lower()
            if any(w in q for w in ["impact","financial","rupee","money","loss","exposure"]):
                ans = f"The estimated financial exposure for {row['name']} is ₹{row.get('business_impact_rupees',0):,}. This is calculated based on access to high-value data in '{row.get('accessed_folders','')}', classified as critical IP for the {row['department']} department."
            elif any(w in q for w in ["mitre","technique","attack","tactic"]):
                if row.get('mitre_techniques','None') != 'None':
                    ans = f"{row['name']}'s activity maps to MITRE ATT&CK: {row.get('mitre_techniques','')} with {row.get('mitre_confidence',0)}% confidence. The tactics involve {row.get('severity','')} severity exfiltration and privilege misuse techniques."
                else:
                    ans = f"No MITRE ATT&CK techniques are currently mapped to {row['name']}. Their risk is driven by behavioural baseline deviations rather than known attack signatures."
            elif any(w in q for w in ["action","recommend","do","next","step","response"]):
                ans = f"Immediate actions for {row['name']} (Risk: {row['risk_score']}/100): " + "; ".join(row.get('recommendations',[])) + f". Notify supervisor in {row['department']} department."
            elif any(w in q for w in ["algorithm","model","ml","machine learning","how"]):
                anomalies = [k for k,v in row.get('algo_contrib',{}).items() if "ANOMALY" in str(v).upper() or "NOISE" in str(v).upper()]
                ans = f"ZeroTrustNet runs 4 ML algorithms on {row['name']}'s behaviour. " + (f"The following flagged anomalies: {', '.join(anomalies)}." if anomalies else "All algorithms classified behaviour as normal.") + f" Additionally, the Rule-Based engine identified {len(row.get('reasons',[]))} risk factors."
            elif any(w in q for w in ["timeline","event","when","session","log"]):
                events = row.get('timeline',[])
                flagged = [(ts,d) for ts,d,f in events if f]
                ans = f"Session timeline for {row['name']} has {len(events)} recorded events, of which {len(flagged)} are flagged: " + "; ".join([f"[{ts}] {d}" for ts,d in flagged[:3]])
            else:
                reasons_str = "; ".join(row.get('reasons',[])[:3])
                ans = f"ZeroTrustNet analysis of {row['name']}: {row['severity']} risk at {row['risk_score']}/100. Primary drivers: {reasons_str}. Data exfiltration probability: {row.get('exfil_probability',5)}%."

            st.markdown(f"""
            <div style='background:rgba(0,245,255,0.05);border:1px solid rgba(0,245,255,0.2);border-radius:10px;padding:14px 16px;margin-top:8px;'>
                <span style='font-size:0.72rem;color:#3d5470;letter-spacing:1.5px;text-transform:uppercase;'>🤖 Copilot Response</span><br/>
                <span style='font-size:0.87rem;color:#c8d6e8;line-height:1.6;'>{ans}</span>
            </div>""", unsafe_allow_html=True)

    with col_r:
        st.markdown("<div class='zt-section'>🛡️ Response Runbook</div>", unsafe_allow_html=True)
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        for i, rec in enumerate(row.get('recommendations',[])):
            st.markdown(f"<div style='padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.06);font-size:0.83rem;color:#c8d6e8;'><span style='color:#00f5ff;font-weight:700;'>{i+1}.</span> {rec}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        if row.get('mitre_techniques','None') != 'None':
            st.markdown("<div class='zt-section'>⚔️ MITRE ATT&CK Details</div>", unsafe_allow_html=True)
            st.markdown(f"""
            <div class='zt-card critical' style='padding:1rem;'>
                <div style='font-size:0.72rem;color:#3d5470;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;'>ATT&CK Framework Mapping</div>
                <div style='font-size:0.85rem;color:#c8d6e8;margin-bottom:5px;'><b>Technique:</b><br/><span style='color:#ef4444;'>{row.get('mitre_techniques','')}</span></div>
                <div style='font-size:0.85rem;color:#c8d6e8;margin-bottom:5px;'><b>Tactic:</b> Exfiltration / Privilege Escalation</div>
                <div style='font-size:0.85rem;color:#c8d6e8;'><b>Engine Confidence:</b> <span style='color:#f97316;font-weight:700;'>{row.get('mitre_confidence',0)}%</span></div>
            </div>""", unsafe_allow_html=True)

        # Session Timeline in sidebar
        st.markdown("<div class='zt-section'>🕒 Session Replay</div>", unsafe_allow_html=True)
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        render_timeline(row.get('timeline',[]))
        st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: ATTACK SIMULATION
# ══════════════════════════════════════════════════════════════════════════════

def page_attack_sim(df):
    st.markdown("<div class='zt-title'>Attack Simulation</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Inject Attack Vectors · Test Risk Engine · Validate Policy Response</div>", unsafe_allow_html=True)

    st.markdown("""
    <div class='zt-card info' style='padding:0.9rem 1.1rem;margin-bottom:1rem;'>
        <b style='color:#00f5ff;'>How it works:</b>&nbsp;
        <span style='color:#8aafc8;font-size:0.86rem;'>Select an employee and inject a realistic attack vector. The multi-algorithm risk engine immediately recalculates scores, updates explainability evidence, and triggers policy alerts.</span>
    </div>""", unsafe_allow_html=True)

    target = st.selectbox("🎯 Select Target Employee", df['name'].tolist(), key="atk_sel")

    conn = get_conn()
    target_row = df[df['name']==target].iloc[0]
    uid = str(target_row.get('user_id', target_row.get('id','')))

    col_atk, col_status = st.columns([1, 1])

    with col_atk:
        st.markdown("<div class='zt-section'>⚡ Attack Vectors</div>", unsafe_allow_html=True)

        if st.button("🔌 USB Exfiltration Attack", use_container_width=True, key="atk_usb"):
            conn.execute("UPDATE behavior_data SET usb_usage=1, downloads=280, sensitive_files=14, resignation_flag=1, business_impact_rupees=1100000, mitre_techniques=?, mitre_confidence=98 WHERE user_id=?",
                         ("T1005 (Data from Local System), T1052.001 (Exfiltration over USB)", uid))
            conn.commit()
            log_audit(st.session_state.user,"Attack Simulated",f"USB Exfiltration injected on {target}",0,0)
            st.success(f"🔥 USB Exfiltration injected on {target}")
            time.sleep(0.4); st.rerun()

        if st.button("🎣 Phishing & Credential Theft", use_container_width=True, key="atk_phish"):
            conn.execute("UPDATE behavior_data SET device_known=0, failed_logins=6, login_time=3, current_login_location='North Korea', mitre_techniques=?, mitre_confidence=92 WHERE user_id=?",
                         ("T1078 (Valid Accounts), T1110 (Brute Force)", uid))
            conn.commit()
            log_audit(st.session_state.user,"Attack Simulated",f"Phishing/Credential Theft injected on {target}",0,0)
            st.success(f"🔥 Phishing & Credential Theft injected on {target}")
            time.sleep(0.4); st.rerun()

        if st.button("🔑 Privilege Escalation", use_container_width=True, key="atk_priv"):
            conn.execute("UPDATE behavior_data SET privilege_escalation_flag=1, privilege_escalation_details='Role Yesterday: Employee, Role Today: Admin', business_impact_rupees=2400000, mitre_techniques=?, mitre_confidence=95 WHERE user_id=?",
                         ("T1078 (Valid Accounts), T1098 (Account Manipulation)", uid))
            conn.commit()
            log_audit(st.session_state.user,"Attack Simulated",f"Privilege Escalation injected on {target}",0,0)
            st.success(f"🔥 Privilege Escalation injected on {target}")
            time.sleep(0.4); st.rerun()

        if st.button("🌐 Shadow IT & GenAI Leak", use_container_width=True, key="atk_shadow"):
            conn.execute("UPDATE behavior_data SET genai_upload_mb=112.5, shadow_it_flag=1, shadow_it_details='AnyDesk (Blocked), Unknown VPN (Blocked)', ai_risk_flag=1, ai_risk_details='Sensitive source code pasted to ChatGPT & Gemini', business_impact_rupees=1600000, mitre_techniques=?, mitre_confidence=94 WHERE user_id=?",
                         ("T1567.002 (Exfiltration to Cloud Services)", uid))
            conn.commit()
            log_audit(st.session_state.user,"Attack Simulated",f"Shadow IT + GenAI leak injected on {target}",0,0)
            st.success(f"🔥 Shadow IT & GenAI Leak injected on {target}")
            time.sleep(0.4); st.rerun()

        if st.button("🌍 Impossible Travel Attack", use_container_width=True, key="atk_travel"):
            conn.execute("UPDATE behavior_data SET impossible_travel_flag=1, impossible_travel_details='Office (09:00) → Foreign Country (09:08). Travel time required: 14 hours.', device_known=0, current_login_location='Russia', mitre_techniques=?, mitre_confidence=97 WHERE user_id=?",
                         ("T1133 (External Remote Services)", uid))
            conn.commit()
            log_audit(st.session_state.user,"Attack Simulated",f"Impossible Travel injected on {target}",0,0)
            st.success(f"🔥 Impossible Travel injected on {target}")
            time.sleep(0.4); st.rerun()

        st.markdown("<hr/>", unsafe_allow_html=True)
        if st.button("🔄 Reset to Baseline", use_container_width=True, key="atk_reset"):
            uname = target_row['username']
            bd = BEHAVIOR_SEED.get(uname)
            if bd:
                conn.execute("""UPDATE behavior_data SET
                    login_time=?,file_access_count=?,failed_logins=?,device_known=?,downloads=?,sensitive_files=?,
                    resignation_flag=?,genai_upload_mb=?,external_uploads=?,usb_usage=?,email_attachments=?,
                    printing_events=?,impossible_travel_flag=?,impossible_travel_details=?,
                    credential_sharing_flag=?,credential_sharing_details=?,shadow_it_flag=?,shadow_it_details=?,
                    ai_risk_flag=?,ai_risk_details=?,unusual_collaboration_flag=?,unusual_collaboration_details=?,
                    privilege_escalation_flag=?,privilege_escalation_details=?,mitre_techniques=?,mitre_confidence=?,
                    business_impact_rupees=?,current_login_location=? WHERE user_id=?""",
                    (bd["login_time"],bd["file_access_count"],bd["failed_logins"],bd["device_known"],
                     bd["downloads"],bd["sensitive_files"],bd["resignation_flag"],bd["genai_upload_mb"],
                     bd["external_uploads"],bd["usb_usage"],bd["email_attachments"],bd["printing_events"],
                     bd["impossible_travel_flag"],bd["impossible_travel_details"],
                     bd["credential_sharing_flag"],bd["credential_sharing_details"],
                     bd["shadow_it_flag"],bd["shadow_it_details"],bd["ai_risk_flag"],bd["ai_risk_details"],
                     bd["unusual_collaboration_flag"],bd["unusual_collaboration_details"],
                     bd["privilege_escalation_flag"],bd["privilege_escalation_details"],
                     bd["mitre_techniques"],bd["mitre_confidence"],bd["business_impact_rupees"],
                     bd["current_login_location"],uid))
                conn.commit()
            log_audit(st.session_state.user,"Baseline Restored",f"Baseline restored for {target}",0,0)
            st.success(f"✅ {target} restored to baseline")
            time.sleep(0.4); st.rerun()

    conn.close()

    with col_status:
        st.markdown("<div class='zt-section'>📊 Current Risk Status</div>", unsafe_allow_html=True)
        fresh_df = load_all_evaluated()
        if not fresh_df.empty:
            fresh_row = fresh_df[fresh_df['name']==target]
            if not fresh_row.empty:
                r = fresh_row.iloc[0]
                s_col = "#ef4444" if r['risk_score']>=80 else "#f97316" if r['risk_score']>=60 else "#eab308" if r['risk_score']>=30 else "#22c55e"
                st.markdown(f"""
                <div class='zt-card' style='border-left:4px solid {s_col};'>
                    <div style='font-size:0.75rem;color:#3d5470;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;'>Live Risk Assessment</div>
                    <div class='zt-metric' style='margin-bottom:10px;'><div class='val' style='color:{s_col};'>{r['risk_score']}</div><div class='lbl'>Current Risk Score</div></div>
                    <div style='margin-bottom:8px;'>{sev_badge(r['severity'])}&nbsp;&nbsp;<span style='color:#4a6275;font-size:0.8rem;'>Priority {r['priority']}</span></div>
                    {risk_bar(r['risk_score'],'Risk Level')}
                    <div style='font-size:0.8rem;color:#8aafc8;margin-top:8px;font-weight:600;'>Evidence Flags:</div>
                """, unsafe_allow_html=True)
                for reason in r.get('reasons',[])[:4]:
                    st.markdown(f"<div style='font-size:0.78rem;color:#c8d6e8;padding:2px 0;'>◦ {reason}</div>", unsafe_allow_html=True)
                st.markdown(f"""
                    <div style='margin-top:8px;font-size:0.8rem;'>
                        <span style='color:#4a6275;'>MITRE: </span><span style='color:#ef4444;font-size:0.75rem;'>{r.get('mitre_techniques','None')[:60]}...</span>
                    </div>
                </div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: FORECAST & ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

def page_forecast(df):
    st.markdown("<div class='zt-title'>Forecast & Analytics</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Insider Threat Projections · Burnout Signals · Financial Exposure · ML Distributions</div>", unsafe_allow_html=True)

    col_l, col_r = st.columns(2)

    with col_l:
        st.markdown("<div class='zt-section'>🔮 Insider Threat Forecast (Next 30 Days)</div>", unsafe_allow_html=True)
        forecast_users = df[df['risk_score']>=25].sort_values('risk_score', ascending=False)
        if forecast_users.empty:
            st.info("No users above threshold for projections")
        else:
            chart_d = {}
            for _, r in forecast_users.iterrows():
                chart_d[r['name']] = [r['forecast_today'], r['forecast_next_week'], r['forecast_next_month']]
            chart_df = pd.DataFrame(chart_d, index=["Today","Next Week","Next Month"])
            st.line_chart(chart_df, use_container_width=True, height=220)

        st.markdown("<div class='zt-section'>🧠 Burnout & Stress Indicators</div>", unsafe_allow_html=True)
        burnout_df = df[df['burnout_stress_score']>0][['name','department','burnout_stress_score','burnout_details']].copy()
        burnout_df.columns = ['Employee','Department','Stress Score (%)','Indicators']
        st.dataframe(burnout_df.sort_values('Stress Score (%)',ascending=False), use_container_width=True, hide_index=True)

    with col_r:
        st.markdown("<div class='zt-section'>📊 Downloads vs GenAI Upload</div>", unsafe_allow_html=True)
        st.scatter_chart(df[['downloads','genai_upload_mb']].rename(columns={'downloads':'File Downloads','genai_upload_mb':'GenAI Upload (MB)'}),
                         x='File Downloads', y='GenAI Upload (MB)', use_container_width=True, height=200)

        st.markdown("<div class='zt-section'>📊 Department Risk Comparison</div>", unsafe_allow_html=True)
        dept_risk = df.groupby('department')['risk_score'].mean().round(0).sort_values(ascending=False)
        st.bar_chart(dept_risk, use_container_width=True, height=180)

        st.markdown("<div class='zt-section'>₹ Financial Exposure by Employee</div>", unsafe_allow_html=True)
        exp_df = df[df['business_impact_rupees']>0][['name','department','business_impact_rupees']].copy()
        exp_df.columns = ['Employee','Department','Potential Loss (₹)']
        st.dataframe(exp_df.sort_values('Potential Loss (₹)',ascending=False), use_container_width=True, hide_index=True)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: AUDIT LOG SYSTEM
# ══════════════════════════════════════════════════════════════════════════════

def page_audit_logs(admin=True, user_filter_id=None):
    st.markdown("<div class='zt-title'>Audit Log System</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Immutable Event Records · Timestamped · Suspicious Activity Highlighted</div>", unsafe_allow_html=True)

    conn = get_conn()
    if admin:
        rows = conn.execute("""
            SELECT timestamp, user_name, department, event_type, event_details, ip_addr, device, is_suspicious, risk_contrib
            FROM audit_events ORDER BY timestamp DESC LIMIT 200
        """).fetchall()
    else:
        rows = conn.execute("""
            SELECT timestamp, user_name, department, event_type, event_details, ip_addr, device, is_suspicious, risk_contrib
            FROM audit_events WHERE user_id=? ORDER BY timestamp DESC LIMIT 100
        """, (user_filter_id,)).fetchall()
    conn.close()

    if not rows:
        st.info("No audit events recorded yet.")
        return

    col_f1, col_f2 = st.columns(2)
    with col_f1:
        type_filter = st.selectbox("Filter by Event Type", ["All","Login","Logout","File Download","File Upload","Sensitive Page Access","GenAI Upload","USB Event","Privilege Change","Password Reset","Incident Updated","Attack Simulated","Policy Created","Policy Changed","Baseline Restored"], key="aud_typ")
    with col_f2:
        susp_filter = st.selectbox("Filter by Status", ["All","Suspicious Only","Normal Only"], key="aud_susp")

    event_data = []
    for r in rows:
        ts, uname, dept, etype, edet, ip, device, is_susp, rc = r
        if type_filter != "All" and etype != type_filter:
            continue
        if susp_filter == "Suspicious Only" and not is_susp:
            continue
        if susp_filter == "Normal Only" and is_susp:
            continue
        ts_fmt = str(ts)[:19].replace("T"," ") if ts else "—"
        status = "⚠ Suspicious" if is_susp else "✓ Normal"
        event_data.append({"Timestamp":ts_fmt,"Employee":uname or "—","Dept":dept or "—",
                            "Event Type":etype,"Details":edet or "—","IP":ip or "—",
                            "Device":device or "—","Status":status,"Risk":rc or 0})

    if event_data:
        st.dataframe(pd.DataFrame(event_data), use_container_width=True, hide_index=True)
    else:
        st.info("No events match the selected filters")

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN: SANDBOX / CHECK USER
# ══════════════════════════════════════════════════════════════════════════════

def page_sandbox(df):
    st.markdown("<div class='zt-title'>Risk Sandbox</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Manual Behaviour Assessment · Test Any Combination of Risk Signals</div>", unsafe_allow_html=True)

    st.markdown("""
    <div class='zt-card info' style='padding:0.8rem 1rem;margin-bottom:1rem;'>
        <span style='color:#00f5ff;font-size:0.82rem;'>Enter behaviour parameters to simulate a risk assessment. The full multi-algorithm engine evaluates the profile and returns an explainable score.</span>
    </div>""", unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    with c1:
        s_login_time   = st.number_input("Login Hour (0–23)", 0, 23, 10, key="sb_lt")
        s_failed       = st.number_input("Failed Login Attempts", 0, 20, 0, key="sb_fl")
        s_device       = st.selectbox("Device Registered?", ["Yes","No"], key="sb_dev") == "Yes"
        s_resign       = st.checkbox("In Notice Period?", key="sb_res")
    with c2:
        s_files        = st.number_input("File Access Count", 0, 500, 15, key="sb_fa")
        s_downloads    = st.number_input("Downloads", 0, 500, 5, key="sb_dl")
        s_sensitive    = st.number_input("Sensitive Files Accessed", 0, 50, 0, key="sb_sf")
        s_collab       = st.checkbox("Accessing unauthorized folders?", key="sb_col")
    with c3:
        s_genai        = st.number_input("GenAI Upload (MB)", 0.0, 500.0, 0.0, key="sb_ga")
        s_ext          = st.number_input("External Uploads", 0, 50, 0, key="sb_eu")
        s_usb          = st.checkbox("USB Device Connected?", key="sb_usb")
        s_priv         = st.checkbox("Privilege Escalation?", key="sb_pe")
        s_travel       = st.checkbox("Impossible Travel?", key="sb_it")

    if st.button("🔮 Analyse Risk Profile", use_container_width=True, key="sb_btn"):
        candidate = {"username":"sandbox","name":"Sandbox Profile","department":"Engineering",
                     "login_time":s_login_time,"file_access_count":s_files,"failed_logins":s_failed,
                     "device_known":1 if s_device else 0,"downloads":s_downloads,"sensitive_files":s_sensitive,
                     "resignation_flag":1 if s_resign else 0,"genai_upload_mb":s_genai,
                     "external_uploads":s_ext,"usb_usage":1 if s_usb else 0,"email_attachments":0,
                     "printing_events":0,"last_login_days_ago":0,"impossible_travel_flag":1 if s_travel else 0,
                     "impossible_travel_details":"Login from two countries within 10 minutes" if s_travel else "",
                     "credential_sharing_flag":0,"credential_sharing_details":"","burnout_stress_score":0,
                     "burnout_details":"","shadow_it_flag":0,"shadow_it_details":"",
                     "ai_risk_flag":1 if s_genai>20 else 0,"ai_risk_details":"Sensitive data uploaded to AI" if s_genai>20 else "",
                     "unusual_collaboration_flag":1 if s_collab else 0,"unusual_collaboration_details":"Unauthorized folder access" if s_collab else "",
                     "privilege_escalation_flag":1 if s_priv else 0,"privilege_escalation_details":"Role escalated to Admin" if s_priv else "",
                     "baseline_file_access":20,"baseline_login_time":"09:00","baseline_device":"Office Laptop","baseline_location":"Office"}

        combined = pd.concat([df, pd.DataFrame([candidate])], ignore_index=True)
        ml_f = run_ml_engine(combined)
        s_idx = len(combined) - 1
        score, sev, pri, reasons, algos = calculate_risk(candidate, ml_f.get(s_idx,{}))
        recs = get_recommendations(candidate, sev)

        s_col = "#ef4444" if score>=80 else "#f97316" if score>=60 else "#eab308" if score>=30 else "#22c55e"
        st.markdown("<hr/>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class='zt-card' style='border-left:5px solid {s_col};'>
            <div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;'>
                <div class='zt-metric'><div class='val' style='color:{s_col};'>{score}</div><div class='lbl'>Risk Score</div></div>
                <div class='zt-metric'><div class='val' style='color:{s_col};font-size:1rem;'>{sev.split(" ",1)[-1]}</div><div class='lbl'>Severity</div></div>
                <div class='zt-metric'><div class='val'>{pri}</div><div class='lbl'>SOC Priority</div></div>
            </div>
            {risk_bar(score)}
        </div>""", unsafe_allow_html=True)

        col_ev, col_rc = st.columns(2)
        with col_ev:
            st.markdown("<b style='color:#8aafc8;font-size:0.85rem;'>Evidence Detected:</b>", unsafe_allow_html=True)
            for r_item in reasons:
                st.markdown(f"<div style='font-size:0.82rem;color:#c8d6e8;padding:2px 0;'>◦ {r_item}</div>", unsafe_allow_html=True)
        with col_rc:
            st.markdown("<b style='color:#8aafc8;font-size:0.85rem;'>Recommended Actions:</b>", unsafe_allow_html=True)
            for rec in recs:
                st.markdown(f"<div style='font-size:0.82rem;color:#c8d6e8;padding:2px 0;'>▸ {rec}</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  EMPLOYEE PORTAL
# ══════════════════════════════════════════════════════════════════════════════

def get_employee_data(user):
    conn = get_conn()
    row = conn.execute("SELECT b.*, u.username, u.name, u.department, u.emp_type FROM behavior_data b JOIN users u ON u.id=b.user_id WHERE b.user_id=?", (user['id'],)).fetchone()
    cols = [d[0] for d in conn.execute("SELECT b.*, u.username, u.name, u.department, u.emp_type FROM behavior_data b JOIN users u ON u.id=b.user_id WHERE b.user_id=? LIMIT 0", (user['id'],)).description]
    conn.close()
    if not row:
        return None
    return dict(zip(cols, row))

def emp_page_dashboard(user):
    emp = get_employee_data(user)
    if not emp:
        st.error("Employee profile not found.")
        return

    st.markdown(f"<div class='zt-title'>Welcome, {user['name'].split()[0]}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='zt-subtitle'>{user['department']} · {user.get('emp_type','Employee')} · Session Active</div>", unsafe_allow_html=True)

    # Compute personal risk
    conn = get_conn()
    all_emp = conn.execute("SELECT u.id FROM users u WHERE u.role='employee'").fetchall()
    conn.close()
    df_all = load_all_evaluated()
    my_row = df_all[df_all['username']==user['username']] if not df_all.empty else pd.DataFrame()
    my_risk = int(my_row.iloc[0]['risk_score']) if not my_row.empty else 0
    my_sev  = my_row.iloc[0]['severity'] if not my_row.empty else "🟢 Low"

    s_col = "#ef4444" if my_risk>=80 else "#f97316" if my_risk>=60 else "#eab308" if my_risk>=30 else "#22c55e"

    c1,c2,c3,c4 = st.columns(4)
    with c1:
        st.markdown(metric_html(f"{my_risk}/100","My Risk Score", "c" if my_risk>=80 else "h" if my_risk>=60 else "m" if my_risk>=30 else "s"), unsafe_allow_html=True)
    with c2:
        conn2 = get_conn()
        my_events = conn2.execute("SELECT COUNT(*) FROM audit_events WHERE user_id=?", (user['id'],)).fetchone()[0]
        conn2.close()
        st.markdown(metric_html(my_events,"My Audit Events"), unsafe_allow_html=True)
    with c3:
        conn3 = get_conn()
        my_susp = conn3.execute("SELECT COUNT(*) FROM audit_events WHERE user_id=? AND is_suspicious=1", (user['id'],)).fetchone()[0]
        conn3.close()
        st.markdown(metric_html(my_susp,"Suspicious Flags","c" if my_susp>2 else "m" if my_susp>0 else "s"), unsafe_allow_html=True)
    with c4:
        conn4 = get_conn()
        active_sess = conn4.execute("SELECT COUNT(*) FROM sessions WHERE user_id=? AND is_active=1",(user['id'],)).fetchone()[0]
        conn4.close()
        st.markdown(metric_html(active_sess,"Active Sessions"), unsafe_allow_html=True)

    st.markdown("<hr/>", unsafe_allow_html=True)

    col_act, col_status = st.columns([1, 1])

    with col_act:
        st.markdown("<div class='zt-section'>⚡ Quick Actions</div>", unsafe_allow_html=True)
        st.markdown("""
        <div class='zt-card' style='padding:1rem;'>
            <div style='font-size:0.8rem;color:#3d5470;margin-bottom:12px;'>Click to perform actions — every action is logged to the audit trail and updates your security score in real time.</div>
        """, unsafe_allow_html=True)

        dept = user.get('department','')

        if st.button("📁 Access HR Portal", use_container_width=True, key="emp_hr"):
            susp = dept not in ["HR","IT Security"]
            log_audit(user, "Sensitive Page Access", "Accessed HR Portal — Employee Directory and Policies",
                      15 if susp else 0, 1 if susp else 0)
            if susp:
                st.warning("⚠ Access logged and flagged — HR Portal is outside your department scope. SOC has been notified.")
            else:
                st.success("✅ HR Portal access logged successfully")

        if st.button("💳 Access Payroll System", use_container_width=True, key="emp_pay"):
            susp = dept not in ["HR","Finance","IT Security"]
            log_audit(user, "Sensitive Page Access", "Accessed Payroll Management System — salary and compensation data",
                      20 if susp else 0, 1 if susp else 0)
            if susp:
                st.warning("⚠ ALERT: Payroll access is outside your authorized scope. This has been flagged and escalated to your security team.")
            else:
                st.success("✅ Payroll access logged")

        if st.button("📥 Download Report", use_container_width=True, key="emp_dl"):
            log_audit(user, "File Download", "Downloaded: Q2_Performance_Report.pdf (2.4 MB)", 5, 0)
            st.success("✅ Report download logged to audit trail")

        if st.button("📤 Upload Document", use_container_width=True, key="emp_ul"):
            log_audit(user, "File Upload", "Uploaded: Project_Proposal_v3.docx (1.1 MB) to shared drive", 2, 0)
            st.success("✅ File upload logged to audit trail")

        if st.button("📊 Access Finance Dashboard", use_container_width=True, key="emp_fin"):
            susp = dept not in ["Finance","IT Security"]
            log_audit(user, "Sensitive Page Access", "Accessed Finance Dashboard — ledger and budget data",
                      20 if susp else 0, 1 if susp else 0)
            if susp:
                st.warning("⚠ Finance Dashboard access is outside your department. This event has been logged and flagged.")
            else:
                st.success("✅ Finance Dashboard access logged")

        if st.button("📤 Export Data to External Storage", use_container_width=True, key="emp_exp"):
            log_audit(user, "File Download", "Data export to external target: 23 records exported", 15, 1)
            st.warning("⚠ External export detected and logged. Large data exports are monitored by the security team.")

        if st.button("🔑 Change Password", use_container_width=True, key="emp_pwd"):
            log_audit(user, "Password Reset", "Employee-initiated password change from account settings", 0, 0)
            st.success("✅ Password change request logged")

        if st.button("🤖 Use AI Tool (ChatGPT)", use_container_width=True, key="emp_ai"):
            log_audit(user, "GenAI Upload", "Browser session opened to chat.openai.com — clipboard access detected (12.5 MB)", 25, 1)
            st.warning("⚠ AI tool usage detected and logged. Pasting sensitive company data to public AI tools is a policy violation.")

        st.markdown("</div>", unsafe_allow_html=True)

    with col_status:
        st.markdown("<div class='zt-section'>🛡️ My Security Status</div>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class='zt-card' style='border-left:3px solid {s_col};'>
            <div style='font-size:0.72rem;color:#3d5470;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;'>Current Risk Assessment</div>
            {risk_bar(my_risk,'Your Risk Score')}
            <div style='margin-top:10px;'>
                <div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.05);font-size:0.82rem;'>
                    <span style='color:#4a6275;'>Severity</span>
                    <span>{sev_badge(my_sev)}</span>
                </div>
                <div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.05);font-size:0.82rem;'>
                    <span style='color:#4a6275;'>Department</span>
                    <span style='color:#c8d6e8;'>{dept}</span>
                </div>
                <div style='display:flex;justify-content:space-between;padding:6px 0;font-size:0.82rem;'>
                    <span style='color:#4a6275;'>Session ID</span>
                    <span style='font-family:"JetBrains Mono",monospace;color:#4a6275;font-size:0.72rem;'>{st.session_state.get('session_id','')[:16]}...</span>
                </div>
            </div>
        </div>""", unsafe_allow_html=True)

        if not my_row.empty:
            r = my_row.iloc[0]
            reasons = r.get('reasons',[])
            if reasons and reasons[0] != "No unusual behavior detected — all indicators within baseline":
                st.markdown("<div class='zt-section'>⚠ Flags on Your Account</div>", unsafe_allow_html=True)
                st.markdown("<div class='zt-card critical'>", unsafe_allow_html=True)
                for reason in reasons[:3]:
                    st.markdown(f"<div style='font-size:0.8rem;color:#ef4444;padding:3px 0;'>⚠ {reason}</div>", unsafe_allow_html=True)
                st.markdown("<div style='font-size:0.75rem;color:#3d5470;margin-top:8px;'>Contact your IT Security team if you believe this is incorrect.</div></div>", unsafe_allow_html=True)
            else:
                st.markdown("""
                <div class='zt-card low' style='text-align:center;padding:1.2rem;'>
                    <div style='font-size:1.5rem;margin-bottom:6px;'>✅</div>
                    <div style='color:#22c55e;font-weight:700;'>No Active Flags</div>
                    <div style='font-size:0.78rem;color:#4a6275;margin-top:4px;'>Your activity is within policy baseline</div>
                </div>""", unsafe_allow_html=True)

        # Recent audit events
        st.markdown("<div class='zt-section'>🕒 Recent Activity</div>", unsafe_allow_html=True)
        conn5 = get_conn()
        recent = conn5.execute("SELECT timestamp, event_type, event_details, is_suspicious FROM audit_events WHERE user_id=? ORDER BY timestamp DESC LIMIT 6", (user['id'],)).fetchall()
        conn5.close()
        if recent:
            for ts, etype, edet, is_susp in recent:
                ts_fmt = str(ts)[:16].replace("T"," ")
                susp_color = "#ef4444" if is_susp else "#22c55e"
                susp_icon  = "⚠" if is_susp else "✓"
                st.markdown(f"""
                <div style='display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <div>
                        <div style='font-size:0.78rem;color:{susp_color};font-weight:600;'>{susp_icon} {etype}</div>
                        <div style='font-size:0.72rem;color:#3d5470;'>{str(edet or '')[:55]}...</div>
                    </div>
                    <div style='font-size:0.68rem;color:#2d4060;font-family:"JetBrains Mono",monospace;white-space:nowrap;'>{ts_fmt}</div>
                </div>""", unsafe_allow_html=True)

def emp_page_timeline(user):
    st.markdown("<div class='zt-title'>My Session Timeline</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Complete Audit Trail · All Events · Timestamped</div>", unsafe_allow_html=True)

    df_all = load_all_evaluated()
    my_row = df_all[df_all['username']==user['username']] if not df_all.empty else pd.DataFrame()

    if not my_row.empty:
        row = my_row.iloc[0]
        col_a, col_b = st.columns([1.2, 1])
        with col_a:
            st.markdown("<div class='zt-section'>🕒 Session Timeline (Behavioral)</div>", unsafe_allow_html=True)
            st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
            render_timeline(row.get('timeline',[]))
            st.markdown("</div>", unsafe_allow_html=True)
        with col_b:
            st.markdown("<div class='zt-section'>📜 Audit Log (All Portal Events)</div>", unsafe_allow_html=True)
            page_audit_logs(admin=False, user_filter_id=user['id'])

def emp_page_security_status(user):
    st.markdown("<div class='zt-title'>My Security Status</div>", unsafe_allow_html=True)
    st.markdown("<div class='zt-subtitle'>Your Behavioral Risk Profile · Active Policies · Security Recommendations</div>", unsafe_allow_html=True)

    df_all = load_all_evaluated()
    my_row = df_all[df_all['username']==user['username']] if not df_all.empty else pd.DataFrame()
    if my_row.empty:
        st.info("Risk data not yet available for your account.")
        return

    row = my_row.iloc[0]
    bd = BEHAVIOR_SEED.get(user['username'], {})

    col_l, col_r = st.columns([1, 1])

    with col_l:
        st.markdown("<div class='zt-section'>📊 Your Risk Profile</div>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class='zt-card info'>
            <b style='color:#c8d6e8;'>{user['name']}</b> &nbsp;·&nbsp; <span style='color:#4a6275;'>{user['department']}</span>
            &nbsp;·&nbsp; {sev_badge(row['severity'])}
            {risk_bar(row['risk_score'],'Current Risk Score')}
            <table style='width:100%;margin-top:1rem;border-collapse:collapse;font-size:0.83rem;'>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.08);'>
                    <th style='text-align:left;padding:6px 0;color:#4a6275;'>Metric</th>
                    <th style='text-align:center;color:#4a6275;'>Baseline</th>
                    <th style='text-align:center;color:#00f5ff;'>Today</th>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Login Time</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_login_time','09:00')}</td>
                    <td style='text-align:center;color:{"#ef4444" if (int(row["login_time"])<7 or int(row["login_time"])>20) else "#22c55e"};'>{int(row["login_time"]):02d}:00</td>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Device</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_device','Office Laptop')}</td>
                    <td style='text-align:center;color:{"#ef4444" if row["device_known"]==0 else "#22c55e"};'>{"✓ Registered" if row["device_known"]==1 else "✗ Unknown"}</td>
                </tr>
                <tr style='border-bottom:1px solid rgba(0,245,255,0.05);'>
                    <td style='padding:7px 0;'>Location</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_location','Office')}</td>
                    <td style='text-align:center;color:{"#ef4444" if row["impossible_travel_flag"]==1 else "#22c55e"};'>{row["current_login_location"]}</td>
                </tr>
                <tr>
                    <td style='padding:7px 0;'>File Access</td>
                    <td style='text-align:center;color:#8aafc8;'>{bd.get('baseline_file_access',15)}/day</td>
                    <td style='text-align:center;color:{"#ef4444" if row["file_access_count"]>bd.get("baseline_file_access",15)*2.5 else "#22c55e"};'>{row["file_access_count"]}/day</td>
                </tr>
            </table>
        </div>""", unsafe_allow_html=True)

        st.markdown("<div class='zt-section'>🛡️ Applied Security Policies</div>", unsafe_allow_html=True)
        violations = policy_check_violations(pd.DataFrame([row.to_dict()]))
        if violations:
            for v in violations:
                st.markdown(f"""
                <div class='zt-card high' style='padding:0.7rem 1rem;margin-bottom:0.5rem;'>
                    <span class='badge bh'>VIOLATION</span>&nbsp;
                    <b style='font-size:0.83rem;color:#c8d6e8;'>{v['Policy']}</b><br/>
                    <span style='font-size:0.78rem;color:#f97316;'>→ {v['Action']}</span>
                </div>""", unsafe_allow_html=True)
        else:
            st.success("✅ No policy violations — all activity within compliance boundaries")

    with col_r:
        st.markdown("<div class='zt-section'>ℹ️ What's Being Monitored</div>", unsafe_allow_html=True)
        monitors = [
            ("Login Time & Frequency", "Logins outside 07:00–20:00 are flagged"),
            ("Device Registration", "Only pre-registered devices are trusted"),
            ("File Access Volume", "Excessive access beyond your daily baseline is tracked"),
            ("Downloads & Exports", "High download volumes trigger alerts"),
            ("GenAI Tool Usage", "Data uploads to public AI tools are logged"),
            ("Geographic Location", "Impossible travel between locations is detected"),
            ("USB Device Events", "Any USB storage connection is logged"),
            ("Application Access", "Unauthorized department resource access is flagged"),
        ]
        st.markdown("<div class='zt-card'>", unsafe_allow_html=True)
        for name, desc in monitors:
            st.markdown(f"""
            <div style='padding:6px 0;border-bottom:1px solid rgba(0,245,255,0.05);'>
                <div style='font-size:0.83rem;color:#c8d6e8;font-weight:600;'>🔍 {name}</div>
                <div style='font-size:0.75rem;color:#3d5470;margin-top:1px;'>{desc}</div>
            </div>""", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("<div class='zt-section'>📋 Recommendations for You</div>", unsafe_allow_html=True)
        recs = row.get('recommendations',[])
        if recs and recs[0] != "No active recommendations — continue baseline monitoring":
            st.markdown("<div class='zt-card high'>", unsafe_allow_html=True)
            for rec in recs:
                st.markdown(f"<div style='font-size:0.82rem;color:#f97316;padding:3px 0;'>▸ {rec}</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.markdown("<div class='zt-card low' style='text-align:center;'><div style='color:#22c55e;font-weight:700;font-size:0.9rem;'>✅ You're in good standing</div><div style='font-size:0.78rem;color:#4a6275;margin-top:4px;'>No actions required from your end</div></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN ROUTER
# ══════════════════════════════════════════════════════════════════════════════

if not st.session_state.authenticated:
    show_login()
    st.stop()

user = st.session_state.user
role = user["role"]

# ── SIDEBAR ────────────────────────────────────────────────────────────────────
with st.sidebar:
    if role == "admin":
        st.markdown(f"""
        <div class='sb-logo'>
            <div class='brand'>🛡️ ZeroTrustNet</div>
            <div class='tagline'>Security Operations</div>
            <div class='status'>● System Operational</div>
        </div>""", unsafe_allow_html=True)
        st.markdown(f"<div style='font-size:0.75rem;color:#2d4060;margin-bottom:0.6rem;padding:0 4px;'>Logged in as <b style='color:#4a6275;'>{user['name']}</b><br/><span style='font-size:0.68rem;letter-spacing:1px;color:#1a2840;text-transform:uppercase;'>Admin / SOC</span></div>", unsafe_allow_html=True)

        pages_admin = {
            "🏠 Executive Dashboard": "dashboard",
            "📊 Threat Detection & UEBA": "ueba",
            "🚨 Incident Response": "incidents",
            "🔐 Zero Trust Policies": "policies",
            "🤖 AI Security Copilot": "copilot",
            "⚡ Attack Simulation": "simulation",
            "📈 Forecast & Analytics": "forecast",
            "📜 Audit Logs": "audit",
            "🔍 Risk Sandbox": "sandbox",
        }
        for label, page_key in pages_admin.items():
            active = st.session_state.page == page_key
            if st.button(label, key=f"nav_{page_key}", use_container_width=True):
                st.session_state.page = page_key
                st.rerun()

    else:
        st.markdown(f"""
        <div class='sb-logo'>
            <div class='brand'>🛡️ ZeroTrustNet</div>
            <div class='tagline'>Employee Portal</div>
            <div class='status'>● Session Active</div>
        </div>""", unsafe_allow_html=True)
        st.markdown(f"<div style='font-size:0.75rem;color:#2d4060;margin-bottom:0.6rem;padding:0 4px;'>Logged in as <b style='color:#4a6275;'>{user['name']}</b><br/><span style='font-size:0.68rem;letter-spacing:1px;color:#1a2840;text-transform:uppercase;'>{user['department']}</span></div>", unsafe_allow_html=True)

        pages_emp = {
            "🏠 My Dashboard":        "emp_dashboard",
            "🕒 My Timeline":         "emp_timeline",
            "🛡️ My Security Status":  "emp_security",
        }
        for label, page_key in pages_emp.items():
            if st.button(label, key=f"nav_{page_key}", use_container_width=True):
                st.session_state.page = page_key
                st.rerun()

    st.markdown("<hr/>", unsafe_allow_html=True)
    if st.button("🚪 Logout", use_container_width=True, key="nav_logout"):
        log_audit(user, "Logout", "User logged out from ZeroTrustNet", 0, 0)
        conn_l = get_conn()
        conn_l.execute("UPDATE sessions SET is_active=0, logout_time=? WHERE id=?",
                       (datetime.now().isoformat(), st.session_state.session_id))
        conn_l.commit(); conn_l.close()
        st.session_state.authenticated = False
        st.session_state.user = None
        st.session_state.page = "dashboard"
        st.session_state.session_id = ""
        st.rerun()

    st.markdown(f"<div style='font-size:0.65rem;color:#1a2840;text-align:center;margin-top:0.5rem;'>ZeroTrustNet v4.0<br/>Never Trust · Always Verify</div>", unsafe_allow_html=True)

# ── PAGE DISPATCH ─────────────────────────────────────────────────────────────

# Default page per role
if st.session_state.page == "dashboard" and role == "employee":
    st.session_state.page = "emp_dashboard"

if role == "admin":
    df = load_all_evaluated()
    cur = st.session_state.page

    if   cur == "dashboard":   page_executive_dashboard(df)
    elif cur == "ueba":        page_threat_detection(df)
    elif cur == "incidents":   page_incidents(df)
    elif cur == "policies":    page_policy_engine(df)
    elif cur == "copilot":     page_ai_copilot(df)
    elif cur == "simulation":  page_attack_sim(df)
    elif cur == "forecast":    page_forecast(df)
    elif cur == "audit":       page_audit_logs(admin=True)
    elif cur == "sandbox":     page_sandbox(df)
    else:
        st.session_state.page = "dashboard"
        st.rerun()

elif role == "employee":
    cur = st.session_state.page
    if   cur == "emp_dashboard": emp_page_dashboard(user)
    elif cur == "emp_timeline":  emp_page_timeline(user)
    elif cur == "emp_security":  emp_page_security_status(user)
    else:
        st.session_state.page = "emp_dashboard"
        st.rerun()