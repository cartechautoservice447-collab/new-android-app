import { supabase } from './lib/supabase.js';
import { readLocalWorkspace, saveCloudWorkspace, writeLocalWorkspace } from './cloudWorkspace.js';

const STYLE_ID = 'collection-delete-integration-styles';
const READY_ATTR = 'data-collection-delete-integration';
const PRESS_MS = 560;
const DELETE_MS = 920;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let observerStarted = false;
let syncing = false;

function authUserId() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return String(parsed.user.id);
      if (parsed?.access_token) {
        const payload = parsed.access_token.split('.')[1];
        if (payload) {
          const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          if (data?.sub) return String(data.sub);
        }
      }
    }
  } catch {}
  return 'anonymous';
}

function currentCourse() {
  const heading = [...document.querySelectorAll('h1')].find((el) => el.textContent.trim() === 'Collections');
  const header = heading?.closest('header');
  const courseName = header?.querySelector('.eyebrow')?.textContent?.trim() || '';
  const userId = authUserId();
  const courses = readLocalWorkspace(userId) || [];
  const course = courses.find((item) => String(item.name || '').trim() === courseName) || null;
  return { heading, header, courseName, userId, courses, course };
}

function rowTitle(row) {
  const candidate = row.querySelector('h3,h4,.title,strong');
  if (candidate?.textContent?.trim()) return candidate.textContent.trim();
  return row.textContent.replace(/\s+/g, ' ').trim();
}

