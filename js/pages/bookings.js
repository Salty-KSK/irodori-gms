// ============================================================
// GMS - 予約管理 Page
// ============================================================

import { store } from '../store.js';
import { formatDate, formatDateTime, renderStatusChip } from '../utils/format.js';
import { setPageTitle, showModal, hideModal, showSnackbar, confirmDialog, delegate, $, $$, collectFormData, populateForm, debounce, filterBySearch, sortData } from '../utils/helpers.js';

export class BookingsPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.sortField = 'preferredDate';
    this.sortDir = 'desc';
    this.currentFilter = '全て';
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-bookings animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h2 class="page-title">予約管理</h2>
            <p class="page-subtitle">撮影予約の受付・確定管理</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="btnAddBooking">
              <span class="material-symbols-outlined">add</span>
              追加
            </button>
          </div>
        </div>

        <!-- Status Filter -->
        <div class="chips-scroll mb-4" id="bookingStatusFilters">
          <button class="chip active" data-status="全て">全て</button>
          <button class="chip" data-status="申請中">申請中</button>
          <button class="chip" data-status="確認中">確認中</button>
          <button class="chip" data-status="確定">確定</button>
          <button class="chip" data-status="キャンセル">キャンセル</button>
        </div>

        <!-- Data Table (Desktop) -->
        <div class="data-table-wrapper hidden-mobile">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <div class="search-bar">
                <span class="material-symbols-outlined">search</span>
                <input type="text" placeholder="予約を検索..." id="bookingSearch">
              </div>
            </div>
            <div class="data-table-toolbar-right">
              <span class="text-body-sm text-secondary" id="bookingCount">0件</span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table" id="bookingTable">
              <thead>
                <tr>
                  <th data-sort="clientName">
                    予約者名
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="clientEmail">
                    メール
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="shootType">
                    撮影タイプ
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="preferredDate">
                    希望日
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="confirmedDate">
                    確定日
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="status">
                    ステータス
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th data-sort="source">
                    流入元
                    <span class="material-symbols-outlined sort-icon">unfold_more</span>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="bookingTableBody">
              </tbody>
            </table>
          </div>
          <div class="data-table-pagination" id="bookingPagination">
            <!-- Pagination if needed -->
          </div>
        </div>

        <!-- モバイル用カードリスト -->
        <div class="mobile-list hidden-desktop" id="bookingMobileList">
          <!-- 動的に描画 -->
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('予約管理');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('bookings');
    this.renderTable();
  }

  bindEvents() {
    $('#btnAddBooking')?.addEventListener('click', () => this.showAddModal());

    // Search (both desktop and mobile)
    const searchInput = $('#bookingSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      const mobileInput = $('#bookingSearchMobile');
      if (mobileInput) mobileInput.value = e.target.value;
      this.renderTable();
    }));

    const mobileSearchInput = $('#bookingSearchMobile');
    mobileSearchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      const desktopInput = $('#bookingSearch');
      if (desktopInput) desktopInput.value = e.target.value;
      this.renderTable();
    }));

    // Status filter
    delegate('#bookingStatusFilters', '.chip', 'click', (e, target) => {
      $$('#bookingStatusFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentFilter = target.dataset.status;
      this.renderTable();
    });

    // Sort
    delegate('#bookingTable thead', 'th[data-sort]', 'click', (e, target) => {
      const field = target.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      this.updateSortIndicators();
      this.renderTable();
    });

    // Table actions
    delegate('#bookingTableBody', '[data-action="confirm"]', 'click', (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.handleConfirm(id);
    });

    delegate('#bookingTableBody', '[data-action="detail"]', 'click', (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.showDetailModal(id);
    });

    delegate('#bookingTableBody', '[data-action="delete"]', 'click', async (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.handleDelete(id);
    });

    // Mobile card click
    delegate('#bookingMobileList', '.mobile-card', 'click', (e, target) => {
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });
  }

  updateSortIndicators() {
    $$('#bookingTable th').forEach(th => {
      th.classList.remove('sorted');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = 'unfold_more';
    });

    const activeTh = $(`#bookingTable th[data-sort="${this.sortField}"]`);
    if (activeTh) {
      activeTh.classList.add('sorted');
      const icon = activeTh.querySelector('.sort-icon');
      if (icon) icon.textContent = this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }
  }

  getFilteredData() {
    let filtered = [...this.data];

    if (this.currentFilter !== '全て') {
      filtered = filtered.filter(b => b.status === this.currentFilter);
    }

    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['clientName', 'clientEmail', 'shootType', 'source']);
    }

    if (this.sortField) {
      filtered = sortData(filtered, this.sortField, this.sortDir);
    }

    return filtered;
  }

  renderTable() {
    const tbody = $('#bookingTableBody');
    const countEl = $('#bookingCount');
    if (!tbody) return;

    const filtered = this.getFilteredData();

    if (countEl) countEl.textContent = `${filtered.length}件`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="data-table-empty">
              <span class="material-symbols-outlined">event</span>
              <p>予約がありません</p>
            </div>
          </td>
        </tr>
      `;
      // モバイルリストも空表示
      const mobileList = $('#bookingMobileList');
      if (mobileList) {
        mobileList.innerHTML = `<div class="mobile-empty">
          <span class="material-symbols-outlined">event</span>
          <p>予約がありません</p>
        </div>`;
      }
      return;
    }

    tbody.innerHTML = filtered.map(item => `
      <tr data-id="${item.id}">
        <td>
          <div class="flex items-center gap-2">
            <div class="avatar avatar-sm">${(item.clientName || '?').charAt(0)}</div>
            <span class="text-title-sm">${item.clientName || '-'}</span>
          </div>
        </td>
        <td class="text-body-sm">${item.clientEmail || '-'}</td>
        <td>${item.shootType ? `<span class="chip chip-xs">${item.shootType}</span>` : '-'}</td>
        <td class="text-numeric">${formatDate(item.preferredDate)}</td>
        <td class="text-numeric">${formatDate(item.confirmedDate)}</td>
        <td>${renderStatusChip(item.status)}</td>
        <td class="text-body-sm">${item.source || '-'}</td>
        <td>
          <div class="flex gap-1">
            ${item.status !== '確定' && item.status !== 'キャンセル' ? `
              <button class="btn btn-tonal btn-sm booking-confirm-btn" data-action="confirm" title="確定する">
                <span class="material-symbols-outlined">check_circle</span>
                確定
              </button>
            ` : ''}
            <button class="btn-icon" data-action="detail" title="詳細">
              <span class="material-symbols-outlined">visibility</span>
            </button>
            <button class="btn-icon" data-action="delete" title="削除">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Mobile card list
    const mobileList = $('#bookingMobileList');
    if (mobileList) {
      if (filtered.length === 0) {
        mobileList.innerHTML = `
          <div class="mobile-empty">
            <span class="material-symbols-outlined">event</span>
            <p>予約がありません</p>
          </div>`;
      } else {
        mobileList.innerHTML = filtered.map(item => `
          <div class="mobile-card" data-id="${item.id}">
            <div class="mobile-card-avatar">${(item.clientName || '?').charAt(0)}</div>
            <div class="mobile-card-main">
              <div class="mobile-card-title">${item.clientName || '-'}</div>
              <div class="mobile-card-sub">
                ${item.shootType ? `<span>${item.shootType}</span><span>·</span>` : ''}
                <span>${formatDate(item.preferredDate)}</span>
              </div>
            </div>
            <div class="mobile-card-end">
              ${renderStatusChip(item.status)}
              <span class="material-symbols-outlined mobile-card-chevron">chevron_right</span>
            </div>
          </div>
        `).join('');
      }
    }
  }

  handleConfirm(id) {
    const now = new Date().toISOString();
    store.update('bookings', id, {
      status: '確定',
      confirmedDate: now
    });
    showSnackbar('予約を確定しました', 'success');
    this.loadData();
  }

  showDetailModal(id) {
    const item = store.getById('bookings', id);
    if (!item) return;

    const body = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="avatar avatar-lg">${(item.clientName || '?').charAt(0)}</div>
          <div>
            <div class="text-headline-md">${item.clientName || '-'}</div>
            <div class="text-body-md text-secondary">${item.clientEmail || '-'}</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-label-md text-secondary mb-1">電話番号</div>
            <div class="text-body-md">${item.clientPhone || '-'}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">撮影タイプ</div>
            <div class="text-body-md">${item.shootType || '-'}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">希望日</div>
            <div class="text-body-md text-numeric">${formatDateTime(item.preferredDate)}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">代替日</div>
            <div class="text-body-md text-numeric">${formatDateTime(item.alternateDate)}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">確定日</div>
            <div class="text-body-md text-numeric">${formatDateTime(item.confirmedDate)}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">ステータス</div>
            <div>${renderStatusChip(item.status)}</div>
          </div>
          <div>
            <div class="text-label-md text-secondary mb-1">流入元</div>
            <div class="text-body-md">${item.source || '-'}</div>
          </div>
        </div>

        ${item.message ? `
          <div class="divider"></div>
          <div>
            <div class="text-label-md text-secondary mb-1">メッセージ</div>
            <div class="text-body-md" style="white-space: pre-wrap;">${item.message}</div>
          </div>
        ` : ''}

        ${item.notes ? `
          <div>
            <div class="text-label-md text-secondary mb-1">メモ</div>
            <div class="text-body-md" style="white-space: pre-wrap;">${item.notes}</div>
          </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">閉じる</button>
      <button class="btn btn-tonal" id="btnEditFromDetail" data-id="${item.id}">
        <span class="material-symbols-outlined">edit</span>
        編集
      </button>
    `;
    showModal('予約詳細', body, footer, { large: true });

    setTimeout(() => {
      $('#btnEditFromDetail')?.addEventListener('click', (e) => {
        hideModal();
        setTimeout(() => this.showEditModal(e.target.closest('[data-id]').dataset.id), 200);
      });
    }, 50);
  }

  showAddModal() {
    this.editingId = null;
    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveBooking">保存</button>
    `;
    showModal('予約を追加', body, footer, { large: true });

    setTimeout(() => {
      $('#btnSaveBooking')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  showEditModal(id) {
    const item = store.getById('bookings', id);
    if (!item) return;
    this.editingId = id;

    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveBooking">更新</button>
    `;
    showModal('予約を編集', body, footer, { large: true });

    setTimeout(() => {
      const form = $('#bookingForm');
      if (form && item) {
        populateForm(form, item);
      }
      $('#btnSaveBooking')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  getFormHtml() {
    return `
      <form id="bookingForm" class="flex flex-col gap-4">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">予約者名</label>
            <input type="text" name="clientName" class="form-input" required placeholder="田中 太郎">
          </div>
          <div class="form-group">
            <label class="form-label required">メールアドレス</label>
            <input type="email" name="clientEmail" class="form-input" required placeholder="example@email.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">電話番号</label>
            <input type="tel" name="clientPhone" class="form-input" placeholder="090-1234-5678">
          </div>
          <div class="form-group">
            <label class="form-label">撮影タイプ</label>
            <select name="shootType" class="form-select">
              <option value="">選択してください</option>
              <option value="ウェディング">ウェディング</option>
              <option value="ポートレート">ポートレート</option>
              <option value="七五三">七五三</option>
              <option value="家族写真">家族写真</option>
              <option value="商品撮影">商品撮影</option>
              <option value="企業撮影">企業撮影</option>
              <option value="イベント">イベント</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">希望日時</label>
            <input type="datetime-local" name="preferredDate" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">代替日時</label>
            <input type="datetime-local" name="alternateDate" class="form-input">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">確定日時</label>
            <input type="datetime-local" name="confirmedDate" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select name="status" class="form-select">
              <option value="申請中">申請中</option>
              <option value="確認中">確認中</option>
              <option value="確定">確定</option>
              <option value="キャンセル">キャンセル</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">流入元</label>
          <select name="source" class="form-select">
            <option value="">選択してください</option>
            <option value="Webフォーム">Webフォーム</option>
            <option value="電話">電話</option>
            <option value="メール">メール</option>
            <option value="SNS">SNS</option>
            <option value="紹介">紹介</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">メッセージ</label>
          <textarea name="message" class="form-textarea" rows="3" placeholder="お客様からのメッセージ"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="2" placeholder="内部メモ"></textarea>
        </div>
      </form>
    `;
  }

  handleSave() {
    const form = $('#bookingForm');
    if (!form) return;

    const data = collectFormData(form);

    if (!data.clientName) {
      showSnackbar('予約者名を入力してください', 'error');
      return;
    }
    if (!data.clientEmail) {
      showSnackbar('メールアドレスを入力してください', 'error');
      return;
    }

    if (this.editingId) {
      store.update('bookings', this.editingId, data);
      showSnackbar('予約を更新しました', 'success');
    } else {
      store.add('bookings', data);
      showSnackbar('予約を追加しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  async handleDelete(id) {
    const confirmed = await confirmDialog('予約の削除', 'この予約を削除してもよろしいですか？');
    if (confirmed) {
      store.delete('bookings', id);
      showSnackbar('予約を削除しました');
      this.loadData();
    }
  }
}
