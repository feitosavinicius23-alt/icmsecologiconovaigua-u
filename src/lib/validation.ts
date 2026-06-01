import { badRequest } from "./http.js";

type ValidationOptions = {
  min?: number;
  max?: number;
  required?: boolean;
};

export function sanitizeText(value: unknown, maxLength = 255) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeFilename(value: string) {
  return sanitizeText(value, 180).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function requiredText(value: unknown, field: string, maxLength = 255) {
  const parsed = sanitizeText(value, maxLength);
  if (!parsed) throw badRequest(`${field} e obrigatorio.`);
  return parsed;
}

export function optionalText(value: unknown, maxLength = 500) {
  const parsed = sanitizeText(value, maxLength);
  return parsed || null;
}

export function integerParam(value: unknown, field: string, options: ValidationOptions = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw badRequest(`${field} invalido.`);
  if (options.min !== undefined && parsed < options.min) throw badRequest(`${field} deve ser maior ou igual a ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) throw badRequest(`${field} deve ser menor ou igual a ${options.max}.`);
  return parsed;
}

export function optionalInteger(value: unknown, field: string, options: ValidationOptions = {}) {
  if (value === undefined || value === null || value === "") return null;
  return integerParam(value, field, options);
}

export function decimalNumber(value: unknown, field: string, options: ValidationOptions = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw badRequest(`${field} invalido.`);
  if (options.min !== undefined && parsed < options.min) throw badRequest(`${field} deve ser maior ou igual a ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) throw badRequest(`${field} deve ser menor ou igual a ${options.max}.`);
  return parsed;
}

export function enumValue<T extends string>(value: unknown, field: string, allowed: readonly T[]) {
  if (!allowed.includes(value as T)) {
    throw badRequest(`${field} deve ser um dos valores permitidos: ${allowed.join(", ")}.`);
  }
  return value as T;
}
