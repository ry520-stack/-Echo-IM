import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import messageRoutes from './routes/message.routes';
import friendRoutes from './routes/friend.routes';
import groupRoutes from './routes/group.routes';
import emojiRoutes from './routes/emoji.routes';
import momentRoutes from './routes/moment.routes';
import uploadRoutes from './routes/upload.routes';
import delayedRoutes from './routes/delayed.routes';
import blockRoutes from './routes/block.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 静态文件服务（上传的图片）
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=604800'); },
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 公开路由（无需认证）
app.use('/api/auth', authRoutes);

// 受保护路由（需要 JWT）
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/emojis', emojiRoutes);
app.use('/api/moments', momentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/delayed', delayedRoutes);
app.use('/api/blocks', blockRoutes);

export default app;
