export type EnrollmentSource = 'BANK_PROVIDED' | 'FIRST_LIVENESS' | 'DOCUMENT_PHOTO';

export interface EnrollUserRequest {
  image: string;
  cpf: string;
  source?: EnrollmentSource;
}

export interface EnrollUserResponse {
  userExternalId: string;
  enrollmentHash: string;
  enrollmentVersion: number;
  enrollmentSource: EnrollmentSource;
  enrolledAt: string;
  cpf: string;
  faceConfidence: number;
  documentImageHash?: string;
  extractionConfidence?: number;
}
