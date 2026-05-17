"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const auth_service_1 = require("../services/auth.service");
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }
    const token = header.slice(7);
    try {
        const payload = (0, auth_service_1.verifyToken)(token);
        req.userId = payload.userId;
        next();
    }
    catch {
        return res.status(401).json({ error: '令牌无效或已过期' });
    }
}
//# sourceMappingURL=auth.middleware.js.map