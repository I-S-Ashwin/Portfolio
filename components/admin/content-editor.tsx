'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveContent } from '@/app/admin/actions';
import { RichContentEditor } from './rich-content-editor';
import { PortfolioEntryEditor } from './portfolio-entry-editor';
import type { AdminSection } from '@/lib/admin/content-config';

type Row = Record<string, unknown>;
const fieldSpecs: Partial<Record<AdminSection, {name:string;label:string;type?:string;full?:boolean}[]>> = {
  projects: [{name:'role',label:'Role'},{name:'start_date',label:'Start date',type:'date'},{name:'end_date',label:'End date',type:'date'},{name:'repository_url',label:'Repository URL',type:'url'},{name:'demo_url',label:'Demo URL',type:'url'},{name:'featured',label:'Featured project',type:'checkbox'}],
  research: [{name:'research_status',label:'Research status',type:'research-status'},{name:'collaborators',label:'Collaborators (comma separated)'},{name:'started_at',label:'Started',type:'date'},{name:'completed_at',label:'Completed',type:'date'}],
  publications: [{name:'venue',label:'Venue'},{name:'authors',label:'Authors (comma separated)'},{name:'doi',label:'DOI'},{name:'external_url',label:'Publication URL',type:'url'},{name:'publication_date',label:'Publication date',type:'date'}],
  hackathons: [{name:'event_name',label:'Event name'},{name:'event_date',label:'Event date',type:'date'},{name:'team_name',label:'Team name'},{name:'placement',label:'Placement'},{name:'project_url',label:'Project URL',type:'url'}],
  achievements: [{name:'issuer',label:'Issuer'},{name:'achieved_on',label:'Date',type:'date'},{name:'credential_url',label:'Credential URL',type:'url'}],
  experience: [{name:'organization',label:'Organization'},{name:'role',label:'Role'},{name:'location',label:'Location'},{name:'start_date',label:'Start date',type:'date'},{name:'end_date',label:'End date',type:'date'},{name:'is_current',label:'Current role',type:'checkbox'}],
  certifications: [{name:'issuer',label:'Issuer'},{name:'issued_on',label:'Issued on',type:'date'},{name:'expires_on',label:'Expires on',type:'date'},{name:'credential_id',label:'Credential ID'},{name:'credential_url',label:'Credential URL',type:'url'}],
  blog: [{name:'reading_time_minutes',label:'Reading time (minutes)',type:'number'}],
  resources: [{name:'url',label:'Resource URL',type:'url'},{name:'resource_type',label:'Resource type',type:'resource-type'},{name:'publisher',label:'Publisher'}],
  skills: [{name:'name',label:'Skill name'},{name:'category',label:'Category'},{name:'sort_order',label:'Sort order',type:'number'},{name:'description',label:'Description',full:true}],
};
const textFields = new Set(['tags','authors','collaborators']);
function valueFor(row: Row, key: string) { const value = row[key]; return value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value); }

