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
