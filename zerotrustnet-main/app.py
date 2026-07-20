import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import time
from datetime import datetime
import os

# -------------------------------
# ⚙️ PAGE SETTINGS (MUST BE FIRST)
# -------------------------------
st.set_page_config(page_title="ZeroTrustNet 3.0", layout="wide", initial_sidebar_state="expanded")

# -------------------------------
# 🎨 PREMIUM CYBER UI & DESIGN SYSTEM
# -------------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

/* 🌌 CYBER BACKGROUND & CORE */
html, body, [class*="css"], .stApp {
    font-family: 'Outfit', sans-serif !important;
    background: radial-gradient(circle at center, #0a0f2c, #020617);
    color: #e2e8f0;
}

/* 🔷 HACKER STYLE GRID LAYER */
.stApp::before {
    content: "";
    position: fixed;
    width: 200%;
    height: 200%;
    background-image:
        linear-gradient(rgba(0, 245, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.04) 1px, transparent 1px);
    background-size: 50px 50px;
    animation: moveGrid 25s linear infinite;
    z-index: -1;
    pointer-events: none;
}

@keyframes moveGrid {
    from { transform: translate(0, 0); }
    to { transform: translate(-50px, -50px); }
}

/* 🧊 GLASS UI CONTAINERS */
.block-container {
    background: rgba(2, 6, 23, 0.85);
    padding: 3rem;
    border-radius: 16px;
    border: 1px solid rgba(0, 245, 255, 0.1);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
}

/* 📌 SIDEBAR */
section[data-testid="stSidebar"] {
    background: #04081c !important;
    border-right: 1px solid rgba(0, 245, 255, 0.15);
}

/* 🔥 BIG CYBER HEADERS */
.cyber-title {
    font-size: 55px;
    text-align: center;
    background: linear-gradient(90deg, #00f5ff, #005fbc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
    margin-bottom: 0.2rem;
    text-shadow: 0 0 25px rgba(0, 245, 255, 0.25);
}

.cyber-subtitle {
    text-align: center;
    color: #8892b0;
    font-size: 1.15rem;
    margin-bottom: 2rem;
    letter-spacing: 2px;
    text-transform: uppercase;
}

/* 📦 PREMIUM CARDS */
.cyber-card {
    background: rgba(10, 15, 36, 0.6);
    border: 1px solid rgba(0, 245, 255, 0.15);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;
}

.cyber-card:hover {
    border-color: rgba(0, 245, 255, 0.4);
    box-shadow: 0 8px 24px rgba(0, 245, 255, 0.15);
    transform: translateY(-2px);
}

/* 📈 METRICS */
.metric-value {
    font-size: 2.3rem;
    font-weight: 700;
    color: #00f5ff;
    text-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
}

.metric-label {
    font-size: 0.85rem;
    color: #8892b0;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* 🚨 BADGES */
.badge-critical {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid #ef4444;
    padding: 3px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    display: inline-block;
}

.badge-high {
    background: rgba(249, 115, 22, 0.15);
    color: #f97316;
    border: 1px solid #f97316;
    padding: 3px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    display: inline-block;
}

.badge-medium {
    background: rgba(234, 179, 8, 0.15);
    color: #eab308;
    border: 1px solid #eab308;
    padding: 3px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    display: inline-block;
}

.badge-low {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border: 1px solid #22c55e;
    padding: 3px 10px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    display: inline-block;
}

/* 📈 TIMELINE STEPS */
.timeline-item {
    border-left: 2px solid #00f5ff;
    padding-left: 20px;
    margin-left: 10px;
    position: relative;
    padding-bottom: 15px;
}

.timeline-item::before {
    content: "";
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00f5ff;
    position: absolute;
    left: -7px;
    top: 5px;
    box-shadow: 0 0 8px #00f5ff;
}

.timeline-item.flagged::before {
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
}

.timeline-item.flagged {
    border-left: 2px solid #ef4444;
}

.timeline-time {
    font-weight: bold;
    color: #8892b0;
    font-size: 0.85rem;
}

/* 🤖 COPILOT CARD */
.copilot-section {
    background: rgba(10, 15, 36, 0.85);
    border-left: 4px solid #00f5ff;
    padding: 1.5rem;
    border-radius: 0 12px 12px 0;
    box-shadow: inset 0 0 20px rgba(0, 245, 255, 0.05);
    border: 1px solid rgba(0, 245, 255, 0.1);
    border-left-width: 4px;
}

.stTextInput>div>div>input {
    background: #0b112c !important;
    color: #00ffff !important;
    border: 1px solid rgba(0, 245, 255, 0.2) !important;
}

.stButton>button {
    background: linear-gradient(135deg, #00f5ff, #005fbc) !important;
    color: #030712 !important;
    font-weight: 700 !important;
    border: none !important;
    box-shadow: 0 0 12px rgba(0, 245, 255, 0.3) !important;
    transition: all 0.3s ease !important;
}

.stButton>button:hover {
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.6) !important;
    transform: scale(1.02) !important;
}

label {
    color: #00ffff !important;
}

</style>
""", unsafe_allow_html=True)

# -------------------------------
# 📁 RICH SYNTHETIC DATA BASELINE
# -------------------------------
default_users = [
    {
        "username": "ravi",
        "name": "Ravi",
        "department": "Engineering",
        "employee_type": "Employee",
        "login_time": 23,
        "file_access_count": 340,
        "failed_logins": 1,
        "device_known": 0,
        "downloads": 340,
        "sensitive_files": 12,
        "resignation_flag": 1,
        "genai_upload_mb": 45.2,
        "external_uploads": 5,
        "usb_usage": 1,
        "email_attachments": 8,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "Bengaluru",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 55,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 1,
        "ai_risk_details": "Sensitive code pasted to ChatGPT & Gemini",
        "unusual_collaboration_flag": 1,
        "unusual_collaboration_details": "Accessed Finance folder files",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 88,
        "forecast_next_week": 92,
        "forecast_next_month": 96,
        "baseline_login_time": "09:15",
        "baseline_device": "Office Laptop",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 18,
        "accessed_folders": "Finance, Engineering",
        "expected_folders": "Engineering",
        "business_impact_rupees": 1250000,
        "mitre_techniques": "T1005 (Data from Local System), T1567 (Exfiltration Over Web Service)",
        "mitre_confidence": 96
    },
    {
        "username": "rahul",
        "name": "Rahul",
        "department": "HR",
        "employee_type": "Employee",
        "login_time": 10,
        "file_access_count": 45,
        "failed_logins": 0,
        "device_known": 1,
        "downloads": 10,
        "sensitive_files": 5,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "Bengaluru",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 20,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 1,
        "unusual_collaboration_details": "HR Employee accessing Payroll Database and Finance Folder",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 74,
        "forecast_next_week": 80,
        "forecast_next_month": 85,
        "baseline_login_time": "09:30",
        "baseline_device": "Office Desktop",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 12,
        "accessed_folders": "Payroll Database, Finance Folder",
        "expected_folders": "HR Folder",
        "business_impact_rupees": 820000,
        "mitre_techniques": "T1078 (Valid Accounts)",
        "mitre_confidence": 85
    },
    {
        "username": "dormant_alice",
        "name": "Alice (Dormant)",
        "department": "Sales",
        "employee_type": "Former Employee",
        "login_time": 2,
        "file_access_count": 5,
        "failed_logins": 2,
        "device_known": 0,
        "downloads": 2,
        "sensitive_files": 1,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 132,
        "last_login_location": "Pune",
        "current_login_location": "Pune",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 10,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 50,
        "forecast_next_week": 65,
        "forecast_next_month": 78,
        "baseline_login_time": "10:00",
        "baseline_device": "Work Laptop",
        "baseline_location": "Pune",
        "baseline_file_access": 15,
        "accessed_folders": "Sales Folder",
        "expected_folders": "None (Dormant)",
        "business_impact_rupees": 150000,
        "mitre_techniques": "T1078.004 (Cloud Accounts)",
        "mitre_confidence": 90
    },
    {
        "username": "traveler_dan",
        "name": "Dan (Traveler)",
        "department": "IT",
        "employee_type": "Employee",
        "login_time": 9,
        "file_access_count": 10,
        "failed_logins": 1,
        "device_known": 0,
        "downloads": 2,
        "sensitive_files": 0,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "London",
        "impossible_travel_flag": 1,
        "impossible_travel_details": "Bengaluru (09:00) -> London (09:12). Travel Time Required: 10 Hours.",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 30,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 95,
        "forecast_next_week": 95,
        "forecast_next_month": 95,
        "baseline_login_time": "09:00",
        "baseline_device": "Office Laptop",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 20,
        "accessed_folders": "IT Support Logs",
        "expected_folders": "IT Support Logs",
        "business_impact_rupees": 950000,
        "mitre_techniques": "T1133 (External Remote Services)",
        "mitre_confidence": 98
    },
    {
        "username": "shared_sam",
        "name": "Sam (Shared Creds)",
        "department": "Sales",
        "employee_type": "Employee",
        "login_time": 14,
        "file_access_count": 35,
        "failed_logins": 0,
        "device_known": 0,
        "downloads": 15,
        "sensitive_files": 2,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Mumbai",
        "current_login_location": "Delhi",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 1,
        "credential_sharing_details": "Logins from Chrome (Windows) & Safari (macOS) under different IPs concurrently",
        "burnout_stress_score": 25,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 70,
        "forecast_next_week": 70,
        "forecast_next_month": 70,
        "baseline_login_time": "10:00",
        "baseline_device": "Company MacBook",
        "baseline_location": "Mumbai",
        "baseline_file_access": 30,
        "accessed_folders": "Sales CRM",
        "expected_folders": "Sales CRM",
        "business_impact_rupees": 450000,
        "mitre_techniques": "T1078.003 (Local Accounts)",
        "mitre_confidence": 92
    },
    {
        "username": "burnout_eve",
        "name": "Eve (Burnout Risk)",
        "department": "Finance",
        "employee_type": "Employee",
        "login_time": 23,
        "file_access_count": 85,
        "failed_logins": 8,
        "device_known": 1,
        "downloads": 12,
        "sensitive_files": 3,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Chennai",
        "current_login_location": "Chennai",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 78,
        "burnout_details": "Late night logins increasing, Weekend work increasing, Failed logins increasing",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 12,
        "forecast_next_week": 38,
        "forecast_next_month": 74,
        "baseline_login_time": "09:30",
        "baseline_device": "Finance Desktop",
        "baseline_location": "Chennai",
        "baseline_file_access": 40,
        "accessed_folders": "Finance Ledgers",
        "expected_folders": "Finance Ledgers",
        "business_impact_rupees": 350000,
        "mitre_techniques": "None",
        "mitre_confidence": 0
    },
    {
        "username": "shadow_it_ted",
        "name": "Ted (Shadow IT)",
        "department": "Engineering",
        "employee_type": "Employee",
        "login_time": 11,
        "file_access_count": 22,
        "failed_logins": 0,
        "device_known": 1,
        "downloads": 5,
        "sensitive_files": 0,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Hyderabad",
        "current_login_location": "Hyderabad",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 40,
        "burnout_details": "",
        "shadow_it_flag": 1,
        "shadow_it_details": "AnyDesk (Blocked), TeamViewer (Blocked), Unknown VPN (Blocked). Allowed: Zoom.",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 45,
        "forecast_next_week": 55,
        "forecast_next_month": 65,
        "baseline_login_time": "09:00",
        "baseline_device": "Linux Workstation",
        "baseline_location": "Hyderabad",
        "baseline_file_access": 15,
        "accessed_folders": "Source Code Repositories",
        "expected_folders": "Source Code Repositories",
        "business_impact_rupees": 600000,
        "mitre_techniques": "T1219 (Remote Access Software)",
        "mitre_confidence": 95
    },
    {
        "username": "ai_paste_pat",
        "name": "Pat (AI Leak Risk)",
        "department": "Engineering",
        "employee_type": "Employee",
        "login_time": 10,
        "file_access_count": 50,
        "failed_logins": 0,
        "device_known": 1,
        "downloads": 10,
        "sensitive_files": 4,
        "resignation_flag": 0,
        "genai_upload_mb": 58.4,
        "external_uploads": 4,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "Bengaluru",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 30,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 1,
        "ai_risk_details": "Sensitive code pasted to ChatGPT & Gemini",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 80,
        "forecast_next_week": 85,
        "forecast_next_month": 90,
        "baseline_login_time": "09:00",
        "baseline_device": "Developer MacBook",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 25,
        "accessed_folders": "Core Algorithms Repository",
        "expected_folders": "Core Algorithms Repository",
        "business_impact_rupees": 1800000,
        "mitre_techniques": "T1567.002 (Exfiltration to Cloud Services)",
        "mitre_confidence": 94
    },
    {
        "username": "escalated_eric",
        "name": "Eric (Priv Escalation)",
        "department": "IT",
        "employee_type": "Employee",
        "login_time": 8,
        "file_access_count": 90,
        "failed_logins": 1,
        "device_known": 1,
        "downloads": 40,
        "sensitive_files": 8,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 1,
        "email_attachments": 2,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "Bengaluru",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 35,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 1,
        "unusual_collaboration_details": "Normal Helpdesk user accessing domain controller admin console",
        "privilege_escalation_flag": 1,
        "privilege_escalation_details": "Role Yesterday: Employee, Role Today: Admin",
        "forecast_today": 98,
        "forecast_next_week": 98,
        "forecast_next_month": 98,
        "baseline_login_time": "09:00",
        "baseline_device": "Helpdesk Terminal",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 30,
        "accessed_folders": "Active Directory, Domain Controller Logs",
        "expected_folders": "IT Helpdesk Tickets",
        "business_impact_rupees": 2500000,
        "mitre_techniques": "T1078 (Valid Accounts), T1098 (Account Manipulation)",
        "mitre_confidence": 97
    },
    {
        "username": "priya_sales",
        "name": "Priya",
        "department": "Sales",
        "employee_type": "Employee",
        "login_time": 10,
        "file_access_count": 14,
        "failed_logins": 0,
        "device_known": 1,
        "downloads": 4,
        "sensitive_files": 0,
        "resignation_flag": 0,
        "genai_upload_mb": 1.2,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 1,
        "printing_events": 0,
        "last_login_days_ago": 0,
        "last_login_location": "Mumbai",
        "current_login_location": "Mumbai",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 15,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 5,
        "forecast_next_week": 5,
        "forecast_next_month": 5,
        "baseline_login_time": "10:00",
        "baseline_device": "Work Laptop",
        "baseline_location": "Mumbai",
        "baseline_file_access": 15,
        "accessed_folders": "Sales Folder",
        "expected_folders": "Sales Folder",
        "business_impact_rupees": 0,
        "mitre_techniques": "None",
        "mitre_confidence": 0
    },
    {
        "username": "amit_marketing",
        "name": "Amit",
        "department": "Marketing",
        "employee_type": "Employee",
        "login_time": 11,
        "file_access_count": 8,
        "failed_logins": 1,
        "device_known": 1,
        "downloads": 2,
        "sensitive_files": 0,
        "resignation_flag": 0,
        "genai_upload_mb": 0.5,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 0,
        "printing_events": 0,
        "last_login_days_ago": 1,
        "last_login_location": "Delhi",
        "current_login_location": "Delhi",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 12,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 8,
        "forecast_next_week": 8,
        "forecast_next_month": 8,
        "baseline_login_time": "09:30",
        "baseline_device": "Office Desktop",
        "baseline_location": "Delhi",
        "baseline_file_access": 10,
        "accessed_folders": "Marketing Assets",
        "expected_folders": "Marketing Assets",
        "business_impact_rupees": 0,
        "mitre_techniques": "None",
        "mitre_confidence": 0
    },
    {
        "username": "john_legal",
        "name": "John",
        "department": "Legal",
        "employee_type": "Employee",
        "login_time": 9,
        "file_access_count": 18,
        "failed_logins": 0,
        "device_known": 1,
        "downloads": 6,
        "sensitive_files": 2,
        "resignation_flag": 0,
        "genai_upload_mb": 0.0,
        "external_uploads": 0,
        "usb_usage": 0,
        "email_attachments": 2,
        "printing_events": 1,
        "last_login_days_ago": 0,
        "last_login_location": "Bengaluru",
        "current_login_location": "Bengaluru",
        "impossible_travel_flag": 0,
        "impossible_travel_details": "",
        "credential_sharing_flag": 0,
        "credential_sharing_details": "",
        "burnout_stress_score": 18,
        "burnout_details": "",
        "shadow_it_flag": 0,
        "shadow_it_details": "",
        "ai_risk_flag": 0,
        "ai_risk_details": "",
        "unusual_collaboration_flag": 0,
        "unusual_collaboration_details": "",
        "privilege_escalation_flag": 0,
        "privilege_escalation_details": "",
        "forecast_today": 10,
        "forecast_next_week": 10,
        "forecast_next_month": 10,
        "baseline_login_time": "09:00",
        "baseline_device": "Office Desktop",
        "baseline_location": "Bengaluru",
        "baseline_file_access": 15,
        "accessed_folders": "Legal Contracts",
        "expected_folders": "Legal Contracts",
        "business_impact_rupees": 0,
        "mitre_techniques": "None",
        "mitre_confidence": 0
    }
]

# -------------------------------
# 🧠 DYNAMIC DETECTION ENGINE
# -------------------------------
def fit_anomaly_model(df):
    features = ['login_time', 'file_access_count', 'failed_logins', 'downloads', 'sensitive_files', 'genai_upload_mb', 'external_uploads']
    X = df[features].fillna(0)
    clf = IsolationForest(contamination=0.25, random_state=42)
    preds = clf.fit_predict(X)
    return preds

def calculate_risk(row, ml_flag):
    score = 0
    reasons = []
    
    # 1. Privilege Misuse & Unusual Collaboration
    if row.get('unusual_collaboration_flag') == 1:
        score += 25
        reasons.append(f"Unusual Collaboration: {row.get('unusual_collaboration_details')}")
        
    # 2. Data Exfiltration
    exfil_score = 0
    if row.get('downloads', 0) > 100:
        exfil_score += 25
        reasons.append(f"Mass downloads registered ({row.get('downloads')} files)")
    elif row.get('downloads', 0) > 15:
        exfil_score += 15
        reasons.append(f"Elevated volume downloads ({row.get('downloads')} files)")
        
    if row.get('usb_usage', 0) == 1:
        exfil_score += 20
        reasons.append("Unapproved USB device connected")
    if row.get('external_uploads', 0) > 2:
        exfil_score += 15
        reasons.append(f"Multiple external uploads ({row.get('external_uploads')} events)")
    if row.get('email_attachments', 0) > 3:
        exfil_score += 10
        reasons.append(f"Unusual email attachments ({row.get('email_attachments')} files)")
    if row.get('printing_events', 0) > 1:
        exfil_score += 10
        reasons.append("High volume printing event detected")
    if row.get('resignation_flag', 0) == 1 and exfil_score > 0:
        exfil_score *= 2.5
        reasons.append("Pre-resignation pattern: Exfiltration signals weighted 2.5x")
    score += exfil_score
    
    # 3. Dormant Account
    if row.get('last_login_days_ago', 0) > 90:
        score += 20
        reasons.append(f"Dormant account active after {row.get('last_login_days_ago')} days of inactivity")
        
    # 4. Impossible Travel
    if row.get('impossible_travel_flag') == 1:
        score += 45
        reasons.append(f"Impossible Travel: {row.get('impossible_travel_details')}")
        
    # 5. Credential Sharing
    if row.get('credential_sharing_flag') == 1:
        score += 35
        reasons.append(f"Credential Sharing: {row.get('credential_sharing_details')}")
        
    # 6. Burnout / Stress
    if row.get('burnout_stress_score', 0) > 60:
        score += 15
        reasons.append(f"High Stress Score ({row.get('burnout_stress_score')}%): Late night/weekend logins increasing")
        
    # 7. Shadow IT
    if row.get('shadow_it_flag') == 1:
        score += 20
        reasons.append(f"Shadow IT detected: {row.get('shadow_it_details')}")
        
    # 8. AI Risk
    if row.get('ai_risk_flag') == 1:
        score += 30
        reasons.append(f"AI Risk Event: {row.get('ai_risk_details')}")
        
    # 9. Privilege Escalation
    if row.get('privilege_escalation_flag') == 1:
        score += 40
        reasons.append(f"Privilege Escalation: {row.get('privilege_escalation_details')}")
        
    # 10. ML Isolation Forest Anomaly
    if ml_flag == -1:
        score += 15
        reasons.append("Isolation Forest algorithm flagged user behavior as anomalous")
        
    # 11. Known device check
    if row.get('device_known', 1) == 0:
        score += 10
        reasons.append("Login from an unrecognized/unknown device")
        
    # 12. Digital Twin Deviation
    if row.get('file_access_count', 0) > row.get('baseline_file_access', 20) * 2.5:
        score += 15
        reasons.append(f"File access count ({row.get('file_access_count')}) is {row.get('file_access_count')/row.get('baseline_file_access',20):.1f}x normal baseline ({row.get('baseline_file_access')}/day)")
    if int(row.get('login_time', 9)) < 8 or int(row.get('login_time', 9)) > 19:
        score += 10
        reasons.append(f"Anomalous login hour ({int(row.get('login_time'))}:00) deviates from digital twin baseline")

    score = min(score, 100)
    if not reasons:
        reasons.append("No unusual behavior detected")
        
    return int(score), reasons

def calculate_exfil_prob(row):
    if row['username'] == 'ravi':
        return 92
    
    score = 0
    if row.get('usb_usage', 0) == 1:
        score += 35
    if row.get('downloads', 0) > 100:
        score += 25
    elif row.get('downloads', 0) > 20:
        score += 15
    if row.get('genai_upload_mb', 0) > 20:
        score += 20
    if row.get('external_uploads', 0) > 2:
        score += 15
    if row.get('email_attachments', 0) > 3:
        score += 10
    if row.get('printing_events', 0) > 1:
        score += 10
    if row.get('resignation_flag', 0) == 1:
        score += 15
    return min(99, max(5, score))

def get_recommendations(row, score, severity):
    recs = []
    
    if row.get('last_login_days_ago', 0) > 90:
        recs.append("Disable account immediately")
        recs.append("Force password reset")
        recs.append("Audit last active files accessed")
        return recs
        
    if severity == "🔴 Critical":
        recs.append("Lock account")
        recs.append("Notify manager")
        recs.append("Disable USB")
        recs.append("Monitor for 48 hours")
        recs.append("Revoke active OAuth tokens")
    elif severity == "🟠 High":
        recs.append("Lock account")
        recs.append("Notify manager")
        recs.append("Disable USB")
        recs.append("Monitor for 24 hours")
    elif severity == "🟡 Medium":
        recs.append("Require Multi-Factor Authentication (MFA) step-up")
        recs.append("Force password reset")
        recs.append("Flag for security supervisor audit")
    else:
        recs.append("No active recommendations - baseline monitored")
        
    return recs

def get_timeline_for_user(row):
    uname = row['username']
    timeline = []
    hr = int(row.get('login_time', 9))
    
    if uname == 'ravi':
        timeline.append(("09:15", "Baseline normal login expected", False))
        timeline.append(("23:40", "ACTUAL LOGIN (Unusual Hour: 11:40 PM, New Device)", True))
        timeline.append(("23:45", "Accessed Finance folder files (Unusual Collaboration)", True))
        timeline.append(("23:50", f"Mass download detected ({row['downloads']} files)", True))
        timeline.append(("23:55", f"Uploaded {row['genai_upload_mb']} MB to public ChatGPT (AI Leak Risk)", True))
    elif uname == 'rahul':
        timeline.append(("09:30", "Baseline normal login expected", False))
        timeline.append(("10:00", "Login detected (Office Desktop, Bengaluru)", False))
        timeline.append(("10:15", "Accessed Payroll Database (Privilege Misuse)", True))
        timeline.append(("10:30", "Accessed Finance Folder (Privilege Misuse)", True))
    elif uname == 'dormant_alice':
        timeline.append(("02:00", f"Login attempt on dormant account ({row['last_login_days_ago']} days inactive)", True))
        timeline.append(("02:05", f"Failed logins registered ({row['failed_logins']} attempts)", True))
        timeline.append(("02:10", "Accessed Sales Folder (Dormant Account Misuse)", True))
    elif uname == 'traveler_dan':
        timeline.append(("09:00", "Login detected from Bengaluru (Office Laptop)", False))
        timeline.append(("09:12", "Login detected from London (New Device, IP: 85.90.12.3)", True))
        timeline.append(("09:12", "Impossible Travel Flagged: 10 Hours travel required in 12 mins", True))
    elif uname == 'shared_sam':
        timeline.append(("14:00", "Login detected from Chrome (Windows, Mumbai IP: 103.45.12.1)", False))
        timeline.append(("14:02", "Login detected from Safari (macOS, Delhi IP: 122.160.8.4)", True))
        timeline.append(("14:02", "Credential Sharing Detected: Concurrent sessions from different devices/IPs", True))
    elif uname == 'burnout_eve':
        timeline.append(("09:30", "Baseline normal login expected", False))
        timeline.append(("23:00", "Late night login detected (Burnout risk pattern)", True))
        timeline.append(("23:05", f"Multiple failed login attempts ({row['failed_logins']} attempts)", True))
        timeline.append(("23:15", "Weekend data access logs verified", True))
    elif uname == 'shadow_it_ted':
        timeline.append(("09:00", "Baseline normal login expected", False))
        timeline.append(("11:00", "Login detected (Linux Workstation)", False))
        timeline.append(("11:15", "Launched unauthorized software: AnyDesk (Blocked)", True))
        timeline.append(("11:20", "Launched unauthorized software: TeamViewer (Blocked)", True))
        timeline.append(("11:30", "Blocked VPN connection attempt (Unknown VPN)", True))
    elif uname == 'ai_paste_pat':
        timeline.append(("09:00", "Baseline normal login expected", False))
        timeline.append(("10:00", "Login detected (Developer MacBook)", False))
        timeline.append(("10:15", f"Pasted source code to ChatGPT ({row['genai_upload_mb']} MB upload)", True))
        timeline.append(("10:30", "Copied sensitive intellectual property (AI Leak Risk)", True))
    elif uname == 'escalated_eric':
        timeline.append(("09:00", "Baseline normal login expected", False))
        timeline.append(("08:00", "Login detected (Helpdesk Terminal)", False))
        timeline.append(("08:15", "Privilege Escalation Detected: Role Yesterday (Employee) -> Role Today (Admin)", True))
        timeline.append(("08:20", "Accessed Active Directory & Domain Controller Logs (Unauthorized)", True))
    else:
        timeline.append((f"{hr:02d}:00", f"User logged in from {row.get('current_login_location', 'Office')}", False))
        if row.get('failed_logins', 0) > 0:
            timeline.append((f"{hr:02d}:05", f"Failed logins detected ({row['failed_logins']} attempts)", row['failed_logins'] > 2))
        if row.get('file_access_count', 0) > 20:
            timeline.append((f"{hr:02d}:15", f"Accessed {row['file_access_count']} files total", row['file_access_count'] > 50))
        if row.get('downloads', 0) > 10:
            timeline.append((f"{hr:02d}:20", f"Downloaded {row['downloads']} files", row['downloads'] > 50))
        if row.get('usb_usage', 0) == 1:
            timeline.append((f"{hr:02d}:25", "USB drive connected", True))
        if row.get('ai_risk_flag', 0) == 1:
            timeline.append((f"{hr:02d}:30", f"Sensitive data pasted to AI: {row.get('ai_risk_details', 'GenAI Upload')}", True))
        if row.get('privilege_escalation_flag', 0) == 1:
            timeline.append((f"{hr:02d}:35", "Privilege escalation detected", True))
            
    return timeline

def evaluate_all_users(df):
    ml_preds = fit_anomaly_model(df)
    scored_users = []
    
    for idx, row in df.iterrows():
        ml_flag = ml_preds[idx]
        score, reasons = calculate_risk(row, ml_flag)
        exfil_prob = calculate_exfil_prob(row)
        
        if score >= 80:
            priority = "P1"
            severity = "🔴 Critical"
        elif score >= 60:
            priority = "P2"
            severity = "🟠 High"
        elif score >= 30:
            priority = "P3"
            severity = "🟡 Medium"
        else:
            priority = "P4"
            severity = "🟢 Low"
            
        timeline = get_timeline_for_user(row)
        recs = get_recommendations(row, score, severity)
        
        user_scored = row.copy()
        user_scored['risk_score'] = score
        user_scored['severity'] = severity
        user_scored['priority'] = priority
        user_scored['exfil_probability'] = exfil_prob
        user_scored['reasons'] = reasons
        user_scored['timeline'] = timeline
        user_scored['recommendations'] = recs
        
        scored_users.append(user_scored)
        
    return pd.DataFrame(scored_users)

# -------------------------------
# 📁 SESSION DATA LOADER
# -------------------------------
def load_data():
    if "user_data" not in st.session_state:
        df = pd.DataFrame(default_users)
        df.to_csv("data.csv", index=False)
        st.session_state.user_data = df
    return st.session_state.user_data

def save_data(df):
    st.session_state.user_data = df
    df.to_csv("data.csv", index=False)

def reset_data():
    if "user_data" in st.session_state:
        del st.session_state.user_data
    load_data()

# -------------------------------
# 🔐 LOGIN SYSTEM
# -------------------------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    st.markdown("<div class='cyber-title'>🔐 ZeroTrustNet 3.0</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Enterprise Behavior Analytics & AI Security Copilot</div>", unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 1.5, 1])
    with col2:
        st.markdown("<div class='cyber-card'>", unsafe_allow_html=True)
        username = st.text_input("👤 Username")
        password = st.text_input("🔑 Password", type="password")
        
        if st.button("🚀 Secure Login"):
            if username.lower() == "admin" and password == "1234":
                st.session_state.logged_in = True
                st.success("✅ Access Granted. Initiating System...")
                time.sleep(0.5)
                st.rerun()
            else:
                st.error("❌ Invalid Credentials")
        st.markdown("</div>", unsafe_allow_html=True)
    st.stop()

# Load & evaluate current dataset state
raw_df = load_data()
evaluated_df = evaluate_all_users(raw_df)

# -------------------------------
# 📌 SIDEBAR NAVIGATION
# -------------------------------
st.sidebar.markdown("<h2 style='text-align:center; color:#00f5ff;'>🛡️ ZeroTrustNet 3.0</h2>", unsafe_allow_html=True)
st.sidebar.markdown("<p style='text-align:center; color:#8892b0; font-size:0.8rem;'>System: Operational ✔</p>", unsafe_allow_html=True)
st.sidebar.markdown("---", unsafe_allow_html=True)

menu = st.sidebar.selectbox(
    "Navigation",
    [
        "🏠 Executive Dashboard",
        "📊 Threat Detection & UBA",
        "🤖 AI Security Copilot",
        "⚡ Attack Simulation",
        "📈 Forecast & Analytics",
        "🔍 Check User (Sandbox)"
    ]
)

st.sidebar.markdown("---", unsafe_allow_html=True)
if st.sidebar.button("🔄 Reset Dataset"):
    reset_data()
    st.sidebar.success("Dataset Reset!")
    st.rerun()

if st.sidebar.button("🚪 Logout"):
    st.session_state.logged_in = False
    st.rerun()

# -------------------------------
# 🏠 EXECUTIVE DASHBOARD PAGE
# -------------------------------
if menu == "🏠 Executive Dashboard":
    st.markdown("<div class='cyber-title'>🏠 Executive Dashboard</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Corporate Security Posture & Exposure Metrics</div>", unsafe_allow_html=True)
    
    # Aggregations
    total_employees = len(evaluated_df)
    critical_count = len(evaluated_df[evaluated_df['severity'] == "🔴 Critical"])
    high_count = len(evaluated_df[evaluated_df['severity'] == "🟠 High"])
    medium_count = len(evaluated_df[evaluated_df['severity'] == "🟡 Medium"])
    safe_percent = int(((total_employees - (critical_count + high_count)) / total_employees) * 100)
    
    # Calculate Potential Data Loss (Business Impact Score)
    potential_data_loss = evaluated_df['business_impact_rupees'].sum()
    formatted_loss = f"₹{(potential_data_loss / 100000):,.1f} Lakhs" if potential_data_loss < 10000000 else f"₹{(potential_data_loss / 10000000):,.2f} Crore"
    if potential_data_loss == 0:
        formatted_loss = "₹0"
        
    # Calculate Security Posture Score (Feature 20)
    avg_risk = evaluated_df['risk_score'].mean()
    security_score = int(100 - (avg_risk * 0.35))
    
    # 4 Columns of Metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class='cyber-card'>
            <div class='metric-label'>Overall Security Score</div>
            <div class='metric-value'>{security_score}%</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
        <div class='cyber-card'>
            <div class='metric-label'>Employees Safe</div>
            <div class='metric-value'>{safe_percent}%</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col3:
        st.markdown(f"""
        <div class='cyber-card'>
            <div class='metric-label'>High/Critical Risk Users</div>
            <div class='metric-value'>{critical_count + high_count}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col4:
        st.markdown(f"""
        <div class='cyber-card'>
            <div class='metric-label'>Potential Financial Loss</div>
            <div class='metric-value'>{formatted_loss}</div>
        </div>
        """, unsafe_allow_html=True)

    # Main Grid
    c1, c2 = st.columns([1.6, 1])
    
    with c1:
        # Security Posture History Chart (Feature 20)
        st.subheader("📈 Security Posture History (Weekly Score)")
        posture_data = pd.DataFrame({
            "Day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday (Today)"],
            "Score": [92, 88, 95, 84, security_score]
        })
        st.line_chart(posture_data.set_index("Day")["Score"])
        
        # Threat Prioritization Panel (Feature 14)
        st.subheader("🚨 SOC Active Alerts & Prioritization")
        flagged_users = evaluated_df[evaluated_df['risk_score'] >= 30].sort_values(by="risk_score", ascending=False)
        
        if flagged_users.empty:
            st.success("✅ No active SOC alerts. All users baseline verified.")
        else:
            alert_list = []
            for _, row in flagged_users.iterrows():
                badge_type = row['severity'].split()[-1]
                priority = row['priority']
                desc = "Threat Flagged"
                if row['privilege_escalation_flag'] == 1:
                    desc = "Privilege Escalation Detected"
                elif row['impossible_travel_flag'] == 1:
                    desc = "Impossible Travel Flagged"
                elif row['ai_risk_flag'] == 1:
                    desc = "Sensitive IP Shared with Public AI"
                elif row['unusual_collaboration_flag'] == 1:
                    desc = "Privilege Misuse / Unusual Collaboration"
                elif row['credential_sharing_flag'] == 1:
                    desc = "Credential Sharing Flagged"
                elif row['burnout_stress_score'] > 70:
                    desc = "Critical Burnout Behavioral Deviation"
                elif row['last_login_days_ago'] > 90:
                    desc = "Dormant Account Reactivation"
                
                alert_list.append({
                    "Priority": priority,
                    "User": row['name'],
                    "Department": row['department'],
                    "Alert Details": desc,
                    "Risk Score": f"{row['risk_score']}/100",
                    "Severity": row['severity']
                })
            st.dataframe(pd.DataFrame(alert_list), use_container_width=True, hide_index=True)

    with c2:
        st.subheader("📌 Critical Incidents Spotlight")
        
        # Impossible Travel Box (Feature 4)
        traveler = evaluated_df[evaluated_df['impossible_travel_flag'] == 1]
        if not traveler.empty:
            for _, row in traveler.iterrows():
                st.markdown(f"""
                <div class='cyber-card' style='border-left: 4px solid #ef4444;'>
                    <span class='badge-critical'>Critical</span> <b>Impossible Travel Detected</b><br/>
                    <b>User:</b> {row['name']} ({row['department']})<br/>
                    <b>Travel Pattern:</b> {row['impossible_travel_details']}<br/>
                    <b>Risk Assessment:</b> Critical account takeover risk. Recommended: Lock account.
                </div>
                """, unsafe_allow_html=True)
                
        # Dormant account box (Feature 3)
        dormant = evaluated_df[evaluated_df['last_login_days_ago'] > 90]
        if not dormant.empty:
            for _, row in dormant.iterrows():
                st.markdown(f"""
                <div class='cyber-card' style='border-left: 4px solid #eab308;'>
                    <span class='badge-medium'>Medium</span> <b>Dormant Account Active</b><br/>
                    <b>User:</b> {row['name']} ({row['department']})<br/>
                    <b>Last Login:</b> {row['last_login_days_ago']} days ago<br/>
                    <b>Recommendation:</b> <span style='color:#eab308; font-weight:600;'>Disable Account</span>
                </div>
                """, unsafe_allow_html=True)
                
        # Privilege Escalation (Feature 10)
        priv_esc = evaluated_df[evaluated_df['privilege_escalation_flag'] == 1]
        if not priv_esc.empty:
            for _, row in priv_esc.iterrows():
                st.markdown(f"""
                <div class='cyber-card' style='border-left: 4px solid #ef4444;'>
                    <span class='badge-critical'>Critical</span> <b>Privilege Escalation Detected</b><br/>
                    <b>User:</b> {row['name']} ({row['department']})<br/>
                    <b>Signature:</b> Yesterday: Employee ➔ Today: Admin<br/>
                    <b>Potential Financial Exposure:</b> ₹{row['business_impact_rupees']:,}
                </div>
                """, unsafe_allow_html=True)

# -------------------------------
# 📊 THREAT DETECTION & UBA PAGE
# -------------------------------
elif menu == "📊 Threat Detection & UBA":
    st.markdown("<div class='cyber-title'>📊 Threat Detection & UBA</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>User Behavior Analytics & Digital Twin Baseline Comparisons</div>", unsafe_allow_html=True)
    
    # Summary Cards
    s1, s2, s3, s4 = st.columns(4)
    s1.metric("👥 Total Users Checked", len(evaluated_df))
    s2.metric("🔴 Critical Threats", len(evaluated_df[evaluated_df['severity'] == "🔴 Critical"]))
    s3.metric("🟠 High Threats", len(evaluated_df[evaluated_df['severity'] == "🟠 High"]))
    s4.metric("🟡 Medium Threats", len(evaluated_df[evaluated_df['severity'] == "🟡 Medium"]))
    
    st.markdown("---", unsafe_allow_html=True)
    
    # Table of all users
    st.subheader("📂 User Behavior Database")
    
    view_df = evaluated_df[[
        "username", "name", "department", "employee_type", "login_time", 
        "file_access_count", "downloads", "sensitive_files", "resignation_flag",
        "genai_upload_mb", "risk_score", "severity", "priority"
    ]].rename(columns={
        "username": "Username",
        "name": "Name",
        "department": "Department",
        "employee_type": "Role",
        "login_time": "Login Hour",
        "file_access_count": "File Access",
        "downloads": "Downloads",
        "sensitive_files": "Sensitive Files",
        "resignation_flag": "Notice Period",
        "genai_upload_mb": "AI Upload (MB)",
        "risk_score": "Risk Score",
        "severity": "Severity",
        "priority": "SOC Priority"
    })
    
    st.dataframe(view_df, use_container_width=True, hide_index=True)
    
    # Interactive User Drilldown Selector
    st.subheader("🔍 Employee Digital Twin Drilldown")
    selected_name = st.selectbox("Select Employee to Inspect Details & Digital Twin", evaluated_df['name'].unique())
    user_row = evaluated_df[evaluated_df['name'] == selected_name].iloc[0]
    
    st.markdown("---", unsafe_allow_html=True)
    
    d1, d2 = st.columns(2)
    
    with d1:
        # Employee Digital Twin comparison card (Feature 12)
        st.subheader("👥 Behavioral baseline (Digital Twin)")
        st.markdown(f"""
        <div class='cyber-card' style='border-left: 4px solid #00f5ff;'>
            <h4>Employee Profile: {user_row['name']} ({user_row['department']})</h4>
            <hr style='border-color:rgba(0, 245, 255, 0.2);'/>
            <table style='width:100%; border-collapse: collapse;'>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.1);'>
                    <th style='text-align:left; padding:8px 0;'>Behavior Metrics</th>
                    <th style='text-align:center; padding:8px 0; color:#8892b0;'>Digital Twin Baseline</th>
                    <th style='text-align:center; padding:8px 0; color:#00f5ff;'>Actual Behavior Today</th>
                </tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'>
                    <td style='padding:8px 0; font-weight:600;'>Login Time</td>
                    <td style='text-align:center;'>{user_row['baseline_login_time']}</td>
                    <td style='text-align:center; color:{'#ef4444' if (int(user_row['login_time']) < 8 or int(user_row['login_time']) > 19) else '#22c55e'};'>{int(user_row['login_time'])}:00</td>
                </tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'>
                    <td style='padding:8px 0; font-weight:600;'>Device</td>
                    <td style='text-align:center;'>{user_row['baseline_device']}</td>
                    <td style='text-align:center; color:{'#ef4444' if user_row['device_known']==0 else '#22c55e'};'>{'Office Laptop' if user_row['device_known']==1 else 'New / Unregistered Device'}</td>
                </tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'>
                    <td style='padding:8px 0; font-weight:600;'>Geographic Location</td>
                    <td style='text-align:center;'>{user_row['baseline_location']}</td>
                    <td style='text-align:center; color:{'#ef4444' if user_row['impossible_travel_flag']==1 else '#22c55e'};'>{user_row['current_login_location']}</td>
                </tr>
                <tr>
                    <td style='padding:8px 0; font-weight:600;'>File Access Rate</td>
                    <td style='text-align:center;'>{user_row['baseline_file_access']}/day</td>
                    <td style='text-align:center; color:{'#ef4444' if user_row['file_access_count'] > user_row['baseline_file_access']*2.5 else '#22c55e'};'>{user_row['file_access_count']}/day</td>
                </tr>
            </table>
        </div>
        """, unsafe_allow_html=True)
        
        # Privilege Misuse Monitor (Feature 1, 9)
        st.subheader("📂 Privilege Misuse Monitor")
        accessed = [f.strip() for f in user_row['accessed_folders'].split(",") if f.strip()]
        expected = [f.strip() for f in user_row['expected_folders'].split(",") if f.strip()]
        
        misuse_found = False
        st.markdown("<div class='cyber-card'>", unsafe_allow_html=True)
        st.markdown(f"<b>Employee:</b> {user_row['name']} | <b>Department:</b> {user_row['department']}")
        st.markdown("<div style='margin-top:10px;'><b>Accessed Folder Log:</b></div>", unsafe_allow_html=True)
        
        for folder in accessed:
            if folder in expected:
                st.markdown(f"<span style='color:#22c55e;'>✔ {folder}</span> (Expected Access)", unsafe_allow_html=True)
            else:
                st.markdown(f"<span style='color:#ef4444; font-weight:bold;'>✖ {folder}</span> (UNEXPECTED ACCESS - Privilege Misuse Risk)", unsafe_allow_html=True)
                misuse_found = True
                
        st.markdown("<div style='margin-top:10px;'><b>Expected Access Permissions:</b></div>", unsafe_allow_html=True)
        for folder in expected:
            st.markdown(f"- {folder}")
            
        if misuse_found:
            st.markdown("<div style='margin-top:10px; padding:8px; background:rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius:6px; color:#ef4444; font-weight:600;'>🚨 Privilege Misuse Detected: Employee accessed data outside role bounds.</div>", unsafe_allow_html=True)
        else:
            st.markdown("<div style='margin-top:10px; padding:8px; background:rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius:6px; color:#22c55e; font-weight:600;'>✅ Permissions Compliance: No folders outside expected baseline accessed.</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with d2:
        # Reconstructed Session Timeline (Feature 8, 18)
        st.subheader("🕒 Incident Session Timeline")
        st.markdown("<div class='cyber-card'>", unsafe_allow_html=True)
        for time_stamp, event_desc, flagged in user_row['timeline']:
            cl = "timeline-item flagged" if flagged else "timeline-item"
            t_badge = "🔴" if flagged else "🟢"
            st.markdown(f"""
            <div class='{cl}'>
                <span class='timeline-time'>{time_stamp}</span><br/>
                <span>{t_badge} {event_desc}</span>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        # Behavioral Explainability & MITRE ATT&CK Maps (Feature 18, 19)
        st.subheader("🧠 Explainable AI & MITRE ATT&CK Mapping")
        st.markdown("<div class='cyber-card'>", unsafe_allow_html=True)
        st.markdown("<b>Risk Indicators Flagged:</b>")
        for reason in user_row['reasons']:
            st.markdown(f"- ✓ {reason}")
            
        st.markdown("---")
        if user_row['mitre_techniques'] != "None":
            st.markdown(f"""
            <div style='background:rgba(0, 245, 255, 0.08); border: 1px solid rgba(0, 245, 255, 0.3); padding:10px; border-radius:6px;'>
                <b>MITRE ATT&CK Mapping:</b><br/>
                <b>Technique:</b> {user_row['mitre_techniques']}<br/>
                <b>Attacker Tactic:</b> Exfiltration / Privilege Escalation<br/>
                <b>Engine Confidence Score:</b> {user_row['mitre_confidence']}%
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("<b>MITRE ATT&CK Mapping:</b> No hostile ATT&CK signatures matched.")
        st.markdown("</div>", unsafe_allow_html=True)

# -------------------------------
# 🤖 AI SECURITY COPILOT PAGE
# -------------------------------
elif menu == "🤖 AI Security Copilot":
    st.markdown("<div class='cyber-title'>🤖 AI Security Copilot</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Automated Incident Summarization & Playbook Recommendations</div>", unsafe_allow_html=True)
    
    selected_copilot_name = st.selectbox("Select Employee to analyze with Copilot", evaluated_df['name'].unique())
    user_data = evaluated_df[evaluated_df['name'] == selected_copilot_name].iloc[0]
    
    st.markdown("---", unsafe_allow_html=True)
    
    c1, c2 = st.columns([1.5, 1])
    
    with c1:
        st.markdown(f"""
        <div class='copilot-section'>
            <h3 style='color:#00f5ff; margin-top:0;'>🤖 Copilot Real-time Assessment Summary</h3>
            <p><b>Employee:</b> {user_data['name']} | <b>Role:</b> {user_data['employee_type']}</p>
            <hr style='border-color:rgba(0, 245, 255, 0.2);'/>
            <div style='display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;'>
                <div class='cyber-card' style='margin-bottom:0;'>
                    <div class='metric-label'>Risk Score</div>
                    <div class='metric-value'>{user_data['risk_score']}/100</div>
                </div>
                <div class='cyber-card' style='margin-bottom:0;'>
                    <div class='metric-label'>Threat Severity</div>
                    <div class='metric-value' style='color:{'#ef4444' if user_data['risk_score']>=80 else '#f97316' if user_data['risk_score']>=60 else '#eab308' if user_data['risk_score']>=30 else '#22c55e'};'>{user_data['severity']}</div>
                </div>
                <div class='cyber-card' style='margin-bottom:0;'>
                    <div class='metric-label'>Potential Loss</div>
                    <div class='metric-value'>₹{user_data['business_impact_rupees']:,}</div>
                </div>
                <div class='cyber-card' style='margin-bottom:0;'>
                    <div class='metric-label'>Data Theft Prob.</div>
                    <div class='metric-value'>{user_data['exfil_probability']}%</div>
                </div>
            </div>
            
            <p><b>Behavioral Reasons Flagged:</b></p>
            <ul style='line-height:1.6;'>
        """, unsafe_allow_html=True)
        
        for reason in user_data['reasons']:
            st.markdown(f"<li style='color:#e2e8f0;'>{reason}</li>", unsafe_allow_html=True)
            
        st.markdown("""
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        # Interactive Q&A (Feature 21 extension)
        st.subheader("💬 Ask Copilot about this Employee")
        user_query = st.text_input("Type question (e.g. 'What is the business impact?' or 'Explain the MITRE alignment')")
        
        if user_query:
            response = ""
            q = user_query.lower()
            if "impact" in q or "financial" in q or "rupee" in q:
                response = f"The potential financial loss for {user_data['name']} is estimated at ₹{user_data['business_impact_rupees']:,}. This is calculated based on their access to files in the '{user_data['accessed_folders']}' folders, which have high confidentiality ratings for the {user_data['department']} department."
            elif "mitre" in q or "technique" in q or "attack" in q:
                if user_data['mitre_techniques'] != "None":
                    response = f"{user_data['name']}'s anomalous activity aligns with MITRE ATT&CK Technique {user_data['mitre_techniques']}. We detected indicators with {user_data['mitre_confidence']}% confidence. This matches tactics for Data Exfiltration and Privilege Misuse."
                else:
                    response = f"There are no active hostile MITRE ATT&CK techniques matched for {user_data['name']}. Their behavior is currently within standard technical profiles, although minor deviations were evaluated."
            elif "recommend" in q or "action" in q or "do next" in q:
                response = f"For {user_data['name']} (Risk Score: {user_data['risk_score']}), I recommend following these specific actions immediately: " + ", ".join(user_data['recommendations']) + f". Also, notify their supervisor in the {user_data['department']} department."
            else:
                response = f"Based on the ZeroTrustNet 3.0 analysis of {user_data['name']}, they are flagged at {user_data['severity']} risk with a score of {user_data['risk_score']}/100. This evaluation is driven by: " + "; ".join(user_data['reasons']) + f". The AI model projects a data theft probability of {user_data['exfil_probability']}%."
                
            st.markdown(f"""
            <div style='background:rgba(0, 245, 255, 0.08); border:1px solid #00f5ff; border-radius:8px; padding:15px; margin-top:10px;'>
                <b style='color:#00f5ff;'>🤖 Copilot Response:</b><br/>{response}
            </div>
            """, unsafe_allow_html=True)

    with c2:
        st.subheader("🛡️ AI Recommendation Engine (Runbook)")
        st.markdown("<div class='cyber-card'>", unsafe_allow_html=True)
        st.markdown(f"Suggested playbook for <b>{user_data['name']}</b>:")
        
        for rec in user_data['recommendations']:
            st.markdown(f"✔ <b style='color:#ef4444;'>{rec}</b>", unsafe_allow_html=True)
            
        st.markdown("---")
        st.markdown("<b>MITRE ATT&CK Mapping Details:</b>")
        if user_data['mitre_techniques'] != "None":
            st.markdown(f"""
            <div style='background:rgba(239, 68, 68, 0.1); border:1px solid #ef4444; border-radius:6px; padding:10px;'>
                <b>Technique:</b> {user_data['mitre_techniques']}<br/>
                <b>Tactic:</b> Exfiltration / Credential Exploits<br/>
                <b>Confidence:</b> {user_data['mitre_confidence']}%
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("No severe MITRE signatures mapped.")
        st.markdown("</div>", unsafe_allow_html=True)

# -------------------------------
# ⚡ ATTACK SIMULATION PAGE
# -------------------------------
elif menu == "⚡ Attack Simulation":
    st.markdown("<div class='cyber-title'>⚡ Attack Simulation</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Inject Anomaly Signatures to Test Real-time Risk Calculations</div>", unsafe_allow_html=True)
    
    st.markdown("""
    Select an employee and choose an attack vector to inject. The dynamic risk engine will immediately 
    recalculate scores, update explainability reasons, trigger alarms, and generate mitigation playbooks.
    """)
    
    target_user_name = st.selectbox("Select Target Employee for Attack Simulation", raw_df['name'].unique())
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Simulate Attack Vector")
        
        if st.button("🔌 Simulate USB Exfiltration Attack"):
            df_copy = raw_df.copy()
            idx = df_copy[df_copy['name'] == target_user_name].index[0]
            
            df_copy.at[idx, 'usb_usage'] = 1
            df_copy.at[idx, 'downloads'] = 280
            df_copy.at[idx, 'sensitive_files'] = 14
            df_copy.at[idx, 'resignation_flag'] = 1
            df_copy.at[idx, 'business_impact_rupees'] = 1100000
            df_copy.at[idx, 'mitre_techniques'] = "T1005 (Data from Local System), T1052.001 (Exfiltration over USB)"
            df_copy.at[idx, 'mitre_confidence'] = 98
            
            save_data(df_copy)
            st.success(f"🔥 USB Exfiltration attack injected successfully on {target_user_name}!")
            time.sleep(0.5)
            st.rerun()
            
        if st.button("🎣 Simulate Phishing & Credential Theft"):
            df_copy = raw_df.copy()
            idx = df_copy[df_copy['name'] == target_user_name].index[0]
            
            df_copy.at[idx, 'device_known'] = 0
            df_copy.at[idx, 'failed_logins'] = 6
            df_copy.at[idx, 'login_time'] = 3
            df_copy.at[idx, 'current_login_location'] = "North Korea"
            df_copy.at[idx, 'mitre_techniques'] = "T1078 (Valid Accounts), T1110 (Brute Force)"
            df_copy.at[idx, 'mitre_confidence'] = 92
            
            save_data(df_copy)
            st.success(f"🔥 Phishing & Credential Theft injected on {target_user_name}!")
            time.sleep(0.5)
            st.rerun()
            
        if st.button("🔑 Simulate Privilege Escalation"):
            df_copy = raw_df.copy()
            idx = df_copy[df_copy['name'] == target_user_name].index[0]
            
            df_copy.at[idx, 'privilege_escalation_flag'] = 1
            df_copy.at[idx, 'privilege_escalation_details'] = "Role Yesterday: Employee, Role Today: Admin"
            df_copy.at[idx, 'accessed_folders'] = df_copy.at[idx, 'accessed_folders'] + ", Active Directory, Domain Controller"
            df_copy.at[idx, 'business_impact_rupees'] = 2400000
            df_copy.at[idx, 'mitre_techniques'] = "T1078 (Valid Accounts), T1098 (Account Manipulation)"
            df_copy.at[idx, 'mitre_confidence'] = 95
            
            save_data(df_copy)
            st.success(f"🔥 Privilege Escalation injected on {target_user_name}!")
            time.sleep(0.5)
            st.rerun()
            
        if st.button("🌐 Simulate Shadow IT & GenAI Paste"):
            df_copy = raw_df.copy()
            idx = df_copy[df_copy['name'] == target_user_name].index[0]
            
            df_copy.at[idx, 'genai_upload_mb'] = 112.5
            df_copy.at[idx, 'shadow_it_flag'] = 1
            df_copy.at[idx, 'shadow_it_details'] = "AnyDesk (Blocked), Unknown VPN (Blocked)"
            df_copy.at[idx, 'ai_risk_flag'] = 1
            df_copy.at[idx, 'ai_risk_details'] = "Sensitive source code pasted to ChatGPT & Gemini"
            df_copy.at[idx, 'business_impact_rupees'] = 1600000
            df_copy.at[idx, 'mitre_techniques'] = "T1567.002 (Exfiltration to Cloud Services)"
            df_copy.at[idx, 'mitre_confidence'] = 94
            
            save_data(df_copy)
            st.success(f"🔥 Shadow IT & AI leak simulation injected on {target_user_name}!")
            time.sleep(0.5)
            st.rerun()

    with col2:
        st.subheader("Current Recalibrated Status")
        
        selected_live_data = evaluated_df[evaluated_df['name'] == target_user_name].iloc[0]
        
        st.markdown(f"""
        <div class='cyber-card' style='border-left: 4px solid #00f5ff;'>
            <h4>Employee: {selected_live_data['name']}</h4>
            <b>Dynamic Risk Score:</b> {selected_live_data['risk_score']}/100<br/>
            <b>Threat Severity:</b> {selected_live_data['severity']}<br/>
            <b>Potential Financial Exposure:</b> ₹{selected_live_data['business_impact_rupees']:,}<br/>
            <b>Data Theft Probability:</b> {selected_live_data['exfil_probability']}%<br/>
            <b>MITRE Techniques Mapped:</b> {selected_live_data['mitre_techniques']}
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("🚨 Reset Target Employee Baseline"):
            df_copy = raw_df.copy()
            original_user = next(item for item in default_users if item["name"] == target_user_name)
            idx = df_copy[df_copy['name'] == target_user_name].index[0]
            
            for key, val in original_user.items():
                df_copy.at[idx, key] = val
                
            save_data(df_copy)
            st.success(f"Baseline restored for {target_user_name}!")
            time.sleep(0.5)
            st.rerun()

# -------------------------------
# 📈 FORECAST & ANALYTICS PAGE
# -------------------------------
elif menu == "📈 Forecast & Analytics":
    st.markdown("<div class='cyber-title'>📈 Forecast & Analytics</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Machine Learning Anomaly Distributions & Risk Forecasting</div>", unsafe_allow_html=True)
    
    f1, f2 = st.columns(2)
    
    with f1:
        # Insider Threat Forecast (Feature 11)
        st.subheader("🔮 Insider Threat Forecast (Next Month Projection)")
        st.write("Forecast model predicts the probability of an employee triggering insider alerts over the next month.")
        
        forecast_users = evaluated_df[evaluated_df['risk_score'] >= 25].sort_values(by="risk_score", ascending=False)
        
        if forecast_users.empty:
            st.info("No users currently meet risk threshold for projections.")
        else:
            chart_data = {}
            for _, row in forecast_users.iterrows():
                chart_data[row['name']] = [row['forecast_today'], row['forecast_next_week'], row['forecast_next_month']]
                
            chart_df = pd.DataFrame(chart_data, index=["Today", "Next Week", "Next Month"])
            st.line_chart(chart_df)
            
        # Insider Burnout Prediction (Feature 6)
        st.subheader("🧠 Insider Burnout / Stress Predictor")
        burnout_df = evaluated_df[evaluated_df['burnout_stress_score'] > 0][['name', 'department', 'burnout_stress_score', 'burnout_details']]
        
        if not burnout_df.empty:
            burnout_df.rename(columns={
                "name": "Employee",
                "department": "Department",
                "burnout_stress_score": "Stress Score (%)",
                "burnout_details": "Behavioral Indicators"
            }, inplace=True)
            st.dataframe(burnout_df, use_container_width=True, hide_index=True)
            st.caption("Stress score is an indicator of risk due to increased fatigue/logins, not a medical evaluation.")
        else:
            st.success("No employee burnout patterns detected.")

    with f2:
        # Data Exfiltration Risk distributions (Feature 2)
        st.subheader("📊 File Downloads vs. GenAI Uploads")
        st.scatter_chart(evaluated_df, x="downloads", y="genai_upload_mb", color="severity")
        
        st.subheader("📊 Risk Distribution across Departments")
        dept_risk = evaluated_df.groupby("department")["risk_score"].mean().reset_index()
        st.bar_chart(dept_risk.set_index("department")["risk_score"])
        
        # Business Impact details (Feature 13)
        st.subheader("₹ Potential Financial Loss Exposure")
        exposure_df = evaluated_df[evaluated_df['business_impact_rupees'] > 0][['name', 'department', 'business_impact_rupees']]
        if not exposure_df.empty:
            exposure_df.rename(columns={
                "name": "Employee",
                "department": "Department",
                "business_impact_rupees": "Potential Loss (₹)"
            }, inplace=True)
            st.dataframe(exposure_df.sort_values("Potential Loss (₹)", ascending=False), use_container_width=True, hide_index=True)
        else:
            st.info("No financial exposure logged.")

# -------------------------------
# 🔍 CHECK USER SANDBOX PAGE
# -------------------------------
elif menu == "🔍 Check User (Sandbox)":
    st.markdown("<div class='cyber-title'>🔍 Check User Activity</div>", unsafe_allow_html=True)
    st.markdown("<div class='cyber-subtitle'>Manual Behavior Risk Assessment Simulator</div>", unsafe_allow_html=True)
    
    st.markdown("""
    Fill out behavior parameters below to test the dynamic scoring logic and evaluate a user sandbox scenario.
    """)
    
    c1, c2, c3 = st.columns(3)
    
    with c1:
        sandbox_login_time = st.number_input("Login Time Hour (0-23)", 0, 23, 10)
        sandbox_failed_logins = st.number_input("Failed Login Attempts", 0, 20, 0)
        sandbox_device_known = st.selectbox("Device Recognized?", ["Yes", "No"]) == "Yes"
        sandbox_resignation = st.checkbox("Employee in Notice Period / Resigned?")
        
    with c2:
        sandbox_file_access = st.number_input("File Access Count", 0, 500, 15)
        sandbox_downloads = st.number_input("Download Volume Count", 0, 500, 5)
        sandbox_sensitive = st.number_input("Sensitive Files Accessed", 0, 50, 0)
        sandbox_unusual_collab = st.checkbox("Accessing unauthorized department folders?")
        
    with c3:
        sandbox_genai = st.number_input("GenAI Tool Uploads (MB)", 0.0, 500.0, 0.0)
        sandbox_external = st.number_input("External Upload Events Count", 0, 50, 0)
        sandbox_usb = st.checkbox("USB Flash Drive Connected?")
        sandbox_priv_esc = st.checkbox("Privilege Escalation Signature Detected?")
        
    if st.button("🔮 Calculate Risk Score"):
        candidate = {
            "username": "sandbox_user",
            "name": "Sandbox Tester",
            "department": "Engineering",
            "employee_type": "Employee",
            "login_time": sandbox_login_time,
            "file_access_count": sandbox_file_access,
            "failed_logins": sandbox_failed_logins,
            "device_known": 1 if sandbox_device_known else 0,
            "downloads": sandbox_downloads,
            "sensitive_files": sandbox_sensitive,
            "resignation_flag": 1 if sandbox_resignation else 0,
            "genai_upload_mb": sandbox_genai,
            "external_uploads": sandbox_external,
            "usb_usage": 1 if sandbox_usb else 0,
            "email_attachments": 0,
            "printing_events": 0,
            "last_login_days_ago": 0,
            "last_login_location": "Bengaluru",
            "current_login_location": "Bengaluru",
            "impossible_travel_flag": 0,
            "credential_sharing_flag": 0,
            "burnout_stress_score": 0,
            "shadow_it_flag": 0,
            "ai_risk_flag": 1 if sandbox_genai > 20 else 0,
            "ai_risk_details": "Sensitive document copied to AI Tool" if sandbox_genai > 20 else "",
            "unusual_collaboration_flag": 1 if sandbox_unusual_collab else 0,
            "unusual_collaboration_details": "Marketing employee accessing Finance folder" if sandbox_unusual_collab else "",
            "privilege_escalation_flag": 1 if sandbox_priv_esc else 0,
            "privilege_escalation_details": "Role Yesterday: Employee, Role Today: Admin" if sandbox_priv_esc else "",
            "baseline_file_access": 20,
            "baseline_login_time": "09:00",
            "baseline_device": "Office Laptop",
            "baseline_location": "Bengaluru"
        }
        
        combined_df = raw_df.copy()
        combined_df = pd.concat([combined_df, pd.DataFrame([candidate])], ignore_index=True)
        evaluated_combined = evaluate_all_users(combined_df)
        sandbox_scored = evaluated_combined.iloc[-1]
        
        severity_color = {
            "🔴 Critical": "#ef4444", 
            "🟠 High": "#f97316",
            "🟡 Medium": "#eab308", 
            "🟢 Low": "#22c55e"
        }.get(sandbox_scored['severity'], "#444")
        
        st.markdown("---")
        st.markdown(f"""
        <div class="cyber-card" style="border-left: 6px solid {severity_color};">
            <h3>Risk Analysis Result</h3>
            <b>Risk Score:</b> {sandbox_scored['risk_score']} / 100<br/>
            <b>Threat Severity:</b> {sandbox_scored['severity']}<br/>
            <b>Data Theft Probability:</b> {sandbox_scored['exfil_probability']}%
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("<b>Flagged Risk Explanations:</b>")
        for reason in sandbox_scored['reasons']:
            st.markdown(f"- ✓ {reason}")
            
        st.markdown("<b>Suggested Actions:</b>")
        for rec in sandbox_scored['recommendations']:
            st.markdown(f"- ✓ {rec}")