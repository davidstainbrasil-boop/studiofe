describe('Supabase browser client (mock fallback)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Em Jest normalmente é "test" (allowMock=true)
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('usa mock quando config pública está ausente', async () => {
    const { getBrowserClient } = await import('@/lib/supabase/browser');

    const client = getBrowserClient();
    expect(client).toBeTruthy();
    expect(client.auth).toBeTruthy();

    const result = await client.auth.signInWithPassword({
      email: 'naoexiste@example.com',
      password: 'qualquer',
    });

    expect(result.data.user).toBeNull();
    expect(result.data.session).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/invalid login credentials/i);
  });

  it('trata placeholders como config ausente (evita falso "configurado")', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://SEU_PROJECT_ID.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sua-anon-key-aqui';

    const { getBrowserClient } = await import('@/lib/supabase/browser');

    const client = getBrowserClient();

    const result = await client.auth.signInWithPassword({
      email: 'naoexiste@example.com',
      password: 'qualquer',
    });

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/invalid login credentials/i);
  });
});
