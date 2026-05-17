export declare function getMoments(userId: string, page?: number, limit?: number): Promise<{
    moments: ({
        user: {
            id: string;
            username: string;
            avatar: string;
            nickname: string;
        };
        _count: {
            likes: number;
            comments: number;
        };
        likes: {
            userId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        content: string;
        userId: string;
        images: string;
    })[];
    total: number;
    hasMore: boolean;
}>;
export declare function createMoment(userId: string, content: string, images?: string[]): Promise<{
    user: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
    _count: {
        likes: number;
        comments: number;
    };
} & {
    id: string;
    createdAt: Date;
    content: string;
    userId: string;
    images: string;
}>;
export declare function toggleLike(momentId: string, userId: string): Promise<{
    liked: boolean;
}>;
export declare function addComment(momentId: string, userId: string, content: string): Promise<{
    user: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
} & {
    id: string;
    createdAt: Date;
    content: string;
    userId: string;
    momentId: string;
}>;
export declare function getComments(momentId: string): Promise<({
    user: {
        id: string;
        username: string;
        avatar: string;
        nickname: string;
    };
} & {
    id: string;
    createdAt: Date;
    content: string;
    userId: string;
    momentId: string;
})[]>;
//# sourceMappingURL=moment.service.d.ts.map