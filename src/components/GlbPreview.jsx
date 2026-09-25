import { useEffect, useId, useRef, useState } from 'react';
import { Box, Pause, Play } from 'lucide-react';
import '@google/model-viewer';

export default function GlbPreview({ src, label = 'Modelo 3D', tapAnimationName = '', onTapAnimationChange }) {
  const animationSelectId = useId();
  const viewerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [animations, setAnimations] = useState([]);
  const [animationName, setAnimationName] = useState('');
  const [playing, setPlaying] = useState(false);
  const choosingTapAnimation = typeof onTapAnimationChange === 'function';

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !src) return undefined;

    setStatus('loading');
    setAnimations([]);
    setAnimationName('');
    setPlaying(false);

    const handleLoad = () => {
      const names = [...(viewer.availableAnimations || [])];
      const automaticName = names.find((name) => /walk|caminar|walking/i.test(name)) || names[0] || '';
      setAnimations(names);
      setAnimationName(automaticName);
      if (automaticName) viewer.animationName = automaticName;
      setStatus('ready');
    };
    const handleError = () => {
      setStatus('error');
      setAnimations([]);
      setPlaying(false);
    };
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    return () => {
      viewer.pause?.();
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [src]);

  useEffect(() => {
    if (!tapAnimationName || !animations.includes(tapAnimationName) || !viewerRef.current) return;
    viewerRef.current.pause();
    viewerRef.current.animationName = tapAnimationName;
    viewerRef.current.currentTime = 0;
    setAnimationName(tapAnimationName);
    setPlaying(false);
  }, [tapAnimationName, animations]);

  function chooseAnimation(nextName) {
    setAnimationName(nextName);
    setPlaying(false);
    if (viewerRef.current) {
      viewerRef.current.pause();
      viewerRef.current.animationName = nextName;
      viewerRef.current.currentTime = 0;
    }
  }

  function chooseTapAnimation(event) {
    const nextName = event.target.value;
    onTapAnimationChange(nextName);
    chooseAnimation(nextName || animations.find((name) => /walk|caminar|walking/i.test(name)) || animations[0] || '');
  }

  function toggleAnimation() {
    const viewer = viewerRef.current;
    if (!viewer || !animationName) return;
    if (playing) viewer.pause();
    else viewer.play();
    setPlaying(!playing);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative h-72 bg-[radial-gradient(circle_at_50%_35%,#f8fafc,#e2e8f0)] sm:h-80">
        <model-viewer
          ref={viewerRef}
          src={src}
          alt={`Vista previa de ${label}`}
          camera-controls
          touch-action="pan-y"
          interaction-prompt="none"
          shadow-intensity="1"
          loading="eager"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-50/80 px-4 text-center text-sm font-medium text-slate-600" role="status">
            Cargando el modelo 3D…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 grid place-items-center bg-slate-50 px-6 text-center text-sm text-rose-700" role="alert">
            No se pudo mostrar este GLB. Comprueba el archivo y el acceso al recurso desde el navegador.
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2"><Box size={15} aria-hidden="true" /> Arrastra para girar · rueda o pellizca para acercar</span>
        {status === 'ready' && animations.length === 0 && <span>Sin animaciones en este GLB</span>}
        {status === 'ready' && animations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className={choosingTapAnimation ? 'font-semibold text-slate-700' : 'sr-only'} htmlFor={animationSelectId}>
              {choosingTapAnimation ? 'Al tocar el modelo' : 'Animación del modelo'}
            </label>
            <select
              id={animationSelectId}
              className="min-h-9 max-w-44 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
              value={choosingTapAnimation ? tapAnimationName : animationName}
              onChange={choosingTapAnimation ? chooseTapAnimation : (event) => chooseAnimation(event.target.value)}
            >
              {choosingTapAnimation && <option value="">Automática (Walk)</option>}
              {choosingTapAnimation && tapAnimationName && !animations.includes(tapAnimationName) && (
                <option value={tapAnimationName}>No encontrada: {tapAnimationName}</option>
              )}
              {animations.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button className="btn-secondary min-h-9 px-2 py-1 text-xs" type="button" onClick={toggleAnimation}>
              {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {playing ? 'Pausar' : 'Reproducir'}
            </button>
          </div>
        )}
      </div>
      {choosingTapAnimation && status === 'ready' && animations.length > 0 && (
        <p className="px-4 pb-3 text-xs leading-5 text-slate-600">
          Reproduce el clip para comprobarlo. La opción automática busca Walk o Caminar y desplaza el modelo; un clip elegido se reproduce sin desplazamiento adicional.
        </p>
      )}
    </div>
  );
}
