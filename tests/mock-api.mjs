// Disposable in-memory fixtures for manual UI review. No production connection.
// Start alongside `npm run dev`; close this process to discard all data.
import http from 'node:http';
const books = [
  { id: 1, title: 'El bosque de los descubrimientos', description: 'Un viaje entre árboles, animales y pequeñas historias para explorar el mundo natural.', is_published: true, scenes_count: 2, updated_at: '2026-09-24T12:00:00Z' },
  { id: 2, title: 'Un universo por explorar', description: 'Planetas, estrellas y preguntas que nos llevan más allá.', is_published: false, scenes_count: 0, updated_at: '2026-09-23T12:00:00Z' },
  { id: 3, title: 'Pequeños grandes inventos', description: 'Ideas que cambiaron nuestra forma de vivir y aprender.', is_published: true, scenes_count: 0, updated_at: '2026-09-22T12:00:00Z' },
];
const scenes = [
  { id: 1, book: 1, title: 'Una hormiga muy curiosa', order: 1, text: 'En el bosque, cada pequeño ser tiene una gran historia.', prefab_key: 'Hormiga', qr_code: 'demo-hormiga' },
  { id: 2, book: 1, title: 'La vida entre los árboles', order: 4, text: 'Las hojas esconden nuevos descubrimientos.', prefab_key: 'Bosque', qr_code: 'demo-bosque' },
];
const students = [{ id: 1, full_name: 'Estudiante de demostración', classroom: 'Aula de prueba', assigned_books: [1, 2], assigned_books_detail: [], is_active: true, has_face_signature: false }];
let authenticated = true;
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const reply = (body, status = 200) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.url === '/api/auth/logout/') { authenticated = false; return reply({ is_authenticated: false, csrf_token: 'demo' }); }
  if (req.url === '/api/auth/login/') authenticated = true;
  if (req.url?.startsWith('/api/auth/')) return reply({ is_authenticated: authenticated, csrf_token: 'demo', user: { username: 'demo', first_name: 'Docente demo', is_staff: true } });
  const match = req.url?.match(/^\/api\/teacher\/(books|scenes|students)\/(\d+)?\/?$/);
  if (!match) return reply({ detail: 'Ruta de demostración no disponible.' }, 404);
  if (!authenticated) return reply({ detail: 'Inicia sesión.' }, 403);
  const collection = { books, scenes, students }[match[1]];
  const id = Number(match[2]);
  if (req.method === 'GET') return reply(id ? collection.find((row) => row.id === id) : collection);
  if (req.method === 'DELETE') { const index = collection.findIndex((row) => row.id === id); if (index >= 0) collection.splice(index, 1); res.statusCode = 204; return res.end(); }
  if (!req.headers['content-type']?.includes('application/json')) return reply({ detail: 'La demo solo guarda JSON. Las subidas se validan con Django real.' }, 400);
  let raw = ''; for await (const chunk of req) raw += chunk;
  let data; try { data = JSON.parse(raw); } catch { return reply({ detail: 'JSON inválido.' }, 400); }
  let row = collection.find((item) => item.id === id);
  if (!row) { row = { id: Math.max(0, ...collection.map((item) => item.id)) + 1 }; collection.push(row); }
  Object.assign(row, data, { updated_at: new Date().toISOString() });
  reply(row);
}).listen(8000, '127.0.0.1', () => globalThis.console.log('API DEMO local :8000. Datos ficticios en memoria; no valida autenticación real ni subidas.'));
