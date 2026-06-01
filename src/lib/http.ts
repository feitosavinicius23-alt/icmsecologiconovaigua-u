import type { Response } from "express";

export class AppError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;
  readonly issues?: string[];

  constructor(statusCode: number, publicMessage: string, issues?: string[]) {
    super(publicMessage);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.issues = issues;
  }
}

export function badRequest(message: string, issues?: string[]) {
  return new AppError(400, message, issues);
}

export function unprocessable(message: string, issues?: string[]) {
  return new AppError(422, message, issues);
}

export function sendError(res: Response, error: unknown, fallbackMessage: string, fallbackStatus = 500) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      erro: error.publicMessage,
      ...(error.issues?.length ? { pendencias: error.issues } : {}),
    });
  }

  console.error("[api-error]", error);
  return res.status(fallbackStatus).json({ erro: fallbackMessage });
}
