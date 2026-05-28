// ============================================================
// GMS - Dashboard Page
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, formatDateShort, formatRelativeDate, renderStatusChip } from '../utils/format.js';
import { setPageTitle, $, delegate } from '../utils/helpers.js';

export class DashboardPage {
  constructor() {
    this.now = new Date();
  }

  render() {
    const stats = this._calcStats();
    const recentProjects = this._getRecentProjects();
    const weekSchedule = this._getWeekSchedule();
    const alerts = this._getAlerts();
    const snsPosts = this._getScheduledSns();

    return `
      <div class="page-dashboard animate-fade-in-up">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">ダッシュボード</h1>
            <p class="page-subtitle">${this.now.getFullYear()}年${this.now.getMonth() + 1}月${this.now.getDate()}日の概要</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="dashboard-stats stagger-children">
          ${this._renderStatCard('payments', '今月の売上', formatCurrency(stats.income), 'var(--md-success)', 'var(--md-success-container)')}
          ${this._renderStatCard('receipt_long', '今月の経費', formatCurrency(stats.expenses), 'var(--md-error)', 'var(--md-error-container)')}
          ${this._renderStatCard('account_balance', '純利益', formatCurrency(stats.profit), stats.profit >= 0 ? 'var(--md-primary)' : 'var(--md-error)', stats.profit >= 0 ? 'var(--md-info-container)' : 'var(--md-error-container)')}
          ${this._renderStatCard('work', '今月の案件数', stats.projectCount + '件', 'var(--md-warning)', 'var(--md-warning-container)')}
        </div>

        <!-- Widgets Grid -->
        <div class="dashboard-widgets">
          <!-- Recent Projects -->
          <div class="card dashboard-widget">
            <div class="card-header">
              <span class="card-header-title">
                <span class="material-symbols-outlined" style="font-size:20px; margin-right:8px; color:var(--md-primary);">photo_camera</span>
                直近の案件
              </span>
              <button class="btn btn-text btn-sm" data-action="goProjects">すべて表示</button>
            </div>
            <div class="card-body" style="padding:0;">
              ${recentProjects.length ? `
                <div class="widget-list">
                  ${recentProjects.map(p => this._renderProjectItem(p)).join('')}
                </div>
              ` : this._renderWidgetEmpty('work', 'まだ案件がありません')}
            </div>
          </div>

          <!-- Week Schedule -->
          <div class="card dashboard-widget">
            <div class="card-header">
              <span class="card-header-title">
                <span class="material-symbols-outlined" style="font-size:20px; margin-right:8px; color:var(--md-tertiary);">calendar_month</span>
                今週の予定
              </span>
            </div>
            <div class="card-body" style="padding:0;">
              ${weekSchedule.length ? `
                <div class="widget-list">
                  ${weekSchedule.map(p => this._renderScheduleItem(p)).join('')}
                </div>
              ` : this._renderWidgetEmpty('event_available', '今週の予定はありません')}
            </div>
          </div>

          <!-- Alerts -->
          <div class="card dashboard-widget">
            <div class="card-header">
              <span class="card-header-title">
                <span class="material-symbols-outlined" style="font-size:20px; margin-right:8px; color:var(--md-error);">notifications_active</span>
                アラート
              </span>
              ${alerts.length ? `<span class="badge">${alerts.length}</span>` : ''}
            </div>
            <div class="card-body" style="padding:0;">
              ${alerts.length ? `
                <div class="widget-list">
                  ${alerts.map(a => this._renderAlertItem(a)).join('')}
                </div>
              ` : this._renderWidgetEmpty('check_circle', 'アラートはありません')}
            </div>
          </div>

          <!-- SNS Scheduled -->
          <div class="card dashboard-widget">
            <div class="card-header">
              <span class="card-header-title">
                <span class="material-symbols-outlined" style="font-size:20px; margin-right:8px; color:var(--md-info);">share</span>
                SNS投稿予定
              </span>
              <button class="btn btn-text btn-sm" data-action="goSns">すべて表示</button>
            </div>
            <div class="card-body" style="padding:0;">
              ${snsPosts.length ? `
                <div class="widget-list">
                  ${snsPosts.map(s => this._renderSnsItem(s)).join('')}
                </div>
              ` : this._renderWidgetEmpty('edit_note', '投稿予定はありません')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('ダッシュボード');
    this.bindEvents();
  }

  destroy() {}

  bindEvents() {
    delegate('.page-dashboard', '[data-action="goProjects"]', 'click', () => {
      window.location.hash = '/projects';
    });
    delegate('.page-dashboard', '[data-action="goSns"]', 'click', () => {
      window.location.hash = '/sns-ideas';
    });
  }

  // ── Data Helpers ──

  _calcStats() {
    const now = this.now;
    const thisMonth = (item) => {
      const d = new Date(item.receivedDate || item.date || item.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const thisMonthExpense = (item) => {
      const d = new Date(item.date || item.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const income = store.sum('income', 'totalAmount', item => thisMonth(item) && item.status === '入金済');
    const expenses = store.sum('expenses', 'amount', thisMonthExpense);
    const profit = income - expenses;

    // 今月の案件数（撮影日が今月のもの）
    const projectCount = store.count('projects', item => {
      if (!item.shootDate) return false;
      const d = new Date(item.shootDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return { income, expenses, profit, projectCount };
  }

  _getRecentProjects() {
    const projects = store.getAll('projects');
    return projects.slice(0, 5);
  }

  _getWeekSchedule() {
    const now = this.now;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return store.query('projects', item => {
      if (!item.shootDate) return false;
      const d = new Date(item.shootDate);
      return d >= weekStart && d <= weekEnd;
    }).sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate));
  }

  _getAlerts() {
    const alerts = [];

    // 未入金の請求書
    const unpaidIncome = store.query('income', item => item.status === '請求済');
    unpaidIncome.forEach(item => {
      alerts.push({
        icon: 'warning',
        type: 'warning',
        title: '未入金',
        message: `${item.title} - ${formatCurrency(item.totalAmount)}`,
        date: item.invoiceDate
      });
    });

    // メンテ期限（保証期限が1ヶ月以内）
    const soon = new Date(this.now);
    soon.setMonth(soon.getMonth() + 1);
    const equipment = store.query('equipment', item => {
      if (!item.warrantyExpiry) return false;
      const expiry = new Date(item.warrantyExpiry);
      return expiry <= soon && expiry >= this.now;
    });
    equipment.forEach(item => {
      alerts.push({
        icon: 'build',
        type: 'info',
        title: '保証期限間近',
        message: `${item.name} - ${formatDate(item.warrantyExpiry)}まで`,
        date: item.warrantyExpiry
      });
    });

    // サブスク更新が1ヶ月以内
    const subscriptions = store.query('subscriptions', item => {
      if (!item.renewalDate || item.status !== '利用中') return false;
      const renewal = new Date(item.renewalDate);
      return renewal <= soon && renewal >= this.now;
    });
    subscriptions.forEach(item => {
      alerts.push({
        icon: 'autorenew',
        type: 'info',
        title: 'サブスク更新',
        message: `${item.serviceName} - ${formatDate(item.renewalDate)}`,
        date: item.renewalDate
      });
    });

    return alerts;
  }

  _getScheduledSns() {
    return store.query('snsIdeas', item => item.status === '投稿予定');
  }

  // ── Render Helpers ──

  _renderStatCard(icon, label, value, iconColor, iconBg) {
    return `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:${iconBg}; color:${iconColor};">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <span class="stat-card-label">${label}</span>
        <span class="stat-card-value text-numeric">${value}</span>
      </div>
    `;
  }

  _renderProjectItem(project) {
    const client = store.getById('clients', project.clientId);
    const clientName = client ? client.name : '未設定';
    return `
      <div class="widget-list-item">
        <div class="widget-list-item-main">
          <div class="widget-list-item-title">${project.title}</div>
          <div class="widget-list-item-sub">
            <span class="material-symbols-outlined" style="font-size:14px;">person</span>
            ${clientName}
            <span class="widget-list-item-divider">·</span>
            <span class="material-symbols-outlined" style="font-size:14px;">event</span>
            ${formatDate(project.shootDate)}
          </div>
        </div>
        <div class="widget-list-item-end">
          ${renderStatusChip(project.status)}
        </div>
      </div>
    `;
  }

  _renderScheduleItem(project) {
    const client = store.getById('clients', project.clientId);
    const clientName = client ? client.name : '';
    const d = new Date(project.shootDate);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayLabel = `${d.getMonth() + 1}/${d.getDate()}（${dayNames[d.getDay()]}）`;
    const timeLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    return `
      <div class="widget-list-item">
        <div class="schedule-date-badge">
          <span class="schedule-date-day">${d.getDate()}</span>
          <span class="schedule-date-dow">${dayNames[d.getDay()]}</span>
        </div>
        <div class="widget-list-item-main">
          <div class="widget-list-item-title">${project.title}</div>
          <div class="widget-list-item-sub">
            <span class="material-symbols-outlined" style="font-size:14px;">schedule</span>
            ${timeLabel}
            ${clientName ? `<span class="widget-list-item-divider">·</span>${clientName}` : ''}
          </div>
        </div>
        <div class="widget-list-item-end">
          ${renderStatusChip(project.status)}
        </div>
      </div>
    `;
  }

  _renderAlertItem(alert) {
    const colorMap = {
      warning: 'var(--md-warning)',
      error: 'var(--md-error)',
      info: 'var(--md-info)'
    };
    const bgMap = {
      warning: 'var(--md-warning-container)',
      error: 'var(--md-error-container)',
      info: 'var(--md-info-container)'
    };
    return `
      <div class="widget-list-item">
        <div class="alert-icon" style="background:${bgMap[alert.type]}; color:${colorMap[alert.type]};">
          <span class="material-symbols-outlined">${alert.icon}</span>
        </div>
        <div class="widget-list-item-main">
          <div class="widget-list-item-title">${alert.title}</div>
          <div class="widget-list-item-sub">${alert.message}</div>
        </div>
      </div>
    `;
  }

  _renderSnsItem(idea) {
    const platformIcons = {
      'Instagram': 'photo_camera',
      'YouTube': 'smart_display',
      'Twitter': 'tag',
      'TikTok': 'music_note'
    };
    const icon = platformIcons[idea.platform] || 'share';
    return `
      <div class="widget-list-item">
        <div class="sns-platform-icon">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="widget-list-item-main">
          <div class="widget-list-item-title">${idea.title}</div>
          <div class="widget-list-item-sub">
            ${idea.platform}
            ${idea.scheduledDate ? `<span class="widget-list-item-divider">·</span>${formatDate(idea.scheduledDate)}` : ''}
          </div>
        </div>
        <div class="widget-list-item-end">
          ${renderStatusChip(idea.status)}
        </div>
      </div>
    `;
  }

  _renderWidgetEmpty(icon, message) {
    return `
      <div class="widget-empty">
        <span class="material-symbols-outlined">${icon}</span>
        <p>${message}</p>
      </div>
    `;
  }
}
