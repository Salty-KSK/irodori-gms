// ============================================================
// GMS - Equipment Page (機材リスト)
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
    this.categories = ['全て', 'カメラボディ', 'レンズ', 'ストロボ', '三脚', '照明', 'PC', 'ソフトウェア', 'その他'];
    this.statuses = ['全て', '使用中', '保管中', '修理中'];
    this.conditions = ['新品', '良好', 'やや劣化', '要修理'];
  }

  render() {
    return `
      <div class="page-equipment animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">機材リスト</h1>
            <p class="page-subtitle">カメラ・レンズ・機材の管理</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="eqAddBtn">
              <span class="material-symbols-outlined">add</span>
              機材を追加
            </button>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="eq-filter-section">
          <div class="eq-filter-row">
            <div class="chips-scroll" id="eqCategoryChips">
              ${this.categories.map(c => `
                <button class="chip ${c === '全て' ? 'active' : ''}" data-category="${c}">${c}</button>
              `).join('')}
            </div>
          </div>
          <div class="eq-filter-row">
            <div class="chips-scroll" id="eqStatusChips">
              ${this.statuses.map(s => `
                <button class="chip ${s === '全て' ? 'active' : ''}" data-status="${s}">${s}</button>
              `).join('')}
            </div>
            <div class="search-bar eq-search hidden-mobile">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="機材を検索..." id="eqSearchInput">
            </div>
          </div>
        </div>

        <!-- Stats (Hidden on Mobile if not enough space, or keep responsive) -->
        <div class="eq-stats stagger-children hidden-mobile" id="eqStats"></div>

        <!-- Table (Desktop View) -->
        <div class="data-table-wrapper hidden-mobile">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <span class="text-secondary" id="eqCount">0件</span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" id="eqTable">
              <thead>
                <tr>
                  <th data-sort="name">機材名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="brand">ブランド <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="category">カテゴリ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="status">ステータス <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="purchaseDate">購入日 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="purchasePrice">購入金額 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="condition">コンディション <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                </tr>
              </thead>
              <tbody id="eqTableBody"></tbody>
            </table>
          </div>
          <div class="data-table-empty" id="eqEmpty" style="display:none;">
            <span class="material-symbols-outlined">camera</span>
            <p>機材が登録されていません</p>
          </div>
        </div>

        <!-- Mobile List View -->
        <div class="mobile-search hidden-desktop mb-4">
          <div class="flex gap-2">
            <div class="search-bar" style="flex:1;">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="機材を検索..." id="eqSearchInputMobile">
            </div>
            <button class="btn btn-filled" id="eqAddBtnMobile" style="padding: 0 var(--space-3); height: 40px; min-width: 40px;">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
        <div class="mobile-list hidden-desktop" id="eqMobileList"></div>
      </div>
    `;
  }

  init() {
    setPageTitle('機材リスト');
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
    if (this.currentCategory !== '全て' && this.currentCategory !== 'all') {
      filtered = filtered.filter(eq => eq.category === this.currentCategory);
    }
    if (this.currentStatus !== '全て' && this.currentStatus !== 'all') {
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
    const inUse = this.data.filter(eq => eq.status === '使用中').length;
    const inRepair = this.data.filter(eq => eq.status === '修理中').length;

    const statsEl = $('#eqStats');
    if (!statsEl) return;
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-primary-container); color: var(--md-primary-on-container);">
          <span class="material-symbols-outlined">camera</span>
        </div>
        <div class="stat-card-label">総機材数</div>
        <div class="stat-card-value">${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-tertiary-container); color: var(--md-tertiary-on-container);">
          <span class="material-symbols-outlined">payments</span>
        </div>
        <div class="stat-card-label">総資産額</div>
        <div class="stat-card-value text-numeric">${formatCurrency(totalValue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-success-container); color: var(--md-on-success-container);">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-card-label">使用中</div>
        <div class="stat-card-value">${inUse}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-warning-container); color: var(--md-on-warning-container);">
          <span class="material-symbols-outlined">build</span>
        </div>
        <div class="stat-card-label">修理中</div>
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

    if (countEl) countEl.textContent = `${filtered.length}件`;

    if (filtered.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      if (mobileList) {
        mobileList.innerHTML = `
          <div class="mobile-empty">
            <span class="material-symbols-outlined">camera</span>
            <p>機材が登録されていません</p>
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
              ${eq.model ? `<span>· ${eq.model}</span>` : ''}
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
      '使用中': 'active',
      '保管中': 'storage',
      '修理中': 'repair'
    };
    const cls = statusMap[status] || '';
    return `<span class="eq-status-chip eq-status-${cls}">${status}</span>`;
  }

  renderCondition(condition) {
    if (!condition) return '-';
    const condMap = {
      '新品': 'new',
      '良好': 'good',
      'やや劣化': 'fair',
      '要修理': 'poor'
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
    const title = isEdit ? '機材を編集' : '機材を追加';
    const suppliers = store.getAll('suppliers');

    const bodyHtml = `
      <form id="eqForm" class="eq-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">機材名</label>
            <input type="text" class="form-input" name="name" required placeholder="例: Sony α7 IV">
          </div>
          <div class="form-group">
            <label class="form-label">ブランド</label>
            <input type="text" class="form-input" name="brand" placeholder="例: Sony">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">モデル</label>
            <input type="text" class="form-input" name="model" placeholder="例: ILCE-7M4">
          </div>
          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select class="form-select" name="category" required>
              <option value="">選択してください</option>
              ${this.categories.filter(c => c !== '全て').map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">シリアル番号</label>
            <input type="text" class="form-input" name="serialNumber" placeholder="例: SN12345678">
          </div>
          <div class="form-group">
            <label class="form-label">購入日</label>
            <input type="date" class="form-input" name="purchaseDate">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">購入金額</label>
            <input type="number" class="form-input" name="purchasePrice" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">仕入れ先</label>
            <select class="form-select" name="supplierId">
              <option value="">選択してください</option>
              ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select class="form-select" name="status">
              ${this.statuses.filter(s => s !== '全て').map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">コンディション</label>
            <select class="form-select" name="condition">
              <option value="">選択してください</option>
              ${this.conditions.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">保証期限</label>
          <input type="date" class="form-input" name="warrantyExpiry">
        </div>
        <div class="form-group">
          <label class="form-label">備考</label>
          <textarea class="form-textarea" name="notes" rows="3" placeholder="メモ..."></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="eqFormCancel">キャンセル</button>
      <button class="btn btn-filled" id="eqFormSave">${isEdit ? '更新' : '追加'}</button>
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
          showSnackbar('機材を更新しました', 'success');
        } else {
          store.add('equipment', data);
          showSnackbar('機材を追加しました', 'success');
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
            <span class="eq-detail-label">カテゴリ</span>
            <span class="eq-detail-value">${eq.category || '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">シリアル番号</span>
            <span class="eq-detail-value">${eq.serialNumber || '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">購入日</span>
            <span class="eq-detail-value">${formatDate(eq.purchaseDate)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">購入金額</span>
            <span class="eq-detail-value text-numeric">${formatCurrency(eq.purchasePrice)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">仕入れ先</span>
            <span class="eq-detail-value">${supplier ? supplier.name : '-'}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">コンディション</span>
            <span class="eq-detail-value">${this.renderCondition(eq.condition)}</span>
          </div>
          <div class="eq-detail-item">
            <span class="eq-detail-label">保証期限</span>
            <span class="eq-detail-value">${formatDate(eq.warrantyExpiry)}</span>
          </div>
        </div>

        ${eq.notes ? `
          <div class="eq-detail-notes">
            <span class="eq-detail-label">備考</span>
            <p>${eq.notes}</p>
          </div>
        ` : ''}

        <div class="divider" style="margin: var(--space-5) 0;"></div>

        <!-- Maintenance Log -->
        <div class="eq-maintenance-section">
          <div class="eq-maintenance-header">
            <h4>メンテナンス履歴</h4>
            <button class="btn btn-tonal btn-sm" id="eqAddMaintenance" data-id="${eq.id}">
              <span class="material-symbols-outlined">add</span>
              追加
            </button>
          </div>
          ${maintenanceLog.length > 0 ? `
            <table class="data-table eq-maintenance-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>タイプ</th>
                  <th>内容</th>
                  <th>費用</th>
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
              <p>メンテナンス履歴はありません</p>
            </div>
          `}
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-text" style="color: var(--md-error);" id="eqDetailDelete" data-id="${eq.id}">削除</button>
      <div style="flex:1;"></div>
      <button class="btn btn-outlined" id="eqDetailEdit" data-id="${eq.id}">編集</button>
      <button class="btn btn-text" id="eqDetailClose">閉じる</button>
    `;

    showModal('機材詳細', bodyHtml, footerHtml, { large: true });

    setTimeout(() => {
      $('#eqDetailClose')?.addEventListener('click', hideModal);
      $('#eqDetailEdit')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showAddModal(eq), 200);
      });
      $('#eqDetailDelete')?.addEventListener('click', async () => {
        const confirmed = await confirmDialog('機材の削除', `「${eq.name}」を削除しますか？この操作は取り消せません。`);
        if (confirmed) {
          store.delete('equipment', eq.id);
          showSnackbar('機材を削除しました');
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
            <label class="form-label required">日付</label>
            <input type="date" class="form-input" name="date" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label required">タイプ</label>
            <select class="form-select" name="type" required>
              <option value="">選択してください</option>
              <option value="清掃">清掃</option>
              <option value="修理">修理</option>
              <option value="点検">点検</option>
              <option value="パーツ交換">パーツ交換</option>
              <option value="ファームウェア更新">ファームウェア更新</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea class="form-textarea" name="description" rows="3" placeholder="メンテナンス内容を入力..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">費用</label>
          <input type="number" class="form-input" name="cost" placeholder="0" min="0">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="eqMaintCancel">キャンセル</button>
      <button class="btn btn-filled" id="eqMaintSave">追加</button>
    `;

    showModal('メンテナンス追加', bodyHtml, footerHtml);

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
          showSnackbar('メンテナンス履歴を追加しました', 'success');
          this.loadData();
          hideModal();
          setTimeout(() => this.showDetailModal(equipmentId), 200);
        }
      });
    }, 50);
  }

  getCategoryIcon(category) {
    const icons = {
      'カメラボディ': 'photo_camera',
      'レンズ': 'camera',
      'ストロボ': 'flash_on',
      '三脚': 'filter_frames',
      '照明': 'light',
      'PC': 'computer',
      'ソフトウェア': 'code',
      'その他': 'devices_other'
    };
    return icons[category] || 'camera';
  }
}
