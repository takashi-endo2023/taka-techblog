// 記事の概算読了時間（分）。カード・記事ヘッダー・関連記事で同じ値を出すため、
// 全ページがこの 1 つの定数を使う（数値の二重管理を避ける）。
// 日本語本文の文字数ベース。実測の目安として 500 字/分。
const CHARS_PER_MINUTE = 500;

export function getReadingTime(body: string): number {
  return Math.max(1, Math.ceil((body ?? '').length / CHARS_PER_MINUTE));
}