export function ContentEditor({ section, initial, id }: { section: AdminSection; initial?: Row; id?: string }) {
  const router = useRouter(); const [error,setError] = useState(''); const [success,setSuccess] = useState(''); const [busy,setBusy] = useState(false); const [dirty,setDirty] = useState(false);
  useEffect(() => { const guard=(event:BeforeUnloadEvent)=>{ if(dirty){event.preventDefault();event.returnValue='';} }; window.addEventListener('beforeunload',guard); return()=>window.removeEventListener('beforeunload',guard); },[dirty]);
  const specs = fieldSpecs[section] ?? [];
  async function submit(form: FormData) {
    setBusy(true);setError('');setSuccess('');
    const result = await saveContent(section,id??null,form);
    if(result.error){setError(result.error);setBusy(false);return;}
    setSuccess(result.message??'Saved.');setDirty(false);setBusy(false);
    if(!id){router.replace(`/admin/${section}`);router.refresh();} else router.refresh();
  }
  return <form action={submit} onChange={()=>setDirty(true)} className="admin-form">
    {error&&<p className="admin-error" role="alert">{error}</p>}{success&&<p className="admin-success" role="status">{success}</p>}
    <div className="admin-panel admin-form-grid">
      {section!=='skills'&&<>
        <Field label="Title" name="title" initial={valueFor(initial??{},'title')} required maxLength={240}/>
        <Field label="Slug" name="slug" initial={valueFor(initial??{},'slug')} hint="Leave blank to generate a unique slug from the title."/>
        <Field label="Summary" name="summary" initial={valueFor(initial??{},'summary')} full multiline maxLength={1000}/>
        <Field label="Cover / social image media ID" name="cover_media_id" initial={valueFor(initial??{},'cover_media_id')} hint="Optional UUID from the Media collection; this image is used as the public cover and sharing image."/>
        <Field label={section==='projects'||section==='research'?'Technologies (comma separated)':'Tags'} name="tags" initial={valueFor(initial??{},'tags')} hint={section==='projects'||section==='research'?'List only technologies you actually used. Separate with commas.':'Separate tags with commas.'}/>
      </>}
      <div className="admin-field"><label className="admin-label" htmlFor="status">Publication status</label><select id="status" className="admin-select" name="status" defaultValue={valueFor(initial??{},'status')||'draft'}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><span className="admin-hint">Publishing is subject to RLS. Published content immediately becomes public.</span></div>
      {specs.map(spec=>spec.type==='checkbox'?<label className={`admin-field ${spec.full?'admin-field-full':''}`} key={spec.name}><span className="admin-label"><input type="hidden" name={spec.name} value="false"/><input type="checkbox" name={spec.name} value="true" defaultChecked={initial?.[spec.name]===true} className="mr-2 accent-[var(--accent)]"/>{spec.label}</span></label>:<Field key={spec.name} label={section==='projects'&&spec.name==='role'?'Your role':spec.label} name={spec.name} initial={valueFor(initial??{},spec.name)} type={spec.type==='research-status'||spec.type==='resource-type'?'text':spec.type} full={spec.full} required={section==='research'&&spec.name==='research_status'} />)}
      {section!=='skills'&&<>
        <Field label="SEO title" name="seo_title" initial={valueFor(initial??{},'seo_title')} maxLength={70}/>
        <Field label="SEO description" name="seo_description" initial={valueFor(initial??{},'seo_description')} maxLength={180}/>
        {section==='projects'||section==='research'?<div className="admin-field admin-field-full"><p className="admin-label">Verified project details</p><p className="admin-hint mb-3">Leave unknown details blank. New entries stay drafts by default. Publishing is blocked until the required factual sections are complete.</p><PortfolioEntryEditor section={section} initialContent={initial?.content} initialMediaIds={valueFor(initial??{},'media_asset_ids')}/></div>:<div className="admin-field admin-field-full"><label className="admin-label" htmlFor="rich-content">Rich content</label><RichContentEditor name="content" initialValue={initial?.content}/></div>}
      </>}
    </div>
    <div className="admin-form-actions"><button className="admin-button admin-button-primary" type="submit" disabled={busy}>{busy?'Saving…':id?'Save changes':'Create draft'}</button><a className="admin-button" href={`/admin/${section}`}>Cancel</a>{dirty&&<span className="admin-hint self-center" role="status">Unsaved changes</span>}</div>
  </form>;
}

function Field({ label,name,initial='',type='text',full=false,multiline=false,required=false,maxLength,hint }: {label:string;name:string;initial?:string;type?:string;full?:boolean;multiline?:boolean;required?:boolean;maxLength?:number;hint?:string}) {
  const id=`field-${name}`;
  return <label className={`admin-field ${full?'admin-field-full':''}`} htmlFor={id}><span className="admin-label">{label}</span>{multiline?<textarea className="admin-textarea" id={id} name={name} defaultValue={initial} required={required} maxLength={maxLength}/>:type==='research-status'?<select className="admin-select" id={id} name={name} defaultValue={initial} required={required}><option value="">Choose current status</option><option value="exploring">Exploring</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select>:type==='resource-type'?<select className="admin-select" id={id} name={name} defaultValue={initial||'tool'}><option value="tool">Tool</option><option value="course">Course</option><option value="book">Book</option><option value="article">Article</option><option value="documentation">Documentation</option><option value="other">Other</option></select>:<input className="admin-input" id={id} name={name} type={type} defaultValue={initial} required={required} maxLength={maxLength} />}{hint&&<span className="admin-hint">{hint}</span>}</label>;
}
