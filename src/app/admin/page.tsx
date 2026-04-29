'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileItem } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('lt-LT', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function totalSize(files: FileItem[]) {
  return files.reduce((acc, f) => acc + f.size, 0);
}

// ─── SVG icons ──────────────────────────────────────────────────────────────
function PhotoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <rect x="1" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 15l5-4 3 3 3-3 7 5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <rect x="1" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13 10L8 7v6l5-3z" fill="currentColor"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden>
      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden>
      <path d="M10 3v10M10 13l-4-4M10 13l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6" aria-hidden>
      <path
        d={dir === 'left' ? 'M13 4L7 10l6 6' : 'M7 4l6 6-6 6'}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({
  files,
  index,
  onClose,
  onNav,
}: {
  files: FileItem[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
}) {
  const file = files[index];
  const isVideo = file.contentType.startsWith('video/');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1);
      if (e.key === 'ArrowRight' && index < files.length - 1) onNav(index + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, files.length, onClose, onNav]);

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Failo peržiūra"
    >
      {/* prev */}
      {index > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/30 rounded-full p-2 transition z-10"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
          aria-label="Ankstesnis"
        >
          <ChevronIcon dir="left" />
        </button>
      )}

      {/* media */}
      <div
        className="max-w-5xl max-h-screen w-full px-16 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={file.viewUrl}
            controls
            autoPlay
            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.viewUrl}
            alt={file.filename}
            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
          />
        )}
      </div>

      {/* next */}
      {index < files.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/30 rounded-full p-2 transition z-10"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
          aria-label="Kitas"
        >
          <ChevronIcon dir="right" />
        </button>
      )}

      {/* close */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 rounded-full p-2 transition"
        onClick={onClose}
        aria-label="Uždaryti"
      >
        <CloseIcon />
      </button>

      {/* caption */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm px-4">
        <span className="font-medium">{file.filename}</span>
        {file.uploader && file.uploader !== 'Svečias' && (
          <span> · Įkėlė: {file.uploader}</span>
        )}
        <span> · {formatDate(file.uploadedAt)}</span>
        <span className="ml-2 text-white/40 text-xs">({index + 1}/{files.length})</span>
      </div>
    </div>
  );
}

