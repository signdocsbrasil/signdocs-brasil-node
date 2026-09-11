import type { Geolocation, ActionMetadata, OtpChannel } from './transaction';

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
    /**
     * Minimum facial-match similarity this transaction requires, for the
     * BIOMETRIC_MATCH and DOCUMENT_PHOTO_MATCH steps.
     *
     * Tightens only. The value must be at or above the tenant's configured
     * threshold; anything lower is rejected with 400 naming the current minimum
     * rather than being silently ignored — loosening identity checking is the
     * tenant's decision, not the caller's. Accepts a percentage (95) or a
     * fraction (0.95).
     */
    minSimilarity?: number;
      /**
     * Minimum liveness confidence this transaction requires (BIOMETRIC_LIVENESS).
     * Same rule as minSimilarity: tightens only, 400 when below the tenant's
     * floor. Any valid value is accepted when the tenant sets no liveness floor.
     */
    minLivenessConfidence?: number;
  };
  signer: {
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    cnpj?: string;
    userExternalId: string;
    otpChannel?: OtpChannel;
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
  /**
   * Channels SignDocs uses to deliver the signing link to this signer.
   * Omit to keep the previous behavior: the invite email only, under the
   * {@link Owner} rule. WhatsApp and Telegram are enabled on request;
   * `whatsapp` requires `signer.phone` in E.164 and `telegram` requires
   * `signer.cpf`. Each WhatsApp or Telegram send consumes the tenant's
   * message quota (429 once it runs out).
   */
  deliverVia?: Array<'email' | 'whatsapp' | 'telegram'>;
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
  /**
   * `true` when Meta accepted the WhatsApp message carrying the link —
   * accepted, not delivered. Omitted otherwise.
   */
  whatsappInviteSent?: boolean;
  /**
   * Result of the Telegram delivery, present whenever `deliverVia` included
   * `telegram`. `false` means the link did not reach the signer over
   * Telegram (no CPF registered with the bot, or the send failed).
   */
  telegramInviteSent?: boolean;
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

export interface MintSigningLinkResponse {
  sessionId: string;
  transactionId: string;
  /** Single-use signing URL. Treat it as a bearer credential. */
  url: string;
  /** Deadline of the original session — this call does not extend it. */
  expiresAt: string;
  /** Seconds remaining until `expiresAt`. */
  expiresIn: number;
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

/** Device characteristics recorded in the evidence alongside geolocation. */
export interface DeviceInfo {
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  platform?: string;
  touchPoints?: number;
}

export interface AdvanceSessionRequest {
  action:
    | 'confirm_signer'
    | 'accept'
    | 'verify_otp'
    | 'resend_otp'
    | 'start_liveness'
    | 'complete_liveness'
    | 'prepare_signing'
    | 'complete_signing'
    | 'complete_document_photo';
  /** CPF or CNPJ the signer types to confirm their identity (`confirm_signer`). */
  cpfCnpj?: string;
  otpCode?: string;
  otpChannel?: OtpChannel;
  livenessSessionId?: string;
  certificateChainPems?: string[];
  signatureRequestId?: string;
  rawSignatureBase64?: string;
  /** Base64 identity-document photo, max 5MB (`complete_document_photo`). */
  documentImage?: string;
  documentType?: string;
  /**
   * Sandbox-only simulated scores, so a rejection can be rehearsed. Read only
   * once the step already resolved to sandbox — they can never make a real
   * verification pass.
   */
  sandboxSimilarity?: number;
  sandboxLivenessConfidence?: number;
  sandboxBrightness?: number;
  sandboxSharpness?: number;
  geolocation?: Geolocation;
  deviceInfo?: DeviceInfo;
}

export interface AdvanceSessionStep {
  stepId: string;
  type: string;
  status?: string;
}

export interface SandboxData {
  otpCode?: string;
  /** The biometric step will auto-approve. */
  autoPass?: boolean;
}

/** Set when the policy diverted to an alternative step instead of failing. */
export interface AdvanceFallback {
  triggered: boolean;
  reason: string;
  nextStepType?: string;
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
  /**
   * Why a step was rejected, when the step fails but the *request* does not.
   *
   * This is the part that matters most in a biometric integration: a rejected
   * step comes back **200** with the session still `ACTIVE` and the reason
   * here — not as an HTTP error. Code that only branches on the HTTP status
   * reads a rejection as success.
   *
   * Emitted today: `BIOMETRIC_MATCH_FAILED`, `LIVENESS_NOT_COMPLETED`,
   * `DOCUMENT_QUALITY_LOW`, `DOCUMENT_MATCH_FAILED`, and the `SERPRO_*`
   * family.
   */
  errorCode?: string;
  /** pt-BR text addressed to the signer, ready to display. */
  errorDetail?: string;
  /**
   * True while the step has attempts left. Once they run out the step goes
   * FAILED and this is false — the signal that retrying will not help. Each
   * retry is billed as overage.
   */
  retryable?: boolean;
  fallback?: AdvanceFallback;
}

export interface BootstrapSigner {
  name: string;
  maskedEmail?: string;
  maskedCpf?: string;
  otpChannelSelectable?: boolean;
  availableOtpChannels?: Array<OtpChannel>;
}

export interface ResendOtpRequest {
  channel?: OtpChannel;
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
