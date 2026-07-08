import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Box,
  CalendarDays,
  Check,
  Download,
  Edit3,
  ExternalLink,
  FileAudio,
  Library,
  Loader2,
  Plus,
  QrCode,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createBook,
  createScene,
  deleteBook,
  deleteScene,
  listBooks,
  listScenes,
  updateBook,
  updateScene,
} from './api';

const emptyBookForm = {
  title: '',
  description: '',
  is_published: false,
  cover: null,
};

const emptyChapterForm = {
  title: '',
  order: 1,
  text: '',
  prefab_key: '',
  audio: null,
  glb_model: null,
};

const coverColors = [
  'from-teal-600 to-cyan-500',
  'from-indigo-600 to-sky-500',
  'from-emerald-600 to-lime-500',
  'from-rose-600 to-orange-500',
  'from-violet-600 to-fuchsia-500',
];

export default function App() {
  const [books, setBooks] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [view, setView] = useState('books');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;
  const selectedScenes = useMemo(() => {
    if (!selectedBook) return [];
    return scenes
      .filter((scene) => scene.book === selectedBook.id)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [scenes, selectedBook]);

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return books;
    return books.filter((book) => `${book.title} ${book.description}`.toLowerCase().includes(query));
  }, [books, searchTerm]);

  const publishedBooks = books.filter((book) => book.is_published).length;

  const loadTeacherContent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [booksResponse, scenesResponse] = await Promise.all([listBooks(), listScenes()]);
      setBooks(booksResponse);
      setScenes(scenesResponse);
    } catch (error) {
      setErrorMessage(
        `${error.message}. Verifica que el backend este corriendo y que hayas iniciado sesion como admin.`,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeacherContent();
  }, [loadTeacherContent]);

  function selectBook(book) {
    setSelectedBookId(book.id);
    setEditingBookId(null);
    setEditingChapterId(null);
    setView('detail');
  }

  function openCreateBook() {
    setBookForm(emptyBookForm);
    setEditingBookId(null);
    setView('book-form');
  }

  function openEditBook(book) {
    setBookForm({
      title: book.title,
      description: book.description ?? '',
      is_published: book.is_published,
      cover: null,
    });
    setEditingBookId(book.id);
    setSelectedBookId(book.id);
    setView('book-form');
  }

  function openCreateChapter() {
    if (!selectedBook) return;
    setChapterForm({ ...emptyChapterForm, order: selectedScenes.length + 1 });
    setEditingChapterId(null);
    setView('chapter-form');
  }

  function openEditChapter(chapter) {
    setChapterForm({
      title: chapter.title,
      order: chapter.order,
      text: chapter.text,
      prefab_key: chapter.prefab_key,
      audio: null,
      glb_model: null,
    });
    setEditingChapterId(chapter.id);
    setSelectedBookId(chapter.book);
    setView('chapter-form');
  }

  function goToBooks() {
    setView('books');
    setSelectedBookId(null);
    setEditingBookId(null);
    setEditingChapterId(null);
    setErrorMessage('');
  }

  function goToDetail() {
    if (!selectedBook) {
      goToBooks();
      return;
    }
    setView('detail');
    setEditingBookId(null);
    setEditingChapterId(null);
    setErrorMessage('');
  }

  async function handleSaveBook(event) {
    event.preventDefault();
    const title = bookForm.title.trim();
    if (!title) return;

    setIsSavingBook(true);
    setErrorMessage('');

    const payload = {
      title,
      description: bookForm.description.trim(),
      is_published: bookForm.is_published,
      cover: bookForm.cover,
    };

    try {
      if (editingBookId) {
        const updated = await updateBook(editingBookId, payload);
        setBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
        setSelectedBookId(updated.id);
      } else {
        const created = await createBook(payload);
        setBooks((current) => [created, ...current]);
        setSelectedBookId(created.id);
      }

      setBookForm(emptyBookForm);
      setEditingBookId(null);
      setView('detail');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingBook(false);
    }
  }

  async function handleSaveChapter(event) {
    event.preventDefault();
    if (!selectedBook) return;

    const title = chapterForm.title.trim();
    const order = Number(chapterForm.order) || selectedScenes.length + 1;
    if (!title) return;

    setIsSavingChapter(true);
    setErrorMessage('');

    const payload = {
      book: selectedBook.id,
      title,
      order,
      text: chapterForm.text.trim(),
      prefab_key: chapterForm.prefab_key.trim(),
      audio: chapterForm.audio,
      glb_model: chapterForm.glb_model,
    };

    try {
      if (editingChapterId) {
        const updated = await updateScene(editingChapterId, payload);
        setScenes((current) => current.map((scene) => (scene.id === updated.id ? updated : scene)));
      } else {
        const created = await createScene(payload);
        setScenes((current) => [...current, created]);
        setBooks((current) =>
          current.map((book) =>
            book.id === selectedBook.id
              ? { ...book, scenes_count: (book.scenes_count ?? selectedScenes.length) + 1 }
              : book,
          ),
        );
      }

      setChapterForm(emptyChapterForm);
      setEditingChapterId(null);
      setView('detail');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingChapter(false);
    }
  }

  async function handleDeleteBook(book = selectedBook) {
    if (!book) return;

    const confirmed = window.confirm(
      `Eliminar "${book.title}" tambien eliminara sus capitulos. Esta accion no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage('');

    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      setScenes((current) => current.filter((scene) => scene.book !== book.id));
      setSelectedBookId(null);
      setView('books');
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleDeleteChapter(chapterId) {
    setErrorMessage('');

    try {
      const deletedScene = scenes.find((scene) => scene.id === chapterId);
      await deleteScene(chapterId);
      setScenes((current) => current.filter((scene) => scene.id !== chapterId));

      if (deletedScene) {
        setBooks((current) =>
          current.map((book) =>
            book.id === deletedScene.book
              ? { ...book, scenes_count: Math.max((book.scenes_count ?? selectedScenes.length) - 1, 0) }
              : book,
          ),
        );
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <AppHeader
          booksCount={books.length}
          publishedBooks={publishedBooks}
          scenesCount={scenes.length}
          onCreateBook={openCreateBook}
          onGoHome={goToBooks}
        />

        {errorMessage && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p>{errorMessage}</p>
          </div>
        )}

        {view === 'books' && (
          <BooksView
            books={filteredBooks}
            isLoading={isLoading}
            onCreateBook={openCreateBook}
            onDeleteBook={handleDeleteBook}
            onEditBook={openEditBook}
            onSelectBook={selectBook}
            searchTerm={searchTerm}
            scenes={scenes}
            setSearchTerm={setSearchTerm}
          />
        )}

        {view === 'detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            onBack={goToBooks}
            onCreateChapter={openCreateChapter}
            onDeleteBook={handleDeleteBook}
            onDeleteChapter={handleDeleteChapter}
            onEditBook={openEditBook}
            onEditChapter={openEditChapter}
            scenes={selectedScenes}
          />
        )}

        {view === 'book-form' && (
          <BookFormView
            book={books.find((book) => book.id === editingBookId)}
            form={bookForm}
            isSaving={isSavingBook}
            onBack={editingBookId ? goToDetail : goToBooks}
            onChange={(field, value) => setBookForm((current) => ({ ...current, [field]: value }))}
            onSubmit={handleSaveBook}
          />
        )}

        {view === 'chapter-form' && selectedBook && (
          <ChapterFormView
            book={selectedBook}
            chapter={scenes.find((scene) => scene.id === editingChapterId)}
            form={chapterForm}
            isSaving={isSavingChapter}
            onBack={goToDetail}
            onChange={(field, value) =>
              setChapterForm((current) => ({ ...current, [field]: value }))
            }
            onSubmit={handleSaveChapter}
          />
        )}
      </div>
    </main>
  );
}

function AppHeader({ booksCount, publishedBooks, scenesCount, onCreateBook, onGoHome }) {
  return (
    <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button className="flex items-center gap-3 text-left" onClick={onGoHome} type="button">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Library size={23} />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-700">BibliotecaAR</p>
            <h1 className="text-xl font-bold">Panel docente</h1>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[420px]">
          <Metric label="Libros" value={booksCount} />
          <Metric label="Publicados" value={publishedBooks} />
          <Metric label="Capitulos" value={scenesCount} />
        </div>

        <button className="btn-primary justify-center" onClick={onCreateBook} type="button">
          <Plus size={17} />
          Nuevo libro
        </button>
      </div>
    </header>
  );
}

function BooksView({
  books,
  isLoading,
  onCreateBook,
  onDeleteBook,
  onEditBook,
  onSelectBook,
  searchTerm,
  scenes,
  setSearchTerm,
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">Biblioteca del docente</p>
          <h2 className="mt-1 text-3xl font-bold">Mis libros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Revisa tus libros, entra al detalle para administrar capitulos o crea uno nuevo.
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 lg:w-80">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Buscar libro"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <LoadingBlock text="Cargando libros" />
        </div>
      ) : books.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => (
            <BookCard
              book={book}
              key={book.id}
              onDelete={() => onDeleteBook(book)}
              onEdit={() => onEditBook(book)}
              onOpen={() => onSelectBook(book)}
              scenesCount={book.scenes_count ?? scenes.filter((scene) => scene.book === book.id).length}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel="Crear primer libro"
          icon={BookOpen}
          onAction={onCreateBook}
          text="Cuando crees un libro, podras agregar capitulos, QR y recursos AR."
          title="Aun no hay libros"
        />
      )}
    </section>
  );
}

function BookCard({ book, scenesCount, onDelete, onEdit, onOpen }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {book.cover_url ? (
        <img alt="" className="h-36 w-full object-cover" src={book.cover_url} />
      ) : (
        <div
          className={`flex h-32 items-center justify-center bg-gradient-to-br ${
            coverColors[book.id % coverColors.length]
          } text-white`}
        >
          <BookOpen size={38} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{book.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{scenesCount} capitulos</p>
          </div>
          <StatusBadge published={book.is_published} />
        </div>
        <p className="mt-3 line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">
          {book.description || 'Sin descripcion.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={onOpen} type="button">
            <BookOpen size={17} />
            Ver detalle
          </button>
          <IconButton label="Editar libro" onClick={onEdit}>
            <Edit3 size={17} />
          </IconButton>
          <IconButton label="Eliminar libro" onClick={onDelete}>
            <Trash2 size={17} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function BookDetailView({
  book,
  scenes,
  onBack,
  onCreateChapter,
  onDeleteBook,
  onDeleteChapter,
  onEditBook,
  onEditChapter,
}) {
  return (
    <section className="mt-6">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver a libros
      </button>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className={`bg-gradient-to-br ${coverColors[book.id % coverColors.length]} px-5 py-6 text-white`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <StatusBadge published={book.is_published} light />
              <h2 className="mt-3 text-3xl font-bold">{book.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
                {book.description || 'Este libro no tiene descripcion.'}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/85">
                <CalendarDays size={16} />
                Actualizado {formatDate(book.updated_at)}
              </div>
            </div>
            {book.cover_url && (
              <img alt="" className="h-40 w-full rounded-lg object-cover ring-1 ring-white/25 lg:w-56" src={book.cover_url} />
            )}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[repeat(3,1fr)_auto]">
          <Metric label="Capitulos" value={scenes.length} />
          <Metric label="Estado" value={book.is_published ? 'Publicado' : 'Borrador'} />
          <Metric label="ID libro" value={book.id} />
          <div className="flex flex-wrap items-end gap-2">
            <button className="btn-primary" onClick={onCreateChapter} type="button">
              <Plus size={17} />
              Nuevo capitulo
            </button>
            <button className="btn-secondary" onClick={() => onEditBook(book)} type="button">
              <Edit3 size={17} />
              Editar libro
            </button>
            <button className="btn-danger" onClick={() => onDeleteBook(book)} type="button">
              <Trash2 size={17} />
              Eliminar
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {scenes.length ? (
            scenes.map((chapter) => (
              <ChapterRow
                chapter={chapter}
                key={chapter.id}
                onDelete={() => onDeleteChapter(chapter.id)}
                onEdit={() => onEditChapter(chapter)}
              />
            ))
          ) : (
            <EmptyState
              actionLabel="Crear capitulo"
              icon={QrCode}
              onAction={onCreateChapter}
              text="Cada capitulo genera su propio QR para que la app AR pueda reconocerlo."
              title="Este libro aun no tiene capitulos"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ChapterRow({ chapter, onDelete, onEdit }) {
  return (
    <article className="p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              Orden {chapter.order}
            </span>
            <h3 className="text-lg font-semibold">{chapter.title}</h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{chapter.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <ResourcePill icon={Box} text={chapter.prefab_key || 'Sin prefab'} />
            <ResourcePill icon={FileAudio} text={chapter.audio_url ? fileName(chapter.audio_url) : 'Sin audio'} />
          </div>
        </div>
        <SceneQrCard chapter={chapter} />
        <div className="flex shrink-0 gap-2">
          <IconButton label="Editar capitulo" onClick={onEdit}>
            <Edit3 size={17} />
          </IconButton>
          <IconButton label="Eliminar capitulo" onClick={onDelete}>
            <Trash2 size={17} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function BookFormView({ book, form, isSaving, onBack, onChange, onSubmit }) {
  const isEditing = Boolean(book);

  return (
    <section className="mt-6 max-w-4xl">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        {isEditing ? 'Volver al detalle' : 'Volver a libros'}
      </button>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">Libro</p>
        <h2 className="mt-1 text-3xl font-bold">{isEditing ? 'Editar libro' : 'Crear libro'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Define la informacion principal que vera el docente antes de administrar capitulos.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Titulo">
            <input
              className="input"
              placeholder="Ej. Biologia interactiva"
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
            />
          </Field>
          <Field label="Estado">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <input
                checked={form.is_published}
                onChange={(event) => onChange('is_published', event.target.checked)}
                type="checkbox"
              />
              Publicado
            </label>
          </Field>
          <Field label="Descripcion">
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Describe el contenido del libro"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
            />
          </Field>
          <div className="space-y-4">
            {book?.cover_url && (
              <img alt="" className="h-36 w-full rounded-lg object-cover" src={book.cover_url} />
            )}
            <Field label={isEditing ? 'Cambiar portada' : 'Portada'}>
              <input
                accept="image/*"
                className="input"
                onChange={(event) => onChange('cover', event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary" disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {isEditing ? 'Guardar cambios' : 'Crear libro'}
            </button>
            <button className="btn-secondary" onClick={onBack} type="button">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ChapterFormView({ book, chapter, form, isSaving, onBack, onChange, onSubmit }) {
  const isEditing = Boolean(chapter);

  return (
    <section className="mt-6 max-w-4xl">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver al detalle
      </button>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">{book.title}</p>
        <h2 className="mt-1 text-3xl font-bold">
          {isEditing ? 'Editar capitulo' : 'Crear capitulo'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Completa el texto, recursos y clave del prefab. El QR se genera automaticamente en el backend.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Titulo">
            <input
              className="input"
              placeholder="Ej. Sistema digestivo"
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
            />
          </Field>
          <Field label="Orden">
            <input
              className="input"
              min="1"
              type="number"
              value={form.order}
              onChange={(event) => onChange('order', event.target.value)}
            />
          </Field>
          <Field label="Texto">
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Contenido que vera o escuchara el estudiante"
              value={form.text}
              onChange={(event) => onChange('text', event.target.value)}
            />
          </Field>
          <div className="space-y-4">
            <Field label="Prefab key">
              <input
                className="input"
                placeholder="Ej. heart_model"
                value={form.prefab_key}
                onChange={(event) => onChange('prefab_key', event.target.value)}
              />
            </Field>
            <Field label={isEditing ? 'Cambiar audio' : 'Audio'}>
              <input
                accept="audio/*"
                className="input"
                onChange={(event) => onChange('audio', event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
            <Field label={isEditing ? 'Cambiar modelo GLB' : 'Modelo GLB'}>
              <input
                accept=".glb,model/gltf-binary"
                className="input"
                onChange={(event) => onChange('glb_model', event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
          </div>

          {chapter && (
            <div className="md:col-span-2">
              <SceneQrCard chapter={chapter} />
            </div>
          )}

          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary" disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {isEditing ? 'Guardar cambios' : 'Crear capitulo'}
            </button>
            <button className="btn-secondary" onClick={onBack} type="button">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ published, light = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
        light
          ? 'bg-white/15 text-white ring-1 ring-white/25'
          : published
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
      }`}
    >
      {published && <Check size={13} />}
      {published ? 'Publicado' : 'Borrador'}
    </span>
  );
}

