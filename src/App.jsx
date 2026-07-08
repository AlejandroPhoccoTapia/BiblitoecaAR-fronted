import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Box,
  CalendarDays,
  Check,
  Edit3,
  FileAudio,
  Library,
  Plus,
  QrCode,
  Save,
  Search,
  Trash2,
} from 'lucide-react';

const initialBooks = [
  {
    id: 1,
    title: 'Cuerpo humano en AR',
    description: 'Material interactivo para revisar organos, sistemas y modelos 3D.',
    coverColor: 'from-teal-600 to-cyan-500',
    isPublished: true,
    updatedAt: '2026-07-07',
    chapters: [
      {
        id: 101,
        title: 'Sistema respiratorio',
        order: 1,
        text: 'Explora pulmones, traquea y bronquios con una escena aumentada.',
        prefabKey: 'lungs_model',
        audioName: 'respiratorio.mp3',
        modelName: 'lungs.glb',
        qrCode: 'cuerpo-humano-scene-a91f23b',
      },
      {
        id: 102,
        title: 'Sistema circulatorio',
        order: 2,
        text: 'Reconoce el corazon y el recorrido principal de la sangre.',
        prefabKey: 'heart_model',
        audioName: '',
        modelName: 'heart.glb',
        qrCode: 'cuerpo-humano-scene-c82d10a',
      },
    ],
  },
  {
    id: 2,
    title: 'Historia del Peru',
    description: 'Capitulos con piezas historicas, mapas y actividades de reconocimiento.',
    coverColor: 'from-amber-500 to-rose-500',
    isPublished: false,
    updatedAt: '2026-07-05',
    chapters: [
      {
        id: 201,
        title: 'Culturas preincas',
        order: 1,
        text: 'Observa ceramicas y ubicaciones principales en una experiencia AR.',
        prefabKey: 'preinca_artifacts',
        audioName: 'preincas.mp3',
        modelName: 'huaco.glb',
        qrCode: 'historia-peru-scene-f18c334',
      },
    ],
  },
];

const emptyBookForm = {
  title: '',
  description: '',
  isPublished: false,
};

const emptyChapterForm = {
  title: '',
  order: 1,
  text: '',
  prefabKey: '',
  audioName: '',
  modelName: '',
};

const coverColors = [
  'from-teal-600 to-cyan-500',
  'from-indigo-600 to-sky-500',
  'from-emerald-600 to-lime-500',
  'from-rose-600 to-orange-500',
  'from-violet-600 to-fuchsia-500',
];

function buildQrCode(bookTitle, order) {
  const slug = bookTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

  return `${slug || 'libro'}-scene-${order}-${Math.random().toString(16).slice(2, 8)}`;
}

