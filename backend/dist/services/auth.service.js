"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.register = register;
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const SECRET = process.env.JWT_SECRET;
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
if (!SECRET) {
    console.warn('[auth] 未设置 JWT_SECRET 环境变量，使用不安全的临时密钥。请在生产环境中设置 JWT_SECRET。');
}
const JWT_SECRET = SECRET || 'echo-dev-fallback-not-for-production';
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: EXPIRES });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
async function generateDigitalId() {
    for (let i = 0; i < 10; i++) {
        const id = 100000 + Math.floor(Math.random() * 900000);
        const exists = await prisma_1.default.user.findUnique({ where: { digitalId: id } });
        if (!exists)
            return id;
    }
    throw new Error('数字ID生成失败，请重试');
}
async function register(username, email, password) {
    const existing = await prisma_1.default.user.findFirst({
        where: { OR: [{ username }, { email }] },
    });
    if (existing) {
        throw new Error(existing.username === username ? '用户名已存在' : '邮箱已被注册');
    }
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const digitalId = await generateDigitalId();
    const user = await prisma_1.default.user.create({
        data: { username, email, password: hashed, digitalId },
    });
    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, username: user.username, email: user.email, digitalId: user.digitalId, nickname: user.nickname, avatar: user.avatar, status: user.status, lastSeenAt: user.lastSeenAt } };
}
async function login(email, password) {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new Error('邮箱或密码错误');
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        throw new Error('邮箱或密码错误');
    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, username: user.username, email: user.email, digitalId: user.digitalId, nickname: user.nickname, avatar: user.avatar, status: user.status, lastSeenAt: user.lastSeenAt } };
}
//# sourceMappingURL=auth.service.js.map