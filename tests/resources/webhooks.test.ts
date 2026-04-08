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
    const mockResponse = { deliveryId: 'dlv_1', status: 'delivered', statusCode: 200 };
    http.request.mockResolvedValue(mockResponse);

    const result = await webhooks.test('wh_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/webhooks/wh_1/test',
    });
    expect(result.deliveryId).toBe('dlv_1');
  });
});
