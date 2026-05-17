import { Request, Response } from 'express';
export declare function getMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getGroupMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getConversations(req: Request, res: Response): Promise<void>;
export declare function recallMessage(req: Request, res: Response): Promise<void>;
export declare function consecutiveDays(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function searchMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=message.controller.d.ts.map