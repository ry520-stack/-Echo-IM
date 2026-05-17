"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const friend_routes_1 = __importDefault(require("./routes/friend.routes"));
const group_routes_1 = __importDefault(require("./routes/group.routes"));
const emoji_routes_1 = __importDefault(require("./routes/emoji.routes"));
const moment_routes_1 = __importDefault(require("./routes/moment.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const delayed_routes_1 = __importDefault(require("./routes/delayed.routes"));
const block_routes_1 = __importDefault(require("./routes/block.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// 静态文件服务（上传的图片）
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
app.use('/uploads', express_1.default.static(uploadsDir, {
    maxAge: '7d',
    setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=604800'); },
}));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 公开路由（无需认证）
app.use('/api/auth', auth_routes_1.default);
// 受保护路由（需要 JWT）
app.use('/api/users', user_routes_1.default);
app.use('/api/messages', message_routes_1.default);
app.use('/api/friends', friend_routes_1.default);
app.use('/api/groups', group_routes_1.default);
app.use('/api/emojis', emoji_routes_1.default);
app.use('/api/moments', moment_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/delayed', delayed_routes_1.default);
app.use('/api/blocks', block_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map