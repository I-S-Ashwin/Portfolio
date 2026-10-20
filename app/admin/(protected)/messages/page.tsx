import { requireAdmin } from '@/lib/supabase/admin-auth';
import { MessageInbox } from '@/components/admin/message-inbox';

export const dynamic='force-dynamic';
export default async function AdminMessagesPage(){
  const {supabase}=await requireAdmin();const {data,error}=await supabase.from('contact_submissions').select('id,name,email,subject,message,notification_status,received_at,status,retention_expires_at,spam_score').order('received_at',{ascending:false}).range(0,199);
  if(error)throw new Error('Unable to load private contact submissions. Confirm administrator membership and RLS policies.');
  return <div><header className="admin-page-head"><div><p className="admin-eyebrow">Portfolio / Private inbox</p><h1 className="admin-title">Messages</h1><p className="admin-description">Contact submissions are private and visible only to an authorized administrator.</p></div></header><MessageInbox rows={data??[]}/></div>;
}
