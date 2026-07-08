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
  Image,
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
  deleteScene,
  listBooks,
  listScenes,
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
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null;
  const selectedScenes = useMemo(() => {
    if (!selectedBook) return [];
    return scenes
      .filter((scene) => scene.book === selectedBook.id)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [scenes, selectedBook]);

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return books;
    return books.filter((book) => {
      return `${book.title} ${book.description}`.toLowerCase().includes(query);
    });
  }, [books, searchTerm]);

  const totalChapters = scenes.length;
  const publishedBooks = books.filter((book) => book.is_published).length;

  const loadTeacherContent = useCallback(async (nextSelectedBookId = null) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [booksResponse, scenesResponse] = await Promise.all([listBooks(), listScenes()]);
      setBooks(booksResponse);
      setScenes(scenesResponse);

      const nextBook =
        booksResponse.find((book) => book.id === nextSelectedBookId) ?? booksResponse[0] ?? null;
      setSelectedBookId(nextBook?.id ?? null);
      setChapterForm((current) => ({
        ...current,
        order: scenesResponse.filter((scene) => scene.book === nextBook?.id).length + 1,
      }));
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

  function handleBookFieldChange(field, value) {
    setBookForm((current) => ({ ...current, [field]: value }));
  }

  function handleChapterFieldChange(field, value) {
    setChapterForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAddBook(event) {
    event.preventDefault();
    const title = bookForm.title.trim();
    if (!title) return;

    setIsSavingBook(true);
    setErrorMessage('');

    try {
      const createdBook = await createBook({
        title,
        description: bookForm.description.trim(),
        is_published: bookForm.is_published,
        cover: bookForm.cover,
      });
      setBooks((current) => [createdBook, ...current]);
      setSelectedBookId(createdBook.id);
      setBookForm(emptyBookForm);
      setChapterForm({ ...emptyChapterForm, order: 1 });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingBook(false);
    }
  }

  function handleSelectBook(book) {
    const count = scenes.filter((scene) => scene.book === book.id).length;
    setSelectedBookId(book.id);
    setEditingChapterId(null);
    setChapterForm({ ...emptyChapterForm, order: count + 1 });
  }

  function handleEditChapter(chapter) {
    setEditingChapterId(chapter.id);
    setChapterForm({
      title: chapter.title,
      order: chapter.order,
      text: chapter.text,
      prefab_key: chapter.prefab_key,
      audio: null,
      glb_model: null,
    });
  }

  async function handleSaveChapter(event) {
    event.preventDefault();
    if (!selectedBook) return;

    const cleanTitle = chapterForm.title.trim();
    const cleanOrder = Number(chapterForm.order) || selectedScenes.length + 1;
    if (!cleanTitle) return;

    setIsSavingChapter(true);
    setErrorMessage('');

    const payload = {
      book: selectedBook.id,
      title: cleanTitle,
      order: cleanOrder,
      text: chapterForm.text.trim(),
      prefab_key: chapterForm.prefab_key.trim(),
      audio: chapterForm.audio,
      glb_model: chapterForm.glb_model,
    };

    try {
      if (editingChapterId) {
        const updated = await updateScene(editingChapterId, payload);
        setScenes((current) =>
          current.map((scene) => (scene.id === updated.id ? updated : scene)),
        );
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

      setEditingChapterId(null);
      setChapterForm({
        ...emptyChapterForm,
        order: editingChapterId ? selectedScenes.length + 1 : selectedScenes.length + 2,
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingChapter(false);
    }
  }

  async function handleDeleteChapter(chapterId) {
    setErrorMessage('');

    try {
      await deleteScene(chapterId);
      const deletedScene = scenes.find((scene) => scene.id === chapterId);
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

      if (editingChapterId === chapterId) {
        setEditingChapterId(null);
        setChapterForm({ ...emptyChapterForm, order: selectedScenes.length });
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function handleCancelChapterEdit() {
    setEditingChapterId(null);
    setChapterForm({ ...emptyChapterForm, order: selectedScenes.length + 1 });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white px-4 py-5 lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Library size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-700">BibliotecaAR</p>
              <h1 className="text-lg font-bold">Panel docente</h1>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Metric label="Libros" value={books.length} />
            <Metric label="Publicados" value={publishedBooks} />
          </div>

          <label className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search size={17} />
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Buscar libro"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <LoadingBlock text="Cargando libros" />
            ) : (
              filteredBooks.map((book) => (
                <button
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    book.id === selectedBook?.id
                      ? 'border-teal-600 bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  key={book.id}
                  onClick={() => handleSelectBook(book)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{book.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {book.scenes_count ?? scenes.filter((scene) => scene.book === book.id).length}{' '}
                        capitulos
                      </p>
                    </div>
                    <StatusBadge published={book.is_published} />
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p>{errorMessage}</p>
            </div>
          )}

          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 lg:hidden"
                type="button"
              >
                <ArrowLeft size={16} />
                Libros del docente
              </button>
              <p className="text-sm font-semibold text-teal-700">Gestion de contenido</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                {selectedBook?.title ?? 'Sin libros todavia'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {selectedBook?.description ||
                  'Crea un libro para empezar a organizar capitulos con texto, QR y recursos AR.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
              <Metric label="Capitulos" value={selectedScenes.length} />
              <Metric label="Total" value={totalChapters} />
              <Metric label="Estado" value={selectedBook?.is_published ? 'Activo' : 'Borrador'} />
            </div>
          </header>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="font-semibold">Capitulos del libro</h3>
                    <p className="text-sm text-slate-500">Contenido que luego consumira la app AR.</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                    disabled={!selectedBook}
                    onClick={handleCancelChapterEdit}
                    type="button"
                  >
                    <Plus size={17} />
                    Nuevo
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {isLoading ? (
                    <LoadingBlock text="Cargando capitulos" />
                  ) : selectedScenes.length ? (
                    selectedScenes.map((chapter) => (
                      <article className="px-4 py-4" key={chapter.id}>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                Orden {chapter.order}
                              </span>
                              <h4 className="text-base font-semibold">{chapter.title}</h4>
                            </div>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                              {chapter.text}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                              <ResourcePill icon={Box} text={chapter.prefab_key || 'Sin prefab'} />
                              <ResourcePill
                                icon={FileAudio}
                                text={chapter.audio_url ? fileName(chapter.audio_url) : 'Sin audio'}
                              />
                            </div>
                          </div>

                          <SceneQrCard chapter={chapter} />

                          <div className="flex shrink-0 gap-2">
                            <IconButton label="Editar capitulo" onClick={() => handleEditChapter(chapter)}>
                              <Edit3 size={17} />
                            </IconButton>
                            <IconButton label="Eliminar capitulo" onClick={() => handleDeleteChapter(chapter.id)}>
                              <Trash2 size={17} />
                            </IconButton>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center">
                      <BookOpen className="mx-auto text-slate-300" size={42} />
                      <h4 className="mt-3 font-semibold">Este libro aun no tiene capitulos</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Usa el formulario para crear el primer capitulo AR.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Crear libro</h3>
                <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleAddBook}>
                  <Field label="Titulo">
                    <input
                      className="input"
                      placeholder="Ej. Biologia interactiva"
                      value={bookForm.title}
                      onChange={(event) => handleBookFieldChange('title', event.target.value)}
                    />
                  </Field>
                  <Field label="Descripcion">
                    <input
                      className="input"
                      placeholder="Resumen para el docente"
                      value={bookForm.description}
                      onChange={(event) => handleBookFieldChange('description', event.target.value)}
                    />
                  </Field>
                  <div className="flex items-end gap-3">
                    <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
                      <input
                        checked={bookForm.is_published}
                        onChange={(event) => handleBookFieldChange('is_published', event.target.checked)}
                        type="checkbox"
                      />
                      Publicado
                    </label>
                    <button className="btn-primary h-10" disabled={isSavingBook} type="submit">
                      {isSavingBook ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
                      Aniadir
                    </button>
                  </div>
                  <Field label="Portada">
                    <input
                      accept="image/*"
                      className="input md:col-span-3"
                      onChange={(event) => handleBookFieldChange('cover', event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </Field>
                </form>
              </section>
            </div>

            <aside className="space-y-5">
              {selectedBook && (
                <div
                  className={`overflow-hidden rounded-lg bg-gradient-to-br ${
                    coverColors[selectedBook.id % coverColors.length]
                  } text-white shadow-sm`}
                >
                  {selectedBook.cover_url ? (
                    <img
                      alt=""
                      className="h-36 w-full object-cover"
                      src={selectedBook.cover_url}
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-white/10">
                      <Image size={34} />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <BookOpen size={30} />
                      <StatusBadge published={selectedBook.is_published} light />
                    </div>
                    <h3 className="mt-8 text-xl font-bold">{selectedBook.title}</h3>
                    <div className="mt-4 flex items-center gap-2 text-sm text-white/85">
                      <CalendarDays size={16} />
                      Actualizado {formatDate(selectedBook.updated_at)}
                    </div>
                  </div>
                </div>
              )}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {editingChapterId ? 'Editar capitulo' : 'Nuevo capitulo'}
                    </h3>
                    <p className="text-sm text-slate-500">Datos conectados con Scene del backend.</p>
                  </div>
                  {editingChapterId && (
                    <button className="text-sm font-semibold text-slate-500" onClick={handleCancelChapterEdit} type="button">
                      Cancelar
                    </button>
                  )}
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleSaveChapter}>
                  <Field label="Titulo">
                    <input
                      className="input"
                      disabled={!selectedBook}
                      placeholder="Ej. Sistema digestivo"
                      value={chapterForm.title}
                      onChange={(event) => handleChapterFieldChange('title', event.target.value)}
                    />
                  </Field>
                  <Field label="Orden">
                    <input
                      className="input"
                      disabled={!selectedBook}
                      min="1"
                      type="number"
                      value={chapterForm.order}
                      onChange={(event) => handleChapterFieldChange('order', event.target.value)}
                    />
                  </Field>
                  <Field label="Texto">
                    <textarea
                      className="input min-h-28 resize-y"
                      disabled={!selectedBook}
                      placeholder="Contenido que vera o escuchara el estudiante"
                      value={chapterForm.text}
                      onChange={(event) => handleChapterFieldChange('text', event.target.value)}
                    />
                  </Field>
                  <Field label="Prefab key">
                    <input
                      className="input"
                      disabled={!selectedBook}
                      placeholder="Ej. heart_model"
                      value={chapterForm.prefab_key}
                      onChange={(event) => handleChapterFieldChange('prefab_key', event.target.value)}
                    />
                  </Field>
                  <Field label="Audio">
                    <input
                      accept="audio/*"
                      className="input"
                      disabled={!selectedBook}
                      onChange={(event) => handleChapterFieldChange('audio', event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </Field>
                  <Field label="Modelo GLB">
                    <input
                      accept=".glb,model/gltf-binary"
                      className="input"
                      disabled={!selectedBook}
                      onChange={(event) => handleChapterFieldChange('glb_model', event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </Field>
                  <button className="btn-primary w-full justify-center" disabled={!selectedBook || isSavingChapter} type="submit">
                    {isSavingChapter ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : editingChapterId ? (
                      <Save size={17} />
                    ) : (
                      <Plus size={17} />
                    )}
                    {editingChapterId ? 'Guardar cambios' : 'Crear capitulo'}
                  </button>
                </form>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
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
