// ============================================================
// GMS - Projects Page (案件リスト)
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, renderStatusChip, renderAvatar } from '../utils/format.js';
import {
  setPageTitle, showModal, hideModal, showSnackbar, confirmDialog,
  delegate, $, $$, collectFormData, populateForm, debounce,
  filterBySearch, sortData, renderEmptyState
} from '../utils/helpers.js';

const ALL_STATUSES = ['問い合わせ', '見積中', '契約済', '撮影準備', '撮影完了', '編集中', '納品済', '完了', 'キャンセル'];
const IN_PROGRESS_STATUSES = ['問い合わせ', '見積中', '契約済', '撮影準備', '撮影完了', '編集中'];
const COMPLETED_STATUSES = ['納品済', '完了'];
const CATEGORIES = ['ウェディング', '七五三', '家族写真', '企業撮影', '商品撮影', 'イベント', 'ポートレート', 'その他'];

export class ProjectsPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.sortField = 'shootDate';
    this.sortDir = 'desc';
    this.currentFilter = 'all';
    this.viewMode = 'table'; // 'table' or 'kanban'
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-projects animate-fade-in-up">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">案件リスト</h1>
            <p class="page-subtitle">撮影案件の管理・進捗追跡</p>
          </div>
          <div class="page-header-right">
            <div class="flex gap-2 items-center">
              <div class="view-toggle">
                <button class="btn-icon view-toggle-btn active" data-view="table" title="テーブル表示">
                  <span class="material-symbols-outlined">table_rows</span>
                </button>
                <button class="btn-icon view-toggle-btn" data-view="kanban" title="カンバン表示">
                  <span class="material-symbols-outlined">view_kanban</span>
                </button>
              </div>
              <button class="btn btn-filled" id="btnAddProject">
                <span class="material-symbols-outlined">add</span>
                案件を追加
              </button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-4 mb-6 stagger-children hidden-mobile">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-info-container); color: var(--md-on-info-container);">
              <span class="material-symbols-outlined">folder</span>
            </div>
            <span class="stat-card-label">総案件数</span>
            <span class="stat-card-value text-numeric" id="statProjectTotal">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-warning-container); color: var(--md-on-warning-container);">
              <span class="material-symbols-outlined">pending</span>
            </div>
            <span class="stat-card-label">進行中</span>
            <span class="stat-card-value text-numeric" id="statProjectActive">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-success-container); color: var(--md-on-success-container);">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <span class="stat-card-label">完了</span>
            <span class="stat-card-value text-numeric" id="statProjectDone">0</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--md-primary-container); color: var(--md-primary-on-container);">
              <span class="material-symbols-outlined">payments</span>
            </div>
            <span class="stat-card-label">総売上</span>
            <span class="stat-card-value text-numeric" id="statProjectRevenue">¥0</span>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="chips-scroll mb-4" id="projectFilters">
          <button class="chip active" data-filter="all">全て</button>
          <button class="chip" data-filter="active">進行中</button>
          <button class="chip" data-filter="completed">完了</button>
          <button class="chip" data-filter="cancelled">キャンセル</button>
        </div>

        <!-- Mobile Search -->
        <div class="mobile-search hidden-desktop">
          <div class="search-bar">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="案件を検索..." id="projectSearchMobile" />
          </div>
        </div>

        <!-- Mobile Card List -->
        <div class="mobile-list hidden-desktop" id="projectMobileList"></div>

        <!-- Table View (Desktop) -->
        <div id="tableView" class="hidden-mobile">
          <div class="data-table-wrapper">
            <div class="data-table-toolbar">
              <div class="data-table-toolbar-left">
                <div class="search-bar" style="max-width: 320px;">
                  <span class="material-symbols-outlined">search</span>
                  <input type="text" placeholder="案件を検索..." id="projectSearch" />
                </div>
              </div>
            </div>
            <div style="overflow-x: auto;">
              <table class="data-table" id="projectsTable">
                <thead>
                  <tr>
                    <th data-sort="title">案件名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th data-sort="clientId">顧客名 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th data-sort="category">カテゴリ <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th data-sort="status">ステータス <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th data-sort="shootDate">撮影日 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th data-sort="totalAmount">金額 <span class="material-symbols-outlined sort-icon">arrow_upward</span></th>
                    <th>同意状況</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="projectsTableBody"></tbody>
              </table>
            </div>
            <div id="projectsEmpty" class="hidden"></div>
          </div>
        </div>

        <!-- Kanban View -->
        <div id="kanbanView" class="hidden">
          <div class="kanban-board" id="kanbanBoard"></div>
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('案件リスト');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('projects');
    this.updateStats();
    this.renderList();
    if (this.viewMode === 'kanban') {
      this.renderKanban();
    }
  }

  updateStats() {
    const all = store.getAll('projects');
    $('#statProjectTotal').textContent = all.length;
    $('#statProjectActive').textContent = all.filter(p => IN_PROGRESS_STATUSES.includes(p.status)).length;
    $('#statProjectDone').textContent = all.filter(p => COMPLETED_STATUSES.includes(p.status)).length;
    $('#statProjectRevenue').textContent = formatCurrency(
      all.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0)
    );
  }

  bindEvents() {
    // Add button
    $('#btnAddProject')?.addEventListener('click', () => this.showAddModal());

    // Search (desktop)
    const searchInput = $('#projectSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      const m = $('#projectSearchMobile');
      if (m) m.value = e.target.value;
      this.renderList();
      if (this.viewMode === 'kanban') this.renderKanban();
    }, 200));

    // Search (mobile)
    const mobileSearch = $('#projectSearchMobile');
    mobileSearch?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      const d = $('#projectSearch');
      if (d) d.value = e.target.value;
      this.renderList();
    }, 200));

    // View toggle
    delegate('.view-toggle', '.view-toggle-btn', 'click', (e, target) => {
      const view = target.dataset.view;
      $$('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      this.viewMode = view;

      if (view === 'table') {
        $('#tableView')?.classList.remove('hidden');
        $('#kanbanView')?.classList.add('hidden');
      } else {
        $('#tableView')?.classList.add('hidden');
        $('#kanbanView')?.classList.remove('hidden');
        this.renderKanban();
      }
    });

    // Filter chips
    delegate('#projectFilters', '.chip', 'click', (e, target) => {
      $$('#projectFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentFilter = target.dataset.filter;
      this.renderList();
      if (this.viewMode === 'kanban') this.renderKanban();
    });

    // Sort
    delegate('#projectsTable thead', 'th[data-sort]', 'click', (e, target) => {
      const field = target.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      $$('#projectsTable th').forEach(th => th.classList.remove('sorted'));
      target.classList.add('sorted');
      const icon = $('span.sort-icon', target);
      if (icon) icon.textContent = this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
      this.renderList();
    });

    // Row actions
    delegate('#projectsTableBody', '.btn-edit', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      this.showEditModal(id);
    });

    delegate('#projectsTableBody', '.btn-delete', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('tr').dataset.id;
      this.handleDelete(id);
    });

    // Row click -> detail
    delegate('#projectsTableBody', 'tr', 'click', (e, target) => {
      if (e.target.closest('.btn-icon')) return;
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });

    // Kanban card click
    delegate('#kanbanBoard', '.kanban-card', 'click', (e, target) => {
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });

    // Mobile card click
    delegate('#projectMobileList', '.mobile-card', 'click', (e, target) => {
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });
  }

  // ── Get filtered data ──
  _getFilteredData() {
    let filtered = [...this.data];

    // Status filter
    if (this.currentFilter === 'active') {
      filtered = filtered.filter(p => IN_PROGRESS_STATUSES.includes(p.status));
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(p => COMPLETED_STATUSES.includes(p.status));
    } else if (this.currentFilter === 'cancelled') {
      filtered = filtered.filter(p => p.status === 'キャンセル');
    }

    // Search
    filtered = filterBySearch(filtered, this.searchText, ['title', 'category', 'status', 'notes']);

    return filtered;
  }

  // ── Helper: get client name ──
  _getClientName(clientId) {
    if (!clientId) return '-';
    const client = store.getById('clients', clientId);
    return client ? client.name : '-';
  }

  // ── Helper: consent progress ──
  _getConsentProgress(consent) {
    if (!consent) return { count: 0, total: 4, percent: 0 };
    const items = [consent.photographConsent, consent.modelRelease, consent.commercialUse, consent.snsPublication];
    const count = items.filter(Boolean).length;
    return { count, total: 4, percent: (count / 4) * 100 };
  }

  // ── Table View ──
  renderList() {
    let filtered = this._getFilteredData();

    // Sort
    if (this.sortField === 'clientId') {
      filtered = [...filtered].sort((a, b) => {
        const nameA = this._getClientName(a.clientId).toLowerCase();
        const nameB = this._getClientName(b.clientId).toLowerCase();
        if (nameA < nameB) return this.sortDir === 'asc' ? -1 : 1;
        if (nameA > nameB) return this.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      filtered = sortData(filtered, this.sortField, this.sortDir);
    }

    const tbody = $('#projectsTableBody');
    const emptyEl = $('#projectsEmpty');

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyEl.classList.remove('hidden');
      emptyEl.innerHTML = renderEmptyState(
        'folder_off',
        '案件が見つかりません',
        this.searchText ? '検索条件を変更してください' : '新しい案件を追加してみましょう'
      );
      return;
    }

    emptyEl.classList.add('hidden');
    tbody.innerHTML = filtered.map(project => {
      const clientName = this._getClientName(project.clientId);
      const consent = this._getConsentProgress(project.consent);

      return `
        <tr data-id="${project.id}" style="cursor: pointer;">
          <td>
            <div class="text-title-md">${project.title}</div>
          </td>
          <td>
            <div class="flex items-center gap-2">
              ${renderAvatar(clientName, null, 'sm')}
              <span>${clientName}</span>
            </div>
          </td>
          <td><span class="chip" style="pointer-events:none;">${project.category || '-'}</span></td>
          <td>${renderStatusChip(project.status)}</td>
          <td class="text-numeric">${formatDate(project.shootDate)}</td>
          <td class="text-numeric">${formatCurrency(project.totalAmount)}</td>
          <td>
            <div class="consent-progress" title="${consent.count}/${consent.total} 完了">
              <div class="progress-bar" style="width: 60px; height: 6px;">
                <div class="progress-bar-fill" style="width: ${consent.percent}%; background: ${consent.percent === 100 ? 'var(--md-success)' : 'var(--md-primary)'}"></div>
              </div>
              <span class="text-label-sm text-muted">${consent.count}/${consent.total}</span>
            </div>
          </td>
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

    // Mobile card list
    const mobileList = $('#projectMobileList');
    if (mobileList) {
      if (filtered.length === 0) {
        mobileList.innerHTML = `
          <div class="mobile-empty">
            <span class="material-symbols-outlined">folder_off</span>
            <p>案件が見つかりません</p>
          </div>`;
      } else {
        mobileList.innerHTML = filtered.map(project => {
          const clientName = this._getClientName(project.clientId);
          return `
            <div class="mobile-card" data-id="${project.id}">
              <div class="mobile-card-main">
                <div class="mobile-card-title">${project.title}</div>
                <div class="mobile-card-sub">
                  <span>${clientName}</span>
                  <span>·</span>
                  <span>${formatDate(project.shootDate)}</span>
                </div>
              </div>
              <div class="mobile-card-end">
                ${renderStatusChip(project.status)}
                <span class="material-symbols-outlined mobile-card-chevron">chevron_right</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // ── Kanban View ──
  renderKanban() {
    const board = $('#kanbanBoard');
    if (!board) return;

    const filtered = this._getFilteredData();
    const kanbanStatuses = ['問い合わせ', '見積中', '契約済', '撮影準備', '撮影完了', '編集中', '納品済', '完了'];

    board.innerHTML = kanbanStatuses.map(status => {
      const items = filtered.filter(p => p.status === status);
      return `
        <div class="kanban-column">
          <div class="kanban-column-header">
            <div class="flex items-center gap-2">
              <span class="kanban-column-title">${status}</span>
              <span class="badge" style="background: var(--md-secondary-container); color: var(--md-secondary-on-container);">${items.length}</span>
            </div>
          </div>
          <div class="kanban-column-body">
            ${items.length > 0 ? items.map(project => {
              const clientName = this._getClientName(project.clientId);
              return `
                <div class="kanban-card card" data-id="${project.id}">
                  <div class="kanban-card-title">${project.title}</div>
                  <div class="kanban-card-meta">
                    <div class="flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size:14px;">person</span>
                      <span>${clientName}</span>
                    </div>
                    ${project.shootDate ? `
                      <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span>
                        <span>${formatDate(project.shootDate)}</span>
                      </div>
                    ` : ''}
                    ${project.totalAmount ? `
                      <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined" style="font-size:14px;">payments</span>
                        <span class="text-numeric">${formatCurrency(project.totalAmount)}</span>
                      </div>
                    ` : ''}
                  </div>
                  ${project.category ? `
                    <div class="mt-2">
                      <span class="chip" style="height:24px;font-size:11px;pointer-events:none;">${project.category}</span>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('') : `
              <div class="kanban-empty">
                <span class="text-body-sm text-muted">案件なし</span>
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Detail Modal ──
  showDetailModal(id) {
    const project = store.getById('projects', id);
    if (!project) return;

    const clientName = this._getClientName(project.clientId);
    const consent = this._getConsentProgress(project.consent);
    const location = project.locationId ? store.getById('locations', project.locationId) : null;

    const body = `
      <div class="project-detail">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-headline-md">${project.title}</h2>
            <div class="flex items-center gap-2 mt-1">
              ${renderStatusChip(project.status)}
              <span class="chip" style="pointer-events:none;">${project.category || '-'}</span>
            </div>
          </div>
          <div class="text-display-sm text-numeric text-primary">${formatCurrency(project.totalAmount)}</div>
        </div>

        <div class="divider mb-4"></div>

        <div class="project-detail-grid">
          <div class="project-detail-item">
            <span class="material-symbols-outlined">person</span>
            <div>
              <div class="text-label-md text-muted">顧客</div>
              <div class="text-body-md">${clientName}</div>
            </div>
          </div>
          <div class="project-detail-item">
            <span class="material-symbols-outlined">calendar_today</span>
            <div>
              <div class="text-label-md text-muted">撮影日</div>
              <div class="text-body-md">${formatDate(project.shootDate)}${project.shootEndDate ? ' 〜 ' + formatDate(project.shootEndDate) : ''}</div>
            </div>
          </div>
          <div class="project-detail-item">
            <span class="material-symbols-outlined">location_on</span>
            <div>
              <div class="text-label-md text-muted">ロケ地</div>
              <div class="text-body-md">${location ? location.name : '-'}</div>
            </div>
          </div>
          <div class="project-detail-item">
            <span class="material-symbols-outlined">savings</span>
            <div>
              <div class="text-label-md text-muted">前受金</div>
              <div class="text-body-md">${formatCurrency(project.depositAmount || 0)} ${project.depositReceived ? '<span class="text-success">（受領済）</span>' : '<span class="text-muted">（未受領）</span>'}</div>
            </div>
          </div>
        </div>

        <!-- Consent Section -->
        <div class="mt-6">
          <h3 class="text-title-lg mb-3">同意状況</h3>
          <div class="consent-detail-grid">
            ${this._renderConsentItem('撮影同意', project.consent?.photographConsent)}
            ${this._renderConsentItem('モデルリリース', project.consent?.modelRelease)}
            ${this._renderConsentItem('商用利用', project.consent?.commercialUse)}
            ${this._renderConsentItem('SNS掲載', project.consent?.snsPublication)}
          </div>
          <div class="mt-2 flex items-center gap-3">
            <div class="progress-bar" style="flex: 1; max-width: 200px; height: 6px;">
              <div class="progress-bar-fill" style="width: ${consent.percent}%; background: ${consent.percent === 100 ? 'var(--md-success)' : 'var(--md-primary)'}"></div>
            </div>
            <span class="text-label-md text-muted">${consent.count}/${consent.total} 完了</span>
          </div>
        </div>

        ${project.notes ? `
          <div class="mt-6">
            <h3 class="text-title-lg mb-2">メモ</h3>
            <div class="text-body-md" style="white-space: pre-wrap; background: var(--md-surface-container-low); padding: var(--space-3); border-radius: var(--radius-sm);">${project.notes}</div>
          </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">閉じる</button>
      <button class="btn btn-tonal" id="btnEditFromProjectDetail">
        <span class="material-symbols-outlined">edit</span>
        編集
      </button>
    `;

    showModal(project.title, body, footer, { large: true });

    setTimeout(() => {
      $('#btnEditFromProjectDetail')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showEditModal(id), 200);
      });
    }, 50);
  }

  _renderConsentItem(label, value) {
    const icon = value ? 'check_circle' : 'radio_button_unchecked';
    const color = value ? 'var(--md-success)' : 'var(--md-on-surface-variant)';
    return `
      <div class="consent-detail-item flex items-center gap-2">
        <span class="material-symbols-outlined" style="font-size: 20px; color: ${color};">${icon}</span>
        <span class="text-body-md">${label}</span>
      </div>
    `;
  }

  // ── Add Modal ──
  showAddModal() {
    this.editingId = null;
    const body = this._renderForm();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveProject">保存</button>
    `;
    showModal('案件を追加', body, footer, { large: true });
    setTimeout(() => {
      $('#btnSaveProject')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  // ── Edit Modal ──
  showEditModal(id) {
    this.editingId = id;
    const project = store.getById('projects', id);
    if (!project) return;

    const body = this._renderForm();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveProject">更新</button>
    `;
    showModal('案件を編集', body, footer, { large: true });

    setTimeout(() => {
      const form = $('#projectForm');
      if (form) {
        populateForm(form, {
          ...project,
          'consent.photographConsent': project.consent?.photographConsent,
          'consent.modelRelease': project.consent?.modelRelease,
          'consent.commercialUse': project.consent?.commercialUse,
          'consent.snsPublication': project.consent?.snsPublication,
        });
      }
      $('#btnSaveProject')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  // ── Form HTML ──
  _renderForm() {
    const clients = store.getAll('clients');
    const locations = store.getAll('locations');

    return `
      <form id="projectForm" class="flex flex-col gap-4">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">案件名</label>
            <input type="text" name="title" class="form-input" required placeholder="例: 田中様 ウェディングフォト" />
          </div>
          <div class="form-group">
            <label class="form-label required">顧客</label>
            <select name="clientId" class="form-select" required>
              <option value="">選択してください</option>
              ${clients.map(c => `<option value="${c.id}">${c.name}${c.company ? ` (${c.company})` : ''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">カテゴリ</label>
            <select name="category" class="form-select">
              <option value="">選択してください</option>
              ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select name="status" class="form-select">
              ${ALL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">撮影開始日</label>
            <input type="date" name="shootDate" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">撮影終了日</label>
            <input type="date" name="shootEndDate" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ロケ地</label>
          <select name="locationId" class="form-select">
            <option value="">選択してください</option>
            ${locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">合計金額</label>
            <input type="number" name="totalAmount" class="form-input" placeholder="0" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">前受金</label>
            <input type="number" name="depositAmount" class="form-input" placeholder="0" min="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input type="checkbox" name="depositReceived" />
            <span class="text-body-md">前受金を受領済み</span>
          </label>
        </div>

        <div class="divider"></div>

        <div>
          <h4 class="text-title-lg mb-3">同意事項</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-wrapper">
                <input type="checkbox" name="consent.photographConsent" />
                <span class="text-body-md">撮影同意</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-wrapper">
                <input type="checkbox" name="consent.modelRelease" />
                <span class="text-body-md">モデルリリース</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-wrapper">
                <input type="checkbox" name="consent.commercialUse" />
                <span class="text-body-md">商用利用</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-wrapper">
                <input type="checkbox" name="consent.snsPublication" />
                <span class="text-body-md">SNS掲載</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="3" placeholder="案件に関するメモ..."></textarea>
        </div>
      </form>
    `;
  }

  // ── Save ──
  handleSave() {
    const form = $('#projectForm');
    if (!form) return;

    const rawData = collectFormData(form);

    // Validation
    if (!rawData.title || !rawData.clientId) {
      showSnackbar('案件名と顧客は必須です', 'error');
      return;
    }

    // Convert date fields to ISO
    if (rawData.shootDate) rawData.shootDate = new Date(rawData.shootDate).toISOString();
    if (rawData.shootEndDate) rawData.shootEndDate = new Date(rawData.shootEndDate).toISOString();

    // Build consent object
    const data = {
      title: rawData.title,
      clientId: rawData.clientId,
      category: rawData.category,
      status: rawData.status || '問い合わせ',
      shootDate: rawData.shootDate || null,
      shootEndDate: rawData.shootEndDate || null,
      locationId: rawData.locationId || null,
      totalAmount: rawData.totalAmount || 0,
      depositAmount: rawData.depositAmount || 0,
      depositReceived: rawData.depositReceived || false,
      consent: {
        photographConsent: rawData['consent.photographConsent'] || false,
        modelRelease: rawData['consent.modelRelease'] || false,
        commercialUse: rawData['consent.commercialUse'] || false,
        snsPublication: rawData['consent.snsPublication'] || false,
      },
      notes: rawData.notes || '',
    };

    if (this.editingId) {
      store.update('projects', this.editingId, data);
      showSnackbar('案件を更新しました', 'success');
    } else {
      store.add('projects', data);
      showSnackbar('案件を追加しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  // ── Delete ──
  async handleDelete(id) {
    const project = store.getById('projects', id);
    if (!project) return;

    const confirmed = await confirmDialog(
      '案件を削除',
      `「${project.title}」を削除してもよろしいですか？この操作は元に戻せません。`
    );

    if (confirmed) {
      store.delete('projects', id);
      showSnackbar('案件を削除しました', 'success');
      this.loadData();
    }
  }
}
