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
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const blockService = __importStar(require("../services/block.service"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const list = await blockService.getBlockedUsers(req.userId);
        res.json(list);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/:userId', async (req, res) => {
    try {
        await blockService.blockUser(req.userId, req.params.userId);
        res.json({ message: '已拉黑' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
router.delete('/:userId', async (req, res) => {
    try {
        await blockService.unblockUser(req.userId, req.params.userId);
        res.json({ message: '已取消拉黑' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
exports.default = router;
//# sourceMappingURL=block.routes.js.map