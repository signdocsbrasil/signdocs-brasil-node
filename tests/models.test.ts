import * as fs from 'fs';
import * as path from 'path';
import type { Transaction, TransactionListResponse, Step } from '../src/types/transaction';
import type { ProblemDetail } from '../src/errors';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

function loadFixture(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'));
}

describe('Model deserialization (TypeScript type assertions on fixture data)', () => {
  it('Transaction from transactions-create.json has all fields', () => {
    const fixture = loadFixture('transactions-create');
    const tx: Transaction = fixture.response.body;

    expect(tx.tenantId).toBe('abc123');
    expect(tx.transactionId).toBe('tx-uuid-001');
    expect(tx.status).toBe('CREATED');
    expect(tx.purpose).toBe('DOCUMENT_SIGNATURE');
    expect(tx.policy.profile).toBe('CLICK_ONLY');
    expect(tx.signer.name).toBe('João Silva');
    expect(tx.signer.email).toBe('joao@example.com');
    expect(tx.signer.userExternalId).toBe('user-ext-001');
    expect(tx.signer.cpf).toBe('12345678901');
    expect(tx.steps).toHaveLength(1);
    expect(tx.steps[0].stepId).toBe('step-uuid-001');
    expect(tx.steps[0].type).toBe('CLICK_ACCEPT');
    expect(tx.steps[0].status).toBe('PENDING');
    expect(tx.steps[0].order).toBe(1);
    expect(tx.steps[0].attempts).toBe(0);
    expect(tx.steps[0].maxAttempts).toBe(3);
    expect(tx.metadata).toEqual({ contractId: 'CTR-2024-001' });
    expect(tx.expiresAt).toBe('2024-11-16T00:00:00.000Z');
    expect(tx.createdAt).toBe('2024-11-15T00:00:00.000Z');
  });

  it('Transaction from transactions-get.json has nested step results', () => {
    const fixture = loadFixture('transactions-get');
    const tx: Transaction = fixture.response.body;

    expect(tx.status).toBe('IN_PROGRESS');
    expect(tx.steps).toHaveLength(2);

    const completedStep: Step = tx.steps[0];
    expect(completedStep.status).toBe('COMPLETED');
    expect(completedStep.result).toBeDefined();
    expect(completedStep.result!.click).toBeDefined();
    expect(completedStep.result!.click!.accepted).toBe(true);
    expect(completedStep.result!.click!.textVersion).toBe('v1.0');
    expect(completedStep.completedAt).toBe('2024-11-15T00:01:00.000Z');

    const pendingStep: Step = tx.steps[1];
    expect(pendingStep.type).toBe('OTP_CHALLENGE');
    expect(pendingStep.status).toBe('PENDING');
    expect(pendingStep.result).toBeUndefined();
  });

  it('Transaction with minimal fields (only required) has optional fields undefined', () => {
    const minimal: Transaction = {
      tenantId: 'abc',
      transactionId: 'tx-1',
      status: 'CREATED',
      purpose: 'DOCUMENT_SIGNATURE',
      policy: { profile: 'CLICK_ONLY' },
      signer: { name: 'Test', userExternalId: 'u1' },
      steps: [],
      expiresAt: '2024-12-31T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(minimal.metadata).toBeUndefined();
    expect(minimal.documentGroupId).toBeUndefined();
    expect(minimal.signerIndex).toBeUndefined();
    expect(minimal.totalSigners).toBeUndefined();
  });

  it('TransactionListResponse from transactions-list.json has pagination', () => {
    const fixture = loadFixture('transactions-list');
    const resp: TransactionListResponse = fixture.response.body;

    expect(resp.transactions).toHaveLength(2);
    expect(resp.count).toBe(2);
    expect(resp.nextToken).toBeDefined();
    expect(resp.transactions[0].signer.name).toBe('Maria Santos');
    expect(resp.transactions[1].policy.profile).toBe('BIOMETRIC');
  });

  it('ProblemDetail from error-400.json has all RFC 7807 fields', () => {
    const fixture = loadFixture('error-400');
    const pd: ProblemDetail = fixture.response.body;

    expect(pd.type).toBe('https://api.signdocs.com.br/errors/bad-request');
    expect(pd.title).toBe('Bad Request');
    expect(pd.status).toBe(400);
    expect(pd.detail).toBe('Invalid policy profile: UNKNOWN_PROFILE');
    expect(pd.instance).toBe('/v1/transactions');
  });

  it('Evidence from evidence-get.json has nested objects', () => {
    const fixture = loadFixture('evidence-get');
    const evidence = fixture.response.body;

    expect(evidence.tenantId).toBe('abc123');
    expect(evidence.evidenceId).toBe('ev-uuid-001');
    expect(evidence.signer.name).toBe('João Silva');
    expect(evidence.signer.cpf).toBe('12345678901');
    expect(evidence.steps).toHaveLength(1);
    expect(evidence.steps[0].type).toBe('CLICK_ACCEPT');
    expect(evidence.steps[0].result.click.accepted).toBe(true);
    expect(evidence.document.hash).toBeDefined();
    expect(evidence.document.filename).toBe('contract.pdf');
  });
});
