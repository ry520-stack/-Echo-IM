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
exports.getMoments = getMoments;
exports.createMoment = createMoment;
exports.toggleLike = toggleLike;
exports.addComment = addComment;
exports.getComments = getComments;
const momentService = __importStar(require("../services/moment.service"));
async function getMoments(req, res) {
    const page = parseInt(req.query.page) || 1;
    try {
        const data = await momentService.getMoments(req.userId, page);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
async function createMoment(req, res) {
    const { content, images } = req.body;
    if (!content?.trim())
        return res.status(400).json({ error: '内容不能为空' });
    try {
        const moment = await momentService.createMoment(req.userId, content.trim(), images);
        res.status(201).json(moment);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function toggleLike(req, res) {
    try {
        const result = await momentService.toggleLike(req.params.id, req.userId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function addComment(req, res) {
    const { content } = req.body;
    if (!content?.trim())
        return res.status(400).json({ error: '内容不能为空' });
    try {
        const comment = await momentService.addComment(req.params.id, req.userId, content.trim());
        res.status(201).json(comment);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
}
async function getComments(req, res) {
    try {
        const comments = await momentService.getComments(req.params.id);
        res.json(comments);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
//# sourceMappingURL=moment.controller.js.map