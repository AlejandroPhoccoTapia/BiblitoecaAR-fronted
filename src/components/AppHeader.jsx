import { BookOpen, Library, Users, LogOut, RefreshCw, QrCode, Smartphone } from 'lucide-react';

const steps = [
  { icon: BookOpen, label: 'Crea un libro' },
  { icon: QrCode, label: 'Prepara sus capítulos' },
  { icon: Smartphone, label: 'Léelo en la app' },
];

export default function AppHeader({ activeSection, showOverview, booksCount, publishedBooks, scenesCount, studentsCount, user, onGoHome, onLogout, onOpenStudents, onRefresh, busy }) {
  return (
    <header className="space-y-5">
      <div className="workspace-topbar">
        <button className="flex min-w-0 items-center gap-3 text-left" onClick={onGoHome} type="button" aria-label="BibliotecaAR, ir a la biblioteca">
          <span className="brand-mark"><Library size={24} aria-hidden="true" /></span>
          <span className="min-w-0"><span className="block text-lg font-extrabold tracking-tight sm:text-xl">Biblioteca<span className="text-teal-700">AR</span></span><span className="block text-xs font-semibold tracking-wide text-slate-500">PANEL DOCENTE</span></span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-slate-600 md:block">{user?.first_name || user?.username}</span>
          <button className="btn-secondary" disabled={busy} onClick={onRefresh} title="Actualizar datos" aria-label="Actualizar datos" type="button"><RefreshCw size={17} className={busy ? 'animate-spin' : ''} /></button>
          <button className="btn-secondary" onClick={onLogout} disabled={busy} type="button"><LogOut size={17} aria-hidden="true" /><span className="hidden sm:inline">Salir</span><span className="sr-only sm:hidden">Cerrar sesión</span></button>
        </div>
      </div>

      <nav className="section-nav" aria-label="Secciones principales">
        <button aria-current={activeSection === 'library' ? 'page' : undefined} onClick={onGoHome} type="button"><BookOpen size={18} aria-hidden="true" />Biblioteca</button>
        <button aria-current={activeSection === 'students' ? 'page' : undefined} onClick={onOpenStudents} type="button"><Users size={18} aria-hidden="true" />Estudiantes</button>
      </nav>

      {showOverview && (
        <div className="space-y-4">
          <div className="dashboard-banner">
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">Tu espacio de trabajo</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Prepara la próxima historia para tus estudiantes</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-teal-50/90">Organiza los capítulos, añade sus recursos y descarga el QR listo para imprimir.</p>
            </div>
            <ol className="banner-steps" aria-label="Cómo preparar una lectura">
              {steps.map(({ icon: Icon, label }, index) => <li key={label}><Icon size={16} aria-hidden="true" /><span>{index + 1}. {label}</span></li>)}
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[[booksCount, 'Libros', BookOpen], [publishedBooks, 'Publicados', QrCode], [scenesCount, 'Capítulos', Library], [studentsCount, 'Estudiantes', Users]].map(([value, label, Icon]) => (
              <div key={label} className="stat-card"><span className="stat-icon"><Icon size={19} aria-hidden="true" /></span><div><p className="text-xl font-bold tracking-tight sm:text-2xl">{value}</p><p className="text-xs font-medium text-slate-600">{label}</p></div></div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
