import { lazy, Suspense } from 'react';

const GlbPreview = lazy(() => import('./GlbPreview'));

export default function GlbPreviewLazy(props) {
  return (
    <Suspense fallback={<div className="grid h-72 place-items-center rounded-xl bg-slate-100 text-sm text-slate-600" role="status">Preparando vista 3D…</div>}>
      <GlbPreview {...props} />
    </Suspense>
  );
}
