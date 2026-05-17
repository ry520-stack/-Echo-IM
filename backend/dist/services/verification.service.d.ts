export declare function generateCaptcha(): Promise<{
    key: string;
    question: string;
}>;
export declare function sendCode(email: string, captchaKey?: string, captchaAnswer?: number): Promise<{
    success: boolean;
    message: string;
}>;
export declare function verifyCode(email: string, code: string): Promise<boolean>;
//# sourceMappingURL=verification.service.d.ts.map