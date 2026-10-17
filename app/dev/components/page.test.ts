import { afterEach, describe, expect, it, vi } from 'vitest';
import ComponentsPage from './page';

afterEach(() => vi.unstubAllEnvs());

describe('/dev/components', () => {
  it('is not found in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => ComponentsPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('renders the gallery outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const page = ComponentsPage();
    expect(page.props.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
