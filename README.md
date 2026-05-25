# Echo IM

Echo 是一个面向移动端体验的即时通讯项目。它不是纯聊天 Demo，而是把私聊、群聊、好友关系、动态可见范围、星域分组、关系页、表情包、背景设置和 5+App 打包适配放在同一个产品体系里。

当前仓库对应的是正在迭代的最新版代码，不再沿用旧版“星轨”文案。项目里的核心概念现在统一为：

- 聊天：即时沟通。
- 动态：内容发布和互动。
- 星域：好友分组和动态权限。
- 关系星域：某个好友与你之间的资料、关系数据和动态入口。
- 群星域：群聊资料、成员和群关系入口。

## 当前功能

### 账号与用户

- 邮箱注册、登录、找回密码。
- 图形验证码与邮箱验证码。
- Echo ID 搜索用户。
- 头像、昵称、个性签名、自动回复、陌生人消息权限。
- 开发者 Echo ID 和移动端展示适配。

### 私聊

- 私聊消息实时收发，基于 Socket.IO。
- 文本、图片、语音、视频上传接口。
- 已读回执、未读数、在线状态、最后在线时间。
- 消息撤回、单条删除、批量删除、清空会话。
- 会话置顶、隐藏、长按菜单。
- 会话列表顶部支持好友搜索和聊天记录搜索。
- 当前聊天页内收到同一好友消息时不弹通知，其他会话消息才弹通知。
- 支持聊天页左滑进入“关系星域”。

### 表情包

- 自定义表情包上传。
- 表情包管理和批量删除。
- 默认展示 4 个，展开后一页 12 个。
- 支持横向分页切换，适配移动端触控。

### 好友与关系星域

- 好友申请、同意、拒绝。
- 好友备注、置顶、拉黑、删除。
- 单删和互删逻辑在后端关系状态中处理。
- 好友资料页支持备注、专属聊天背景、星域分组。
- 左滑进入关系星域页，展示头像、昵称、在线状态、Echo ID、关系数据和最近动态。
- 关系数据预留：所属星域、认识时间、最近互动、亲密值等。

### 星域

星域是 Echo 的好友分组和权限系统。

- 创建、编辑、删除星域。
- 给星域设置颜色。
- 添加好友到星域、从星域移除好友。
- 好友可以属于多个星域。
- 动态发布时可以选择公开、部分星域可见、部分好友不可见。
- 最终权限逻辑：星域允许范围减去单独排除的人。

### 动态

- 发布文字和图片动态。
- 单条动态最多 18 张图片。
- 发布页图片使用宫格方式预览，避免横向滑动找图。
- 动态图片展示支持两种模式：
  - 悬浮折叠。
  - 宫格展示。
- 超过 9 张图时分页展示。
- 支持点赞、评论、删除。
- 支持按星域权限过滤可见范围。

### 群聊

- 创建群聊，选择好友加入。
- 群头像、群名称、群公告。
- 群成员列表。
- 群主、管理员、普通成员角色。
- 拉人进群、移除成员。
- 设置我在本群的昵称和备注。
- 群主转让、退群、解散群。
- 群聊左滑进入“群星域”。

### 引力圈

- 侧边栏入口进入引力圈。
- 支持捕捉好友到引力圈。
- 引力圈用于放置重要联系人，是聊天列表之外的快速关系入口。

### 回声胶囊

- 定时消息入口。
- 支持查看已设置的定时消息。
- 定时发送能力依赖后端 delayed message 接口。

### 背景与外观

- 深色/浅色模式切换。
- 会话列表背景、聊天界面背景、引力圈背景。
- 好友专属聊天背景。
- 图片上传后作为背景，支持恢复默认。
- 移动端底部输入栏、键盘弹出和触控手势做了适配。

### 通知与 App 打包

- Web 端已有浏览器通知和 Service Worker 点击跳转逻辑。
- 5+App / HBX 打包目录已单独准备过，当前项目也保留了适配代码。
- 真正的系统级离线推送需要接入 DCloud uni-push 或厂商推送，单靠网页前端无法做到完全类似微信的后台通知。

## 技术栈

### 前端

- React 19
- TypeScript
- Vite 8
- Tailwind CSS
- Framer Motion
- React Router
- Socket.IO Client
- lucide-react

### 后端

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- Multer
- JWT
- Zod
- Nodemailer

### 部署

- Docker Compose
- Nginx
- PostgreSQL 16
- 阿里云 ECS

生产环境主要容器：

- `echo-frontend-1`
- `echo-backend-1`
- `echo-db-1`

## 目录结构

```text
Echo/
├─ backend/
│  ├─ prisma/
│  └─ src/
│     ├─ controllers/
│     ├─ routes/
│     ├─ services/
│     ├─ middlewares/
│     └─ utils/
├─ frontend/
│  └─ src/
│     ├─ api/
│     ├─ components/
│     ├─ contexts/
│     ├─ hooks/
│     ├─ pages/
│     └─ utils/
├─ docs/
├─ docker-compose.yml
└─ docker-compose.prod.yml
```

## 本地开发

### 后端

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 生产部署

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

部署前需要准备后端环境变量。仓库不会提交 `.env`、证书、上传文件、数据库 volume、`node_modules`、`dist` 等本地或敏感内容。

## 文档

- 掘金文章草稿：[docs/ECHO_JUEJIN_7_ARTICLE_DRAFTS.md](docs/ECHO_JUEJIN_7_ARTICLE_DRAFTS.md)
- 抖音脚本：[docs/ECHO_DOUYIN_SCRIPT_PACK.md](docs/ECHO_DOUYIN_SCRIPT_PACK.md)
- 后续修复计划：[docs/ECHO_NEXT_FIX_PLAN.md](docs/ECHO_NEXT_FIX_PLAN.md)
- HBX 自签名记录：[docs/HBX自签名.md](docs/HBX自签名.md)

## 状态说明

这个项目仍在快速迭代中。当前版本重点已经从“能聊天”推进到“关系、权限、动态、群聊和 App 化准备”。离线推送、原生能力增强、群通知和更完整的 App 权限配置仍需要继续接入 DCloud / 厂商推送体系。

## GitHub

当前发布仓库：

https://github.com/ry520-stack/-Echo-IM
