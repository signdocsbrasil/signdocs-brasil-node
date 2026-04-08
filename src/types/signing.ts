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
    };
  };
}
