'use client';
import { useMemo,useState } from 'react';

type Block={key:string;label:string;help:string;kind?:'status'|'publication-status'|'url'};
const PROJECT:Block[]=[
  {key:'problem',label:'Problem being solved',help:'Who experiences this problem, and what is the specific problem? Use your own evidence; leave blank if unverified.'},
  {key:'role_and_contributions',label:'Your contributions',help:'Describe only work you personally completed. The role field above records your role separately.'},
  {key:'architecture',label:'Architecture and methodology',help:'Describe the system design and how you built or evaluated it.'},
  {key:'features_implemented',label:'Features implemented',help:'List only features that exist in the current project.'},
  {key:'features_proposed',label:'Proposed or planned features',help:'Keep proposals separate from implemented features.'},
  {key:'project_status',label:'Current project status',help:'The portfolio publication status below is separate from the actual project status.',kind:'status'},
  {key:'verified_results',label:'Verified results',help:'Add results you can substantiate. If there are no measurements, state that only if you have confirmed it.'},
  {key:'limitations',label:'Limitations',help:'Known constraints, caveats, and unverified claims.'},
  {key:'media_notes',label:'Screenshots, diagrams, and demos',help:'Describe visuals and demos. Add actual files in Media and link their public media IDs below.'},
  {key:'lessons_learned',label:'Lessons learned',help:'What did you personally learn or discover?'},
  {key:'future_improvements',label:'Future improvements',help:'Ideas for future work; do not describe them as implemented.'},
];
const RESEARCH:Block[]=[
  {key:'problem',label:'Problem being studied',help:'State the motivation and scope without claiming findings.'},
  {key:'role_and_contributions',label:'Your actual role and contributions',help:'Describe your role and only the work you personally performed.'},
  {key:'research_question',label:'Research question',help:'State the question or hypothesis being investigated.'},
  {key:'related_work',label:'Related work',help:'Add citations only after verifying bibliographic details. Include DOI or stable links where known.'},
  {key:'architecture',label:'System architecture',help:'Describe the system or experimental setup, if applicable.'},
  {key:'methodology',label:'Research methodology',help:'Explain the procedure, model, protocol, and analysis steps.'},
  {key:'datasets',label:'Datasets',help:'Name sources, versions, splits, and permissions. Do not imply access or approval you do not have.'},
  {key:'evaluation',label:'Evaluation',help:'Metrics, baselines, protocol, and evaluation status. Add only verified details.'},
  {key:'features_implemented',label:'Implemented work',help:'What exists now (code, experiments, instruments, or analyses).'},
  {key:'features_proposed',label:'Proposed or planned work',help:'Keep planned experiments and features separate from completed work.'},
  {key:'findings',label:'Findings',help:'Report only results actually observed. If analysis is pending, leave this blank and keep the entry a draft.'},
  {key:'verified_results',label:'Verified results and limitations',help:'Summarize what evidence supports and what it does not support.'},
  {key:'limitations',label:'Limitations',help:'Known threats to validity, sample limits, assumptions, and unresolved issues.'},
  {key:'publication_status',label:'Publication status',help:'Do not mark published unless a real publication record and source can be verified.',kind:'publication-status'},
  {key:'media_notes',label:'Figures, diagrams, and presentations',help:'Describe the available media. Add actual files in Media and link their public IDs below.'},
  {key:'lessons_learned',label:'Lessons learned',help:'Personal observations from the work.'},
  {key:'future_improvements',label:'Next steps',help:'Proposed next work, clearly distinguished from findings.'},
  {key:'source_code_url',label:'Public source-code URL',help:'Optional. Use a public repository URL only if it exists.',kind:'url'},
  {key:'deployment_url',label:'Demo or deployment URL',help:'Optional. Use a public demo URL only if it exists.',kind:'url'},
];
type Entry=Record<string,string>;
function parseDocument(value:unknown,blocks:Block[]):Entry{
  const result:Entry=Object.fromEntries(blocks.map(block=>[block.key,'']));
  if(!value||typeof value!=='object')return result;
  const doc=value as {content?:unknown[]};
  const unstructured:string[]=[];
  for(let i=0;i<(doc.content??[]).length;i++){
    const heading=doc.content?.[i] as {type?:string;content?:{text?:string}[]}|undefined;
    if(heading?.type!=='heading') { if(heading?.type==='paragraph')unstructured.push((heading.content??[]).map(item=>item.text??'').join(''));continue; }
    const label=(heading.content??[]).map(item=>item.text??'').join('');
    const block=blocks.find(item=>item.label===label);if(!block){unstructured.push(label);continue;}
    const paragraph=doc.content?.[i+1] as {content?:{text?:string}[]}|undefined;
    result[block.key]=(paragraph?.content??[]).map(item=>item.text??'').join('');i++;
  }
  if(unstructured.length)result.unclassified_content=unstructured.filter(Boolean).join('\n\n');
  return result;
}
function documentFor(blocks:Block[],values:Entry){const content=blocks.flatMap(block=>{
  const value=values[block.key]??'';if(!value.trim())return [];
  return [{type:'heading',attrs:{level:2},content:[{type:'text',text:block.label}]},{type:'paragraph',content:[{type:'text',text:value}]}];
});if(values.unclassified_content?.trim())content.push({type:'heading',attrs:{level:2},content:[{type:'text',text:'Unsorted existing content — review before publishing'}]},{type:'paragraph',content:[{type:'text',text:values.unclassified_content}]});return {type:'doc',content}}

