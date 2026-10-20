import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { ADMIN_SECTIONS } from '@/lib/admin/content-config';

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const tableNames = [...new Set(Object.values(ADMIN_SECTIONS).map(section => section.table))];
  type CountResult={count:number|null;error:{message:string}|null};
  type CountQuery=PromiseLike<CountResult>&{eq:(column:string,value:string)=>CountQuery;not:(column:string,operator:string,value:null)=>CountQuery;lte:(column:string,value:string)=>CountQuery};
  const db=supabase as unknown as {from:(name:string)=>{select:(columns:string,options:{count:'exact';head:true})=>CountQuery}};
  async function count(table:string,kind:'all'|'published'|'public-media'){
    let query=db.from(table).select('id',{count:'exact',head:true});
    if(kind==='published')query=query.eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString());
    if(kind==='public-media')query=query.eq('visibility','public');
    const result=await query;return result.error?null:result.count;
  }
  const counts=await Promise.all(tableNames.map(async table=>({table,total:await count(table,'all'),published:await count(table,table==='media_assets'?'public-media':'published')})));
  const contentCounts=counts.filter(item=>item.table!=='media_assets');
  const total=contentCounts.reduce((sum,item)=>sum+(item.total??0),0);const published=contentCounts.reduce((sum,item)=>sum+(item.published??0),0);const drafts=contentCounts.reduce((sum,item)=>sum+Math.max((item.total??0)-(item.published??0),0),0);
  const [{count:messages},{count:newMessages}] = await Promise.all([
    supabase.from('contact_submissions').select('id',{count:'exact',head:true}),
    supabase.from('contact_submissions').select('id',{count:'exact',head:true}).eq('status','new'),
  ]);
  return <div><header className="admin-page-head"><div><p className="admin-eyebrow">Portfolio / Studio</p><h1 className="admin-title">Overview</h1><p className="admin-description">A private workspace for managing the portfolio’s published and draft content.</p></div><Link href="/" className="admin-button" target="_blank" rel="noreferrer">View site ↗</Link></header>
    <div className="admin-stats"><Stat label="Content items" value={total} note="Across content collections"/><Stat label="Published" value={published} note="Visible on the public site"/><Stat label="Draft / archived" value={drafts} note="Not currently published"/><Stat label="Messages" value={messages??0} note={`${newMessages??0} new submissions`}/></div>
    <section className="admin-panel"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-medium">Content collections</h2><p className="admin-hint mt-1">Select a collection to search, preview, and edit.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Collection</th><th scope="col">Total</th><th scope="col">Published</th><th scope="col">Manage</th></tr></thead><tbody>{Object.entries(ADMIN_SECTIONS).map(([key,section])=>{const count=counts.find(item=>item.table===section.table);return <tr key={key}><td className="admin-row-title">{section.label}</td><td>{count?.total??'—'}</td><td>{count?.published??'—'}</td><td><Link className="admin-link" href={`/admin/${key}`}>Open collection →</Link></td></tr>})}<tr><td className="admin-row-title">Contact messages</td><td>{messages??'—'}</td><td>{newMessages??'—'} new</td><td><Link className="admin-link" href="/admin/messages">Open inbox →</Link></td></tr></tbody></table></div></section>
  </div>;
}
function Stat({label,value,note}:{label:string;value:number|null;note:string}){return <section className="admin-stat"><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value??'—'}</p><p className="admin-stat-note">{note}</p></section>}
