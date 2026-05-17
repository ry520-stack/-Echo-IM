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
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.search = search;
const userService = __importStar(require("../services/user.service"));
async function getMe(req, res) {
    try {
        const user = await userService.getUser(req.userId);
        res.json(user);
    }
    catch {
        res.status(404).json({ error: '用户不存在' });
    }
}
async function updateMe(req, res) {
    const { nickname, avatar, status } = req.body;
    try {
        const user = await userService.updateUser(req.userId, { nickname, avatar, status });
        res.json(user);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function search(req, res) {
    const q = req.query.q;
    if (!q) {
        return res.status(400).json({ error: 'q 为必填' });
    }
    try {
        const users = await userService.searchUsers(q);
        res.json(users);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
//# sourceMappingURL=user.controller.js.map