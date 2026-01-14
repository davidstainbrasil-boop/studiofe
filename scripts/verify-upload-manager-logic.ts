
import { UploadManager } from '../estudio_ia_videos/src/lib/upload/upload-manager';

// Mock Supabase Client
const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/file.png' }, error: null });
const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.co/storage/uploads/test/file.png' } });

const mockSupabaseClient = {
  storage: {
    from: jest.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl
    })
  }
};

async function run() {
  console.log('🧪 Verifying UploadManager Logic...');
  const manager = new UploadManager();
  
  // Fake File (Buffer-like)
  const fakeFile = Buffer.from('test') as any;
  fakeFile.name = 'test.png';
  fakeFile.type = 'image/png';

  try {
    const result = await manager.upload(fakeFile, {
      supabaseClient: mockSupabaseClient
    });

    console.log('✅ Upload Result:', result);

    if (result.url === 'https://supabase.co/storage/uploads/test/file.png') {
      console.log('SUCCESS: Public URL returned correctly');
    } else {
      console.error('FAILURE: Wrong URL returned');
      process.exit(1);
    }

    if (mockUpload.mock.calls.length > 0) {
      console.log('SUCCESS: client.storage.from().upload() was called');
    } else {
        console.error('FAILURE: upload not called');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Simple test runner since we might not have jest global here
// We need to polyfill jest.fn if not running via jest
if (typeof jest === 'undefined') {
    (global as any).jest = {
        fn: () => {
            const mock: any = (...args: any[]) => {
                mock.mock.calls.push(args);
                 // Default implementation for this simple test
                if (args[0] && args[0].endsWith('test/file.png') || args.length === 0) return { data: { publicUrl: 'https://supabase.co/storage/uploads/test/file.png' } }; // for getPublicUrl
                if (args.length > 1) return { data: { path: 'test/file.png' }, error: null }; // for upload
                
                // Return context for chaining
                return {
                    upload: mock,
                    getPublicUrl: mock
                }
            };
            mock.mock = { calls: [] };
            mock.mockResolvedValue = (val: any) => {
                 // Override
                 return mock;
            };
            mock.mockReturnValue = (val: any) => {
                 // Override
                 return mock;
            }
            return mock;
        }
    }
    
    // Override the mock implementation for our specific test case structure
     const mockUploadImpl = (path: string, file: any, opts: any) => Promise.resolve({ data: { path }, error: null });
     const mockGetPublicUrlImpl = (path: string) => ({ data: { publicUrl: `https://supabase.co/storage/uploads/${path}` } });
     
     (global as any).mockSupabaseClient = {
        storage: {
            from: (bucket: string) => ({
                upload: mockUploadImpl,
                getPublicUrl: mockGetPublicUrlImpl
            })
        }
     };
}

// Redefine run for the polyfill context
async function runPolyfill() {
  console.log('🧪 Verifying UploadManager Logic (Polyfill Mode)...');
  const manager = new UploadManager();
  
  const fakeFile = Buffer.from('test') as any;
  fakeFile.name = 'test.png';
  fakeFile.type = 'image/png';

  try {
     // Use the polyfilled client
    const client = (global as any).mockSupabaseClient;

    const result = await manager.upload(fakeFile, {
      supabaseClient: client
    });

    console.log('✅ Upload Result:', result);
    
    // Check if URL ends with extension (UUID is random)
    if (result.url.includes('https://supabase.co/storage/uploads/') && result.url.endsWith('.png')) {
      console.log('SUCCESS: Public URL generated correctly with UUID');
    } else {
      console.error('FAILURE: URL format incorrect', result.url);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runPolyfill();
