import { useCallback, useEffect, useMemo, useState, useRef, useId, cloneElement } from 'react';
import AppHeader from './components/AppHeader';
import FileUpload from './components/FileUpload';
import GlbPreviewLazy from './components/GlbPreviewLazy';
import { normalizeSearch, nextChapterOrder } from './lib/forms';
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
  KeyRound,
  Loader2,
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
  downloadSceneQrPdf,
  getTeacherSession,
  listBooks,
  listScenes,
  listStudents,
  loginTeacher,
  logoutTeacher,
  registerTeacher,
  resetStudentAccessCode,
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
  remove_glb_model: false,
  tap_animation_name: '',
  ar_marker_width_cm: 6,
  ar_model_size_cm: 8,
  ar_offset_x_cm: 0,
  ar_offset_y_cm: 0.5,
  ar_offset_z_cm: 0,
  ar_yaw_degrees: 0,
};

const arPlacementFields = [
  { key: 'ar_marker_width_cm', label: 'Ancho del QR impreso (cm)', min: 2, max: 30, step: 0.5 },
  { key: 'ar_model_size_cm', label: 'Lado mayor del modelo (cm)', min: 1, max: 50, step: 0.5 },
  { key: 'ar_offset_x_cm', label: 'Mover a derecha / izquierda (cm)', min: -50, max: 50, step: 0.5 },
  { key: 'ar_offset_y_cm', label: 'Elevar sobre la página (cm)', min: -50, max: 50, step: 0.5 },
  { key: 'ar_offset_z_cm', label: 'Mover sobre la página (cm)', min: -50, max: 50, step: 0.5 },
  { key: 'ar_yaw_degrees', label: 'Giro del personaje (grados)', min: -180, max: 180, step: 5 },
];

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
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [issuedAccess, setIssuedAccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mutationLock = useRef(false);
  const [bookStatus, setBookStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('title');
  const [studentStatus, setStudentStatus] = useState('all');
  const isBusy = isSavingBook || isSavingChapter || isSavingStudent || isResettingCode || isDeleting || isLoggingOut;
  const errorRef = useRef(null);
  useEffect(() => { if (errorMessage) errorRef.current?.focus(); }, [errorMessage]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function canLeave() {
    if (mutationLock.current || isBusy || isLoading) return false;
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')) return false;
    setDirty(false); setErrorMessage('');
    return true;
  }

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;
  const selectedScenes = useMemo(() => {
    if (!selectedBook) return [];
    return scenes
      .filter((scene) => scene.book === selectedBook.id)
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [scenes, selectedBook]);

  const filteredBooks = useMemo(() => {
    const query = normalizeSearch(searchTerm);
    return books.filter((book) => normalizeSearch(book.title + ' ' + book.description).includes(query) &&
      (bookStatus === 'all' || book.is_published === (bookStatus === 'published'))
    ).sort((a, b) => sortOrder === 'recent' ? new Date(b.updated_at) - new Date(a.updated_at) : a.title.localeCompare(b.title, 'es'));
  }, [books, searchTerm, bookStatus, sortOrder]);
  const filteredStudents = useMemo(() => {
    const query = normalizeSearch(studentSearchTerm);
    return students.filter((student) => normalizeSearch(student.full_name + ' ' + student.classroom).includes(query) &&
      (studentStatus === 'all' || student.is_active === (studentStatus === 'active'))
    ).sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
  }, [studentSearchTerm, students, studentStatus]);

  const publishedBooks = books.filter((book) => book.is_published).length;

  const loadTeacherContent = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    const results = await Promise.allSettled([listBooks(), listScenes(), listStudents()]);
    const setters = [setBooks, setScenes, setStudents];
    const labels = ['libros', 'capítulos', 'estudiantes'];
    const errors = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) setters[index](result.value);
      else errors.push(labels[index] + ': ' + (result.reason?.message || 'Respuesta no válida del servidor.'));
    });
    setErrorMessage(errors.length ? 'No se pudo cargar ' + errors.join('\n') : '');
    setIsLoading(false);
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
    if (!canLeave()) return;
    setIsLoggingOut(true); mutationLock.current = true;
    try {
      await logoutTeacher();
      setSession({ checked: true, is_authenticated: false, user: null });
      setBooks([]); setScenes([]); setStudents([]);
      setSelectedBookId(null); setView('books'); setSection('library');
      setNotice(''); setSearchTerm(''); setStudentSearchTerm('');
    } catch (error) { setErrorMessage(error.message); }
    finally { setIsLoggingOut(false); mutationLock.current = false; }
  }

  function selectBook(book) {
    if (!canLeave()) return;
    setSelectedBookId(book.id);
    setEditingBookId(null);
    setEditingChapterId(null);
    setSection('library');
    setView('detail');
  }

  function openCreateBook() {
    if (!canLeave()) return;
    setBookForm(emptyBookForm);
    setEditingBookId(null);
    setSection('library');
    setView('book-form');
  }

  function openEditBook(book) {
    if (!canLeave()) return;
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
    if (!canLeave()) return;
    if (!selectedBook) return;
    setChapterForm({ ...emptyChapterForm, order: nextChapterOrder(selectedScenes) });
    setEditingChapterId(null);
    setView('chapter-form');
  }

  function openEditChapter(chapter) {
    if (!canLeave()) return;
    setChapterForm({
      title: chapter.title,
      order: chapter.order,
      text: chapter.text,
      prefab_key: chapter.prefab_key,
      audio: null,
      glb_model: null,
      remove_glb_model: false,
      tap_animation_name: chapter.tap_animation_name ?? '',
      ar_marker_width_cm: chapter.ar_marker_width_cm ?? 6,
      ar_model_size_cm: chapter.ar_model_size_cm ?? 8,
      ar_offset_x_cm: chapter.ar_offset_x_cm ?? 0,
      ar_offset_y_cm: chapter.ar_offset_y_cm ?? 0.5,
      ar_offset_z_cm: chapter.ar_offset_z_cm ?? 0,
      ar_yaw_degrees: chapter.ar_yaw_degrees ?? 0,
    });
    setEditingChapterId(chapter.id);
    setSelectedBookId(chapter.book);
    setSection('library');
    setView('chapter-form');
  }

  function openStudents() {
    if (!canLeave()) return;
    setSection('students');
    setView('students');
    setEditingStudentId(null);
    setErrorMessage('');
  }

  function openCreateStudent() {
    if (!canLeave()) return;
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setSection('students');
    setView('student-form');
  }

  function openEditStudent(student) {
    if (!canLeave()) return;
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
    if (!canLeave()) return;
    setSection('library');
    setView('books');
    setSelectedBookId(null);
    setEditingBookId(null);
    setEditingChapterId(null);
    setErrorMessage('');
  }

  function goToDetail() {
    if (!canLeave()) return;
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
    if (mutationLock.current) return;
    const title = bookForm.title.trim();
    if (!title) { setErrorMessage('Escribe un título para el libro.'); return; }

    mutationLock.current = true;
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

      setDirty(false);
      setNotice('Libro guardado correctamente.');
      setBookForm(emptyBookForm);
      setEditingBookId(null);
      setView('detail');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsSavingBook(false);
    }
  }

  async function handleSaveChapter(event) {
    event.preventDefault();
    if (mutationLock.current) return;
    if (!selectedBook) return;

    const title = chapterForm.title.trim();
    const order = Number(chapterForm.order);
    if (!title || !chapterForm.text.trim()) {
      setErrorMessage('Completa el título y el texto.'); return;
    }
    if (!Number.isInteger(order) || order < 1) { setErrorMessage('El orden debe ser un entero mayor que cero.'); return; }

    const arPlacement = {
      ar_marker_width_cm: Number(chapterForm.ar_marker_width_cm),
      ar_model_size_cm: Number(chapterForm.ar_model_size_cm),
      ar_offset_x_cm: Number(chapterForm.ar_offset_x_cm),
      ar_offset_y_cm: Number(chapterForm.ar_offset_y_cm),
      ar_offset_z_cm: Number(chapterForm.ar_offset_z_cm),
      ar_yaw_degrees: Number(chapterForm.ar_yaw_degrees),
    };
    if (!Number.isFinite(arPlacement.ar_marker_width_cm) || arPlacement.ar_marker_width_cm < 2 || arPlacement.ar_marker_width_cm > 30 ||
        !Number.isFinite(arPlacement.ar_model_size_cm) || arPlacement.ar_model_size_cm < 1 || arPlacement.ar_model_size_cm > 50 ||
        [arPlacement.ar_offset_x_cm, arPlacement.ar_offset_y_cm, arPlacement.ar_offset_z_cm].some((value) => !Number.isFinite(value) || value < -50 || value > 50) ||
        !Number.isFinite(arPlacement.ar_yaw_degrees) || Math.abs(arPlacement.ar_yaw_degrees) > 180) {
      setErrorMessage('Revisa las medidas AR: marcador de 2 a 30 cm, modelo de 1 a 50 cm, desplazamientos de −50 a 50 cm y giro de −180° a 180°.');
      return;
    }

    mutationLock.current = true;
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
      remove_glb_model: chapterForm.remove_glb_model && !chapterForm.glb_model,
      tap_animation_name: chapterForm.tap_animation_name,
      ...arPlacement,
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

      setDirty(false);
      setNotice('Capítulo guardado correctamente.');
      setChapterForm(emptyChapterForm);
      setEditingChapterId(null);
      setView('detail');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsSavingChapter(false);
    }
  }

  async function handleSaveStudent(event) {
    event.preventDefault();
    if (mutationLock.current) return;
    const fullName = studentForm.full_name.trim();
    if (!fullName) { setErrorMessage('Escribe el nombre del estudiante.'); return; }

    mutationLock.current = true;
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
        const { access_code: accessCode, ...studentRecord } = created;
        setStudents((current) => [studentRecord, ...current]);
        setIssuedAccess({ name: created.full_name, code: accessCode });
      }

      setDirty(false);
      setNotice('Estudiante guardado correctamente.');
      setStudentForm(emptyStudentForm);
      setEditingStudentId(null);
      setView('students');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsSavingStudent(false);
    }
  }

  async function handleResetStudentCode(student) {
    if (mutationLock.current) return;
    if (student.has_access_code && !window.confirm(
      `¿Generar un código nuevo para ${student.full_name}? El código anterior y sus sesiones dejarán de funcionar.`,
    )) return;

    mutationLock.current = true;
    setIsResettingCode(true);
    setErrorMessage('');
    try {
      const result = await resetStudentAccessCode(student.id);
      setStudents((current) => current.map((item) => (
        item.id === student.id ? { ...item, has_access_code: true } : item
      )));
      setIssuedAccess({ name: student.full_name, code: result.access_code });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsResettingCode(false);
    }
  }

  async function handleDeleteBook(book = selectedBook) {
    if (!book || mutationLock.current) return;

    const confirmed = window.confirm(
      `Eliminar "${book.title}" también eliminará sus capítulos. Esta accion no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage('');

    mutationLock.current = true;
    setIsDeleting(true);
    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      setScenes((current) => current.filter((scene) => scene.book !== book.id));
      setStudents((current) =>
        current.map((student) => ({
          ...student,
          assigned_books: (student.assigned_books ?? []).filter((id) => id !== book.id),
          assigned_books_detail: (student.assigned_books_detail ?? []).filter((item) => item.id !== book.id),
        })),
      );
      setSelectedBookId(null);
      setView('books');
      setNotice('Eliminado correctamente.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsDeleting(false);
    }
  }

  async function handleDeleteChapter(chapterId) {
    if (mutationLock.current) return;
    const chapter = scenes.find((item) => item.id === chapterId);
    if (!window.confirm('¿Eliminar el capítulo "' + (chapter?.title || '') + '"? Su QR dejará de estar disponible.')) return;
    setErrorMessage('');

    mutationLock.current = true;
    setIsDeleting(true);
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
      setNotice('Eliminado correctamente.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsDeleting(false);
    }
  }

  async function handleDeleteStudent(student) {
    if (mutationLock.current) return;
    const confirmed = window.confirm(`Eliminar la cuenta de "${student.full_name}"?`);
    if (!confirmed) return;

    setErrorMessage('');

    mutationLock.current = true;
    setIsDeleting(true);
    try {
      await deleteStudent(student.id);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      setNotice('Eliminado correctamente.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      mutationLock.current = false;
      setIsDeleting(false);
    }
  }

  if (!session.checked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950">
        <LoadingBlock text="Verificando sesión docente" />
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
    <main className="app-shell text-slate-950">
      <a href="#workspace" className="skip-link">Saltar al contenido</a>
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <AppHeader
          activeSection={section}
          booksCount={books.length}
          onRefresh={() => { if (canLeave()) loadTeacherContent(); }}
          busy={isBusy || isLoading}
          onGoHome={goToBooks}
          onLogout={handleLogout}
          onOpenStudents={openStudents}
          publishedBooks={publishedBooks}
          scenesCount={scenes.length}
          studentsCount={students.length}
          user={session.user}
        />

        {errorMessage && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="flex-1 whitespace-pre-line">{errorMessage}</p>
            <button type="button" className="font-semibold underline" disabled={isBusy || isLoading} onClick={loadTeacherContent}>Actualizar datos</button>
          </div>
        )}

        {notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"><Check size={18} /><span className="flex-1">{notice}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}
        {issuedAccess && <AccessCodeDialog issuedAccess={issuedAccess} onClose={() => setIssuedAccess(null)} />}
        <fieldset id="workspace" disabled={isBusy || isLoading} aria-busy={isBusy || isLoading} className="min-w-0" onChangeCapture={(event) => { if (event.target.closest('form')) setDirty(true); }}>
        {view === 'books' && (
          <BooksView
            books={filteredBooks}
            bookStatus={bookStatus} setBookStatus={setBookStatus} sortOrder={sortOrder} setSortOrder={setSortOrder}
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
            onChange={(field, value) => { setDirty(true); setBookForm((current) => ({ ...current, [field]: value })); }}
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
            onChange={(field, value) => {
              setDirty(true);
              setChapterForm((current) => ({
                ...current,
                [field]: value,
                ...(field === 'glb_model' || (field === 'remove_glb_model' && value)
                  ? { tap_animation_name: '' } : {}),
                ...(field === 'glb_model' && value ? { remove_glb_model: false } : {}),
              }));
            }}
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
            onResetStudentCode={handleResetStudentCode}
            searchTerm={studentSearchTerm}
            setSearchTerm={setStudentSearchTerm}
            students={filteredStudents}
            studentStatus={studentStatus} setStudentStatus={setStudentStatus}
          />
        )}

        {view === 'student-form' && (
          <StudentFormView
            books={books}
            form={studentForm}
            isSaving={isSavingStudent}
            onBack={openStudents}
            onChange={(field, value) =>
              { setDirty(true); setStudentForm((current) => ({ ...current, [field]: value })); }
            }
            onSubmit={handleSaveStudent}
            student={students.find((student) => student.id === editingStudentId)}
          />
        )}
        </fieldset>
        <footer className="mt-12 border-t border-slate-200 py-5 text-xs text-slate-500">BibliotecaAR · Aprender también es explorar.</footer>
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
    <main className="login-shell min-h-screen px-4 py-8 text-slate-950">
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
          <h2 className="mt-8 text-4xl font-bold">Gestiona libros, capítulos y cuentas infantiles.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Un espacio para preparar lecturas, organizar estudiantes y conectar cada capítulo con una experiencia de realidad aumentada.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-teal-950/5 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
            <ShieldCheck size={18} />
            Sesión segura
          </div>
          <h3 className="mt-2 text-2xl font-bold">
            {isRegistering ? 'Crear cuenta docente' : 'Iniciar sesión'}
          </h3>
          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              {errorMessage}
            </div>
          )}
          {isRegistering ? (
            <form className="mt-5 space-y-4" onSubmit={onRegisterSubmit}>
              <p className="text-sm leading-6 text-slate-500">Cualquier persona puede crear una cuenta docente y entrar al panel.</p>
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
                  autoComplete="username"
                  value={registerForm.username}
                  onChange={(event) => onRegisterChange('username', event.target.value)}
                />
              </Field>
              <Field label="Contraseña">
                <input
                  className="input"
                  minLength={8}
                  required
                  type="password"
                  autoComplete="new-password"
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
                  required autoComplete="username"
                  value={form.username}
                  onChange={(event) => onChange('username', event.target.value)}
                />
              </Field>
              <Field label="Contraseña">
                <input
                  className="input"
                  type="password"
                  required autoComplete="current-password"
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
            {isRegistering ? 'Ya tengo cuenta docente' : 'Crear cuenta docente'}
          </button>
        </section>
      </div>
    </main>
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
  bookStatus, setBookStatus, sortOrder, setSortOrder,
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">Biblioteca del docente</p>
          <h2 className="mt-1 text-3xl font-bold">Mis libros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Revisa tus libros, entra al detalle para administrar capítulos o crea uno nuevo.
          </p>
        </div>
<div className="flex flex-wrap gap-2"><SearchBox placeholder="Buscar libro" value={searchTerm} onChange={setSearchTerm} /><button className="btn-primary" onClick={onCreateBook} type="button"><Plus size={17} />Nuevo libro</button></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="book-status">Estado de los libros</label>
        <select id="book-status" className="input w-auto" value={bookStatus} onChange={(event) => setBookStatus(event.target.value)}><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option></select>
        <label className="sr-only" htmlFor="book-sort">Ordenar libros</label>
        <select id="book-sort" className="input w-auto" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="title">Título: A–Z</option><option value="recent">Actualizados recientemente</option></select>
        <span className="text-sm text-slate-500" role="status">{books.length} {books.length === 1 ? 'libro' : 'libros'}</span>
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
          actionLabel={searchTerm || bookStatus !== 'all' ? 'Limpiar filtros' : 'Crear primer libro'}
          icon={BookOpen}
          onAction={searchTerm || bookStatus !== 'all' ? () => { setSearchTerm(''); setBookStatus('all'); } : onCreateBook}
          text={searchTerm || bookStatus !== 'all' ? 'Prueba otro nombre o cambia los filtros.' : 'Empieza con un libro y añade capítulos, narraciones y recursos AR.'}
          title={searchTerm || bookStatus !== 'all' ? 'No encontramos coincidencias' : 'Tu próxima historia empieza aquí'}
        />
      )}
    </section>
  );
}

function AccessCodeDialog({ issuedAccess, onClose }) {
  const closeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { closeRef.current?.focus(); }, []);

  async function copyCode() {
    try {
      await window.navigator.clipboard.writeText(issuedAccess.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section aria-labelledby="access-code-title" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} role="dialog">
        <div className="flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><KeyRound size={23} /></div>
        <h2 className="mt-4 text-2xl font-bold" id="access-code-title">Código de acceso de {issuedAccess.name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Tiene {issuedAccess.code.length} caracteres. Entrégalo al estudiante; se muestra solo ahora. Puede escribirlo en minúsculas. Si lo pierde, genera otro desde su perfil.</p>
        <p className="mt-5 select-all rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.2em] text-teal-900" data-testid="student-access-code">{issuedAccess.code}</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={copyCode} type="button">{copied ? 'Copiado' : 'Copiar código'}</button>
          <button className="btn-primary flex-1 justify-center" onClick={onClose} ref={closeRef} type="button">Entendido</button>
        </div>
      </section>
    </div>
  );
}

function StudentsView({
  books,
  isLoading,
  onCreateStudent,
  onDeleteStudent,
  onEditStudent,
  onResetStudentCode,
  searchTerm,
  setSearchTerm,
  students,
  studentStatus, setStudentStatus,
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">Acceso infantil</p>
          <h2 className="mt-1 text-3xl font-bold">Cuentas de estudiantes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Organiza perfiles, fotografías y lecturas asignadas por aula.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox placeholder="Buscar estudiante" value={searchTerm} onChange={setSearchTerm} />
          <button className="btn-primary justify-center" onClick={onCreateStudent} type="button">
            <Plus size={17} />
            Nuevo estudiante
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3"><label className="sr-only" htmlFor="student-status">Estado de estudiantes</label><select id="student-status" className="input w-auto" value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)}><option value="all">Todos los estudiantes</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select><span role="status" className="text-sm text-slate-500">{students.length} estudiantes</span></div>
      {isLoading ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <LoadingBlock text="Cargando estudiantes" />
        </div>
      ) : students.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <StudentCard
              books={books}
              key={student.id}
              onDelete={() => onDeleteStudent(student)}
              onEdit={() => onEditStudent(student)}
              onResetCode={() => onResetStudentCode(student)}
              student={student}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel={searchTerm || studentStatus !== 'all' ? 'Limpiar filtros' : 'Registrar estudiante'}
          icon={Users}
          onAction={searchTerm || studentStatus !== 'all' ? () => { setSearchTerm(''); setStudentStatus('all'); } : onCreateStudent}
          text={searchTerm || studentStatus !== 'all' ? 'Prueba otro nombre, aula o estado.' : 'Organiza sus perfiles y asigna lecturas desde un solo lugar.'}
          title={searchTerm || studentStatus !== 'all' ? 'No encontramos coincidencias' : 'Conoce a tus lectores'}
        />
      )}
    </section>
  );
}

function StudentCard({ books, student, onDelete, onEdit, onResetCode }) {
  const assignedBooks = books.filter((book) => student.assigned_books?.includes(book.id));

  return (
    <article className="catalog-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <h3 className="break-words text-lg font-bold">{student.full_name}</h3>
              <p className="text-sm text-slate-500">{student.classroom || 'Sin aula'}</p>
            </div>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${student.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {student.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <ResourcePill icon={Eye} text={student.has_face_signature ? 'Rostro registrado' : 'Sin rostro'} />
            <ResourcePill icon={KeyRound} text={student.has_access_code ? 'Código listo' : 'Sin código'} />
            <ResourcePill icon={BookOpen} text={`${assignedBooks.length} libros`} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><BookOpen size={17} className="text-teal-700" /> Lecturas asignadas</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-teal-800">{assignedBooks.length}</span>
        </div>
        {assignedBooks.length ? (
          <div className="mt-3 space-y-2">
            {assignedBooks.slice(0, 3).map((book) => (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm" key={book.id}>
                <span className="min-w-0 truncate font-medium text-slate-800" title={book.title}>{book.title}</span>
                {!book.is_published && <span className="shrink-0 text-xs font-semibold text-amber-700">Borrador</span>}
              </div>
            ))}
            {assignedBooks.length > 3 && <p className="text-sm font-medium text-slate-600">+{assignedBooks.length - 3} más · Abre «Editar» para ver todos</p>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Todavía no tiene libros. Puedes asignarlos desde «Editar».</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1 justify-center" onClick={onResetCode} type="button">
          <KeyRound size={17} />
          {student.has_access_code ? 'Nuevo código' : 'Crear código'}
        </button>
        <button className="btn-secondary flex-1 justify-center" onClick={onEdit} type="button">
          <Edit3 size={17} />
          Editar
        </button>
        <IconButton label="Eliminar estudiante" onClick={onDelete}>
          <Trash2 size={17} />
        </IconButton>
      </div>
    </article>
  );
}

function BookCard({ book, scenesCount, onDelete, onEdit, onOpen }) {
  return (
    <article className="catalog-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {book.cover_url ? (
        <img alt="" loading="lazy" className="h-44 w-full object-cover" src={book.cover_url} />
      ) : (
        <div
          className={`flex h-44 items-center justify-center bg-gradient-to-br ${
            coverColors[book.id % coverColors.length]
          } text-white`}
        >
          <BookOpen size={38} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold">{book.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{scenesCount} capítulos</p>
          </div>
          <StatusBadge published={book.is_published} />
        </div>
        <p className="mt-3 line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">
          {book.description || 'Sin descripción.'}
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
  const [previewChapterId, setPreviewChapterId] = useState(null);

  return (
    <section className="mt-6">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver a libros
      </button>

      <div className="mt-4 catalog-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`bg-gradient-to-br ${coverColors[book.id % coverColors.length]} px-5 py-6 text-white`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <StatusBadge published={book.is_published} light />
              <h2 className="mt-3 text-3xl font-bold">{book.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
                {book.description || 'Este libro no tiene descripción.'}
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
          <Metric label="Capítulos" value={scenes.length} />
          <Metric label="Estado" value={book.is_published ? 'Publicado' : 'Borrador'} />
          <Metric label="ID libro" value={book.id} />
          <div className="flex flex-wrap items-end gap-2">
            <button className="btn-primary" onClick={onCreateChapter} type="button">
              <Plus size={17} />
              Nuevo capítulo
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
                previewOpen={previewChapterId === chapter.id}
                onTogglePreview={() => setPreviewChapterId((current) => current === chapter.id ? null : chapter.id)}
              />
            ))
          ) : (
            <EmptyState
              actionLabel="Crear capítulo"
              icon={QrCode}
              onAction={onCreateChapter}
              text="Cada capítulo genera su propio QR para que la app AR pueda reconocerlo."
              title="Este libro aún no tiene capítulos"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ChapterRow({ chapter, onDelete, onEdit, previewOpen, onTogglePreview }) {
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
            <ResourcePill icon={Box} text={chapter.glb_model_url ? 'Modelo GLB disponible' : 'Sin GLB'} />
          </div>
          {chapter.audio_url && <audio className="mt-4 w-full max-w-md" controls preload="none" src={chapter.audio_url}>Tu navegador no admite audio.</audio>}
          {chapter.glb_model_url && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                className="btn-secondary"
                type="button"
                aria-expanded={previewOpen}
                aria-controls={`chapter-preview-${chapter.id}`}
                onClick={onTogglePreview}
              >
                <Eye size={17} aria-hidden="true" />
                {previewOpen ? 'Cerrar vista 3D' : 'Vista 3D'}
              </button>
              <a className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 underline" href={chapter.glb_model_url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Abrir archivo GLB</a>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-600">
            AR: modelo {chapter.ar_model_size_cm ?? 8} cm · QR impreso {chapter.ar_marker_width_cm ?? 6} cm · giro {chapter.ar_yaw_degrees ?? 0}°. Ajuste final: app móvil → Docente → escanear QR.
          </p>
          {chapter.glb_model_url && (
            <p className="mt-1 text-xs font-medium text-teal-800">
              {chapter.tap_animation_name
                ? `Toque en pantalla: ${chapter.tap_animation_name}`
                : 'Toque en el modelo: automática (Walk)'}
            </p>
          )}
        </div>
        <SceneQrCard chapter={chapter} />
        <div className="flex shrink-0 gap-2">
          <IconButton label="Editar capítulo" onClick={onEdit}>
            <Edit3 size={17} />
          </IconButton>
          <IconButton label="Eliminar capítulo" onClick={onDelete}>
            <Trash2 size={17} />
          </IconButton>
        </div>
      </div>
      {previewOpen && chapter.glb_model_url && (
        <div className="mt-4 max-w-3xl" id={`chapter-preview-${chapter.id}`}>
          <GlbPreviewLazy src={chapter.glb_model_url} label={chapter.title || 'capítulo'} />
        </div>
      )}
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
        text="Define la información principal que vera el docente antes de administrar capítulos."
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Título">
            <input
              className="input"
              placeholder="Ej. Biologia interactiva"
              required maxLength={180} value={form.title}
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
          <Field label="Descripción">
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Describe el contenido del libro"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
            />
          </Field>
          <div className="space-y-4">
            <FileUpload label="Portada" accept="image/*" value={form.cover} currentUrl={book?.cover_url} onChange={(file) => onChange('cover', file)} />
          </div>
          <FormActions isSaving={isSaving} onBack={onBack} submitText={isEditing ? 'Guardar cambios' : 'Crear libro'} />
        </form>
      </FormPanel>
    </section>
  );
}

function ChapterFormView({ book, chapter, form, isSaving, onBack, onChange, onSubmit }) {
  const isEditing = Boolean(chapter);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  useEffect(() => {
    if (!form.glb_model) {
      setLocalPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(form.glb_model);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.glb_model]);
  const previewUrl = form.remove_glb_model ? null : form.glb_model ? localPreviewUrl : chapter?.glb_model_url;

  return (
    <section className="mt-6 max-w-4xl">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver al detalle
      </button>

      <FormPanel
        eyebrow={book.title}
        title={isEditing ? 'Editar capítulo' : 'Crear capítulo'}
        text="Añade la narración y sus recursos. El código QR se creará al guardar el capítulo."
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Título">
            <input
              className="input"
              placeholder="Ej. Sistema digestivo"
              required maxLength={180} value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
            />
          </Field>
          <Field label="Orden">
            <input
              className="input"
              min="1"
              step="1"
              required
              type="number"
              value={form.order}
              onChange={(event) => onChange('order', event.target.value)}
            />
          </Field>
          <Field label="Texto">
            <textarea
              className="input min-h-36 resize-y"
              placeholder="Contenido que vera o escuchara el estudiante"
              required  value={form.text}
              onChange={(event) => onChange('text', event.target.value)}
            />
          </Field>
          <div className="space-y-4">
            <Field label="Clave del modelo local · opcional">
              <input
                className="input"
                placeholder="Ej. heart_model"
                maxLength={120} value={form.prefab_key}
                onChange={(event) => onChange('prefab_key', event.target.value)}
              />
            </Field>
            <FileUpload label="Narración de audio" accept="audio/*" kind="audio" value={form.audio} currentUrl={chapter?.audio_url} onChange={(file) => onChange('audio', file)} />
            <FileUpload label="Modelo 3D · GLB" accept=".glb,model/gltf-binary" kind="model" value={form.glb_model} currentUrl={form.remove_glb_model ? null : chapter?.glb_model_url} onChange={(file) => onChange('glb_model', file)} />
            <p className="text-xs leading-5 text-slate-600">Sube un GLB con animaciones incluidas. El clip que elijas se reproducirá al tocar una zona libre de la pantalla en la app.</p>
            {chapter?.glb_model_url && !form.glb_model && <label className="flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" checked={Boolean(form.remove_glb_model)} onChange={(event) => onChange('remove_glb_model', event.target.checked)} />Retirar el modelo actual al guardar</label>}
          </div>

          {previewUrl && (
            <div className="md:col-span-2">
              <h3 className="mb-2 font-semibold text-slate-900">Vista previa y animación al tocar la pantalla</h3>
              <GlbPreviewLazy
                src={previewUrl}
                label={form.title || 'capítulo'}
                tapAnimationName={form.tap_animation_name}
                onTapAnimationChange={(name) => onChange('tap_animation_name', name)}
              />
            </div>
          )}

          <div className="md:col-span-2 rounded-xl border border-teal-100 bg-teal-50/70 p-4">
            <h3 className="font-semibold text-slate-900">Ubicación del modelo en la página</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Estas son medidas iniciales. En la app móvil, entra en «Docente», escanea el QR y ajusta el modelo sobre el libro real antes de publicar.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {arPlacementFields.map(({ key, label, min, max, step }) => (
                <Field key={key} label={label}>
                  <input
                    className="input" type="number" required min={min} max={max} step={step}
                    value={form[key]}
                    onChange={(event) => onChange(key, event.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>

          {chapter && (
            <div className="md:col-span-2">
              <SceneQrCard chapter={chapter} />
            </div>
          )}

          <FormActions isSaving={isSaving} onBack={onBack} submitText={isEditing ? 'Guardar cambios' : 'Crear capítulo'} />
        </form>
      </FormPanel>
    </section>
  );
}

function StudentFormView({ books, form, isSaving, onBack, onChange, onSubmit, student }) {
  const isEditing = Boolean(student);
  const [bookSearch, setBookSearch] = useState('');
  const normalizedBookSearch = normalizeSearch(bookSearch);
  const visibleBooks = books.filter((book) => normalizeSearch(book.title).includes(normalizedBookSearch));
  const selectedCount = books.filter((book) => form.assigned_books.includes(book.id)).length;

  function toggleBook(bookId) {
    const current = form.assigned_books;
    if (current.includes(bookId)) {
      onChange('assigned_books', current.filter((id) => id !== bookId));
      return;
    }
    onChange('assigned_books', [...current, bookId]);
  }

  return (
    <section className="mt-6 max-w-6xl">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Volver a estudiantes
      </button>

      <FormPanel
        eyebrow="Cuenta infantil"
        title={isEditing ? 'Editar cuenta de estudiante' : 'Crear cuenta de estudiante'}
        text="Completa el perfil y selecciona sus lecturas. La foto es opcional."
      >
        <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            <Field label="Nombre completo">
              <input
                className="input"
                placeholder="Ej. Ana Torres"
                required maxLength={180} value={form.full_name}
                onChange={(event) => onChange('full_name', event.target.value)}
              />
            </Field>
            <Field label="Aula o sección">
              <input
                className="input"
                placeholder="Ej. Inicial 5"
                value={form.classroom}
                onChange={(event) => onChange('classroom', event.target.value)}
              />
            </Field>
            <FileUpload label="Fotografía del estudiante" accept="image/*" value={form.photo} currentUrl={student?.photo_url} onChange={(file) => onChange('photo', file)} />
            <label className="flex min-h-14 items-center gap-3 self-start rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 md:mt-7">
              <input
                checked={form.is_active}
                onChange={(event) => onChange('is_active', event.target.checked)}
                type="checkbox"
              />
              Cuenta activa
            </label>
          </div>

          <section aria-labelledby="assigned-books-title" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900" id="assigned-books-title">Libros para este estudiante</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Elige las lecturas que aparecerán en «Mis libros» de la app. Puedes cambiarlas cuando quieras.</p>
              </div>
              <span className="rounded-full bg-teal-100 px-3 py-1.5 text-sm font-bold text-teal-800" aria-live="polite">{selectedCount} de {books.length} seleccionados</span>
            </div>

            {books.length ? (
              <>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="relative block w-full sm:max-w-sm">
                    <span className="sr-only">Buscar libro para asignar</span>
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input className="input pl-10" onChange={(event) => setBookSearch(event.target.value)} placeholder="Buscar libro por título" type="search" value={bookSearch} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" disabled={selectedCount === books.length} onClick={() => onChange('assigned_books', books.map((book) => book.id))} type="button">Asignar todos ({books.length})</button>
                    <button className="btn-secondary" disabled={selectedCount === 0} onClick={() => onChange('assigned_books', [])} type="button">Quitar todos</button>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">Los libros en borrador aparecerán en la app cuando los publiques.</p>
                {visibleBooks.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {visibleBooks.map((book) => {
                      const isSelected = form.assigned_books.includes(book.id);
                      return (
                        <label className={`flex min-h-28 cursor-pointer gap-4 rounded-xl border-2 p-4 transition hover:border-teal-400 ${isSelected ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`} key={book.id}>
                          {book.cover_url ? <img alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" loading="lazy" src={book.cover_url} /> : <span aria-hidden="true" className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><BookOpen size={24} /></span>}
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-base font-bold text-slate-900">{book.title}</span>
                            <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${book.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{book.is_published ? 'Publicado' : 'Borrador'}</span>
                            {book.description && <span className="mt-2 block line-clamp-2 text-sm leading-5 text-slate-600">{book.description}</span>}
                            <span className="mt-2 block text-sm font-medium text-teal-800">{isSelected ? 'Asignado' : 'Seleccionar para asignar'}</span>
                          </span>
                          <input aria-label={`Asignar ${book.title}`} checked={isSelected} className="mt-1 !h-5 !w-5" onChange={() => toggleBook(book.id)} type="checkbox" />
                        </label>
                      );
                    })}
                  </div>
                ) : <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No encontramos libros con ese título. Prueba otra búsqueda.</p>}
              </>
            ) : <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Todavía no hay libros para asignar. Crea uno en la biblioteca y vuelve aquí.</p>}
          </section>

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
      <button className="btn-secondary" disabled={isSaving} onClick={onBack} type="button">
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
        aria-label={placeholder}
        type="search"
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  async function handlePdfDownload() {
    setIsDownloading(true);
    setPdfError('');
    try {
      const pdf = await downloadSceneQrPdf(chapter.id);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${chapter.qr_code}-qr.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setPdfError(error.message || 'No se pudo descargar el PDF. Inténtalo otra vez.');
    } finally {
      setIsDownloading(false);
    }
  }

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
      <p className="mt-2 text-xs leading-5 text-slate-600">El PDF coloca el QR a {chapter.ar_marker_width_cm ?? 6} cm reales. Imprímelo al 100 %, sin «ajustar a página». La vista de arriba no indica su tamaño de impresión.</p>
      <button
        className="btn-primary mt-3 w-full justify-center"
        disabled={isDownloading || !chapter.qr_code}
        onClick={handlePdfDownload}
        type="button"
      >
        {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
        {isDownloading ? 'Preparando PDF…' : 'Descargar PDF para imprimir'}
      </button>
      {pdfError && <p className="mt-2 text-xs text-red-700" role="alert">{pdfError}</p>}
      {chapter.qr_image_url && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            href={chapter.qr_image_url}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={14} />
            Abrir PNG
          </a>
          <a
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            download
            href={chapter.qr_image_url}
          >
            <Download size={14} />
            Descargar PNG
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
      className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({ children, label }) {
  const id = useId();
  return <div><label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>;
}

function LoadingBlock({ text }) {
  return (
    <div role="status" className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={17} />
      {text}
    </div>
  );
}

function fileName(url) {
  try { return decodeURIComponent(url.split('?')[0].split('/').pop() ?? url); }
  catch { return 'Archivo'; }
}

function formatDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
