'use client';
import { useMemo, useState } from 'react';

type Node={type:string;attrs?:{level?:number};content?:Node[];text?:string;marks?:{type:string}[]};
type Block={id:number;type:'paragraph'|'heading'|'bulletList'|'orderedList'|'blockquote';text:string;level?:number};
function textOf(node:Node):string{return node.type==='text'?node.text??'':(node.content??[]).map(textOf).join(node.type==='hardBreak'?'\n':'')}
function readBlocks(value:unknown):Block[]{
  if(!value||typeof value!=='object'||(value as Node).type!=='doc'||!Array.isArray((value as Node).content))return [{id:1,type:'paragraph',text:''}];
  const content=(value as Node).content??[];
  return content.map((node,index)=>({id:index+1,type:(['paragraph','heading','bulletList','orderedList','blockquote'].includes(node.type)?node.type:'paragraph') as Block['type'],text:textOf(node),level:node.attrs?.level??2}));
}
function toDocument(blocks:Block[]):Node{
  return {type:'doc',content:blocks.map(block=>{
    const textNode:Node={type:'text',text:block.text};
    if(block.type==='heading')return {type:'heading',attrs:{level:block.level??2},content:[textNode]};
    if(block.type==='bulletList'||block.type==='orderedList')return {type:block.type,content:block.text.split('\n').filter(Boolean).map(line=>({type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:line}]}]}))};
    return {type:block.type,content:[textNode]};
  })};
}

export function RichContentEditor({name,initialValue}:{name:string;initialValue:unknown}){
  const [blocks,setBlocks]=useState(()=>readBlocks(initialValue));
  const serialized=useMemo(()=>JSON.stringify(toDocument(blocks)),[blocks]);
  function change(id:number,updates:Partial<Block>){setBlocks(current=>current.map(block=>block.id===id?{...block,...updates}:block))}
  function add(type:Block['type']){setBlocks(current=>[...current,{id:Date.now()+Math.random(),type,text:'',level:2}])}
  function remove(id:number){setBlocks(current=>current.length>1?current.filter(block=>block.id!==id):[{id:Date.now(),type:'paragraph',text:''}])}
  return <div>
    <input type="hidden" name={name} value={serialized}/>
    <div className="admin-rich-toolbar"><button type="button" className="admin-button" onClick={()=>add('paragraph')}>＋ Paragraph</button><button type="button" className="admin-button" onClick={()=>add('heading')}>＋ Heading</button><button type="button" className="admin-button" onClick={()=>add('bulletList')}>＋ Bullet list</button><button type="button" className="admin-button" onClick={()=>add('blockquote')}>＋ Quote</button></div>
    <p className="admin-rich-help">Build content from headings, paragraphs, bullet lists, and quotes. Text is stored as structured JSON and rendered without HTML.</p>
    <div className="grid gap-3">{blocks.map((block,index)=><section className="admin-panel" key={block.id}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="admin-label">Block {index+1}</span><div className="flex gap-2"><select className="admin-select" aria-label={`Block ${index+1} type`} value={block.type} onChange={event=>change(block.id,{type:event.target.value as Block['type']})}><option value="paragraph">Paragraph</option><option value="heading">Heading</option><option value="bulletList">Bullet list</option><option value="blockquote">Quote</option></select>{block.type==='heading'&&<select className="admin-select" aria-label={`Block ${index+1} heading level`} value={block.level??2} onChange={event=>change(block.id,{level:Number(event.target.value)})}><option value="2">Heading 2</option><option value="3">Heading 3</option></select>}<button type="button" className="admin-button admin-button-danger" onClick={()=>remove(block.id)} aria-label={`Remove block ${index+1}`}>Remove</button></div></div><textarea className="admin-textarea" rows={block.type==='bulletList'?4:3} value={block.text} onChange={event=>change(block.id,{text:event.target.value})} placeholder={block.type==='bulletList'?'One list item per line':'Write your content…'} aria-label={`Block ${index+1} text`}/></section>)}</div>
    <div className="admin-panel mt-3"><p className="admin-label mb-3">Safe preview</p><Preview blocks={blocks}/></div>
  </div>;
}

function Preview({blocks}:{blocks:Block[]}){return <div className="space-y-3">{blocks.map(block=>{if(block.type==='heading')return block.level===3?<h3 key={block.id} className="text-base font-medium">{block.text}</h3>:<h2 key={block.id} className="text-lg font-medium">{block.text}</h2>;if(block.type==='bulletList')return <ul key={block.id} className="list-disc space-y-1 pl-5 text-sm">{block.text.split('\n').filter(Boolean).map((line,index)=><li key={index}>{line}</li>)}</ul>;if(block.type==='blockquote')return <blockquote key={block.id} className="border-l-2 border-accent pl-3 text-sm italic text-muted">{block.text}</blockquote>;return <p key={block.id} className="muted whitespace-pre-wrap text-sm leading-6">{block.text}</p>})}</div>}
