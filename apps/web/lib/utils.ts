import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const code = (err.code || (typeof err.message === 'string' ? err.message : '')).toLowerCase();

  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/user-not-found') ||
    code.includes('invalid email or password')
  ) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (code.includes('auth/email-already-in-use') || code.includes('already in use') || code.includes('email already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (code.includes('auth/weak-password') || code.includes('weak password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('auth/invalid-email') || code.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/network-request-failed') || code.includes('network connection failed')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  if (code.includes('auth/user-disabled')) {
    return 'This account has been disabled. Please contact customer support.';
  }
  if (err.message && !err.message.includes('auth/') && !err.message.includes('Firebase:')) {
    return err.message;
  }
  return 'Authentication failed. Please check your details and try again.';
}

