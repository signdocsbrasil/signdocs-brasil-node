export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export class SignDocsBrasilError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignDocsBrasilError';
  }
}

export class SignDocsBrasilApiError extends SignDocsBrasilError {
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly problemDetail: ProblemDetail;

  constructor(problemDetail: ProblemDetail) {
    super(problemDetail.detail ?? problemDetail.title);
    this.name = 'SignDocsBrasilApiError';
    this.status = problemDetail.status;
    this.type = problemDetail.type;
    this.title = problemDetail.title;
    this.detail = problemDetail.detail;
    this.instance = problemDetail.instance;
    this.problemDetail = problemDetail;
  }
}

export class BadRequestError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'ConflictError';
  }
}

export class UnprocessableEntityError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'UnprocessableEntityError';
  }
}

export class RateLimitError extends SignDocsBrasilApiError {
  public readonly retryAfterSeconds?: number;

  constructor(problemDetail: ProblemDetail, retryAfterSeconds?: number) {
    super(problemDetail);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends SignDocsBrasilApiError {
  constructor(problemDetail: ProblemDetail) {
    super(problemDetail);
    this.name = 'ServiceUnavailableError';
  }
}

export class AuthenticationError extends SignDocsBrasilError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ConnectionError extends SignDocsBrasilError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends SignDocsBrasilError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

const ERROR_MAP: Record<number, new (pd: ProblemDetail, ...args: any[]) => SignDocsBrasilApiError> = {
  400: BadRequestError,
  401: UnauthorizedError,
  403: ForbiddenError,
  404: NotFoundError,
  409: ConflictError,
  422: UnprocessableEntityError,
  429: RateLimitError,
  500: InternalServerError,
  503: ServiceUnavailableError,
};

export function parseApiError(status: number, body: unknown, retryAfter?: number): SignDocsBrasilApiError {
  const problemDetail: ProblemDetail = (body && typeof body === 'object' && 'type' in body)
    ? body as ProblemDetail
    : {
        type: `https://api.signdocs.com.br/errors/${status}`,
        title: `HTTP ${status}`,
        status,
        detail: typeof body === 'string' ? body : undefined,
      };

  const ErrorClass = ERROR_MAP[status];
  if (status === 429) {
    return new RateLimitError(problemDetail, retryAfter);
  }
  if (ErrorClass) {
    return new ErrorClass(problemDetail);
  }
  return new SignDocsBrasilApiError(problemDetail);
}
