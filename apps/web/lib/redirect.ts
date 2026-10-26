/**
 * Safely resolves post-authentication destination URLs.
 * Rejects external URLs, protocol-relative URLs (//), javascript/data schemes, and malformed paths.
 */
export function getSafeRedirectUrl(
  targetUrl: string | null | undefined,
  userRole?: string,
  defaultDestination: string = '/profile',
): string {
  // If user has ADMIN role and no specific internal page was requested, route to /admin
  if (userRole === 'ADMIN') {
    if (!targetUrl || targetUrl === '/profile' || targetUrl === '/account') {
      return '/admin';
    }
  }

  if (!targetUrl || typeof targetUrl !== 'string') {
    return defaultDestination;
  }

  const trimmed = targetUrl.trim();

  // Validate safe internal relative paths
  // Must start with '/' but not '//' (protocol-relative) or '/\' (path traversal)
  // Must not contain colon ':' (prevents javascript:, data:, https: schemes)
  // Must not contain backslashes or null bytes
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('\\') &&
    !trimmed.includes(':') &&
    !trimmed.includes('\0')
  ) {
    return trimmed;
  }

  return defaultDestination;
}
