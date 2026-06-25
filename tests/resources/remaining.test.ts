import { StepsResource } from '../../src/resources/steps';
import { SigningResource } from '../../src/resources/signing';
import { EvidenceResource } from '../../src/resources/evidence';
import { VerificationResource } from '../../src/resources/verification';
import { UsersResource } from '../../src/resources/users';
import { DocumentsResource } from '../../src/resources/documents';
import { WebhooksResource } from '../../src/resources/webhooks';
import { DocumentGroupsResource } from '../../src/resources/document-groups';
import { HttpClient } from '../../src/http-client';
import {
  BadRequestError,
  UnprocessableEntityError,
} from '../../src/errors';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('StepsResource', () => {
  let http: jest.Mocked<HttpClient>;
  let steps: StepsResource;

  beforeEach(() => {
    http = mockHttpClient();
    steps = new StepsResource(http);
  });

  it('should list steps', async () => {
    const mockSteps = [{ id: 'step_1', type: 'signature' }];
    http.request.mockResolvedValue(mockSteps);

    const result = await steps.list('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/transactions/tx_1/steps',
    });
    expect(result).toHaveLength(1);
  });

  it('should start a step', async () => {
    const mockResponse = { stepId: 'step_1', type: 'LIVENESS', status: 'IN_PROGRESS', livenessSessionId: 'sess_1' };
    http.request.mockResolvedValue(mockResponse);

    const result = await steps.start('tx_1', 'step_1', { captureMode: 'PHOTO' } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/steps/step_1/start',
      body: { captureMode: 'PHOTO' },
    });
    expect(result.livenessSessionId).toBe('sess_1');
  });

  it('should start a step with empty body when no request', async () => {
    http.request.mockResolvedValue({ stepId: 'step_1', type: 'LIVENESS', status: 'IN_PROGRESS' });

    await steps.start('tx_1', 'step_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/steps/step_1/start',
      body: {},
    });
  });

  it('should complete a step', async () => {
    const mockResponse = { stepId: 'step_1', type: 'CLICK', status: 'COMPLETED', attempts: 1, result: { click: { accepted: true, textVersion: 'v1' } } };
    http.request.mockResolvedValue(mockResponse);

    const result = await steps.complete('tx_1', 'step_1', { data: 'sig' } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/steps/step_1/complete',
      body: { data: 'sig' },
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.attempts).toBe(1);
  });
});

describe('SigningResource', () => {
  let http: jest.Mocked<HttpClient>;
  let signing: SigningResource;

  beforeEach(() => {
    http = mockHttpClient();
    signing = new SigningResource(http);
  });

  it('should prepare signing', async () => {
    const mockResponse = { hashToSign: 'abc123', algorithm: 'SHA-256' };
    http.request.mockResolvedValue(mockResponse);

    const result = await signing.prepare('tx_1', { certificateChain: ['cert1'] } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/signing/prepare',
      body: { certificateChain: ['cert1'] },
    });
    expect(result.hashToSign).toBe('abc123');
  });

  it('should complete signing', async () => {
    const mockResponse = { status: 'signed' };
    http.request.mockResolvedValue(mockResponse);

    const result = await signing.complete('tx_1', { signature: 'sig_data' } as any);

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/transactions/tx_1/signing/complete',
      body: { signature: 'sig_data' },
    });
    expect(result.status).toBe('signed');
  });
});

describe('EvidenceResource', () => {
  let http: jest.Mocked<HttpClient>;
  let evidence: EvidenceResource;

  beforeEach(() => {
    http = mockHttpClient();
    evidence = new EvidenceResource(http);
  });

  it('should get evidence', async () => {
    const mockEvidence = { evidenceId: 'ev_1', transactionId: 'tx_1', tenantId: 'ten_1', status: 'COMPLETE', signer: { name: 'Test' }, steps: [], createdAt: '2024-01-01T00:00:00Z' };
    http.request.mockResolvedValue(mockEvidence);

    const result = await evidence.get('tx_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/transactions/tx_1/evidence',
    });
    expect(result.evidenceId).toBe('ev_1');
  });
});

