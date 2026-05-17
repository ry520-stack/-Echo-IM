export declare function getMessages(userId: string, peerId: string, before?: string, limit?: number): Promise<({
    readReceipts: {
        userId: string;
        readAt: Date;
    }[];
    sender: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
    replyTo: {
        id: string;
        sender: {
            id: string;
            username: string;
            nickname: string;
        };
        content: string;
        type: string;
    } | null;
} & {
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    isRecalled: boolean;
    replyToId: string | null;
})[]>;
export declare function getGroupMessages(groupId: string, before?: string, limit?: number): Promise<({
    sender: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
    replyTo: {
        id: string;
        sender: {
            id: string;
            username: string;
            nickname: string;
        };
        content: string;
        type: string;
    } | null;
} & {
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    isRecalled: boolean;
    replyToId: string | null;
})[]>;
export declare function getConversations(userId: string): Promise<{
    peer: {
        id: string;
        username: string;
        digitalId: number;
        avatar: string;
        nickname: string;
        status: string;
        lastSeenAt: Date;
    };
    lastMessage: {
        id: string;
        createdAt: Date;
        senderId: string;
        content: string;
        type: string;
    } | null;
    unreadCount: number;
    lastTime: string;
}[]>;
export declare function recallMessage(messageId: string, userId: string): Promise<{
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    isRecalled: boolean;
    replyToId: string | null;
}>;
export declare function getConsecutiveDays(userId: string, peerId: string): Promise<number>;
export declare function searchMessages(userId: string, query: string, limit?: number): Promise<({
    sender: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
} & {
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    isRecalled: boolean;
    replyToId: string | null;
})[]>;
//# sourceMappingURL=message.service.d.ts.map