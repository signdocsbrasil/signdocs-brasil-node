import { HttpClient } from '../http-client';
import { CombinedStampResponse } from '../types/document-group';

export class DocumentGroupsResource {
  constructor(private readonly http: HttpClient) {}

  async combinedStamp(documentGroupId: string, options?: { timeout?: number }): Promise<CombinedStampResponse> {
    return this.http.request<CombinedStampResponse>({
      method: 'POST',
      path: `/v1/document-groups/${documentGroupId}/combined-stamp`,
      timeout: options?.timeout,
    });
  }
}
