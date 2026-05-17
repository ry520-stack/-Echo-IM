# Echo 开发纪律 (RULES)

## 1. 模块隔离
- 每次只改目标模块，绝不跨文件越界修改
- 每个 `.tsx` 文件只做一个组件
- 组件通过 props 通信，不直接引用其他组件的内部状态

## 2. 版本控制
- 修改完成后必须执行 `git add -A && git commit`
- 使用语义化前缀：`feat:` `fix:` `docs:` `refactor:` `style:` `tweak:`
- **禁止未经明确指令执行 `git push`**
- 禁止 force push 到 master

## 3. 代码清洁
- 代码和提交记录中**禁止出现 Claude、AI、克劳德**等字眼
- 禁止 `Co-Authored-By` 签名
- 掘金文章、经验日志不上传 GitHub（`.gitignore` 已配置）

## 4. 性能纪律
- 图片必须经 `compressImage.ts` 压缩
- 移动端容器用 `dvh`，不用 `h-screen`
- 滤镜 (`filter: url(#...)`) 必须隔离到独立 div，不触及文字层

## 5. 视觉一致性
- 全局弹簧参数统一：页面切换 `stiffness:150 damping:20`，组件内 `stiffness:200-300 damping:25`
- 深色模式背景用 `#05050A` 或深空径向渐变
- 品牌色 `primary-500: #6366f1`

## 6. 推送协议
- 必须收到明确指令（如"push"、"推送到 GitHub"）才能执行 git push
- 默认只 commit 不 push
