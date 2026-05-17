"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCaptcha = generateCaptcha;
exports.sendCode = sendCode;
exports.verifyCode = verifyCode;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const email_service_1 = require("./email.service");
function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function generateCaptcha() {
    const a = randomInt(1, 20);
    const b = randomInt(1, 20);
    const ops = ['+', '-', '×'];
    const op = ops[randomInt(0, 2)];
    let answer;
    let question;
    switch (op) {
        case '+':
            answer = a + b;
            question = `${a} + ${b} = ?`;
            break;
        case '-':
            answer = a - b;
            question = `${a} - ${b} = ?`;
            break;
        default:
            answer = a * b;
            question = `${a} × ${b} = ?`;
            break;
    }
    const key = crypto_1.default.randomBytes(12).toString('hex');
    await prisma_1.default.captcha.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma_1.default.captcha.create({
        data: { key, answer, expiresAt: new Date(Date.now() + 2 * 60 * 1000) },
    });
    return { key, question };
}
async function verifyCaptcha(key, answer) {
    const captcha = await prisma_1.default.captcha.findUnique({ where: { key } });
    if (!captcha || captcha.used || captcha.expiresAt < new Date())
        return false;
    const correct = captcha.answer === answer;
    await prisma_1.default.captcha.update({ where: { key }, data: { used: true } });
    return correct;
}
async function sendCode(email, captchaKey, captchaAnswer) {
    if (captchaKey) {
        if (captchaAnswer === undefined || captchaAnswer === null) {
            return { success: false, message: '请回答数学题' };
        }
        const ok = await verifyCaptcha(captchaKey, captchaAnswer);
        if (!ok) {
            return { success: false, message: '答案错误，请重新获取题目' };
        }
    }
    const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
    if (existingUser) {
        return { success: false, message: '该邮箱已被注册' };
    }
    await prisma_1.default.verificationCode.deleteMany({ where: { email } });
    const recent = await prisma_1.default.verificationCode.findFirst({
        where: { email, createdAt: { gte: new Date(Date.now() - 60000) } },
    });
    if (recent) {
        return { success: false, message: '请60秒后再试' };
    }
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const result = await (0, email_service_1.sendVerificationCode)(email, code);
    if (!result.ok) {
        return { success: false, message: result.message || '邮件发送失败' };
    }
    await prisma_1.default.verificationCode.create({
        data: { email, code, expiresAt },
    });
    return { success: true, message: '验证码已发送，5分钟内有效' };
}
async function verifyCode(email, code) {
    const record = await prisma_1.default.verificationCode.findFirst({
        where: { email, code, used: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
    });
    if (!record)
        return false;
    await prisma_1.default.verificationCode.update({
        where: { id: record.id },
        data: { used: true },
    });
    return true;
}
//# sourceMappingURL=verification.service.js.map