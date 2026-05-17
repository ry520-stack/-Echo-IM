export declare function getEmojis(userId: string): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    userId: string;
    imageUrl: string;
}[]>;
export declare function createEmoji(userId: string, imageUrl: string, name: string): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    userId: string;
    imageUrl: string;
}>;
export declare function deleteEmoji(id: string, userId: string): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    userId: string;
    imageUrl: string;
}>;
//# sourceMappingURL=emoji.service.d.ts.map