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
  /** Present only when the evidence belongs to a multi-signer envelope. */
  envelopeId?: string;
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
    cpfCnpj?: string;
  };
  tenantName: string;
  tenantCnpj?: string;
  createdAt: string;
}

export interface VerificationDownloadArtifact {
  url: string;
  filename: string;
}

export interface VerificationDownloadsResponse {
  evidenceId: string;
  downloads: {
    originalDocument: VerificationDownloadArtifact | null;
    evidencePack: VerificationDownloadArtifact | null;
    finalPdf: VerificationDownloadArtifact | null;
    /**
     * PKCS#7 / CMS detached `.p7s` for digital-cert signing of non-PDF
     * documents. Present only for **standalone signing sessions**
     * (single-signer). For evidences belonging to a multi-signer envelope
     * this field is omitted entirely; the consolidated `.p7s` for the
     * envelope is exposed via {@link EnvelopeVerificationResponse}.
     */
    signedSignature?: VerificationDownloadArtifact | null;
  };
}

/** Per-signer entry in {@link EnvelopeVerificationResponse}. */
export interface EnvelopeVerificationSigner {
  signerIndex: number;
  displayName: string;
  cpfCnpj?: string;
  status: string;
  policyProfile?: string;
  /** Present only for completed signers; use with `verification.verify()`. */
  evidenceId?: string;
  completedAt?: string;
}

/**
 * Response from `GET /v1/verify/envelope/{envelopeId}` — public verification
 * data for a multi-signer envelope.
 */
export interface EnvelopeVerificationResponse {
  envelopeId: string;
  status: string;
  signingMode: 'PARALLEL' | 'SEQUENTIAL';
  totalSigners: number;
  completedSessions: number;
  documentHash: string;
  tenantName?: string;
  tenantCnpj?: string;
  signers: EnvelopeVerificationSigner[];
  downloads?: {
    /** PDF combined with all embedded signatures (PDF envelopes only). */
    combinedSignedPdf?: VerificationDownloadArtifact;
    /**
     * Consolidated PKCS#7 / CMS detached `.p7s` containing every signer's
     * `SignerInfo` (non-PDF envelopes only). Promoted on completion of the
     * final signer.
     */
    consolidatedSignature?: VerificationDownloadArtifact;
  };
  createdAt: string;
  completedAt?: string;
}