export function PortfolioEntryEditor({section,initialContent,initialMediaIds=''}:{section:'projects'|'research';initialContent:unknown;initialMediaIds?:string}){
  const blocks=section==='projects'?PROJECT:RESEARCH;
  const [values,setValues]=useState<Entry>(()=>parseDocument(initialContent,blocks));
  const [mediaIds,setMediaIds]=useState(initialMediaIds);
  const json=useMemo(()=>JSON.stringify(documentFor(blocks,values)),[blocks,values]);
  const methods=useMemo(()=>JSON.stringify((values.methodology??'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean)),[values.methodology]);
  const field=(block:Block)=> <label className="admin-field admin-field-full" key={block.key}>
    <span className="admin-label">{block.label}</span><span className="admin-hint">{block.help}</span>
    {block.kind==='status'?<select className="admin-select" value={values[block.key]??''} onChange={event=>setValues(current=>({...current,[block.key]:event.target.value}))}><option value="">Not entered</option><option value="planned">Planned</option><option value="in progress">In progress</option><option value="on hold">On hold</option><option value="completed">Completed</option></select>:block.kind==='publication-status'?<select className="admin-select" value={values[block.key]??''} onChange={event=>setValues(current=>({...current,[block.key]:event.target.value}))}><option value="">Not reported</option><option value="not applicable">Not applicable</option><option value="in preparation">In preparation</option><option value="submitted">Submitted</option><option value="under review">Under review</option><option value="accepted">Accepted</option><option value="published">Published</option></select>:<textarea className="admin-textarea" rows={block.key==='problem'||block.key==='role_and_contributions'?4:3} value={values[block.key]??''} onChange={event=>setValues(current=>({...current,[block.key]:event.target.value}))} maxLength={10000} placeholder={block.kind==='url'?'https://…':'Leave empty until verified'}/>}
  </label>;
  return <div className="admin-field-full">
    <input type="hidden" name="content" value={json}/>{section==='research'&&<input type="hidden" name="methods" value={methods}/>}
    <div className="admin-form-grid">{blocks.map(field)}{values.unclassified_content!==undefined&&<label className="admin-field admin-field-full"><span className="admin-label">Unsorted existing content — review before publishing</span><span className="admin-hint">This content did not match a structured field, so it is preserved here for you to review.</span><textarea className="admin-textarea" rows={4} value={values.unclassified_content} onChange={event=>setValues(current=>({...current,unclassified_content:event.target.value}))}/></label>}</div>
    <label className="admin-field mt-5"><span className="admin-label">Public media asset IDs</span><span className="admin-hint">Optional. Upload screenshots, diagrams, or presentations in <a className="admin-link" href="/admin/media">Media</a>, then paste the IDs shown in that list. Only public-bucket media can be attached to public portfolio content.</span><textarea className="admin-textarea" name="media_asset_ids" rows={2} maxLength={2000} value={mediaIds} onChange={event=>setMediaIds(event.target.value)} placeholder="Comma-separated media IDs"/></label>
  </div>;
}

export const portfolioEntryRequiredFields={projects:PROJECT.filter(block=>!['media_notes'].includes(block.key)).map(block=>({key:block.key,label:block.label})),research:RESEARCH.filter(block=>!['media_notes','source_code_url','deployment_url'].includes(block.key)).map(block=>({key:block.key,label:block.label}))} as const;
