import { HttpClient } from '../http-client';
import { EnrollUserRequest, EnrollUserResponse } from '../types/user';

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
}
