/**
 * OpporHub OS — Domain Error Hierarchy
 * Production-grade error definitions that fail fast and honestly.
 */

export class DomainError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string) {
    super(message, 500, 'CONFIGURATION_ERROR');
  }
}

export class ServiceUnavailableError extends DomainError {
  constructor(message = 'The requested service is temporarily unavailable. Please try again later.') {
    super(message, 530, 'SERVICE_UNAVAILABLE');
  }
}

export class ValidationError extends DomainError {
  public readonly fieldErrors?: Record<string, any>;

  constructor(message = 'Validation failed', fieldErrors?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}
