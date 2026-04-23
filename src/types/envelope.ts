import type { Owner } from './signing-session';

export type EnvelopeStatus = 'CREATED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type SigningMode = 'PARALLEL' | 'SEQUENTIAL';

export interface CreateEnvelopeRequest {
  signingMode: SigningMode;
  totalSigners: number;
  document: { content: string; filename?: string };
  metadata?: Record<string, string>;
  locale?: 'pt-BR' | 'en' | 'es';
  returnUrl?: string;
  cancelUrl?: string;
  expiresInMinutes?: number;
  /**
   * When provided, SignDocs automatically sends an invite email to each
   * signer as they are added to the envelope (if their email differs
   * from the owner's), and notifies the owner on every signer completion
   * plus a final "all signed" message. See {@link Owner}.
   */
  owner?: Owner;
}

export interface Envelope {
  envelopeId: string;
  status: EnvelopeStatus;
  signingMode: SigningMode;
  totalSigners: number;
  documentHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface AddEnvelopeSessionRequest {
  signer: {
    name: string;
    userExternalId: string;
    cpf?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    otpChannel?: 'email' | 'sms';
  };
  policy: { profile: string };
  purpose?: 'DOCUMENT_SIGNATURE' | 'ACTION_AUTHENTICATION';
  signerIndex: number;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface EnvelopeSession {
  sessionId: string;
  transactionId: string;
  signerIndex: number;
  status: string;
  url: string;
  clientSecret: string;
  expiresAt: string;
  /**
   * Set to `true` when the server dispatched an invitation email to
   * `signer.email` at the time this session was added. Populated only
   * when the envelope was created with an `owner` and the signer's
   * email differs from the owner's.
   */
  inviteSent?: boolean;
}

export interface EnvelopeSessionSummary {
  sessionId: string;
  transactionId: string;
  signerIndex: number;
  signerName: string;
  status: string;
  completedAt?: string;
  evidenceId?: string;
}

export interface EnvelopeDetail {
  envelopeId: string;
  status: EnvelopeStatus;
  signingMode: SigningMode;
  totalSigners: number;
  addedSessions: number;
  completedSessions: number;
  documentHash: string;
  sessions: EnvelopeSessionSummary[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  combinedSignedPdfUrl?: string;
}

export interface EnvelopeCombinedStampResponse {
  envelopeId: string;
  downloadUrl: string;
  expiresIn: number;
  signerCount: number;
}
