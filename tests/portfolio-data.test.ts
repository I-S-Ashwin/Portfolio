import { beforeEach, describe, expect, it, vi } from 'vitest';

const { range, maybeSingle, eq, not, lte, order, select, from } = vi.hoisted(() => ({ range: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn(), not: vi.fn(), lte: vi.fn(), order: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: () => ({ from }) }));

import { getProject, getProjects, normalizePage, validateSlug } from '@/lib/supabase/portfolio-data';

function chain() { return { select, eq, not, lte, order, range, maybeSingle }; }
describe('portfolio data access', () => {
  beforeEach(() => {
    from.mockReturnValue(chain());
    select.mockReturnValue(chain()); eq.mockReturnValue(chain()); not.mockReturnValue(chain());
    lte.mockReturnValue(chain()); order.mockReturnValue(chain());
    range.mockResolvedValue({ data: [], error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });
  it('validates a safe slug before making a query', async () => {
    expect(validateSlug('safe-project-1')).toBe(true);
    expect(validateSlug('../private')).toBe(false);
    expect(await getProject('../private')).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
  it('normalizes invalid pagination and bounds page size', async () => {
    expect(normalizePage('0')).toBe(1);
    expect(normalizePage('2')).toBe(2);
    await getProjects('2');
    expect(range).toHaveBeenCalledWith(12, 24);
    expect(eq).toHaveBeenCalledWith('status', 'published');
    expect(not).toHaveBeenCalledWith('published_at', 'is', null);
  });
  it('returns null for a missing published slug', async () => {
    expect(await getProject('known-slug')).toBeNull();
    expect(eq).toHaveBeenCalledWith('status', 'published');
  });
});
