import { Policy, StepResult } from './transaction';

export interface Evidence {
  tenantId: string;
  transactionId: string;
  evidenceId: string;
  status: string;
  signer: {
    name: string;
    cpf?: string;
    cnpj?: string;
    userExternalId: string;
  };
  steps: EvidenceStep[];
  document?: {
    hash: string;
    filename: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface EvidenceStep {
  type: string;
  status: string;
  completedAt?: string;
  result?: Record<string, unknown>;
}

export interface VerificationResponse {
  evidenceId: string;
  status: string;
  transactionId: string;
  completedAt?: string;
  purpose: string;
  documentHash: string;
  evidenceHash: string;
  policy: Policy;
  steps: Array<{
    type: string;
    status: string;
    order: number;
    completedAt?: string;
  }>;
  signer: {
    displayName?: string;
  };
  tenantName: string;
  createdAt: string;
}

export interface VerificationDownloadsResponse {
  evidenceId: string;
  downloads: {
    evidencePack?: { url: string; filename: string };
    signedPdf?: { url: string; filename: string };
    finalPdf?: { url: string; filename: string };
  };
}
