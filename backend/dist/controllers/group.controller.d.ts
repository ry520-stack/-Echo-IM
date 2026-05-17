import { Request, Response } from 'express';
export declare function getMyGroups(req: Request, res: Response): Promise<void>;
export declare function createGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function renameGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function addMembers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function removeMember(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=group.controller.d.ts.map