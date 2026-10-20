const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('dv_jwt');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.code = data.error?.code || 'API_ERROR';
    err.status = response.status;
    err.details = data.error?.details;
    throw err;
  }

  return data;
}

/**
 * Upload binary file (photo, receipt) directly via presigned PUT URL
 */
export async function uploadFileDirect(category, file) {
  // 1. Get presigned upload URL from backend
  const presignRes = await apiRequest('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ category, mimeType: file.type || 'image/jpeg' }),
  });

  const { uploadUrl, fileKey } = presignRes.data;

  // 2. Stream binary file directly to S3 / R2 or backend
  const token = localStorage.getItem('dv_jwt');
  const headers = {
    'Content-Type': file.type || 'image/jpeg',
  };
  if (token && uploadUrl.startsWith('/api')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text().catch(() => '');
    throw new Error(errorText || `Upload failed with status ${uploadResponse.status}`);
  }

  return fileKey;
}
