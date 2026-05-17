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
exports.getCaptcha = getCaptcha;
exports.sendCode = sendCode;
const verificationService = __importStar(require("../services/verification.service"));
async function getCaptcha(_req, res) {
    try {
        const captcha = await verificationService.generateCaptcha();
        res.json(captcha);
    }
    catch {
        res.status(500).json({ error: '生成题目失败' });
    }
}
async function sendCode(req, res) {
    const { email, captchaKey, captchaAnswer } = req.body;
    if (!email) {
        return res.status(400).json({ error: '邮箱为必填' });
    }
    const result = await verificationService.sendCode(email, captchaKey, captchaAnswer);
    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }
    res.json({ message: result.message });
}
//# sourceMappingURL=verification.controller.js.map