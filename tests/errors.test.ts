import {
  parseApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  SignDocsBrasilApiError,
} from '../src/errors';

describe('parseApiError', () => {
  const makeProblem = (status: number, title: string) => ({
    type: `https://api.signdocs.com.br/errors/${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    status,
    detail: `Test detail for ${status}`,
    instance: '/v1/test',
  });

  const cases: [number, string, any][] = [
    [400, 'Bad Request', BadRequestError],
    [401, 'Unauthorized', UnauthorizedError],
    [403, 'Forbidden', ForbiddenError],
    [404, 'Not Found', NotFoundError],
    [409, 'Conflict', ConflictError],
    [422, 'Unprocessable Entity', UnprocessableEntityError],
    [429, 'Too Many Requests', RateLimitError],
    [500, 'Internal Server Error', InternalServerError],
    [503, 'Service Unavailable', ServiceUnavailableError],
  ];

  test.each(cases)('status %d should return %s', (status, title, ErrorClass) => {
    const problem = makeProblem(status, title);
    const error = parseApiError(status, problem);
    expect(error).toBeInstanceOf(ErrorClass);
    expect(error.status).toBe(status);
    expect(error.title).toBe(title);
    expect(error.detail).toBe(`Test detail for ${status}`);
    expect(error.instance).toBe('/v1/test');
  });

  it('should parse RateLimitError with retryAfterSeconds', () => {
    const problem = makeProblem(429, 'Too Many Requests');
    const error = parseApiError(429, problem, 5);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterSeconds).toBe(5);
  });

  it('should handle non-RFC-7807 body', () => {
    const error = parseApiError(418, 'I am a teapot');
    expect(error).toBeInstanceOf(SignDocsBrasilApiError);
    expect(error.status).toBe(418);
  });

  it('should expose full problemDetail', () => {
    const problem = { ...makeProblem(400, 'Bad Request'), validationErrors: [{ field: 'cpf' }] };
    const error = parseApiError(400, problem);
    expect(error.problemDetail.validationErrors).toEqual([{ field: 'cpf' }]);
  });
});
