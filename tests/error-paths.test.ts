import { HttpClient } from '../src/http-client';
import { TransactionsResource } from '../src/resources/transactions';
import { DocumentsResource } from '../src/resources/documents';
import { WebhooksResource } from '../src/resources/webhooks';
import { StepsResource } from '../src/resources/steps';
import { SigningResource } from '../src/resources/signing';
import { EvidenceResource } from '../src/resources/evidence';
import { UsersResource } from '../src/resources/users';
import { DocumentGroupsResource } from '../src/resources/document-groups';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  ForbiddenError,
  RateLimitError,
  InternalServerError,
  UnauthorizedError,
} from '../src/errors';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

function makeProblem(status: number, title: string, detail: string) {
  return {
    type: `https://api.signdocs.com.br/errors/${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    status,
    detail,
    instance: '/v1/test',
  };
}

describe('Resource Error Paths', () => {
  let http: jest.Mocked<HttpClient>;

  beforeEach(() => {
    http = mockHttpClient();
  });

  describe('TransactionsResource', () => {
    let transactions: TransactionsResource;

    beforeEach(() => {
      transactions = new TransactionsResource(http);
    });

    it('should throw BadRequestError on create with invalid policy', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'Invalid policy profile: UNKNOWN_PROFILE'),
      );
      http.requestWithIdempotency.mockRejectedValue(error);

      await expect(transactions.create({ purpose: 'DOCUMENT_SIGNATURE', policy: { profile: 'UNKNOWN_PROFILE' as any }, signer: {} as any }))
        .rejects.toThrow(BadRequestError);
      await expect(transactions.create({ purpose: 'DOCUMENT_SIGNATURE', policy: { profile: 'UNKNOWN_PROFILE' as any }, signer: {} as any }))
        .rejects.toMatchObject({ detail: 'Invalid policy profile: UNKNOWN_PROFILE' });
    });

    it('should throw NotFoundError on get with nonexistent ID', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Transaction tx-nonexistent not found'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.get('tx-nonexistent')).rejects.toThrow(NotFoundError);
      await expect(transactions.get('tx-nonexistent'))
        .rejects.toMatchObject({ status: 404 });
    });

    it('should throw ConflictError on create with duplicate idempotency key', async () => {
      const error = new ConflictError(
        makeProblem(409, 'Conflict', 'Transaction tx-uuid-001 is already finalized'),
      );
      http.requestWithIdempotency.mockRejectedValue(error);

      await expect(transactions.create({ purpose: 'DOCUMENT_SIGNATURE', policy: { profile: 'CLICK_ONLY' }, signer: {} as any }))
        .rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError on finalize when already finalized', async () => {
      const error = new ConflictError(
        makeProblem(409, 'Conflict', 'Transaction tx_1 is already finalized'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.finalize('tx_1')).rejects.toThrow(ConflictError);
      await expect(transactions.finalize('tx_1'))
        .rejects.toMatchObject({ detail: 'Transaction tx_1 is already finalized' });
    });

    it('should throw BadRequestError on cancel in wrong state', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'Transaction cannot be cancelled in current state'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.cancel('tx_1')).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError when scope is insufficient', async () => {
      const error = new ForbiddenError(
        makeProblem(403, 'Forbidden', 'Missing required scope: transactions:write'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.list()).rejects.toThrow(ForbiddenError);
      await expect(transactions.list())
        .rejects.toMatchObject({ detail: 'Missing required scope: transactions:write' });
    });

    it('should throw RateLimitError with retryAfterSeconds', async () => {
      const error = new RateLimitError(
        makeProblem(429, 'Too Many Requests', 'Rate limit exceeded'),
        10,
      );
      http.request.mockRejectedValue(error);

      try {
        await transactions.list();
        fail('expected RateLimitError');
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfterSeconds).toBe(10);
      }
    });

    it('should throw InternalServerError on 500', async () => {
      const error = new InternalServerError(
        makeProblem(500, 'Internal Server Error', 'Unexpected error'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.get('tx_1')).rejects.toThrow(InternalServerError);
    });

    it('should throw UnauthorizedError on expired token', async () => {
      const error = new UnauthorizedError(
        makeProblem(401, 'Unauthorized', 'Token expired'),
      );
      http.request.mockRejectedValue(error);

      await expect(transactions.list()).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('DocumentsResource', () => {
    let documents: DocumentsResource;

    beforeEach(() => {
      documents = new DocumentsResource(http);
    });

    it('should throw UnprocessableEntityError on upload with invalid CPF', async () => {
      const error = new UnprocessableEntityError(
        makeProblem(422, 'Unprocessable Entity', 'CPF must be exactly 11 digits'),
      );
      http.request.mockRejectedValue(error);

      await expect(documents.upload('tx_1', { content: 'base64...' }))
        .rejects.toThrow(UnprocessableEntityError);
      await expect(documents.upload('tx_1', { content: 'base64...' }))
        .rejects.toMatchObject({ detail: 'CPF must be exactly 11 digits' });
    });

    it('should throw BadRequestError on confirm with missing hash', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'Missing sha256Hash field'),
      );
      http.request.mockRejectedValue(error);

      await expect(documents.confirm('tx_1', { uploadToken: 'tok_abc123' }))
        .rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError on download for nonexistent transaction', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Transaction not found'),
      );
      http.request.mockRejectedValue(error);

      await expect(documents.download('tx-nonexistent'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError on presign with invalid content type', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'contentType must be application/pdf'),
      );
      http.request.mockRejectedValue(error);

      await expect(documents.presign('tx_1', { contentType: 'text/plain', filename: 'bad.txt' }))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe('WebhooksResource', () => {
    let webhooks: WebhooksResource;

    beforeEach(() => {
      webhooks = new WebhooksResource(http);
    });

    it('should throw BadRequestError on register with HTTP URL', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'URL must be HTTPS'),
      );
      http.request.mockRejectedValue(error);

      await expect(webhooks.register({ url: 'http://insecure.example.com', events: ['TRANSACTION.COMPLETED'] }))
        .rejects.toThrow(BadRequestError);
      await expect(webhooks.register({ url: 'http://insecure.example.com', events: ['TRANSACTION.COMPLETED'] }))
        .rejects.toMatchObject({ detail: 'URL must be HTTPS' });
    });

    it('should throw NotFoundError on delete nonexistent webhook', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Webhook not found'),
      );
      http.request.mockRejectedValue(error);

      await expect(webhooks.delete('wh-nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError on test with invalid webhook', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'Webhook is disabled'),
      );
      http.request.mockRejectedValue(error);

      await expect(webhooks.test('wh_1')).rejects.toThrow(BadRequestError);
    });
  });

  describe('StepsResource', () => {
    let steps: StepsResource;

    beforeEach(() => {
      steps = new StepsResource(http);
    });

    it('should throw NotFoundError on start nonexistent step', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Step step-nonexistent not found'),
      );
      http.request.mockRejectedValue(error);

      await expect(steps.start('tx_1', 'step-nonexistent'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError on complete already completed step', async () => {
      const error = new ConflictError(
        makeProblem(409, 'Conflict', 'Step is already completed'),
      );
      http.request.mockRejectedValue(error);

      await expect(steps.complete('tx_1', 'step_1', { accepted: true }))
        .rejects.toThrow(ConflictError);
    });

    it('should throw UnprocessableEntityError on OTP with wrong code', async () => {
      const error = new UnprocessableEntityError(
        makeProblem(422, 'Unprocessable Entity', 'Invalid OTP code'),
      );
      http.request.mockRejectedValue(error);

      await expect(steps.complete('tx_1', 'step_1', { code: '000000' }))
        .rejects.toThrow(UnprocessableEntityError);
    });
  });

  describe('SigningResource', () => {
    let signing: SigningResource;

    beforeEach(() => {
      signing = new SigningResource(http);
    });

    it('should throw BadRequestError on prepare with empty cert chain', async () => {
      const error = new BadRequestError(
        makeProblem(400, 'Bad Request', 'certificateChainPems must not be empty'),
      );
      http.request.mockRejectedValue(error);

      await expect(signing.prepare('tx_1', { certificateChainPems: [] }))
        .rejects.toThrow(BadRequestError);
    });

    it('should throw UnprocessableEntityError on complete with invalid signature', async () => {
      const error = new UnprocessableEntityError(
        makeProblem(422, 'Unprocessable Entity', 'Invalid raw signature'),
      );
      http.request.mockRejectedValue(error);

      await expect(signing.complete('tx_1', { signatureRequestId: 'req_1', rawSignatureBase64: 'invalid' }))
        .rejects.toThrow(UnprocessableEntityError);
    });
  });

  describe('EvidenceResource', () => {
    let evidence: EvidenceResource;

    beforeEach(() => {
      evidence = new EvidenceResource(http);
    });

    it('should throw NotFoundError when evidence does not exist', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Evidence not found for transaction tx_1'),
      );
      http.request.mockRejectedValue(error);

      await expect(evidence.get('tx_1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when scope evidence:read is missing', async () => {
      const error = new ForbiddenError(
        makeProblem(403, 'Forbidden', 'Missing required scope: evidence:read'),
      );
      http.request.mockRejectedValue(error);

      await expect(evidence.get('tx_1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('UsersResource', () => {
    let users: UsersResource;

    beforeEach(() => {
      users = new UsersResource(http);
    });

    it('should throw UnprocessableEntityError on enroll with invalid image', async () => {
      const error = new UnprocessableEntityError(
        makeProblem(422, 'Unprocessable Entity', 'Image must be a valid JPEG base64'),
      );
      http.request.mockRejectedValue(error);

      await expect(users.enroll('usr_1', { image: 'not-base64', cpf: '12345678901' }))
        .rejects.toThrow(UnprocessableEntityError);
    });
  });

  describe('DocumentGroupsResource', () => {
    let groups: DocumentGroupsResource;

    beforeEach(() => {
      groups = new DocumentGroupsResource(http);
    });

    it('should throw NotFoundError on combined stamp for nonexistent group', async () => {
      const error = new NotFoundError(
        makeProblem(404, 'Not Found', 'Document group not found'),
      );
      http.request.mockRejectedValue(error);

      await expect(groups.combinedStamp('grp-nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when group is not fully signed', async () => {
      const error = new ConflictError(
        makeProblem(409, 'Conflict', 'Not all signers have completed signing'),
      );
      http.request.mockRejectedValue(error);

      await expect(groups.combinedStamp('grp_1')).rejects.toThrow(ConflictError);
    });
  });
});
