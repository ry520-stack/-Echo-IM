# Echo：星际与共鸣（Space & Resonance）

> 极简、沉浸、反臃肿的私人社交宇宙 —— 由一位 21 岁独立开发者，开发的星际通讯站。

---

Echo 以"宇宙、引力、星轨"为核心设计语言。大面积留白、深邃蓝紫调、Glassmorphism 毛玻璃、Framer Motion 弹簧物理动效。**拒绝臃肿，回归纯粹。**

---

## 🌌 核心体验

### 引力圈 (Gravity Zone)
首页左滑，进入隐藏的"引力圈"。深色模式下是 OLED 纯黑深空，将最重要的联系人"捕获"至此。长按卡片安全移出，300ms 手势防误触锁。

### 对称隐私
聊天双方中任意一方关闭已读反馈 → **双方消息全部隐藏已读状态**。要么都坦诚，要么都自由。

### 消息本地销毁 & 120秒时空撤回
删除仅本地执行，不惊动对方。撤回在 2 分钟内双向生效，化为一句"撤回了一条消息"。

### 流体滑动语音 (Gooey Voice Swipe)
长按麦克风 → SVG 流体滤镜轨道 + Framer Motion 物理拖拽。向右滑发送，松手果冻回弹取消。

### 会呼吸的底部输入栏
5 秒无操作自动阻尼折叠，输入框居中拉长。云端表情库 + 每个聊天室独立自定义背景。

---

## ☄️ 星轨 (Orbit) — 朋友圈

### 悬浮循环堆叠 (Floating Stack)
图片 3D 堆叠，向左拖拽顶层切图。**10 秒无操作自动倒放复位** — 像录像带倒带一样丝滑。

### 宫格横滑分页 (Paginated Grid)
超过 9 张自动分页，整体横滑翻页。Framer Motion 弹簧阻尼。

### 星域权限 & 个人星轨
发布到特定星域（家人星域、技术圈星域），定时发射。聊天室左滑 → 好友个人星轨全屏沉浸。

---

## 🛰️ 技术护城河

| 能力 | 说明 |
|------|------|
| 前端 OOM 管线 | Canvas/WebP 极限压缩，10MB → 200KB |
| 键盘避让 | `dvh` 动态高度，永不黑屏 |
| 物理阻尼动画 | 全 App Framer Motion Spring Physics |
| 乐观更新 | 弱网/VPN 下消息瞬间本地渲染 |
| 手势锁死 | `stopPropagation` + 坐标阈值 + 300ms 锁 |

---

## 📦 技术栈

```
前端: React 19 + TypeScript + Tailwind CSS 3 + Vite 8 + Framer Motion 12
后端: Node.js + Express + Prisma + PostgreSQL 16
实时: Socket.IO (WebSocket)
部署: Docker Compose 三容器 + Nginx + 阿里云 ECS
```

## 🚀 快速开始

```bash
# 后端
cd backend && npm install
npx prisma generate && npx prisma db push
npm run dev

# 前端
cd frontend && npm install && npm run dev
```

```bash
# Docker 生产部署
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```

## 🏗️ 项目结构

```
Echo/
├── backend/src/{controllers,services,routes,middlewares}
├── frontend/src/{pages,components,contexts,hooks,api}
├── docker-compose.prod.yml
└── .env.example
```

## 📚 开发者手记 (Developer Notes)

从架构设计到交互引擎，从踩坑排错到工程化护城河 — 7 篇技术手记记录 Echo 的完整演进过程。

| 编号 | 文章 | 内容 |
|------|------|------|
| 01 | [架构设计与极简美学](docs/developer_notes/01-架构设计与极简美学.md) | 技术栈、色彩材质体系、Docker 三容器架构 |
| 02 | [引力圈与手势交互引擎](docs/developer_notes/02-引力圈与手势交互引擎.md) | 手势判定逻辑、防误触锁、Spring 动画统一参数 |
| 03 | [聊天室深度交互与对称隐私](docs/developer_notes/03-聊天室深度交互与对称隐私.md) | 对称隐私、撤回/删除、GooeySwipe、动态输入栏 |
| 04 | [星轨画廊与 Framer Motion 物理动效](docs/developer_notes/04-星轨画廊与Framer-Motion物理动效.md) | 悬浮堆叠、10秒倒放、宫格横滑分页 |
| 05 | [移动端工程化与技术护城河](docs/developer_notes/05-移动端工程化与技术护城河.md) | OOM 管线、键盘避让、乐观更新、事件锁死 |
| 06 | [开发排错日志与踩坑记录](docs/developer_notes/06-开发排错日志与踩坑记录.md) | 手势穿透、深色光晕、布局黑屏、状态不同步 |
| 07 | [星轨共鸣视觉系统设计](docs/developer_notes/07-星轨共鸣视觉系统设计.md) | 天体物理 × 时间流逝感的视觉落地 |

---

> 不是在堆砌功能，而是在做减法和体验的乘法。
>
> GitHub: [ry520-stack/Echo-IM](https://github.com/ry520-stack/Echo-IM)
