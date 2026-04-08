import { HealthResource } from '../../src/resources/health';
import { HttpClient } from '../../src/http-client';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('HealthResource', () => {
  let http: jest.Mocked<HttpClient>;
  let health: HealthResource;

  beforeEach(() => {
    http = mockHttpClient();
    health = new HealthResource(http);
  });

  it('should check health with noAuth', async () => {
    const mockHealth = { status: 'healthy', version: '1.0.0' };
    http.request.mockResolvedValue(mockHealth);

    const result = await health.check();

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/health',
      noAuth: true,
    });
    expect(result.status).toBe('healthy');
  });

  it('should get health history with noAuth', async () => {
    const mockHistory = { incidents: [{ date: '2025-01-01', description: 'maintenance' }] };
    http.request.mockResolvedValue(mockHistory);

    const result = await health.history();

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/health/history',
      noAuth: true,
    });
    expect(result).toEqual(mockHistory);
  });
});
