import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import MobileNoteEditor from './MobileNoteEditor';
import './CollectionWorkspace.css';
import './CollectionWorkspaceOverrides.css';
import './LiquidGlassSurfaceOverrides.css';
import './MobileNoteEditorViewportFix.css';

function relativeDate(value){const ts=typeof value==='number'?value:Date.parse(value||'');if(!Number.isFinite(ts))return'just now';const m=Math.max(0,Math.round((Date.now()-ts)/60000));if(m<1)return'just now';if(m<60)return`${m}m ago`;const h=Math.round(m/60);if(h<24)return`${h}h ago`;return`${Math.round(h/24)}d ago`;}

const NOTE_EDITOR_SPRING = { type:'spring', stiffness:260, damping:24, mass:0.8 };

export default function CollectionWorkspace({collection,addNote,onBack,onSaveNote,onDeleteNote,message}){
 const[view,setView]=useState('notes');const[draftNote,setDraftNote]=useState(null);const[hiddenNoteIds,setHiddenNoteIds]=useState(()=>new Set());
 const notes=useMemo(()=> (collection?.notes||[]).filter(note=>!hiddenNoteIds.has(note.id)),[collection?.notes,hiddenNoteIds]);
 useEffect(()=>{setHiddenNoteIds(new Set());setDraftNote(null);setView('notes');},[collection?.id]);
 const openNote=note=>{setDraftNote({...note});setView('editor');};
 const saveNote=async note=>{setDraftNote(current=>current?.id===note?.id?{...current,...note}:current);await onSaveNote?.(note);};
 const deleteNote=noteId=>{setHiddenNoteIds(prev=>new Set(prev).add(noteId));setDraftNote(null);setView('notes');Promise.resolve(onDeleteNote?.(noteId)).catch(()=>{});};
 const exitEditor=()=>{setView('notes');setDraftNote(null);};
 if(!collection)return null;
 return <main className="screen feature-screen collection-workspace-screen">{view==='editor'&&draftNote?<motion.div className="mobile-note-editor-spring-shell collection-editor-full" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={NOTE_EDITOR_SPRING}><MobileNoteEditor note={draftNote} onBack={exitEditor} onSave={saveNote} onDelete={deleteNote}/></motion.div>:<section className="generated-editor-glass collection-workspace"><header className="collection-mobile-header"><button className="back-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18}/></button><div className="collection-mobile-title"><h1>Notes</h1></div></header><section className="collection-notes-panel notes-only-panel"><button className="collection-new-note-button" type="button" onClick={addNote}><Plus size={16}/><span>New Notes</span></button><div className="collection-note-list">{notes.map((note,i)=><article className="collection-note-card" key={note.id} onClick={()=>openNote(note)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')openNote(note);}}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{note.title||'Untitled note'}</strong><small>{relativeDate(note.updatedAt||note.createdAt)}</small></div><button onClick={e=>{e.stopPropagation();deleteNote(note.id);}} aria-label="Delete"><Trash2 size={14}/></button></article>)}</div></section>{message&&<p className="message">{message}</p>}</section>}</main>;
}
