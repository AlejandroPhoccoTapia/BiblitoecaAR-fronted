const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method ?? 'GET';
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  const csrfToken = getCookie('csrftoken');

  if (csrfToken && method !== 'GET') {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      message = body.detail || JSON.stringify(body);
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function asFormData(data) {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value);
  });

  return formData;
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
    body: asFormData(data),
  });
}

export function updateBook(id, data) {
  return request(`/teacher/books/${id}/`, {
    method: 'PATCH',
    body: asFormData(data),
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
    body: asFormData(data),
  });
}

export function updateScene(id, data) {
  return request(`/teacher/scenes/${id}/`, {
    method: 'PATCH',
    body: asFormData(data),
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
    body: asFormData(data),
  });
}

export function updateStudent(id, data) {
  return request(`/teacher/students/${id}/`, {
    method: 'PATCH',
    body: asFormData(data),
  });
}

export function deleteStudent(id) {
  return request(`/teacher/students/${id}/`, {
    method: 'DELETE',
  });
}
