import { badRequest } from "./http.js";

export function roundDecimal(value: number, decimals = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safePercent(numerator: number, denominator: number, label: string, decimals = 6) {
  if (!Number.isFinite(numerator) || numerator < 0) {
    throw badRequest(`${label}: numerador invalido.`);
  }

  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw badRequest(`${label}: denominador deve ser maior que zero.`);
  }

  return roundDecimal((numerator / denominator) * 100, decimals);
}

export function sumDecimals(values: Array<number | null | undefined>, decimals = 6) {
  const factor = 10 ** decimals;
  const total = values.reduce<number>((acc, value) => acc + Math.round(Number(value || 0) * factor), 0);
  return roundDecimal(total / factor, decimals);
}
