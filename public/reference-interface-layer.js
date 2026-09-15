(() => {
  const qs = (root, selector) => root?.querySelector(selector);
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];
  const esc = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  function close() {
    document.querySelector('.reference-interface-overlay')?.remove();
  }

  function shell(title, eyebrow, body, active = '', headerAction = 'more') {
    close();
    const overlay = document.createElement('div');
    overlay.className = 'reference-interface-overlay';
    overlay.innerHTML = `<section class="reference-interface-panel">
      <header class="reference-interface-header">
        <button class="reference-back" data-ref-close aria-label="Back">‹</button>
        <div><span class="reference-eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1></div>
        <button class="reference-header-action" data-ref-header="${headerAction}" aria-label="${headerAction==='add'?'Add':'More'}">${headerAction==='add'?'＋':'•••'}</button>
      </header>
      <div class="reference-interface-body">${body}</div>
      <nav class="reference-bottom-nav" aria-label="Mobile navigation">
        ${['home','courses','collections','notes','more'].map((key) => `<button data-ref-nav="${key}" class="${active === key ? 'active':''}"><span>${key==='home'?'⌂':key==='courses'?'▣':key==='collections'?'▥':key==='notes'?'▤':'•••'}</span><small>${key[0].toUpperCase()+key.slice(1)}</small></button>`).join('')}
      </nav>
    </section>`;
    document.body.appendChild(overlay);
    qs(overlay, '[data-ref-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    qsa(overlay, '[data-ref-nav]').forEach((button) => button.addEventListener('click', () => route(button.dataset.refNav)));
    qs(overlay, '[data-ref-header]')?.addEventListener('click', () => headerAction === 'add' ? showAddCourse() : showMore());
    return overlay;
  }

  function route(key) {
    if (key === 'home') return close();
    if (key === 'courses') return showCourses();
    if (key === 'notes') return showNotes();
    if (key === 'collections') return showCollections();
    if (key === 'more') return showSettings();
  }

  function showCourses() {
    const dashboard = document.querySelector('.dashboard-screen');
    const cards = qsa(dashboard, '.course-dashboard-card');
    const rows = cards.map((card, index) => {
      const name = qs(card, '.course-copy h3')?.textContent?.trim() || `Course ${index + 1}`;
      const desc = qs(card, '.course-copy p')?.textContent?.trim() || 'Course workspace';
      const count = (card.textContent.match(/(\d+)\s+notes?/i) || [])[1] || '0';
      return `<button class="reference-course-row" data-open-course="${index}"><span class="reference-course-icon">▣</span><span><strong>${esc(name)}</strong><small>${esc(desc)}</small><em>${count} ${Number(count) === 1 ? 'note' : 'notes'}</em></span><b>›</b></button>`;
    }).join('') || '<div class="reference-empty">No courses yet.</div>';
    const overlay = shell('Course Folders', 'Course library', `<label class="reference-search">⌕ <input placeholder="Search courses…" /></label><div class="reference-list">${rows}</div>`, 'courses', 'add');
    qsa(overlay, '[data-open-course]').forEach((button) => button.addEventListener('click', () => {
      const target = qsa(dashboard, '.course-dashboard-card')[Number(button.dataset.openCourse)];
      close();
      qs(target, '.course-open')?.click();
    }));
  }

  function scrapeCourseDetailsCollections() {
    const rows = qsa(document, '.course-details-screen .course-content-tabs + .course-detail-list .course-detail-row');
    return rows.map((row) => ({ title: qs(row, 'strong')?.textContent?.trim() || 'Collection', meta: qs(row, 'small')?.textContent?.trim() || 'Collection' }));
  }

  function showCollections() {
    const existing = document.querySelector('.course-details-screen');
    if (existing) {
      const tab = qsa(existing, '[role="tab"]').find((b) => (b.textContent || '').trim() === 'Collections');
      tab?.click();
      setTimeout(() => renderCollections(scrapeCourseDetailsCollections()), 40);
      return;
    }
    const first = qs(document, '.dashboard-screen .course-dashboard-card .course-open');
    if (first) {
      first.click();
      setTimeout(() => {
        const course = document.querySelector('.course-details-screen');
        const tab = qsa(course, '[role="tab"]').find((b) => (b.textContent || '').trim() === 'Collections');
        tab?.click();
        setTimeout(() => renderCollections(scrapeCourseDetailsCollections()), 40);
      }, 100);
      return;
    }
    renderCollections([]);
  }

  function renderCollections(collections) {
    const rows = collections.map((item, index) => `<button class="reference-note-row"><span class="reference-note-icon">▥</span><span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><b>›</b></button>`).join('');
    shell('Collections', `${collections.length} collections`, `<div class="reference-list">${rows || '<div class="reference-empty">No collections yet.</div>'}</div>`, 'collections');
  }

  function scrapeNotes() {
    const rows = qsa(document, '.course-details-screen .course-detail-list .course-detail-row');
    return rows.map((row, index) => ({ title: qs(row, 'strong')?.textContent?.trim() || `Note ${index + 1}`, meta: qs(row, 'small')?.textContent?.trim() || 'Course note' }));
  }

  function showNotes() {
    const existing = document.querySelector('.course-details-screen');
    if (existing) return renderNotes(scrapeNotes());
    const first = qs(document, '.dashboard-screen .course-dashboard-card .course-open');
    if (first) { first.click(); setTimeout(() => renderNotes(scrapeNotes()), 120); return; }
    renderNotes([]);
  }

  function renderNotes(notes) {
    const rows = notes.map((note) => `<button class="reference-note-row"><span class="reference-note-icon">▤</span><span><strong>${esc(note.title)}</strong><small>${esc(note.meta)}</small></span><b>›</b></button>`).join('');
    shell('Notes', `${notes.length} notes`, `<label class="reference-search">⌕ <input placeholder="Search notes…" /></label><div class="reference-list">${rows || '<div class="reference-empty">No notes yet.</div>'}</div>`, 'notes');
  }

  function showOverview() {
    const cards=qsa(document,'.dashboard-screen .course-dashboard-card'); const courses=cards.length; const notes=cards.reduce((sum,card)=>sum+Number((card.textContent.match(/(\d+)\s+notes?/i)||[])[1]||0),0); const progress=Number((cards[0]?.textContent.match(/(\d+)%\s+complete/i)||[])[1]||0);
    shell('Overview','Your learning progress at a glance',`<div class="reference-overview-tabs"><button class="active">Progress</button><button>Stats</button><button>Insights</button></div><section class="reference-overview-card"><div class="reference-donut"><strong>${progress}%</strong><small>Overall Progress</small></div><div class="reference-legend"><span>● Completed <b>${progress?Math.max(1,Math.round(progress/12)):0}</b></span><span>● In Progress <b>${progress?1:0}</b></span><span>● Not Started <b>${Math.max(0,courses-(progress?2:0))}</b></span></div></section><section class="reference-overview-card"><div class="reference-card-title"><strong>Recent Activity</strong><span>Live</span></div><div class="reference-activity"><span>▤</span><p>Notes available in your current course</p><em>${notes} notes</em></div><div class="reference-activity"><span>▣</span><p>${courses} course${courses===1?'':'s'} in workspace</p><em>Current</em></div></section><section class="reference-quick-stats"><b>${notes}<small>Total Notes</small></b><b>${courses}<small>Courses</small></b><b>${cards.length ? notes : 0}<small>Collections</small></b></section>`,'');
  }

  function showSettings(){const perf=localStorage.getItem('mobile-liquid-glass-performance')==='ultra'?'Ultra':'High';const theme=localStorage.getItem('mobile-liquid-glass-theme')||'Auto';const overlay=shell('Settings','Mobile-liquid-glass',`<section class="reference-profile"><span class="reference-avatar">●</span><div><strong>Student</strong><small>Mobile learning workspace</small></div></section><section class="reference-settings-card"><button data-theme>◌ <span>Appearance</span><em>${theme} ›</em></button><button data-performance>◉ <span>Performance</span><em>${perf} ›</em></button><button>◌ <span>Notifications</span><em>Enabled ›</em></button><button>⌘ <span>Privacy & Security</span><em>›</em></button><button>?</button><button>ⓘ <span>About App</span><em>Mobile-liquid-glass v1.0 ›</em></button></section>`,'more');qs(overlay,'[data-theme]').addEventListener('click',()=>cycleTheme(overlay));qs(overlay,'[data-performance]').addEventListener('click',()=>cyclePerformance(overlay));}
  function cycleTheme(overlay){const order=['Auto','Light','Dark'];const cur=localStorage.getItem('mobile-liquid-glass-theme')||'Auto';const next=order[(order.indexOf(cur)+1)%order.length];localStorage.setItem('mobile-liquid-glass-theme',next);document.documentElement.dataset.liquidTheme=next.toLowerCase();qs(overlay,'[data-theme] em').textContent=`${next} ›`;}
  function cyclePerformance(overlay){const next=localStorage.getItem('mobile-liquid-glass-performance')==='ultra'?'high':'ultra';localStorage.setItem('mobile-liquid-glass-performance',next);qs(overlay,'[data-performance] em').textContent=`${next==='ultra'?'Ultra':'High'} ›`;}

  function showMore(){const overlay=shell('Quick Access','Liquid Glass Studio',`<div class="reference-more-actions"><button data-open="notes">Notes</button><button data-open="overview">Overview</button><button data-open="settings">Settings</button><button data-open="courses">Course Folders</button><button data-open="add">Add New Course</button></div>`,'more');qsa(overlay,'[data-open]').forEach((b)=>b.addEventListener('click',()=>{const key=b.dataset.open;if(key==='notes')showNotes();else if(key==='overview')showOverview();else if(key==='settings')showSettings();else if(key==='add')showAddCourse();else showCourses();}));}

  function showAddCourse(){const overlay=shell('Add New Course','Create a new course',`<form class="reference-add-course" data-create-course><label>Course Name<input name="name" placeholder="e.g. Computer Science" required /></label><label>Description <span>(optional)</span><textarea name="description" placeholder="Brief description of your course…" rows="4"></textarea></label><span class="reference-field-label">Accent Color</span><div class="reference-colors">${['sky','violet','amber','emerald','rose','cyan'].map(c=>`<button type="button" data-color="${c}" class="${c==='sky'?'active':''}">${c}</button>`).join('')}</div><button class="reference-primary" type="submit">Create Course →</button></form>`,'');qsa(overlay,'[data-color]').forEach((b)=>b.addEventListener('click',()=>{qsa(overlay,'[data-color]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));qs(overlay,'[data-create-course]').addEventListener('submit',(e)=>{e.preventDefault();const form=e.currentTarget;const name=form.elements.name.value.trim();const desc=form.elements.description.value.trim();close();const trigger=qs(document,'.dashboard-screen .add-course-trigger');trigger?.click();setTimeout(()=>{const modal=qs(document,'.course-create-form');if(!modal)return;const inputs=qsa(modal,'input,textarea');if(inputs[0]){inputs[0].value=name;inputs[0].dispatchEvent(new Event('input',{bubbles:true}));}if(inputs[1]){inputs[1].value=desc;inputs[1].dispatchEvent(new Event('input',{bubbles:true}));}qs(modal,'button[type="submit"]')?.click();},60);});}

  function handle(e){if(e.defaultPrevented)return;const target=e.target.closest('button');if(!target)return;if(target.closest('.reference-interface-overlay'))return;const text=(target.textContent||'').trim();const dashboard=target.closest('.dashboard-screen');if(dashboard){if(target.classList.contains('action-card')){if(text.includes('Overview')){e.preventDefault();e.stopPropagation();showOverview();}else if(text.includes('Study Hub')){e.preventDefault();e.stopPropagation();showCourses();}}if(target.getAttribute('aria-label')==='Theme'||target.getAttribute('aria-label')==='Settings'){e.preventDefault();e.stopPropagation();showSettings();}if(target.classList.contains('add-course-trigger')){e.preventDefault();e.stopPropagation();showAddCourse();}if(target.matches('.dashboard-nav-item')){const key=target.dataset.dashboardNav;e.preventDefault();e.stopPropagation();if(key==='courses')showCourses();else if(key==='notes')showNotes();else if(key==='collections')showCollections();else if(key==='more')showMore();}}
    const courseScreen=target.closest('.course-details-screen');if(courseScreen&&target.closest('.course-mobile-nav')){const label=(target.textContent||'').trim().toLowerCase();e.preventDefault();e.stopPropagation();if(label.includes('more'))showMore();else if(label.includes('notes'))showNotes();else if(label.includes('collections'))showCollections();else if(label.includes('courses'))showCourses();else if(label.includes('home'))qs(courseScreen,'.back-button')?.click();}
  }
  document.addEventListener('click',handle,true);
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')close();});
})();
