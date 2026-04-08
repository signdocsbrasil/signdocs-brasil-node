import { DocumentsResource } from '../../src/resources/documents';
import { HttpClient } from '../../src/http-client';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('DocumentsResource', () => {
  let http: jest.Mocked<HttpClient>;
  let documents: DocumentsResource;

  beforeEach(() => {
    http = mockHttpClient();
    documents = new DocumentsResource(http);
  });

  it('should upload a document', async () => {
    const mockTx = { id: 'tx_1', documents: [{ id: 'doc_1' }] };
    http.request.mockResolvedValue(mockTx);

    const result = await documents.upload('tx_1', { content: 'base64data', filename: 'test.pdf' } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/document',
      body: { content: 'base64data', filename: 'test.pdf' },
    });
    expect(result).toEqual(mockTx);
  });

  it('should presign a document upload', async () => {
    const mockPresign = { uploadUrl: 'https://s3.example.com/upload', uploadToken: 'tok_1', s3Key: 'key_1', expiresIn: 900, contentType: 'application/pdf', instructions: 'PUT to uploadUrl' };
    http.request.mockResolvedValue(mockPresign);

    const result = await documents.presign('tx_1', { contentType: 'application/pdf', filename: 'doc.pdf' });

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/document/presign',
      body: { contentType: 'application/pdf', filename: 'doc.pdf' },
    });
    expect(result.uploadUrl).toBeDefined();
  });

  it('should confirm a document upload', async () => {
    const mockTx = { id: 'tx_1', status: 'document_confirmed' };
    http.request.mockResolvedValue(mockTx);

    const result = await documents.confirm('tx_1', { documentId: 'doc_1' } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/document/confirm',
      body: { documentId: 'doc_1' },
    });
    expect(result).toEqual(mockTx);
  });

  it('should download a document', async () => {
    const mockDownload = { transactionId: 'tx_1', originalUrl: 'https://s3.example.com/original', signedUrl: 'https://s3.example.com/signed', expiresIn: 900 };
    http.request.mockResolvedValue(mockDownload);

    const result = await documents.download('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/transactions/tx_1/download',
    });
    expect(result.originalUrl).toBeDefined();
    expect(result.signedUrl).toBeDefined();
  });
});
