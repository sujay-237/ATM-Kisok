import asyncio
import json
import httpx
import websockets

API_BASE = 'http://127.0.0.1:8000'
WS_BASE = 'ws://127.0.0.1:8000'

async def run_e2e_test():
    async with httpx.AsyncClient(timeout=15.0) as client:
        print('=== 1. Checking Health & Seed Data ===')
        r = await client.get(f'{API_BASE}/health')
        assert r.status_code == 200, f'Health failed: {r.text}'
        print('Health:', r.json())

        r = await client.get(f'{API_BASE}/api/users')
        assert r.status_code == 200
        users = r.json()
        user_names = [u['username'] for u in users]
        print(f'Users in database: {len(users)} ({user_names})')
        alex = next(u for u in users if u['username'] == 'alex')
        print(f'Alex Mercer balance: ₹{alex["account_balance"]}')

        print('\n=== 2. Testing Gemini 3-Key Rotator ===')
        r = await client.get(f'{API_BASE}/api/gemini/status')
        rot_status = r.json()
        slot_names = [s['key_id'] for s in rot_status['slots']]
        print('Rotator key slots:', slot_names)
        assert len(rot_status['slots']) == 3

        print('\n=== 3. Creating Dynamic ATM Session ===')
        r = await client.post(f'{API_BASE}/api/session/create', json={'kiosk_id': 'KIOSK-EAST-01'})
        assert r.status_code == 200
        session_data = r.json()
        session_id = session_data['session_id']
        print(f'Created Session: {session_id}, Status: {session_data["status"]}, QR: {session_data["qr_payload"]}')

        print('\n=== 4. Connecting WebSocket to Kiosk Channel ===')
        async with websockets.connect(f'{WS_BASE}/ws/kiosk/{session_id}') as ws:
            print('WebSocket connected successfully!')

            print('\n=== 5. Simulating Mobile App: QR Scan ===')
            r = await client.post(f'{API_BASE}/api/session/{session_id}/scan', json={
                'user_id': alex['id'],
                'device_info': 'iPhone 16 Pro Expo Client'
            })
            assert r.status_code == 200
            print('Scan response:', r.json())

            # Read WS update
            ws_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
            ws_event = json.loads(ws_msg)
            print('WebSocket received event:', ws_event.get('event'), ws_event.get('status'))
            assert ws_event.get('event') == 'QR_SCANNED'

            print('\n=== 6. Simulating Mobile App: Local Fingerprint Biometrics ===')
            r = await client.post(f'{API_BASE}/api/session/{session_id}/biometric-auth', json={
                'user_id': alex['id'],
                'biometric_type': 'FINGERPRINT',
                'local_auth_passed': True
            })
            assert r.status_code == 200
            print('Biometric auth response:', r.json())

            # Read WS update
            ws_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
            ws_event = json.loads(ws_msg)
            print('WebSocket received event:', ws_event.get('event'), ws_event.get('status'))
            assert ws_event.get('event') == 'BIOMETRICS_VERIFIED'

            print('\n=== 7. Simulating Mobile App: Live Selfie & Gemini AI Match ===')
            photo_r = await client.get(f'{API_BASE}/api/users/{alex["id"]}/reference-photo')
            photo_data = photo_r.json()
            ref_photo = photo_data['reference_selfie']

            r = await client.post(f'{API_BASE}/api/verify-selfie', json={
                'session_id': session_id,
                'user_id': alex['id'],
                'live_selfie_base64': ref_photo
            })
            assert r.status_code == 200
            selfie_res = r.json()
            print('Selfie Verification Result:', {
                'match': selfie_res['match'],
                'confidence': selfie_res['confidence'],
                'engine': selfie_res['engine'],
                'reason': selfie_res['reason']
            })
            assert selfie_res['match'] is True

            # Read WS update
            ws_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
            ws_event = json.loads(ws_msg)
            print('WebSocket received event:', ws_event.get('event'), ws_event.get('status'))
            assert ws_event.get('event') == 'AUTHORIZED'

            print('\n=== 8. Executing ACID Cash Withdrawal ===')
            initial_balance = alex['account_balance']
            withdraw_amt = 150.0
            r = await client.post(f'{API_BASE}/api/transactions/withdraw', json={
                'session_id': session_id,
                'user_id': alex['id'],
                'amount': withdraw_amt
            })
            assert r.status_code == 200
            tx_data = r.json()
            print('Withdrawal Transaction:', {
                'id': tx_data['id'],
                'amount': tx_data['amount'],
                'status': tx_data['status'],
                'anomaly_flag': tx_data['anomaly_flag']
            })

            # Read WS update
            ws_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
            ws_event = json.loads(ws_msg)
            print('WebSocket received event:', ws_event.get('event'), 'Dispensing ₹', ws_event.get('amount'))
            assert ws_event.get('event') == 'DISPENSING_CASH'

            # Verify balance updated
            r = await client.get(f'{API_BASE}/api/users/{alex["id"]}')
            updated_alex = r.json()
            print(f'New Alex Mercer Balance: ₹{updated_alex["account_balance"]} (Expected: ₹{initial_balance - withdraw_amt})')
            assert updated_alex['account_balance'] == initial_balance - withdraw_amt

        print('\n=== 9. Testing Temporary Delegations ===')
        sarah = next(u for u in users if u['username'] == 'sarah')
        del_r = await client.post(f'{API_BASE}/api/delegations', json={
            'delegator_id': alex['id'],
            'delegatee_name': sarah['full_name'],
            'delegatee_phone': sarah['phone'],
            'max_withdrawal_limit': 120.0,
            'duration_hours': 24
        })
        assert del_r.status_code == 200
        del_data = del_r.json()
        print('Created Delegation:', del_data['id'], 'Max Limit: $', del_data['max_withdrawal_limit'])

        print('\n=== ALL END-TO-END INTEGRATION TESTS PASSED WITH 100% SUCCESS! ===')

if __name__ == '__main__':
    asyncio.run(run_e2e_test())