export default function App() {
  const [books, setBooks] = useState(initialBooks);
  const [selectedBookId, setSelectedBookId] = useState(initialBooks[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [editingChapterId, setEditingChapterId] = useState(null);

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0];

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return books;
    return books.filter((book) => {
      return `${book.title} ${book.description}`.toLowerCase().includes(query);
    });
  }, [books, searchTerm]);

  const totalChapters = books.reduce((total, book) => total + book.chapters.length, 0);
  const publishedBooks = books.filter((book) => book.isPublished).length;

  function handleBookFieldChange(field, value) {
    setBookForm((current) => ({ ...current, [field]: value }));
  }

  function handleChapterFieldChange(field, value) {
    setChapterForm((current) => ({ ...current, [field]: value }));
  }

  function handleAddBook(event) {
    event.preventDefault();
    const title = bookForm.title.trim();
    if (!title) return;

    const nextBook = {
      id: Date.now(),
      title,
      description: bookForm.description.trim(),
      isPublished: bookForm.isPublished,
      coverColor: coverColors[books.length % coverColors.length],
      updatedAt: new Date().toISOString().slice(0, 10),
      chapters: [],
    };

    setBooks((current) => [nextBook, ...current]);
    setSelectedBookId(nextBook.id);
    setBookForm(emptyBookForm);
  }

  function handleEditChapter(chapter) {
    setEditingChapterId(chapter.id);
    setChapterForm({
      title: chapter.title,
      order: chapter.order,
      text: chapter.text,
      prefabKey: chapter.prefabKey,
      audioName: chapter.audioName,
      modelName: chapter.modelName,
    });
  }

  function handleSaveChapter(event) {
    event.preventDefault();
    if (!selectedBook) return;

    const cleanTitle = chapterForm.title.trim();
    const cleanOrder = Number(chapterForm.order) || selectedBook.chapters.length + 1;
    if (!cleanTitle) return;

    setBooks((current) =>
      current.map((book) => {
        if (book.id !== selectedBook.id) return book;

        if (editingChapterId) {
          return {
            ...book,
            updatedAt: new Date().toISOString().slice(0, 10),
            chapters: book.chapters
              .map((chapter) =>
                chapter.id === editingChapterId
                  ? {
                      ...chapter,
                      title: cleanTitle,
                      order: cleanOrder,
                      text: chapterForm.text.trim(),
                      prefabKey: chapterForm.prefabKey.trim(),
                      audioName: chapterForm.audioName.trim(),
                      modelName: chapterForm.modelName.trim(),
                    }
                  : chapter,
              )
              .sort((a, b) => a.order - b.order),
          };
        }

        const nextChapter = {
          id: Date.now(),
          title: cleanTitle,
          order: cleanOrder,
          text: chapterForm.text.trim(),
          prefabKey: chapterForm.prefabKey.trim(),
          audioName: chapterForm.audioName.trim(),
          modelName: chapterForm.modelName.trim(),
          qrCode: buildQrCode(book.title, cleanOrder),
        };

        return {
          ...book,
          updatedAt: new Date().toISOString().slice(0, 10),
          chapters: [...book.chapters, nextChapter].sort((a, b) => a.order - b.order),
        };
      }),
    );

    setEditingChapterId(null);
    setChapterForm({ ...emptyChapterForm, order: selectedBook.chapters.length + 1 });
  }

  function handleDeleteChapter(chapterId) {
    if (!selectedBook) return;
    setBooks((current) =>
      current.map((book) =>
        book.id === selectedBook.id
          ? {
              ...book,
              updatedAt: new Date().toISOString().slice(0, 10),
              chapters: book.chapters.filter((chapter) => chapter.id !== chapterId),
            }
          : book,
      ),
    );

    if (editingChapterId === chapterId) {
      setEditingChapterId(null);
      setChapterForm(emptyChapterForm);
    }
  }

  function handleCancelChapterEdit() {
    setEditingChapterId(null);
    setChapterForm({ ...emptyChapterForm, order: selectedBook.chapters.length + 1 });
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
            {filteredBooks.map((book) => (
              <button
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  book.id === selectedBook?.id
                    ? 'border-teal-600 bg-teal-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
                key={book.id}
                onClick={() => {
                  setSelectedBookId(book.id);
                  setEditingChapterId(null);
                  setChapterForm({ ...emptyChapterForm, order: book.chapters.length + 1 });
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{book.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {book.chapters.length} capitulos
                    </p>
                  </div>
                  <StatusBadge published={book.isPublished} />
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
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
                {selectedBook?.title ?? 'Selecciona un libro'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {selectedBook?.description ||
                  'Crea un libro para empezar a organizar capitulos con texto, QR y recursos AR.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
              <Metric label="Capitulos" value={selectedBook?.chapters.length ?? 0} />
              <Metric label="Total" value={totalChapters} />
              <Metric label="Estado" value={selectedBook?.isPublished ? 'Activo' : 'Borrador'} />
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
                    onClick={handleCancelChapterEdit}
                    type="button"
                  >
                    <Plus size={17} />
                    Nuevo
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {selectedBook?.chapters.length ? (
                    selectedBook.chapters.map((chapter) => (
                      <article className="px-4 py-4" key={chapter.id}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                              <ResourcePill icon={Box} text={chapter.prefabKey || 'Sin prefab'} />
                              <ResourcePill icon={FileAudio} text={chapter.audioName || 'Sin audio'} />
                              <ResourcePill icon={QrCode} text={chapter.qrCode} />
                            </div>
                          </div>

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
                        checked={bookForm.isPublished}
                        onChange={(event) => handleBookFieldChange('isPublished', event.target.checked)}
                        type="checkbox"
                      />
                      Publicado
                    </label>
                    <button className="btn-primary h-10" type="submit">
                      <Plus size={17} />
                      Aniadir
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <aside className="space-y-5">
              {selectedBook && (
                <div className={`rounded-lg bg-gradient-to-br ${selectedBook.coverColor} p-5 text-white shadow-sm`}>
                  <div className="flex items-start justify-between">
                    <BookOpen size={30} />
                    <StatusBadge published={selectedBook.isPublished} light />
                  </div>
                  <h3 className="mt-8 text-xl font-bold">{selectedBook.title}</h3>
                  <div className="mt-4 flex items-center gap-2 text-sm text-white/85">
                    <CalendarDays size={16} />
                    Actualizado {selectedBook.updatedAt}
                  </div>
                </div>
              )}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {editingChapterId ? 'Editar capitulo' : 'Nuevo capitulo'}
                    </h3>
                    <p className="text-sm text-slate-500">Datos compatibles con Scene del backend.</p>
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
                      placeholder="Ej. Sistema digestivo"
                      value={chapterForm.title}
                      onChange={(event) => handleChapterFieldChange('title', event.target.value)}
                    />
                  </Field>
                  <Field label="Orden">
                    <input
                      className="input"
                      min="1"
                      type="number"
                      value={chapterForm.order}
                      onChange={(event) => handleChapterFieldChange('order', event.target.value)}
                    />
                  </Field>
                  <Field label="Texto">
                    <textarea
                      className="input min-h-28 resize-y"
                      placeholder="Contenido que vera o escuchara el estudiante"
                      value={chapterForm.text}
                      onChange={(event) => handleChapterFieldChange('text', event.target.value)}
                    />
                  </Field>
                  <Field label="Prefab key">
                    <input
                      className="input"
                      placeholder="Ej. heart_model"
                      value={chapterForm.prefabKey}
                      onChange={(event) => handleChapterFieldChange('prefabKey', event.target.value)}
                    />
                  </Field>
                  <Field label="Audio">
                    <input
                      className="input"
                      placeholder="archivo.mp3"
                      value={chapterForm.audioName}
                      onChange={(event) => handleChapterFieldChange('audioName', event.target.value)}
                    />
                  </Field>
                  <Field label="Modelo GLB">
                    <input
                      className="input"
                      placeholder="modelo.glb"
                      value={chapterForm.modelName}
                      onChange={(event) => handleChapterFieldChange('modelName', event.target.value)}
                    />
                  </Field>
                  <button className="btn-primary w-full justify-center" type="submit">
                    {editingChapterId ? <Save size={17} /> : <Plus size={17} />}
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
