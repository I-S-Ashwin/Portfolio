import { NextResponse, type NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/supabase/admin-auth';

export const dynamic='force-dynamic';
const MAX_PUBLIC=10*1024*1024,MAX_PRIVATE=20*1024*1024;
const MIME_EXT:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','application/pdf':'pdf'};
function jsonError(message:string,status:number){return NextResponse.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}})}
function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');const host=request.headers.get('host');if(!origin||!host)return false;try{return new URL(origin).host===host}catch{return false}}
async function apiAdmin(){const context=await getAdminContext();if(!context.supabase||!context.user||!context.isAdmin)return null;return {supabase:context.supabase,user:context.user}}

export async function POST(request:NextRequest){
  try{
    if(!sameOrigin(request))return jsonError('Cross-origin request denied.',403);
    const declaredLength=Number(request.headers.get('content-length')??0);
    if(declaredLength>MAX_PRIVATE+64*1024)return jsonError('Upload request is too large.',413);
    const admin=await apiAdmin();if(!admin)return jsonError('Administrator authentication is required.',401);const {supabase,user}=admin;
    const body=await request.formData();const file=body.get('file');const visibility=body.get('visibility');const alt=String(body.get('alt_text')??'').trim();const caption=String(body.get('caption')??'').trim();
    if(!(file instanceof File))return jsonError('Choose a file to upload.',400);
    if(alt.length>500||caption.length>1000)return jsonError('Alt text or caption is too long.',400);
    const bucket=visibility==='private'?'portfolio-private':visibility==='public'?'portfolio-public':null;
    if(!bucket)return jsonError('Choose public or private visibility.',400);
    const max=bucket==='portfolio-public'?MAX_PUBLIC:MAX_PRIVATE;
    if(file.size<1||file.size>max)return jsonError(`File must be smaller than ${Math.floor(max/1024/1024)} MB.`,413);
    const ext=MIME_EXT[file.type];if(!ext)return jsonError('Allowed formats: JPEG, PNG, WebP, AVIF, and PDF.',415);
    const header=new Uint8Array(await file.slice(0,16).arrayBuffer());
    const isJpeg=file.type==='image/jpeg'&&header[0]===0xff&&header[1]===0xd8&&header[2]===0xff;
    const isPng=file.type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>header[i]===v);
    const isWebp=file.type==='image/webp'&&String.fromCharCode(...header.slice(0,4))==='RIFF'&&String.fromCharCode(...header.slice(8,12))==='WEBP';
    const isAvif=file.type==='image/avif'&&String.fromCharCode(...header.slice(4,12)).includes('ftypavif');
    const isPdf=file.type==='application/pdf'&&String.fromCharCode(...header.slice(0,5))==='%PDF-';
    if(!(isJpeg||isPng||isWebp||isAvif||isPdf))return jsonError('File contents do not match the selected file type.',415);
    if(bucket==='portfolio-private'&&file.type==='image/avif')return jsonError('AVIF is not enabled for private file storage.',415);
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
    if(uploadError)return jsonError('Storage rejected this upload. Confirm bucket policies and allowed file types.',403);
    const {data,error:recordError}=await supabase.from('media_assets').insert({storage_bucket:bucket,storage_path:path,mime_type:file.type,byte_size:file.size,alt_text:alt,caption:caption||null,visibility:visibility as 'public'|'private',created_by:user.id}).select('id').single();
    if(recordError){await supabase.storage.from(bucket).remove([path]);return jsonError('File uploaded but media metadata could not be saved; the temporary upload was removed.',403);}
    return NextResponse.json({id:recordError?null:data.id,message:'Media uploaded.'},{status:201,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return jsonError(error instanceof Error?error.message:'Upload failed.',500)}
}

export async function PATCH(request:NextRequest){
  try{
    if(!sameOrigin(request))return jsonError('Cross-origin request denied.',403);
    const admin=await apiAdmin();if(!admin)return jsonError('Administrator authentication is required.',401);const {supabase}=admin;const id=request.nextUrl.searchParams.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return jsonError('Invalid media record.',400);
    const body=await request.json();const alt=String(body.alt_text??'').trim();const caption=String(body.caption??'').trim();if(alt.length>500||caption.length>1000)return jsonError('Alt text or caption is too long.',400);
    const {error}=await supabase.from('media_assets').update({alt_text:alt,caption:caption||null}).eq('id',id);if(error)return jsonError('Database denied the media update.',403);
    return NextResponse.json({message:'Media details saved.'},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return jsonError(error instanceof Error?error.message:'Update failed.',500)}
}

export async function DELETE(request:NextRequest){
  try{
    if(!sameOrigin(request))return jsonError('Cross-origin request denied.',403);
    const admin=await apiAdmin();if(!admin)return jsonError('Administrator authentication is required.',401);const {supabase}=admin;const id=request.nextUrl.searchParams.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return jsonError('Invalid media record.',400);
    const {data:asset,error:readError}=await supabase.from('media_assets').select('storage_bucket,storage_path').eq('id',id).maybeSingle();if(readError||!asset)return jsonError('Media record not found or access denied.',404);
    const {error:storageError}=await supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);if(storageError)return jsonError('Storage denied deletion. The media record was left intact.',403);
    const {error:rowError}=await supabase.from('media_assets').delete().eq('id',id);if(rowError)return jsonError('Storage object removed but database deletion failed.',500);
    return NextResponse.json({message:'Media file and record deleted.'},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return jsonError(error instanceof Error?error.message:'Delete failed.',500)}
}

export async function GET(request:NextRequest){
  try{
    const admin=await apiAdmin();if(!admin)return jsonError('Administrator authentication is required.',401);const {supabase}=admin;const id=request.nextUrl.searchParams.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return jsonError('Invalid media record.',400);
    const {data:asset,error}=await supabase.from('media_assets').select('storage_bucket,storage_path').eq('id',id).maybeSingle();if(error||!asset)return jsonError('Media record not found or access denied.',404);
    if(asset.storage_bucket==='portfolio-public')return NextResponse.json({url:`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.storage_bucket}/${asset.storage_path}`},{headers:{'Cache-Control':'private, no-store'}});
    const {data:signed,error:signError}=await supabase.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path,60);
    if(signError||!signed)return jsonError('Unable to create a temporary private preview.',403);
    return NextResponse.json({url:signed.signedUrl},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return jsonError(error instanceof Error?error.message:'Preview failed.',500)}
}
