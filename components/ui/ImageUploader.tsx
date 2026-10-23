'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type UploadedImage = { id: string; token: string };

type Entry = {
  key: string;
  preview: string;
  name: string;
  progress: number;
  status: 'processing' | 'uploading' | 'ready' | 'removing';
  image?: UploadedImage;
  error?: string;
};

type ImageUploaderProps = {
  initialImages?: UploadedImage[];
  onChange?: (images: UploadedImage[]) => void;
  onPendingChange?: (pending: boolean) => void;
};

function downscale(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('This photo could not be prepared.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This photo could not be prepared.')), 'image/webp', 0.82);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Choose a valid JPEG, PNG or WebP photo.'));
    };
    image.src = sourceUrl;
  });
}

function request<T>(method: 'POST' | 'DELETE', url: string, body?: FormData, token?: string, onProgress?: (value: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (token) xhr.setRequestHeader('x-upload-token', token);
    if (onProgress) xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.onload = () => {
      let result: { ok?: boolean; id?: unknown; token?: unknown; error?: { message?: unknown } } | null;
      try { result = JSON.parse(xhr.responseText) as typeof result; }
      catch { return reject(new Error('Upload failed. Try again.')); }
      if (!result || typeof result !== 'object') return reject(new Error('Upload failed. Try again.'));
      if (xhr.status < 200 || xhr.status >= 300 || !result.ok) {
        return reject(new Error(typeof result.error?.message === 'string' ? result.error.message : 'Upload failed. Try again.'));
      }
      if (method === 'POST' && (typeof result.id !== 'string' || typeof result.token !== 'string')) return reject(new Error('Upload failed. Try again.'));
      resolve(result as T);
    };
    xhr.send(body ?? null);
  });
}

