"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.getUploadUrl = getUploadUrl;
exports.deleteUploadFile = deleteUploadFile;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const UPLOAD_DIR = path_1.default.join(__dirname, '..', '..', 'uploads');
// Ensure upload dirs exist
['avatars', 'backgrounds', 'emojis'].forEach(sub => {
    const dir = path_1.default.join(UPLOAD_DIR, sub);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
});
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.png';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('只允许上传图片文件 (PNG/JPEG/GIF/WebP)'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
function getUploadUrl(filename) {
    return `/uploads/${filename}`;
}
function deleteUploadFile(filename) {
    const filepath = path_1.default.join(UPLOAD_DIR, filename);
    if (fs_1.default.existsSync(filepath))
        fs_1.default.unlinkSync(filepath);
}
//# sourceMappingURL=upload.service.js.map