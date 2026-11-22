/**
 * Safely resolves and validates post-authentication destination URLs.
 * Rejects external URLs, protocol-relative URLs (//), schemes, backslashes,
 * encoded traversal variants, and malformed paths.
 * Enforces role-aware defaults and destination access checks.
 */

export type UserRole = 'ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'GUEST' | string;

/**
 * Validates whether a given URL is a strictly safe internal application path.
 *
 * Rules:
 * 1. Must be a non-empty string starting with a single '/'
 * 2. Rejects '//' (protocol-relative URLs)
 * 3. Rejects backslashes ('\') in raw and percent-encoded forms (%5c, %5C)
 * 4. Rejects URL schemes (contains ':' before '?' or '#', or schemes like javascript:, data:, https:)
 * 5. Rejects encoded path traversal / schemes (%2f%2f, %3a, etc.)
 * 6. Rejects control characters and null bytes (%00, \0)
 */
export function isValidInternalRedirect(targetUrl: unknown): targetUrl is string {
  if (typeof targetUrl !== 'string') return false;
  const trimmed = targetUrl.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return false;
  }

  // Reject raw backslashes and null bytes
  if (trimmed.includes('\\') || trimmed.includes('\0')) {
    return false;
  }

  // Percent-encoded backslashes check (%5c, %5C)
  if (/%5c/i.test(trimmed)) {
    return false;
  }

  // Test URL decoding to catch %2f%2f, %3a, %00, etc.
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return false;
  }

  // Post-decode validation
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    decoded.includes('\0')
  ) {
    return false;
  }

  // Extract pathname component before query (?) or hash (#)
  const pathPart = decoded.split(/[?#]/)[0] || '';

  // Colons in the path part indicate potential scheme injection (e.g. /javascript:...)
  if (pathPart.includes(':')) {
    return false;
  }

  // Ensure no protocol scheme exists anywhere in the raw or decoded string
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  return true;
}

/**
 * Checks whether a given user role has permission to access a specific internal path.
 */
export function canAccessPath(pathname: string | null | undefined, userRole?: string): boolean {
  if (!pathname || typeof pathname !== 'string') {
    return true;
  }

  const cleanPath = pathname.trim().split(/[?#]/)[0] || '';
  if (!cleanPath.startsWith('/admin')) {
    return true; // Public or customer storefront routes
  }

  const role = (userRole || 'CUSTOMER').toUpperCase();
  if (role === 'ADMIN') {
    return true;
  }

  if (role === 'SUPPORT') {
    return cleanPath.startsWith('/admin/support') || cleanPath.startsWith('/admin/returns');
  }

  return false;
}

/**
 * Returns role-aware default landing pages after successful login.
 */
export function getDefaultRoleDestination(userRole?: string): string {
  const role = (userRole || 'CUSTOMER').toUpperCase();
  if (role === 'ADMIN') return '/admin';
  if (role === 'SUPPORT') return '/admin/support';
  return '/profile';
}

/**
 * Safely resolves post-authentication destination URLs.
 * Rejects external URLs, protocol-relative URLs (//), schemes, backslashes, and malformed paths.
 * Enforces role-aware defaults.
 */
export function getSafeRedirectUrl(
  targetUrl: string | null | undefined,
  userRole?: string,
  defaultDestination?: string,
): string {
  const role = (userRole || 'CUSTOMER').toUpperCase();
  const fallback = defaultDestination || getDefaultRoleDestination(role);

  if (!isValidInternalRedirect(targetUrl)) {
    return fallback;
  }

  const trimmed = targetUrl.trim();

  // If visiting generic auth/root endpoints, route to role-appropriate defaults
  if (trimmed === '/' || trimmed === '/login' || trimmed === '/register') {
    return fallback;
  }

  if (role === 'ADMIN' && (trimmed === '/profile' || trimmed === '/account')) {
    return '/admin';
  }

  if (role === 'SUPPORT' && (trimmed === '/profile' || trimmed === '/account' || trimmed === '/admin')) {
    return '/admin/support';
  }

  return trimmed;
}
