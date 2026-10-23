import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageUploader, type UploadedImage } from './ImageUploader';

class MockImage {
  width = 2400;
  height = 1200;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) { queueMicrotask(() => this.onload?.()); }
}

class MockXHR {
  static requests: MockXHR[] = [];
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  headers = new Map<string, string>();
  method = '';
  url = '';
  body: Document | XMLHttpRequestBodyInit | null = null;
  status = 0;
  responseText = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { MockXHR.requests.push(this); }
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
  send(body: Document | XMLHttpRequestBodyInit | null) { this.body = body; }
  progress() { this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent); }
  respond(status: number, response: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(response);
    this.onload?.();
  }
}

let canvasSize = { width: 0, height: 0 };

describe('ImageUploader', () => {
  beforeEach(() => {
    MockXHR.requests = [];
    canvasSize = { width: 0, height: 0 };
    let url = 0;
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++url}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvasSize = { width: this.width, height: this.height };
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['webp'], { type: 'image/webp' })));
  });

  it('downscales and uploads accepted photos, reports real progress and exposes id/token state', async () => {
    const onChange = vi.fn<(images: UploadedImage[]) => void>();
    const onPendingChange = vi.fn<(pending: boolean) => void>();
    const user = userEvent.setup();
    render(<ImageUploader onChange={onChange} onPendingChange={onPendingChange} />);
    const input = screen.getByLabelText('Add photos');
    expect(input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');

    await user.upload(input, new File(['source'], 'cake.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(onPendingChange).toHaveBeenLastCalledWith(true));
    await waitFor(() => expect(MockXHR.requests).toHaveLength(1));
    const upload = MockXHR.requests[0];
    expect(upload.method).toBe('POST');
    expect(upload.url).toBe('/api/uploads');
    expect((upload.body as FormData).get('image')).toBeInstanceOf(Blob);
    expect((upload.body as FormData).get('image')).toHaveProperty('type', 'image/webp');
    expect(canvasSize).toEqual({ width: 1600, height: 800 });
    act(() => upload.progress());
    expect(await screen.findByText('Uploading 50%')).toBeTruthy();
    act(() => upload.respond(201, { ok: true, id: 'image-1', token: 'token-1' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([{ id: 'image-1', token: 'token-1' }]));
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('img', { name: 'Reference photo 1: cake.jpg' })).toBeTruthy();
  });

  it('enforces the three-photo limit and deletes a removed upload with its token header', async () => {
    const user = userEvent.setup();
    render(<ImageUploader />);
    await user.upload(screen.getByLabelText('Add photos'), [1, 2, 3, 4].map((n) => new File([`${n}`], `photo-${n}.png`, { type: 'image/png' })));
    expect((await screen.findByRole('alert')).textContent).toContain('You can add up to 3 photos.');
    await waitFor(() => expect(MockXHR.requests).toHaveLength(3));
    expect(screen.getByText('You’ve added the maximum of 3 photos.')).toBeTruthy();
    act(() => MockXHR.requests.forEach((request, index) => request.respond(201, { ok: true, id: `image-${index}`, token: `token-${index}` })));
    await user.click(await screen.findByRole('button', { name: 'Remove photo 1' }));
    await waitFor(() => expect(MockXHR.requests).toHaveLength(4));
    const remove = MockXHR.requests[3];
    expect(remove.method).toBe('DELETE');
    expect(remove.url).toBe('/api/uploads/image-0');
    expect(remove.headers.get('x-upload-token')).toBe('token-0');
    act(() => remove.respond(200, { ok: true }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Reference photo 1: photo-1.png' })).toBeNull());
  });

  it('shows a readable upload error', async () => {
    const user = userEvent.setup();
    render(<ImageUploader />);
    await user.upload(screen.getByLabelText('Add photos'), new File(['source'], 'cake.webp', { type: 'image/webp' }));
    await waitFor(() => expect(MockXHR.requests).toHaveLength(1));
    act(() => MockXHR.requests[0].respond(413, { ok: false, error: { code: 'IMAGE_TOO_LARGE', message: 'Image is too large.' } }));
    expect((await screen.findByRole('alert')).textContent).toContain('Image is too large.');
  });

  it('deletes an upload when its photo is removed while the request is pending', async () => {
    const onPendingChange = vi.fn<(pending: boolean) => void>();
    const user = userEvent.setup();
    render(<ImageUploader onPendingChange={onPendingChange} />);
    await user.upload(screen.getByLabelText('Add photos'), new File(['source'], 'cake.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(MockXHR.requests).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(screen.getByRole('button', { name: 'Remove photo 1' }).textContent).toBe('Removing…');
    act(() => MockXHR.requests[0].respond(201, { ok: true, id: 'image-pending', token: 'token-pending' }));
    await waitFor(() => expect(MockXHR.requests).toHaveLength(2));
    const remove = MockXHR.requests[1];
    expect(remove.method).toBe('DELETE');
    expect(remove.headers.get('x-upload-token')).toBe('token-pending');
    act(() => remove.respond(200, { ok: true }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Reference photo 1: cake.jpg' })).toBeNull());
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
  });
});
