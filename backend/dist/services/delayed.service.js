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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDelayedMessageScheduler = startDelayedMessageScheduler;
exports.scheduleMessage = scheduleMessage;
exports.getScheduledMessages = getScheduledMessages;
exports.cancelScheduled = cancelScheduled;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socketService = __importStar(require("./socket.service"));
let schedulerStarted = false;
function startDelayedMessageScheduler() {
    if (schedulerStarted)
        return;
    schedulerStarted = true;
    setInterval(async () => {
        try {
            const now = new Date();
            const dueMessages = await prisma_1.default.delayedMessage.findMany({
                where: { cancelled: false, sendAt: { lte: now } },
            });
            for (const delayed of dueMessages) {
                try {
                    const msg = await prisma_1.default.message.create({
                        data: {
                            senderId: delayed.senderId,
                            receiverId: delayed.receiverId || null,
                            groupId: delayed.groupId || null,
                            content: delayed.content,
                            type: delayed.type,
                        },
                        include: {
                            sender: { select: { id: true, username: true, nickname: true, avatar: true } },
                        },
                    });
                    await prisma_1.default.delayedMessage.update({
                        where: { id: delayed.id },
                        data: { cancelled: true },
                    });
                    const io = socketService.getIO();
                    if (io) {
                        if (delayed.receiverId) {
                            io.to(`user:${delayed.senderId}`).emit('message:receive', msg);
                            io.to(`user:${delayed.receiverId}`).emit('message:receive', msg);
                        }
                        else if (delayed.groupId) {
                            io.to(`group:${delayed.groupId}`).emit('message:receive', msg);
                        }
                    }
                }
                catch {
                    // skip failed messages
                }
            }
        }
        catch {
            // scheduler error — ignore
        }
    }, 3000); // check every 3 seconds
}
async function scheduleMessage(senderId, data) {
    const sendAt = new Date(data.sendAt);
    if (isNaN(sendAt.getTime()))
        throw new Error('无效的时间格式');
    if (sendAt <= new Date())
        throw new Error('发送时间必须在未来');
    return prisma_1.default.delayedMessage.create({
        data: {
            senderId,
            receiverId: data.receiverId || null,
            groupId: data.groupId || null,
            content: data.content,
            type: data.type || 'text',
            sendAt,
        },
    });
}
async function getScheduledMessages(senderId) {
    return prisma_1.default.delayedMessage.findMany({
        where: { senderId, cancelled: false, sendAt: { gt: new Date() } },
        orderBy: { sendAt: 'asc' },
    });
}
async function cancelScheduled(id, senderId) {
    const dm = await prisma_1.default.delayedMessage.findUnique({ where: { id } });
    if (!dm || dm.senderId !== senderId)
        throw new Error('无权取消');
    return prisma_1.default.delayedMessage.update({ where: { id }, data: { cancelled: true } });
}
//# sourceMappingURL=delayed.service.js.map