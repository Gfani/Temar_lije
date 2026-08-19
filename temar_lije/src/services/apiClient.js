const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('temar_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Helper to get full URL for uploaded static files (materials, submissions)
 */
export function getFileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

// ---- MATERIALS API ----
export async function getMaterials(classId) {
  const res = await fetch(`${API_BASE_URL}/materials/class/${classId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch materials');
  return res.json();
}

export async function uploadMaterial(formData) {
  const res = await fetch(`${API_BASE_URL}/materials/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload material');
  }
  return res.json();
}

// ---- ASSIGNMENTS API ----
export async function getAssignments(classId) {
  const res = await fetch(`${API_BASE_URL}/assignments/class/${classId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
}

export async function createAssignment(assignmentData) {
  const res = await fetch(`${API_BASE_URL}/assignments/create`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(assignmentData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create assignment');
  }
  return res.json();
}

export async function submitAssignment(assignmentId, formData) {
  const res = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to submit assignment');
  }
  return res.json();
}

export async function getSubmissions(assignmentId) {
  const res = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submissions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
}

// ---- ATTENDANCE API ----
export async function recordCheckIn(classId, studentId) {
  const res = await fetch(`${API_BASE_URL}/attendance/check-in`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ classId, studentId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Check-in failed');
  }
  return res.json();
}

export async function getAttendanceReport(classId) {
  const res = await fetch(`${API_BASE_URL}/attendance/class/${classId}/report`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch attendance report');
  return res.json();
}

// ---- LIVE CLASS API ----
export async function startLiveSession(classId) {
  const res = await fetch(`${API_BASE_URL}/live-class/start`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ classId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to start live session');
  }
  return res.json();
}

export async function endLiveSession(classId) {
  const res = await fetch(`${API_BASE_URL}/live-class/end`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ classId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to end live session');
  }
  return res.json();
}

export async function getLiveToken(classId, userId, role = 'STUDENT') {
  const res = await fetch(
    `${API_BASE_URL}/live-class/${classId}/token?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`,
    {
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to get session token');
  }
  return res.json();
}
