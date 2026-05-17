export declare function getMyGroups(userId: string): Promise<{
    id: string;
    name: string;
    creatorId: string;
    role: string;
    memberCount: number;
    members: {
        user: {
            id: string;
            username: string;
            avatar: string;
            nickname: string;
        };
        userId: string;
        role: string;
    }[];
    createdAt: Date;
}[]>;
export declare function createGroup(userId: string, name: string, memberIds?: string[]): Promise<{
    members: {
        user: {
            id: string;
            username: string;
            avatar: string;
            nickname: string;
        };
        userId: string;
        role: string;
    }[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    creatorId: string;
}>;
export declare function renameGroup(groupId: string, userId: string, name: string): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    creatorId: string;
}>;
export declare function addMembers(groupId: string, userId: string, memberIds: string[]): Promise<({
    members: {
        user: {
            id: string;
            username: string;
            avatar: string;
            nickname: string;
        };
        userId: string;
        role: string;
    }[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    creatorId: string;
}) | null>;
export declare function removeMember(groupId: string, operatorId: string, targetUserId: string): Promise<{
    id: string;
    groupId: string;
    userId: string;
    role: string;
    joinedAt: Date;
}>;
//# sourceMappingURL=group.service.d.ts.map