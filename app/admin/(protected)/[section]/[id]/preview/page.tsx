import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS,sectionFromRoute } from '@/lib/admin/content-config';
import { SafeRichPreview } from '@/components/admin/safe-rich-preview';

export const dynamic='force-dynamic';
export default async function AdminPreviewPage({params}:{params:{section:string;id:string}}){
  const section=sectionFromRoute(params.section);if(!section||section==='media'||! /^[0-9a-f-]{36}$/i.test(params.id))notFound();
  const {supabase}=await requireAdmin();const table=ADMIN_SECTIONS[section].table;
  const {data,error}=await (supabase.from(table as never) as unknown as {select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>Promise<{data:unknown;error:{message:string}|null}>}}}).select('*').eq('id',params.id).maybeSingle();
  if(error||!data)notFound();const row=data as Record<string,unknown>;
  return <article className="mx-auto max-w-3xl"><header className="admin-page-head"><div><p className="admin-eyebrow">Private preview / {ADMIN_SECTIONS[section].label}</p><h1 className="admin-title">{String(row.title??row.name??'Untitled')}</h1><p className="admin-description">{String(row.summary??'')}</p></div><Link href={`/admin/${section}/${params.id}`} className="admin-button">Edit</Link></header><div className="mb-5 flex gap-2"><span className="admin-status">{String(row.status??'draft')}</span>{typeof row.slug==='string'&&<span className="admin-status">/{section==='research'?'research':section==='blog'?'blog':section}/{row.slug}</span>}</div><SafeRichPreview value={row.content}/></article>;
}
