export interface AuthPayload {
    userId: string;
}
export declare function signToken(payload: AuthPayload): string;
export declare function verifyToken(token: string): AuthPayload;
export declare function register(username: string, email: string, password: string): Promise<{
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        digitalId: number;
        nickname: string;
        avatar: string;
        status: string;
        lastSeenAt: Date;
    };
}>;
export declare function login(email: string, password: string): Promise<{
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        digitalId: number;
        nickname: string;
        avatar: string;
        status: string;
        lastSeenAt: Date;
    };
}>;
//# sourceMappingURL=auth.service.d.ts.map