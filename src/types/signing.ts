export interface PrepareSigningRequest {
  certificateChainPems: string[];
}

export interface PrepareSigningResponse {
  signatureRequestId: string;
  hashToSign: string;
  hashAlgorithm: 'SHA-256';
  signatureAlgorithm: 'RSASSA-PKCS1-v1_5';
}

export interface CompleteSigningRequest {
  signatureRequestId: string;
  rawSignatureBase64: string;
}

/**
 * ICP-Brasil signature timestamp (carimbo do tempo) embedded in the signature as an
 * RFC 3161 token from an accredited ACT. Present only for tenants with the feature.
 */
export interface SignatureTimestamp {
  /** Time attested by the ACT (ISO 8601). `signedAt` remains the SignDocs server time. */
  genTime: string;
  /** Distinguished name of the timestamp server certificate. */
  tsaName: string;
  /** Timestamp serial number (hex). */
  serial: string;
  /** ICP-Brasil timestamp policy OID, e.g. `2.16.76.1.6.2`. */
  policyOid: string;
  /** SHA-256 (hex) of the embedded token. */
  tokenSha256: string;
}

export interface CompleteSigningResponse {
  stepId: string;
  status: string;
  result: {
    digitalSignature: {
      certificateSubject: string;
      certificateSerial: string;
      certificateIssuer: string;
      algorithm: string;
      signedAt: string;
      signedPdfHash: string;
      signatureFieldName: string;
      /** Generic (non-PDF) documents only. */
      signedP7sHash?: string;
      documentFormat?: 'pdf' | 'generic';
      signatureTimestamp?: SignatureTimestamp;
    };
  };
}
