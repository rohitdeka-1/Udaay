import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the API base URL from environment variable or fallback to localhost
 */
export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  // Ensure it ends with /api if not already
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
}
