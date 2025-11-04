import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumberWithCommas(value: number) {
  if (!Number.isFinite(value)) {
    return '';
  }
  return value.toLocaleString('en-US');
}
