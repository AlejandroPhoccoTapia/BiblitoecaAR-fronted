import test from 'node:test';
import assert from 'node:assert/strict';
import { getTeacherSession, updateStudent, updateBook, updateScene, deleteBook, listBooks, downloadSceneQrPdf } from '../src/api.js';

test('API contract: CSRF, PUT with photo and empty assignments, errors, 204 and network failure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new globalThis.Response(JSON.stringify({ csrf_token: 'test-csrf', is_authenticated: true })));
  globalThis.document = { cookie: '' };
  t.after(() => { delete globalThis.document; });
  await getTeacherSession();
  let call;
  globalThis.fetch = async (url, options) => { call = { url, ...options }; return new globalThis.Response('{}'); };
  const photo = new globalThis.File(['image'], 'photo.png', { type: 'image/png' });
  await updateStudent(7, { full_name: 'Estudiante demo', classroom: '', is_active: true, photo, assigned_books: [] });
  assert.equal(call.method, 'PUT');
  assert.equal(call.url, '/api/teacher/students/7/');
  assert.equal(call.credentials, 'include');
  assert.equal(call.headers['X-CSRFToken'], 'test-csrf');
  assert.equal(call.headers['Content-Type'], undefined);
  assert.deepEqual(call.body.getAll('assigned_books'), []);
  assert.equal(call.body.get('full_name'), 'Estudiante demo');
  await updateBook(1, { title: 'Libro', description: '', is_published: false });
  assert.equal(call.method, 'PATCH');
  assert.equal(JSON.parse(call.body).description, '');
  await updateScene(1, { remove_glb_model: true });
  assert.equal(JSON.parse(call.body).remove_glb_model, true);
  globalThis.fetch = async () => new globalThis.Response(null, { status: 204 });
  assert.equal(await deleteBook(1), null);
  globalThis.fetch = async () => new globalThis.Response(JSON.stringify({ full_name: ['Requerido.'] }), { status: 400 });
  await assert.rejects(updateStudent(1, {}), (error) => error.status === 400 && error.message === 'Nombre: Requerido.');
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(listBooks(), /No se pudo conectar/);
});

test('QR PDF download requests authenticated binary content', async (t) => {
  let call;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    call = { url, ...options };
    return new globalThis.Response(new Uint8Array([37, 80, 68, 70]), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  });
  globalThis.document = { cookie: '' };
  t.after(() => { delete globalThis.document; });

  const pdf = await downloadSceneQrPdf(12);

  assert.equal(call.url, '/api/teacher/scenes/12/printable-qr/');
  assert.equal(call.credentials, 'include');
  assert.deepEqual([...new Uint8Array(await pdf.arrayBuffer())], [37, 80, 68, 70]);
});
