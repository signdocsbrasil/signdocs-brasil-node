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
  signedUrl?: string;
  expiresIn: number;
}
