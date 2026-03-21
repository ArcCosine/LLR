export interface Subscription {
  title: string;
  htmlUrl: string;
  xmlUrl: string;
  unreadCount: number;
}

export interface Article {
  title: string;
  link: string;
  content: string;
  pubDate: string;
}
