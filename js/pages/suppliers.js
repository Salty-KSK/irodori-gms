// ============================================================
// GMS - Suppliers Page (仕入れ先リスト)
// ============================================================

import { store } from '../store.js';
import { renderStars } from '../utils/format.js';
import {
  setPageTitle, showModal, hideModal, showSnackbar, confirmDialog,
  delegate, $, $$, collectFormData, populateForm, debounce,
  filterBySearch, sortData
} from '../utils/helpers.js';

export class SuppliersPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.sortField = 'name';
    this.sortDir = 'asc';
    this.currentCategory = 'all';
    this.categories = ['全て', 'カメラ機材', '照明', '背景・小物', '印刷', 'PC・ソフト', 'その他'];
  }

  render() {
    return `
      <div class="page-suppliers animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">仕入れ先リスト</h1>
            <p class="page-subtitle">取引先・仕入れ先の管理</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="supAddBtn">
              <span class="material-symbols-outlined">add</span>
              仕入れ先を追加
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="sup-filter-section">
          <div class="chips-scroll" id="supCategoryChips">
            ${this.categories.map(c => `
              <button class="chip ${c === '全て' ? 'active' : ''}" data-category="${c}">${c}</button>
            `).join('')}
          </div>
          <div class="search-bar sup-search hidden-mobile">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="仕入れ先を検索..." id="supSearchInput">
          </div>
        </div>

        <!-- Table (Desktop View) -->
        <div class="data-table-wrapper hidden-mobile">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <span class="text-secondary" id="supCount">0件</span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" id="supTable">
              <thead>
                <tr>
                  <th data-sort="name">会社名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="category">カテゴリ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="contactPerson">担当者 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th>電話</th>
                  <th>Web</th>
                  <th data-sort="rating">評価 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="supTableBody"></tbody>
            </table>
          </div>
          <div class="data-table-empty" id="supEmpty" style="display:none;">
            <span class="material-symbols-outlined">store</span>
            <p>仕入れ先が登録されていません</p>
          </div>
        </div>

        <!-- Mobile List View -->
        <div class="mobile-search mb-4">
          <div class="flex gap-2">
            <div class="search-bar" style="flex:1;">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="仕入れ先を検索..." id="supSearchInputMobile">
            </div>
            <button class="btn btn-filled" id="supAddBtnMobile" style="padding: 0 var(--space-3); height: 40px; min-width: 40px;">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
        <div class="mobile-list" id="supMobileList"></div>
      </div>
    `;
  }

  init() {
    setPageTitle('仕入れ先リスト');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('suppliers');
    this.renderList();
  }

  bindEvents() {
    // Add button
    $('#supAddBtn')?.addEventListener('click', () => this.showAddModal());
    $('#supAddBtnMobile')?.addEventListener('click', () => this.showAddModal());

    // Category filter
    delegate('#supCategoryChips', '.chip', 'click', (e, target) => {
      $$('#supCategoryChips .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentCategory = target.dataset.category;
      this.renderList();
    });

    // Search (desktop)
    const searchInput = $('#supSearchInput');
    searchInput?.addEventListener('input', debounce(() => {
      const val = searchInput.value;
      this.searchText = val;
      const mobileInput = $('#supSearchInputMobile');
      if (mobileInput) mobileInput.value = val;
      this.renderList();
    }, 200));

    // Search (mobile)
    delegate('.page-suppliers', '#supSearchInputMobile', 'input', debounce((e) => {
      const val = e.target.value;
      this.searchText = val;
      const desktopInput = $('#supSearchInput');
      if (desktopInput) desktopInput.value = val;
      this.renderList();
    }, 200));

    // Sort
    delegate('#supTable thead', 'th[data-sort]', 'click', (e, target) => {
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

    // Table actions
    delegate('#supTableBody', '.sup-edit-btn', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      const item = store.getById('suppliers', id);
      if (item) this.showAddModal(item);
    });

    delegate('#supTableBody', '.sup-delete-btn', 'click', async (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      const item = store.getById('suppliers', id);
      if (!item) return;
      const confirmed = await confirmDialog('仕入れ先の削除', `「${item.name}」を削除しますか？この操作は取り消せません。`);
      if (confirmed) {
        store.delete('suppliers', id);
        showSnackbar('仕入れ先を削除しました');
        this.loadData();
      }
    });

    // Mobile Actions
    delegate('.page-suppliers', '#supMobileList .sup-edit-btn', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('.mobile-card').dataset.id;
      const item = store.getById('suppliers', id);
      if (item) this.showAddModal(item);
    });

    delegate('.page-suppliers', '#supMobileList .sup-delete-btn', 'click', async (e, target) => {
      e.stopPropagation();
      const id = target.closest('.mobile-card').dataset.id;
      const item = store.getById('suppliers', id);
      if (!item) return;
      const confirmed = await confirmDialog('仕入れ先の削除', `「${item.name}」を削除しますか？この操作は取り消せません。`);
      if (confirmed) {
        store.delete('suppliers', id);
        showSnackbar('仕入れ先を削除しました');
        this.loadData();
      }
    });
  }

  getFilteredData() {
    let filtered = [...this.data];
    if (this.currentCategory !== '全て' && this.currentCategory !== 'all') {
      filtered = filtered.filter(s => s.category === this.currentCategory);
    }
    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['name', 'category', 'contactPerson', 'email', 'phone']);
    }
    return sortData(filtered, this.sortField, this.sortDir);
  }

  renderList() {
    const filtered = this.getFilteredData();
    const tbody = $('#supTableBody');
    const emptyEl = $('#supEmpty');
    const countEl = $('#supCount');
    const mobileList = $('#supMobileList');

    if (countEl) countEl.textContent = `${filtered.length}件`;

    if (filtered.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      if (mobileList) {
        mobileList.innerHTML = `
          <div class="mobile-empty">
            <span class="material-symbols-outlined">store</span>
            <p>仕入れ先が登録されていません</p>
          </div>
        `;
      }
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    if (tbody) {
      tbody.innerHTML = filtered.map(s => `
        <tr data-id="${s.id}">
          <td>
            <div class="sup-name-cell">
              <span class="sup-name">${s.name || '-'}</span>
              ${s.address ? `<span class="sup-address">${s.address}</span>` : ''}
            </div>
          </td>
          <td><span class="chip sup-cat-chip">${s.category || '-'}</span></td>
          <td>${s.contactPerson || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td>${s.website ? `<a href="${s.website}" target="_blank" rel="noopener" class="sup-web-link" onclick="event.stopPropagation()">
            <span class="material-symbols-outlined">open_in_new</span>
            サイト
          </a>` : '-'}</td>
          <td>${renderStars(s.rating || 0)}</td>
          <td>
            <div class="sup-actions">
              <button class="btn-icon sup-edit-btn" title="編集">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon sup-delete-btn" title="削除">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (mobileList) {
      mobileList.innerHTML = filtered.map(s => `
        <div class="mobile-card" data-id="${s.id}" style="cursor: default;">
          <div class="mobile-card-avatar" style="background: var(--md-tertiary-container); color: var(--md-tertiary-on-container);">
            <span class="material-symbols-outlined">store</span>
          </div>
          <div class="mobile-card-main">
            <div class="mobile-card-title">${s.name || '-'}</div>
            <div class="mobile-card-sub">
              <span>${s.category || '-'}</span>
              ${s.contactPerson ? `<span>· 担当: ${s.contactPerson}</span>` : ''}
            </div>
            <div class="mobile-card-sub" style="margin-top: 4px;">
              ${s.phone ? `<span>📞 ${s.phone}</span>` : ''}
              ${s.rating ? `<span style="margin-left: 8px;">${renderStars(s.rating)}</span>` : ''}
            </div>
            ${s.address ? `<div class="mobile-card-sub" style="font-size: 11px; margin-top: 2px;">📍 ${s.address}</div>` : ''}
          </div>
          <div class="mobile-card-end" style="flex-direction: row; align-items: center; gap: 8px;">
            ${s.website ? `
              <a href="${s.website}" target="_blank" rel="noopener" class="btn-icon" title="サイトを開く" onclick="event.stopPropagation()" style="min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="color:var(--md-primary);">open_in_new</span>
              </a>
            ` : ''}
            <button class="btn-icon sup-edit-btn" title="編集" style="min-width: 40px; min-height: 40px;">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon sup-delete-btn" title="削除" style="min-width: 40px; min-height: 40px;">
              <span class="material-symbols-outlined" style="color:var(--md-error);">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  updateSortHeaders() {
    $$('#supTable th[data-sort]').forEach(th => {
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
    const title = isEdit ? '仕入れ先を編集' : '仕入れ先を追加';

    const bodyHtml = `
      <form id="supForm" class="sup-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">会社名</label>
            <input type="text" class="form-input" name="name" required placeholder="例: マップカメラ">
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
            <label class="form-label">担当者</label>
            <input type="text" class="form-input" name="contactPerson" placeholder="例: 山田太郎">
          </div>
          <div class="form-group">
            <label class="form-label">メール</label>
            <input type="email" class="form-input" name="email" placeholder="例: info@example.com">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">電話番号</label>
            <input type="text" class="form-input" name="phone" placeholder="例: 03-1234-5678">
          </div>
          <div class="form-group">
            <label class="form-label">Webサイト</label>
            <input type="url" class="form-input" name="website" placeholder="例: https://example.com">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">住所</label>
          <input type="text" class="form-input" name="address" placeholder="例: 東京都新宿区...">
        </div>
        <div class="form-group">
          <label class="form-label">評価</label>
          <select class="form-select" name="rating">
            <option value="">未評価</option>
            <option value="1">★☆☆☆☆ (1)</option>
            <option value="2">★★☆☆☆ (2)</option>
            <option value="3">★★★☆☆ (3)</option>
            <option value="4">★★★★☆ (4)</option>
            <option value="5">★★★★★ (5)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">備考</label>
          <textarea class="form-textarea" name="notes" rows="3" placeholder="メモ..."></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="supFormCancel">キャンセル</button>
      <button class="btn btn-filled" id="supFormSave">${isEdit ? '更新' : '追加'}</button>
    `;

    showModal(title, bodyHtml, footerHtml);

    if (isEdit) {
      setTimeout(() => {
        const form = $('#supForm');
        if (form) populateForm(form, editItem);
      }, 50);
    }

    setTimeout(() => {
      $('#supFormCancel')?.addEventListener('click', hideModal);
      $('#supFormSave')?.addEventListener('click', () => {
        const form = $('#supForm');
        if (!form || !form.checkValidity()) {
          form?.reportValidity();
          return;
        }
        const data = collectFormData(form);
        if (data.rating) data.rating = Number(data.rating);
        if (isEdit) {
          store.update('suppliers', editItem.id, data);
          showSnackbar('仕入れ先を更新しました', 'success');
        } else {
          store.add('suppliers', data);
          showSnackbar('仕入れ先を追加しました', 'success');
        }
        hideModal();
        this.loadData();
      });
    }, 50);
  }
}
