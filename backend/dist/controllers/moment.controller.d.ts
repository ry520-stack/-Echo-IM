import { Request, Response } from 'express';
export declare function getMoments(req: Request, res: Response): Promise<void>;
export declare function createMoment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function toggleLike(req: Request, res: Response): Promise<void>;
export declare function addComment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getComments(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=moment.controller.d.ts.map