import { Step, StepResult, CaptureMode, Geolocation, OtpChannel } from './transaction';

export interface StartStepRequest {
  captureMode?: CaptureMode;
  otpChannel?: OtpChannel;
}

export interface StartStepResponse {
  stepId: string;
  type: string;
  status: string;
  livenessSessionId?: string;
  hostedUrl?: string;
  message?: string;
  otpCode?: string;
}

export interface CompleteClickRequest {
  accepted: boolean;
  textVersion?: string;
}

export interface CompleteOtpRequest {
  code: string;
}

export interface CompleteLivenessRequest {
  livenessSessionId: string;
  geolocation?: Geolocation;
}

export interface CompleteBiometricMatchRequest {
  referenceImage?: {
    source: 'BASE64_IMAGE';
    data: string;
  };
  sandboxSimilarity?: number;
  geolocation?: Geolocation;
}

export interface CompletePurposeDisclosureRequest {
  acknowledged: boolean;
}

export interface CompleteDocumentPhotoMatchRequest {
  documentImage: string;
  documentType: 'RG' | 'CNH' | 'CTPS' | 'PASSPORT' | 'OTHER';
  geolocation?: Geolocation;
}

export type CompleteStepRequest =
  | CompleteClickRequest
  | CompleteOtpRequest
  | CompleteLivenessRequest
  | CompleteBiometricMatchRequest
  | CompletePurposeDisclosureRequest
  | CompleteDocumentPhotoMatchRequest
  | Record<string, unknown>;

export interface CompleteStepResponse extends Step {}

export interface StepListResponse {
  steps: Array<{
    stepId: string;
    type: string;
    status: string;
    order: number;
    attempts: number;
    maxAttempts: number;
    captureMode?: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
  }>;
}

export interface StepCompleteResponse {
  stepId: string;
  type: string;
  status: string;
  attempts: number;
  result?: StepResult;
}
