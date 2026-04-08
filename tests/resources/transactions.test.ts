import { TransactionsResource } from '../../src/resources/transactions';
import { HttpClient } from '../../src/http-client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../src/errors';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('TransactionsResource', () => {
  let http: jest.Mocked<HttpClient>;
  let transactions: TransactionsResource;

  beforeEach(() => {
    http = mockHttpClient();
    transactions = new TransactionsResource(http);
  });

  it('should create a transaction with idempotency', async () => {
    const mockTx = { id: 'tx_1', status: 'draft' };
    http.requestWithIdempotency.mockResolvedValue(mockTx);

    const result = await transactions.create({ type: 'electronic' } as any);

    expect(http.requestWithIdempotency).toHaveBeenCalledWith(
      { method: 'POST', path: '/v1/transactions', body: { type: 'electronic' } },
      undefined,
    );
    expect(result).toEqual(mockTx);
  });

  it('should create a transaction with explicit idempotency key', async () => {
    http.requestWithIdempotency.mockResolvedValue({ id: 'tx_2' });

    await transactions.create({ type: 'electronic' } as any, 'my-key');

    expect(http.requestWithIdempotency).toHaveBeenCalledWith(
      { method: 'POST', path: '/v1/transactions', body: { type: 'electronic' } },
      'my-key',
    );
  });

  it('should list transactions with query params', async () => {
    const mockResponse = { transactions: [{ id: 'tx_1' }], nextToken: undefined };
    http.request.mockResolvedValue(mockResponse);

    const result = await transactions.list({ status: 'active', limit: 10 } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/transactions',
      query: { status: 'active', limit: 10 },
    });
    expect(result.transactions).toHaveLength(1);
  });

  it('should get a transaction by ID', async () => {
    const mockTx = { id: 'tx_1', status: 'active' };
    http.request.mockResolvedValue(mockTx);

    const result = await transactions.get('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/transactions/tx_1',
    });
    expect(result).toEqual(mockTx);
  });

  it('should cancel (DELETE) a transaction and return body', async () => {
    const mockTx = { id: 'tx_1', status: 'cancelled' };
    http.request.mockResolvedValue(mockTx);

    const result = await transactions.cancel('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/v1/transactions/tx_1',
    });
    expect(result.status).toBe('cancelled');
  });

  it('should finalize a transaction', async () => {
    const mockTx = { id: 'tx_1', status: 'finalized' };
    http.request.mockResolvedValue(mockTx);

    const result = await transactions.finalize('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/finalize',
    });
    expect(result.status).toBe('finalized');
  });

  it('should auto-paginate through multiple pages', async () => {
    http.request
      .mockResolvedValueOnce({
        transactions: [{ id: 'tx_1' }, { id: 'tx_2' }],
        nextToken: 'page2',
      })
      .mockResolvedValueOnce({
        transactions: [{ id: 'tx_3' }],
        nextToken: undefined,
      });

    const items: any[] = [];
    for await (const tx of transactions.listAutoPaginate({ status: 'active' } as any)) {
      items.push(tx);
    }

    expect(items).toHaveLength(3);
    expect(items.map(t => t.id)).toEqual(['tx_1', 'tx_2', 'tx_3']);
    expect(http.request).toHaveBeenCalledTimes(2);
  });

  // Error path tests (Phase 3)
  it('should throw BadRequestError on create with 400', async () => {
    http.requestWithIdempotency.mockRejectedValue(
      new BadRequestError({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid' }),
    );

    await expect(
      transactions.create({ type: 'electronic' } as any),
    ).rejects.toThrow(BadRequestError);
  });

  it('should throw NotFoundError on get with 404', async () => {
    http.request.mockRejectedValue(
      new NotFoundError({ type: 'about:blank', title: 'Not Found', status: 404 }),
    );

    await expect(transactions.get('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw ConflictError on create with 409', async () => {
    http.requestWithIdempotency.mockRejectedValue(
      new ConflictError({ type: 'about:blank', title: 'Conflict', status: 409 }),
    );

    await expect(
      transactions.create({ type: 'electronic' } as any),
    ).rejects.toThrow(ConflictError);
  });

  // Pagination edge cases (Phase 6)
  it('should handle empty first page', async () => {
    http.request.mockResolvedValue({
      transactions: [],
      count: 0,
    });

    const result = await transactions.list();

    expect(result.transactions).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it('should handle single page with no nextToken', async () => {
    http.request.mockResolvedValue({
      transactions: [{ id: 'tx_1' }],
      count: 1,
      nextToken: undefined,
    });

    const result = await transactions.list();

    expect(result.transactions).toHaveLength(1);
    expect(result.nextToken).toBeUndefined();
  });

  it('should stop auto-pagination after single page', async () => {
    http.request.mockResolvedValue({
      transactions: [{ id: 'tx_1' }, { id: 'tx_2' }],
      nextToken: undefined,
    });

    const items: any[] = [];
    for await (const tx of transactions.listAutoPaginate()) {
      items.push(tx);
    }

    expect(items).toHaveLength(2);
    expect(http.request).toHaveBeenCalledTimes(1);
  });
});
