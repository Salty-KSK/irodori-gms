// ============================================================
// GMS - Equipment Page (讖滓攝繝ｪ繧ｹ繝・
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, renderStars } from '../utils/format.js';
import {
  setPageTitle, showModal, hideModal, showSnackbar, confirmDialog,
  delegate, $, $$, collectFormData, populateForm, debounce,
  filterBySearch, sortData
} from '../utils/helpers.js';

export class EquipmentPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.sortField = 'name';
    this.sortDir = 'asc';
    this.currentCategory = 'all';
    this.currentStatus = 'all';
    this.categories = ['蜈ｨ縺ｦ', '繧ｫ繝｡繝ｩ繝懊ョ繧｣', '繝ｬ繝ｳ繧ｺ', '繧ｹ繝医Ο繝・, '荳芽・', '辣ｧ譏・, 'PC', '繧ｽ繝輔ヨ繧ｦ繧ｧ繧｢', '縺昴・莉・];
    this.statuses = ['蜈ｨ縺ｦ', '菴ｿ逕ｨ荳ｭ', '菫晉ｮ｡荳ｭ', '菫ｮ逅・ｸｭ'];
    this.conditions = ['譁ｰ蜩・, '濶ｯ螂ｽ', '繧・ｄ蜉｣蛹・, '隕∽ｿｮ逅・];
  }

  render() {
    return `
      <div class="page-equipment animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">讖滓攝繝ｪ繧ｹ繝・/h1>
            <p class="page-subtitle">繧ｫ繝｡繝ｩ繝ｻ繝ｬ繝ｳ繧ｺ繝ｻ讖滓攝縺ｮ邂｡逅・/p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="eqAddBtn">
              <span class="material-symbols-outlined">add</span>
              讖滓攝繧定ｿｽ蜉
            </button>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="eq-filter-section">
          <div class="eq-filter-row">
            <div class="chips-scroll" id="eqCategoryChips">
              ${this.categories.map(c => `
                <button class="chip ${c === '蜈ｨ縺ｦ' ? 'active' : ''}" data-category="${c}">${c}</button>
              `).join('')}
            </div>
          </div>
          <div class="eq-filter-row">
            <div class="chips-scroll" id="eqStatusChips">
              ${this.statuses.map(s => `
                <button class="chip ${s === '蜈ｨ縺ｦ' ? 'active' : ''}" data-status="${s}">${s}</button>
              `).join('')}
            </div>
            <div class="search-bar eq-search hidden-mobile">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="讖滓攝繧呈､懃ｴ｢..." id="eqSearchInput">
            </div>
          </div>
        </div>

        <!-- Stats (Hidden on Mobile if not enough space, or keep responsive) -->
        <div class="eq-stats stagger-children hidden-mobile" id="eqStats"></div>

        <!-- Table (Desktop View) -->
        <div class="data-table-wrapper hidden-mobile">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <span class="text-secondary" id="eqCount">0莉ｶ</span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" id="eqTable">
              <thead>
                <tr>
                  <th data-sort="name">讖滓攝蜷・<span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="brand">繝悶Λ繝ｳ繝・<span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="category">繧ｫ繝・ざ繝ｪ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="status">繧ｹ繝・・繧ｿ繧ｹ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="purchaseDate">雉ｼ蜈･譌･ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="purchasePrice">雉ｼ蜈･驥鷹｡・<span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="condition">繧ｳ繝ｳ繝・ぅ繧ｷ繝ｧ繝ｳ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                </tr>
              </thead>
              <tbody id="eqTableBody"></tbody>
            </table>
          </div>
          <div class="data-table-empty" id="eqEmpty" style="display:none;">
            <span class="material-symbols-outlined">camera</span>
            <p>讖滓攝縺檎匳骭ｲ縺輔ｌ縺ｦ縺・∪縺帙ｓ</p>
          </div>
        </div>

        <!-- Mobile List View -->
        <div class="mobile-search  mb-4">
          <div class="flex gap-2">
            <div class="search-bar" style="flex:1;">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="讖滓攝繧呈､懃ｴ｢..." id="eqSearchInputMobile">
            </div>
            <button class="btn btn-filled" id="eqAddBtnMobile" style="padding: 0 var(--space-3); height: 40px; min-width: 40px;">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
        <div class="mobile-list " id="eqMobileList"></div>
      </div>
    `;
  }

  init() {
    setPageTitle('讖滓攝繝ｪ繧ｹ繝・);
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('equipment');
    this.renderStats();
    this.renderList();
  }

  bindEvents() {
    // Add button
    $('#eqAddBtn')?.addEventListener('click', () => this.showAddModal());
    $('#eqAddBtnMobile')?.addEventListener('click', () => this.showAddModal());

    // Category filter
    delegate('#eqCategoryChips', '.chip', 'click', (e, target) => {
      $$('#eqCategoryChips .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentCategory = target.dataset.category;
      this.renderList();
    });

    // Status filter
    delegate('#eqStatusChips', '.chip', 'click', (e, target) => {
      $$('#eqStatusChips .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentStatus = target.dataset.status;
      this.renderList();
    });

    // Search (desktop)
    const searchInput = $('#eqSearchInput');
    searchInput?.addEventListener('input', debounce(() => {
      const val = searchInput.value;
      this.searchText = val;
      const mobileInput = $('#eqSearchInputMobile');
      if (mobileInput) mobileInput.value = val;
      this.renderList();
    }, 200));

    // Search (mobile)
    delegate('.page-equipment', '#eqSearchInputMobile', 'input', debounce((e) => {
      const val = e.target.value;
      this.searchText = val;
      const desktopInput = $('#eqSearchInput');
      if (desktopInput) desktopInput.value = val;
      this.renderList();
    }, 200));

    // Sort
    delegate('#eqTable thead', 'th[data-sort]', 'click', (e, target) => {
      const field = target.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      this.updateSortHeaders();
      this.renderList();
    });

    // Row click (Desktop)
    delegate('#eqTableBody', 'tr', 'click', (e, target) => {
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });

    // Mobile card click
    delegate('.page-equipment', '#eqMobileList .mobile-card', 'click', (e, target) => {
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });
  }

  getFilteredData() {
    let filtered = [...this.data];
    if (this.currentCategory !== '蜈ｨ縺ｦ' && this.currentCategory !== 'all') {
      filtered = filtered.filter(eq => eq.category === this.currentCategory);
    }
    if (this.currentStatus !== '蜈ｨ縺ｦ' && this.currentStatus !== 'all') {
      filtered = filtered.filter(eq => eq.status === this.currentStatus);
    }
    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['name', 'brand', 'model', 'category', 'serialNumber']);
    }
    return sortData(filtered, this.sortField, this.sortDir);
  }

  renderStats() {
    const total = this.data.length;
    const totalValue = this.data.reduce((sum, eq) => sum + (Number(eq.purchasePrice) || 0), 0);
    const inUse = this.data.filter(eq => eq.status === '菴ｿ逕ｨ荳ｭ').length;
    const inRepair = this.data.filter(eq => eq.status === '菫ｮ逅・ｸｭ').length;

    const statsEl = $('#eqStats');
    if (!statsEl) return;
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-primary-container); color: var(--md-primary-on-container);">
          <span class="material-symbols-outlined">camera</span>
        </div>
        <div class="stat-card-label">邱乗ｩ滓攝謨ｰ</div>
        <div class="stat-card-value">${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-tertiary-container); color: var(--md-tertiary-on-container);">
          <span class="material-symbols-outlined">payments</span>
        </div>
        <div class="stat-card-label">邱剰ｳ・肇鬘・/div>
        <div class="stat-card-value text-numeric">${formatCurrency(totalValue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-success-container); color: var(--md-on-success-container);">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-card-label">菴ｿ逕ｨ荳ｭ</div>
        <div class="stat-card-value">${inUse}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-warning-container); color: var(--md-on-warning-container);">
          <span class="material-symbols-outlined">build</span>
        </div>
        <div class="stat-card-label">菫ｮ逅・ｸｭ</div>
        <div class="stat-card-value">${inRepair}</div>
      </div>
    `;
  }

  renderList() {
    const filtered = this.getFilteredData();
    const tbody = $('#eqTableBody');
    const emptyEl = $('#eqEmpty');
    const countEl = $('#eqCount');
    const mobileList = $('#eqMobileList');

    if (countEl) countEl.textContent = `${filtered.length}莉ｶ`;

    if (filtered.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      if (mobileList) {
        mobileList.innerHTML = `
          <div class="mobile-empty">
            <span class="material-symbols-outlined">camera</span>
            <p>讖滓攝縺檎匳骭ｲ縺輔ｌ縺ｦ縺・∪縺帙ｓ</p>
          </div>
        `;
      }
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    if (tbody) {
      tbody.innerHTML = filtered.map(eq => `
        <tr data-id="${eq.id}" style="cursor:pointer;">
          <td>
            <div class="eq-name-cell">
              <span class="eq-name">${eq.name || '-'}</span>
              ${eq.model ? `<span class="eq-model">${eq.model}</span>` : ''}
            </div>
          </td>
          <td>${eq.brand || '-'}</td>
          <td><span class="chip eq-category-chip">${eq.category || '-'}</span></td>
          <td>${this.renderEquipmentStatus(eq.status)}</td>
          <td>${formatDate(eq.purchaseDate)}</td>
          <td class="text-numeric">${formatCurrency(eq.purchasePrice)}</td>
          <td>${this.renderCondition(eq.condition)}</td>
        </tr>
      `).join('');
    }

    if (mobileList) {
      mobileList.innerHTML = filtered.map(eq => `
        <div class="mobile-card" data-id="${eq.id}">
          <div class="mobile-card-avatar" style="background: var(--md-primary-container); color: var(--md-primary);">
            <span class="material-symbols-outlined">${this.getCategoryIcon(eq.category)}</span>
          </div>
          <div class="mobile-card-main">
            <div class="mobile-card-title">${eq.name || '-'}</div>
            <div class="mobile-card-sub">
              <span>${eq.brand || '-'}</span>
              ${eq.model ? `<span>ﾂｷ ${eq.model}</span>` : ''}
            </div>
            <div class="mobile-card-sub" style="margin-top: 4px;">
              <span class="chip chip-xs">${eq.category || '-'}</span>
              <span class="text-numeric" style="margin-left:8px; font-weight:600;">${formatCurrency(eq.purchasePrice)}</span>
            </div>
          </div>
          <div class="mobile-card-end">
            ${this.renderEquipmentStatus(eq.status)}
            <span class="material-symbols-outlined mobile-card-chevron">chevron_right</span>
          </div>
        </div>
      `).join('');
    }
  }

  renderEquipmentStatus(status) {
    if (!status) return '';
    const statusMap = {
      '菴ｿ逕ｨ荳ｭ': 'active',
      '菫晉ｮ｡荳ｭ': 'storage',
      '菫ｮ逅・ｸｭ': 'repair'
    };
    const cls = statusMap[status] || '';
    return `<span class="eq-status-chip eq-status-${cls}">${status}</span>`;
  }

  renderCondition(condition) {
    if (!condition) return '-';
    const condMap = {
      '譁ｰ蜩・: 'new',
      '濶ｯ螂ｽ': 'good',
      '繧・ｄ蜉｣蛹・: 'fair',
      '隕∽ｿｮ逅・: 'poor'
    };
    const cls = condMap[condition] || '';
    return `<span class="eq-condition eq-condition-${cls}">${condition}</span>`;
  }

  updateSortHeaders() {
    $$('#eqTable th[data-sort]').forEach(th => {
      th.classList.remove('sorted', 'sort-asc', 'sort-desc');
      if (th.dataset.sort === this.sortField) {
        th.classList.add('sorted', `sort-${this.sortDir}`);
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
      }
    });
  }

  showAddModal(editItem = null) {
    const isEdit = !!editItem;
    const title = isEdit ? '讖滓攝繧堤ｷｨ髮・ : '讖滓攝繧定ｿｽ蜉';
    const suppliers = store.getAll('suppliers');

    const bodyHtml = `
      <form id="eqForm" class="eq-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">讖滓攝蜷・/label>
            <input type="text" class="form-input" name="name" required placeholder="萓・ Sony ﾎｱ7 IV">
          </div>
          <div class="form-group">
            <label class="form-label">繝悶Λ繝ｳ繝・/label>
            <input type="text" class="form-input" name="brand" placeholder="萓・ Sony">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">繝｢繝・Ν</label>
            <input type="text" class="form-input" name="model" placeholder="萓・ ILCE-7M4">
          </div>
          <div class="form-group">
            <label class="form-label required">繧ｫ繝・ざ繝ｪ</label>
            <select class="form-select" name="category" required>
              <option value="">驕ｸ謚槭＠縺ｦ縺上□縺輔＞</option>
              ${this.categories.filter(c => c !== '蜈ｨ縺ｦ').map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">繧ｷ繝ｪ繧｢繝ｫ逡ｪ蜿ｷ</label>
            <input type="text" class="form-input" name="serialNumber" placeholder="萓・ SN12345678">
          </div>
          <div class="form-group">
            <label class="form-label">雉ｼ蜈･譌･</label>
            <input type="date" class="form-input" name="purchaseDate">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">雉ｼ蜈･驥鷹｡・/label>
            <input type="number" class="form-input" name="purchasePrice" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">莉募・繧悟・</label>
            <select class="form-select" name="supplierId">
              <option value="">驕ｸ謚槭＠縺ｦ縺上□縺輔＞</option>
              ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">繧ｹ繝・・繧ｿ繧ｹ</label>
            <select class="form-select" name="status">
              ${this.statuses.filter(s => s !== '蜈ｨ縺ｦ').map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">繧ｳ繝ｳ繝・ぅ繧ｷ繝ｧ繝ｳ</label>
            <select class="form-select" name="condition">
              <option value="">驕ｸ謚槭＠縺ｦ縺上□縺輔＞</option>
              ${this.conditions.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">菫晁ｨｼ譛滄剞</label>
          <input type="date" class="form-input" name="warrantyExpiry">
        </div>
        <div class="form-group">
          <label class="form-label">蛯呵・/label>
          <textarea class="form-textarea" name="notes" rows="3" placeholder="繝｡繝｢..."></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="eqFormCancel">繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn btn-filled" id="eqFormSave">${isEdit ? '譖ｴ譁ｰ' : '霑ｽ蜉'}</button>
    `;

    showModal(title, bodyHtml, footerHtml);

    if (isEdit) {
      setTimeout(() => {
        const form = $('#eqForm');
        if (form) populateForm(form, editItem);
      }, 50);
    }

    setTimeout(() => {
      $('#eqFormCancel')?.addEventListener('click', hideModal);
      $('#eqFormSave')?.addEventListener('click', () => {
        const form = $('#eqForm');
        if (!form || !form.checkValidity()) {
          form?.reportValidity();
          return;
        }
        const data = collectFormData(form);
        if (isEdit) {
          store.update('equipment', editItem.id, data);
          showSnackbar('讖滓攝繧呈峩譁ｰ縺励∪縺励◆', 'success');
        } else {
          store.add('equipment', data);
          showSnackbar('讖滓攝繧定ｿｽ蜉縺励∪縺励◆', 'success');
        }
        hideModal();
        this.loadData();
      });
    }, 50);
  }

  showDetailModal(id) {
    const eq = store.getById('equipment', id);
    if (!eq) return;

    const supplier = eq.supplierId ? store.getById('suppliers', eq.supplierId) : null;
    const maintenanceLog = eq.maintenanceLog || [];

    const bodyHtml = `
      <div class="eq-detail">
        <div class="eq-detail-header">
          <div class="eq-detail-icon">
            <span class="material-symbols-outlined">${this.getCategoryIcon(eq.category)}</span>
          </div>
          <div class="eq-detail-info">
            <h3 class="eq-detail-name">${eq.name || '-'}</h3>
            <p class="eq-detail-model">${eq.brand || ''} ${eq.model || ''}</p>
          </div>
          <div class="eq-detail-status">
            ${this.renderEquipmentStatus(eq.status)}
          </div>
        </div>

        <div class="eq-detail-grid">
          <div class="eq-detail-item">
            <span class="eq-detail-label">繧ｫ繝・ざ繝ｪ</span>
            <span class="eq-detail-value">${eq.category || '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">繧ｷ繝ｪ繧｢繝ｫ逡ｪ蜿ｷ</span>
            <span class="eq-detail-value">${eq.serialNumber || '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">雉ｼ蜈･譌･</span>
            <span class="eq-detail-value">${formatDate(eq.purchaseDate)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">雉ｼ蜈･驥鷹｡・/span>
            <span class="eq-detail-value text-numeric">${formatCurrency(eq.purchasePrice)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">莉募・繧悟・</span>
            <span class="eq-detail-value">${supplier ? supplier.name : '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">繧ｳ繝ｳ繝・ぅ繧ｷ繝ｧ繝ｳ</span>
            <span class="eq-detail-value">${this.renderCondition(eq.condition)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">菫晁ｨｼ譛滄剞</span>
            <span class="eq-detail-value">${formatDate(eq.warrantyExpiry)}</span>
          </div>
        </div>

        ${eq.notes ? `
          <div class="eq-detail-notes">
            <span class="eq-detail-label">蛯呵・/span>
            <p>${eq.notes}</p>
          </div>
        ` : ''}

        <div class="divider" style="margin: var(--space-5) 0;"></div>

        <!-- Maintenance Log -->
        <div class="eq-maintenance-section">
          <div class="eq-maintenance-header">
            <h4>繝｡繝ｳ繝・リ繝ｳ繧ｹ螻･豁ｴ</h4>
            <button class="btn btn-tonal btn-sm" id="eqAddMaintenance" data-id="${eq.id}">
              <span class="material-symbols-outlined">add</span>
              霑ｽ蜉
            </button>
          </div>
          ${maintenanceLog.length > 0 ? `
            <table class="data-table eq-maintenance-table">
              <thead>
                <tr>
                  <th>譌･莉・/th>
                  <th>繧ｿ繧､繝・/th>
                  <th>蜀・ｮｹ</th>
                  <th>雋ｻ逕ｨ</th>
                </tr>
              </thead>
              <tbody>
                ${maintenanceLog.map((log, idx) => `
                  <tr>
                    <td>${formatDate(log.date)}</td>
                    <td><span class="chip">${log.type || '-'}</span></td>
                    <td>${log.description || '-'}</td>
                    <td class="text-numeric">${log.cost ? formatCurrency(log.cost) : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="eq-maintenance-empty">
              <span class="material-symbols-outlined">build</span>
              <p>繝｡繝ｳ繝・リ繝ｳ繧ｹ螻･豁ｴ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
            </div>
          `}
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-text" style="color: var(--md-error);" id="eqDetailDelete" data-id="${eq.id}">蜑企勁</button>
      <div style="flex:1;"></div>
      <button class="btn btn-outlined" id="eqDetailEdit" data-id="${eq.id}">邱ｨ髮・/button>
      <button class="btn btn-text" id="eqDetailClose">髢峨§繧・/button>
    `;

    showModal('讖滓攝隧ｳ邏ｰ', bodyHtml, footerHtml, { large: true });

    setTimeout(() => {
      $('#eqDetailClose')?.addEventListener('click', hideModal);
      $('#eqDetailEdit')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showAddModal(eq), 200);
      });
      $('#eqDetailDelete')?.addEventListener('click', async () => {
        const confirmed = await confirmDialog('讖滓攝縺ｮ蜑企勁', `縲・{eq.name}縲阪ｒ蜑企勁縺励∪縺吶°・溘％縺ｮ謫堺ｽ懊・蜿悶ｊ豸医○縺ｾ縺帙ｓ縲Ａ);
        if (confirmed) {
          store.delete('equipment', eq.id);
          showSnackbar('讖滓攝繧貞炎髯､縺励∪縺励◆');
          this.loadData();
        }
      });
      $('#eqAddMaintenance')?.addEventListener('click', () => {
        this.showAddMaintenanceModal(eq.id);
      });
    }, 50);
  }

  showAddMaintenanceModal(equipmentId) {
    const bodyHtml = `
      <form id="eqMaintForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">譌･莉・/label>
            <input type="date" class="form-input" name="date" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label required">繧ｿ繧､繝・/label>
            <select class="form-select" name="type" required>
              <option value="">驕ｸ謚槭＠縺ｦ縺上□縺輔＞</option>
              <option value="貂・祉">貂・祉</option>
              <option value="菫ｮ逅・>菫ｮ逅・/option>
              <option value="轤ｹ讀・>轤ｹ讀・/option>
              <option value="繝代・繝・ｺ､謠・>繝代・繝・ｺ､謠・/option>
              <option value="繝輔ぃ繝ｼ繝繧ｦ繧ｧ繧｢譖ｴ譁ｰ">繝輔ぃ繝ｼ繝繧ｦ繧ｧ繧｢譖ｴ譁ｰ</option>
              <option value="縺昴・莉・>縺昴・莉・/option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">蜀・ｮｹ</label>
          <textarea class="form-textarea" name="description" rows="3" placeholder="繝｡繝ｳ繝・リ繝ｳ繧ｹ蜀・ｮｹ繧貞・蜉・.."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">雋ｻ逕ｨ</label>
          <input type="number" class="form-input" name="cost" placeholder="0" min="0">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="eqMaintCancel">繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn btn-filled" id="eqMaintSave">霑ｽ蜉</button>
    `;

    showModal('繝｡繝ｳ繝・リ繝ｳ繧ｹ霑ｽ蜉', bodyHtml, footerHtml);

    setTimeout(() => {
      $('#eqMaintCancel')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showDetailModal(equipmentId), 200);
      });
      $('#eqMaintSave')?.addEventListener('click', () => {
        const form = $('#eqMaintForm');
        if (!form || !form.checkValidity()) {
          form?.reportValidity();
          return;
        }
        const data = collectFormData(form);
        const eq = store.getById('equipment', equipmentId);
        if (eq) {
          const maintenanceLog = eq.maintenanceLog || [];
          maintenanceLog.push(data);
          store.update('equipment', equipmentId, { maintenanceLog });
          showSnackbar('繝｡繝ｳ繝・リ繝ｳ繧ｹ螻･豁ｴ繧定ｿｽ蜉縺励∪縺励◆', 'success');
          this.loadData();
          hideModal();
          setTimeout(() => this.showDetailModal(equipmentId), 200);
        }
      });
    }, 50);
  }

  getCategoryIcon(category) {
    const icons = {
      '繧ｫ繝｡繝ｩ繝懊ョ繧｣': 'photo_camera',
      '繝ｬ繝ｳ繧ｺ': 'camera',
      '繧ｹ繝医Ο繝・: 'flash_on',
      '荳芽・': 'filter_frames',
      '辣ｧ譏・: 'light',
      'PC': 'computer',
      '繧ｽ繝輔ヨ繧ｦ繧ｧ繧｢': 'code',
      '縺昴・莉・: 'devices_other'
    };
    return icons[category] || 'camera';
  }
}
