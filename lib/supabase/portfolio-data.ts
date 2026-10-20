import 'server-only';
import { getSupabaseClient } from './client';
import type { ContentRow } from './database.types';
import type { PortfolioItem } from '@/lib/content';

export const PAGE_SIZE = 12;
const MAX_PAGE = 100_000;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ContentTable = 'projects' | 'research_projects' | 'publications' | 'hackathons' | 'achievements' | 'experiences' | 'certifications' | 'blog_posts' | 'resources';
export type ContentPage = { items: PortfolioItem[]; page: number; hasMore: boolean };

export class PortfolioDataError extends Error {
  constructor(message = 'Unable to load portfolio content.') { super(message); this.name = 'PortfolioDataError'; }
}

export function validateSlug(slug: string): boolean { return slug.length <= 120 && SAFE_SLUG.test(slug); }
export function normalizePage(value: string | number | undefined): number {
  const numberValue = Number(value ?? 1);
  return Number.isSafeInteger(numberValue) && numberValue >= 1 && numberValue <= MAX_PAGE ? numberValue : 1;
}

function extractText(value: unknown): string[] {
  const paragraphs: string[] = [];
  const visit = (node: unknown, current: string[]) => {
    if (!node || typeof node !== 'object') return;
    const object = node as { type?: string; text?: string; content?: unknown[] };
    if (typeof object.text === 'string') current.push(object.text);
    for (const child of object.content ?? []) visit(child, current);
    if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(object.type ?? '') && current.length) {
      paragraphs.push(current.join('')); current.length = 0;
    }
  };
  visit(value, []);
  return paragraphs;
}

export function toPortfolioItem(row: ContentRow, category: string, coverImageUrl: string | null = null): PortfolioItem {
  const body = extractText(row.content);
  return { slug: row.slug, title: row.title, category, summary: row.summary ?? '', date: row.published_at ?? undefined,
    body: body.length ? body : row.summary ? [row.summary] : [], tags: row.tags ?? [], coverImageUrl };
}

async function withPublicCovers(rows: ContentRow[], category: string): Promise<PortfolioItem[]> {
  const ids = Array.from(new Set(rows.flatMap(row => row.cover_media_id ? [row.cover_media_id] : [])));
  if (!ids.length) return rows.map(row => toPortfolioItem(row, category));
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('media_assets').select('id,storage_bucket,storage_path')
    .in('id', ids).eq('visibility', 'public');
  if (error) throw new PortfolioDataError();
  const urls = new Map((data ?? []).map(asset => [asset.id, supabase.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path).data.publicUrl]));
  return rows.map(row => toPortfolioItem(row, category, row.cover_media_id ? urls.get(row.cover_media_id) ?? null : null));
}

export async function getPublishedPage(table: ContentTable, category: string, pageInput?: string | number, pageSize = PAGE_SIZE): Promise<ContentPage> {
  const page = normalizePage(pageInput);
  const size = Math.min(Math.max(Math.floor(pageSize), 1), 50);
  const from = (page - 1) * size;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(table).select('*')
    .eq('status', 'published').not('published_at', 'is', null).lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).range(from, from + size);
  if (error) throw new PortfolioDataError();
  const rows = (data ?? []) as unknown as ContentRow[];
  return { items: await withPublicCovers(rows.slice(0, size), category), page, hasMore: rows.length > size };
}

export async function getPublishedBySlug(table: ContentTable, category: string, slug: string): Promise<PortfolioItem | null> {
  if (!validateSlug(slug)) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(table).select('*').eq('slug', slug).eq('status', 'published')
    .not('published_at', 'is', null).lte('published_at', new Date().toISOString()).maybeSingle();
  if (error) throw new PortfolioDataError();
  if (!data) return null;
  return (await withPublicCovers([data as unknown as ContentRow], category))[0];
}

export const getProjects = (page?: string | number) => getPublishedPage('projects', 'Projects', page);
export const getProject = (slug: string) => getPublishedBySlug('projects', 'Projects', slug);
export const getResearchProjects = (page?: string | number) => getPublishedPage('research_projects', 'Research', page);
export const getResearchProject = (slug: string) => getPublishedBySlug('research_projects', 'Research', slug);
export const getPublications = (page?: string | number) => getPublishedPage('publications', 'Publications', page);
export const getHackathons = (page?: string | number) => getPublishedPage('hackathons', 'Hackathons', page);
export const getAchievements = (page?: string | number) => getPublishedPage('achievements', 'Achievements', page);
export const getExperiences = (page?: string | number) => getPublishedPage('experiences', 'Experience', page);
export const getCertifications = (page?: string | number) => getPublishedPage('certifications', 'Certifications', page);
export const getBlogPosts = (page?: string | number) => getPublishedPage('blog_posts', 'Writing', page);
export const getBlogPost = (slug: string) => getPublishedBySlug('blog_posts', 'Writing', slug);
export const getResources = (page?: string | number) => getPublishedPage('resources', 'Resources', page);

export async function getSkills() {
  const { data, error } = await getSupabaseClient().from('skills').select('id,name,category,description,sort_order')
    .eq('status', 'published').not('published_at', 'is', null).lte('published_at', new Date().toISOString())
    .order('category').order('sort_order');
  if (error) throw new PortfolioDataError();
  return data ?? [];
}

export async function getPublicMedia() {
  const { data, error } = await getSupabaseClient().from('media_assets').select('id,storage_bucket,storage_path,mime_type,alt_text,caption,width,height')
    .eq('visibility', 'public').order('created_at', { ascending: false }).range(0, 23);
  if (error) throw new PortfolioDataError();
  const supabase = getSupabaseClient();
  return (data ?? []).map(asset => ({ ...asset, url: supabase.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path).data.publicUrl }));
}

export async function getFeaturedProjects() {
  const { data, error } = await getSupabaseClient().from('projects').select('*').eq('featured', true).eq('status', 'published')
    .not('published_at', 'is', null).lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).limit(2);
  if (error) throw new PortfolioDataError();
  return withPublicCovers((data ?? []) as unknown as ContentRow[], 'Projects');
}
