import { describe, expect, it } from 'vitest';
import { sanitizeAdminPayload, slugify, validateRichContent } from '@/lib/admin/validation';

describe('admin validation',()=>{
  it('generates URL-safe slugs and trims edge punctuation',()=>{
    expect(slugify('  Vision & Language: Demo! ')).toBe('vision-language-demo');
    expect(slugify('')).toBe('');
  });
  it('accepts only the supported JSON rich-text node types',()=>{
    expect(validateRichContent({type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Safe'}]}]})).toBe(true);
    expect(validateRichContent({type:'doc',content:[{type:'html',content:[{type:'text',text:'<script>alert(1)</script>'}]}]})).toBe(false);
    expect(validateRichContent({type:'doc',content:[{type:'heading',attrs:{level:7},content:[]}]})).toBe(false);
  });
  it('rejects unsafe external link protocols and constrains resources',()=>{
    expect(()=>sanitizeAdminPayload('resources',{title:'Docs',url:'javascript:alert(1)',resource_type:'article'})).toThrow(/HTTP or HTTPS/);
    expect(()=>sanitizeAdminPayload('resources',{title:'Docs',url:'https://example.com',resource_type:'unknown'})).toThrow(/resource type/);
  });
  it('does not pass foreign table fields through the form payload',()=>{
    const payload=sanitizeAdminPayload('projects',{title:'Sample',event_name:'Injected column',featured:'true',tags:'ai, systems'});
    expect(payload.featured).toBe(true);
    expect(payload.tags).toEqual(['ai','systems']);
    expect(payload).not.toHaveProperty('event_name');
  });
  it('requires matching private media visibility and bucket',()=>{
    expect(()=>sanitizeAdminPayload('media',{storage_bucket:'portfolio-public',visibility:'private',storage_path:'a/b.pdf',mime_type:'application/pdf',byte_size:'100'})).toThrow(/match its storage bucket/);
  });
});
