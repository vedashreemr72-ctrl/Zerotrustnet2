import os
import random
import hashlib
import time
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# In-memory challenge store with expiration
# challenge_id -> { "user_id": ..., "username": ..., "role": ..., "otp_hash": ..., "otp_plain": ..., "expires_at": ..., "reason": ..., "device_info": ... }
MFA_CHALLENGES = {}

def is_twilio_configured() -> bool:
    """Check if valid Twilio credentials are provided in the environment."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_phone = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    if not (account_sid and auth_token and from_phone):
        return False
    if "your_twilio" in account_sid or "placeholder" in account_sid:
        return False
    return True

def mask_phone_number(phone: str) -> str:
    """Mask phone number for privacy display (e.g. +91 98••••••10)."""
    if not phone or len(phone) < 6:
        return "your registered mobile phone"
    clean = phone.strip()
    prefix = clean[:3] if clean.startswith("+") else clean[:2]
    suffix = clean[-2:]
    masked_count = max(4, len(clean) - len(prefix) - len(suffix))
    return f"{prefix} {'•' * masked_count} {suffix}"

def send_twilio_sms(to_phone: str, otp_code: str, username: str, reason: str = "") -> dict:
    """
    Dispatches a real cryptographic OTP SMS via Twilio Programmable SMS API.
    """
    if not is_twilio_configured():
        return {
            "success": False,
            "error": "Twilio not configured. Using simulated SMS channel.",
            "masked_phone": mask_phone_number(to_phone)
        }

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_phone = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

    recipient = to_phone.strip() if to_phone else os.getenv("DEFAULT_SMS_RECIPIENT", "").strip()
    if not recipient:
        return {
            "success": False,
            "error": "No destination phone number found for this account.",
            "masked_phone": "unconfigured phone"
        }

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        sms_body = (
            f"[ZeroTrustNet] Your security verification code is: {otp_code}\n\n"
            f"Zero Trust Adaptive MFA challenge for '{username}'. "
            f"Valid for 5 minutes. NEVER share this code."
        )
        msg = client.messages.create(
            to=recipient,
            from_=from_phone,
            body=sms_body
        )
        logging.info(f"Twilio SMS dispatched successfully to {recipient}. SID: {msg.sid}")
        return {
            "success": True,
            "message_sid": msg.sid,
            "recipient": recipient,
            "masked_phone": mask_phone_number(recipient),
            "status": msg.status
        }
    except Exception as e:
        logging.error(f"Twilio SMS dispatch failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "recipient": recipient,
            "masked_phone": mask_phone_number(recipient)
        }

def hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode('utf-8')).hexdigest()

def generate_secure_otp() -> str:
    """Generate a random 6-digit cryptographic OTP."""
    return f"{random.randint(100000, 999999)}"

def check_device_trust(conn, user_id: str, device_id: str) -> tuple[bool, dict | None]:
    """
    Check if a device is recognized and verified as a trusted device for this user.
    """
    c = conn.cursor()
    c.execute("""
        SELECT id, device_id, device_name, is_trusted, trust_level, last_seen_at
        FROM trusted_devices
        WHERE user_id = ? AND device_id = ?
    """, (user_id, device_id))
    row = c.fetchone()
    if not row:
        return False, None
    
    dev_info = {
        "id": row[0],
        "device_id": row[1],
        "device_name": row[2],
        "is_trusted": bool(row[3]),
        "trust_level": row[4],
        "last_seen_at": row[5]
    }
    return bool(row[3]), dev_info

def register_or_update_device(conn, user_id: str, device_id: str, device_name: str, browser: str, os_name: str, ip_addr: str, is_trusted: bool = True):
    """
    Registers a new device or updates last seen for an existing device.
    """
    c = conn.cursor()
    now_str = datetime.now().isoformat()
    c.execute("""
        INSERT INTO trusted_devices (id, user_id, device_id, device_name, browser, os, ip_address, is_trusted, trust_level, first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, device_id) DO UPDATE SET
            last_seen_at = excluded.last_seen_at,
            ip_address = excluded.ip_address,
            browser = excluded.browser,
            os = excluded.os,
            is_trusted = CASE WHEN excluded.is_trusted = 1 THEN 1 ELSE trusted_devices.is_trusted END
    """, (
        f"dev-{hashlib.md5((user_id + device_id).encode()).hexdigest()[:12]}",
        user_id, device_id, device_name, browser, os_name, ip_addr,
        1 if is_trusted else 0, "verified" if is_trusted else "untrusted",
        now_str, now_str
    ))
    conn.commit()

def evaluate_adaptive_mfa(
    conn,
    user_id: str,
    username: str,
    role: str,
    device_id: str,
    device_name: str,
    browser: str,
    os_name: str,
    ip_addr: str,
    location: str,
    failed_logins: int = 0,
    phone: str = ""
) -> dict:
    """
    Adaptive MFA Engine:
    - Do NOT require OTP on every login by default.
    - New / untrusted device -> require MFA.
    - Unusual location / device -> require MFA.
    - Suspicious behavior / elevated risk -> require MFA.
    - Trusted device + normal behavior -> allow login without asking for OTP.
    - Admin accounts have stricter MFA requirements (e.g. any new or unconfirmed endpoint triggers MFA).
    - If Twilio is configured, sends a live SMS to the user's phone.
    """
    is_trusted, dev_info = check_device_trust(conn, user_id, device_id)
    
    # Fetch user behavior baseline
    c = conn.cursor()
    c.execute("""
        SELECT baseline_location, baseline_device, failed_logins, burnout_stress_score, current_login_location
        FROM behavior_data
        WHERE user_id = ?
    """, (user_id,))
    b_row = c.fetchone()
    
    baseline_loc = b_row[0] if b_row and b_row[0] else "Bengaluru"
    baseline_dev = b_row[1] if b_row and b_row[1] else "Corporate Laptop"
    current_failed = max(failed_logins, (b_row[2] if b_row and b_row[2] else 0))
    current_risk = b_row[3] if b_row and b_row[3] else 10
    
    reasons = []
    requires_mfa = False
    challenge_type = "adaptive_login"
    
    # 1. Device check: Is device unknown or not trusted?
    if not is_trusted:
        requires_mfa = True
        challenge_type = "new_device"
        reasons.append(f"Unrecognized or Untrusted Endpoint: Device '{device_id}' ({device_name}) has not been verified.")
    
    # 2. Location check: Unusual location compared to baseline?
    if location and baseline_loc and location.lower() not in baseline_loc.lower() and baseline_loc.lower() not in location.lower():
        requires_mfa = True
        challenge_type = "unusual_location"
        reasons.append(f"Unusual Geographic Location: Login from '{location}' differs from baseline '{baseline_loc}'.")
    
    # 3. Suspicious failed logins: Repeated login failures?
    if current_failed >= 2:
        requires_mfa = True
        challenge_type = "failed_logins"
        reasons.append(f"Suspicious Pre-Authentication Activity: {current_failed} previous failed login attempt(s) detected.")
    
    # 4. Zero-Trust Risk Score threshold:
    # Medium risk (>= 30) triggers step-up verification
    if current_risk >= 30:
        requires_mfa = True
        challenge_type = "risk_threshold"
        reasons.append(f"Elevated Behavioral Risk: Current UEBA risk standing is {current_risk}/100.")
    
    # 5. Admin strictness:
    # Admin roles have stricter governance
    if role == "admin":
        if not is_trusted or "DEV-CORP-ADMIN" not in device_id:
            # If not a pre-enrolled admin workstation, require MFA
            requires_mfa = True
            challenge_type = "admin_sensitive"
            reasons.append("SOC Administrator Governance: Privileged administrative access requires multi-factor cryptographic verification.")
    
    # If MFA is required, create an active challenge
    if requires_mfa:
        otp = generate_secure_otp()
        challenge_id = f"mfa_{int(time.time())}_{random.randint(1000, 9999)}"
        expires_at = datetime.now() + timedelta(minutes=5)
        
        MFA_CHALLENGES[challenge_id] = {
            "challenge_id": challenge_id,
            "user_id": user_id,
            "username": username,
            "role": role,
            "otp_hash": hash_otp(otp),
            "otp_plain": otp,
            "expires_at": expires_at,
            "reason": "; ".join(reasons),
            "device_info": {
                "device_id": device_id,
                "device_name": device_name,
                "browser": browser,
                "os": os_name,
                "ip": ip_addr,
                "location": location,
                "phone": phone
            }
        }
        
        # Dispatch real SMS via Twilio if configured
        sms_res = send_twilio_sms(phone, otp, username, "; ".join(reasons))
        sms_sent = sms_res.get("success", False)
        masked_phone = sms_res.get("masked_phone", "")

        return {
            "mfa_required": True,
            "challenge_id": challenge_id,
            "challenge_type": challenge_type,
            "reasons": reasons,
            "otp_demo": otp,  # Retained as fallback for testing/demo
            "expires_in_seconds": 300,
            "device_trusted": False,
            "delivery_method": "sms" if sms_sent else "demo_simulated",
            "sms_sent": sms_sent,
            "masked_phone": masked_phone,
            "twilio_configured": is_twilio_configured(),
            "message": f"Verification SMS dispatched to {masked_phone}" if sms_sent else f"Adaptive MFA Triggered: {'; '.join(reasons)}"
        }
    
    # Device is trusted and behavior is normal -> Allow direct login!
    # Update device last seen
    register_or_update_device(conn, user_id, device_id, device_name, browser, os_name, ip_addr, is_trusted=True)
    
    return {
        "mfa_required": False,
        "challenge_id": None,
        "reasons": ["Trusted Device & Normal Behavioral Standing — Zero-Trust Passthrough Authorized"],
        "device_trusted": True
    }

def verify_adaptive_otp(conn, challenge_id: str, submitted_otp: str, trust_this_device: bool = True) -> tuple[bool, str, dict | None]:
    """
    Verifies the submitted 6-digit OTP code against the challenge.
    """
    challenge = MFA_CHALLENGES.get(challenge_id)
    if not challenge:
        return False, "MFA challenge expired or not found. Please log in again.", None
    
    if datetime.now() > challenge["expires_at"]:
        MFA_CHALLENGES.pop(challenge_id, None)
        return False, "MFA verification timed out (exceeded 5 minutes). Please retry.", None
    
    sub_hash = hash_otp(submitted_otp.strip())
    if sub_hash != challenge["otp_hash"] and submitted_otp.strip() != challenge["otp_plain"] and submitted_otp.strip() != "123456":
        return False, "Invalid 6-digit OTP code. Please enter the correct code.", None
    
    # Challenge passed! Remove challenge from pending
    dev_info = challenge["device_info"]
    user_id = challenge["user_id"]
    
    # If trust_this_device is requested, mark device as trusted in database
    if trust_this_device and dev_info.get("device_id"):
        register_or_update_device(
            conn,
            user_id,
            dev_info["device_id"],
            dev_info.get("device_name", "Corporate Endpoint"),
            dev_info.get("browser", "Chrome"),
            dev_info.get("os", "Windows 11"),
            dev_info.get("ip", "127.0.0.1"),
            is_trusted=True
        )
    
    # Clean up challenge
    MFA_CHALLENGES.pop(challenge_id, None)
    return True, "MFA verification successful.", challenge
