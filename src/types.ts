export interface Subscription {
  title: string;
  htmlUrl: string;
  xmlUrl: string;
  unreadCount: number;
  lastUpdated?: number; // Timestamp of the latest article
}

export interface Article {
  title: string;
  link: string;
  content: string;
  pubDate: string;
}
