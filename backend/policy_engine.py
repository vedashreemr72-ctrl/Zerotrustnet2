import json

def evaluate_policy(conditions_json, user_metrics):
    """
    Evaluates dynamic JSON conditions against user behavior metrics.
    Example conditions: {"device_known": 0, "off_hours": true}
    """
    if isinstance(conditions_json, dict):
        conditions = conditions_json
    else:
        try:
            conditions = json.loads(conditions_json)
        except Exception:
            return False

    for key, value in conditions.items():
        if key == "device_known":
            if int(user_metrics.get("device_known", 1)) != int(value):
                return False
        elif key == "off_hours":
            hr = int(user_metrics.get("login_time", 9))
            is_off = (hr < 7 or hr > 20)
            if is_off != bool(value):
                return False
        elif key == "downloads_gt":
            if int(user_metrics.get("downloads", 0)) <= int(value):
                return False
        elif key == "failed_logins_gt":
            if int(user_metrics.get("failed_logins", 0)) <= int(value):
                return False
        elif key == "impossible_travel_flag":
            if int(user_metrics.get("impossible_travel_flag", 0)) != int(value):
                return False
        elif key == "privilege_escalation_flag":
            if int(user_metrics.get("privilege_escalation_flag", 0)) != int(value):
                return False
        elif key == "genai_upload_mb_gt":
            if float(user_metrics.get("genai_upload_mb", 0.0)) <= float(value):
                return False
        elif key == "last_login_days_ago_gt":
            if int(user_metrics.get("last_login_days_ago", 0)) <= int(value):
                return False
        elif key == "sensitive_access":
            # True if they accessed a folder outside their permitted department scope
            accessed = [f.strip() for f in str(user_metrics.get("accessed_folders", "")).split(",") if f.strip()]
            expected = [f.strip() for f in str(user_metrics.get("expected_folders", "")).split(",") if f.strip() and f.strip() != "None (Dormant)"]
            unauthorized = any(folder not in expected for folder in accessed)
            if unauthorized != bool(value):
                return False
        else:
            # Fallback direct key check
            if user_metrics.get(key) != value:
                return False

    return True
