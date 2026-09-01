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

// ── Batch enrollment ────────────────────────────────────────

export interface BatchEnrollmentItem extends EnrollUserRequest {
  userExternalId: string;
}

export interface EnrollUsersBatchRequest {
  enrollments: BatchEnrollmentItem[];
  /**
   * Inspect without writing. Every row is evaluated and returned with quality
   * metrics, and **nothing is persisted** — no image reaches storage, no record
   * is created, and the 90-day retention clock never starts.
   *
   * Use it to check reference photos *before* enrolling. Rekognition's
   * confidence answers "is this a face?", not "is this a good reference": a
   * dark, blurred photo enrols happily at 99.99 confidence and then fails face
   * matching months later, one employee at a time. A dry run surfaces that
   * while the batch is still in front of you.
   *
   * It costs the same one Rekognition call per row that enrolling would — the
   * saving is not money, it is not storing biometrics you have already judged
   * unusable.
   */
  dryRun?: boolean;
}

/** Advisory reasons a photo is usable but weak. */
export type EnrollmentWarning =
  | 'LOW_BRIGHTNESS'
  | 'LOW_SHARPNESS'
  | 'FACE_TOO_SMALL'
  | 'HEAD_TURNED';

export interface FaceQualityMetrics {
  brightness?: number;
  sharpness?: number;
}

export interface FacePoseMetrics {
  yaw?: number;
  pitch?: number;
  roll?: number;
}

export interface BatchEnrollmentResult {
  index: number;
  userExternalId?: string;
  /**
   * `enrolled` / `failed` on a real write; `usable` / `marginal` / `rejected`
   * on a dry run.
   *
   * `marginal` is the one to act on: it would enrol without complaint today and
   * is exactly what becomes a rejected signature later.
   */
  status: 'enrolled' | 'failed' | 'usable' | 'marginal' | 'rejected';
  error?: string;
  enrollmentVersion?: number;
  expiresAt?: string;
  faceConfidence?: number;
  /** Dry run only. Rekognition's 0-100 measures for the detected face. */
  quality?: FaceQualityMetrics;
  /** Dry run only. Head rotation in degrees. */
  pose?: FacePoseMetrics;
  /** Dry run only. Face area as a fraction of the frame, 0-1. */
  faceCoverage?: number;
  /** Dry run only. Empty on a clean photo. */
  warnings?: EnrollmentWarning[];
}

/**
 * Result of a batch enrollment.
 *
 * Partial success is the point, so this comes back `200` even when rows failed:
 * one unusable photo must not reject the other twenty-four. Read `results`, not
 * the HTTP status.
 */
export interface EnrollUsersBatchResponse {
  submitted: number;
  /** Real writes only. */
  succeeded?: number;
  failed?: number;
  /** Dry runs only. */
  dryRun?: boolean;
  usable?: number;
  marginal?: number;
  rejected?: number;
  results: BatchEnrollmentResult[];
}
