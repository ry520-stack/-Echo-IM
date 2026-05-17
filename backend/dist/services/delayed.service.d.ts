export declare function startDelayedMessageScheduler(): void;
export declare function scheduleMessage(senderId: string, data: {
    receiverId?: string;
    groupId?: string;
    content: string;
    type?: string;
    sendAt: string;
}): Promise<{
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    sendAt: Date;
    cancelled: boolean;
}>;
export declare function getScheduledMessages(senderId: string): Promise<{
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    sendAt: Date;
    cancelled: boolean;
}[]>;
export declare function cancelScheduled(id: string, senderId: string): Promise<{
    id: string;
    createdAt: Date;
    senderId: string;
    receiverId: string | null;
    groupId: string | null;
    content: string;
    type: string;
    sendAt: Date;
    cancelled: boolean;
}>;
//# sourceMappingURL=delayed.service.d.ts.map