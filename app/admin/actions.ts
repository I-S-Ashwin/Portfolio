'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS, sectionFromRoute } from '@/lib/admin/content-config';
import { parseEntryMediaIds, sanitizeAdminPayload, slugify, validateEntryForPublish } from '@/lib/admin/validation';

function field(form: FormData, name: string) { return form.get(name); }
function formObject(form: FormData) { return Object.fromEntries(form.entries()); }
function errorText(message: string) {
  if (/duplicate key|unique constraint/i.test(message)) return 'That slug or value is already in use. Try a more specific value.';
  if (/row-level security|permission denied|not authorized/i.test(message)) return 'The database denied this operation. Confirm administrator membership and RLS policies.';
  if (/check constraint|violates/i.test(message)) return 'One or more values do not meet the database requirements.';
  return message.slice(0, 240);
}

async function createUniqueSlug(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'], table: string, raw: string, exceptId?: string) {
  const base = slugify(raw);
  if (!base) throw new Error('Provide a title that can generate a valid URL slug.');
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = attempt ? `${base}-${attempt + 1}` : base;
    const baseQuery = (supabase.from(table as never) as unknown as { select: (columns: string) => { eq: (column: string, value: string) => { neq: (column: string, value: string) => { maybeSingle: () => Promise<{data: unknown; error: {message:string}|null}> }; maybeSingle: () => Promise<{data: unknown; error: {message:string}|null}> } } }).select('id').eq('slug', candidate);
    const query = exceptId ? baseQuery.neq('id', exceptId) : baseQuery;
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }
  throw new Error('Could not find an available slug. Choose a more specific title.');
}

export async function saveContent(sectionKey: string, id: string | null, form: FormData) {
  const section = sectionFromRoute(sectionKey);
  if (!section || section === 'media') return { error: 'Invalid content section.' };
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { error: 'Invalid content ID.' };
  const { supabase } = await requireAdmin();
  try {
    const data = sanitizeAdminPayload(section, formObject(form));
    const mediaIds = section === 'projects' || section === 'research' ? parseEntryMediaIds(form.get('media_asset_ids')) : [];
    const config = ADMIN_SECTIONS[section];
    if (section !== 'skills') {
      const manualSlug = typeof data.slug === 'string' && data.slug ? data.slug : String(data.title ?? '');
      data.slug = await createUniqueSlug(supabase, config.table, manualSlug, id ?? undefined);
    }
    const status = field(form, 'status');
    if (status !== undefined) {
      if (!['draft','published','archived'].includes(String(status))) throw new Error('Choose a valid publication status.');
      data.status = status;
      if(status==='published'){
        let candidate: Record<string, unknown> = { ...data };
        if (id) {
          const existing = await (supabase.from(config.table as never) as unknown as {select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:unknown;error:{message:string}|null}>}}}).select('*').eq('id',id).maybeSingle();
          if (existing.error) throw new Error(existing.error.message);
          if (!existing.data) throw new Error('This content entry no longer exists.');
          candidate = { ...(existing.data as Record<string, unknown>), ...candidate };
        }
        validateEntryForPublish(section, candidate);
        let publishDate=typeof data.published_at==='string'&&data.published_at?data.published_at:null;
        if(!publishDate&&id){const existing=await (supabase.from(ADMIN_SECTIONS[section].table as never) as unknown as {select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:unknown;error:{message:string}|null}>}}}).select('published_at').eq('id',id).maybeSingle();if(existing.error)throw new Error(existing.error.message);const record=existing.data as {published_at?:string|null}|null;publishDate=record?.published_at??null;}
        data.published_at=publishDate??new Date().toISOString();
      }else data.published_at=null;
    }
    if ((section === 'projects' || section === 'research') && mediaIds.length) {
      const { data: media, error: mediaError } = await supabase.from('media_assets').select('id').in('id', mediaIds).eq('visibility', 'public');
      if (mediaError) throw new Error(mediaError.message);
      if ((media ?? []).length !== mediaIds.length) throw new Error('Every attached asset must exist and be public.');
    }
    const table = config.table;
    let result: { data?: {id:string}|null; error: { message: string } | null };
    if (id) result = await (supabase.from(table as never) as unknown as { update: (row: Record<string,unknown>) => { eq: (column:string,value:string) => {select:(columns:string)=>{single:()=>Promise<{data:{id:string}|null;error:{message:string}|null}>}} } }).update(data).eq('id', id).select('id').single();
    else result = await (supabase.from(table as never) as unknown as { insert: (row: Record<string,unknown>) => {select:(columns:string)=>{single:()=>Promise<{data:{id:string}|null;error:{message:string}|null}>}} }).insert(data).select('id').single();
    if (result.error) throw new Error(result.error.message);
    const contentId = id ?? result.data?.id;
    if ((section === 'projects' || section === 'research') && contentId) {
      if (section === 'projects') {
        const { error: removeError } = await supabase.from('project_media').delete().eq('project_id', contentId);
        if (removeError) throw new Error(removeError.message);
        if (mediaIds.length) {
          const rows = mediaIds.map((media_asset_id, sort_order) => ({ project_id: contentId, media_asset_id, sort_order }));
          const { error: insertError } = await supabase.from('project_media').insert(rows);
          if (insertError) throw new Error(insertError.message);
        }
      } else {
        const { error: removeError } = await supabase.from('research_media').delete().eq('research_project_id', contentId);
        if (removeError) throw new Error(removeError.message);
        if (mediaIds.length) {
          const rows = mediaIds.map((media_asset_id, sort_order) => ({ research_project_id: contentId, media_asset_id, sort_order }));
          const { error: insertError } = await supabase.from('research_media').insert(rows);
          if (insertError) throw new Error(insertError.message);
        }
      }
    }
    revalidatePath('/admin'); revalidatePath(`/admin/${section}`);
    return { ok: true, message: id ? `${config.singular} saved.` : `${config.singular} created.` };
  } catch (error) { return { error: errorText(error instanceof Error ? error.message : 'Unable to save this item.') }; }
}

