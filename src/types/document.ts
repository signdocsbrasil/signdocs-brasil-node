export interface UploadDocumentRequest {
  content: string;
  filename?: string;
}

export interface PresignRequest {
  contentType: string;
  filename: string;
}

export interface PresignResponse {
  uploadUrl: string;
  uploadToken: string;
  s3Key: string;
  expiresIn: number;
  contentType: string;
  instructions: string;
}

export interface ConfirmDocumentRequest {
  uploadToken: string;
}

export interface ConfirmDocumentResponse {
  transactionId: string;
  status: string;
  documentHash: string;
}

export interface DocumentUploadResponse {
  transactionId: string;
  documentHash: string;
  status: 'DOCUMENT_UPLOADED';
  uploadedAt: string;
}

export interface DownloadResponse {
  transactionId: string;
  documentHash?: string;
  originalUrl?: string;
  /**
   * Signed/stamped document. Present for PDF transactions
   * (`documentFormat: 'pdf'`), where the signature is embedded in the PDF.
   */
  signedUrl?: string;
  expiresIn: number;
  /**
   * Detached CAdES signature (`.p7s`). Returned instead of `signedUrl` for
   * non-PDF transactions (`documentFormat: 'generic'`), which cannot carry an
   * embedded signature.
   *
   * Caveat: the API presigns this key without checking that the object exists,
   * so a non-PDF signed under a click/OTP policy still returns a URL here — one
   * that 404s, because only the digital-certificate step writes a `.p7s`.
   * Branch on the signing policy, not on this field being set.
   */
  signatureUrl?: string;
  /**
   * `'pdf'` or `'generic'`, derived by the API from the uploaded bytes rather
   * than the filename.
   */
  documentFormat?: string;
}
