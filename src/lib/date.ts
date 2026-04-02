import { format, isValid, parseISO } from "date-fns";

const JAPANESE_DATE_TIME_FORMAT = "yyyy年MM月dd日 HH時mm分";

export function formatPubDate(pubDate: string): string {
  if (!pubDate) {
    return "";
  }

  const isoDate = parseISO(pubDate);
  if (isValid(isoDate)) {
    return format(isoDate, JAPANESE_DATE_TIME_FORMAT);
  }

  const parsedDate = new Date(pubDate);
  if (isValid(parsedDate)) {
    return format(parsedDate, JAPANESE_DATE_TIME_FORMAT);
  }

  return pubDate;
}
