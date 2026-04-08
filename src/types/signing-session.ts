import type { Geolocation, ActionMetadata } from './transaction';

export interface CreateSigningSessionRequest {
  purpose: 'DOCUMENT_SIGNATURE' | 'ACTION_AUTHENTICATION';
  policy: {
    profile: string;
    customSteps?: string[];
  };
  signer: {
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    cnpj?: string;
    userExternalId: string;
    otpChannel?: 'email' | 'sms';
    birthDate?: string;
  };
  document?: {
    content: string; // base64
    filename?: string;
  };
  action?: {
    type: string;
    description: string;
    reference?: string;
  };
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  locale?: 'pt-BR' | 'en' | 'es';
  expiresInMinutes?: number;
  appearance?: {
    brandColor?: string;
    logoUrl?: string;
    companyName?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    borderRadius?: string;
    headerStyle?: 'full' | 'minimal' | 'none';
    fontFamily?: string;
  };
}

export interface SigningSession {
  sessionId: string;
  transactionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  url: string;
  clientSecret: string;
  expiresAt: string;
  createdAt: string;
}

export interface SigningSessionStatus {
  sessionId: string;
  transactionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  completedAt?: string;
  evidenceId?: string;
}

export interface CancelSigningSessionResponse {
  sessionId: string;
  transactionId: string;
  status: 'CANCELLED';
  cancelledAt: string;
}

export interface SigningSessionListParams {
  status: string;
  limit?: number;
  cursor?: string;
}

export interface SigningSessionListItem {
  sessionId: string;
  transactionId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  locale: string;
}

export interface SigningSessionListResponse {
  sessions: SigningSessionListItem[];
  nextCursor?: string;
}

export interface AdvanceSessionRequest {
  action:
    | 'accept'
    | 'verify_otp'
    | 'resend_otp'
    | 'start_liveness'
    | 'complete_liveness'
    | 'prepare_signing'
    | 'complete_signing';
  otpCode?: string;
  livenessSessionId?: string;
  certificateChainPems?: string[];
  signatureRequestId?: string;
  rawSignatureBase64?: string;
  geolocation?: Geolocation;
}

export interface AdvanceSessionStep {
  stepId: string;
  type: string;
  status?: string;
}

export interface SandboxData {
  otpCode?: string;
}

export interface AdvanceSessionResponse {
  sessionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  currentStep?: AdvanceSessionStep;
  nextStep?: AdvanceSessionStep;
  evidenceId?: string;
  redirectUrl?: string;
  completedAt?: string;
  hostedUrl?: string;
  livenessSessionId?: string;
  signatureRequestId?: string;
  hashToSign?: string;
  hashAlgorithm?: string;
  signatureAlgorithm?: string;
  sandbox?: SandboxData;
}

export interface BootstrapSigner {
  name: string;
  maskedEmail?: string;
  maskedCpf?: string;
}

export interface BootstrapStep {
  stepId: string;
  type: string;
  status: string;
  order: number;
}

export interface BootstrapDocument {
  presignedUrl?: string;
  filename?: string;
  hash?: string;
}

export interface SigningSessionAppearanceResponse {
  brandColor?: string;
  logoUrl?: string;
  companyName?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  borderRadius?: string;
  headerStyle?: 'full' | 'minimal' | 'none';
  fontFamily?: string;
}

export interface SigningSessionBootstrap {
  sessionId: string;
  transactionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  purpose: 'DOCUMENT_SIGNATURE' | 'ACTION_AUTHENTICATION';
  signer: BootstrapSigner;
  steps: BootstrapStep[];
  locale: string;
  expiresAt: string;
  document?: BootstrapDocument;
  action?: ActionMetadata;
  appearance?: SigningSessionAppearanceResponse;
  returnUrl?: string;
  cancelUrl?: string;
}
