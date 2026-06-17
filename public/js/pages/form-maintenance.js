// js/pages/form-maintenance.js
// Admin page: dynamically manage all FORM_CONFIGS sections & fields

const FormMaintenance = {
  STORAGE_KEY: "mpc_form_configs_overrides",
  activeFormKey: null,
  activeSectionIdx: null,
  dragSrc: null,

  // ── Bootstrap ──────────────────────────────────────────────
  init() {
    this._loadOverrides();
  },

  _loadOverrides() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const overrides = JSON.parse(raw);
      Object.entries(overrides).forEach(([key, cfg]) => {
        if (window.FORM_CONFIGS[key]) {
          window.FORM_CONFIGS[key].sections = cfg.sections;
          window.FORM_CONFIGS[key].title    = cfg.title;
          window.FORM_CONFIGS[key].subtitle = cfg.subtitle;
        }
      });
    } catch (e) { console.warn("FormMaintenance: could not load overrides", e); }
  },

  _saveOverrides() {
    const payload = {};
    Object.entries(window.FORM_CONFIGS).forEach(([key, cfg]) => {
      payload[key] = { title: cfg.title, subtitle: cfg.subtitle, sections: cfg.sections };
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
  },

  _cfg(key) { return window.FORM_CONFIGS[key]; },

  // ── Main render ────────────────────────────────────────────
  render() {
    const formKeys = Object.keys(window.FORM_CONFIGS);
    if (!this.activeFormKey) this.activeFormKey = formKeys[0];

    document.getElementById("page-content").innerHTML = `
      <div class="animate-fade space-y-4">

        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display font-bold text-xl text-slate-800">Form Maintenance</h2>
            <p class="text-sm text-slate-400 mt-0.5">Add, edit or delete sections and fields for any request form.</p>
          </div>
          <button onclick="FormMaintenance.openAddFormModal()" class="btn btn-primary btn-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            New Form Type
          </button>
        </div>

        <!-- Form Type Tabs -->
        <div class="flex flex-wrap gap-2" id="fm-form-tabs">
          ${formKeys.map(key => {
            const cfg = this._cfg(key);
            const active = key === this.activeFormKey;
            return `
              <button onclick="FormMaintenance.selectForm('${key}')"
                class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${active ? 'border-current text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}"
                style="${active ? `background:${cfg.color};border-color:${cfg.color}` : ''}">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="${active ? 'background:rgba(255,255,255,0.2);color:white' : `background:${cfg.bgColor};color:${cfg.color}`}">${cfg.code}</span>
                <span class="hidden sm:inline">${cfg.title.replace(' REQUEST FORM','').replace(' REGISTRATION','').replace(' DATA MAINTENANCE','')}</span>
              </button>`;
          }).join('')}
        </div>

        <!-- Active form editor -->
        ${this._renderFormEditor(this.activeFormKey)}
      </div>
    `;
  },

  selectForm(key) {
    this.activeFormKey = key;
    this.activeSectionIdx = null;
    this.render();
  },

  _renderFormEditor(key) {
    const cfg = this._cfg(key);
    return `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        <!-- Form meta bar -->
        <div class="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-4" style="background:${cfg.bgColor}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold px-2 py-0.5 rounded-full text-white" style="background:${cfg.color}">${cfg.code}</span>
              <span class="font-display font-bold text-slate-800 text-base truncate">${cfg.title}</span>
            </div>
            <p class="text-xs text-slate-500">${cfg.subtitle}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="FormMaintenance.openEditFormMetaModal('${key}')" class="btn btn-secondary btn-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
              Edit Meta
            </button>
            <button onclick="FormMaintenance.addSection('${key}')" class="btn btn-primary btn-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Add Section
            </button>
          </div>
        </div>

        <!-- Sections list -->
        <div class="divide-y divide-slate-100" id="fm-sections-list">
          ${cfg.sections.map((sec, si) => this._renderSectionRow(key, sec, si, cfg)).join('')}
          ${cfg.sections.length === 0 ? '<div class="p-10 text-center text-slate-400 text-sm">No sections yet. Click <strong>Add Section</strong> to get started.</div>' : ''}
        </div>
      </div>
    `;
  },

  _renderSectionRow(key, sec, si, cfg) {
    const isOpen = this.activeSectionIdx === si;
    return `
      <div class="fm-section" data-si="${si}">
        <!-- Section header -->
        <div class="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors group"
             onclick="FormMaintenance.toggleSection(${si})">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${cfg.color}">${si+1}</div>
          <span class="flex-1 font-semibold text-slate-700 text-sm">${this._esc(sec.heading)}</span>
          <span class="text-xs text-slate-400">${sec.fields.length} field${sec.fields.length !== 1 ? 's' : ''}</span>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
            <button title="Move up" onclick="FormMaintenance.moveSection('${key}',${si},-1)" class="btn btn-secondary btn-sm px-2 py-1">↑</button>
            <button title="Move down" onclick="FormMaintenance.moveSection('${key}',${si},1)" class="btn btn-secondary btn-sm px-2 py-1">↓</button>
            <button onclick="FormMaintenance.editSection('${key}',${si})" class="btn btn-secondary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
            </button>
            <button onclick="FormMaintenance.deleteSection('${key}',${si})" class="btn btn-danger btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            </button>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </div>

        <!-- Fields panel (collapsed/expanded) -->
        ${isOpen ? `
        <div class="bg-slate-50 border-t border-slate-100 px-5 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fields</span>
            <button onclick="FormMaintenance.openAddFieldModal('${key}',${si})" class="btn btn-primary btn-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Add Field
            </button>
          </div>
          ${sec.fields.length === 0
            ? '<p class="text-sm text-slate-400 text-center py-4">No fields yet.</p>'
            : `<div class="space-y-2" id="fm-fields-${si}">
                ${sec.fields.map((f, fi) => this._renderFieldRow(key, si, f, fi, cfg)).join('')}
               </div>`}
        </div>` : ''}
      </div>
    `;
  },

  _renderFieldRow(key, si, f, fi, cfg) {
    const typeLabel = { text:'Text', email:'Email', date:'Date', select:'Select', textarea:'Textarea', 'radio-group':'Radio', 'checkbox-group':'Checkbox' }[f.type] || f.type;
    const colLabel = f.colSpan === 'full' ? 'Full width' : 'Half width';
    return `
      <div class="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5 group hover:border-slate-300 transition-colors">
        <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${cfg.color}"></div>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-slate-700 truncate">${this._esc(f.label)}</span>
            ${f.required ? '<span class="text-xs text-red-500 font-bold">*Required</span>' : ''}
          </div>
          <div class="flex flex-wrap gap-2 mt-0.5">
            <span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:${cfg.bgColor};color:${cfg.color}">${typeLabel}</span>
            <span class="text-xs text-slate-400">${colLabel}</span>
            <span class="text-xs text-slate-400 font-mono">id: ${f.id}</span>
            ${f.options ? `<span class="text-xs text-slate-400">${f.options.length} option${f.options.length!==1?'s':''}</span>` : ''}
          </div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button title="Move up" onclick="FormMaintenance.moveField('${key}',${si},${fi},-1)" class="btn btn-secondary btn-sm px-2 py-1 text-xs">↑</button>
          <button title="Move down" onclick="FormMaintenance.moveField('${key}',${si},${fi},1)" class="btn btn-secondary btn-sm px-2 py-1 text-xs">↓</button>
          <button onclick="FormMaintenance.openEditFieldModal('${key}',${si},${fi})" class="btn btn-secondary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
          </button>
          <button onclick="FormMaintenance.deleteField('${key}',${si},${fi})" class="btn btn-danger btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
          </button>
        </div>
      </div>`;
  },

  toggleSection(si) {
    this.activeSectionIdx = this.activeSectionIdx === si ? null : si;
    this.render();
  },

  // ── Section CRUD ───────────────────────────────────────────
  addSection(key) {
    this._openModal('Add Section', `
      <div class="space-y-4">
        <div>
          <label class="form-label">Section Heading <span class="text-red-500">*</span></label>
          <input id="fm-sec-heading" type="text" class="form-input" placeholder="e.g. GENERAL DATA">
        </div>
      </div>
    `, () => {
      const heading = document.getElementById('fm-sec-heading').value.trim();
      if (!heading) { alert('Section heading is required.'); return false; }
      this._cfg(key).sections.push({ heading, fields: [] });
      this.activeSectionIdx = this._cfg(key).sections.length - 1;
      this._saveOverrides();
      this.render();
      return true;
    });
  },

  editSection(key, si) {
    const sec = this._cfg(key).sections[si];
    this._openModal('Edit Section', `
      <div class="space-y-4">
        <div>
          <label class="form-label">Section Heading <span class="text-red-500">*</span></label>
          <input id="fm-sec-heading" type="text" class="form-input" value="${this._esc(sec.heading)}">
        </div>
      </div>
    `, () => {
      const heading = document.getElementById('fm-sec-heading').value.trim();
      if (!heading) { alert('Heading required.'); return false; }
      sec.heading = heading;
      this._saveOverrides();
      this.render();
      return true;
    });
  },

  deleteSection(key, si) {
    const sec = this._cfg(key).sections[si];
    if (!confirm(`Delete section "${sec.heading}" and all its ${sec.fields.length} field(s)?`)) return;
    this._cfg(key).sections.splice(si, 1);
    if (this.activeSectionIdx >= this._cfg(key).sections.length) this.activeSectionIdx = null;
    this._saveOverrides();
    this.render();
  },

  moveSection(key, si, dir) {
    const secs = this._cfg(key).sections;
    const ni = si + dir;
    if (ni < 0 || ni >= secs.length) return;
    [secs[si], secs[ni]] = [secs[ni], secs[si]];
    if (this.activeSectionIdx === si) this.activeSectionIdx = ni;
    this._saveOverrides();
    this.render();
  },

  // ── Field CRUD ─────────────────────────────────────────────
  openAddFieldModal(key, si) {
    this._openFieldModal(key, si, null);
  },

  openEditFieldModal(key, si, fi) {
    this._openFieldModal(key, si, fi);
  },

  _openFieldModal(key, si, fi) {
    const isEdit = fi !== null && fi !== undefined;
    const existing = isEdit ? this._cfg(key).sections[si].fields[fi] : null;

    const optionsValue = existing?.options ? existing.options.join('\n') : '';
    const needsOptions = existing ? ['radio-group','checkbox-group','select'].includes(existing.type) : false;

    this._openModal(isEdit ? 'Edit Field' : 'Add Field', `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Label <span class="text-red-500">*</span></label>
            <input id="fm-f-label" type="text" class="form-input" value="${this._esc(existing?.label || '')}" placeholder="e.g. Material No.">
          </div>
          <div>
            <label class="form-label">Field ID <span class="text-red-500">*</span></label>
            <input id="fm-f-id" type="text" class="form-input font-mono text-sm" value="${this._esc(existing?.id || '')}" placeholder="e.g. material_no" ${isEdit ? 'readonly style="background:#f8fafc"' : ''}>
            ${isEdit ? '' : '<p class="text-xs text-slate-400 mt-1">Use snake_case, no spaces</p>'}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Field Type <span class="text-red-500">*</span></label>
            <select id="fm-f-type" class="form-input" onchange="FormMaintenance._toggleOptionsArea()">
              ${['text','email','date','select','textarea','radio-group','checkbox-group'].map(t =>
                `<option value="${t}" ${existing?.type===t?'selected':''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Column Span</label>
            <select id="fm-f-col" class="form-input">
              <option value="half" ${existing?.colSpan==='half'||!existing?'selected':''}>Half width</option>
              <option value="full" ${existing?.colSpan==='full'?'selected':''}>Full width</option>
            </select>
          </div>
        </div>
        <div>
          <label class="form-label">Placeholder</label>
          <input id="fm-f-placeholder" type="text" class="form-input" value="${this._esc(existing?.placeholder || '')}" placeholder="_____">
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="fm-f-required" class="w-4 h-4 accent-blue-600" ${existing?.required ? 'checked' : ''}>
          <label for="fm-f-required" class="text-sm text-slate-700 cursor-pointer">Required field</label>
        </div>
        <div id="fm-options-area" style="${needsOptions ? '' : 'display:none'}">
          <label class="form-label">Options <span class="text-xs text-slate-400">(one per line)</span></label>
          <textarea id="fm-f-options" class="form-input font-mono text-sm" rows="5" placeholder="Option 1&#10;Option 2&#10;Option 3">${this._esc(optionsValue)}</textarea>
        </div>
      </div>
    `, () => {
      const label  = document.getElementById('fm-f-label').value.trim();
      const id     = document.getElementById('fm-f-id').value.trim().replace(/\s+/g,'_');
      const type   = document.getElementById('fm-f-type').value;
      const col    = document.getElementById('fm-f-col').value;
      const ph     = document.getElementById('fm-f-placeholder').value.trim();
      const req    = document.getElementById('fm-f-required').checked;
      const optsRaw= document.getElementById('fm-f-options').value;

      if (!label) { alert('Label is required.'); return false; }
      if (!id)    { alert('Field ID is required.'); return false; }
      if (!/^[a-z0-9_]+$/.test(id)) { alert('Field ID must be snake_case (a-z, 0-9, _).'); return false; }

      const field = { id, label, type, colSpan: col };
      if (ph) field.placeholder = ph;
      if (req) field.required = true;

      const needsOpts = ['radio-group','checkbox-group','select'].includes(type);
      if (needsOpts) {
        const opts = optsRaw.split('\n').map(o => o.trim()).filter(Boolean);
        if (opts.length === 0) { alert('Please add at least one option.'); return false; }
        field.options = opts;
      }

      const fields = this._cfg(key).sections[si].fields;
      if (isEdit) {
        fields[fi] = field;
      } else {
        // check duplicate id in section
        if (fields.some(f => f.id === id)) { alert(`Field ID "${id}" already exists in this section.`); return false; }
        fields.push(field);
      }
      this._saveOverrides();
      this.activeSectionIdx = si;
      this.render();
      return true;
    });

    // init options area visibility after modal opens
    setTimeout(() => this._toggleOptionsArea(), 50);
  },

  _toggleOptionsArea() {
    const type = document.getElementById('fm-f-type')?.value;
    const area = document.getElementById('fm-options-area');
    if (!area) return;
    const needs = ['radio-group','checkbox-group','select'].includes(type);
    area.style.display = needs ? '' : 'none';
  },

  deleteField(key, si, fi) {
    const f = this._cfg(key).sections[si].fields[fi];
    if (!confirm(`Delete field "${f.label}"?`)) return;
    this._cfg(key).sections[si].fields.splice(fi, 1);
    this._saveOverrides();
    this.activeSectionIdx = si;
    this.render();
  },

  moveField(key, si, fi, dir) {
    const fields = this._cfg(key).sections[si].fields;
    const ni = fi + dir;
    if (ni < 0 || ni >= fields.length) return;
    [fields[fi], fields[ni]] = [fields[ni], fields[fi]];
    this._saveOverrides();
    this.activeSectionIdx = si;
    this.render();
  },

  // ── Form Meta ──────────────────────────────────────────────
  openEditFormMetaModal(key) {
    const cfg = this._cfg(key);
    this._openModal('Edit Form Info', `
      <div class="space-y-4">
        <div>
          <label class="form-label">Form Title <span class="text-red-500">*</span></label>
          <input id="fm-meta-title" type="text" class="form-input" value="${this._esc(cfg.title)}">
        </div>
        <div>
          <label class="form-label">Subtitle / Description</label>
          <input id="fm-meta-subtitle" type="text" class="form-input" value="${this._esc(cfg.subtitle)}">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Primary Color</label>
            <div class="flex gap-2">
              <input type="color" id="fm-meta-color" class="w-12 h-10 rounded border border-slate-200 cursor-pointer" value="${cfg.color}">
              <input type="text" id="fm-meta-color-hex" class="form-input font-mono text-sm" value="${cfg.color}" oninput="document.getElementById('fm-meta-color').value=this.value">
            </div>
          </div>
          <div>
            <label class="form-label">Background Color</label>
            <div class="flex gap-2">
              <input type="color" id="fm-meta-bg" class="w-12 h-10 rounded border border-slate-200 cursor-pointer" value="${cfg.bgColor}">
              <input type="text" id="fm-meta-bg-hex" class="form-input font-mono text-sm" value="${cfg.bgColor}" oninput="document.getElementById('fm-meta-bg').value=this.value">
            </div>
          </div>
        </div>
      </div>
    `, () => {
      const title    = document.getElementById('fm-meta-title').value.trim();
      const subtitle = document.getElementById('fm-meta-subtitle').value.trim();
      const color    = document.getElementById('fm-meta-color').value;
      const bgColor  = document.getElementById('fm-meta-bg').value;
      if (!title) { alert('Title required.'); return false; }
      cfg.title    = title;
      cfg.subtitle = subtitle;
      cfg.color    = color;
      cfg.bgColor  = bgColor;
      this._saveOverrides();
      this.render();
      return true;
    });
  },

  openAddFormModal() {
    this._openModal('New Form Type', `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Form Key <span class="text-red-500">*</span></label>
            <input id="fm-new-key" type="text" class="form-input font-mono" placeholder="e.g. ASSET">
            <p class="text-xs text-slate-400 mt-1">UPPERCASE, no spaces</p>
          </div>
          <div>
            <label class="form-label">Code <span class="text-red-500">*</span></label>
            <input id="fm-new-code" type="text" class="form-input" placeholder="e.g. AMRF">
          </div>
        </div>
        <div>
          <label class="form-label">Form Title <span class="text-red-500">*</span></label>
          <input id="fm-new-title" type="text" class="form-input" placeholder="e.g. ASSET MAINTENANCE REQUEST FORM">
        </div>
        <div>
          <label class="form-label">Subtitle</label>
          <input id="fm-new-subtitle" type="text" class="form-input" placeholder="e.g. AMRF — Fill in asset details">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Primary Color</label>
            <input type="color" id="fm-new-color" class="w-full h-10 rounded border border-slate-200 cursor-pointer" value="#2533e0">
          </div>
          <div>
            <label class="form-label">Background Color</label>
            <input type="color" id="fm-new-bg" class="w-full h-10 rounded border border-slate-200 cursor-pointer" value="#e0e7ff">
          </div>
        </div>
      </div>
    `, () => {
      const key      = document.getElementById('fm-new-key').value.trim().toUpperCase();
      const code     = document.getElementById('fm-new-code').value.trim().toUpperCase();
      const title    = document.getElementById('fm-new-title').value.trim();
      const subtitle = document.getElementById('fm-new-subtitle').value.trim();
      const color    = document.getElementById('fm-new-color').value;
      const bgColor  = document.getElementById('fm-new-bg').value;
      if (!key || !code || !title) { alert('Key, Code and Title are required.'); return false; }
      if (window.FORM_CONFIGS[key]) { alert(`Form key "${key}" already exists.`); return false; }
      if (!/^[A-Z0-9_]+$/.test(key)) { alert('Key must be uppercase letters/numbers/underscores.'); return false; }
      window.FORM_CONFIGS[key] = { title, subtitle, code, color, bgColor, sections: [] };
      this._saveOverrides();
      this.activeFormKey = key;
      this.activeSectionIdx = null;
      this.render();
      return true;
    });
  },

  // ── Generic modal helper ───────────────────────────────────
  _openModal(title, bodyHtml, onConfirm) {
    // Remove any existing FM modal
    document.getElementById('fm-modal')?.remove();

    const el = document.createElement('div');
    el.id = 'fm-modal';
    el.className = 'modal-overlay';
    el.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;align-items:center;justify-content:center;padding:1rem;';
    el.innerHTML = `
      <div class="modal w-full" style="max-width:560px;max-height:88vh;display:flex;flex-direction:column;border-radius:1.25rem;">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 class="font-display font-bold text-lg text-slate-800">${title}</h3>
          <button onclick="document.getElementById('fm-modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-5 overflow-y-auto flex-1">${bodyHtml}</div>
        <div class="p-5 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0">
          <button onclick="document.getElementById('fm-modal').remove()" class="btn btn-secondary">Cancel</button>
          <button id="fm-modal-confirm" class="btn btn-primary">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('fm-modal-confirm').addEventListener('click', () => {
      const ok = onConfirm();
      if (ok !== false) document.getElementById('fm-modal')?.remove();
    });

    el.addEventListener('click', e => { if (e.target === el) el.remove(); });

    // focus first input
    setTimeout(() => el.querySelector('input[type=text],input[type=email]')?.focus(), 80);
  },

  _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};

window.FormMaintenance = FormMaintenance;

function renderFormMaintenance() {
  FormMaintenance.render();
}
