const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api-proxy' : 'http://127.0.0.1:3001');


export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Set default credentials to include so HttpOnly cookies are sent
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(url, options);

  // If unauthorized, attempt to silent refresh token and retry once
  // Exclude auth-check endpoints to avoid infinite reload loops on login page
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/register') && !endpoint.includes('/auth/me')) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshResponse.ok) {
        // Retry the original request
        response = await fetch(url, options);
      } else {
        // If refresh fails, we must clear auth status via backend to clear HttpOnly cookies
        if (typeof window !== 'undefined') {
          await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
          window.location.href = '/auth/login?clear=1';
        }
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response.json();
}
