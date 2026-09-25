import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePayload, formatApiError, normalizeSearch, nextChapterOrder } from '../src/lib/forms.js';

test('JSON retains empty fields, false, zero and an empty assignment list', () => {
  assert.deepEqual(JSON.parse(encodePayload({ description: '', is_published: false, order: 0, assigned_books: [], cover: null })), {
    description: '', is_published: false, order: 0, assigned_books: [],
  });
});
test('multipart sends multiple books as repeated IDs alongside an image', () => {
  const photo = new globalThis.File(['photo'], 'test.png', { type: 'image/png' });
  const payload = encodePayload({ photo, assigned_books: [4, 9], classroom: '', is_active: false });
  assert.deepEqual(payload.getAll('assigned_books'), ['4', '9']);
  assert.equal(payload.get('classroom'), '');
  assert.equal(payload.get('is_active'), 'false');
  assert.equal(payload.get('photo').name, 'test.png');
});
test('backend errors retain individual field context', () => {
  assert.equal(formatApiError({ assigned_books: ['Invalid pk.'], full_name: ['Required.'] }), 'Libros asignados: Invalid pk.\nNombre: Required.');
  assert.equal(formatApiError({ detail: 'Sesión caducada.' }), 'Sesión caducada.');
});
test('search ignores accents, case and surrounding whitespace', () => {
  assert.equal(normalizeSearch('  ÁRBOL y canción '), 'arbol y cancion');
});
test('new chapter order follows maximum, including gaps and duplicates', () => {
  assert.equal(nextChapterOrder([{ order: 2 }, { order: 8 }, { order: 8 }]), 9);
  assert.equal(nextChapterOrder([]), 1);
});
