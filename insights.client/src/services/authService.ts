import { callApi } from "./apiService";

export interface User {
  userId: string;
  email: string;
  name: string;
}

export async function getCurrentUser() {
  return callApi<User>("/api/auth/me");
}

export function login() {
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const callbackUrl = window.location.origin + "/auth-callback";

  window.open(
    `/api/auth/login?returnUrl=${encodeURIComponent(callbackUrl)}`,
    "google-login",
    `width=${width},height=${height},left=${left},top=${top}`
  );
}

export async function logout() {
  const result = await callApi<{ message: string }>("/api/auth/logout", "POST");
  if (result.success) {
    window.location.href = "/";
  }
  return result;
}
