import { useEffect, useId, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import GlbPreviewLazy from './GlbPreviewLazy';

export default function FileUpload({ label, accept, value, onChange, currentUrl, kind = 'image' }) {
  const id = useId();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!value) {
      setPreview('');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  function select(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const valid = kind === 'model' ? /\.glb$/i.test(file.name) : file.type.startsWith(`${kind}/`);
    if (!valid) {
      setError(kind === 'model' ? 'Selecciona un archivo .glb.' : `Selecciona un archivo de ${kind === 'image' ? 'imagen' : 'audio'}.`);
      event.target.value = '';
      return;
    }
    setError(''); onChange(file);
  }
  const url = value ? preview : currentUrl;
  return (
    <div className="upload-field">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}</label>
      {url && kind === 'image' && <img className="mt-2 max-h-44 w-full rounded-xl object-contain bg-slate-50" src={url} alt={`Vista previa de ${label.toLowerCase()}`} />}
      {url && kind === 'audio' && <audio className="mt-2 w-full" controls src={url} preload="none">Tu navegador no admite audio.</audio>}
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <Upload size={18} className="shrink-0 text-teal-700" aria-hidden="true" />
        <input ref={inputRef} id={id} type="file" accept={accept} onChange={select} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} className="min-w-0 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-2 file:font-semibold file:text-teal-800" />
      </div>
      {value && <div className="mt-2 flex items-center justify-between gap-2 text-xs text-teal-800"><span className="break-all">{value.name} · {(value.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" onClick={() => onChange(null)} aria-label={`Descartar ${value.name}`} className="shrink-0 rounded-lg p-2"><X size={16} /></button></div>}
      {url && kind === 'model' && (
        <div className="mt-2 space-y-2">
          <GlbPreviewLazy src={url} label={value?.name || 'modelo actual'} />
          <p className="text-xs leading-5 text-slate-500">Vista previa para comprobar el archivo. La ubicación y el tamaño sobre el libro se ajustan en la app móvil.</p>
        </div>
      )}
      {currentUrl && kind === 'model' && <a className="mt-2 block text-sm font-semibold text-teal-700 underline" href={currentUrl} target="_blank" rel="noreferrer">Abrir modelo actual</a>}
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
