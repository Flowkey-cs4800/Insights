import { callApi } from './apiService';

export interface User {
  userId: string;
  email: string;
  name: string;
}

export async function getCurrentUser() {
  return callApi<User>('/api/auth/me');
}

export function login(returnUrl?: string) {
  const url = returnUrl 
    ? `/api/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/api/auth/login';
  window.location.href = url;
}

export async function logout() {
  const result = await callApi<{ message: string }>('/api/auth/logout', 'POST');
  if (result.success) {
    window.location.href = '/';
  }
  return result;
}