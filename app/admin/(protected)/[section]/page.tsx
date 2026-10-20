import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS, sectionFromRoute } from '@/lib/admin/content-config';
import { ContentTable } from '@/components/admin/content-table';
import { MediaUploader } from '@/components/admin/media-uploader';

export const dynamic = 'force-dynamic';
export default async function AdminCollectionPage({ params }: { params: { section: string } }) {
  const section=sectionFromRoute(params.section);if(!section)notFound();
  const {supabase}=await requireAdmin();const config=ADMIN_SECTIONS[section];const orderColumn=section==='media'?'created_at':'updated_at';
  const {data,error}=await (supabase.from(config.table as never) as unknown as {select:(columns:string)=>{order:(col:string,args:{ascending:boolean})=>{range:(from:number,to:number)=>Promise<{data:unknown[]|null;error:{message:string}|null}>}}}).select('*').order(orderColumn,{ascending:false}).range(0,999);
  if(error)throw new Error('Unable to load this content collection. Confirm administrator membership and schema setup.');
  const rows=(data??[]) as Record<string,unknown>[];
  return <div><header className="admin-page-head"><div><p className="admin-eyebrow">Portfolio / Manage</p><h1 className="admin-title">{config.plural}</h1><p className="admin-description">Search, filter, preview, and manage {config.plural.toLowerCase()}.</p></div>{section!=='media'&&<Link className="admin-button admin-button-primary" href={`/admin/${section}/new`}>＋ New {config.singular}</Link>}</header>{section==='media'&&<MediaUploader/>}<ContentTable section={section} rows={rows as (Record<string,unknown>&{id:string})[]}/></div>;
}
