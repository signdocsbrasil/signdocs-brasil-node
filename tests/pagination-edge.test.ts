import { HttpClient } from '../src/http-client';
import { TransactionsResource } from '../src/resources/transactions';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('Pagination Edge Cases', () => {
  let http: jest.Mocked<HttpClient>;
  let transactions: TransactionsResource;

  beforeEach(() => {
    http = mockHttpClient();
    transactions = new TransactionsResource(http);
  });

  describe('list() standard pagination', () => {
    it('should handle empty first page', async () => {
      http.request.mockResolvedValue({
        transactions: [],
        count: 0,
      });

      const resp = await transactions.list();

      expect(resp.transactions).toEqual([]);
      expect(resp.count).toBe(0);
      expect(resp.nextToken).toBeUndefined();
    });

    it('should handle single page with no nextToken', async () => {
      http.request.mockResolvedValue({
        transactions: [
          { transactionId: 'tx_1', status: 'COMPLETED' },
          { transactionId: 'tx_2', status: 'COMPLETED' },
        ],
        count: 2,
      });

      const resp = await transactions.list();

      expect(resp.transactions).toHaveLength(2);
      expect(resp.count).toBe(2);
      expect(resp.nextToken).toBeUndefined();
      expect(resp.transactions[0].transactionId).toBe('tx_1');
      expect(resp.transactions[1].transactionId).toBe('tx_2');
    });

    it('should forward nextToken to subsequent call', async () => {
      http.request.mockResolvedValue({
        transactions: [{ transactionId: 'tx_3' }],
        count: 1,
        nextToken: 'page3',
      });

      const resp = await transactions.list({ nextToken: 'page2' });

      expect(resp.nextToken).toBe('page3');
      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ nextToken: 'page2' }),
        }),
      );
    });

    it('should handle limit=1 returning exactly one item', async () => {
      http.request.mockResolvedValue({
        transactions: [{ transactionId: 'tx_1' }],
        count: 1,
        nextToken: 'next',
      });

      const resp = await transactions.list({ limit: 1 });

      expect(resp.transactions).toHaveLength(1);
      expect(resp.nextToken).toBe('next');
    });

    it('should handle max limit=100', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        transactionId: `tx_${i}`,
      }));
      http.request.mockResolvedValue({
        transactions: items,
        count: 100,
        nextToken: 'more',
      });

      const resp = await transactions.list({ limit: 100 });

      expect(resp.transactions).toHaveLength(100);
      expect(resp.nextToken).toBe('more');
    });

    it('should handle nextToken as null (end of results)', async () => {
      http.request.mockResolvedValue({
        transactions: [{ transactionId: 'tx_last' }],
        count: 1,
        nextToken: null,
      });

      const resp = await transactions.list();

      expect(resp.nextToken).toBeNull();
    });
  });

  describe('listAutoPaginate() iterator', () => {
    it('should iterate single page and stop', async () => {
      http.request.mockResolvedValue({
        transactions: [
          { transactionId: 'tx_1' },
          { transactionId: 'tx_2' },
        ],
        count: 2,
      });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate()) {
        items.push(tx);
      }

      expect(items).toHaveLength(2);
      expect(http.request).toHaveBeenCalledTimes(1);
    });

    it('should iterate multiple pages', async () => {
      http.request
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_1' }, { transactionId: 'tx_2' }],
          count: 2,
          nextToken: 'page2',
        })
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_3' }],
          count: 1,
        });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate()) {
        items.push(tx);
      }

      expect(items).toHaveLength(3);
      expect(http.request).toHaveBeenCalledTimes(2);
      expect(items[0].transactionId).toBe('tx_1');
      expect(items[2].transactionId).toBe('tx_3');
    });

    it('should handle empty result set', async () => {
      http.request.mockResolvedValue({
        transactions: [],
        count: 0,
      });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate()) {
        items.push(tx);
      }

      expect(items).toHaveLength(0);
      expect(http.request).toHaveBeenCalledTimes(1);
    });

    it('should propagate filters across pages', async () => {
      http.request
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_1' }],
          count: 1,
          nextToken: 'page2',
        })
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_2' }],
          count: 1,
        });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate({ status: 'COMPLETED' })) {
        items.push(tx);
      }

      expect(items).toHaveLength(2);
      // Both calls should include the status filter
      expect(http.request).toHaveBeenCalledTimes(2);
      for (const call of http.request.mock.calls) {
        expect(call[0]).toMatchObject({
          query: expect.objectContaining({ status: 'COMPLETED' }),
        });
      }
    });

    it('should handle three pages then stop', async () => {
      http.request
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_1' }],
          count: 1,
          nextToken: 'p2',
        })
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_2' }],
          count: 1,
          nextToken: 'p3',
        })
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_3' }],
          count: 1,
        });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate()) {
        items.push(tx);
      }

      expect(items).toHaveLength(3);
      expect(http.request).toHaveBeenCalledTimes(3);
    });

    it('should handle page with nextToken but empty items (terminal)', async () => {
      http.request
        .mockResolvedValueOnce({
          transactions: [{ transactionId: 'tx_1' }],
          count: 1,
          nextToken: 'page2',
        })
        .mockResolvedValueOnce({
          transactions: [],
          count: 0,
        });

      const items: any[] = [];
      for await (const tx of transactions.listAutoPaginate()) {
        items.push(tx);
      }

      expect(items).toHaveLength(1);
      expect(http.request).toHaveBeenCalledTimes(2);
    });
  });
});
