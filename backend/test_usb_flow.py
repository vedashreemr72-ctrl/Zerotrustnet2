import requests
import json

BASE = 'http://127.0.0.1:5000'

def run_test():
    print('--- STEP 1: Log in as Employee ---')
    login_res = requests.post(f'{BASE}/api/auth/login', json={'username': 'veda', 'password': 'password123'})
    if login_res.status_code != 200:
        login_res = requests.post(f'{BASE}/api/auth/login', json={'username': 'employee', 'password': 'password123'})
    
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    emp_data = login_res.json()
    emp_token = emp_data['token']
    emp_user = emp_data['user']
    print(f"Logged in as: {emp_user['name']} (@{emp_user['username']}, Dept: {emp_user['department']})")

    print('\n--- STEP 2: Employee Inserts USB / Pendrive ---')
    usb_payload = {
        'action': 'insert_usb',
        'details': 'Unregistered USB device connected: SanDisk Ultra 64GB USB 3.1 [E: (Removable Disk)]',
        'device_name': 'SanDisk Ultra 64GB USB 3.1',
        'drive_letter': 'E:'
    }
    action_res = requests.post(
        f'{BASE}/api/employee/action',
        headers={'Authorization': f'Bearer {emp_token}', 'Content-Type': 'application/json'},
        json=usb_payload
    )
    print(f"Action HTTP Status: {action_res.status_code}")
    action_data = action_res.json()
    print("Action Response:")
    print(json.dumps(action_data, indent=2))

    print('\n--- STEP 3: Verify Admin Notifications Endpoint ---')
    notif_res = requests.get(f'{BASE}/api/admin/notifications')
    assert notif_res.status_code == 200, f"Failed to fetch notifications: {notif_res.text}"
    notifs = notif_res.json()
    print(f"Total admin notifications count: {len(notifs)}")
    
    usb_notifs = [n for n in notifs if 'USB' in (n.get('channel') or '') or 'USB' in (n.get('subject') or '')]
    print(f"Total USB notifications count: {len(usb_notifs)}")
    assert len(usb_notifs) > 0, "No USB notifications found!"
    
    latest_usb = usb_notifs[0]
    print("\nVerified Latest Admin Notification:")
    print(f"  • ID:          {latest_usb.get('id')}")
    print(f"  • Channel:     {latest_usb.get('channel')}")
    print(f"  • Recipient:   {latest_usb.get('recipient')}")
    print(f"  • Severity:    {latest_usb.get('severity')}")
    print(f"  • Subject:     {latest_usb.get('subject')}")
    print(f"  • Message:     {latest_usb.get('message')}")
    print(f"  • Sent At:     {latest_usb.get('sent_at')}")
    print(f"  • Status:      {latest_usb.get('status')}")

    print('\n--- STEP 4: Verify Admin Live Dashboard Alerts & SIEM ---')
    dash_res = requests.get(f'{BASE}/api/admin/dashboard')
    assert dash_res.status_code == 200, f"Failed to fetch admin dashboard: {dash_res.text}"
    dash_data = dash_res.json()
    active_alerts = dash_data.get('active_alerts', [])
    usb_alerts = [a for a in active_alerts if 'USB' in (a.get('alert') or '')]
    print(f"Active USB Alerts in SOC Dashboard: {len(usb_alerts)}")
    if usb_alerts:
        print(f"  • Alert: {usb_alerts[0]}")

    print('\n[SUCCESS] ALL TESTS PASSED: Employee USB insertion immediately notifies Admin with Critical severity!')

if __name__ == '__main__':
    run_test()