export function ImageUploader({ initialImages = [], onChange, onPendingChange }: ImageUploaderProps) {
  const inputId = useId();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectionError, setSelectionError] = useState('');
  const entriesRef = useRef(entries);
  const removeRequested = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    if (initialImages.length && entriesRef.current.length === 0) {
      setEntries(initialImages.map((image) => ({ key: image.id, preview: '', name: 'Saved reference photo', progress: 100, status: 'ready', image })));
    }
  }, [initialImages]);

  useEffect(() => {
    entriesRef.current = entries;
    onChange?.(entries.flatMap((entry) => entry.image ? [entry.image] : []));
    onPendingChange?.(entries.some((entry) => entry.status !== 'ready'));
  }, [entries, onChange, onPendingChange]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      entriesRef.current.forEach((entry) => URL.revokeObjectURL(entry.preview));
    };
  }, []);

  const update = (key: string, change: Partial<Entry>) => setEntries((current) => current.map((entry) => entry.key === key ? { ...entry, ...change } : entry));

  const upload = async (entry: Entry, file: File) => {
    let currentPreview = entry.preview;
    let uploadedImage: UploadedImage | undefined;
    try {
      const blob = await downscale(file);
      const preview = URL.createObjectURL(blob);
      currentPreview = preview;
      URL.revokeObjectURL(entry.preview);
      if (!mounted.current) {
        URL.revokeObjectURL(preview);
        return;
      }
      update(entry.key, { preview, status: 'uploading' });
      if (removeRequested.current.has(entry.key)) {
        URL.revokeObjectURL(preview);
        setEntries((current) => current.filter((item) => item.key !== entry.key));
        removeRequested.current.delete(entry.key);
        return;
      }
      const body = new FormData();
      body.append('image', blob, 'design.webp');
      const result = await request<{ id: string; token: string }>('POST', '/api/uploads', body, undefined, (progress) => update(entry.key, { progress }));
      uploadedImage = { id: result.id, token: result.token };
      if (!mounted.current) {
        await request('DELETE', `/api/uploads/${result.id}`, undefined, result.token);
        URL.revokeObjectURL(preview);
        return;
      }
      if (removeRequested.current.has(entry.key)) {
        await request('DELETE', `/api/uploads/${result.id}`, undefined, result.token);
        URL.revokeObjectURL(preview);
        setEntries((current) => current.filter((item) => item.key !== entry.key));
        removeRequested.current.delete(entry.key);
        return;
      }
      update(entry.key, { image: { id: result.id, token: result.token }, status: 'ready', progress: 100 });
    } catch (error) {
      if (!mounted.current) {
        URL.revokeObjectURL(currentPreview);
        return;
      }
      if (removeRequested.current.has(entry.key)) {
        removeRequested.current.delete(entry.key);
        if (uploadedImage) {
          update(entry.key, { status: 'ready', image: uploadedImage, error: 'Could not remove this photo. Try again.' });
        } else {
          URL.revokeObjectURL(currentPreview);
          setEntries((current) => current.filter((item) => item.key !== entry.key));
        }
      } else {
        update(entry.key, { status: 'ready', error: error instanceof Error ? error.message : 'Upload failed. Try again.' });
      }
    }
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setSelectionError('');
    const available = Math.max(0, 3 - entries.length);
    const selected = Array.from(files).slice(0, available);
    if (files.length > available) setSelectionError('You can add up to 3 photos.');
    const next = selected.map((file) => {
      const key = crypto.randomUUID();
      const entry: Entry = { key, preview: URL.createObjectURL(file), name: file.name, progress: 0, status: 'processing' };
      void upload(entry, file);
      return entry;
    });
    setEntries((current) => [...current, ...next]);
  };

  const remove = async (entry: Entry) => {
    if (!entry.image) {
      if (entry.status === 'processing' || entry.status === 'uploading') {
        removeRequested.current.add(entry.key);
        update(entry.key, { status: 'removing' });
        return;
      }
      setEntries((current) => current.filter((item) => item.key !== entry.key));
      URL.revokeObjectURL(entry.preview);
      return;
    }
    update(entry.key, { status: 'removing', error: undefined });
    try {
      await request('DELETE', `/api/uploads/${entry.image.id}`, undefined, entry.image.token);
      URL.revokeObjectURL(entry.preview);
      setEntries((current) => current.filter((item) => item.key !== entry.key));
    } catch (error) {
      update(entry.key, { status: 'ready', error: error instanceof Error ? error.message : 'Could not remove this photo. Try again.' });
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ink">Reference photos <span className="font-normal text-ink-soft">(optional, up to 3)</span></legend>
      <p className="text-sm text-ink-soft">Add JPEG, PNG or WebP photos to show us your design.</p>
      <div className="flex flex-wrap gap-3">
        {entries.map((entry, index) => (
          <div key={entry.key} className="relative w-28">
            {/* Local previews stay in the browser; no image URL is sent to the server. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {entry.preview ? <img src={entry.preview} alt={`Reference photo ${index + 1}: ${entry.name}`} className="h-28 w-28 rounded-md border border-line object-cover" /> : <p className="flex h-28 w-28 items-center justify-center rounded-md border border-line bg-canvas p-2 text-center text-xs text-ink-soft">Saved reference photo {index + 1}</p>}
            {entry.status === 'uploading' && <progress aria-label={`Uploading photo ${index + 1}`} max={100} value={entry.progress} className="mt-2 block h-2 w-full accent-brand" />}
            {entry.status === 'processing' && <p className="mt-1 text-xs text-ink-soft" role="status">Preparing photo…</p>}
            {entry.status === 'uploading' && <p className="mt-1 text-xs text-ink-soft" role="status">Uploading {entry.progress}%</p>}
            {entry.error && <p className="mt-1 text-xs text-err-ink" role="alert">{entry.error}</p>}
            <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => void remove(entry)} disabled={entry.status === 'removing'} className="mt-2 min-h-11 w-full rounded-sm border border-ink text-sm font-medium text-ink disabled:opacity-60">
              {entry.status === 'removing' ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
      {entries.length < 3 && (
        <>
          <label htmlFor={inputId} className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-sm border border-ink px-4 text-sm font-medium text-ink">Add photos</label>
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { chooseFiles(event.currentTarget.files); event.currentTarget.value = ''; }} className="sr-only" />
        </>
      )}
      {entries.length === 3 && <p className="text-sm text-ink-soft">You’ve added the maximum of 3 photos.</p>}
      {selectionError && <p className="text-sm text-err-ink" role="alert">{selectionError}</p>}
    </fieldset>
  );
}
