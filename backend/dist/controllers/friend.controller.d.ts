import { Request, Response } from 'express';
export declare function getFriends(req: Request, res: Response): Promise<void>;
export declare function getPending(req: Request, res: Response): Promise<void>;
export declare function sendRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function acceptRequest(req: Request, res: Response): Promise<void>;
export declare function rejectRequest(req: Request, res: Response): Promise<void>;
export declare function updateAlias(req: Request, res: Response): Promise<void>;
export declare function removeFriend(req: Request, res: Response): Promise<void>;
export declare function togglePin(req: Request, res: Response): Promise<void>;
export declare function setBackground(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=friend.controller.d.ts.map