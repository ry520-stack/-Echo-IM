export declare function getFriends(userId: string): Promise<{
    id: string;
    peer: {
        id: string;
        username: string;
        digitalId: number;
        avatar: string;
        nickname: string;
        status: string;
        lastSeenAt: Date;
    };
    alias: string;
    isPinned: boolean;
    createdAt: Date;
}[]>;
export declare function getPendingRequests(userId: string): Promise<{
    id: string;
    from: {
        id: string;
        username: string;
        digitalId: number;
        avatar: string;
        nickname: string;
    };
    alias: string;
    createdAt: Date;
}[]>;
export declare function sendRequest(userId: string, peerId: string, alias?: string): Promise<{
    status: string;
    message: string;
}>;
export declare function acceptRequest(requestId: string, userId: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
export declare function rejectRequest(requestId: string, userId: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
export declare function updateAlias(friendshipId: string, userId: string, alias: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
export declare function removeFriend(friendshipId: string, userId: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
export declare function togglePin(friendshipId: string, userId: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
export declare function setBackground(friendshipId: string, userId: string, background: string): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    userId: string;
    friendId: string;
    alias: string;
    isPinned: boolean;
    chatBackground: string;
}>;
//# sourceMappingURL=friend.service.d.ts.map