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
exports.getMyGroups = getMyGroups;
exports.createGroup = createGroup;
exports.renameGroup = renameGroup;
exports.addMembers = addMembers;
exports.removeMember = removeMember;
const groupService = __importStar(require("../services/group.service"));
async function getMyGroups(req, res) {
    try {
        const groups = await groupService.getMyGroups(req.userId);
        res.json(groups);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function createGroup(req, res) {
    const { name, memberIds } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: '群组名称为必填' });
    }
    try {
        const group = await groupService.createGroup(req.userId, name.trim(), memberIds || []);
        res.status(201).json(group);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function renameGroup(req, res) {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: '群组名称为必填' });
    }
    try {
        const group = await groupService.renameGroup(req.params.id, req.userId, name.trim());
        res.json(group);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function addMembers(req, res) {
    const { memberIds } = req.body;
    if (!memberIds || !memberIds.length) {
        return res.status(400).json({ error: 'memberIds 为必填' });
    }
    try {
        const group = await groupService.addMembers(req.params.id, req.userId, memberIds);
        res.json(group);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function removeMember(req, res) {
    const { userId: targetUserId } = req.params;
    try {
        await groupService.removeMember(req.params.id, req.userId, targetUserId);
        res.json({ message: '已移出群组' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
//# sourceMappingURL=group.controller.js.map