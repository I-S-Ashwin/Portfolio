export function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110).replace(/-+$/g, '');
}

export function validateSlug(value: string) {
  return value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function validateRichContent(input: unknown): input is { type: 'doc'; content: unknown[] } {
  if (!input || typeof input !== 'object') return false;
  const doc = input as { type?: unknown; content?: unknown };
  if (doc.type !== 'doc' || !Array.isArray(doc.content) || doc.content.length > 500) return false;
  const allowed = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'hardBreak', 'text']);
  const visit = (node: unknown, depth = 0): boolean => {
    if (depth > 12 || !node || typeof node !== 'object') return false;
    const item = node as { type?: unknown; text?: unknown; content?: unknown; attrs?: { level?: unknown }; marks?: unknown };
    if (typeof item.type !== 'string' || !allowed.has(item.type)) return false;
    if (item.type === 'text' && (typeof item.text !== 'string' || item.text.length > 10000)) return false;
    if (item.type === 'heading' && ![1, 2, 3].includes(Number(item.attrs?.level))) return false;
    if (item.marks !== undefined) {
      if (!Array.isArray(item.marks) || item.marks.some(mark => !mark || typeof mark !== 'object' || !['bold', 'italic', 'code'].includes(String((mark as {type?: unknown}).type)))) return false;
    }
    if (item.content !== undefined && (!Array.isArray(item.content) || item.content.length > 500 || !item.content.every(child => visit(child, depth + 1)))) return false;
    return true;
  };
  return doc.content.every(node => visit(node));
}

export function richTextSections(input: unknown): Map<string,string> {
  const sections=new Map<string,string>();if(!input||typeof input!=='object')return sections;
  const nodes=(input as {content?:unknown}).content;if(!Array.isArray(nodes))return sections;
  for(let index=0;index<nodes.length;index++){
    const heading=nodes[index] as {type?:unknown;content?:unknown};if(heading?.type!=='heading'||!Array.isArray(heading.content))continue;
    const label=heading.content.map(node=>node&&typeof node==='object'&&typeof (node as {text?:unknown}).text==='string'?(node as {text:string}).text:'').join('');
    const paragraph=nodes[index+1] as {type?:unknown;content?:unknown}|undefined;if(paragraph?.type!=='paragraph'||!Array.isArray(paragraph.content))continue;
    const value=paragraph.content.map(node=>node&&typeof node==='object'&&typeof (node as {text?:unknown}).text==='string'?(node as {text:string}).text:'').join('');
    sections.set(label,value.trim());
  }
  return sections;
}

export function validateEntryForPublish(section:string,data:Record<string,unknown>) {
  if(section!=='projects'&&section!=='research')return;
  const sections=richTextSections(data.content);
  if(typeof data.summary!=='string'||!data.summary.trim())throw new Error('Keep this as a draft until you add a short summary.');
  const required=section==='projects'?[ 
    ['Problem being solved','problem'],['Your contributions','contributions'],['Architecture and methodology','architecture'],['Features implemented','features_implemented'],['Proposed or planned features','features_proposed'],['Current project status','project_status'],['Verified results','verified_results'],['Limitations','limitations'],['Lessons learned','lessons_learned'],['Future improvements','future_improvements'],['Screenshots, diagrams, and demos','media_notes'],
  ]:[
    ['Problem being studied','problem'],['Your actual role and contributions','role_and_contributions'],['Research question','research_question'],['Related work','related_work'],['System architecture','architecture'],['Research methodology','methodology'],['Datasets','datasets'],['Evaluation','evaluation'],['Implemented work','features_implemented'],['Proposed or planned work','features_proposed'],['Findings','findings'],['Verified results and limitations','verified_results'],['Limitations','limitations'],['Publication status','publication_status'],['Lessons learned','lessons_learned'],['Next steps','future_improvements'],['Figures, diagrams, and presentations','media_notes'],
  ];
  const missing=required.filter(([label])=>!sections.get(label));
  if(!Array.isArray(data.tags)||data.tags.length===0)missing.push(['Technologies','technologies']);
  if(section==='projects'&&(typeof data.role!=='string'||!data.role.trim()))missing.push(['Your role','role']);
  if(section==='research'){
    if(!['exploring','ongoing','completed'].includes(String(data.research_status)))missing.push(['Current research status','research_status']);
    if(!Array.isArray(data.methods)||data.methods.length===0)missing.push(['Research methodology entries','methods']);
  }
  if(missing.length)throw new Error(`Keep this as a draft until these verified sections are complete: ${missing.map(([label])=>label).join(', ')}.`);
  for (const label of section === 'research' ? ['Public source-code URL','Demo or deployment URL'] : []) {
    const value = sections.get(label);
    if (!value) continue;
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { throw new Error(`${label} must be a valid HTTP or HTTPS URL.`); }
  }
}

