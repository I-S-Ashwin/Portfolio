'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MediaUploader(){
  const [error,setError]=useState('');const [success,setSuccess]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();
  async function submit(form:FormData){setError('');setSuccess('');setBusy(true);try{const response=await fetch('/api/admin/media',{method:'POST',body:form,credentials:'same-origin'});const payload=await response.json();if(!response.ok)throw new Error(payload.error??'Upload failed.');setSuccess(payload.message??'Uploaded.');router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Upload failed.')}finally{setBusy(false)}}
  return <form action={submit} className="admin-panel admin-form mb-5">
    <h2 className="text-base font-medium">Upload media</h2>
    {error&&<p className="admin-error" role="alert">{error}</p>}{success&&<p className="admin-success" role="status">{success}</p>}
    <label className="admin-field"><span className="admin-label">File</span><input className="admin-input" type="file" name="file" required accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"/><span className="admin-hint">JPEG, PNG, WebP, AVIF, PDF. Up to 10 MB for public or 20 MB for private files.</span></label>
    <label className="admin-field"><span className="admin-label">Visibility</span><select className="admin-select" name="visibility" defaultValue="public"><option value="public">Public portfolio media</option><option value="private">Private administrator file</option></select><span className="admin-hint">Public bucket files can be viewed by anyone with the object URL. Never upload confidential files as public.</span></label>
    <label className="admin-field"><span className="admin-label">Alternative text</span><input className="admin-input" name="alt_text" maxLength={500}/></label>
    <label className="admin-field"><span className="admin-label">Caption</span><input className="admin-input" name="caption" maxLength={1000}/></label>
    <button className="admin-button admin-button-primary w-fit" disabled={busy}>{busy?'Uploading…':'Upload media'}</button>
  </form>;
}
