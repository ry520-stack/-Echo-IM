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
exports.getFriends = getFriends;
exports.getPending = getPending;
exports.sendRequest = sendRequest;
exports.acceptRequest = acceptRequest;
exports.rejectRequest = rejectRequest;
exports.updateAlias = updateAlias;
exports.removeFriend = removeFriend;
exports.togglePin = togglePin;
exports.setBackground = setBackground;
const friendService = __importStar(require("../services/friend.service"));
async function getFriends(req, res) {
    try {
        const friends = await friendService.getFriends(req.userId);
        res.json(friends);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function getPending(req, res) {
    try {
        const requests = await friendService.getPendingRequests(req.userId);
        res.json(requests);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function sendRequest(req, res) {
    const { peerId, alias } = req.body;
    if (!peerId) {
        return res.status(400).json({ error: 'peerId 为必填' });
    }
    try {
        const result = await friendService.sendRequest(req.userId, peerId, alias);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function acceptRequest(req, res) {
    try {
        await friendService.acceptRequest(req.params.id, req.userId);
        res.json({ message: '已接受好友申请' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function rejectRequest(req, res) {
    try {
        await friendService.rejectRequest(req.params.id, req.userId);
        res.json({ message: '已拒绝好友申请' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function updateAlias(req, res) {
    const { alias } = req.body;
    try {
        const result = await friendService.updateAlias(req.params.id, req.userId, alias);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function removeFriend(req, res) {
    try {
        await friendService.removeFriend(req.params.id, req.userId);
        res.json({ message: '已删除好友' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function togglePin(req, res) {
    try {
        const result = await friendService.togglePin(req.params.id, req.userId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function setBackground(req, res) {
    const { background } = req.body;
    try {
        const result = await friendService.setBackground(req.params.id, req.userId, background);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
//# sourceMappingURL=friend.controller.js.map