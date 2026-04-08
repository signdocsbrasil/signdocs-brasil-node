import { ClientConfig, resolveConfig } from './config';
import { AuthHandler } from './auth';
import { HttpClient } from './http-client';
import { HealthResource } from './resources/health';
import { TransactionsResource } from './resources/transactions';
import { DocumentsResource } from './resources/documents';
import { StepsResource } from './resources/steps';
import { SigningResource } from './resources/signing';
import { EvidenceResource } from './resources/evidence';
import { VerificationResource } from './resources/verification';
import { UsersResource } from './resources/users';
import { WebhooksResource } from './resources/webhooks';
import { DocumentGroupsResource } from './resources/document-groups';
import { SigningSessionsResource } from './resources/signing-sessions';
import { EnvelopesResource } from './resources/envelopes';

export class SignDocsBrasilClient {
  public readonly health: HealthResource;
  public readonly transactions: TransactionsResource;
  public readonly documents: DocumentsResource;
  public readonly steps: StepsResource;
  public readonly signing: SigningResource;
  public readonly evidence: EvidenceResource;
  public readonly verification: VerificationResource;
  public readonly users: UsersResource;
  public readonly webhooks: WebhooksResource;
  public readonly documentGroups: DocumentGroupsResource;
  public readonly signingSessions: SigningSessionsResource;
  public readonly envelopes: EnvelopesResource;

  constructor(config: ClientConfig) {
    const resolved = resolveConfig(config);

    const auth = new AuthHandler({
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
      privateKey: resolved.privateKey,
      kid: resolved.kid,
      baseUrl: resolved.baseUrl,
      scopes: resolved.scopes,
    });

    const http = new HttpClient({
      baseUrl: resolved.baseUrl,
      timeout: resolved.timeout,
      maxRetries: resolved.maxRetries,
      auth,
      fetchFn: resolved.httpClient,
      logger: resolved.logger,
    });

    this.health = new HealthResource(http);
    this.transactions = new TransactionsResource(http);
    this.documents = new DocumentsResource(http);
    this.steps = new StepsResource(http);
    this.signing = new SigningResource(http);
    this.evidence = new EvidenceResource(http);
    this.verification = new VerificationResource(http);
    this.users = new UsersResource(http);
    this.webhooks = new WebhooksResource(http);
    this.documentGroups = new DocumentGroupsResource(http);
    this.signingSessions = new SigningSessionsResource(http);
    this.envelopes = new EnvelopesResource(http);
  }
}
