'use client';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { deleteContent, setPublicationStatus } from '@/app/admin/actions';
import type { AdminSection } from '@/lib/admin/content-config';

type Row = Record<string, unknown> & { id: string };
const PAGE_SIZE = 12;
export function ContentTable({ section, rows }: { section: AdminSection; rows: Row[] }) {
  const [query,setQuery]=useState('');const [status,setStatus]=useState('all');const [page,setPage]=useState(1);const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,startTransition]=useTransition();
  const filtered=useMemo(()=>rows.filter(row=>{
    const matchesQuery=String(row.title??row.name??row.alt_text??row.storage_path??'').toLowerCase().includes(query.toLowerCase())||String(row.slug??'').toLowerCase().includes(query.toLowerCase());
    return matchesQuery&&(status==='all'||String(row.status??row.visibility??'')===status);
  }),[rows,query,status]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  function run(action:()=>Promise<{error?:string;message?:string;ok?:boolean}>) { setError('');setMessage('');startTransition(async()=>{const result=await action();if(result.error)setError(result.error);else{setMessage(result.message??'Updated.');window.location.reload();}}); }
  return <>
    {message&&<p className="admin-success mb-3" role="status">{message}</p>}{error&&<p className="admin-error mb-3" role="alert">{error}</p>}
    <div className="admin-toolbar"><label className="sr-only" htmlFor="content-search">Search content</label><input id="content-search" className="admin-input" type="search" placeholder="Search title or slug" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}}/>
      <label className="sr-only" htmlFor="content-status">Filter by status</label><select id="content-status" className="admin-select" value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option><option value="public">Public media</option><option value="private">Private media</option></select>
      <span className="admin-hint self-center">{filtered.length} item{filtered.length===1?'':'s'}</span></div>
    {visible.length?<><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead><tbody>{visible.map(row=>{
      const title=String(row.title??row.name??row.alt_text??'Untitled media');const rowStatus=String(row.status??row.visibility??'');const slug=String(row.slug??'');
      return <tr key={row.id}><td><div className="admin-row-title">{title}</div><div className="admin-row-sub">{slug||String(row.storage_path??row.id)}{section==='media'?` · ID ${row.id}`:''}</div></td><td><span className={`admin-status ${rowStatus==='published'||rowStatus==='public'?'admin-status-published':rowStatus==='archived'?'admin-status-archived':''}`}>{rowStatus}</span></td><td>{String(row.updated_at??row.created_at??'—').slice(0,10)}</td><td><div className="admin-actions"><Link className="admin-link" href={`/admin/${section}/${row.id}`}>Edit</Link>{section!=='media'&&<><Link className="admin-link" href={`/admin/${section}/${row.id}/preview`}>Preview</Link>{section!=='skills'&&<button className="admin-button" disabled={busy} onClick={()=>run(()=>setPublicationStatus(section,row.id,rowStatus==='published'?'draft':'published'))}>{rowStatus==='published'?'Unpublish':'Publish'}</button>}</>}{section==='media'?<button className="admin-button admin-button-danger" disabled={busy} onClick={()=>{if(window.confirm(`Permanently delete “${title}” and its storage object?`))startTransition(async()=>{setError('');const response=await fetch(`/api/admin/media?id=${encodeURIComponent(row.id)}`,{method:'DELETE'});const result=await response.json();if(!response.ok)setError(result.error??'Delete failed.');else window.location.reload()})}}>Delete</button>:<button className="admin-button admin-button-danger" disabled={busy} onClick={()=>{if(window.confirm(`Permanently delete “${title}”?`))run(()=>deleteContent(section,row.id))}}>Delete</button>}</div></td></tr>;
    })}</tbody></table></div><div className="admin-pagination"><span>Page {page} of {pages}</span><div className="flex gap-2"><button className="admin-button" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><button className="admin-button" disabled={page>=pages} onClick={()=>setPage(page+1)}>Next</button></div></div></>:<div className="admin-empty"><p className="mb-2">{query||status!=='all'?'No items match these filters.':'Nothing here yet.'}</p>{!query&&status==='all'&&<p className="text-xs">Create your first item with the button above.</p>}</div>}
  </>;
}
