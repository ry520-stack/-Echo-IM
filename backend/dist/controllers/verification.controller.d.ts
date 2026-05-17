import { Request, Response } from 'express';
export declare function getCaptcha(_req: Request, res: Response): Promise<void>;
export declare function sendCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=verification.controller.d.ts.map