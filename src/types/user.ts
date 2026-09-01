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

/**
 * Enrollment status.
 *
 * The reference image is hard-deleted by S3 lifecycle `retentionDays` after
 * enrolment, while the record outlives it by a grace period. `expiresAt` and
 * `expired` are what let an integrator run a re-enrolment sweep instead of
 * discovering the gap as a 422 mid-signature — and the sweep has to happen
 * inside that grace window, because once it passes this route answers 404,
 * which is indistinguishable from "never enrolled".
 */
export interface EnrollmentStatusResponse {
  userExternalId: string;
  enrollmentSource: EnrollmentSource;
  enrollmentVersion: number;
  enrollmentHash: string;
  enrolledAt: string;
  /** When the reference image is deleted. */
  expiresAt: string;
  /** True once `expiresAt` has passed — re-enrol. */
  expired: boolean;
  retentionDays: number;
  /** CPF is masked: this route is enumerable by userExternalId. */
  maskedCpf?: string;
  faceConfidence?: number;
  documentImageHash?: string;
}

/** Result of erasing an enrolment (LGPD art. 18). */
export interface DeleteEnrollmentResponse {
  userExternalId: string;
  deleted: boolean;
  deletedAt: string;
  enrollmentVersion?: number;
  /** Objects removed from storage; every version of each is destroyed. */
  objectsDeleted?: number;
  versionsDeleted?: number;
}
