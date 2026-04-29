'use client';

import { useCallback, useRef, useState } from 'react';

const BRIDE = process.env.NEXT_PUBLIC_BRIDE_NAME ?? 'Mia';
const GROOM = process.env.NEXT_PUBLIC_GROOM_NAME ?? 'Jonas';
const DATE  = process.env.NEXT_PUBLIC_WEDDING_DATE ?? '2024 m. rugsėjo 14 d.';

const ALLOWED_TYPES = new Set([
  'image/jpeg','image/jpg','image/png','image/gif','image/webp',
  'image/heic','image/heif','image/tiff','image/bmp',
  'video/mp4','video/quicktime','video/x-msvideo','video/x-matroska',
  'video/webm','video/mpeg','video/3gpp','video/3gpp2','video/ogg',
]);
const MAX_SIZE = 5 * 1024 ** 3;

interface FileEntry {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

function formatBytes(b: number) {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3)   return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

async function xhrPut(url: string, file: File, contentType: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Tinklo klaida'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

export default function HomePage() {
  const [files,       setFiles]       = useState<FileEntry[]>([]);
  const [uploader,    setUploader]    = useState('');
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [done,        setDone]        = useState(false);
  const [globalError, setGlobalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const valid: FileEntry[] = [];
    for (const file of incoming) {
      const type = file.type || 'application/octet-stream';
      if (!ALLOWED_TYPES.has(type)) { setGlobalError(`"${file.name}" — tik nuotraukos ir vaizdo įrašai.`); return; }
      if (file.size > MAX_SIZE)     { setGlobalError(`"${file.name}" — per didelis (maks. 5 GB).`);        return; }
      valid.push({ id: crypto.randomUUID(), file, status: 'pending', progress: 0 });
    }
    setGlobalError('');
    setDone(false);
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile  = (id: string) => setFiles((p) => p.filter((f) => f.id !== id));
  const updateFile  = (id: string, patch: Partial<FileEntry>) =>
    setFiles((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (!pending.length) return;
    setUploading(true); setGlobalError(''); setDone(false);
    let allOk = true;

    for (const entry of pending) {
      updateFile(entry.id, { status: 'uploading', progress: 0 });
      try {
        const pr = await fetch('/api/presign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: entry.file.name, contentType: entry.file.type || 'application/octet-stream', size: entry.file.size }),
        });
        if (!pr.ok) { const e = await pr.json().catch(() => ({})); throw new Error(e.error ?? 'Nepavyko gauti URL'); }
        const { uploadUrl, key, uuid } = await pr.json();
        await xhrPut(uploadUrl, entry.file, entry.file.type || 'application/octet-stream', (p) => updateFile(entry.id, { progress: p }));
        const cr = await fetch('/api/confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid, key, filename: entry.file.name, uploader: uploader.trim() || 'Svečias', contentType: entry.file.type || 'application/octet-stream', size: entry.file.size }),
        });
        if (!cr.ok) throw new Error('Nepavyko išsaugoti');
        updateFile(entry.id, { status: 'done', progress: 100 });
      } catch (err) {
        updateFile(entry.id, { status: 'error', error: err instanceof Error ? err.message : 'Klaida' });
        allOk = false;
      }
    }
    setUploading(false);
    if (allOk) setDone(true);
  };

  const resetAll = () => { setFiles([]); setDone(false); setGlobalError(''); };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount    = files.filter((f) => f.status === 'done').length;
  const errorCount   = files.filter((f) => f.status === 'error').length;

  return (
    <main className="grain min-h-screen" style={{ background: '#F5F0EB' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(196,112,80,0.08) 0%, transparent 70%)',
        }} />

        <div className="relative z-10 flex flex-col items-center">
          {/* Bride */}
          <h1
            className="font-serif anim-up"
            style={{
              fontSize: 'clamp(4rem, 18vw, 9rem)',
              lineHeight: 1,
              color: '#3D2E28',
              fontWeight: 400,
              animationDelay: '0.05s',
            }}
          >
            {BRIDE}
          </h1>

          {/* Ampersand — Georgia so it looks like a proper & */}
          <p
            className="anim-scale"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(2rem, 8vw, 4.5rem)',
              color: '#C47050',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1,
              margin: '0.25em 0',
              animationDelay: '0.25s',
            }}
          >
            &amp;
          </p>

          {/* Groom */}
          <h1
            className="font-serif anim-up"
            style={{
              fontSize: 'clamp(4rem, 18vw, 9rem)',
              lineHeight: 1,
              color: '#3D2E28',
              fontWeight: 400,
              animationDelay: '0.15s',
            }}
          >
            {GROOM}
          </h1>

          {/* thin line */}
          <div
            className="anim-fade"
            style={{
              width: 40, height: 1, background: '#C47050', margin: '2rem auto 1.5rem',
              animationDelay: '0.55s',
            }}
          />

