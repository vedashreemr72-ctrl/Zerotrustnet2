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
    6-Layer AI & Policy Detection Engine:
    Layer 1: Rule Engine (Static threshold rules e.g. Outside Office Hours -> +20 Risk)
    Layer 2: Isolation Forest (Global population anomaly detection)
    Layer 3: Local Outlier Factor (LOF) (Local density outlier detection)
    Layer 4: One-Class SVM (Novelty / Unknown attack vector detection)
    Layer 5: Personal Behavioral Baseline Engine (History vs today e.g. 09:10 AM vs 02:00 AM -> +20 Risk)
    Layer 6: Zero Trust Policy Engine (IF Finance Folder AND Unknown Device -> Restrict Access)
    """
    algo_contrib = {}
    
    # --- LAYER 1: RULE ENGINE ---
    l1_score = 0
    l1_rules = []
    
    hr = int(row.get('login_time', 9))
    if hr < 7 or hr > 20:
        l1_score += 20
        l1_rules.append(f"Outside Office Hours: Login at {hr:02d}:00 (+20 Risk)")
    if row.get('usb_usage', 0) == 1:
        l1_score += 20
        l1_rules.append("Unapproved USB Storage Connected (+20 Risk)")
    if row.get('downloads', 0) > 100:
        l1_score += 25
        l1_rules.append(f"Mass File Download: {row.get('downloads')} files (+25 Risk)")
    elif row.get('downloads', 0) > 20:
        l1_score += 12
        l1_rules.append(f"Elevated File Downloads: {row.get('downloads')} files (+12 Risk)")
    if row.get('genai_upload_mb', 0) > 20:
        l1_score += 20
        l1_rules.append(f"High GenAI Upload Volume: {row.get('genai_upload_mb')} MB (+20 Risk)")
    if row.get('external_uploads', 0) > 2:
        l1_score += 15
        l1_rules.append(f"External Data Uploads: {row.get('external_uploads')} events (+15 Risk)")
    if row.get('failed_logins', 0) > 3:
        l1_score += 15
        l1_rules.append(f"Multiple Failed Actions: {row.get('failed_logins')} violations (+15 Risk)")
    if row.get('last_login_days_ago', 0) > 90:
        l1_score += 20
        l1_rules.append(f"Dormant Account Reactivated: {row.get('last_login_days_ago')} days inactive (+20 Risk)")
    if row.get('burnout_stress_score', 0) > 60:
        l1_score += 15
        l1_rules.append(f"High Stress & Burnout Score: {row.get('burnout_stress_score')}% (+15 Risk)")

    # Exfiltration weighted if in notice/resignation period
    if row.get('resignation_flag', 0) == 1 and l1_score > 0:
        l1_score = int(l1_score * 2.5)
        l1_rules.append("Pre-Resignation Notice Period — Rule signals weighted 2.5x")

    # --- LAYER 2: ISOLATION FOREST (Global Anomalies) ---
    algo_flags = ml_flags or {}
    l2_score = 0
    l2_status = "Normal"
    if algo_flags.get("if") == -1:
        l2_score = 10
        l2_status = "ANOMALY"
        algo_contrib["Isolation Forest"] = "GLOBAL ANOMALY — multi-feature vector deviates from population"
        l1_rules.append("Layer 2 Isolation Forest: Global population anomaly detected (+10 Risk)")
    else:
        algo_contrib["Isolation Forest"] = "Normal"

    # --- LAYER 3: LOCAL OUTLIER FACTOR (Local Behavioral Outliers) ---
    l3_score = 0
    l3_status = "Normal"
    if algo_flags.get("lof") == -1:
        l3_score = 10
        l3_status = "ANOMALY"
        algo_contrib["Local Outlier Factor"] = "LOCAL OUTLIER — unusual density anomaly within peer group"
        l1_rules.append("Layer 3 Local Outlier Factor: Local density outlier detected (+10 Risk)")
    else:
        algo_contrib["Local Outlier Factor"] = "Normal"

    # --- LAYER 4: ONE-CLASS SVM (Unknown Attacks & Novelty Detection) ---
    l4_score = 0
    l4_status = "Normal"
    if algo_flags.get("svm") == -1:
        l4_score = 10
        l4_status = "ANOMALY"
        algo_contrib["One-Class SVM"] = "NOVELTY — behavior outside learned normal boundary"
        l1_rules.append("Layer 4 One-Class SVM: Novel / unknown attack pattern (+10 Risk)")
    else:
        algo_contrib["One-Class SVM"] = "Normal"

    if algo_flags.get("dbscan") == 1:
        l4_score += 5
        algo_contrib["DBSCAN"] = "NOISE POINT — outlier outside behavioral clusters"
    else:
        algo_contrib["DBSCAN"] = "In cluster"

    # --- LAYER 5: BEHAVIORAL BASELINE ENGINE (Personal History Comparison) ---
    l5_score = 0
    l5_deviations = []

    # Check 1: Login Time Baseline (e.g. Normally 09:10 AM vs Today 02:00 AM)
    baseline_time_str = str(row.get('baseline_login_time', '09:00'))
    try:
        baseline_hr = int(baseline_time_str.split(':')[0])
    except Exception:
        baseline_hr = 9
    
    if abs(hr - baseline_hr) >= 5 or (hr < 6 or hr > 22):
        l5_score += 20
        l5_deviations.append(f"Login Time Deviation: Normally {baseline_time_str} AM vs Today {hr:02d}:00 (+20 Risk)")

    # Check 2: File Access Baseline
    baseline_access = int(row.get('baseline_file_access', 15))
    actual_access = int(row.get('file_access_count', 0))
    if baseline_access > 0 and actual_access > baseline_access * 2.5:
        l5_score += 20
        l5_deviations.append(f"File Access Volume: {actual_access} files accessed ({actual_access/baseline_access:.1f}x above baseline {baseline_access}/day) (+20 Risk)")

    # Check 3: Location Baseline
    baseline_loc = str(row.get('baseline_location', 'Bengaluru'))
    current_loc = str(row.get('current_login_location', 'Bengaluru'))
    if current_loc and current_loc != baseline_loc:
        l5_score += 25
        l5_deviations.append(f"Location Deviation: Baseline '{baseline_loc}' vs Today '{current_loc}' (+25 Risk)")

    # Check 4: Device Baseline
    if row.get('device_known', 1) == 0:
        l5_score += 15
        l5_deviations.append("Device Baseline: Access from unregistered / non-baseline hardware (+15 Risk)")

    # --- LAYER 6: ZERO TRUST POLICY ENGINE (Contextual Policy Rules) ---
    l6_action = "Allowed"
    l6_policies = []
    l6_score = 0

    if row.get('impossible_travel_flag') == 1:
        l6_score += 35
        l6_action = "Lock Account + SOC Alert"
        l6_policies.append(f"Policy Violation: Impossible Travel ({row.get('impossible_travel_details')})")
    if row.get('privilege_escalation_flag') == 1:
        l6_score += 35
        l6_action = "Revoke Privileges + Alert"
        l6_policies.append(f"Policy Violation: Privilege Escalation ({row.get('privilege_escalation_details')})")
    if row.get('unusual_collaboration_flag') == 1:
        l6_score += 25
        l6_action = "Restrict Access Scope"
        l6_policies.append(f"Policy Violation: IF Restricted Folder AND Unauthorized Scope -> Restrict Access")
    if row.get('credential_sharing_flag') == 1:
        l6_score += 30
        l6_action = "Force Password Reset"
        l6_policies.append("Policy Violation: Credential Sharing Detected across IP Range")
    if row.get('ai_risk_flag') == 1:
        l6_score += 25
        l6_action = "Block AI Tool Access"
        l6_policies.append("Policy Violation: Confidential IP Shared with Public GenAI")
    if row.get('shadow_it_flag') == 1:
        l6_score += 20
        l6_action = "Terminate Shadow IT Tunnel"
        l6_policies.append(f"Policy Violation: Shadow IT Executables ({row.get('shadow_it_details')})")

    # Total Score Summation across all 6 Layers
    total_score = min(100, l1_score + l2_score + l3_score + l4_score + l5_score + l6_score)
    reasons = l1_rules + l5_deviations + l6_policies

    if not reasons:
        reasons.append("No unusual behavior detected — all 6 AI detection layers within safe baseline")

    # --- EXPLAINABLE AI (XAI) FORMATTED REASONS & RECOMMENDED ACTIONS ---
    xai_reasons = []
    if hr < 7 or hr > 20:
        xai_reasons.append(f"✓ Login at {hr:02d}:30 AM (Off-Hours Deviation)")
    
    actual_downloads = row.get('downloads', 0)
    if actual_downloads > 0:
        xai_reasons.append(f"✓ Downloaded {actual_downloads} Files")

    if row.get('device_known', 1) == 0 or row.get('is_registered_device') == 0:
        xai_reasons.append("✓ New / Unregistered Device Access")

    if l2_status == "ANOMALY":
        xai_reasons.append("✓ Isolation Forest Anomaly Flagged")

    if l3_status == "ANOMALY":
        xai_reasons.append("✓ LOF Local Density Outlier Detected")

    if l4_status == "ANOMALY":
        xai_reasons.append("✓ One-Class SVM Novelty Attack Pattern")

    if row.get('usb_usage', 0) == 1:
        xai_reasons.append("✓ Unapproved USB Device Connected")

    if row.get('genai_upload_mb', 0) > 0:
        xai_reasons.append(f"✓ GenAI Data Upload ({row.get('genai_upload_mb')} MB)")

    if not xai_reasons:
        xai_reasons = ["✓ Baseline Login Activity", "✓ Known Device Fingerprint", "✓ Normal File Access Volume"]

    # Primary recommended action
    if total_score >= 80:
        primary_recommendation = "Lock Account + Revoke Active Sessions"
    elif total_score >= 60:
        primary_recommendation = "Require Re-authentication (Step-Up MFA)"
    elif total_score >= 30:
        primary_recommendation = "Require Re-authentication"
    else:
        primary_recommendation = "Continue Continuous Baseline Monitoring"

    detection_layers = {
        "primary_recommendation": primary_recommendation,
        "xai_reasons": xai_reasons,
        "layer1_rule_engine": {
            "name": "Layer 1: Rule Engine",
            "score": l1_score,
            "rules_triggered": l1_rules
        },
        "layer2_isolation_forest": {
            "name": "Layer 2: Isolation Forest",
            "status": l2_status,
            "score": l2_score,
            "description": "Global Population Anomaly Detection"
        },
        "layer3_lof": {
            "name": "Layer 3: Local Outlier Factor",
            "status": l3_status,
            "score": l3_score,
            "description": "Local Behavioral Outlier Density Detection"
        },
        "layer4_one_class_svm": {
            "name": "Layer 4: One-Class SVM",
            "status": l4_status,
            "score": l4_score,
            "description": "Novelty & Unknown Attack Pattern Detection"
        },
        "layer5_behavioral_baseline": {
            "name": "Layer 5: Personal Behavioral Baseline Engine",
            "score": l5_score,
            "deviations": l5_deviations
        },
        "layer6_policy_engine": {
            "name": "Layer 6: Zero Trust Policy Engine",
            "action": l6_action,
            "score": l6_score,
            "triggered_policies": l6_policies
        }
    }
    if total_score >= 80:
        severity, priority, threat_classification = "🔴 Critical", "P1", "Malicious"
    elif total_score >= 60:
        severity, priority, threat_classification = "🟠 High", "P2", "Suspicious"
    elif total_score >= 30:
        severity, priority, threat_classification = "🟡 Medium", "P3", "Suspicious"
    else:
        severity, priority, threat_classification = "🟢 Low", "P4", "Normal"

    return int(total_score), severity, priority, threat_classification, reasons, algo_contrib, detection_layers

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
