import type { Geolocation, ActionMetadata } from './transaction';

/**
 * Identity of the requester creating a signing session or envelope,
 * distinct from the signer(s). When provided, SignDocs automatically:
 *
 *   1. Emails each signer an invitation with their signing URL — when
 *      signer.email differs from owner.email (case-insensitive).
 *   2. Emails the owner a completion notification per signer completion
 *      (and a final "all signed" message for envelopes).
 *
 * Omit `owner` to keep the traditional behavior: the caller delivers
 * signing URLs via their own channels and relies on webhooks for
 * completion state.
 */
export interface Owner {
  email?: string;
  name?: string;
}

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
    otpChannelSelectable?: boolean;
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
  /** See {@link Owner} for behavior when set. */
  owner?: Owner;
}

export interface SigningSession {
  sessionId: string;
  transactionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  url: string;
  clientSecret: string;
  expiresAt: string;
  createdAt: string;
  /**
   * Set to `true` when the server dispatched an invitation email to
   * `signer.email` at session creation. Populated only when `owner` was
   * provided and `signer.email` differs from `owner.email`.
   */
  inviteSent?: boolean;
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
  otpChannel?: 'email' | 'sms';
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
  otpChannelSelectable?: boolean;
  availableOtpChannels?: Array<'email' | 'sms'>;
}

export interface ResendOtpRequest {
  channel?: 'email' | 'sms';
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