describe('VerificationResource', () => {
  let http: jest.Mocked<HttpClient>;
  let verification: VerificationResource;

  beforeEach(() => {
    http = mockHttpClient();
    verification = new VerificationResource(http);
  });

  it('should verify with noAuth', async () => {
    const mockResponse = {
      evidenceId: 'ev_1',
      status: 'COMPLETED',
      transactionId: 'tx_1',
      purpose: 'DOCUMENT_SIGNATURE',
      documentHash: 'sha256-doc',
      evidenceHash: 'sha256-ev',
      policy: { profile: 'CLICK_ONLY' },
      steps: [{ type: 'CLICK_ACCEPT', status: 'COMPLETED', order: 0 }],
      signer: { displayName: 'João Silva' },
      tenantName: 'Acme Corp',
      createdAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    };
    http.request.mockResolvedValue(mockResponse);

    const result = await verification.verify('ev_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/verify/ev_1',
      noAuth: true,
    });
    expect(result.evidenceId).toBe('ev_1');
    expect(result.status).toBe('COMPLETED');
  });

  it('should get downloads with noAuth', async () => {
    const mockResponse = { files: [{ url: 'https://example.com/doc.pdf', type: 'signed_document' }] };
    http.request.mockResolvedValue(mockResponse);

    const result = await verification.downloads('ev_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/verify/ev_1/downloads',
      noAuth: true,
    });
    expect(result).toEqual(mockResponse);
  });

  it('should verify a document with an authenticated POST', async () => {
    const mockResponse = {
      signed: true,
      signatureCount: 1,
      signatures: [
        {
          method: 'CMS',
          type: 'pkcs7',
          subFilter: 'adbe.pkcs7.detached',
          filter: 'Adobe.PPKLite',
          confidence: 1.0,
        },
      ],
      checkedAt: '2026-06-24T12:00:00.000Z',
    };
    http.request.mockResolvedValue(mockResponse);

    const result = await verification.verifyDocument({ content: 'base64-pdf', filename: 'doc.pdf' });

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/verify/document',
      body: { content: 'base64-pdf', filename: 'doc.pdf' },
      timeout: undefined,
    });
    // Authenticated endpoint — must NOT set noAuth.
    expect(http.request.mock.calls[0][0]).not.toHaveProperty('noAuth');
    expect(result.signed).toBe(true);
    expect(result.signatureCount).toBe(1);
    expect(result.signatures[0].type).toBe('pkcs7');
    expect(result.signatures[0].subFilter).toBe('adbe.pkcs7.detached');
  });
});

describe('UsersResource', () => {
  let http: jest.Mocked<HttpClient>;
  let users: UsersResource;

  beforeEach(() => {
    http = mockHttpClient();
    users = new UsersResource(http);
  });

  it('should enroll a user with PUT', async () => {
    const mockResponse = {
      userExternalId: 'ext_1',
      enrollmentHash: 'sha256-enroll',
      enrollmentVersion: 1,
      enrollmentSource: 'FIRST_LIVENESS',
      enrolledAt: '2024-01-01T00:00:00Z',
      cpf: '12345678901',
      faceConfidence: 0.99,
    };
    http.request.mockResolvedValue(mockResponse);

    const result = await users.enroll('ext_1', { image: 'base64data', cpf: '12345678901' });

    expect(http.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/v1/users/ext_1/enrollment',
      body: { image: 'base64data', cpf: '12345678901' },
    });
    expect(result.enrolledAt).toBe('2024-01-01T00:00:00Z');
    expect(result.userExternalId).toBe('ext_1');
  });
});

describe('DocumentGroupsResource', () => {
  let http: jest.Mocked<HttpClient>;
  let documentGroups: DocumentGroupsResource;

  beforeEach(() => {
    http = mockHttpClient();
    documentGroups = new DocumentGroupsResource(http);
  });

  it('should create combined stamp', async () => {
    const mockResponse = { groupId: 'grp_1', signerCount: 3, downloadUrl: 'https://example.com/stamp.pdf', expiresIn: 3600 };
    http.request.mockResolvedValue(mockResponse);

    const result = await documentGroups.combinedStamp('grp_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/document-groups/grp_1/combined-stamp',
    });
    expect(result.downloadUrl).toBeDefined();
    expect(result.groupId).toBe('grp_1');
    expect(result.signerCount).toBe(3);
  });
});

// Phase 3: Error path tests for documents and webhooks
describe('DocumentsResource error paths', () => {
  let http: jest.Mocked<HttpClient>;
  let documents: DocumentsResource;

  beforeEach(() => {
    http = mockHttpClient();
    documents = new DocumentsResource(http);
  });

  it('should throw UnprocessableEntityError on upload with 422', async () => {
    http.request.mockRejectedValue(
      new UnprocessableEntityError({ type: 'about:blank', title: 'Unprocessable', status: 422, detail: 'CPF invalid' }),
    );

    await expect(
      documents.upload('tx_1', { content: 'base64', filename: 'doc.pdf' } as any),
    ).rejects.toThrow(UnprocessableEntityError);
  });

  it('should throw BadRequestError on confirm with 400', async () => {
    http.request.mockRejectedValue(
      new BadRequestError({ type: 'about:blank', title: 'Bad Request', status: 400 }),
    );

    await expect(
      documents.confirm('tx_1', { sha256Hash: 'abc' } as any),
    ).rejects.toThrow(BadRequestError);
  });
});

describe('WebhooksResource error paths', () => {
  let http: jest.Mocked<HttpClient>;
  let webhooks: WebhooksResource;

  beforeEach(() => {
    http = mockHttpClient();
    webhooks = new WebhooksResource(http);
  });

  it('should throw BadRequestError on register with 400', async () => {
    http.request.mockRejectedValue(
      new BadRequestError({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid URL' }),
    );

    await expect(
      webhooks.register({ url: 'not-a-url', events: [] } as any),
    ).rejects.toThrow(BadRequestError);
  });
});