function ResourcePill({ icon: Icon, text }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
      <Icon className="shrink-0" size={14} />
      <span className="truncate">{text}</span>
    </span>
  );
}

function SceneQrCard({ chapter }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <QrCode size={14} />
        QR generado
      </div>
      {chapter.qr_image_url ? (
        <img
          alt={`QR de ${chapter.title}`}
          className="mt-3 aspect-square w-full rounded-md border border-slate-200 bg-white object-contain p-2"
          src={chapter.qr_image_url}
        />
      ) : (
        <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-400">
          <QrCode size={34} />
        </div>
      )}
      <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
        {chapter.qr_code}
      </p>
      {chapter.qr_image_url && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            href={chapter.qr_image_url}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={14} />
            Abrir
          </a>
          <a
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            download
            href={chapter.qr_image_url}
          >
            <Download size={14} />
            Bajar
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyState({ actionLabel, icon: Icon, onAction, text, title }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <Icon className="mx-auto text-slate-300" size={44} />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
      <button className="btn-primary mt-4" onClick={onAction} type="button">
        <Plus size={17} />
        {actionLabel}
      </button>
    </div>
  );
}

function IconButton({ children, label, onClick }) {
  return (
    <button
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({ children, label }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LoadingBlock({ text }) {
  return (
    <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={17} />
      {text}
    </div>
  );
}

function fileName(url) {
  return decodeURIComponent(url.split('/').pop() ?? url);
}

function formatDate(value) {
  if (!value) return 'sin fecha';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
