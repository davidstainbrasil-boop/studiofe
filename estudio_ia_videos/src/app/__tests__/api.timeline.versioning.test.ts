jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url, init) => ({
      url,
      method: init?.method || 'GET',
      headers: new Map(Object.entries(init?.headers || {})),
      json: async () => init?.body ? JSON.parse(init.body) : {},
      nextUrl: new URL(url)
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((body, init) => ({
        status: init?.status || 200,
        json: async () => body
      }))
    }
  }
})

describe('Timeline Versioning', () => {
  it('should have tests', () => {
    expect(true).toBe(true);
  });
});
