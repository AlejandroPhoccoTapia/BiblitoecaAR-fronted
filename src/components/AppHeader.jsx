import { BookOpen, Library, Users, LogOut, RefreshCw, ArrowUpRight } from 'lucide-react';

export default function AppHeader({ activeSection, booksCount, publishedBooks, scenesCount, studentsCount, user, onGoHome, onLogout, onOpenStudents, onRefresh, busy }) {
  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button className="flex items-center gap-3 text-left" onClick={onGoHome} type="button" aria-label="BibliotecaAR, ir a la biblioteca">
          <span className="brand-mark"><Library size={24} /></span>
          <span><span className="block text-xl font-extrabold tracking-tight">Biblioteca<span className="text-teal-700">AR</span></span><span className="text-xs text-slate-500">ESPACIO DOCENTE</span></span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-600 sm:block">Hola, <strong>{user?.first_name || user?.username}</strong></span>
          <button className="btn-secondary" disabled={busy} onClick={onRefresh} title="Actualizar biblioteca" aria-label="Actualizar biblioteca" type="button"><RefreshCw size={17} className={busy ? 'animate-spin' : ''} /></button>
          <button className="btn-secondary" onClick={onLogout} disabled={busy} type="button"><LogOut size={17} /><span>Salir</span></button>
        </div>
      </div>
      <div className="dashboard-banner">
        <div className="relative z-10 max-w-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">Una biblioteca, muchas posibilidades</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Dale otra dimensión<br />a cada historia.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-teal-50/85">Organiza tus libros, prepara experiencias de realidad aumentada y acompaña a tus estudiantes.</p>
        </div>
        <div aria-hidden="true" className="banner-illustration"><BookOpen size={105} strokeWidth={1} /><span><ArrowUpRight size={32} /></span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Libros en la biblioteca', booksCount, BookOpen], ['Libros publicados', publishedBooks, ArrowUpRight], ['Capítulos creados', scenesCount, Library], ['Estudiantes', studentsCount, Users]].map(([label, value, Icon]) => (
          <div key={label} className="stat-card"><span className="stat-icon"><Icon size={20} /></span><div><p className="text-2xl font-bold tracking-tight">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>
        ))}
      </div>
      <nav className="section-nav" aria-label="Secciones principales">
        <button aria-current={activeSection === 'library' ? 'page' : undefined} onClick={onGoHome} type="button"><BookOpen size={18} />Biblioteca</button>
        <button aria-current={activeSection === 'students' ? 'page' : undefined} onClick={onOpenStudents} type="button"><Users size={18} />Estudiantes</button>
      </nav>
    </header>
  );
}
