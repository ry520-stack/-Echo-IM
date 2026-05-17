"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.uploadBackground = uploadBackground;
exports.uploadChatImage = uploadChatImage;
exports.uploadEmoji = uploadEmoji;
const upload_service_1 = require("../services/upload.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
// POST /api/upload/avatar
async function uploadAvatar(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: '请选择图片文件' });
    }
    const url = (0, upload_service_1.getUploadUrl)(req.file.filename);
    await prisma_1.default.user.update({ where: { id: req.userId }, data: { avatar: url } });
    res.json({ url });
}
// POST /api/upload/background
async function uploadBackground(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: '请选择图片文件' });
    }
    const url = (0, upload_service_1.getUploadUrl)(req.file.filename);
    res.json({ url });
}
// POST /api/upload/chat-image
async function uploadChatImage(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: '请选择图片文件' });
    }
    const url = (0, upload_service_1.getUploadUrl)(req.file.filename);
    res.json({ url });
}
// POST /api/upload/emoji
async function uploadEmoji(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: '请选择图片文件' });
    }
    const url = (0, upload_service_1.getUploadUrl)(req.file.filename);
    const name = req.body.name || 'emoji';
    const emoji = await prisma_1.default.emoji.create({
        data: { userId: req.userId, imageUrl: url, name },
    });
    res.status(201).json(emoji);
}
//# sourceMappingURL=upload.controller.js.map