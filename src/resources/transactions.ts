import { HttpClient } from '../http-client';
import {
  CreateTransactionRequest,
  Transaction,
  TransactionListParams,
  TransactionListResponse,
  CancelTransactionResponse,
  FinalizeResponse,
} from '../types/transaction';

export class TransactionsResource {
  constructor(private readonly http: HttpClient) {}

  async create(request: CreateTransactionRequest, idempotencyKey?: string, options?: { timeout?: number }): Promise<Transaction> {
    return this.http.requestWithIdempotency<Transaction>(
      { method: 'POST', path: '/v1/transactions', body: request, timeout: options?.timeout },
      idempotencyKey,
    );
  }

  async list(params?: TransactionListParams, options?: { timeout?: number }): Promise<TransactionListResponse> {
    return this.http.request<TransactionListResponse>({
      method: 'GET',
      path: '/v1/transactions',
      query: params as Record<string, string | number | undefined>,
      timeout: options?.timeout,
    });
  }

  async get(transactionId: string, options?: { timeout?: number }): Promise<Transaction> {
    return this.http.request<Transaction>({
      method: 'GET',
      path: `/v1/transactions/${transactionId}`,
      timeout: options?.timeout,
    });
  }

  async cancel(transactionId: string, options?: { timeout?: number }): Promise<CancelTransactionResponse> {
    return this.http.request<CancelTransactionResponse>({
      method: 'DELETE',
      path: `/v1/transactions/${transactionId}`,
      timeout: options?.timeout,
    });
  }

  async finalize(transactionId: string, options?: { timeout?: number }): Promise<FinalizeResponse> {
    return this.http.request<FinalizeResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/finalize`,
      timeout: options?.timeout,
    });
  }

  async *listAutoPaginate(params?: Omit<TransactionListParams, 'nextToken'>, options?: { timeout?: number }): AsyncGenerator<Transaction> {
    const timeout = options?.timeout;
    let nextToken: string | undefined;
    do {
      const response = await this.list({ ...params, nextToken }, { timeout });
      for (const tx of response.transactions) {
        yield tx;
      }
      nextToken = response.nextToken;
    } while (nextToken);
  }
}