// ─── File card ───────────────────────────────────────────────────────────────
function FileCard({
  file,
  onOpen,
  onDelete,
}: {
  file: FileItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isVideo = file.contentType.startsWith('video/');

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-gold-light/50 shadow hover:shadow-lg transition-all duration-300">
      {/* thumbnail / preview */}
      <div
        className="relative aspect-square cursor-pointer overflow-hidden bg-ivory-dark"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
        aria-label={`Atidaryti: ${file.filename}`}
      >
        {isVideo ? (
          <video
            src={file.viewUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.viewUrl}
            alt={file.filename}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        {/* overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
            {isVideo ? <VideoIcon /> : <PhotoIcon />}
          </div>
        </div>
        {/* video badge */}
        {isVideo && (
          <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <VideoIcon /> Vaizdo įrašas
          </span>
        )}
      </div>

      {/* info */}
      <div className="p-3">
        <p className="font-sans text-sm text-wedding-brown font-medium truncate" title={file.filename}>
          {file.filename}
        </p>
        <p className="font-sans text-xs text-wedding-brown-light mt-0.5">
          {file.uploader && file.uploader !== 'Svečias' ? file.uploader : 'Svečias'} · {formatBytes(file.size)}
        </p>
        <p className="font-sans text-xs text-wedding-brown-light/70 mt-0.5">
          {formatDate(file.uploadedAt)}
        </p>

        {/* actions */}
        <div className="flex gap-2 mt-3">
          <a
            href={file.viewUrl}
            download={file.filename}
            className="flex items-center gap-1 text-xs font-sans font-semibold text-gold-dark border border-gold-light rounded-lg px-2.5 py-1.5 hover:bg-gold-light transition-colors"
            title="Atsisiųsti"
          >
            <DownloadIcon /> Atsisiųsti
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 text-xs font-sans font-semibold text-red-500 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
            title="Ištrinti"
          >
            <TrashIcon /> Ištrinti
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Prisijungti nepavyko');
      }
    } catch {
      setError('Tinklo klaida. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display italic text-gold text-lg tracking-widest mb-2">Administratoriaus</p>
          <h1 className="font-serif text-4xl text-wedding-brown">Prisijungimas</h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mt-4"/>
        </div>

        <form onSubmit={handleSubmit} className="card-elegant p-8">
          <label className="block font-sans text-sm font-bold text-gold-dark mb-2 tracking-wide uppercase">
            Slaptažodis
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-gold mb-5"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={loading}
          />
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="font-sans text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Jungiamasi...' : 'Prisijungti'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Admin dashboard ──────────────────────────────────────────────────────────
type Filter = 'all' | 'images' | 'videos';
const PAGE_SIZE = 48;

function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async (f: Filter, p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/files?filter=${f}&page=${p}`);
      if (res.status === 401) { window.location.reload(); return; }
      if (!res.ok) throw new Error('Nepavyko gauti failų');
      const data = await res.json();
      setFiles(data.files);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Klaida');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(filter, page); }, [filter, page, fetchFiles]);

  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  const handleDelete = async (file: FileItem) => {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: file.uuid }),
      });
      if (!res.ok) throw new Error('Nepavyko ištrinti');
      setDeleteConfirm(null);
      // Close lightbox if we just deleted the viewed file
      if (lightboxIdx !== null && files[lightboxIdx]?.uuid === file.uuid) {
        setLightboxIdx(null);
      }
      fetchFiles(filter, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Klaida trinant');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const photoCount = filter === 'all' ? undefined : undefined;

  return (
    <div className="min-h-screen bg-ivory">
      {/* header */}
      <header className="bg-white border-b border-gold-light/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl text-wedding-brown">Vestuvių galerija</span>
            <span className="text-gold-light">·</span>
            <span className="font-sans text-sm text-wedding-brown-light">Administratoriaus panelė</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-outline-gold text-sm px-4 py-2"
          >
            Atsijungti
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Iš viso failų', value: total },
            {
              label: 'Iš viso dydis',
              value: files.length > 0 ? formatBytes(totalSize(files)) : '—',
            },
            {
              label: 'Nuotraukos',
              value: files.filter((f) => f.contentType.startsWith('image/')).length,
            },
            {
              label: 'Vaizdo įrašai',
              value: files.filter((f) => f.contentType.startsWith('video/')).length,
            },
          ].map(({ label, value }) => (
            <div key={label} className="card-elegant p-5 text-center">
              <p className="font-sans text-xs text-wedding-brown-light uppercase tracking-widest mb-1">{label}</p>
              <p className="font-serif text-2xl text-wedding-brown">{value}</p>
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(['all', 'images', 'videos'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`font-sans text-sm font-semibold px-5 py-2 rounded-full border transition-all ${
                filter === f
                  ? 'bg-gold text-wedding-brown border-gold'
                  : 'bg-transparent text-wedding-brown-light border-gold-light hover:border-gold hover:text-wedding-brown'
              }`}
            >
              {f === 'all' ? 'Visi' : f === 'images' ? 'Nuotraukos' : 'Vaizdo įrašai'}
            </button>
          ))}
          <button
            onClick={() => fetchFiles(filter, page)}
            className="ml-auto font-sans text-sm text-gold-dark flex items-center gap-1 hover:text-wedding-brown transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden>
              <path d="M4 10a6 6 0 1110.928-3M4 10V6M4 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Atnaujinti
          </button>
        </div>

        {/* content */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <svg className="animate-spin w-8 h-8 text-gold" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
            <p className="font-sans text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-wedding-brown-light">
              Failų dar nėra
            </p>
            <p className="font-sans text-sm text-wedding-brown-light/60 mt-2">
              Kai svečiai įkels nuotraukas, jos atsiras čia.
            </p>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className="admin-grid">
            {files.map((file, idx) => (
              <FileCard
                key={file.uuid}
                file={file}
                onOpen={() => setLightboxIdx(idx)}
                onDelete={() => setDeleteConfirm(file)}
              />
            ))}
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-full border border-gold-light font-sans text-sm text-wedding-brown disabled:opacity-40 hover:border-gold transition-colors"
            >
              ← Ankstesnis
            </button>
            <span className="font-sans text-sm text-wedding-brown-light px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-full border border-gold-light font-sans text-sm text-wedding-brown disabled:opacity-40 hover:border-gold transition-colors"
            >
              Kitas →
            </button>
          </div>
        )}
      </div>

      {/* lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          files={files}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}

      {/* delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="card-elegant p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-2xl text-wedding-brown mb-3">Ištrinti failą?</h3>
            <p className="font-sans text-sm text-wedding-brown-light mb-1 break-all">
              {deleteConfirm.filename}
            </p>
            <p className="font-sans text-sm text-red-600 mb-6">
              Šis veiksmas negrįžtamas. Failas bus ištrintas visam laikui.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 btn-outline-gold disabled:opacity-50"
              >
                Atšaukti
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white font-sans font-bold px-4 py-2.5 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Trinama...' : 'Ištrinti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Check if already logged in via cookie
  useEffect(() => {
    fetch('/api/admin/files?page=1&filter=all')
      .then((r) => {
        setAuthed(r.status !== 401);
      })
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-gold" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
    );
  }

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}
