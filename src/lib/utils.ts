import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "ETB") {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === "ETB" ? "USD" : currency,
    minimumFractionDigits: 2,
  }).format(amount).replace('$', 'ETB ')
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}
