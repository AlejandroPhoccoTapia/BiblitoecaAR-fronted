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
  Eye,
  FileAudio,
  Library,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  createBook,
  createScene,
  createStudent,
  deleteBook,
  deleteScene,
  deleteStudent,
  getTeacherSession,
  listBooks,
  listScenes,
  listStudents,
  loginTeacher,
  logoutTeacher,
  registerTeacher,
  updateBook,
  updateScene,
  updateStudent,
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

const emptyStudentForm = {
  full_name: '',
  classroom: '',
  photo: null,
  assigned_books: [],
  is_active: true,
};

const coverColors = [
  'from-teal-600 to-cyan-500',
  'from-indigo-600 to-sky-500',
  'from-emerald-600 to-lime-500',
  'from-rose-600 to-orange-500',
  'from-violet-600 to-fuchsia-500',
];

export default function App() {
  const [session, setSession] = useState({ checked: false, is_authenticated: false, user: null });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [books, setBooks] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [students, setStudents] = useState([]);
  const [section, setSection] = useState('library');
  const [view, setView] = useState('books');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
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

  const filteredStudents = useMemo(() => {
    const query = studentSearchTerm.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.full_name} ${student.classroom}`.toLowerCase().includes(query),
    );
  }, [studentSearchTerm, students]);

  const publishedBooks = books.filter((book) => book.is_published).length;

  const loadTeacherContent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [booksResponse, scenesResponse, studentsResponse] = await Promise.all([
        listBooks(),
        listScenes(),
        listStudents(),
      ]);
      setBooks(booksResponse);
      setScenes(scenesResponse);
      setStudents(studentsResponse);
    } catch (error) {
      setErrorMessage(`${error.message}. Verifica que tu sesion de docente siga activa.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await getTeacherSession();
        setSession({ checked: true, ...response });
        if (response.is_authenticated) {
          await loadTeacherContent();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setSession({ checked: true, is_authenticated: false, user: null });
        setLoginError(error.message);
        setIsLoading(false);
      }
    }

    checkSession();
  }, [loadTeacherContent]);

  async function handleLogin(event) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await loginTeacher(loginForm);
      setSession({ checked: true, ...response });
      setLoginForm({ username: '', password: '' });
      await loadTeacherContent();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await registerTeacher(registerForm);
      setSession({ checked: true, ...response });
      setRegisterForm({ username: '', password: '', first_name: '', last_name: '' });
      await loadTeacherContent();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await logoutTeacher();
    setSession({ checked: true, is_authenticated: false, user: null });
    setBooks([]);
    setScenes([]);
    setStudents([]);
    setView('books');
    setSection('library');
  }

  function selectBook(book) {
    setSelectedBookId(book.id);
    setEditingBookId(null);
    setEditingChapterId(null);
    setSection('library');
    setView('detail');
  }

  function openCreateBook() {
    setBookForm(emptyBookForm);
    setEditingBookId(null);
    setSection('library');
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
    setSection('library');
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
    setSection('library');
    setView('chapter-form');
  }

  function openStudents() {
    setSection('students');
    setView('students');
    setEditingStudentId(null);
    setErrorMessage('');
  }

  function openCreateStudent() {
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setSection('students');
    setView('student-form');
  }

  function openEditStudent(student) {
    setStudentForm({
      full_name: student.full_name,
      classroom: student.classroom ?? '',
      photo: null,
      assigned_books: student.assigned_books ?? [],
      is_active: student.is_active,
    });
    setEditingStudentId(student.id);
    setSection('students');
    setView('student-form');
  }

  function goToBooks() {
    setSection('library');
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
    setSection('library');
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

  async function handleSaveStudent(event) {
    event.preventDefault();
    const fullName = studentForm.full_name.trim();
    if (!fullName) return;

    setIsSavingStudent(true);
    setErrorMessage('');

    const payload = {
      full_name: fullName,
      classroom: studentForm.classroom.trim(),
      photo: studentForm.photo,
      assigned_books: studentForm.assigned_books,
      is_active: studentForm.is_active,
    };

    try {
      if (editingStudentId) {
        const updated = await updateStudent(editingStudentId, payload);
        setStudents((current) =>
          current.map((student) => (student.id === updated.id ? updated : student)),
        );
      } else {
        const created = await createStudent(payload);
        setStudents((current) => [created, ...current]);
      }

      setStudentForm(emptyStudentForm);
      setEditingStudentId(null);
      setView('students');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSavingStudent(false);
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
      setStudents((current) =>
        current.map((student) => ({
          ...student,
          assigned_books: student.assigned_books.filter((id) => id !== book.id),
          assigned_books_detail: student.assigned_books_detail.filter((item) => item.id !== book.id),
        })),
      );
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

  async function handleDeleteStudent(student) {
    const confirmed = window.confirm(`Eliminar la cuenta de "${student.full_name}"?`);
    if (!confirmed) return;

    setErrorMessage('');

    try {
      await deleteStudent(student.id);
      setStudents((current) => current.filter((item) => item.id !== student.id));
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  if (!session.checked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950">
        <LoadingBlock text="Verificando sesion docente" />
      </main>
    );
  }

  if (!session.is_authenticated) {
    return (
      <LoginView
        authMode={authMode}
        errorMessage={loginError}
        form={loginForm}
        isLoggingIn={isLoggingIn}
        onChange={(field, value) => setLoginForm((current) => ({ ...current, [field]: value }))}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setLoginError('');
        }}
        onRegisterChange={(field, value) =>
          setRegisterForm((current) => ({ ...current, [field]: value }))
        }
        onRegisterSubmit={handleRegister}
        onSubmit={handleLogin}
        registerForm={registerForm}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <AppHeader
          activeSection={section}
          booksCount={books.length}
          onCreateBook={openCreateBook}
          onGoHome={goToBooks}
          onLogout={handleLogout}
          onOpenStudents={openStudents}
          publishedBooks={publishedBooks}
          scenesCount={scenes.length}
          studentsCount={students.length}
          user={session.user}
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

        {view === 'students' && (
          <StudentsView
            books={books}
            isLoading={isLoading}
            onCreateStudent={openCreateStudent}
            onDeleteStudent={handleDeleteStudent}
            onEditStudent={openEditStudent}
            searchTerm={studentSearchTerm}
            setSearchTerm={setStudentSearchTerm}
            students={filteredStudents}
          />
        )}

        {view === 'student-form' && (
          <StudentFormView
            books={books}
            form={studentForm}
            isSaving={isSavingStudent}
            onBack={openStudents}
            onChange={(field, value) =>
              setStudentForm((current) => ({ ...current, [field]: value }))
            }
            onSubmit={handleSaveStudent}
            student={students.find((student) => student.id === editingStudentId)}
          />
        )}
      </div>
    </main>
  );
}

function LoginView({
  authMode,
  errorMessage,
  form,
  isLoggingIn,
  onChange,
  onModeChange,
  onRegisterChange,
  onRegisterSubmit,
  onSubmit,
  registerForm,
}) {
  const isRegistering = authMode === 'register';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Library size={25} />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-700">BibliotecaAR</p>
              <h1 className="text-2xl font-bold">Acceso docente</h1>
            </div>
          </div>
          <h2 className="mt-8 text-4xl font-bold">Gestiona libros, capitulos y cuentas infantiles.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Ingresa con tu cuenta docente para administrar la biblioteca AR y preparar el acceso por reconocimiento facial de los ninios.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
            <ShieldCheck size={18} />
            Sesion segura
          </div>
          <h3 className="mt-2 text-2xl font-bold">
            {isRegistering ? 'Crear cuenta docente' : 'Iniciar sesion'}
          </h3>
          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              {errorMessage}
            </div>
          )}
          {isRegistering ? (
            <form className="mt-5 space-y-4" onSubmit={onRegisterSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre">
                  <input
                    className="input"
                    value={registerForm.first_name}
                    onChange={(event) => onRegisterChange('first_name', event.target.value)}
                  />
                </Field>
                <Field label="Apellido">
                  <input
                    className="input"
                    value={registerForm.last_name}
                    onChange={(event) => onRegisterChange('last_name', event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Usuario">
                <input
                  className="input"
                  required
                  value={registerForm.username}
                  onChange={(event) => onRegisterChange('username', event.target.value)}
                />
              </Field>
              <Field label="Contrasena">
                <input
                  className="input"
                  minLength={8}
                  required
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => onRegisterChange('password', event.target.value)}
                />
              </Field>
              <button className="btn-primary w-full justify-center" disabled={isLoggingIn} type="submit">
                {isLoggingIn ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                Crear cuenta
              </button>
            </form>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <Field label="Usuario">
                <input
                  className="input"
                  value={form.username}
                  onChange={(event) => onChange('username', event.target.value)}
                />
              </Field>
              <Field label="Contrasena">
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(event) => onChange('password', event.target.value)}
                />
              </Field>
              <button className="btn-primary w-full justify-center" disabled={isLoggingIn} type="submit">
                {isLoggingIn ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                Entrar
              </button>
            </form>
          )}
          <button
            className="mt-4 w-full text-center text-sm font-semibold text-teal-700 hover:text-teal-900"
            onClick={() => onModeChange(isRegistering ? 'login' : 'register')}
            type="button"
          >
            {isRegistering ? 'Ya tengo cuenta docente' : 'Crear primera cuenta docente'}
          </button>
        </section>
      </div>
    </main>
  );
}

function AppHeader({
  activeSection,
  booksCount,
  publishedBooks,
  scenesCount,
  studentsCount,
  user,
  onCreateBook,
  onGoHome,
  onLogout,
  onOpenStudents,
}) {
  return (
    <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button className="flex items-center gap-3 text-left" onClick={onGoHome} type="button">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Library size={23} />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-700">BibliotecaAR</p>
            <h1 className="text-xl font-bold">Panel docente</h1>
          </div>
        </button>

        <div className="grid grid-cols-4 gap-2 xl:min-w-[560px]">
          <Metric label="Libros" value={booksCount} />
          <Metric label="Publicados" value={publishedBooks} />
          <Metric label="Capitulos" value={scenesCount} />
          <Metric label="Ninios" value={studentsCount} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={activeSection === 'library' ? 'btn-primary' : 'btn-secondary'}
            onClick={onGoHome}
            type="button"
          >
            <BookOpen size={17} />
            Biblioteca
          </button>
          <button
            className={activeSection === 'students' ? 'btn-primary' : 'btn-secondary'}
            onClick={onOpenStudents}
            type="button"
          >
            <Users size={17} />
            Ninios
          </button>
          <button className="btn-secondary" onClick={onCreateBook} type="button">
            <Plus size={17} />
            Libro
          </button>
          <button className="btn-secondary" onClick={onLogout} type="button" title={user?.username}>
            <LogOut size={17} />
            Salir
          </button>
        </div>
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
        <SearchBox placeholder="Buscar libro" value={searchTerm} onChange={setSearchTerm} />
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

function StudentsView({
  books,
  isLoading,
  onCreateStudent,
  onDeleteStudent,
  onEditStudent,
  searchTerm,
  setSearchTerm,
  students,
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">Acceso infantil</p>
          <h2 className="mt-1 text-3xl font-bold">Cuentas de ninios</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Registra fotos faciales, aulas y libros asignados para que la app infantil reconozca al estudiante.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox placeholder="Buscar ninio" value={searchTerm} onChange={setSearchTerm} />
          <button className="btn-primary justify-center" onClick={onCreateStudent} type="button">
            <Plus size={17} />
            Nuevo ninio
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <LoadingBlock text="Cargando ninios" />
        </div>
      ) : students.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <StudentCard
              books={books}
              key={student.id}
              onDelete={() => onDeleteStudent(student)}
              onEdit={() => onEditStudent(student)}
              student={student}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel="Crear primer ninio"
          icon={Users}
          onAction={onCreateStudent}
          text="Cada perfil puede guardar una foto facial y los libros que vera en la app."
          title="Aun no hay cuentas infantiles"
        />
      )}
    </section>
  );
}

function StudentCard({ books, student, onDelete, onEdit }) {
  const assignedBooks = student.assigned_books_detail?.length
    ? student.assigned_books_detail
    : books.filter((book) => student.assigned_books?.includes(book.id));

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {student.photo_url ? (
          <img alt="" className="size-20 rounded-lg object-cover" src={student.photo_url} />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <UserRound size={34} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold">{student.full_name}</h3>
              <p className="text-sm text-slate-500">{student.classroom || 'Sin aula'}</p>
            </div>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${student.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {student.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <ResourcePill icon={Eye} text={student.has_face_signature ? 'Rostro registrado' : 'Sin rostro'} />
            <ResourcePill icon={BookOpen} text={`${assignedBooks.length} libros`} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Libros asignados</p>
        <p className="mt-2 text-sm text-slate-700">
          {assignedBooks.length ? assignedBooks.map((book) => book.title).join(', ') : 'Sin libros asignados'}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1 justify-center" onClick={onEdit} type="button">
          <Edit3 size={17} />
          Editar
        </button>
        <IconButton label="Eliminar ninio" onClick={onDelete}>
          <Trash2 size={17} />
        </IconButton>
      </div>
    </article>
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

      <FormPanel
        eyebrow="Libro"
        title={isEditing ? 'Editar libro' : 'Crear libro'}
        text="Define la informacion principal que vera el docente antes de administrar capitulos."
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
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
          <FormActions isSaving={isSaving} onBack={onBack} submitText={isEditing ? 'Guardar cambios' : 'Crear libro'} />
        </form>
      </FormPanel>
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

      <FormPanel
        eyebrow={book.title}
        title={isEditing ? 'Editar capitulo' : 'Crear capitulo'}
        text="Completa el texto, recursos y clave del prefab. El QR se genera automaticamente en el backend."
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
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

          <FormActions isSaving={isSaving} onBack={onBack} submitText={isEditing ? 'Guardar cambios' : 'Crear capitulo'} />
        </form>
      </FormPanel>
    </section>
  );
}

function StudentFormView({ books, form, isSaving, onBack, onChange, onSubmit, student }) {
  const isEditing = Boolean(student);

  function toggleBook(bookId) {
    const current = form.assigned_books;
    if (current.includes(bookId)) {
      onChange('assigned_books', current.filter((id) => id !== bookId));
      return;
    }
    onChange('assigned_books', [...current, bookId]);
  }

  return (
    <section className="mt-6 max-w-5xl">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver a ninios
      </button>

      <FormPanel
        eyebrow="Cuenta infantil"
        title={isEditing ? 'Editar cuenta de ninio' : 'Crear cuenta de ninio'}
        text="Registra una foto facial y asigna los libros que vera el estudiante en la app infantil."
      >
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={onSubmit}>
          <div className="space-y-4">
            <Field label="Nombre completo">
              <input
                className="input"
                placeholder="Ej. Ana Torres"
                value={form.full_name}
                onChange={(event) => onChange('full_name', event.target.value)}
              />
            </Field>
            <Field label="Aula o seccion">
              <input
                className="input"
                placeholder="Ej. Inicial 5"
                value={form.classroom}
                onChange={(event) => onChange('classroom', event.target.value)}
              />
            </Field>
            <Field label={isEditing ? 'Actualizar foto facial' : 'Foto facial'}>
              <input
                accept="image/*"
                className="input"
                onChange={(event) => onChange('photo', event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <input
                checked={form.is_active}
                onChange={(event) => onChange('is_active', event.target.checked)}
                type="checkbox"
              />
              Cuenta activa
            </label>
          </div>

          <aside className="space-y-4">
            {student?.photo_url && (
              <img alt="" className="h-44 w-full rounded-lg object-cover" src={student.photo_url} />
            )}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold">Libros asignados</p>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                {books.map((book) => (
                  <label
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                    key={book.id}
                  >
                    <input
                      checked={form.assigned_books.includes(book.id)}
                      onChange={() => toggleBook(book.id)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-semibold">{book.title}</span>
                      <span className="block text-xs text-slate-500">
                        {book.is_published ? 'Publicado' : 'Borrador'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <FormActions isSaving={isSaving} onBack={onBack} submitText={isEditing ? 'Guardar cambios' : 'Crear cuenta'} />
        </form>
      </FormPanel>
    </section>
  );
}

function FormPanel({ children, eyebrow, text, title }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-teal-700">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function FormActions({ isSaving, onBack, submitText }) {
  return (
    <div className="flex gap-2 md:col-span-2 lg:col-span-2">
      <button className="btn-primary" disabled={isSaving} type="submit">
        {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
        {submitText}
      </button>
      <button className="btn-secondary" onClick={onBack} type="button">
        Cancelar
      </button>
    </div>
  );
}

function SearchBox({ onChange, placeholder, value }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 lg:w-80">
      <Search size={17} />
      <input
        className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
