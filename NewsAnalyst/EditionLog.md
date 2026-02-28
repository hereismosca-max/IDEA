# Edition Log

> 记录每个版本的功能变化。每完成一个阶段（Phase）或发布一个重要更新时在此记录。
> 版本号格式：`v主版本.次版本.补丁` （Major.Minor.Patch）

---

## 版本规划 Version Roadmap

| 版本 | 对应Phase | 预期内容 | 状态 |
|------|-----------|---------|------|
| v0.1.0 | Phase 1 | 地基：新闻抓取 + 基础展示 + 用户认证后端 | ✅ 已发布 |
| v0.2.0 | Phase 2 | AI分析 + 日期导航 + 分类筛选 + 用户认证 + 文章投票 | ✅ 已发布 |
| v0.3.0 | Phase 2+ | 邮箱验证 + 忘记密码 + 搜索 + 收藏 + 移动端适配 | 🔨 进行中 |
| v1.0.0 | Phase 3+4 | AI 重要性评分 + 智能推荐 + 中文板块 | 📋 待启动 |

---

## 历史版本 Release History

## v0.1.0 · 地基版本 — 2026-02-27

**线上地址**
- 前端：https://idea-brown.vercel.app
- 后端 API：https://idea-production.up.railway.app
- API 文档：https://idea-production.up.railway.app/docs

**本次交付**
- 自动抓取 5 个英文财经新闻源（Financial Times / CNBC / BBC Business / Yahoo Finance / MarketWatch），每 6 小时定时抓取，启动时立即执行一次
- 新闻列表 API（分页、语言筛选），单篇文章 API
- 用户认证后端（注册 / 登录 / JWT，接口就绪，前端 UI 留 Phase 2）
- 前端基础界面：TopBar / MenuBar（分类 Tab）/ NewsCard / NewsFeed
- i18n 国际化基础配置（en / zh，中文内容留 Phase 4）
- 全链路线上部署：Vercel（前端）+ Railway（后端）+ Supabase Pro（数据库）
- CORS 正确配置，前后端跨域访问通过验证

**关键技术决策**
- 使用 `psycopg3`（`psycopg[binary]`）替代 `psycopg2`，兼容 Python 3.13
- 调度器 INSERT 改用 `ON CONFLICT DO NOTHING`，避免并发重复插入引发的 PendingRollbackError
- CORS `allow_origins` 不支持 glob，改用 `allow_origin_regex=r"https://.*\.vercel\.app"` 覆盖所有 Vercel 预览域名
- Supabase 使用 Session Pooler URL（IPv4 兼容），避免直连地址的 IPv6-only 问题

**已知限制（Phase 2 解决）**
- 前端 Sign In 按钮暂无功能（认证后端已就绪）
- MenuBar 分类 Tab 暂未与后端数据联动
- 无搜索、无收藏、无分页（仅"Load more"按钮）
- 移动端响应式未完整适配

---

## v0.2.0 · 核心功能版本 — 2026-02-27

**线上地址**
- 前端：https://idea-brown.vercel.app
- 后端 API：https://idea-production.up.railway.app

**本次交付**

**AI 分析层**
- trafilatura + httpx 抓取文章全文，GPT-4o-mini 单次调用同时生成摘要（2-3 句客观中立）+ 结构化标签
- 标签结构：`entities`（公司/人物）/ `locations`（地区）/ `sectors`（行业）/ `topics`（事件类型）/ `scale`（影响范围）
- 历史文章 backfill 脚本补全所有 `ai_summary` 和 `ai_tags`

**内容导航**
- 日期导航栏（← 日期标签 → 箭头 + 日历弹窗），按 UTC 日期筛选文章
- MenuBar 6 板块真实联动（All / Markets / Technology / Economy / Energy / Crypto），基于 PostgreSQL JSONB `@>` 查询

**文章详情页**
- 内部路由 `/[locale]/article/[id]`（Server Component，SEO generateMetadata + 5 min revalidate）
- 全面展示 AI 分析：sector/topic 标签、entities/locations/scale 元数据、完整 AI 摘要、原文链接卡片

**用户认证系统**
- 后端：`GET /api/v1/auth/me` 端点；`get_current_user` / `get_optional_user` FastAPI 依赖
- 前端：AuthProvider Context（login / logout / register / 会话自动恢复）
- 登录页 + 注册页（表单验证 + 错误提示）
- TopBar 动态：登录后显示用户名 + Sign Out，未登录显示 Sign In 链接

**文章投票**
- `article_votes` 表（`UNIQUE(user_id, article_id)`，`vote ±1`）
- toggle 投票逻辑（同方向再投 = 撤票，反方向 = 切换）
- 文章详情页左栏 sticky ▲/▼ 按钮，乐观更新，首屏无额外请求
- 未登录点击自动跳转 `/login`

**关键技术决策**
- AI 摘要 + 标签合并为单次 API 调用（节省 50% 成本和延迟）
- 投票初始值在 Server Component 服务端获取并通过 props 传入，首屏零请求
- `get_optional_user` 模式处理公开端点，无需强制登录

**已知限制（v0.3.0 解决）**
- 暂无搜索功能
- 暂无用户收藏功能
- 移动端响应式未完整适配

---

## v0.3.0 · 进行中 — 2026-02-28 起

**线上地址**
- 前端：https://idea-brown.vercel.app
- 后端 API：https://idea-production.up.railway.app

**已完成（部分交付）**

**Bug 修复**
- passlib 替换为 bcrypt 直接调用，解决 bcrypt 5.0.0 兼容问题
- 修复 Alembic 空迁移导致的 `article_votes` 表缺失（根因：`ArticleVote` 未在 `models/__init__.py` import）

**邮箱验证系统**
- 注册后自动发送验证邮件（Resend API，邮件失败不阻断注册）
- `POST /verify-email`：Token 验证，设置 `email_verified=True`
- `POST /resend-verification`：重新发送验证邮件（需登录）
- 软性强制策略：登录不受限，投票等核心操作需先验证邮箱
- 前端：注册成功 → "请查收邮件"提示页；`/verify-email` 验证落地页（三态）
- `VoteButtons`：未验证时展示 amber 提示框 + 一键重发邮件

**忘记密码 / 重置密码**
- `POST /forgot-password`（公开）：生成重置 token，始终返回 200（防邮箱枚举）
- `POST /reset-password`（公开）：验证 token，更新密码，清除 token（1 小时有效）
- 前端：`/forgot-password` 表单页；`/reset-password` 新密码页
- 登录页新增"Forgot password?"快捷入口

**关键技术说明**
- 邮件服务：Resend（`pip install resend`，免费 3000 封/月）
- 测试阶段使用 `onboarding@resend.dev` 作为发件人，**只能向 Resend 账号注册邮箱发送**
- 生产上线前需购买域名并在 Resend 控制台完成 DNS 验证（DKIM + SPF + DMARC），再更新 `EMAIL_FROM` 环境变量，无需改代码

**待完成（本版本剩余）**
- 搜索功能
- 用户收藏新闻功能
- 移动端响应式适配

---

_最后更新：2026-02-28（v0.3.0 进行中：邮箱验证 + 忘记密码 + bug 修复 完成）_
