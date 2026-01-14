import requests
import sys

def test_upload():
    url = "http://localhost:3000/api/pptx/upload"
    
    # 1. Test Empty File (Expect 400)
    files_empty = {'file': ('empty.pptx', b'', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
    headers = {
        'x-user-id': '12b21f2e-8ac1-480c-af1e-542a7d9b185a',
        'Cookie': 'dev_bypass=true'
    } 
    # cookies = {'dev_bypass': 'true'} # Requests cookie handling might be tricky with Next.js dev server sometimes
    
    print("Testing Empty File Upload...")
    try:
        res = requests.post(url, files=files_empty, headers=headers) # Removed cookies param
        if res.status_code == 400:
            print("✅ Empty file rejected (400) as expected.")
        else:
            print(f"❌ Failed: Expected 400, got {res.status_code}. Body: {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Request Error: {e}")
        sys.exit(1)

    # 2. Test Valid File (Expect 200)
    # Mock minimal zip/pptx content
    pptx_content = b'PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00' 
    files_valid = {'file': ('valid.pptx', pptx_content, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
    data = {'projectId': 'test-project-id'}
    
    print("\nTesting Valid File Upload...")
    try:
        res = requests.post(url, files=files_valid, data=data, headers=headers) # Removed cookies param
        if res.status_code == 200:
            print("✅ Valid file accepted (200).")
            print(f"Response: {res.json()}")
        else:
            print(f"❌ Failed: Expected 200, got {res.status_code}. Body: {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Request Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_upload()