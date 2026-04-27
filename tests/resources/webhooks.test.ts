import { WebhooksResource } from '../../src/resources/webhooks';
import { HttpClient } from '../../src/http-client';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('WebhooksResource', () => {
  let http: jest.Mocked<HttpClient>;
  let webhooks: WebhooksResource;

  beforeEach(() => {
    http = mockHttpClient();
    webhooks = new WebhooksResource(http);
  });

  it('should register a webhook (POST returns 201)', async () => {
    const mockResponse = { webhookId: 'wh_1', url: 'https://example.com/hook', secret: 'whsec_123', events: ['TRANSACTION.COMPLETED'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z' };
    http.request.mockResolvedValue(mockResponse);

    const result = await webhooks.register({ url: 'https://example.com/hook', events: ['TRANSACTION.COMPLETED'] } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/webhooks',
      body: { url: 'https://example.com/hook', events: ['TRANSACTION.COMPLETED'] },
    });
    expect(result.webhookId).toBe('wh_1');
    expect(result.secret).toBe('whsec_123');
  });

  it('should list webhooks', async () => {
    const mockList = [{ id: 'wh_1' }, { id: 'wh_2' }];
    http.request.mockResolvedValue(mockList);

    const result = await webhooks.list();

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/webhooks',
    });
    expect(result).toHaveLength(2);
  });

  it('should delete a webhook (204 No Content)', async () => {
    http.request.mockResolvedValue(undefined);

    const result = await webhooks.delete('wh_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/v1/webhooks/wh_1',
    });
    expect(result).toBeUndefined();
  });

  it('should test a webhook', async () => {
    const mockResponse = {
      webhookId: 'wh_1',
      testDelivery: {
        httpStatus: 200,
        success: true,
        timestamp: '2026-04-27T01:23:28.323Z',
      },
    };
    http.request.mockResolvedValue(mockResponse);

    const result = await webhooks.test('wh_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/webhooks/wh_1/test',
    });
    expect(result.webhookId).toBe('wh_1');
    expect(result.testDelivery.httpStatus).toBe(200);
    expect(result.testDelivery.success).toBe(true);
    expect(result.testDelivery.timestamp).toBe('2026-04-27T01:23:28.323Z');
    expect(result.testDelivery.error).toBeUndefined();
  });

  it('should surface error string on failed test delivery', async () => {
    const mockResponse = {
      webhookId: 'wh_1',
      testDelivery: {
        httpStatus: 500,
        success: false,
        error: 'connect ECONNREFUSED',
        timestamp: '2026-04-27T01:23:28.323Z',
      },
    };
    http.request.mockResolvedValue(mockResponse);

    const result = await webhooks.test('wh_1');

    expect(result.testDelivery.success).toBe(false);
    expect(result.testDelivery.httpStatus).toBe(500);
    expect(result.testDelivery.error).toBe('connect ECONNREFUSED');
  });
});
