// ============================================================
// GMS - Data Store (LocalStorage)
// Phase 1: LocalStorage / Phase 3: Firebase Firestore に差し替え
// ============================================================

class DataStore {
  constructor() {
    this.prefix = 'gms_';
    this.listeners = {};
    this._initDefaultData();
  }

  // ── CRUD Operations ──

  getAll(collection) {
    const data = this._load(collection);
    return Object.values(data).sort((a, b) => {
      const dateA = new Date(b.updatedAt || b.createdAt || 0);
      const dateB = new Date(a.updatedAt || a.createdAt || 0);
      return dateA - dateB;
    });
  }

  getById(collection, id) {
    const data = this._load(collection);
    return data[id] || null;
  }

  query(collection, filterFn) {
    return this.getAll(collection).filter(filterFn);
  }

  add(collection, item) {
    const data = this._load(collection);
    const id = this._generateId();
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now
    };
    data[id] = newItem;
    this._save(collection, data);
    this._emit(collection, 'add', newItem);
    return newItem;
  }

  update(collection, id, updates) {
    const data = this._load(collection);
    if (!data[id]) return null;
    const updatedItem = {
      ...data[id],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    data[id] = updatedItem;
    this._save(collection, data);
    this._emit(collection, 'update', updatedItem);
    return updatedItem;
  }

  delete(collection, id) {
    const data = this._load(collection);
    const item = data[id];
    if (!item) return false;
    delete data[id];
    this._save(collection, data);
    this._emit(collection, 'delete', item);
    return true;
  }

  count(collection, filterFn) {
    if (filterFn) {
      return this.query(collection, filterFn).length;
    }
    return this.getAll(collection).length;
  }

  // ── Aggregation ──

  sum(collection, field, filterFn) {
    const items = filterFn ? this.query(collection, filterFn) : this.getAll(collection);
    return items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  // ── Event System ──

  on(collection, callback) {
    if (!this.listeners[collection]) {
      this.listeners[collection] = [];
    }
    this.listeners[collection].push(callback);
    return () => {
      this.listeners[collection] = this.listeners[collection].filter(cb => cb !== callback);
    };
  }

  _emit(collection, action, item) {
    if (this.listeners[collection]) {
      this.listeners[collection].forEach(cb => cb({ action, item, collection }));
    }
  }

  // ── Internal ──

  _load(collection) {
    try {
      const raw = localStorage.getItem(this.prefix + collection);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _save(collection, data) {
    localStorage.setItem(this.prefix + collection, JSON.stringify(data));
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // ── Export / Import ──

  exportAll() {
    const collections = [
      'clients', 'income', 'expenses', 'suppliers', 'equipment',
      'projects', 'locations', 'snsIdeas', 'instagramSaves',
      'subscriptions', 'bookings'
    ];
    const exportData = {};
    collections.forEach(c => {
      exportData[c] = this.getAll(c);
    });
    return exportData;
  }

  importAll(data) {
    Object.entries(data).forEach(([collection, items]) => {
      const storeData = {};
      items.forEach(item => {
        storeData[item.id] = item;
      });
      this._save(collection, storeData);
    });
  }

  // ── Initialize with Sample Data ──

  _initDefaultData() {
    if (localStorage.getItem(this.prefix + '_initialized')) return;

    // Sample Clients
    const clientsData = [
      { id: 'c001', name: '田中 美咲', furigana: 'タナカ ミサキ', email: 'tanaka@example.com', phone: '090-1234-5678', company: '', category: '個人', commercialUse: true, publicationHistory: [{ media: 'Instagram', date: '2025-12-01', url: '' }], notes: 'ウェディング撮影のリピーター', tags: ['ウェディング', 'リピーター'], createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-12-01T10:00:00Z' },
      { id: 'c002', name: '佐藤 健太', furigana: 'サトウ ケンタ', email: 'sato.k@company.co.jp', phone: '03-1234-5678', company: '株式会社クリエイト', category: '企業', commercialUse: true, publicationHistory: [], notes: '企業HP用写真を定期発注', tags: ['企業', '商品撮影', '定期'], createdAt: '2025-03-10T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z' },
      { id: 'c003', name: '鈴木 花子', furigana: 'スズキ ハナコ', email: 'suzuki.h@example.com', phone: '080-9876-5432', company: '', category: '個人', commercialUse: false, publicationHistory: [], notes: '七五三撮影を希望', tags: ['家族写真', '七五三'], createdAt: '2025-06-20T10:00:00Z', updatedAt: '2025-06-20T10:00:00Z' },
      { id: 'c004', name: '山田 太郎', furigana: 'ヤマダ タロウ', email: 'yamada@agency.jp', phone: '03-5555-1234', company: 'エージェンシーX', category: '代理店', commercialUse: true, publicationHistory: [{ media: '雑誌A', date: '2025-09-01', url: '' }], notes: '広告撮影の窓口', tags: ['広告', '代理店'], createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-09-15T10:00:00Z' },
      { id: 'c005', name: '高橋 リサ', furigana: 'タカハシ リサ', email: 'lisa.t@model.com', phone: '070-1111-2222', company: '', category: '個人', commercialUse: true, publicationHistory: [], notes: 'ポートレート撮影', tags: ['ポートレート', 'モデル'], createdAt: '2025-08-10T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
    ];

    // Sample Projects
    const projectsData = [
      { id: 'p001', title: '田中様 ウェディングフォト', clientId: 'c001', category: 'ウェディング', status: '編集中', shootDate: '2026-05-20T10:00:00Z', locationId: 'l001', totalAmount: 280000, depositAmount: 100000, depositReceived: true, consent: { photographConsent: true, modelRelease: true, commercialUse: true, snsPublication: true, signedDate: '2026-05-10T10:00:00Z' }, notes: '納品予定 6/10', tags: ['ウェディング'], createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-05-25T10:00:00Z' },
      { id: 'p002', title: '株式会社クリエイト 商品撮影', clientId: 'c002', category: '商品撮影', status: '撮影準備', shootDate: '2026-06-05T09:00:00Z', locationId: 'l002', totalAmount: 150000, depositAmount: 50000, depositReceived: true, consent: { photographConsent: true, modelRelease: false, commercialUse: true, snsPublication: false }, notes: '新商品15点', tags: ['商品撮影', '企業'], createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-20T10:00:00Z' },
      { id: 'p003', title: '鈴木様 七五三撮影', clientId: 'c003', category: '七五三', status: '問い合わせ', shootDate: '2026-11-15T10:00:00Z', totalAmount: 80000, consent: { photographConsent: false, modelRelease: false, commercialUse: false, snsPublication: false }, notes: '秋の撮影希望', tags: ['七五三', '家族'], createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
      { id: 'p004', title: '高橋リサ ポートレート撮影', clientId: 'c005', category: 'ポートレート', status: '納品済', shootDate: '2026-04-10T14:00:00Z', locationId: 'l003', totalAmount: 50000, depositAmount: 0, depositReceived: false, consent: { photographConsent: true, modelRelease: true, commercialUse: true, snsPublication: true, signedDate: '2026-04-08T10:00:00Z' }, notes: '50枚データ納品', tags: ['ポートレート'], createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-04-25T10:00:00Z' },
      { id: 'p005', title: 'エージェンシーX 広告撮影', clientId: 'c004', category: '企業撮影', status: '完了', shootDate: '2026-03-01T09:00:00Z', locationId: 'l002', totalAmount: 350000, depositAmount: 100000, depositReceived: true, consent: { photographConsent: true, modelRelease: true, commercialUse: true, snsPublication: true, signedDate: '2026-02-20T10:00:00Z' }, notes: '広告キャンペーン用', tags: ['広告', '企業'], createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-03-20T10:00:00Z' },
    ];

    // Sample Income
    const incomeData = [
      { id: 'i001', projectId: 'p005', clientId: 'c004', title: 'エージェンシーX 広告撮影', amount: 318182, tax: 31818, totalAmount: 350000, status: '入金済', invoiceDate: '2026-03-15T10:00:00Z', receivedDate: '2026-04-15T10:00:00Z', paymentMethod: '銀行振込', createdAt: '2026-03-15T10:00:00Z' },
      { id: 'i002', projectId: 'p004', clientId: 'c005', title: '高橋リサ ポートレート撮影', amount: 45455, tax: 4545, totalAmount: 50000, status: '入金済', invoiceDate: '2026-04-25T10:00:00Z', receivedDate: '2026-05-10T10:00:00Z', paymentMethod: '銀行振込', createdAt: '2026-04-25T10:00:00Z' },
      { id: 'i003', projectId: 'p001', clientId: 'c001', title: '田中様 ウェディングフォト 前金', amount: 90909, tax: 9091, totalAmount: 100000, status: '入金済', invoiceDate: '2026-05-01T10:00:00Z', receivedDate: '2026-05-05T10:00:00Z', paymentMethod: '銀行振込', createdAt: '2026-05-01T10:00:00Z' },
      { id: 'i004', projectId: 'p002', clientId: 'c002', title: '株式会社クリエイト 前金', amount: 45455, tax: 4545, totalAmount: 50000, status: '入金済', invoiceDate: '2026-05-15T10:00:00Z', receivedDate: '2026-05-20T10:00:00Z', paymentMethod: '銀行振込', createdAt: '2026-05-15T10:00:00Z' },
      { id: 'i005', projectId: 'p001', clientId: 'c001', title: '田中様 ウェディングフォト 残金', amount: 163636, tax: 16364, totalAmount: 180000, status: '請求済', invoiceDate: '2026-05-25T10:00:00Z', paymentMethod: '銀行振込', createdAt: '2026-05-25T10:00:00Z' },
    ];

    // Sample Expenses
    const expensesData = [
      { id: 'e001', title: 'Adobe Creative Cloud', category: '通信費', amount: 6480, tax: 648, date: '2026-05-01T10:00:00Z', paymentMethod: 'クレカ', isDeductible: true, notes: '月額サブスク', createdAt: '2026-05-01T10:00:00Z' },
      { id: 'e002', title: '撮影現場 交通費', category: '交通費', amount: 3200, date: '2026-05-20T10:00:00Z', projectId: 'p001', paymentMethod: '電子マネー', isDeductible: true, createdAt: '2026-05-20T10:00:00Z' },
      { id: 'e003', title: 'SDカード 128GB', category: '消耗品', amount: 4800, date: '2026-05-05T10:00:00Z', supplierId: 's001', paymentMethod: 'クレカ', isDeductible: true, createdAt: '2026-05-05T10:00:00Z' },
      { id: 'e004', title: 'レンズクリーニングキット', category: '消耗品', amount: 2500, date: '2026-05-10T10:00:00Z', paymentMethod: '現金', isDeductible: true, createdAt: '2026-05-10T10:00:00Z' },
      { id: 'e005', title: '撮影スタジオ レンタル', category: '外注費', amount: 15000, date: '2026-05-20T10:00:00Z', projectId: 'p001', paymentMethod: '銀行振込', isDeductible: true, createdAt: '2026-05-20T10:00:00Z' },
    ];

    // Sample Suppliers
    const suppliersData = [
      { id: 's001', name: 'マップカメラ', category: 'カメラ機材', contactPerson: '', email: '', phone: '03-3342-3381', website: 'https://www.mapcamera.com', address: '東京都新宿区', notes: '中古レンズの品揃えが良い', rating: 5, tags: ['中古', 'カメラ', 'レンズ'], createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
      { id: 's002', name: 'ヨドバシカメラ', category: 'カメラ機材', contactPerson: '', phone: '', website: 'https://www.yodobashi.com', address: '東京都千代田区', notes: 'ポイント還元率が高い', rating: 4, tags: ['新品', '家電'], createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
      { id: 's003', name: 'Amazon Business', category: 'その他', website: 'https://business.amazon.co.jp', notes: '消耗品全般', rating: 4, tags: ['消耗品', '配送早い'], createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    ];

    // Sample Equipment
    const equipmentData = [
      { id: 'eq001', name: 'Sony α7 IV', brand: 'Sony', model: 'ILCE-7M4', category: 'カメラボディ', serialNumber: 'SN12345678', purchaseDate: '2024-06-15T10:00:00Z', purchasePrice: 328000, supplierId: 's001', status: '使用中', condition: '良好', warrantyExpiry: '2026-06-15T10:00:00Z', notes: 'メインボディ', createdAt: '2024-06-15T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
      { id: 'eq002', name: 'Sony FE 24-70mm F2.8 GM II', brand: 'Sony', model: 'SEL2470GM2', category: 'レンズ', serialNumber: 'SN87654321', purchaseDate: '2024-08-01T10:00:00Z', purchasePrice: 268000, supplierId: 's001', status: '使用中', condition: '良好', notes: '標準ズーム', createdAt: '2024-08-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
      { id: 'eq003', name: 'Godox AD200 Pro', brand: 'Godox', model: 'AD200Pro', category: 'ストロボ', purchaseDate: '2025-01-10T10:00:00Z', purchasePrice: 42000, supplierId: 's002', status: '使用中', condition: '良好', notes: 'ポータブルストロボ', createdAt: '2025-01-10T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z' },
      { id: 'eq004', name: 'Manfrotto 190XPRO', brand: 'Manfrotto', model: 'MT190XPRO4', category: '三脚', purchaseDate: '2023-12-01T10:00:00Z', purchasePrice: 35000, status: '使用中', condition: 'やや劣化', notes: '脚のロックがやや緩い', createdAt: '2023-12-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
    ];

    // Sample Locations
    const locationsData = [
      { id: 'l001', name: '明治神宮', address: '東京都渋谷区代々木神園町1-1', category: '神社・寺院', accessInfo: 'JR原宿駅から徒歩1分', parkingInfo: 'なし（近隣コインパーキング利用）', fee: 0, reservationRequired: false, bestSeason: ['春', '秋'], bestTimeOfDay: ['朝', 'ゴールデンアワー'], shootingTips: '# 撮影ヒント\n- 早朝が人が少なくベスト\n- 鳥居前は大人気スポット\n- 自然光が美しい森の参道も◎', rating: 5, tags: ['和装', 'ウェディング', '七五三'], createdAt: '2025-01-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
      { id: 'l002', name: 'スタジオLUMIERE', address: '東京都目黒区中目黒1-1-1', category: '屋内スタジオ', accessInfo: '中目黒駅から徒歩5分', parkingInfo: '提携駐車場あり', fee: 15000, feeNotes: '半日料金。1日は25,000円', reservationRequired: true, contactInfo: '03-0000-0000', bestTimeOfDay: ['昼'], shootingTips: '# 撮影ヒント\n- 白ホリと自然光スタジオの2面\n- ストロボ・背景紙完備\n- 控室あり', rating: 4, tags: ['スタジオ', '商品撮影', 'ポートレート'], createdAt: '2025-03-01T10:00:00Z', updatedAt: '2025-03-01T10:00:00Z' },
      { id: 'l003', name: '代々木公園', address: '東京都渋谷区代々木神園町2-1', category: '公園', accessInfo: 'JR原宿駅から徒歩3分', parkingInfo: '有料駐車場あり', fee: 0, reservationRequired: false, bestSeason: ['春', '秋'], bestTimeOfDay: ['朝', 'ゴールデンアワー'], shootingTips: '# 撮影ヒント\n- 桜の季節は最高のロケーション\n- 噴水エリアが人気\n- 紅葉時期も素晴らしい', rating: 4, tags: ['公園', '自然', 'ポートレート'], createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
    ];

    // Sample SNS Ideas
    const snsIdeasData = [
      { id: 'sn001', title: 'ウェディング撮影の裏側 Vlog', platform: 'YouTube', category: '舞台裏', status: 'アイデア', content: 'ウェディング撮影の一日密着。機材選びから現場入り、撮影、レタッチまでの全工程を紹介。', hashtags: ['#ウェディングフォト', '#カメラマンの日常', '#BehindTheScenes'], priority: '高', createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
      { id: 'sn002', title: '自然光ポートレートの撮り方', platform: 'Instagram', category: '撮影テクニック', status: '下書き', content: '窓際の自然光を使ったポートレート撮影テクニック。光の向きと反射板の使い方。', hashtags: ['#ポートレート', '#自然光', '#撮影テクニック'], priority: '中', scheduledDate: '2026-06-01T10:00:00Z', createdAt: '2026-05-10T10:00:00Z', updatedAt: '2026-05-20T10:00:00Z' },
      { id: 'sn003', title: 'Sony α7IV 1年レビュー', platform: 'Instagram', category: '機材レビュー', status: '投稿済', content: '1年使ってわかったα7IVの長所と短所。', hashtags: ['#Sony', '#α7IV', '#カメラレビュー'], priority: '低', publishedDate: '2025-12-15T10:00:00Z', createdAt: '2025-12-01T10:00:00Z', updatedAt: '2025-12-15T10:00:00Z' },
    ];

    // Sample Instagram Saves
    const instagramSavesData = [
      { id: 'ig001', postUrl: 'https://www.instagram.com/p/example1/', accountName: '@photoartist_tokyo', caption: '逆光を活かしたシルエットポートレート', category: 'ライティング', tags: ['逆光', 'シルエット'], myNotes: '夕日の位置とモデルの角度を参考にしたい', rating: 5, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'ig002', postUrl: 'https://www.instagram.com/p/example2/', accountName: '@wedding_mag', caption: 'チャペルでのウェディングフォト', category: '構図参考', tags: ['ウェディング', 'チャペル'], myNotes: '窓からの光の取り入れ方が上手い', rating: 4, createdAt: '2026-04-15T10:00:00Z' },
      { id: 'ig003', postUrl: 'https://www.instagram.com/p/example3/', accountName: '@color_grade_pro', caption: 'フィルム風カラーグレーディング', category: 'カラーグレーディング', tags: ['フィルム風', 'レタッチ'], myNotes: 'Lightroomのプリセット作成の参考に', rating: 4, createdAt: '2026-03-20T10:00:00Z' },
    ];

    // Sample Subscriptions
    const subscriptionsData = [
      { id: 'sub001', serviceName: 'Adobe Creative Cloud', category: '写真編集', plan: 'フォトプラン (20GB)', monthlyFee: 1078, billingCycle: '月額', paymentMethod: 'クレカ', accountEmail: 'user@example.com', loginUrl: 'https://account.adobe.com', startDate: '2024-01-01T10:00:00Z', renewalDate: '2026-06-01T10:00:00Z', autoRenew: true, status: '利用中', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
      { id: 'sub002', serviceName: 'Google One', category: 'クラウドストレージ', plan: '2TB', monthlyFee: 1300, billingCycle: '月額', paymentMethod: 'クレカ', loginUrl: 'https://one.google.com', startDate: '2024-06-01T10:00:00Z', renewalDate: '2026-06-01T10:00:00Z', autoRenew: true, status: '利用中', createdAt: '2024-06-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
      { id: 'sub003', serviceName: 'Canva Pro', category: 'デザイン', plan: 'Pro', monthlyFee: 1500, billingCycle: '月額', paymentMethod: 'クレカ', loginUrl: 'https://www.canva.com', startDate: '2025-03-01T10:00:00Z', renewalDate: '2026-06-01T10:00:00Z', autoRenew: true, status: '利用中', createdAt: '2025-03-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
    ];

    // Sample Bookings
    const bookingsData = [
      { id: 'b001', clientName: '鈴木 花子', clientEmail: 'suzuki.h@example.com', clientPhone: '080-9876-5432', shootType: '七五三', preferredDate: '2026-11-15T10:00:00Z', status: '申請中', source: 'Webフォーム', message: '七五三の撮影をお願いしたいです。11月中旬で空きはありますか？', createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
    ];

    // Save all data
    const saveCollection = (name, items) => {
      const data = {};
      items.forEach(item => { data[item.id] = item; });
      this._save(name, data);
    };

    saveCollection('clients', clientsData);
    saveCollection('projects', projectsData);
    saveCollection('income', incomeData);
    saveCollection('expenses', expensesData);
    saveCollection('suppliers', suppliersData);
    saveCollection('equipment', equipmentData);
    saveCollection('locations', locationsData);
    saveCollection('snsIdeas', snsIdeasData);
    saveCollection('instagramSaves', instagramSavesData);
    saveCollection('subscriptions', subscriptionsData);
    saveCollection('bookings', bookingsData);

    localStorage.setItem(this.prefix + '_initialized', 'true');
  }

  // Reset all data
  resetData() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
    keys.forEach(k => localStorage.removeItem(k));
    this._initDefaultData();
  }
}

export const store = new DataStore();
