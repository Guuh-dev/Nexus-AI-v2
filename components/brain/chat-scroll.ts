export type ChatScrollMetrics = {
  offset: number;
  viewport: number;
  content: number;
};

export type ChatScrollPosition = {
  offset: number;
  atEnd: boolean;
};

export const CHAT_END_THRESHOLD = 96;
export const CHAT_JUMP_THRESHOLD = 180;

export function distanceFromChatEnd({
  offset,
  viewport,
  content,
}: ChatScrollMetrics): number {
  return Math.max(0, content - viewport - offset);
}

export function isChatAtEnd(
  metrics: ChatScrollMetrics,
  threshold = CHAT_END_THRESHOLD,
): boolean {
  return distanceFromChatEnd(metrics) <= threshold;
}

export function shouldShowChatJump(metrics: ChatScrollMetrics): boolean {
  return distanceFromChatEnd(metrics) > CHAT_JUMP_THRESHOLD;
}
