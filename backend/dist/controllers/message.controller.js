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
exports.getMessages = getMessages;
exports.getGroupMessages = getGroupMessages;
exports.getConversations = getConversations;
exports.recallMessage = recallMessage;
exports.consecutiveDays = consecutiveDays;
exports.searchMessages = searchMessages;
const messageService = __importStar(require("../services/message.service"));
async function getMessages(req, res) {
    const { userId } = req.query;
    const before = req.query.before;
    const limit = parseInt(req.query.limit) || 50;
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId 为必填' });
    }
    try {
        const messages = await messageService.getMessages(req.userId, userId, before, limit);
        res.json(messages);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function getGroupMessages(req, res) {
    const { groupId } = req.query;
    const before = req.query.before;
    const limit = parseInt(req.query.limit) || 50;
    if (!groupId || typeof groupId !== 'string') {
        return res.status(400).json({ error: 'groupId 为必填' });
    }
    try {
        const messages = await messageService.getGroupMessages(groupId, before, limit);
        res.json(messages);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function getConversations(req, res) {
    try {
        const conversations = await messageService.getConversations(req.userId);
        res.json(conversations);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function recallMessage(req, res) {
    const { id } = req.params;
    try {
        const msg = await messageService.recallMessage(id, req.userId);
        res.json(msg);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function consecutiveDays(req, res) {
    const { peerId } = req.query;
    if (!peerId || typeof peerId !== 'string') {
        return res.status(400).json({ error: 'peerId 为必填' });
    }
    try {
        const days = await messageService.getConsecutiveDays(req.userId, peerId);
        res.json({ days, userIdA: req.userId, userIdB: peerId });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function searchMessages(req, res) {
    const q = req.query.q;
    if (!q) {
        return res.status(400).json({ error: 'q 为必填' });
    }
    try {
        const messages = await messageService.searchMessages(req.userId, q);
        res.json(messages);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
//# sourceMappingURL=message.controller.js.map