// ============================================================
// GMS - Data Store (Firebase Firestore)
// Firestore をバックエンドとし、ローカルキャッシュで高速アクセス
// ============================================================

import {
  db, collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from './firebase-config.js';

class DataStore {
  constructor() {
    this.cache = {};          // ローカルキャッシュ { collection: { id: item } }
    this.listeners = {};      // アプリ側のイベントリスナー
    this.unsubscribes = {};   // Firestore onSnapshot のクリーンアップ
    this.readyCollections = new Set();
    this._readyResolvers = {};
    this._readyPromises = {};

    // 全コレクション名
    this.collections = [
      'clients', 'income', 'expenses', 'suppliers', 'equipment',
      'projects', 'locations', 'snsIdeas', 'instagramSaves',
      'subscriptions', 'bookings'
    ];
  }

  // ── 初期化：リアルタイムリスナーを全コレクションに設定 ──

  async init() {
    const promises = this.collections.map(name => this._listenCollection(name));
    await Promise.all(promises);
    console.log('[GMS Store] All collections synced from Firestore');
  }

  _listenCollection(name) {
    return new Promise((resolve) => {
      this.cache[name] = {};
      let initialLoad = true;

      const colRef = collection(db, name);
      const unsub = onSnapshot(colRef, (snapshot) => {
        // スナップショットの変更を処理
        snapshot.docChanges().forEach(change => {
          const data = { id: change.doc.id, ...change.doc.data() };
          if (change.type === 'added' || change.type === 'modified') {
            this.cache[name][data.id] = data;
          } else if (change.type === 'removed') {
            delete this.cache[name][data.id];
          }

          // 初回ロード後の変更のみイベント発火
          if (!initialLoad) {
            this._emit(name, change.type === 'removed' ? 'delete' : change.type === 'added' ? 'add' : 'update', data);
          }
        });

        if (initialLoad) {
          initialLoad = false;
          this.readyCollections.add(name);
          resolve();
        }

        // 全リスナーに通知（ページ再描画用）
        this._emit(name, 'sync', null);
      }, (error) => {
        console.error(`[GMS Store] Error listening to ${name}:`, error);
        // エラー時もresolveして初期化をブロックしない
        resolve();
      });

      this.unsubscribes[name] = unsub;
    });
  }

  // ── CRUD Operations（同期的にキャッシュから読み取り）──

  getAll(collection) {
    const data = this.cache[collection] || {};
    return Object.values(data).sort((a, b) => {
      const dateA = new Date(b.updatedAt || b.createdAt || 0);
      const dateB = new Date(a.updatedAt || a.createdAt || 0);
      return dateA - dateB;
    });
  }

  getById(collectionName, id) {
    const data = this.cache[collectionName] || {};
    return data[id] || null;
  }

  query(collectionName, filterFn) {
    return this.getAll(collectionName).filter(filterFn);
  }

  // ── 書き込み操作（Firestore + ローカルキャッシュ同時更新）──

  add(collectionName, item) {
    const id = this._generateId();
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now
    };

    // ローカルキャッシュに即座に追加（UIの応答性のため）
    if (!this.cache[collectionName]) this.cache[collectionName] = {};
    this.cache[collectionName][id] = newItem;
    this._emit(collectionName, 'add', newItem);

    // Firestoreに書き込み（非同期）
    const docRef = doc(db, collectionName, id);
    setDoc(docRef, newItem).catch(err => {
      console.error(`[GMS Store] Failed to add to ${collectionName}:`, err);
    });

    return newItem;
  }

  update(collectionName, id, updates) {
    const data = this.cache[collectionName] || {};
    if (!data[id]) return null;

    const updatedItem = {
      ...data[id],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    // ローカルキャッシュを即座に更新
    this.cache[collectionName][id] = updatedItem;
    this._emit(collectionName, 'update', updatedItem);

    // Firestoreに書き込み
    const docRef = doc(db, collectionName, id);
    setDoc(docRef, updatedItem, { merge: true }).catch(err => {
      console.error(`[GMS Store] Failed to update ${collectionName}/${id}:`, err);
    });

    return updatedItem;
  }

  delete(collectionName, id) {
    const data = this.cache[collectionName] || {};
    const item = data[id];
    if (!item) return false;

    // ローカルキャッシュから即座に削除
    delete this.cache[collectionName][id];
    this._emit(collectionName, 'delete', item);

    // Firestoreから削除
    const docRef = doc(db, collectionName, id);
    deleteDoc(docRef).catch(err => {
      console.error(`[GMS Store] Failed to delete ${collectionName}/${id}:`, err);
    });

    return true;
  }

  count(collectionName, filterFn) {
    if (filterFn) {
      return this.query(collectionName, filterFn).length;
    }
    return this.getAll(collectionName).length;
  }

  // ── Aggregation ──

  sum(collectionName, field, filterFn) {
    const items = filterFn ? this.query(collectionName, filterFn) : this.getAll(collectionName);
    return items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
  }

  // ── Event System ──

  on(collectionName, callback) {
    if (!this.listeners[collectionName]) {
      this.listeners[collectionName] = [];
    }
    this.listeners[collectionName].push(callback);
    return () => {
      this.listeners[collectionName] = this.listeners[collectionName].filter(cb => cb !== callback);
    };
  }

  _emit(collectionName, action, item) {
    if (this.listeners[collectionName]) {
      this.listeners[collectionName].forEach(cb => cb({ action, item, collection: collectionName }));
    }
  }

  // ── Internal ──

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // ── Export / Import ──

  exportAll() {
    const exportData = {};
    this.collections.forEach(c => {
      exportData[c] = this.getAll(c);
    });
    return exportData;
  }

  async importAll(data) {
    for (const [collectionName, items] of Object.entries(data)) {
      for (const item of items) {
        const docRef = doc(db, collectionName, item.id);
        await setDoc(docRef, item);
        if (!this.cache[collectionName]) this.cache[collectionName] = {};
        this.cache[collectionName][item.id] = item;
      }
      this._emit(collectionName, 'sync', null);
    }
  }

  // ── Cleanup ──

  destroy() {
    Object.values(this.unsubscribes).forEach(unsub => unsub());
    this.unsubscribes = {};
    this.cache = {};
  }

  // Reset（Firestoreのデータも削除）
  async resetData() {
    for (const collectionName of this.collections) {
      const items = this.getAll(collectionName);
      for (const item of items) {
        const docRef = doc(db, collectionName, item.id);
        await deleteDoc(docRef);
      }
      this.cache[collectionName] = {};
      this._emit(collectionName, 'sync', null);
    }
  }
}

export const store = new DataStore();
