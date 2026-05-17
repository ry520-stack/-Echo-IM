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
exports.schedule = schedule;
exports.getScheduled = getScheduled;
exports.cancel = cancel;
const delayedService = __importStar(require("../services/delayed.service"));
async function schedule(req, res) {
    const { receiverId, groupId, content, type, sendAt } = req.body;
    if (!content?.trim())
        return res.status(400).json({ error: '消息内容不能为空' });
    if (!sendAt)
        return res.status(400).json({ error: '发送时间为必填' });
    if (!receiverId && !groupId)
        return res.status(400).json({ error: 'receiverId 或 groupId 为必填' });
    try {
        const dm = await delayedService.scheduleMessage(req.userId, {
            receiverId,
            groupId,
            content: content.trim(),
            type: type || 'text',
            sendAt,
        });
        res.status(201).json(dm);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function getScheduled(req, res) {
    try {
        const messages = await delayedService.getScheduledMessages(req.userId);
        res.json(messages);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function cancel(req, res) {
    try {
        await delayedService.cancelScheduled(req.params.id, req.userId);
        res.json({ message: '已取消定时消息' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
//# sourceMappingURL=delayed.controller.js.map