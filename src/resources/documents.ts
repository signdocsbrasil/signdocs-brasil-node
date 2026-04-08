import { HttpClient } from '../http-client';
import {
  UploadDocumentRequest,
  PresignRequest,
  PresignResponse,
  ConfirmDocumentRequest,
  ConfirmDocumentResponse,
  DocumentUploadResponse,
  DownloadResponse,
} from '../types/document';

export class DocumentsResource {
  constructor(private readonly http: HttpClient) {}

  async upload(transactionId: string, request: UploadDocumentRequest, options?: { timeout?: number }): Promise<DocumentUploadResponse> {
    return this.http.request<DocumentUploadResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/document`,
      body: request,
      timeout: options?.timeout,
    });
  }

  async presign(transactionId: string, request: PresignRequest, options?: { timeout?: number }): Promise<PresignResponse> {
    return this.http.request<PresignResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/document/presign`,
      body: request,
      timeout: options?.timeout,
    });
  }

  async confirm(transactionId: string, request: ConfirmDocumentRequest, options?: { timeout?: number }): Promise<ConfirmDocumentResponse> {
    return this.http.request<ConfirmDocumentResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/document/confirm`,
      body: request,
      timeout: options?.timeout,
    });
  }

  async download(transactionId: string, options?: { timeout?: number }): Promise<DownloadResponse> {
    return this.http.request<DownloadResponse>({
      method: 'GET',
      path: `/v1/transactions/${transactionId}/download`,
      timeout: options?.timeout,
    });
  }
}
