export interface Mention {
  id: number;
  postId: number;
  mentionedUserId: number;
  createdAt: Date;
}

export interface CreateMentionData {
  postId: number;
  mentionedUserId: number;
}
