import { encodePayload, formatApiError } from './lib/forms.js';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
let csrfToken = null;

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method ?? 'GET';
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  const requestCsrfToken = csrfToken ?? getCookie('csrftoken');

  if (requestCsrfToken && method !== 'GET') {
    headers['X-CSRFToken'] = requestCsrfToken;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...headers, ...options.headers },
      signal: options.signal ?? AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(error.name === 'TimeoutError'
      ? 'El servidor tardó demasiado. Comprueba si el cambio se guardó antes de intentarlo otra vez.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      message = formatApiError(body) || message;
    } catch {
      message = response.statusText || message;
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  const body = await response.json();
  rememberCsrfToken(body);
  return body;
}

function rememberCsrfToken(body) {
  if (body?.csrf_token) {
    csrfToken = body.csrf_token;
  }
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

export function listBooks() {
  return request('/teacher/books/');
}

export function getTeacherSession() {
  return request('/auth/me/');
}

export function loginTeacher(credentials) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function registerTeacher(data) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logoutTeacher() {
  return request('/auth/logout/', {
    method: 'POST',
  });
}

export function createBook(data) {
  return request('/teacher/books/', {
    method: 'POST',
    body: encodePayload(data),
  });
}

export function updateBook(id, data) {
  return request(`/teacher/books/${id}/`, {
    method: 'PATCH',
    body: encodePayload(data),
  });
}

export function deleteBook(id) {
  return request(`/teacher/books/${id}/`, {
    method: 'DELETE',
  });
}

export function listScenes() {
  return request('/teacher/scenes/');
}

export function createScene(data) {
  return request('/teacher/scenes/', {
    method: 'POST',
    body: encodePayload(data),
  });
}

export function updateScene(id, data) {
  return request(`/teacher/scenes/${id}/`, {
    method: 'PATCH',
    body: encodePayload(data),
  });
}

export function deleteScene(id) {
  return request(`/teacher/scenes/${id}/`, {
    method: 'DELETE',
  });
}

export function listStudents() {
  return request('/teacher/students/');
}

export function createStudent(data) {
  return request('/teacher/students/', {
    method: 'POST',
    body: encodePayload(data),
  });
}

export function updateStudent(id, data) {
  // This editor submits the entire profile. With a photo, PUT tells DRF to
  // interpret an omitted multipart list as [], rather than leaving it unchanged.
  return request(`/teacher/students/${id}/`, {
    method: 'PUT',
    body: encodePayload(data),
  });
}

export function deleteStudent(id) {
  return request(`/teacher/students/${id}/`, {
    method: 'DELETE',
  });
}
