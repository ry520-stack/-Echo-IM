"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const authService = __importStar(require("../services/auth.service"));
const verification_service_1 = require("../services/verification.service");
async function register(req, res) {
    const { username, email, password, code } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email, password 均为必填' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少 6 位' });
    }
    // 只要配了任一邮件服务，就强制验证码
    const emailConfigured = process.env.RESEND_API_KEY || process.env.SMTP_USER || process.env.QQ_SMTP_USER;
    if (emailConfigured) {
        if (!code) {
            return res.status(400).json({ error: '请输入验证码' });
        }
        const valid = await (0, verification_service_1.verifyCode)(email, code);
        if (!valid) {
            return res.status(400).json({ error: '验证码错误或已过期' });
        }
    }
    try {
        const result = await authService.register(username, email, password);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(409).json({ error: e.message });
    }
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'email 和 password 为必填' });
    }
    try {
        const result = await authService.login(email, password);
        res.json(result);
    }
    catch (e) {
        res.status(401).json({ error: e.message });
    }
}
//# sourceMappingURL=auth.controller.js.map