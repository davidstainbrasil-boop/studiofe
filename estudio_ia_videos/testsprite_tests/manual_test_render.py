import requests
import sys
import time

def test_render():
    base_url = "http://localhost:3000"
    
    # 1. Create Job
    print("Testing Render Start...")
    url_start = f"{base_url}/api/render/start"
    headers = {
        'Content-Type': 'application/json',
        'x-user-id': '12b21f2e-8ac1-480c-af1e-542a7d9b185a'
    }
    payload = {
        "projectId": "c0960b2c-1ec2-49f0-b56b-e895163d248d", # Existing project
        "slides": [{"id": "s1", "title": "Test Auto", "content": "Test", "duration": 2}],
        "config": {"test": True}
    }
    
    try:
        res = requests.post(url_start, json=payload, headers=headers)
        if res.status_code == 200:
            print("✅ Job Started (200).")
            data = res.json()
            job_id = data.get('jobId')
            print(f"Job ID: {job_id}")
        else:
            print(f"❌ Start Failed: {res.status_code}. Body: {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Request Error: {e}")
        sys.exit(1)
        
    # 2. Poll Status
    print("\nPolling Status...")
    url_status = f"{base_url}/api/render/status"
    
    for _ in range(10):
        try:
            res = requests.get(url_status, params={'jobId': job_id}, headers=headers)
            if res.status_code == 200:
                status_data = res.json()
                status = status_data.get('status')
                progress = status_data.get('progress')
                print(f"Status: {status}, Progress: {progress}%")
                
                if status == 'completed':
                    print("✅ Render Completed!")
                    print(f"Video URL: {status_data.get('videoUrl')}")
                    return
                elif status == 'failed':
                    print(f"❌ Render Failed: {status_data.get('error')}")
                    sys.exit(1)
            else:
                print(f"⚠️ Status Check Failed: {res.status_code}")
        except Exception as e:
            print(f"⚠️ Poll Error: {e}")
            
        time.sleep(2)
        
    print("⚠️ Timeout waiting for completion")

if __name__ == "__main__":
    test_render()