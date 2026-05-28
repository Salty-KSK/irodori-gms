// ============================================================
// GMS - SNSネタ帳 Page
// ============================================================

import { store } from '../store.js';
import { renderStatusChip, formatDate } from '../utils/format.js';
import { setPageTitle, showModal, hideModal, showSnackbar, confirmDialog, delegate, $, $$, collectFormData, populateForm, debounce, filterBySearch } from '../utils/helpers.js';

export class SnsIdeasPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.currentPlatform = '全て';
    this.currentStatus = '全て';
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-sns-ideas animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h2 class="page-title">SNSネタ帳</h2>
            <p class="page-subtitle">投稿アイデアの管理・計画</p>
          </div>
          <div class="page-header-right">
            <div class="search-bar">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="ネタを検索..." id="snsSearch">
            </div>
            <button class="btn btn-filled" id="btnAddIdea">
              <span class="material-symbols-outlined">add</span>
              追加
            </button>
          </div>
        </div>

        <!-- Platform Filter -->
        <div class="filter-section mb-4">
          <div class="filter-label text-label-md text-secondary mb-2">プラットフォーム</div>
          <div class="flex gap-2 flex-wrap" id="platformFilters">
            <button class="chip active" data-platform="全て">全て</button>
            <button class="chip" data-platform="Instagram">
              <span class="material-symbols-outlined" style="font-size:16px;">photo_camera</span>
              Instagram
            </button>
            <button class="chip" data-platform="X">
              <span class="material-symbols-outlined" style="font-size:16px;">tag</span>
              X
            </button>
            <button class="chip" data-platform="TikTok">
              <span class="material-symbols-outlined" style="font-size:16px;">play_circle</span>
              TikTok
            </button>
            <button class="chip" data-platform="YouTube">
              <span class="material-symbols-outlined" style="font-size:16px;">smart_display</span>
              YouTube
            </button>
            <button class="chip" data-platform="Blog">
              <span class="material-symbols-outlined" style="font-size:16px;">article</span>
              Blog
            </button>
          </div>
        </div>

        <!-- Status Filter -->
        <div class="filter-section mb-6">
          <div class="filter-label text-label-md text-secondary mb-2">ステータス</div>
          <div class="flex gap-2 flex-wrap" id="statusFilters">
            <button class="chip active" data-status="全て">全て</button>
            <button class="chip" data-status="アイデア">アイデア</button>
            <button class="chip" data-status="下書き">下書き</button>
            <button class="chip" data-status="制作中">制作中</button>
            <button class="chip" data-status="投稿予定">投稿予定</button>
            <button class="chip" data-status="投稿済">投稿済</button>
          </div>
        </div>

        <!-- Kanban Board -->
        <div class="kanban-board" id="kanbanBoard">
          <!-- Columns rendered dynamically -->
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('SNSネタ帳');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('snsIdeas');
    this.renderKanban();
  }

  bindEvents() {
    // Add button
    $('#btnAddIdea')?.addEventListener('click', () => this.showAddModal());

    // Search
    const searchInput = $('#snsSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      this.renderKanban();
    }));

    // Platform filter
    delegate('#platformFilters', '.chip', 'click', (e, target) => {
      $$('#platformFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentPlatform = target.dataset.platform;
      this.renderKanban();
    });

    // Status filter
    delegate('#statusFilters', '.chip', 'click', (e, target) => {
      $$('#statusFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentStatus = target.dataset.status;
      this.renderKanban();
    });

    // Kanban card actions
    delegate('#kanbanBoard', '[data-action="edit"]', 'click', (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.showEditModal(id);
    });

    delegate('#kanbanBoard', '[data-action="delete"]', 'click', async (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.handleDelete(id);
    });
  }

  getFilteredData() {
    let filtered = [...this.data];

    if (this.currentPlatform !== '全て') {
      filtered = filtered.filter(i => i.platform === this.currentPlatform);
    }

    if (this.currentStatus !== '全て') {
      filtered = filtered.filter(i => i.status === this.currentStatus);
    }

    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['title', 'content', 'platform', 'category']);
    }

    return filtered;
  }

  renderKanban() {
    const board = $('#kanbanBoard');
    if (!board) return;

    const statuses = ['アイデア', '下書き', '制作中', '投稿予定', '投稿済'];
    const filtered = this.getFilteredData();

    const statusIcons = {
      'アイデア': 'lightbulb',
      '下書き': 'edit_note',
      '制作中': 'construction',
      '投稿予定': 'schedule',
      '投稿済': 'check_circle'
    };

    board.innerHTML = statuses.map(status => {
      const items = filtered.filter(i => i.status === status);
      return `
        <div class="kanban-column" data-status="${status}">
          <div class="kanban-column-header">
            <div class="kanban-column-title">
              <span class="material-symbols-outlined">${statusIcons[status]}</span>
              ${status}
            </div>
            <span class="kanban-column-count">${items.length}</span>
          </div>
          <div class="kanban-column-body">
            ${items.length === 0 ? `
              <div class="kanban-empty">
                <span class="material-symbols-outlined">inbox</span>
                <span>アイテムなし</span>
              </div>
            ` : items.map(item => this.renderCard(item)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderCard(item) {
    const priorityClass = {
      '高': 'priority-high',
      '中': 'priority-medium',
      '低': 'priority-low'
    }[item.priority] || '';

    const platformIcon = {
      'Instagram': 'photo_camera',
      'X': 'tag',
      'TikTok': 'play_circle',
      'YouTube': 'smart_display',
      'Blog': 'article'
    }[item.platform] || 'public';

    const hashtags = Array.isArray(item.hashtags)
      ? item.hashtags
      : (item.hashtags || '').split(',').filter(t => t.trim());

    return `
      <div class="kanban-card card" data-id="${item.id}">
        <div class="kanban-card-header">
          <div class="kanban-card-title">${item.title || '(無題)'}</div>
          <div class="kanban-card-actions">
            <button class="btn-icon" data-action="edit" title="編集">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" data-action="delete" title="削除">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="kanban-card-body">
          <div class="kanban-card-meta">
            <span class="chip chip-sm" data-platform="${item.platform}">
              <span class="material-symbols-outlined" style="font-size:14px;">${platformIcon}</span>
              ${item.platform || '-'}
            </span>
            ${item.priority ? `<span class="priority-badge ${priorityClass}">${item.priority}</span>` : ''}
          </div>
          ${hashtags.length > 0 ? `
            <div class="kanban-card-tags">
              ${hashtags.slice(0, 3).map(tag => `<span class="hashtag">${tag.trim()}</span>`).join('')}
              ${hashtags.length > 3 ? `<span class="hashtag-more">+${hashtags.length - 3}</span>` : ''}
            </div>
          ` : ''}
          ${item.scheduledDate ? `
            <div class="kanban-card-date">
              <span class="material-symbols-outlined">schedule</span>
              ${formatDate(item.scheduledDate)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  showAddModal() {
    this.editingId = null;
    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveIdea">保存</button>
    `;
    showModal('ネタを追加', body, footer);

    setTimeout(() => {
      $('#btnSaveIdea')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  showEditModal(id) {
    const item = store.getById('snsIdeas', id);
    if (!item) return;
    this.editingId = id;

    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveIdea">更新</button>
    `;
    showModal('ネタを編集', body, footer);

    setTimeout(() => {
      const form = $('#ideaForm');
      if (form && item) {
        const populateData = { ...item };
        if (Array.isArray(populateData.hashtags)) {
          populateData.hashtags = populateData.hashtags.join(', ');
        }
        populateForm(form, populateData);
      }
      $('#btnSaveIdea')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  getFormHtml() {
    return `
      <form id="ideaForm" class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label required">タイトル</label>
          <input type="text" name="title" class="form-input" required placeholder="投稿のタイトルやアイデア">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">プラットフォーム</label>
            <select name="platform" class="form-select">
              <option value="">選択してください</option>
              <option value="Instagram">Instagram</option>
              <option value="X">X</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
              <option value="Blog">Blog</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">カテゴリ</label>
            <select name="category" class="form-select">
              <option value="">選択してください</option>
              <option value="撮影テクニック">撮影テクニック</option>
              <option value="機材レビュー">機材レビュー</option>
              <option value="舞台裏">舞台裏</option>
              <option value="ビフォーアフター">ビフォーアフター</option>
              <option value="お知らせ">お知らせ</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select name="status" class="form-select">
              <option value="アイデア">アイデア</option>
              <option value="下書き">下書き</option>
              <option value="制作中">制作中</option>
              <option value="投稿予定">投稿予定</option>
              <option value="投稿済">投稿済</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">優先度</label>
            <select name="priority" class="form-select">
              <option value="中">中</option>
              <option value="高">高</option>
              <option value="低">低</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea name="content" class="form-textarea" rows="4" placeholder="投稿の内容やメモ"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">ハッシュタグ</label>
          <input type="text" name="hashtags" class="form-input" placeholder="#タグ1, #タグ2, #タグ3">
          <span class="form-helper">カンマ区切りで入力してください</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">投稿予定日</label>
            <input type="date" name="scheduledDate" class="form-input">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="2" placeholder="その他のメモ"></textarea>
        </div>
      </form>
    `;
  }

  handleSave() {
    const form = $('#ideaForm');
    if (!form) return;

    const data = collectFormData(form);

    if (!data.title) {
      showSnackbar('タイトルを入力してください', 'error');
      return;
    }

    // Convert hashtags string to array
    if (typeof data.hashtags === 'string') {
      data.hashtags = data.hashtags.split(',').map(t => t.trim()).filter(t => t);
    }

    if (this.editingId) {
      store.update('snsIdeas', this.editingId, data);
      showSnackbar('ネタを更新しました', 'success');
    } else {
      store.add('snsIdeas', data);
      showSnackbar('ネタを追加しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  async handleDelete(id) {
    const confirmed = await confirmDialog('ネタの削除', 'このネタを削除してもよろしいですか？');
    if (confirmed) {
      store.delete('snsIdeas', id);
      showSnackbar('ネタを削除しました');
      this.loadData();
    }
  }
}
