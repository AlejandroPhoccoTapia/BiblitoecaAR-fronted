// Preserve empty strings and false; omit only absent file/optional values.
export function encodePayload(data) {
  const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.some(([, value]) => value instanceof Blob)) {
    return JSON.stringify(Object.fromEntries(entries));
  }
  const body = new FormData();
  for (const [key, value] of entries) {
    if (Array.isArray(value)) value.forEach((item) => body.append(key, item));
    else body.append(key, value);
  }
  return body;
}

const fieldNames = {
  title: 'Título', text: 'Texto', prefab_key: 'Clave del modelo', username: 'Usuario',
  password: 'Contraseña', full_name: 'Nombre', classroom: 'Aula', photo: 'Foto',
  assigned_books: 'Libros asignados', cover: 'Portada', glb_model: 'Modelo 3D',
  audio: 'Audio', order: 'Orden', non_field_errors: 'Formulario',
};

export function formatApiError(body) {
  if (typeof body === 'string') return body;
  if (!body || typeof body !== 'object') return '';
  if (body.detail) return String(body.detail);
  return Object.entries(body).map(([key, errors]) => {
    const message = Array.isArray(errors) ? errors.join(' ') : typeof errors === 'object' ? formatApiError(errors) : String(errors);
    return `${fieldNames[key] || key}: ${message}`;
  }).join('\n');
}

export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function nextChapterOrder(scenes) {
  return Math.max(0, ...scenes.map((scene) => Number(scene.order) || 0)) + 1;
}
