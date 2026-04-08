export type TransactionStatus =
  | 'CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export type StepType =
  | 'CLICK_ACCEPT'
  | 'OTP_CHALLENGE'
  | 'OTP_VERIFY'
  | 'BIOMETRIC_LIVENESS'
  | 'BIOMETRIC_MATCH'
  | 'DIGITAL_SIGN_A1'
  | 'SERPRO_IDENTITY_CHECK'
  | 'DOCUMENT_PHOTO_MATCH'
  | 'PURPOSE_DISCLOSURE';

export type StepStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'FAILED';

export type PolicyProfile =
  | 'CLICK_ONLY'
  | 'CLICK_PLUS_OTP'
  | 'BIOMETRIC'
  | 'BIOMETRIC_PLUS_OTP'
  | 'DIGITAL_CERTIFICATE'
  | 'BIOMETRIC_SERPRO'
  | 'BIOMETRIC_DOCUMENT_FALLBACK'
  | 'CUSTOM';

export type TransactionPurpose = 'DOCUMENT_SIGNATURE' | 'ACTION_AUTHENTICATION';

export type CaptureMode = 'BANK_APP' | 'HOSTED_PAGE';

export type OtpChannel = 'email' | 'sms';

export type GeolocationSource = 'GPS' | 'IP' | 'WIFI' | 'CELL';

export interface Geolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: GeolocationSource;
}

export interface Policy {
  profile: PolicyProfile;
  customSteps?: StepType[];
}

export interface Signer {
  name: string;
  email?: string;
  phone?: string;
  userExternalId: string;
  displayName?: string;
  cpf?: string;
  cnpj?: string;
  birthDate?: string;
  otpChannel?: OtpChannel;
}

export interface ActionMetadata {
  type: string;
  description: string;
  reference?: string;
}

export interface DigitalSignatureMetadata {
  signatureFieldName?: string;
  signatureReason?: string;
  signatureLocation?: string;
}

export interface CreateTransactionRequest {
  purpose: TransactionPurpose;
  policy: Policy;
  signer: Signer;
  document?: {
    content: string;
    filename?: string;
  };
  action?: ActionMetadata;
  digitalSignature?: DigitalSignatureMetadata;
  documentGroupId?: string;
  signerIndex?: number;
  totalSigners?: number;
  metadata?: Record<string, string>;
  expiresInMinutes?: number;
}

export type GovernmentDatabase = 'SERPRO_DATAVALID' | 'TSE' | 'IDRC';

export interface GovernmentDbValidation {
  database: GovernmentDatabase;
  validatedAt: string;
  cpfHash: string;
  biometricScore: number;
  cached: boolean;
  cacheVerifySimilarity?: number;
  cacheExpiresAt?: string;
}

export interface StepResult {
  liveness?: {
    confidence: number;
    provider: string;
    captureMode: CaptureMode;
    complianceStandards?: string[];
  };
  match?: {
    similarity: number;
    threshold: number;
  };
  otp?: {
    verified: boolean;
    channel: string;
  };
  click?: {
    accepted: boolean;
    textVersion: string;
  };
  purposeDisclosure?: {
    acknowledged: boolean;
    disclosureTextHash: string;
    disclosureVersion: string;
    notificationChannel: 'email' | 'hosted_page' | 'api_inline';
    notificationSentAt?: string;
  };
  digitalSignature?: {
    certificateSubject: string;
    certificateSerial: string;
    certificateIssuer: string;
    algorithm: string;
    signedAt: string;
    signedPdfHash: string;
    signedPdfS3Key?: string;
    signatureFieldName: string;
  };
  serproIdentity?: {
    valid: boolean;
    provider: string;
    nameMatch: boolean;
    birthDateMatch: boolean;
    biometricMatch: boolean;
    biometricConfidence: number;
    governmentDatabase?: GovernmentDatabase;
  };
  governmentDbValidation?: GovernmentDbValidation;
  geolocation?: Geolocation;
  documentPhotoMatch?: {
    documentType: string;
    extractedFaceHash: string;
    similarity: number;
    threshold: number;
    faceExtractionConfidence: number;
    biographicValidation?: {
      nameMatch: boolean | null;
      cpfMatch: boolean | null;
      birthDateMatch: boolean | null;
      overallValid: boolean;
      matchedFields: string[];
      unmatchedFields: string[];
    };
  };
  quality?: {
    brightness: number;
    sharpness: number;
    faceAreaRatio: number;
  };
  providerTimestamp?: string;
}

export interface Step {
  tenantId: string;
  transactionId: string;
  stepId: string;
  type: StepType;
  status: StepStatus;
  order: number;
  attempts: number;
  maxAttempts: number;
  captureMode?: CaptureMode;
  startedAt?: string;
  completedAt?: string;
  result?: StepResult;
  error?: string;
}

export interface Transaction {
  tenantId: string;
  transactionId: string;
  status: TransactionStatus;
  purpose: TransactionPurpose;
  policy: Policy;
  signer: Signer;
  steps: Step[];
  documentGroupId?: string;
  signerIndex?: number;
  totalSigners?: number;
  metadata?: Record<string, string>;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  submissionDeadline?: string;
  deadlineStatus?: 'PENDING' | 'APPROACHING' | 'OVERDUE';
}

export interface TransactionListResponse {
  transactions: Transaction[];
  nextToken?: string;
  count: number;
}

export interface TransactionListParams {
  status?: TransactionStatus;
  userExternalId?: string;
  documentGroupId?: string;
  limit?: number;
  nextToken?: string;
  startDate?: string;
  endDate?: string;
}

export interface CancelTransactionResponse {
  transactionId: string;
  status: 'CANCELLED';
  cancelledAt: string;
}

export interface FinalizeResponse {
  transactionId: string;
  status: 'COMPLETED';
  evidenceId: string;
  evidenceHash: string;
  completedAt: string;
}
