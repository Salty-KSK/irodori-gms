// ============================================================
// GMS - サブスク管理 Page
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, renderStatusChip } from '../utils/format.js';
import { setPageTitle, showModal, hideModal, showSnackbar, confirmDialog, delegate, $, $$, collectFormData, populateForm, debounce, filterBySearch } from '../utils/helpers.js';

export class SubscriptionsPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.currentFilter = '全て';
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-subscriptions animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h2 class="page-title">サブスク管理</h2>
            <p class="page-subtitle">利用中のサブスクリプションを一括管理</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="btnAddSub">
              <span class="material-symbols-outlined">add</span>
              追加
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-3 gap-4 mb-6 stagger-children" id="subStats">
          <!-- Rendered dynamically -->
        </div>

        <!-- Status Filter -->
        <div class="flex gap-2 flex-wrap mb-6" id="subStatusFilters">
          <button class="chip active" data-status="全て">全て</button>
          <button class="chip" data-status="利用中">利用中</button>
          <button class="chip" data-status="休止中">休止中</button>
          <button class="chip" data-status="解約済">解約済</button>
        </div>

        <!-- Service Cards Grid -->
        <div class="grid grid-cols-3 gap-4 stagger-children" id="subGrid">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('サブスク管理');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('subscriptions');
    this.renderStats();
    this.renderGrid();
  }

  bindEvents() {
    $('#btnAddSub')?.addEventListener('click', () => this.showAddModal());

    delegate('#subStatusFilters', '.chip', 'click', (e, target) => {
      $$('#subStatusFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentFilter = target.dataset.status;
      this.renderGrid();
    });

    delegate('#subGrid', '[data-action="edit"]', 'click', (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.showEditModal(id);
    });

    delegate('#subGrid', '[data-action="delete"]', 'click', async (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.handleDelete(id);
    });

    delegate('#subGrid', '[data-action="login"]', 'click', (e, target) => {
      const url = target.dataset.url;
      if (url) window.open(url, '_blank');
    });
  }

  renderStats() {
    const stats = $('#subStats');
    if (!stats) return;

    const monthlyTotal = store.sum('subscriptions', 'monthlyFee', s => s.status === '利用中');
    const annualTotal = monthlyTotal * 12;
    const activeCount = store.count('subscriptions', s => s.status === '利用中');

    stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-info-container); color: var(--md-on-info-container);">
          <span class="material-symbols-outlined">payments</span>
        </div>
        <div class="stat-card-label">月額合計</div>
        <div class="stat-card-value text-numeric">${formatCurrency(monthlyTotal)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-tertiary-container); color: var(--md-tertiary-on-container);">
          <span class="material-symbols-outlined">calendar_month</span>
        </div>
        <div class="stat-card-label">年額合計</div>
        <div class="stat-card-value text-numeric">${formatCurrency(annualTotal)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--md-success-container); color: var(--md-on-success-container);">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <div class="stat-card-label">利用中サービス</div>
        <div class="stat-card-value text-numeric">${activeCount}<span style="font: var(--text-body-md); margin-left: 4px;">件</span></div>
      </div>
    `;
  }

  getFilteredData() {
    let filtered = [...this.data];

    if (this.currentFilter !== '全て') {
      filtered = filtered.filter(s => s.status === this.currentFilter);
    }

    return filtered;
  }

  renderGrid() {
    const grid = $('#subGrid');
    if (!grid) return;

    const filtered = this.getFilteredData();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <span class="material-symbols-outlined">card_membership</span>
          <h3>サブスクリプションがありません</h3>
          <p>利用中のサブスクリプションを追加して管理しましょう</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => this.renderCard(item)).join('');
  }

  renderCard(item) {
    const categoryIcons = {
      '写真編集': 'photo_camera',
      'クラウドストレージ': 'cloud',
      'デザイン': 'palette',
      '動画編集': 'movie',
      '音楽': 'music_note',
      '会計': 'calculate',
      'ドメイン・サーバー': 'dns',
      'その他': 'apps'
    };

    const icon = categoryIcons[item.category] || 'apps';

    return `
      <div class="sub-card card" data-id="${item.id}">
        <div class="sub-card-header">
          <div class="sub-card-icon" data-category="${item.category || ''}">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          <div class="sub-card-info">
            <div class="sub-card-name">${item.serviceName || '-'}</div>
            ${item.category ? `<span class="chip chip-xs">${item.category}</span>` : ''}
          </div>
          <div class="sub-card-actions">
            <button class="btn-icon" data-action="edit" title="編集">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" data-action="delete" title="削除">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="sub-card-body">
          ${item.plan ? `<div class="sub-card-plan">${item.plan}</div>` : ''}
          <div class="sub-card-price">
            <span class="sub-card-amount text-numeric">${formatCurrency(item.monthlyFee || 0)}</span>
            <span class="sub-card-cycle">/月</span>
          </div>
          <div class="sub-card-details">
            ${item.renewalDate ? `
              <div class="sub-card-detail">
                <span class="material-symbols-outlined">event</span>
                次回更新: ${formatDate(item.renewalDate)}
              </div>
            ` : ''}
            <div class="sub-card-detail">
              ${renderStatusChip(item.status)}
            </div>
          </div>
        </div>
        ${item.loginUrl ? `
          <div class="sub-card-footer">
            <button class="btn btn-text btn-sm" data-action="login" data-url="${item.loginUrl}">
              <span class="material-symbols-outlined">open_in_new</span>
              ログイン
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  showAddModal() {
    this.editingId = null;
    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveSub">保存</button>
    `;
    showModal('サブスクリプションを追加', body, footer, { large: true });

    setTimeout(() => {
      $('#btnSaveSub')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  showEditModal(id) {
    const item = store.getById('subscriptions', id);
    if (!item) return;
    this.editingId = id;

    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveSub">更新</button>
    `;
    showModal('サブスクリプションを編集', body, footer, { large: true });

    setTimeout(() => {
      const form = $('#subForm');
      if (form && item) {
        populateForm(form, item);
      }
      $('#btnSaveSub')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  getFormHtml() {
    return `
      <form id="subForm" class="flex flex-col gap-4">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">サービス名</label>
            <input type="text" name="serviceName" class="form-input" required placeholder="例: Adobe Creative Cloud">
          </div>
          <div class="form-group">
            <label class="form-label">カテゴリ</label>
            <select name="category" class="form-select">
              <option value="">選択してください</option>
              <option value="写真編集">写真編集</option>
              <option value="クラウドストレージ">クラウドストレージ</option>
              <option value="デザイン">デザイン</option>
              <option value="動画編集">動画編集</option>
              <option value="音楽">音楽</option>
              <option value="会計">会計</option>
              <option value="ドメイン・サーバー">ドメイン・サーバー</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">プラン</label>
            <input type="text" name="plan" class="form-input" placeholder="例: フォトプラン (20GB)">
          </div>
          <div class="form-group">
            <label class="form-label required">月額料金</label>
            <input type="number" name="monthlyFee" class="form-input" required placeholder="0" min="0">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">年額料金</label>
            <input type="number" name="annualFee" class="form-input" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">請求サイクル</label>
            <select name="billingCycle" class="form-select">
              <option value="月額">月額</option>
              <option value="年額">年額</option>
              <option value="四半期">四半期</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">支払い方法</label>
            <select name="paymentMethod" class="form-select">
              <option value="">選択してください</option>
              <option value="クレカ">クレカ</option>
              <option value="銀行振込">銀行振込</option>
              <option value="コンビニ払い">コンビニ払い</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select name="status" class="form-select">
              <option value="利用中">利用中</option>
              <option value="休止中">休止中</option>
              <option value="解約済">解約済</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">アカウントメール</label>
            <input type="email" name="accountEmail" class="form-input" placeholder="user@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">アカウントID</label>
            <input type="text" name="accountId" class="form-input" placeholder="ユーザーIDなど">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">ログインURL</label>
          <input type="url" name="loginUrl" class="form-input" placeholder="https://...">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">利用開始日</label>
            <input type="date" name="startDate" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">次回更新日</label>
            <input type="date" name="renewalDate" class="form-input">
          </div>
        </div>

        <div class="checkbox-wrapper">
          <input type="checkbox" name="autoRenew" id="autoRenew">
          <label for="autoRenew">自動更新</label>
        </div>

        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="2" placeholder="補足メモ"></textarea>
        </div>
      </form>
    `;
  }

  handleSave() {
    const form = $('#subForm');
    if (!form) return;

    const data = collectFormData(form);

    if (!data.serviceName) {
      showSnackbar('サービス名を入力してください', 'error');
      return;
    }
    if (data.monthlyFee == null) {
      showSnackbar('月額料金を入力してください', 'error');
      return;
    }

    if (this.editingId) {
      store.update('subscriptions', this.editingId, data);
      showSnackbar('サブスクリプションを更新しました', 'success');
    } else {
      store.add('subscriptions', data);
      showSnackbar('サブスクリプションを追加しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  async handleDelete(id) {
    const confirmed = await confirmDialog('サブスクの削除', 'このサブスクリプションを削除してもよろしいですか？');
    if (confirmed) {
      store.delete('subscriptions', id);
      showSnackbar('サブスクリプションを削除しました');
      this.loadData();
    }
  }
}
