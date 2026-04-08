import { HttpClient } from '../http-client';
import {
  StartStepRequest,
  StartStepResponse,
  CompleteStepRequest,
  StepListResponse,
  StepCompleteResponse,
} from '../types/step';

export class StepsResource {
  constructor(private readonly http: HttpClient) {}

  async list(transactionId: string, options?: { timeout?: number }): Promise<StepListResponse> {
    return this.http.request<StepListResponse>({
      method: 'GET',
      path: `/v1/transactions/${transactionId}/steps`,
      timeout: options?.timeout,
    });
  }

  async start(transactionId: string, stepId: string, request?: StartStepRequest, options?: { timeout?: number }): Promise<StartStepResponse> {
    return this.http.request<StartStepResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/steps/${stepId}/start`,
      body: request ?? {},
      timeout: options?.timeout,
    });
  }

  async complete(transactionId: string, stepId: string, request?: CompleteStepRequest, options?: { timeout?: number }): Promise<StepCompleteResponse> {
    return this.http.request<StepCompleteResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/steps/${stepId}/complete`,
      body: request ?? {},
      timeout: options?.timeout,
    });
  }
}
