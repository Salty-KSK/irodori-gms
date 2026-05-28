// ============================================================
// GMS - Clients Page (顧客リスト)
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, renderStatusChip, renderAvatar } from '../utils/format.js';
import {
  setPageTitle, showModal, hideModal, showSnackbar, confirmDialog,
  delegate, $, $$, collectFormData, populateForm, debounce,
  filterBySearch, sortData, renderEmptyState
} from '../utils/helpers.js';

export class ClientsPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.sortField = 'name';
    this.sortDir = 'asc';
    this.currentFilter = 'all';
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-clients animate-fade-in-up">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">顧客リスト</h1>
            <p class="page-subtitle">顧客情報の管理・閲覧</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="btnAddClient">
              <span class="material-symbols-outlined">person_add</span>
              顧客を追加
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-4 mb-6 stagger-children">
          <div class="stat-card" id="statTotal">
            <div class="stat-card-icon" style="background: var(--md-info-container); color: var(--md-on-info-container);">
              <span class="material-symbols-outlined">group</span>
            </div>
            <span class="stat-card-label">総顧客数</span>
            <span class="stat-card-value text-numeric" id="statTotalValue">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-primary-container); color: var(--md-primary-on-container);">
              <span class="material-symbols-outlined">person</span>
            </div>
            <span class="stat-card-label">個人</span>
            <span class="stat-card-value text-numeric" id="statPersonalValue">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-tertiary-container); color: var(--md-tertiary-on-container);">
              <span class="material-symbols-outlined">business</span>
            </div>
            <span class="stat-card-label">企業</span>
            <span class="stat-card-value text-numeric" id="statCorporateValue">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-warning-container); color: var(--md-on-warning-container);">
              <span class="material-symbols-outlined">handshake</span>
            </div>
            <span class="stat-card-label">代理店・メディア</span>
            <span class="stat-card-value text-numeric" id="statAgencyValue">0</span>
          </div>
        </div>

        <!-- Table -->
        <div class="data-table-wrapper animate-fade-in-up">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <div class="search-bar" style="max-width: 320px;">
                <span class="material-symbols-outlined">search</span>
                <input type="text" placeholder="顧客を検索..." id="clientSearch" />
              </div>
              <div class="flex gap-2 flex-wrap" id="clientFilters">
                <button class="chip active" data-filter="all">全て</button>
                <button class="chip" data-filter="個人">個人</button>
                <button class="chip" data-filter="企業">企業</button>
                <button class="chip" data-filter="代理店">代理店</button>
                <button class="chip" data-filter="メディア">メディア</button>
              </div>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" id="clientsTable">
              <thead>
                <tr>
                  <th data-sort="name">顧客名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="category">カテゴリ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="email">連絡先 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th data-sort="company">会社名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                  <th>商用利用</th>
                  <th>案件数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="clientsTableBody"></tbody>
            </table>
          </div>
          <div id="clientsEmpty" class="hidden"></div>
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('顧客リスト');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('clients');
    this.updateStats();
    this.renderList();
  }

  updateStats() {
    const all = store.getAll('clients');
    $('#statTotalValue').textContent = all.length;
    $('#statPersonalValue').textContent = all.filter(c => c.category === '個人').length;
    $('#statCorporateValue').textContent = all.filter(c => c.category === '企業').length;
    $('#statAgencyValue').textContent = all.filter(c => c.category === '代理店' || c.category === 'メディア').length;
  }

  bindEvents() {
    // Add button
    $('#btnAddClient')?.addEventListener('click', () => this.showAddModal());

    // Search
    const searchInput = $('#clientSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      this.renderList();
    }, 200));

    // Category filters
    delegate('#clientFilters', '.chip', 'click', (e, target) => {
      $$('#clientFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentFilter = target.dataset.filter;
      this.renderList();
    });

    // Sort
    delegate('#clientsTable thead', 'th[data-sort]', 'click', (e, target) => {
      const field = target.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      // Update sort icon UI
      $$('#clientsTable th').forEach(th => th.classList.remove('sorted'));
      target.classList.add('sorted');
      const icon = $('span.sort-icon', target);
      if (icon) icon.textContent = this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
      this.renderList();
    });

    // Row actions
    delegate('#clientsTableBody', '.btn-edit', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      this.showEditModal(id);
    });

    delegate('#clientsTableBody', '.btn-delete', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      this.handleDelete(id);
    });

    // Row click -> detail
    delegate('#clientsTableBody', 'tr', 'click', (e, target) => {
      if (e.target.closest('.btn-icon')) return;
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });
  }

  renderList() {
    let filtered = [...this.data];

    // Category filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(c => c.category === this.currentFilter);
    }

    // Search
    filtered = filterBySearch(filtered, this.searchText, ['name', 'furigana', 'email', 'company', 'phone']);

    // Sort
    filtered = sortData(filtered, this.sortField, this.sortDir);

    const tbody = $('#clientsTableBody');
    const emptyEl = $('#clientsEmpty');

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyEl.classList.remove('hidden');
      emptyEl.innerHTML = renderEmptyState(
        'person_off',
        '顧客が見つかりません',
        this.searchText ? '検索条件を変更してください' : '新しい顧客を追加してみましょう'
      );
      return;
    }

    emptyEl.classList.add('hidden');
    tbody.innerHTML = filtered.map(client => {
      const projectCount = store.count('projects', p => p.clientId === client.id);
      return `
        <tr data-id="${client.id}" style="cursor: pointer;">
          <td>
            <div class="flex items-center gap-3">
              ${renderAvatar(client.name)}
              <div>
                <div class="text-title-md">${client.name}</div>
                ${client.furigana ? `<div class="text-body-sm text-muted">${client.furigana}</div>` : ''}
              </div>
            </div>
          </td>
          <td><span class="chip" style="pointer-events:none;">${client.category || '-'}</span></td>
          <td>
            <div class="text-body-md">${client.email || '-'}</div>
            ${client.phone ? `<div class="text-body-sm text-muted">${client.phone}</div>` : ''}
          </td>
          <td>${client.company || '-'}</td>
          <td>
            ${client.commercialUse
              ? '<span class="material-symbols-outlined text-success" style="font-size:20px;">check_circle</span>'
              : '<span class="material-symbols-outlined text-muted" style="font-size:20px;">cancel</span>'}
          </td>
          <td><span class="text-numeric">${projectCount}</span></td>
          <td>
            <div class="flex gap-1">
              <button class="btn-icon btn-edit tooltip" data-tooltip="編集">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon btn-delete tooltip" data-tooltip="削除">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── Add Modal ──
  showAddModal() {
    this.editingId = null;
    const body = this._renderForm();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveClient">保存</button>
    `;
    showModal('顧客を追加', body, footer);
    setTimeout(() => {
      $('#btnSaveClient')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  // ── Edit Modal ──
  showEditModal(id) {
    this.editingId = id;
    const client = store.getById('clients', id);
    if (!client) return;

    const body = this._renderForm();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveClient">更新</button>
    `;
    showModal('顧客を編集', body, footer);

    setTimeout(() => {
      const form = $('#clientForm');
      if (form) {
        populateForm(form, {
          ...client,
          tags: Array.isArray(client.tags) ? client.tags.join(', ') : (client.tags || '')
        });
      }
      $('#btnSaveClient')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  // ── Detail Modal ──
  showDetailModal(id) {
    const client = store.getById('clients', id);
    if (!client) return;

    const projects = store.query('projects', p => p.clientId === id);
    const publications = client.publicationHistory || [];

    const body = `
      <div class="client-detail">
        <!-- Client Info -->
        <div class="client-detail-header">
          ${renderAvatar(client.name, null, 'lg')}
          <div>
            <h2 class="text-headline-md">${client.name}</h2>
            ${client.furigana ? `<p class="text-body-md text-muted">${client.furigana}</p>` : ''}
            <span class="chip" style="margin-top: 4px;">${client.category || '-'}</span>
          </div>
        </div>

        <div class="divider mt-4 mb-4"></div>

        <div class="client-detail-grid">
          <div class="client-detail-item">
            <span class="material-symbols-outlined">mail</span>
            <div>
              <div class="text-label-md text-muted">メール</div>
              <div class="text-body-md">${client.email || '-'}</div>
            </div>
          </div>
          <div class="client-detail-item">
            <span class="material-symbols-outlined">phone</span>
            <div>
              <div class="text-label-md text-muted">電話番号</div>
              <div class="text-body-md">${client.phone || '-'}</div>
            </div>
          </div>
          <div class="client-detail-item">
            <span class="material-symbols-outlined">business</span>
            <div>
              <div class="text-label-md text-muted">会社名</div>
              <div class="text-body-md">${client.company || '-'}</div>
            </div>
          </div>
          <div class="client-detail-item">
            <span class="material-symbols-outlined">location_on</span>
            <div>
              <div class="text-label-md text-muted">住所</div>
              <div class="text-body-md">${client.address || '-'}</div>
            </div>
          </div>
          <div class="client-detail-item">
            <span class="material-symbols-outlined">photo_camera</span>
            <div>
              <div class="text-label-md text-muted">商用利用</div>
              <div class="text-body-md">${client.commercialUse ? '許可済み' : '未許可'}</div>
            </div>
          </div>
          <div class="client-detail-item">
            <span class="material-symbols-outlined">sell</span>
            <div>
              <div class="text-label-md text-muted">タグ</div>
              <div class="flex gap-1 flex-wrap">
                ${(client.tags || []).map(t => `<span class="chip" style="height:24px;font-size:12px;">${t}</span>`).join('') || '-'}
              </div>
            </div>
          </div>
        </div>

        ${client.notes ? `
          <div class="mt-4">
            <div class="text-label-md text-muted mb-2">メモ</div>
            <div class="text-body-md" style="white-space: pre-wrap; background: var(--md-surface-container-low); padding: var(--space-3); border-radius: var(--radius-sm);">${client.notes}</div>
          </div>
        ` : ''}

        <!-- Related Projects -->
        <div class="mt-6">
          <h3 class="text-title-lg mb-3">関連案件 (${projects.length})</h3>
          ${projects.length > 0 ? `
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>案件名</th>
                    <th>ステータス</th>
                    <th>撮影日</th>
                    <th>金額</th>
                  </tr>
                </thead>
                <tbody>
                  ${projects.map(p => `
                    <tr>
                      <td class="text-title-md">${p.title}</td>
                      <td>${renderStatusChip(p.status)}</td>
                      <td>${formatDate(p.shootDate)}</td>
                      <td class="text-numeric">${formatCurrency(p.totalAmount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="text-body-md text-muted">関連する案件はありません</p>'}
        </div>

        <!-- Publication History -->
        <div class="mt-6">
          <h3 class="text-title-lg mb-3">掲載履歴 (${publications.length})</h3>
          ${publications.length > 0 ? `
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>メディア</th>
                    <th>掲載日</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  ${publications.map(pub => `
                    <tr>
                      <td>${pub.media || '-'}</td>
                      <td>${formatDate(pub.date)}</td>
                      <td>${pub.url ? `<a href="${pub.url}" target="_blank" class="link text-primary">リンク</a>` : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="text-body-md text-muted">掲載履歴はありません</p>'}
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">閉じる</button>
      <button class="btn btn-tonal" id="btnEditFromDetail">
        <span class="material-symbols-outlined">edit</span>
        編集
      </button>
    `;

    showModal(`${client.name} の詳細`, body, footer, { large: true });

    setTimeout(() => {
      $('#btnEditFromDetail')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showEditModal(id), 200);
      });
    }, 50);
  }

  // ── Form HTML ──
  _renderForm() {
    return `
      <form id="clientForm" class="flex flex-col gap-4">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">名前</label>
            <input type="text" name="name" class="form-input" required placeholder="例: 田中 太郎" />
          </div>
          <div class="form-group">
            <label class="form-label">フリガナ</label>
            <input type="text" name="furigana" class="form-input" placeholder="例: タナカ タロウ" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">メールアドレス</label>
            <input type="email" name="email" class="form-input" placeholder="example@mail.com" />
          </div>
          <div class="form-group">
            <label class="form-label">電話番号</label>
            <input type="tel" name="phone" class="form-input" placeholder="090-1234-5678" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select name="category" class="form-select" required>
              <option value="">選択してください</option>
              <option value="個人">個人</option>
              <option value="企業">企業</option>
              <option value="代理店">代理店</option>
              <option value="メディア">メディア</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">会社名</label>
            <input type="text" name="company" class="form-input" placeholder="株式会社〇〇" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">住所</label>
          <input type="text" name="address" class="form-input" placeholder="東京都..." />
        </div>
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input type="checkbox" name="commercialUse" />
            <span class="text-body-md">商用利用を許可</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="3" placeholder="顧客に関するメモ..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">タグ</label>
          <input type="text" name="tags" class="form-input" placeholder="カンマ区切りで入力（例: ウェディング, リピーター）" />
          <span class="form-helper">カンマ区切りで複数のタグを入力できます</span>
        </div>
      </form>
    `;
  }

  // ── Save ──
  handleSave() {
    const form = $('#clientForm');
    if (!form) return;

    const rawData = collectFormData(form);

    // Validation
    if (!rawData.name || !rawData.category) {
      showSnackbar('名前とカテゴリは必須です', 'error');
      return;
    }

    // Process tags
    const data = {
      ...rawData,
      tags: rawData.tags ? rawData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (this.editingId) {
      store.update('clients', this.editingId, data);
      showSnackbar('顧客情報を更新しました', 'success');
    } else {
      data.publicationHistory = [];
      store.add('clients', data);
      showSnackbar('顧客を追加しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  // ── Delete ──
  async handleDelete(id) {
    const client = store.getById('clients', id);
    if (!client) return;

    const confirmed = await confirmDialog(
      '顧客を削除',
      `「${client.name}」を削除してもよろしいですか？この操作は元に戻せません。`
    );

    if (confirmed) {
      store.delete('clients', id);
      showSnackbar('顧客を削除しました', 'success');
      this.loadData();
    }
  }
}
