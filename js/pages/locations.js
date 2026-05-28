// ============================================================
// GMS - Locations Page (ロケ地データベース)
// ============================================================

import { store } from '../store.js';
import { formatCurrency, renderStars } from '../utils/format.js';
import {
  setPageTitle, showModal, hideModal, showSnackbar, confirmDialog,
  delegate, $, $$, collectFormData, populateForm, debounce,
  filterBySearch, sortData
} from '../utils/helpers.js';

export class LocationsPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.currentCategory = 'all';
    this.categories = ['全て', '屋内スタジオ', '屋外', '神社・寺院', '公園', '商業施設', '自然', 'その他'];
    this.seasons = ['春', '夏', '秋', '冬'];
    this.timesOfDay = ['朝', '昼', '夕方', 'ゴールデンアワー'];
  }

  render() {
    return `
      <div class="page-locations animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">ロケ地データベース</h1>
            <p class="page-subtitle">撮影ロケーションの管理</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-filled" id="locAddBtn">
              <span class="material-symbols-outlined">add</span>
              ロケ地を追加
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="loc-filter-section">
          <div class="loc-filter-chips" id="locCategoryChips">
            ${this.categories.map(c => `
              <button class="chip ${c === '全て' ? 'active' : ''}" data-category="${c}">${c}</button>
            `).join('')}
          </div>
          <div class="search-bar loc-search">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="ロケ地を検索..." id="locSearchInput">
          </div>
        </div>

        <!-- Card Grid -->
        <div class="loc-grid" id="locGrid"></div>

        <!-- Empty State -->
        <div class="empty-state" id="locEmpty" style="display:none;">
          <span class="material-symbols-outlined">location_on</span>
          <h3>ロケ地が登録されていません</h3>
          <p>撮影場所の情報を追加して管理しましょう</p>
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('ロケ地データベース');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('locations');
    this.renderList();
  }

  bindEvents() {
    // Add button
    $('#locAddBtn')?.addEventListener('click', () => this.showAddModal());

    // Category filter
    delegate('#locCategoryChips', '.chip', 'click', (e, target) => {
      $$('#locCategoryChips .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentCategory = target.dataset.category;
      this.renderList();
    });

    // Search
    const searchInput = $('#locSearchInput');
    searchInput?.addEventListener('input', debounce(() => {
      this.searchText = searchInput.value;
      this.renderList();
    }, 200));

    // Card actions
    delegate('#locGrid', '.loc-card-edit', 'click', (e, target) => {
      e.stopPropagation();
      const id = target.closest('.loc-card').dataset.id;
      const item = store.getById('locations', id);
      if (item) this.showAddModal(item);
    });

    delegate('#locGrid', '.loc-card-delete', 'click', async (e, target) => {
      e.stopPropagation();
      const id = target.closest('.loc-card').dataset.id;
      const item = store.getById('locations', id);
      if (!item) return;
      const confirmed = await confirmDialog('ロケ地の削除', `「${item.name}」を削除しますか？この操作は取り消せません。`);
      if (confirmed) {
        store.delete('locations', id);
        showSnackbar('ロケ地を削除しました');
        this.loadData();
      }
    });

    // Card click for detail
    delegate('#locGrid', '.loc-card', 'click', (e, target) => {
      // Don't open detail if clicking on action buttons
      if (e.target.closest('.loc-card-actions')) return;
      const id = target.dataset.id;
      if (id) this.showDetailModal(id);
    });
  }

  getFilteredData() {
    let filtered = [...this.data];
    if (this.currentCategory !== '全て' && this.currentCategory !== 'all') {
      filtered = filtered.filter(l => l.category === this.currentCategory);
    }
    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['name', 'address', 'category', 'accessInfo']);
    }
    return filtered;
  }

  renderList() {
    const filtered = this.getFilteredData();
    const grid = $('#locGrid');
    const emptyEl = $('#locEmpty');

    if (filtered.length === 0) {
      if (grid) grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    if (grid) {
      grid.innerHTML = filtered.map((loc, idx) => `
        <div class="loc-card card card-elevated" data-id="${loc.id}" style="animation-delay: ${idx * 50}ms; cursor: pointer;">
          <div class="loc-card-body">
            <div class="loc-card-top">
              <span class="chip loc-category-chip">${loc.category || 'その他'}</span>
              ${renderStars(loc.rating || 0)}
            </div>
            <h3 class="loc-card-name">${loc.name || '-'}</h3>
            ${loc.address ? `
              <p class="loc-card-address">
                <span class="material-symbols-outlined">location_on</span>
                ${loc.address}
              </p>
            ` : ''}
            <div class="loc-card-meta">
              <div class="loc-card-fee">
                <span class="material-symbols-outlined">payments</span>
                ${loc.fee ? formatCurrency(loc.fee) : '無料'}
                ${loc.feeNotes ? `<span class="loc-fee-note">${loc.feeNotes}</span>` : ''}
              </div>
              ${loc.reservationRequired ? `
                <div class="loc-card-reservation">
                  <span class="material-symbols-outlined">event_available</span>
                  予約必要
                </div>
              ` : `
                <div class="loc-card-reservation loc-no-reservation">
                  <span class="material-symbols-outlined">event_busy</span>
                  予約不要
                </div>
              `}
            </div>
            ${loc.bestSeason && loc.bestSeason.length > 0 ? `
              <div class="loc-card-seasons">
                <span class="loc-seasons-label">ベストシーズン:</span>
                ${loc.bestSeason.map(s => `<span class="chip loc-season-chip">${this.getSeasonEmoji(s)} ${s}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          <div class="loc-card-footer">
            <div class="loc-card-actions">
              <button class="btn-icon loc-card-edit" title="編集">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon loc-card-delete" title="削除">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  getSeasonEmoji(season) {
    const map = { '春': '🌸', '夏': '☀️', '秋': '🍁', '冬': '❄️' };
    return map[season] || '';
  }

  showDetailModal(id) {
    const loc = store.getById('locations', id);
    if (!loc) return;

    const bodyHtml = `
      <div class="loc-detail">
        <div class="loc-detail-header">
          <div class="loc-detail-icon">
            <span class="material-symbols-outlined">location_on</span>
          </div>
          <div class="loc-detail-info">
            <h3 class="loc-detail-name">${loc.name || '-'}</h3>
            <div class="loc-detail-category-row">
              <span class="chip">${loc.category || 'その他'}</span>
              ${renderStars(loc.rating || 0)}
            </div>
          </div>
        </div>

        <div class="loc-detail-grid">
          <div class="loc-detail-item">
            <span class="material-symbols-outlined">location_on</span>
            <div>
              <span class="loc-detail-label">住所</span>
              <span class="loc-detail-value">${loc.address || '-'}</span>
            </div>
          </div>
          <div class="loc-detail-item">
            <span class="material-symbols-outlined">payments</span>
            <div>
              <span class="loc-detail-label">料金</span>
              <span class="loc-detail-value">${loc.fee ? formatCurrency(loc.fee) : '無料'}${loc.feeNotes ? ` (${loc.feeNotes})` : ''}</span>
            </div>
          </div>
          <div class="loc-detail-item">
            <span class="material-symbols-outlined">train</span>
            <div>
              <span class="loc-detail-label">アクセス</span>
              <span class="loc-detail-value">${loc.accessInfo || '-'}</span>
            </div>
          </div>
          <div class="loc-detail-item">
            <span class="material-symbols-outlined">local_parking</span>
            <div>
              <span class="loc-detail-label">駐車場</span>
              <span class="loc-detail-value">${loc.parkingInfo || '-'}</span>
            </div>
          </div>
          <div class="loc-detail-item">
            <span class="material-symbols-outlined">event_available</span>
            <div>
              <span class="loc-detail-label">予約</span>
              <span class="loc-detail-value">${loc.reservationRequired ? '必要' : '不要'}</span>
            </div>
          </div>
          ${loc.contactInfo ? `
            <div class="loc-detail-item">
              <span class="material-symbols-outlined">call</span>
              <div>
                <span class="loc-detail-label">連絡先</span>
                <span class="loc-detail-value">${loc.contactInfo}</span>
              </div>
            </div>
          ` : ''}
        </div>

        ${loc.bestSeason && loc.bestSeason.length > 0 ? `
          <div class="loc-detail-section">
            <h4>ベストシーズン</h4>
            <div class="loc-detail-chips">
              ${loc.bestSeason.map(s => `<span class="chip">${this.getSeasonEmoji(s)} ${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${loc.bestTimeOfDay && loc.bestTimeOfDay.length > 0 ? `
          <div class="loc-detail-section">
            <h4>ベスト撮影時間帯</h4>
            <div class="loc-detail-chips">
              ${loc.bestTimeOfDay.map(t => `<span class="chip">${t}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${loc.shootingTips ? `
          <div class="loc-detail-section loc-tips-section">
            <h4>
              <span class="material-symbols-outlined">tips_and_updates</span>
              撮影ヒント
            </h4>
            <div class="loc-tips-content">${this.renderShootingTips(loc.shootingTips)}</div>
          </div>
        ` : ''}

        ${loc.notes ? `
          <div class="loc-detail-section">
            <h4>備考</h4>
            <p class="loc-detail-notes-text">${loc.notes}</p>
          </div>
        ` : ''}
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-text" style="color: var(--md-error);" id="locDetailDelete" data-id="${loc.id}">削除</button>
      <div style="flex:1;"></div>
      <button class="btn btn-outlined" id="locDetailEdit" data-id="${loc.id}">編集</button>
      <button class="btn btn-text" id="locDetailClose">閉じる</button>
    `;

    showModal('ロケ地詳細', bodyHtml, footerHtml, { large: true });

    setTimeout(() => {
      $('#locDetailClose')?.addEventListener('click', hideModal);
      $('#locDetailEdit')?.addEventListener('click', () => {
        hideModal();
        setTimeout(() => this.showAddModal(loc), 200);
      });
      $('#locDetailDelete')?.addEventListener('click', async () => {
        const confirmed = await confirmDialog('ロケ地の削除', `「${loc.name}」を削除しますか？この操作は取り消せません。`);
        if (confirmed) {
          store.delete('locations', loc.id);
          showSnackbar('ロケ地を削除しました');
          this.loadData();
        }
      });
    }, 50);
  }

  renderShootingTips(tips) {
    if (!tips) return '';
    // Simple markdown-like rendering: handle headers and bullet points
    return tips
      .replace(/^# (.+)$/gm, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<div class="loc-tip-item">• $1</div>')
      .replace(/\\n/g, '<br>')
      .replace(/\n/g, '<br>');
  }

  showAddModal(editItem = null) {
    const isEdit = !!editItem;
    const title = isEdit ? 'ロケ地を編集' : 'ロケ地を追加';

    const bodyHtml = `
      <form id="locForm" class="loc-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">ロケ地名</label>
            <input type="text" class="form-input" name="name" required placeholder="例: 明治神宮">
          </div>
          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select class="form-select" name="category" required>
              <option value="">選択してください</option>
              ${this.categories.filter(c => c !== '全て').map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">住所</label>
          <input type="text" class="form-input" name="address" placeholder="例: 東京都渋谷区代々木神園町1-1">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">アクセス情報</label>
            <input type="text" class="form-input" name="accessInfo" placeholder="例: JR原宿駅から徒歩1分">
          </div>
          <div class="form-group">
            <label class="form-label">駐車場情報</label>
            <input type="text" class="form-input" name="parkingInfo" placeholder="例: 有料駐車場あり">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">料金</label>
            <input type="number" class="form-input" name="fee" placeholder="0（無料の場合）" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">料金備考</label>
            <input type="text" class="form-input" name="feeNotes" placeholder="例: 半日料金">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">連絡先</label>
            <input type="text" class="form-input" name="contactInfo" placeholder="例: 03-0000-0000">
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
        </div>
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input type="checkbox" name="reservationRequired">
            <span>予約が必要</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">ベストシーズン</label>
          <div class="loc-checkbox-group" id="locSeasonCheckboxes">
            ${this.seasons.map(s => `
              <label class="checkbox-wrapper">
                <input type="checkbox" name="bestSeason_${s}" value="${s}">
                <span>${this.getSeasonEmoji(s)} ${s}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ベスト撮影時間帯</label>
          <div class="loc-checkbox-group" id="locTimeCheckboxes">
            ${this.timesOfDay.map(t => `
              <label class="checkbox-wrapper">
                <input type="checkbox" name="bestTime_${t}" value="${t}">
                <span>${t}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">撮影ヒント</label>
          <textarea class="form-textarea" name="shootingTips" rows="4" placeholder="撮影時の注意点やおすすめポイント..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">備考</label>
          <textarea class="form-textarea" name="notes" rows="3" placeholder="メモ..."></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" id="locFormCancel">キャンセル</button>
      <button class="btn btn-filled" id="locFormSave">${isEdit ? '更新' : '追加'}</button>
    `;

    showModal(title, bodyHtml, footerHtml, { large: true });

    if (isEdit) {
      setTimeout(() => {
        const form = $('#locForm');
        if (form) {
          populateForm(form, editItem);
          // Populate season checkboxes
          if (editItem.bestSeason) {
            editItem.bestSeason.forEach(s => {
              const cb = form.querySelector(`[name="bestSeason_${s}"]`);
              if (cb) cb.checked = true;
            });
          }
          // Populate time checkboxes
          if (editItem.bestTimeOfDay) {
            editItem.bestTimeOfDay.forEach(t => {
              const cb = form.querySelector(`[name="bestTime_${t}"]`);
              if (cb) cb.checked = true;
            });
          }
        }
      }, 50);
    }

    setTimeout(() => {
      $('#locFormCancel')?.addEventListener('click', hideModal);
      $('#locFormSave')?.addEventListener('click', () => {
        const form = $('#locForm');
        if (!form || !form.checkValidity()) {
          form?.reportValidity();
          return;
        }
        const rawData = collectFormData(form);

        // Build bestSeason array from checkboxes
        const bestSeason = this.seasons.filter(s => rawData[`bestSeason_${s}`]);
        // Build bestTimeOfDay array from checkboxes
        const bestTimeOfDay = this.timesOfDay.filter(t => rawData[`bestTime_${t}`]);

        // Clean up checkbox fields
        const data = {};
        Object.entries(rawData).forEach(([key, value]) => {
          if (!key.startsWith('bestSeason_') && !key.startsWith('bestTime_')) {
            data[key] = value;
          }
        });
        data.bestSeason = bestSeason;
        data.bestTimeOfDay = bestTimeOfDay;
        if (data.rating) data.rating = Number(data.rating);
        if (data.fee) data.fee = Number(data.fee);

        if (isEdit) {
          store.update('locations', editItem.id, data);
          showSnackbar('ロケ地を更新しました', 'success');
        } else {
          store.add('locations', data);
          showSnackbar('ロケ地を追加しました', 'success');
        }
        hideModal();
        this.loadData();
      });
    }, 50);
  }
}
