import { Request, Response } from 'express';
export declare function schedule(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getScheduled(req: Request, res: Response): Promise<void>;
export declare function cancel(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=delayed.controller.d.ts.map