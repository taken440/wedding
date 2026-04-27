'use client';

import { useCallback, useRef, useState } from 'react';

const BRIDE = process.env.NEXT_PUBLIC_BRIDE_NAME ?? 'Mia';
const GROOM = process.env.NEXT_PUBLIC_GROOM_NAME ?? 'Jonas';
const DATE = process.env.NEXT_PUBLIC_WEDDING_DATE ?? '2024 m. rugsėjo 14 d.';

const ALLOWED_TYPES = new Set([
  'image/jpeg','image/jpg','image/png','image/gif','image/webp',
  'image/heic','image/heif','image/tiff','image/bmp',
  'video/mp4','video/quicktime','video/x-msvideo','video/x-matroska',
  'video/webm','video/mpeg','video/3gpp','video/3gpp2','video/ogg',
]);
const MAX_SIZE = 5 * 1024 ** 3; // 5 GB

interface FileEntry {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

// ─── SVG decorations ────────────────────────────────────────────────────────
function FloralLeft() {
  return (
    <svg viewBox="0 0 120 300" fill="none" className="w-24 md:w-36 opacity-40" aria-hidden>
      <path d="M60 280 C60 280 20 220 30 160 C40 100 60 80 60 40" stroke="#C9A87C" strokeWidth="2" strokeLinecap="round"/>
      <path d="M60 200 C60 200 20 180 10 150 C0 120 20 100 40 120" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 240 C60 240 90 220 100 190 C110 160 90 140 70 160" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 160 C60 160 30 140 25 110 C20 80 40 65 55 85" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 120 C60 120 85 100 90 70 C95 40 75 25 62 45" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="60" cy="40" r="5" fill="#C9A87C" opacity="0.7"/>
      <circle cx="10" cy="150" r="3" fill="#D4A5A5" opacity="0.6"/>
      <circle cx="100" cy="190" r="3" fill="#D4A5A5" opacity="0.6"/>
      <circle cx="25" cy="110" r="3" fill="#C9A87C" opacity="0.5"/>
      <circle cx="90" cy="70" r="3" fill="#C9A87C" opacity="0.5"/>
    </svg>
  );
}

function FloralRight() {
  return (
    <svg viewBox="0 0 120 300" fill="none" className="w-24 md:w-36 opacity-40 scale-x-[-1]" aria-hidden>
      <path d="M60 280 C60 280 20 220 30 160 C40 100 60 80 60 40" stroke="#C9A87C" strokeWidth="2" strokeLinecap="round"/>
      <path d="M60 200 C60 200 20 180 10 150 C0 120 20 100 40 120" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 240 C60 240 90 220 100 190 C110 160 90 140 70 160" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 160 C60 160 30 140 25 110 C20 80 40 65 55 85" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 120 C60 120 85 100 90 70 C95 40 75 25 62 45" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="60" cy="40" r="5" fill="#C9A87C" opacity="0.7"/>
      <circle cx="10" cy="150" r="3" fill="#D4A5A5" opacity="0.6"/>
      <circle cx="100" cy="190" r="3" fill="#D4A5A5" opacity="0.6"/>
      <circle cx="25" cy="110" r="3" fill="#C9A87C" opacity="0.5"/>
      <circle cx="90" cy="70" r="3" fill="#C9A87C" opacity="0.5"/>
    </svg>
  );
}

function Ornament() {
  return (
    <svg viewBox="0 0 200 40" fill="none" className="w-48 mx-auto" aria-hidden>
      <line x1="0" y1="20" x2="70" y2="20" stroke="#C9A87C" strokeWidth="1"/>
      <path d="M80 20 C85 10 95 5 100 20 C105 5 115 10 120 20" stroke="#C9A87C" strokeWidth="1.5" fill="none"/>
      <circle cx="100" cy="20" r="3" fill="#C9A87C"/>
      <line x1="130" y1="20" x2="200" y2="20" stroke="#C9A87C" strokeWidth="1"/>
      <circle cx="0" cy="20" r="2" fill="#D4A5A5"/>
      <circle cx="200" cy="20" r="2" fill="#D4A5A5"/>
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden>
      <circle cx="24" cy="24" r="23" stroke="#C9A87C" strokeWidth="1.5" strokeDasharray="4 2"/>
      <path d="M24 32V20M24 20L19 25M24 20L29 25" stroke="#C9A87C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 34h16" stroke="#C9A87C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function FileIcon({ type }: { type: string }) {
  const isVideo = type.startsWith('video/');
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0" aria-hidden>
      {isVideo ? (
        <>
          <rect x="1" y="3" width="18" height="14" rx="2" stroke="#8B6914" strokeWidth="1.5"/>
          <path d="M13 10L8 7v6l5-3z" fill="#8B6914"/>
        </>
      ) : (
        <>
          <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#8B6914" strokeWidth="1.5"/>
          <path d="M12 2v4h4" stroke="#8B6914" strokeWidth="1.5" strokeLinejoin="round"/>
          <circle cx="8" cy="12" r="2" stroke="#C9A87C" strokeWidth="1.2"/>
          <path d="M12 14l2 2" stroke="#C9A87C" strokeWidth="1.2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

// ─── Upload XHR with progress ────────────────────────────────────────────────
async function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Tinklo klaida'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploader, setUploader] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const valid: FileEntry[] = [];
    for (const file of incoming) {
      const type = file.type || 'application/octet-stream';
      if (!ALLOWED_TYPES.has(type)) {
        setGlobalError(
          `"${file.name}" — netinkamas failo tipas. Leidžiamos tik nuotraukos ir vaizdo įrašai.`,
        );
        return;
      }
      if (file.size > MAX_SIZE) {
        setGlobalError(`"${file.name}" — failas per didelis (maks. 5 GB).`);
        return;
      }
      valid.push({ id: crypto.randomUUID(), file, status: 'pending', progress: 0 });
    }
    setGlobalError('');
    setDone(false);
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dt = e.dataTransfer;
      addFiles(Array.from(dt.files));
    },
    [addFiles],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const updateFile = (id: string, patch: Partial<FileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (!pending.length) return;

    setUploading(true);
    setGlobalError('');
    setDone(false);

    let allOk = true;

    for (const entry of pending) {
      updateFile(entry.id, { status: 'uploading', progress: 0 });
      try {
        // 1. Get presigned URL
        const presignRes = await fetch('/api/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: entry.file.name,
            contentType: entry.file.type || 'application/octet-stream',
            size: entry.file.size,
          }),
        });
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          throw new Error(err.error ?? 'Nepavyko gauti įkėlimo URL');
        }
        const { uploadUrl, key, uuid } = await presignRes.json();

        // 2. Upload directly to R2
        await xhrPut(uploadUrl, entry.file, entry.file.type || 'application/octet-stream', (p) =>
          updateFile(entry.id, { progress: p }),
        );

        // 3. Confirm & save metadata
        const confirmRes = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uuid,
            key,
            filename: entry.file.name,
            uploader: uploader.trim() || 'Svečias',
            contentType: entry.file.type || 'application/octet-stream',
            size: entry.file.size,
          }),
        });
        if (!confirmRes.ok) throw new Error('Nepavyko išsaugoti');

        updateFile(entry.id, { status: 'done', progress: 100 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Nežinoma klaida';
        updateFile(entry.id, { status: 'error', error: msg });
        allOk = false;
      }
    }

    setUploading(false);
    if (allOk) setDone(true);
  };

  const resetAll = () => {
    setFiles([]);
    setDone(false);
    setGlobalError('');
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <main className="min-h-screen hero-bg">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center overflow-hidden">
        {/* top corner botanicals */}
        <div className="absolute top-0 left-0 pointer-events-none">
          <FloralLeft />
        </div>
        <div className="absolute top-0 right-0 pointer-events-none">
          <FloralRight />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <p className="font-display text-gold text-lg md:text-xl tracking-[0.3em] uppercase mb-4">
            Sveikiname
          </p>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h1 className="font-serif text-6xl md:text-8xl text-wedding-brown leading-none mb-2">
            {BRIDE}
          </h1>
          <p className="font-display italic text-gold text-3xl md:text-4xl my-2">&amp;</p>
          <h1 className="font-serif text-6xl md:text-8xl text-wedding-brown leading-none mb-8">
            {GROOM}
          </h1>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <Ornament />
          <p className="font-display text-wedding-brown-light text-xl md:text-2xl mt-6 tracking-widest">
            {DATE}
          </p>
        </div>

        {/* scroll cue */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float cursor-pointer"
          onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Slinkti žemyn"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-gold" aria-hidden>
            <path d="M12 5v14M12 19l-5-5M12 19l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── UPLOAD SECTION ───────────────────────────────────────── */}
      <section id="upload" className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* heading */}
          <div className="text-center mb-12 animate-slide-up">
            <p className="font-display italic text-gold text-xl tracking-wide mb-2">
              Jūsų prisiminimai mums labai brangūs
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-wedding-brown mb-4">
              Dalinkitės nuotraukomis
            </h2>
            <div className="divider-gold max-w-xs mx-auto">
              <HeartIcon className="w-4 h-4 text-rose shrink-0" />
            </div>
            <p className="font-sans text-wedding-brown-light mt-5 leading-relaxed">
              Kviečiame įkelti nuotraukas ir vaizdo įrašus iš šios ypatingos dienos.
              <br className="hidden md:block" />
              Kiekvienas prisiminimas bus mums neįkainojama dovana.
            </p>
          </div>

          {/* card */}
          <div className="card-elegant p-8 md:p-10">
            {done ? (
              /* ── SUCCESS STATE ── */
              <div className="text-center py-8 animate-fade-in">
                <HeartIcon className="w-16 h-16 text-rose mx-auto mb-4 animate-float" />
                <h3 className="font-serif text-3xl text-wedding-brown mb-3">
                  Ačiū iš širdies!
                </h3>
                <p className="font-sans text-wedding-brown-light mb-8 leading-relaxed">
                  {doneCount === 1
                    ? 'Jūsų failas sėkmingai įkeltas.'
                    : `Visi ${doneCount} failai sėkmingai įkelti.`}{' '}
                  <br />
                  Jūsų prisiminimai išsaugoti amžiams.
                </p>
                <button onClick={resetAll} className="btn-outline-gold">
                  Įkelti daugiau
                </button>
              </div>
            ) : (
              <>
                {/* name input */}
                <div className="mb-6">
                  <label className="block font-sans text-sm font-bold text-gold-dark mb-2 tracking-wide uppercase">
                    Jūsų vardas <span className="font-normal text-wedding-brown-light normal-case">(neprivaloma)</span>
                  </label>
                  <input
                    type="text"
                    value={uploader}
                    onChange={(e) => setUploader(e.target.value)}
                    placeholder="Pvz., Ona ir Tomas"
                    className="input-gold"
                    maxLength={100}
                    disabled={uploading}
                  />
                </div>

                {/* drop zone */}
                <div
                  className={`drop-zone p-8 text-center cursor-pointer mb-6 ${dragging ? 'drag-over' : ''}`}
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
                  <div className="flex flex-col items-center gap-3">
                    <UploadIcon />
                    <p className="font-display text-xl text-wedding-brown">
                      {dragging ? 'Paleiskite failus čia' : 'Nuvilkite failus čia'}
                    </p>
                    <p className="font-sans text-sm text-wedding-brown-light">
                      arba <span className="text-gold-dark underline underline-offset-2">spustelėkite norėdami pasirinkti</span>
                    </p>
                    <p className="font-sans text-xs text-wedding-brown-light/70 mt-1">
                      Nuotraukos ir vaizdo įrašai · iki 5 GB vienas failas
                    </p>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={onInputChange}
                  />
                </div>

                {/* file list */}
                {files.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {files.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 rounded-xl bg-ivory border border-gold-light/50"
                      >
                        <FileIcon type={entry.file.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-sans text-sm text-wedding-brown truncate">
                              {entry.file.name}
                            </p>
                            <span className="font-sans text-xs text-wedding-brown-light shrink-0">
                              {formatBytes(entry.file.size)}
                            </span>
                          </div>
                          {entry.status === 'uploading' && (
                            <div className="mt-1.5">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${entry.progress}%` }}
                                />
                              </div>
                              <p className="font-sans text-xs text-gold-dark mt-1">
                                Įkeliama... {entry.progress}%
                              </p>
                            </div>
                          )}
                          {entry.status === 'done' && (
                            <p className="font-sans text-xs text-green-600 mt-1 flex items-center gap-1">
                              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden>
                                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Įkelta sėkmingai
                            </p>
                          )}
                          {entry.status === 'error' && (
                            <p className="font-sans text-xs text-red-600 mt-1">
                              Klaida: {entry.error}
                            </p>
                          )}
                        </div>
                        {entry.status === 'pending' && !uploading && (
                          <button
                            onClick={() => removeFile(entry.id)}
                            className="shrink-0 text-wedding-brown-light hover:text-red-500 transition-colors"
                            aria-label="Pašalinti"
                          >
                            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden>
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* global error */}
                {globalError && (
                  <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="font-sans text-sm text-red-700">{globalError}</p>
                  </div>
                )}

                {/* error files retry hint */}
                {errorCount > 0 && !uploading && (
                  <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="font-sans text-sm text-amber-800">
                      {errorCount} {errorCount === 1 ? 'failas' : 'failai'} neįkelti.
                      Bandykite dar kartą arba patikrinkite interneto ryšį.
                    </p>
                  </div>
                )}

                {/* upload button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingCount === 0}
                  className={`w-full btn-gold text-center ${
                    uploading || pendingCount === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'animate-[pulseGold_2s_ease-in-out_infinite]'
                  }`}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Įkeliama...
                    </span>
                  ) : (
                    <>
                      Įkelti{' '}
                      {pendingCount > 0 && (
                        <span className="ml-1 opacity-80">
                          ({pendingCount} {pendingCount === 1 ? 'failą' : 'failus'})
                        </span>
                      )}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="py-10 text-center border-t border-gold-light/40">
        <Ornament />
        <p className="font-display italic text-wedding-brown-light text-lg mt-4">
          {BRIDE} &amp; {GROOM}
        </p>
        <p className="font-sans text-xs text-wedding-brown-light/60 mt-2">{DATE}</p>
      </footer>
    </main>
  );
}
