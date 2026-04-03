import type { Article } from "@/types";

const DB_NAME = "llr-reader-db";
const RSS_CACHE_STORE_NAME = "rss-cache";
const OPML_STORE_NAME = "opml-files";
const SUBSCRIPTIONS_STORE_NAME = "subscriptions";
const OPML_ENTRY_ID = "active-opml";
const DB_VERSION = 3;

export interface CacheEntry {
  xmlUrl: string;
  articles: Article[];
  timestamp: number;
}

export interface OpmlEntry {
  id: typeof OPML_ENTRY_ID;
  fileName: string;
  text: string;
  importedAt: number;
}

export interface SubscriptionEntry {
  id: "active-subscriptions";
  data: import("@/types").Subscription[];
  updatedAt: number;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RSS_CACHE_STORE_NAME)) {
        db.createObjectStore(RSS_CACHE_STORE_NAME, { keyPath: "xmlUrl" });
      }
      if (!db.objectStoreNames.contains(OPML_STORE_NAME)) {
        db.createObjectStore(OPML_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE_NAME)) {
        db.createObjectStore(SUBSCRIPTIONS_STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function getCache(xmlUrl: string): Promise<CacheEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RSS_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(RSS_CACHE_STORE_NAME);
    const request = store.get(xmlUrl);

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
  });
}

export async function setCache(
  xmlUrl: string,
  articles: Article[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RSS_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(RSS_CACHE_STORE_NAME);
    const entry: CacheEntry = {
      xmlUrl,
      articles,
      timestamp: Date.now(),
    };
    const request = store.put(entry);

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

export async function clearAllCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RSS_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(RSS_CACHE_STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

export async function getStoredOpml(): Promise<OpmlEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OPML_STORE_NAME, "readonly");
    const store = transaction.objectStore(OPML_STORE_NAME);
    const request = store.get(OPML_ENTRY_ID);

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
  });
}

export async function replaceStoredOpml(
  fileName: string,
  text: string,
): Promise<void> {
  await deleteDatabase();

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OPML_STORE_NAME, "readwrite");
    const store = transaction.objectStore(OPML_STORE_NAME);
    const request = store.put({
      id: OPML_ENTRY_ID,
      fileName,
      text,
      importedAt: Date.now(),
    } satisfies OpmlEntry);

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => resolve();
  });

  db.close();
}

export async function getSubscriptions(): Promise<
  import("@/types").Subscription[] | null
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SUBSCRIPTIONS_STORE_NAME, "readonly");
    const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
    const request = store.get("active-subscriptions");

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      const entry = request.result as SubscriptionEntry | undefined;
      resolve(entry ? entry.data : null);
    };
  });
}

export async function saveSubscriptions(
  data: import("@/types").Subscription[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SUBSCRIPTIONS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
    const entry: SubscriptionEntry = {
      id: "active-subscriptions",
      data,
      updatedAt: Date.now(),
    };
    const request = store.put(entry);

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("IndexedDB deletion blocked by another open tab."));
    request.onsuccess = () => resolve();
  });
}
