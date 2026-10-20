import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS, sectionFromRoute } from '@/lib/admin/content-config';
import { ContentEditor } from '@/components/admin/content-editor';

export const dynamic='force-dynamic';
export default async function NewAdminItemPage({params}:{params:{section:string}}){
  await requireAdmin();const section=sectionFromRoute(params.section);if(!section||section==='media')notFound();const config=ADMIN_SECTIONS[section];
  return <div><header className="admin-page-head"><div><p className="admin-eyebrow">{config.label} / New</p><h1 className="admin-title">Create {config.singular.toLowerCase()}</h1><p className="admin-description">New items start as drafts. Publish when the content is ready.</p></div></header><ContentEditor section={section}/></div>;
}
