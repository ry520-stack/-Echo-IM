export declare function blockUser(blockerId: string, blockedId: string): Promise<{
    id: string;
    createdAt: Date;
    blockerId: string;
    blockedId: string;
}>;
export declare function unblockUser(blockerId: string, blockedId: string): Promise<{
    id: string;
    createdAt: Date;
    blockerId: string;
    blockedId: string;
}>;
export declare function getBlockedUsers(blockerId: string): Promise<({
    blocked: {
        id: string;
        username: string;
        digitalId: number;
        avatar: string;
        nickname: string;
    };
} & {
    id: string;
    createdAt: Date;
    blockerId: string;
    blockedId: string;
})[]>;
export declare function isBlocked(userId: string, targetId: string): Promise<boolean>;
export declare function isFriend(userId: string, peerId: string): Promise<boolean>;
//# sourceMappingURL=block.service.d.ts.map