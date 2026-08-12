export class AppError extends Error {
  public readonly statusCode: number;
  /**
   * Identificador estável da recusa, para a tela reagir sem depender do texto.
   * A mensagem é escrita para humanos e muda com revisão de copy; comparar
   * `code` sobrevive a isso.
   */
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Erro conhecido do Prisma (violação de unique, FK ausente etc.).
 * Só os campos que consultamos — o objeto real traz mais.
 */
export interface PrismaKnownError {
  code: string;
  meta?: { target?: string[] | string };
}

/**
 * Estreita um `unknown` de catch para um erro do Prisma.
 *
 * Existe para os catches pararem de usar `any`: com `any`, um engano de nome
 * como `error.metaa?.target` compila em silêncio e vira undefined em produção.
 */
export function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}
