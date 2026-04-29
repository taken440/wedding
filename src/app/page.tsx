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
const MAX_SIZE = 5 * 1024 ** 3;

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

// ─── Botanical corner SVG ────────────────────────────────────────────────────
// flipX mirrors left↔right, flipY mirrors top↔bottom
function BotanicalCorner({ flipX, flipY }: { flipX?: boolean; flipY?: boolean }) {
  const tx = flipX ? 'scaleX(-1)' : undefined;
  const ty = flipY ? 'scaleY(-1)' : undefined;
  const transform = [tx, ty].filter(Boolean).join(' ') || undefined;

  return (
    <svg
      viewBox="0 0 190 210"
      fill="none"
      aria-hidden
      style={{ transform }}
      className="w-36 md:w-48 lg:w-56 opacity-90"
    >
      {/* soft wash blobs */}
      <ellipse cx="55" cy="55" rx="85" ry="75" fill="rgba(152,188,150,0.09)" />
      <ellipse cx="30" cy="30" rx="50" ry="45" fill="rgba(152,188,150,0.07)" />

      {/* main branch */}
      <path d="M8 4 C28 22 58 38 78 68 C92 90 88 125 93 160"
        stroke="#C4A478" strokeWidth="1.3" strokeLinecap="round" />

      {/* branch top-right */}
      <path d="M48 36 C78 24 112 16 150 8"
        stroke="#C4A478" strokeWidth="1.0" strokeLinecap="round" />

      {/* branch mid-right */}
      <path d="M76 70 C104 56 136 52 168 48"
        stroke="#C4A478" strokeWidth="0.9" strokeLinecap="round" />

      {/* branch bottom */}
      <path d="M90 130 C72 152 58 172 42 198"
        stroke="#C4A478" strokeWidth="0.8" strokeLinecap="round" />

      {/* ── LEAVES top cluster ── */}
      <ellipse cx="98"  cy="7"  rx="28" ry="17" fill="#8BAE88" opacity="0.62" transform="rotate(-20 98 7)" />
      <ellipse cx="136" cy="4"  rx="22" ry="14" fill="#9EBF9B" opacity="0.56" transform="rotate(-30 136 4)" />
      <ellipse cx="72"  cy="24" rx="24" ry="15" fill="#7BA07A" opacity="0.58" transform="rotate(-5 72 24)" />
      <ellipse cx="162" cy="10" rx="16" ry="10" fill="#8BAE88" opacity="0.46" transform="rotate(-38 162 10)" />

      {/* ── LEAVES mid cluster ── */}
      <ellipse cx="110" cy="50" rx="26" ry="17" fill="#8BAE88" opacity="0.60" transform="rotate(-15 110 50)" />
      <ellipse cx="148" cy="46" rx="21" ry="13" fill="#9EBF9B" opacity="0.52" transform="rotate(-26 148 46)" />
      <ellipse cx="84"  cy="63" rx="23" ry="15" fill="#7BA07A" opacity="0.56" transform="rotate(5 84 63)" />
      <ellipse cx="172" cy="47" rx="14" ry="9"  fill="#8BAE88" opacity="0.42" transform="rotate(-32 172 47)" />

      {/* ── LEAVES left stem ── */}
      <ellipse cx="18"  cy="42" rx="19" ry="12" fill="#8BAE88" opacity="0.52" transform="rotate(55 18 42)" />
      <ellipse cx="8"   cy="72" rx="17" ry="11" fill="#9EBF9B" opacity="0.48" transform="rotate(65 8 72)" />
      <ellipse cx="12"  cy="102" rx="16" ry="10" fill="#7BA07A" opacity="0.44" transform="rotate(70 12 102)" />

      {/* ── LEAVES bottom cluster ── */}
      <ellipse cx="56"  cy="158" rx="22" ry="14" fill="#8BAE88" opacity="0.50" transform="rotate(80 56 158)" />
      <ellipse cx="35"  cy="178" rx="20" ry="12" fill="#9EBF9B" opacity="0.46" transform="rotate(85 35 178)" />
      <ellipse cx="68"  cy="188" rx="17" ry="11" fill="#7BA07A" opacity="0.42" transform="rotate(75 68 188)" />

      {/* ── BERRIES top ── */}
      <g opacity="0.78">
        <circle cx="158" cy="5"  r="4.5" fill="#EDE3C6" />
        <circle cx="167" cy="12" r="3.8" fill="#E2D8BC" />
        <circle cx="151" cy="14" r="3.5" fill="#EDE3C6" />
        <circle cx="175" cy="7"  r="3.0" fill="#E2D8BC" />
      </g>

      {/* ── BERRIES mid ── */}
      <g opacity="0.70">
        <circle cx="170" cy="51" r="4.0" fill="#EDE3C6" />
        <circle cx="178" cy="58" r="3.5" fill="#E2D8BC" />
        <circle cx="162" cy="59" r="3.0" fill="#EDE3C6" />
      </g>

      {/* leaf vein hints */}
      <path d="M85 7 Q98 7 111 7"   stroke="#6E9470" strokeWidth="0.5" opacity="0.35" />
      <path d="M97 50 Q110 50 123 50" stroke="#6E9470" strokeWidth="0.5" opacity="0.35" />
    </svg>
  );
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
        setGlobalError(`"${file.name}" — netinkamas failo tipas. Leidžiamos tik nuotraukos ir vaizdo įrašai.`);
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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

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

        await xhrPut(uploadUrl, entry.file, entry.file.type || 'application/octet-stream', (p) =>
          updateFile(entry.id, { progress: p }),
        );

        const confirmRes = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uuid, key,
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

  const resetAll = () => { setFiles([]); setDone(false); setGlobalError(''); };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount    = files.filter((f) => f.status === 'done').length;
  const errorCount   = files.filter((f) => f.status === 'error').length;

  return (
    <main className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        {/* corners */}
        <div className="absolute top-0 left-0 pointer-events-none select-none">
          <BotanicalCorner />
        </div>
        <div className="absolute top-0 right-0 pointer-events-none select-none">
          <BotanicalCorner flipX />
        </div>
        <div className="absolute bottom-0 left-0 pointer-events-none select-none">
          <BotanicalCorner flipY />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none select-none">
          <BotanicalCorner flipX flipY />
        </div>

        {/* content */}
        <div className="relative z-10">
          <h1 className="font-serif text-6xl md:text-8xl text-wedding-brown leading-none tracking-tight">
            {BRIDE}
          </h1>
          <p className="font-display italic text-3xl md:text-4xl my-4" style={{ color: '#C4A478' }}>
            &amp;
          </p>
          <h1 className="font-serif text-6xl md:text-8xl text-wedding-brown leading-none tracking-tight">
            {GROOM}
          </h1>

          <div className="w-12 h-px mx-auto mt-8 mb-6" style={{ background: '#C4A478' }} />

          <p className="font-display text-wedding-brown-light text-lg md:text-xl tracking-widest">
            {DATE}
          </p>

          <button
            onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-14 flex flex-col items-center gap-2 mx-auto opacity-50 hover:opacity-80 transition-opacity"
            aria-label="Slinkti žemyn"
          >
            <span className="font-sans text-xs tracking-widest uppercase text-wedding-brown">
              Įkelti nuotraukas
            </span>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 animate-float text-wedding-brown" aria-hidden>
              <path d="M12 5v14M12 19l-5-5M12 19l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── UPLOAD ── */}
      <section id="upload" className="py-16 px-4 bg-white">
        <div className="max-w-lg mx-auto">

          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl text-wedding-brown mb-3">
              Dalinkitės nuotraukomis
            </h2>
            <p className="font-sans text-sm text-wedding-brown-light leading-relaxed">
              Įkelkite nuotraukas ir vaizdo įrašus iš šios ypatingos dienos.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8">
            {done ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(139,174,136,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" aria-hidden>
                    <path d="M5 13l4 4L19 7" stroke="#8BAE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl text-wedding-brown mb-2">Ačiū!</h3>
                <p className="font-sans text-sm text-wedding-brown-light mb-8">
                  {doneCount === 1 ? 'Failas sėkmingai įkeltas.' : `${doneCount} failai sėkmingai įkelti.`}
                </p>
                <button onClick={resetAll} className="btn-outline-gold text-sm">
                  Įkelti daugiau
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <label className="block font-sans text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#C4A478' }}>
                    Jūsų vardas{' '}
                    <span className="font-normal text-wedding-brown-light normal-case">(neprivaloma)</span>
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

                <div
                  className={`drop-zone p-8 text-center cursor-pointer mb-5 ${dragging ? 'drag-over' : ''}`}
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
                    <div className="w-12 h-12 rounded-full border flex items-center justify-center"
                      style={{ borderColor: '#C4A478' }}>
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                        <path d="M12 16V8M12 8L8 12M12 8l4 4" stroke="#C4A478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 16.5A4.5 4.5 0 0016 12H15a7 7 0 10-13 3" stroke="#C4A478" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="font-sans text-sm text-wedding-brown">
                      {dragging ? 'Paleiskite čia' : 'Paspauskite arba nuvilkite failus'}
                    </p>
                    <p className="font-sans text-xs text-wedding-brown-light/60">
                      Nuotraukos ir vaizdo įrašai · iki 5 GB
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

                {files.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {files.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: 'rgba(196,164,120,0.12)' }}>
                          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" style={{ color: '#C4A478' }} aria-hidden>
                            {entry.file.type.startsWith('video/') ? (
                              <path d="M4 4h8l4 4v8H4V4zm8 0v4h4M13 11l-4 2.5V8.5L13 11z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                            ) : (
                              <path d="M4 3h8l4 4v10H4V3zm8 0v4h4M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-sans text-xs text-wedding-brown truncate">{entry.file.name}</p>
                            <span className="font-sans text-xs text-wedding-brown-light/50 shrink-0">{formatBytes(entry.file.size)}</span>
                          </div>
                          {entry.status === 'uploading' && (
                            <div className="mt-1.5">
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${entry.progress}%` }} />
                              </div>
                              <p className="font-sans text-xs mt-1" style={{ color: '#C4A478' }}>{entry.progress}%</p>
                            </div>
                          )}
                          {entry.status === 'done' && (
                            <p className="font-sans text-xs text-green-600 mt-1">Įkelta ✓</p>
                          )}
                          {entry.status === 'error' && (
                            <p className="font-sans text-xs text-red-500 mt-1">{entry.error}</p>
                          )}
                        </div>
                        {entry.status === 'pending' && !uploading && (
                          <button
                            onClick={() => removeFile(entry.id)}
                            className="shrink-0 text-stone-300 hover:text-red-400 transition-colors"
                            aria-label="Pašalinti"
                          >
                            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden>
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {globalError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100">
                    <p className="font-sans text-xs text-red-600">{globalError}</p>
                  </div>
                )}

                {errorCount > 0 && !uploading && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="font-sans text-xs text-amber-700">
                      {errorCount} {errorCount === 1 ? 'failas' : 'failai'} neįkelti. Bandykite dar kartą.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingCount === 0}
                  className={`w-full btn-gold text-center ${uploading || pendingCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Įkeliama...
                    </span>
                  ) : (
                    <>Įkelti{pendingCount > 0 && <span className="ml-1 opacity-70">({pendingCount})</span>}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative py-12 text-center overflow-hidden bg-white">
        <div className="absolute bottom-0 left-0 pointer-events-none select-none opacity-60">
          <BotanicalCorner flipY />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none select-none opacity-60">
          <BotanicalCorner flipX flipY />
        </div>
        <div className="relative z-10">
          <div className="w-12 h-px mx-auto mb-5" style={{ background: '#C4A478' }} />
          <p className="font-display italic text-wedding-brown-light text-lg">{BRIDE} &amp; {GROOM}</p>
          <p className="font-sans text-xs text-wedding-brown-light/40 mt-2">{DATE}</p>
        </div>
      </footer>
    </main>
  );
}
