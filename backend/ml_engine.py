import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

FEATURES = [
    'login_time', 'file_access_count', 'failed_logins', 'downloads',
    'sensitive_files', 'genai_upload_mb', 'external_uploads', 'usb_usage',
    'burnout_stress_score', 'last_login_days_ago'
]

def run_ml_engine(df):
    """
    Runs 4 ML algorithms and returns per-row anomaly flags.
    """
    results = {}
    n = len(df)
    if n < 3:
        # Fallback values if dataset is too small
        return {i: {"if": 1, "lof": 1, "svm": 1, "dbscan": 0} for i in df.index}

    X_raw = df[FEATURES].fillna(0).values
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # 1. Isolation Forest
    if_model = IsolationForest(contamination=min(0.35, max(0.1, 4 / n)), random_state=42)
    if_preds = if_model.fit_predict(X)

    # 2. Local Outlier Factor
    n_neighbors = min(5, n - 1)
    lof_model = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=min(0.35, 4 / n))
    lof_preds = lof_model.fit_predict(X)

    # 3. One-Class SVM
    low_risk_mask = (df['failed_logins'] <= 1) & (df['downloads'] <= 20) & (df['sensitive_files'] <= 3)
    X_train = X[low_risk_mask] if low_risk_mask.sum() >= 2 else X
    svm_model = OneClassSVM(kernel='rbf', nu=0.2, gamma='auto')
    svm_model.fit(X_train)
    svm_preds = svm_model.predict(X)

    # 4. DBSCAN
    db_model = DBSCAN(eps=2.0, min_samples=2)
    db_labels = db_model.fit_predict(X)

    for i in df.index:
        results[i] = {
            "if": int(if_preds[i]),
            "lof": int(lof_preds[i]),
            "svm": int(svm_preds[i]),
            "dbscan": 1 if db_labels[i] == -1 else 0
        }
    return results

def calculate_risk(row, ml_flags=None):
    """
    Calculates unified risk score (0-100), severity, priority,
    detailed evidence list, and algorithm contributions.
    """
    score = 0
    reasons = []
    algo_contrib = {}

    # 1. Privilege Escalation
    if row.get('privilege_escalation_flag') == 1:
        score += 40
        reasons.append(f"Privilege escalation: {row.get('privilege_escalation_details')}")

    # 2. Impossible Travel
    if row.get('impossible_travel_flag') == 1:
        score += 45
        reasons.append(f"Impossible travel: {row.get('impossible_travel_details')}")

    # 3. Unauthorized Resource Access
    if row.get('unusual_collaboration_flag') == 1:
        score += 25
        reasons.append(f"Unauthorized resource access: {row.get('unusual_collaboration_details')}")

    # 4. Credential Sharing
    if row.get('credential_sharing_flag') == 1:
        score += 35
        reasons.append(f"Credential sharing: {row.get('credential_sharing_details')}")

    # 5. Data Exfiltration Signals
    exfil = 0
    if row.get('usb_usage', 0) == 1:
        exfil += 20
        reasons.append("Unapproved USB device connected")
    if row.get('downloads', 0) > 100:
        exfil += 25
        reasons.append(f"Mass download: {row.get('downloads')} files")
    elif row.get('downloads', 0) > 20:
        exfil += 12
        reasons.append(f"Elevated downloads: {row.get('downloads')} files")
    if row.get('genai_upload_mb', 0) > 20:
        exfil += 20
        reasons.append(f"High GenAI upload: {row.get('genai_upload_mb')} MB")
    if row.get('external_uploads', 0) > 2:
        exfil += 15
        reasons.append(f"External uploads: {row.get('external_uploads')} events")
    if row.get('email_attachments', 0) > 3:
        exfil += 10
        reasons.append(f"Unusual email attachments: {row.get('email_attachments')} files")
    
    # Exfiltration weighted if in notice/resignation period
    if row.get('resignation_flag', 0) == 1 and exfil > 0:
        exfil = int(exfil * 2.5)
        reasons.append("Pre-resignation exfiltration pattern — signals weighted 2.5x")
    score += exfil

    # 6. AI Risk
    if row.get('ai_risk_flag') == 1:
        score += 30
        reasons.append(f"Sensitive IP shared with AI: {row.get('ai_risk_details')}")

    # 7. Shadow IT
    if row.get('shadow_it_flag') == 1:
        score += 20
        reasons.append(f"Shadow IT detected: {row.get('shadow_it_details')}")

    # 8. Dormant Account Reactivation
    if row.get('last_login_days_ago', 0) > 90:
        score += 20
        reasons.append(f"Dormant account reactivated after {row.get('last_login_days_ago')} days")

    # 9. Burnout / Stress
    if row.get('burnout_stress_score', 0) > 60:
        score += 15
        reasons.append(f"High stress score ({row.get('burnout_stress_score')}%): anomalous work pattern")

    # 10. Unknown Device Login
    if row.get('device_known', 1) == 0:
        score += 10
        reasons.append("Login from unregistered/unknown device")

    # 11. Off-Hours Login
    hr = int(row.get('login_time', 9))
    if hr < 7 or hr > 20:
        score += 10
        reasons.append(f"Off-hours login at {hr:02d}:00 (outside 07:00–20:00 policy window)")

    # 12. Personal Baseline Deviation
    baseline = row.get('baseline_file_access', 15)
    actual = row.get('file_access_count', 0)
    if baseline > 0 and actual > baseline * 2.5:
        score += 15
        reasons.append(f"File access {actual} is {actual/baseline:.1f}x above personal baseline ({baseline}/day)")

    # 13. ML Anomaly Contributions
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
        severity, priority, threat_classification = "🔴 Critical", "P1", "Malicious"
    elif score >= 60:
        severity, priority, threat_classification = "🟠 High", "P2", "Suspicious"
    elif score >= 30:
        severity, priority, threat_classification = "🟡 Medium", "P3", "Suspicious"
    else:
        severity, priority, threat_classification = "🟢 Low", "P4", "Normal"

    return int(score), severity, priority, threat_classification, reasons, algo_contrib

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
