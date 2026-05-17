export declare function getUser(userId: string): Promise<{
    id: string;
    username: string;
    email: string;
    digitalId: number;
    avatar: string;
    nickname: string;
    status: string;
    autoReply: string;
    allowStrangerMessage: boolean;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function updateUser(userId: string, data: {
    nickname?: string;
    avatar?: string;
    status?: string;
    autoReply?: string;
    allowStrangerMessage?: boolean;
}): Promise<{
    id: string;
    username: string;
    email: string;
    digitalId: number;
    avatar: string;
    nickname: string;
    status: string;
    autoReply: string;
    allowStrangerMessage: boolean;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function searchUsers(query: string): Promise<{
    id: string;
    username: string;
    email: string;
    digitalId: number;
    avatar: string;
    nickname: string;
    status: string;
    autoReply: string;
    allowStrangerMessage: boolean;
    lastSeenAt: Date;
}[]>;
//# sourceMappingURL=user.service.d.ts.map