import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS, sectionFromRoute } from '@/lib/admin/content-config';
import { ContentEditor } from '@/components/admin/content-editor';
import { MediaEditor } from '@/components/admin/media-editor';

export const dynamic='force-dynamic';
export default async function EditAdminItemPage({params}:{params:{section:string;id:string}}){
  const section=sectionFromRoute(params.section);if(!section||! /^[0-9a-f-]{36}$/i.test(params.id))notFound();
  const {supabase}=await requireAdmin();const table=ADMIN_SECTIONS[section].table;
  const {data,error}=await (supabase.from(table as never) as unknown as {select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:unknown;error:{message:string}|null}>}}}).select('*').eq('id',params.id).maybeSingle();
  if(error||!data)notFound();const row=data as Record<string,unknown>;
  if(section==='projects'){
    const {data:media}=await supabase.from('project_media').select('media_asset_id').eq('project_id',params.id);
    row.media_asset_ids=(media??[]).map(asset=>asset.media_asset_id).join(', ');
  }else if(section==='research'){
    const {data:media}=await supabase.from('research_media').select('media_asset_id').eq('research_project_id',params.id);
    row.media_asset_ids=(media??[]).map(asset=>asset.media_asset_id).join(', ');
  }
  return <div><header className="admin-page-head"><div><p className="admin-eyebrow">{ADMIN_SECTIONS[section].label} / Edit</p><h1 className="admin-title">Edit {String(row.title??row.name??'media item')}</h1><p className="admin-description">Update this record. Database policies remain the final authorization boundary.</p></div></header>{section==='media'?<MediaEditor row={row}/>:<ContentEditor section={section} initial={row} id={params.id}/>}</div>;
}