export async function setPublicationStatus(sectionKey: string, id: string, status: string) {
  const section = sectionFromRoute(sectionKey);
  if (!section || section === 'media' || status !== 'draft' && status !== 'published' && status !== 'archived') return { error: 'Invalid publication request.' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { error: 'Invalid content ID.' };
  const { supabase } = await requireAdmin();
  const table = ADMIN_SECTIONS[section].table;
  if (status === 'published' && (section === 'projects' || section === 'research')) {
    const { data, error } = await (supabase.from(table as never) as unknown as {select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:unknown;error:{message:string}|null}>}}}).select('*').eq('id',id).maybeSingle();
    if (error) return {error:errorText(error.message)};
    if (!data) return {error:'This content entry no longer exists.'};
    try { validateEntryForPublish(section, data as Record<string, unknown>); }
    catch (validationError) { return {error:errorText(validationError instanceof Error ? validationError.message : 'Complete verified sections before publishing.')}; }
  }
  const update = { status, published_at: status === 'published' ? new Date().toISOString() : null };
  const result = await (supabase.from(table as never) as unknown as { update:(row:Record<string,unknown>)=>{eq:(column:string,value:string)=>Promise<{error:{message:string}|null}>} }).update(update).eq('id', id);
  if (result.error) return { error: errorText(result.error.message) };
  revalidatePath('/admin'); revalidatePath(`/admin/${section}`);
  return { ok: true, message: status === 'published' ? 'Content published.' : 'Content unpublished.' };
}

export async function deleteContent(sectionKey: string, id: string) {
  const section = sectionFromRoute(sectionKey);
  if (!section || section === 'media') return { error: 'Use the media endpoint so the storage object is removed with the record.' };
  const { supabase } = await requireAdmin();
  const table = ADMIN_SECTIONS[section].table;
  const result = await (supabase.from(table as never) as unknown as { delete:()=>{eq:(column:string,value:string)=>Promise<{error:{message:string}|null}>} }).delete().eq('id', id);
  if (result.error) return { error: errorText(result.error.message) };
  revalidatePath('/admin'); revalidatePath(`/admin/${section}`);
  return { ok: true, message: 'Item deleted.' };
}

export async function updateMessageStatus(id: string, status: 'new'|'read'|'archived') {
  if (!['new','read','archived'].includes(status)) return { error: 'Invalid message status.' };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('contact_submissions').update({ status }).eq('id', id);
  if (error) return { error: errorText(error.message) };
  revalidatePath('/admin/messages'); return { ok: true };
}

export async function deleteMessage(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('contact_submissions').delete().eq('id', id);
  if (error) return { error: errorText(error.message) };
  revalidatePath('/admin/messages'); return { ok: true };
}