export function parseEntryMediaIds(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (typeof value !== 'string') throw new Error('Media asset IDs must be text.');
  const ids = value.split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length > 50 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Enter up to 50 valid media asset IDs.');
  if (new Set(ids).size !== ids.length) throw new Error('Remove duplicate media asset IDs.');
  return ids;
}

export function sanitizeAdminPayload(section: string, input: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const stringFields = ['title','slug','summary','seo_title','seo_description','role','organization','location','repository_url','demo_url','event_name','team_name','placement','project_url','issuer','credential_url','credential_id','venue','doi','external_url','url','resource_type','publisher','research_status','name','category','description','alt_text','caption','storage_path','storage_bucket','mime_type','visibility'];
  for (const field of stringFields) if (typeof input[field] === 'string') data[field] = (input[field] as string).trim();
  if (typeof input.tags === 'string') data.tags = input.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 30);
  if (Array.isArray(input.tags) && input.tags.every(tag => typeof tag === 'string')) data.tags = input.tags.slice(0, 30);
  for (const field of ['authors','collaborators']) if (typeof input[field] === 'string') data[field] = (input[field] as string).split(',').map(item => item.trim()).filter(Boolean).slice(0, 30);
  if(section==='research'&&typeof input.methods==='string'){
    let parsed:unknown;try{parsed=JSON.parse(input.methods)}catch{throw new Error('Research methods must be a valid list.')}
    if(!Array.isArray(parsed)||parsed.length>100||parsed.some(item=>typeof item!=='string'||item.length>2000))throw new Error('Research methods must be a list of at most 100 text entries.');
    data.methods=parsed.map(item=>(item as string).trim()).filter(Boolean);
  }
  if (typeof input.content === 'string' && input.content.trim()) {
    let parsed: unknown;
    try { parsed = JSON.parse(input.content); } catch { throw new Error('Content must be valid JSON rich text.'); }
    if (!validateRichContent(parsed)) throw new Error('Rich text contains unsupported or invalid nodes.');
    data.content = parsed;
  } else if (input.content && validateRichContent(input.content)) data.content = input.content;
  for (const field of ['start_date','end_date','started_at','completed_at','publication_date','event_date','achieved_on','issued_on','expires_on','published_at']) {
    if (input[field] === '' || input[field] === null) data[field] = null;
    else if (typeof input[field] === 'string' && !Number.isNaN(Date.parse(input[field] as string))) data[field] = input[field];
    else if (input[field] !== undefined) throw new Error(`Invalid date for ${field}.`);
  }
  for (const field of ['cover_media_id','research_project_id']) if (input[field] === '' || input[field] === null) data[field] = null; else if (typeof input[field] === 'string') data[field] = input[field];
  for (const field of ['featured','is_current']) if (input[field] !== undefined) data[field] = input[field] === true || input[field] === 'true' || input[field] === 'on';
  if (input.sort_order !== undefined) { const value = Number(input.sort_order); if (!Number.isInteger(value) || value < -10000 || value > 10000) throw new Error('Sort order must be a whole number.'); data.sort_order = value; }
  if (input.reading_time_minutes !== undefined && input.reading_time_minutes !== '') { const value = Number(input.reading_time_minutes); if (!Number.isInteger(value) || value < 1 || value > 10000) throw new Error('Reading time must be a positive whole number.'); data.reading_time_minutes = value; }
  if (input.byte_size !== undefined) { const value = Number(input.byte_size); if (!Number.isInteger(value) || value < 1 || value > 20 * 1024 * 1024) throw new Error('Invalid file size.'); data.byte_size = value; }
  for (const field of ['width','height']) if (input[field] === '' || input[field] === null) data[field] = null; else if (input[field] !== undefined) { const value = Number(input[field]); if (!Number.isInteger(value) || value < 1 || value > 50000) throw new Error(`Invalid ${field}.`); data[field] = value; }
  const fieldsBySection: Record<string,string[]> = {
    projects:['title','slug','summary','content','tags','cover_media_id','role','start_date','end_date','repository_url','demo_url','featured','status','published_at','seo_title','seo_description'],
    research:['title','slug','summary','content','methods','tags','cover_media_id','research_status','collaborators','started_at','completed_at','status','published_at','seo_title','seo_description'],
    publications:['title','slug','summary','content','tags','cover_media_id','research_project_id','venue','doi','external_url','authors','publication_date','status','published_at','seo_title','seo_description'],
    hackathons:['title','slug','summary','content','tags','cover_media_id','event_name','event_date','team_name','placement','project_url','status','published_at','seo_title','seo_description'],
    achievements:['title','slug','summary','content','tags','cover_media_id','issuer','achieved_on','credential_url','status','published_at','seo_title','seo_description'],
    experience:['title','slug','summary','content','tags','cover_media_id','organization','role','location','start_date','end_date','is_current','status','published_at','seo_title','seo_description'],
    certifications:['title','slug','summary','content','tags','cover_media_id','issuer','issued_on','expires_on','credential_id','credential_url','status','published_at','seo_title','seo_description'],
    blog:['title','slug','summary','content','tags','cover_media_id','reading_time_minutes','status','published_at','seo_title','seo_description'],
    resources:['title','slug','summary','content','tags','cover_media_id','url','resource_type','publisher','status','published_at','seo_title','seo_description'],
    skills:['name','category','description','sort_order','status','published_at'],
    media:['storage_bucket','storage_path','mime_type','byte_size','alt_text','caption','width','height','visibility'],
  };
  const allowed = new Set(fieldsBySection[section] ?? []);
  for (const key of Object.keys(data)) if (!allowed.has(key)) delete data[key];
  for (const field of ['repository_url','demo_url','external_url','project_url','credential_url','url']) {
    if (data[field] === undefined || data[field] === '') continue;
    try { const url = new URL(String(data[field])); if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error(); data[field] = url.toString(); }
    catch { throw new Error(`${field} must be a valid HTTP or HTTPS URL.`); }
  }
  if (section !== 'media' && section !== 'skills') {
    if (!data.title || typeof data.title !== 'string' || data.title.length > 240) throw new Error('A title of at most 240 characters is required.');
    if (data.summary !== undefined && String(data.summary).length > 1000) throw new Error('Summary must be at most 1,000 characters.');
    if (data.seo_title !== undefined && String(data.seo_title).length > 70) throw new Error('SEO title must be at most 70 characters.');
    if (data.seo_description !== undefined && String(data.seo_description).length > 180) throw new Error('SEO description must be at most 180 characters.');
  }
  if (section === 'skills' && (!data.name || !data.category)) throw new Error('Name and category are required for a skill.');
  if (section === 'resources') {
    try { const url = new URL(String(data.url)); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
    catch { throw new Error('Enter a valid HTTP or HTTPS resource URL.'); }
    if (!['tool','course','book','article','documentation','other'].includes(String(data.resource_type))) throw new Error('Choose a valid resource type.');
  }
  if (section === 'media') {
    if (!['portfolio-public','portfolio-private'].includes(String(data.storage_bucket))) throw new Error('Invalid media bucket.');
    if (!['public','private'].includes(String(data.visibility))) throw new Error('Invalid media visibility.');
    if ((data.visibility === 'public') !== (data.storage_bucket === 'portfolio-public')) throw new Error('Media visibility must match its storage bucket.');
    if (!data.storage_path || !data.mime_type || !data.byte_size) throw new Error('Media file metadata is incomplete.');
  }
  return data;
}
