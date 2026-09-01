import { HttpClient } from '../http-client';
import {
  EnrollUserRequest,
  EnrollUserResponse,
  EnrollmentStatusResponse,
  DeleteEnrollmentResponse,
  EnrollUsersBatchRequest,
  EnrollUsersBatchResponse,
} from '../types/user';

export class UsersResource {
  constructor(private readonly http: HttpClient) {}

  async enroll(userExternalId: string, request: EnrollUserRequest, options?: { timeout?: number }): Promise<EnrollUserResponse> {
    return this.http.request<EnrollUserResponse>({
      method: 'PUT',
      path: `/v1/users/${userExternalId}/enrollment`,
      body: request,
      timeout: options?.timeout,
    });
  }

  /**
   * Enrols up to 25 users in one request.
   *
   * The documented cap is 25 rows, but the binding limit is the request body —
   * roughly 6MB, and base64 inflates each photo by a third. Keep photos under
   * ~175KB (640x640 is ample) to use all 25 slots.
   *
   * Set `dryRun` to inspect the photos without storing anything.
   */
  async enrollBatch(request: EnrollUsersBatchRequest, options?: { timeout?: number }): Promise<EnrollUsersBatchResponse> {
    return this.http.request<EnrollUsersBatchResponse>({
      method: 'POST',
      path: '/v1/users/enrollments',
      body: request,
      timeout: options?.timeout,
    });
  }

  /**
   * Reads whether a user is enrolled and, crucially, until when.
   *
   * Use it to sweep your user base and re-enrol before `expired` flips —
   * nothing warns you on its own beyond the `ENROLLMENT.EXPIRING` webhook,
   * and once the grace window closes this throws NotFound rather than
   * reporting an expired enrolment.
   */
  async getEnrollment(userExternalId: string, options?: { timeout?: number }): Promise<EnrollmentStatusResponse> {
    return this.http.request<EnrollmentStatusResponse>({
      method: 'GET',
      path: `/v1/users/${userExternalId}/enrollment`,
      timeout: options?.timeout,
    });
  }

  /**
   * Erases a user's biometric enrolment (LGPD art. 18).
   *
   * Destroys every stored version of the reference image, not just the current
   * one, and removes the record. Irreversible.
   */
  async deleteEnrollment(userExternalId: string, options?: { timeout?: number }): Promise<DeleteEnrollmentResponse> {
    return this.http.request<DeleteEnrollmentResponse>({
      method: 'DELETE',
      path: `/v1/users/${userExternalId}/enrollment`,
      timeout: options?.timeout,
    });
  }
}