function iconTrash() {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 10v6M14 10v6"/></svg>';
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .collection-delete-tools{display:flex;align-items:center;gap:10px;margin-left:auto;padding-left:12px}
    .collection-delete-trigger{width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.05));color:rgba(255,255,255,.9);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 24px rgba(15,18,32,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:pointer;transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}
    .collection-delete-trigger:hover{transform:translateY(-1px);background:linear-gradient(145deg,rgba(255,255,255,.21),rgba(255,255,255,.07));border-color:rgba(255,255,255,.27)}
    .collection-delete-trigger.active{background:linear-gradient(145deg,rgba(255,123,152,.3),rgba(255,74,112,.12));border-color:rgba(255,143,166,.45);color:#ffdce4}
    .collection-delete-selection-mode .collection-delete-row{transform:translateX(0)}
    .collection-delete-row{position:relative;display:flex;align-items:stretch;width:100%;margin-bottom:10px;transition:transform .2s ease,opacity .2s ease}
    .collection-delete-row>.glass-list-item{flex:1;min-width:0}
    .collection-delete-select{position:absolute;left:12px;top:50%;z-index:5;transform:translateY(-50%) scale(.92);width:30px;height:30px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.2);background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.05));color:transparent;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,transform .18s ease,background .18s ease,border-color .18s ease,color .18s ease;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    .collection-delete-selection-mode .collection-delete-select{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(-50%) scale(1)}
    .collection-delete-select.selected{color:white;border-color:rgba(201,169,255,.65);background:linear-gradient(145deg,#b98cff,#7654dd);box-shadow:0 0 0 4px rgba(166,125,255,.12),0 7px 18px rgba(121,80,229,.25)}
    .collection-delete-selected .glass-list-item{border-color:rgba(192,155,255,.45)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.11),0 10px 28px rgba(105,72,165,.14)!important;transform:translateY(-1px)}
    .collection-delete-modal-backdrop{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,7,16,.58);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
    .collection-delete-modal{width:min(460px,100%);max-height:min(78vh,640px);overflow:auto;padding:24px;border-radius:28px;background:linear-gradient(145deg,rgba(38,40,60,.93),rgba(20,22,37,.88));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 28px 90px rgba(0,0,0,.44);animation:collectionDeleteModalIn .2s ease}
    .collection-delete-modal h2{margin:0 0 8px;font-size:22px}.collection-delete-modal p{margin:0 0 16px;opacity:.78;line-height:1.5}.collection-delete-list{display:grid;gap:8px;max-height:240px;overflow:auto;margin-bottom:18px}.collection-delete-list span{padding:11px 12px;border-radius:13px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.09)}
    .collection-delete-modal-actions{display:flex;justify-content:flex-end;gap:10px}.collection-delete-modal-actions button{border:1px solid rgba(255,255,255,.13);border-radius:13px;padding:11px 15px;font:inherit;font-weight:700;cursor:pointer}.collection-delete-modal-actions .cancel{background:rgba(255,255,255,.06);color:inherit}.collection-delete-modal-actions .danger{background:linear-gradient(135deg,#ff6d8c,#ea4569);color:white;box-shadow:0 10px 26px rgba(255,69,107,.18)}
    .collection-delete-row.deleting{pointer-events:none;overflow:visible;animation:collectionDeleteErase ${DELETE_MS}ms cubic-bezier(.22,.72,.18,1) forwards}
    .collection-delete-sparkles{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:visible}.collection-delete-sparkles i{position:absolute;left:50%;bottom:7px;width:5px;height:5px;border-radius:50%;background:white;box-shadow:0 0 8px white,0 0 16px rgba(181,147,255,.8);opacity:0;animation:collectionDeleteStar ${DELETE_MS}ms cubic-bezier(.34,.7,.22,1) forwards}
    .collection-delete-layout-shift{animation:collectionDeleteShift var(--collection-shift-ms,600ms) cubic-bezier(.22,.72,.18,1) forwards}
    @keyframes collectionDeleteModalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
    @keyframes collectionDeleteErase{0%{opacity:1;clip-path:inset(0)}64%{opacity:1;clip-path:inset(0 0 42% 0)}100%{opacity:0;clip-path:inset(100% 0 0 0);transform:translateY(-7px)}}
    @keyframes collectionDeleteStar{0%{opacity:0;transform:translate(-50%,0) scale(.4)}10%{opacity:1}82%{opacity:.95;transform:translate(-50%,calc(-1 * var(--star-travel))) scale(.78)}100%{opacity:0;transform:translate(-50%,calc(-1 * var(--star-travel))) scale(.1)}}
    @keyframes collectionDeleteShift{from{transform:translateY(var(--collection-shift-y))}to{transform:translateY(0)}}
    @media(max-width:600px){.collection-delete-tools{padding-left:6px}.collection-delete-trigger{width:40px;height:40px}.collection-delete-select{left:9px;width:28px;height:28px}}
  `;
  document.head.appendChild(style);
}

function makeSparkles(row) {
  const wrap = document.createElement('span');
  wrap.className = 'collection-delete-sparkles';
  const dot = document.createElement('i');
  dot.style.setProperty('--star-travel', `${Math.max(row.getBoundingClientRect().height - 18, 20)}px`);
  wrap.appendChild(dot);
  return wrap;
}

function createModal(selected, onCancel, onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.className = 'collection-delete-modal-backdrop';
  const modal = document.createElement('section');
  modal.className = 'collection-delete-modal';
  const names = selected.map((item) => item.title);
  modal.innerHTML = `<h2>Delete selected collections?</h2><p>The following collection${names.length === 1 ? '' : 's'} will be permanently removed from this workspace.</p><div class="collection-delete-list">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>`;
  const actions = document.createElement('div');
  actions.className = 'collection-delete-modal-actions';
  const cancel = document.createElement('button');
  cancel.className = 'cancel'; cancel.type = 'button'; cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.className = 'danger'; confirm.type = 'button'; confirm.textContent = 'Confirm';
  actions.append(cancel, confirm); modal.appendChild(actions); backdrop.appendChild(modal);
  cancel.onclick = onCancel; confirm.onclick = onConfirm;
  backdrop.onclick = (event) => { if (event.target === backdrop) onCancel(); };
  return backdrop;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch]));
}

function enterMode(state) {
  if (state.mode) return;
  state.mode = true;
  state.trigger.classList.add('active');
  state.trigger.setAttribute('aria-pressed', 'true');
  state.root.classList.add('collection-delete-selection-mode');
}

function exitMode(state) {
  state.mode = false;
  state.trigger.classList.remove('active');
  state.trigger.setAttribute('aria-pressed', 'false');
  state.root.classList.remove('collection-delete-selection-mode');
  state.items.forEach((item) => { item.selected = false; item.select.classList.remove('selected'); item.row.classList.remove('collection-delete-selected'); });
}

function toggleSelected(state, item) {
  if (!state.mode || item.row.classList.contains('deleting')) return;
  item.selected = !item.selected;
  item.select.classList.toggle('selected', item.selected);
  item.row.classList.toggle('collection-delete-selected', item.selected);
}

async function deleteSelected(state, selected) {
  if (syncing) return;
  syncing = true;
  const { userId, course, courseName, courses } = state.context;
  if (!course) { syncing = false; return; }

  const remainingCourses = courses.map((entry) => entry.id !== course.id ? entry : {
    ...entry,
    updatedAt: Date.now(),
    collections: entry.collections.filter((collection) => !selected.some((item) => String(item.localId) === String(collection.id))),
  });

  const original = JSON.stringify(courses);
  try {
    writeLocalWorkspace(remainingCourses, userId);
    if (userId !== 'anonymous' && supabase) {
      const sync = await saveCloudWorkspace(userId, remainingCourses);
      if (!sync?.synced) throw sync?.error || new Error('Cloud workspace sync failed.');
    }

    const before = new Map(state.items.map((item) => [item.row, item.row.getBoundingClientRect().top]));
    const removed = state.items.filter((item) => selected.includes(item));
    removed.forEach((item) => { item.row.classList.add('deleting'); item.row.appendChild(makeSparkles(item.row)); });
    exitMode(state);
    await new Promise((resolve) => setTimeout(resolve, DELETE_MS + 30));
    removed.forEach((item) => item.row.remove());

    state.items.filter((item) => !removed.includes(item)).forEach((item) => {
      if (!item.row.isConnected) return;
      const oldTop = before.get(item.row);
      const newTop = item.row.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (Math.abs(delta) < 1) return;
      item.row.style.setProperty('--collection-shift-y', `${delta}px`);
      item.row.classList.add('collection-delete-layout-shift');
      item.row.addEventListener('animationend', () => { item.row.classList.remove('collection-delete-layout-shift'); item.row.style.removeProperty('--collection-shift-y'); }, { once: true });
    });

    state.context.courses = remainingCourses;
    void courseName;
    window.dispatchEvent(new CustomEvent('collection-delete-completed'));
    window.setTimeout(() => window.location.reload(), 160);
  } catch (error) {
    writeLocalWorkspace(JSON.parse(original), userId);
    exitMode(state);
    window.alert(`Collection deletion failed: ${error?.message || 'Unknown error.'}`);
  } finally {
    syncing = false;
  }
}

function bindPage() {
  const { heading, header, courseName, userId, courses, course } = currentCourse();
  const list = document.querySelector('.collections-list');
  if (!heading || !header || !list || !course) return;
  if (header.getAttribute(READY_ATTR) === '1') return;

  injectStyles();
  header.setAttribute(READY_ATTR, '1');
  const root = document.body;
  const tools = document.createElement('div');
  tools.className = 'collection-delete-tools';
  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'collection-delete-trigger'; trigger.setAttribute('aria-label','Delete collections'); trigger.setAttribute('aria-pressed','false'); trigger.title='Delete collections'; trigger.innerHTML = iconTrash();
  tools.appendChild(trigger); header.appendChild(tools);

  const state = { mode:false, trigger, root, context:{ userId, courseName, courses, course }, items:[] };
  const rows = [...list.querySelectorAll(':scope > .glass-list-item')];
  rows.forEach((row, index) => {
    const collection = course.collections[index];
    if (!collection) return;
    const wrap = document.createElement('div');
    wrap.className = 'collection-delete-row';
    const select = document.createElement('button');
    select.type='button'; select.className='collection-delete-select'; select.setAttribute('aria-label',`Select ${collection.title || rowTitle(row)}`); select.innerHTML='<span aria-hidden="true">✓</span>';
    row.parentNode.insertBefore(wrap,row); wrap.appendChild(row); wrap.appendChild(select);
    const item = { row:wrap, select, localId:String(collection.id), title:String(collection.title || rowTitle(row)), selected:false };
    state.items.push(item);
    select.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();toggleSelected(state,item);});

    let timer=0; let startX=0; let startY=0; let longPressed=false;
    const clear=()=>{if(timer){clearTimeout(timer);timer=0;}};
    row.addEventListener('pointerdown',(event)=>{if(event.pointerType==='mouse' && event.button!==0)return;startX=event.clientX;startY=event.clientY;longPressed=false;clear();timer=window.setTimeout(()=>{timer=0;if(!state.mode)enterMode(state);longPressed=true;toggleSelected(state,item);},PRESS_MS);},{passive:true});
    row.addEventListener('pointermove',(event)=>{if(Math.hypot(event.clientX-startX,event.clientY-startY)>10)clear();},{passive:true});
    row.addEventListener('pointerup',()=>clear(),{passive:true}); row.addEventListener('pointercancel',()=>clear(),{passive:true});
    row.addEventListener('click',(event)=>{if(longPressed){longPressed=false;event.preventDefault();event.stopImmediatePropagation();return;}if(state.mode){event.preventDefault();event.stopImmediatePropagation();toggleSelected(state,item);}},true);
  });

  trigger.onclick=()=>{if(state.mode){const selected=state.items.filter((item)=>item.selected);if(!selected.length){exitMode(state);return;}const modal=createModal(selected,()=>modal.remove(),async()=>{const button=modal.querySelector('.danger');button.disabled=true;button.textContent='Deleting…';modal.remove();await deleteSelected(state,selected);});document.body.appendChild(modal);}else enterMode(state);};
}

function run(){try{bindPage();}catch(error){console.error('Collection delete integration failed:',error);}}

if(typeof window!=='undefined' && typeof document!=='undefined' && !observerStarted){
  observerStarted=true;
  run();
  const observer=new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('mobile-auth-callback-complete',run);
}