          {/* Date */}
          <p
            className="anim-fade"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 300,
              fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: '#8C7468',
              animationDelay: '0.7s',
            }}
          >
            {DATE}
          </p>

          {/* Scroll cue */}
          <button
            onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
            className="anim-fade animate-float"
            style={{
              marginTop: '3.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#B89088', animationDelay: '1s',
            }}
            aria-label="Slinkti žemyn"
          >
            <span style={{ fontFamily: 'Inter', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Įkelti nuotraukas
            </span>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: 18, height: 18 }} aria-hidden>
              <path d="M10 4v12M10 16l-4-4M10 16l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ══ UPLOAD ════════════════════════════════════════════════════════════ */}
      <section id="upload" style={{ background: '#EDE6DC', padding: '5rem 1rem' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* heading */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', color: '#3D2E28', fontWeight: 400, marginBottom: '0.75rem' }}>
              Dalinkitės nuotraukomis
            </h2>
            <p style={{ fontFamily: 'Inter', fontSize: '0.875rem', color: '#8C7468', lineHeight: 1.6 }}>
              Įkelkite nuotraukas ir vaizdo įrašus iš šios ypatingos dienos.
            </p>
          </div>

          {/* card */}
          <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 4px 32px rgba(61,46,40,0.08)' }}>
            {done ? (
              /* ── success ── */
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(120,128,96,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 28, height: 28 }} aria-hidden>
                    <path d="M5 13l4 4L19 7" stroke="#788060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.75rem', color: '#3D2E28', fontWeight: 400, marginBottom: '0.5rem' }}>
                  Ačiū!
                </h3>
                <p style={{ fontFamily: 'Inter', fontSize: '0.875rem', color: '#8C7468', marginBottom: '2rem' }}>
                  {doneCount === 1 ? 'Failas sėkmingai įkeltas.' : `${doneCount} failai sėkmingai įkelti.`}
                </p>
                <button onClick={resetAll} className="btn-outline">Įkelti daugiau</button>
              </div>
            ) : (
              <>
                {/* name */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontFamily: 'Inter', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C7468', display: 'block', marginBottom: '0.5rem' }}>
                    Jūsų vardas <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(neprivaloma)</span>
                  </label>
                  <input
                    type="text"
                    value={uploader}
                    onChange={(e) => setUploader(e.target.value)}
                    placeholder="Pvz., Ona ir Tomas"
                    className="input-field"
                    maxLength={100}
                    disabled={uploading}
                  />
                </div>

                {/* drop zone */}
                <div
                  className={`drop-zone ${dragging ? 'drag-over' : ''}`}
                  style={{ padding: '2.5rem 1rem', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', marginBottom: '1.25rem' }}
                  onClick={() => !uploading && inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  role="button"
                  tabIndex={0}
                  aria-label="Įkėlimo zona"
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                >
                  {/* upload icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: '1.5px solid #C47050',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }} aria-hidden>
                      <path d="M12 15V5M12 5L8 9M12 5l4 4" stroke="#C47050" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="#C47050" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', color: '#3D2E28', marginBottom: '0.25rem' }}>
                    {dragging ? 'Paleiskite čia' : 'Paspauskite arba nuvilkite failus'}
                  </p>
                  <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#B8B0A8' }}>
                    Nuotraukos ir vaizdo įrašai · iki 5 GB
                  </p>
                  <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={onInputChange} />
                </div>

                {/* file list */}
                {files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {files.map((entry) => (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.75rem', borderRadius: '0.75rem',
                        background: '#F5F0EB', border: '1px solid rgba(139,116,104,0.1)',
                      }}>
                        {/* icon */}
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                          background: 'rgba(196,112,80,0.10)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg viewBox="0 0 20 20" fill="none" style={{ width: 14, height: 14 }} aria-hidden>
                            {entry.file.type.startsWith('video/') ? (
                              <path d="M4 4h8l4 4v8H4V4zm8 0v4h4M13 11l-4 2.5V8.5L13 11z" stroke="#C47050" strokeWidth="1.2" strokeLinejoin="round" />
                            ) : (
                              <path d="M4 3h8l4 4v10H4V3zm8 0v4h4" stroke="#C47050" strokeWidth="1.2" strokeLinecap="round" />
                            )}
                          </svg>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: '#3D2E28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.file.name}
                            </p>
                            <span style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#B8B0A8', flexShrink: 0 }}>
                              {formatBytes(entry.file.size)}
                            </span>
                          </div>
                          {entry.status === 'uploading' && (
                            <div style={{ marginTop: 6 }}>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${entry.progress}%` }} />
                              </div>
                              <p style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#C47050', marginTop: 3 }}>{entry.progress}%</p>
                            </div>
                          )}
                          {entry.status === 'done' && (
                            <p style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#788060', marginTop: 4 }}>Įkelta ✓</p>
                          )}
                          {entry.status === 'error' && (
                            <p style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#c0392b', marginTop: 4 }}>{entry.error}</p>
                          )}
                        </div>

                        {entry.status === 'pending' && !uploading && (
                          <button onClick={() => removeFile(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B8B0A8', flexShrink: 0 }} aria-label="Pašalinti">
                            <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }} aria-hidden>
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* errors */}
                {globalError && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: '#c0392b' }}>{globalError}</p>
                  </div>
                )}
                {errorCount > 0 && !uploading && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: '#92400e' }}>
                      {errorCount} {errorCount === 1 ? 'failas' : 'failai'} neįkelti. Bandykite dar kartą.
                    </p>
                  </div>
                )}

                {/* upload button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingCount === 0}
                  className="btn-primary"
                  style={{ width: '100%', textAlign: 'center', opacity: uploading || pendingCount === 0 ? 0.4 : 1 }}
                >
                  {uploading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }} aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
                      </svg>
                      Įkeliama...
                    </span>
                  ) : (
                    <>Įkelti{pendingCount > 0 && <span style={{ opacity: 0.7, marginLeft: 6 }}>({pendingCount})</span>}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#F5F0EB', padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ width: 32, height: 1, background: '#C47050', margin: '0 auto 1.5rem', opacity: 0.5 }} />
        <p className="font-serif" style={{ fontSize: '1.1rem', color: '#8C7468', fontWeight: 400, fontStyle: 'italic' }}>
          {BRIDE} &amp; {GROOM}
        </p>
        <p style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#B8B0A8', marginTop: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {DATE}
        </p>
      </footer>
    </main>
  );
}
