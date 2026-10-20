'use client';
export default function CollectionError({reset}:{reset:()=>void}){return <div className="admin-error" role="alert"><p>Could not load this admin page. Check the Supabase configuration, schema, and RLS authorization.</p><button className="admin-button mt-3" onClick={()=>reset()}>Try again</button></div>}
