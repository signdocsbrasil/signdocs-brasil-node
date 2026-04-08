export { SignDocsBrasilClient } from './client';
export { ClientConfig, Logger, DEFAULT_BASE_URL, DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES } from './config';
export {
  SignDocsBrasilError,
  SignDocsBrasilApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  AuthenticationError,
  ConnectionError,
  TimeoutError,
  ProblemDetail,
} from './errors';
export { verifyWebhookSignature, WebhookVerifyOptions } from './webhook-verifier';
export * from './types';
