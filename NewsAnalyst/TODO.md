# TODO

> 格式说明：`[x]` = 已完成  `[ ]` = 待完成  `[~]` = 进行中

---

## ✅ 已完成 Completed

- [x] 产品方向确定（经济金融新闻聚合与分析平台）
- [x] 目标用户定义
- [x] 新闻来源确定（Reuters / CNBC / AP News / Yahoo Finance / MarketWatch）
- [x] 技术栈选型（Next.js + FastAPI + PostgreSQL）
- [x] 部署方案确定（Vercel + Railway + Supabase Pro）
- [x] 数据库表结构设计（7张核心表）
- [x] 项目目录结构设计
- [x] 开发阶段规划（4个Phase）
- [x] GitHub仓库创建
- [x] 文档初始化（ProductContent / ProjectArchitecture / DatabaseStructure / CODEBASE / DevLog / EditionLog）
- [x] 项目目录结构创建（frontend/ + backend/ 全部骨架文件写入完成）
- [x] 前端初始化（Next.js 14 + TypeScript + Tailwind + next-intl 配置完成）
- [x] 后端初始化（FastAPI + SQLAlchemy + Alembic 骨架完成）
- [x] 环境变量模板（backend/.env.example + frontend/.env.local.example）
- [x] .gitignore 配置
- [x] README.md 编写
- [x] 数据库模型（User / Source / FetchLog / Article / UserSavedArticle / Category / ArticleCategory）
- [x] API骨架（auth / articles / sources / categories，/api/v1/ 版本化）
- [x] RSS抓取器（BaseFetcher抽象类 + RSSFetcher实现 + registry插件注册表）
- [x] AI占位层（BaseAIProcessor接口 + PassthroughProcessor实现）
- [x] 定时调度器（APScheduler 6小时 + 启动时立即执行）
- [x] 日志系统（utils/logger.py，统一格式）
- [x] 前端核心组件（TopBar / MenuBar / NewsCard / NewsFeed）
- [x] i18n 配置（middleware + next-intl + en.json + zh.json）
- [x] 创建 Supabase Pro 项目，获取 DATABASE_URL
- [x] 填写 `backend/.env`（DATABASE_URL + JWT_SECRET_KEY）
- [x] 安装 Python 依赖（`pip install -r requirements.txt`）
- [x] 生成 Alembic 初始迁移（`alembic revision --autogenerate -m "init"`）
- [x] 执行迁移，创建所有表（`alembic upgrade head`）
- [x] 插入种子数据（5个新闻来源 + 7个分类标签）

---

## 🔨 Phase 1 · 地基（已完成）

### ⬇️ 验证与部署
- [x] 填写 `frontend/.env.local`（NEXT_PUBLIC_API_URL=http://localhost:8000）
- [x] 安装前端依赖（`npm install`）
- [x] 本地启动后端（`uvicorn app.main:app --reload`）— 164篇文章抓取成功
- [x] 本地启动前端（`npm run dev`）
- [x] 验证后端 API 文档（http://localhost:8000/docs）
- [x] 验证新闻抓取任务正常运行（5来源 164篇文章入库）
- [x] 验证前端能正常渲染新闻卡片 ✅

### 部署
- [x] 部署后端至 Railway（配置环境变量）— https://idea-production.up.railway.app
- [x] 部署前端至 Vercel（配置 NEXT_PUBLIC_API_URL）— https://idea-brown.vercel.app
- [x] 修复 CORS（`allow_origin_regex=r"https://.*\.vercel\.app"` 替代无效通配符字符串）
- [x] 线上端到端验证 ✅

---

## 🔨 Phase 2 · 基础功能完善（进行中）

### AI 标签系统
- [x] AI 服务商选定（OpenAI GPT-4o-mini）
- [x] OpenAIProcessor 实现（结构化事实提取：entities / locations / sectors / topics / scale）
- [x] 调度器优化：只对新增文章调用 AI，避免重复处理
- [x] 历史文章 backfill（313 篇全部打标签）
- [x] 分析标签分布，确定 MenuBar 板块方案（All / Markets / Technology / Economy / Energy / Crypto）
- [x] MenuBar 分类筛选真实联动（基于 AI 标签 JSONB 查询）

### AI 摘要生成
- [x] content_fetcher.py：trafilatura + httpx 抓取文章全文（解决 Yahoo Finance 无摘要问题）
- [x] OpenAIProcessor 扩展：单次 API 调用同时返回 summary + tags
- [x] scheduler 更新：传入 url，保存 ai_summary 到数据库
- [x] backfill_ai_summaries.py：对全部历史文章补全 ai_summary

### 日期导航
- [x] 后端 `/articles?date=YYYY-MM-DD` 按 UTC 日期过滤
- [x] DateNavigator 组件（← 日期标签 → 箭头导航）
- [x] 日历弹窗（react-day-picker v9，未来日期禁用）
- [x] NewsFeed 按日切换，加载到底停止，显示"End of articles for this day"

### 文章详情页
- [x] NewsCard 改为内部路由（`/[locale]/article/[id]`）
- [x] 文章详情 Server Component：标题、来源、AI 标签（sectors/topics/entities/locations/scale）、AI 摘要、原文链接卡片
- [x] SEO generateMetadata + revalidate 缓存

### 用户认证系统（Phase 1 Auth）
- [x] `get_current_user` / `get_optional_user` FastAPI 依赖（security.py）
- [x] `GET /api/v1/auth/me` 端点
- [x] `AuthProvider` React Context（login / logout / register / 会话恢复）
- [x] api.ts 自动注入 Authorization 头
- [x] 登录页 `/[locale]/login`
- [x] 注册页 `/[locale]/register`
- [x] TopBar 动态用户 UI（已登录显示用户名 + Sign Out，未登录显示 Sign In 链接）
- [x] layout.tsx 包裹 AuthProvider

### 文章投票系统（Phase 2 Voting）
- [x] `ArticleVote` 数据库模型（`vote ±1`，`UNIQUE(user_id, article_id)`）
- [x] Alembic 迁移：创建 `article_votes` 表
- [x] `POST /articles/{id}/vote` 端点（toggle / 切换 / 新增，需认证）
- [x] `GET /articles/{id}/votes` 端点（投票计数，认证可选）
- [x] `GET /articles/{id}` 响应附带 `upvotes / downvotes / user_vote`
- [x] `VoteButtons` 客户端组件（▲/▼，乐观更新，未登录跳转 /login）
- [x] 文章详情页两栏布局（左侧 sticky VoteButtons + 右侧文章内容）

### 邮箱验证 + 忘记密码（Email Verification + Password Reset）
- [x] passlib 替换为 bcrypt 直接调用（兼容 bcrypt 5.0.0）
- [x] Alembic 空迁移 Bug 修复（`ArticleVote` 未在 `models/__init__.py` import 导致表未生成）
- [x] Resend 邮件服务接入（`app/core/email.py`，无 API key 时优雅降级）
- [x] `app/core/config.py` 新增 `RESEND_API_KEY` / `EMAIL_FROM` / `FRONTEND_BASE_URL`
- [x] User 模型新增 5 个字段（`email_verified` + 验证 token/过期时间 + 重置 token/过期时间）
- [x] Alembic 迁移：`add_email_verification_and_password_reset_fields_to_users`
- [x] 注册流程更新：生成验证 token，发送验证邮件（邮件失败不阻断注册）
- [x] `POST /verify-email`：验证 token，设置 `email_verified=True`
- [x] `POST /resend-verification`（需登录）：重新生成 token 并重发
- [x] `POST /forgot-password`（公开）：生成重置 token，始终返回 200（安全）
- [x] `POST /reset-password`（公开）：验证重置 token，更新密码
- [x] 投票前检查 `email_verified`（403 `email_not_verified` → 前端提示）
- [x] 前端：注册成功后展示"查收邮件"提示（不再直接跳转）
- [x] 前端：登录页新增"Forgot password?"链接
- [x] 前端：新增 `/verify-email` 页（自动读 token 验证，三态展示）
- [x] 前端：新增 `/forgot-password` 页（邮箱输入 + 安全成功提示）
- [x] 前端：新增 `/reset-password` 页（新密码 + 确认密码 + token 验证）
- [x] `VoteButtons` 新增未验证提示框（amber 色，含 Resend email 按钮）

### 用户收藏新闻（Bookmarks）
- [x] `POST /api/v1/articles/{id}/save` toggle 收藏（auth + email_verified）
- [x] `GET /api/v1/articles/{id}/save` 查询收藏状态
- [x] `GET /api/v1/articles/saved` 用户收藏列表（分页，按 saved_at DESC）
- [x] `SaveStatusResponse` schema（`is_saved: bool`）
- [x] 前端：`SaveButton` 组件（乐观更新，未验证邮箱 amber 提示）
- [x] 前端：文章详情页侧边栏加书签按钮（VoteButtons 下方）
- [x] 前端：NewsCard 右上角书签图标（独立点击，不触发卡片跳转）
- [x] 前端：`/saved` 收藏列表页（Load more 分页，空状态引导）
- [x] 前端：TopBar 已登录状态显示 "Saved" 快捷链接

### 文章详情页增强（Article Detail Enhancements）
- [x] 后端：`GET /api/v1/articles/{id}/related` 端点（JSONB `@>` 匹配同 sector/topic，最多返回 5 篇）
- [x] 前端：文章详情页底部"Related Articles"区块（Promise.all 并行请求，无标签时隐藏）
- [x] 前端：`ShareButton` 组件（直接复制链接到剪贴板，2 秒 "Copied!" 反馈，不调用 Web Share API）

### Feed 质量与 AI 准确性优化
- [x] AI Prompt 优化：明确要求提取具体数据（数字/百分比/事件），禁止叙述性总结和主观判断
- [x] 付费墙/内容不可达过滤：content < 150 字符时跳过 AI 调用，节省 API 成本
- [x] 调度器：内容不可达时仍写入 `ai_processed_at`，确保可被过滤逻辑识别
- [x] backfill 脚本：同步更新，失败时也写入 `ai_processed_at`
- [x] articles API：新增过滤条件，付费墙文章（`ai_processed_at IS NOT NULL AND ai_summary IS NULL`）不出现在 feed 中
- [x] related articles API：仅推荐有真实摘要的文章
- [~] 大规模 backfill：补全 2000 篇无摘要文章（本地运行中，预计 2026-03-08 完成）

### Feed 质量与调度器优化（2026-03-08）
- [x] 调度器间隔从 6 小时改为 5 分钟（`FETCH_INTERVAL_MINUTES: int = 5`）
- [x] 调度器新增"兜底补全"步骤：每轮最多处理 20 篇无摘要遗留文章
- [x] Feed 过滤改为严格的 `ai_summary IS NOT NULL`（消灭空卡片）
- [x] NewsCard `timeAgo()` 改为精细格式（时/分/天/周/月/年逐级展开，零分量省略）

### 搜索功能（2026-03-08）
- [x] 后端 `GET /articles?search=` 支持 `ILIKE` 跨 `title` + `ai_summary` 搜索，搜索时忽略日期过滤
- [x] 后端 `?sort=popular` 支持按净票数（`SUM(ArticleVote.vote)`）排序（backend 保留，前端暂不展示）
- [x] `SearchBar` 组件（防抖 350ms，搜索图标 + 清空按钮）
- [x] `DateNavigator` 新增 `disabled` prop，搜索激活时变灰 + 不可交互
- [x] `NewsFeed` 新增 `search` prop，空状态文案根据是否在搜索动态切换
- [x] `HomeFeed` 三列 Flex 布局（SearchBar / DateNavigator 居中 / 占位块）

### 市场行情迷你卡片栏（2026-03-08）
- [x] `backend/requirements.txt` 新增 `yfinance>=0.2.54`
- [x] 新建 `backend/app/api/v1/routes/market.py`：`GET /api/v1/market/snapshot`（6 指标 + 5 分钟缓存）
- [x] `backend/app/main.py` 注册 market router
- [x] `frontend/src/types/index.ts` 新增 `MarketIndicator` / `MarketSnapshot`
- [x] `frontend/src/lib/api.ts` 新增 `fetchMarketSnapshot()`
- [x] 新建 `frontend/src/components/layout/MarketTicker.tsx`（Mini Card B 风格，60s 自动刷新）
- [x] `HomeFeed` 引入 MarketTicker，放在 MenuBar 正上方

### 板块切换器（取代 EN/中文 语言开关）（2026-03-08）
- [x] 新建 `frontend/src/providers/BoardProvider.tsx`（React Context，`board: 'en' | 'zh'`，默认 `'en'`）
- [x] `frontend/src/app/[locale]/layout.tsx` 包裹 `<BoardProvider>`
- [x] `frontend/src/components/layout/TopBar.tsx` 重构为三列布局 + 板块切换 Pill（双语标签翻转）
- [x] `frontend/src/components/news/NewsFeed.tsx` 新增 `language` prop，`useEffect` 依赖 language 变化
- [x] `frontend/src/components/news/HomeFeed.tsx` 读取 `useBoard()`，传 `language` 给 NewsFeed
- [x] 中文板块空状态："暂无资讯 / 中文板块即将上线，敬请期待。"

### 滚动标题词条栏（2026-03-08）
- [x] `MarketTicker.tsx` 重构左右两栏（mini cards | HeadlineTicker）
- [x] HeadlineTicker：fade+slide 动画切换、来源名 + X/N 计数、标题可点击
- [x] 前端轮询从 60s 降至 15s

### Settings 菜单 + Smart Headlines + i18n（2026-03-08 第二轮）
- [x] User 模型新增 `bio` (Text, nullable) + `pronouns` (String 50, nullable)
- [x] Alembic 迁移 `3a7f82c1d905`：添加 bio + pronouns 列
- [x] `UpdateProfileRequest` schema（全字段可选）
- [x] `PATCH /api/v1/auth/me`：局部更新 display_name / bio / pronouns / preferred_lang
- [x] `GET /api/v1/articles/headlines`：smart 端点，global/national scale 优先，fallback 最新
- [x] `User` interface 加 `bio? / pronouns?`
- [x] `api.ts` 新增 `updateProfile()` + `fetchHeadlines()`
- [x] `AuthProvider` 新增 `refreshUser()`（重新拉 /me，更新 user state）
- [x] 新建 `SettingsMenu.tsx`（汉堡图标，点击展开，点外关闭）
  - Account 区块：display_name / email(只读) / bio / pronouns + Save 按钮三态
  - Language 区块：Default / English / Chinese 单选，切换后保存 + 导航 locale
- [x] `TopBar` 集成 SettingsMenu；login 后同步 preferred_lang → URL locale
- [x] `MenuBar` 标签改为 `useTranslations('menu')` 动态翻译（切语言自动生效）
- [x] `messages/en.json` + `zh.json`：menu.* 对齐后端板块，新增完整 `settings.*`
- [x] `HeadlineTicker` 改用 `fetchHeadlines(board, 5)` 展示重要国际事件

### 全站 i18n 补完 + SettingsMenu 重设计（2026-03-09）
- [x] Sign In / Saved / Today / Yesterday 接入 next-intl 翻译（`nav.*` 命名空间）
- [x] `DateNavigator` 日期格式随 locale 切换（zh-CN / en-US）
- [x] `SettingsMenu` 重写为 list-style（Account / Language / Notifications / Display / Sign Out）
- [x] Language 选项简化为 EN / 中文（移除 Default 选项）
- [x] `messages/en.json` + `zh.json` 补全 `nav.*` 和更新 `settings.*`

### 中文翻译功能（2026-03-09）
- [x] 新建 `backend/app/services/translator.py`（GPT-4o-mini，单次调用翻译 title + summary）
- [x] Alembic 迁移 `b2f94e1c7a30`：添加 `title_zh` / `ai_summary_zh` 列（待手动在 Railway 执行）
- [x] `GET /api/v1/articles/{id}/translate?lang=zh`（首次翻译 → 缓存；后续直接返回缓存）
- [x] `ArticleTranslationResponse` schema + `ArticleTranslation` TS interface
- [x] `NewsCard`：zh locale 下 background-fetch 标题翻译，"查看中文摘要"展开按钮
- [x] 文章详情页：服务端并行拉取翻译，中文标题/摘要 fallback 到英文
- [x] Headline Ticker：zh locale 下并发翻译 5 条词条，翻译到达即时更新

### ⚠️ 生产事故修复（2026-03-09）
- [x] `Article` ORM 模型移除 `title_zh` / `ai_summary_zh` mapping（列通过 raw SQL 访问）
- [x] `/translate` 端点改用 raw SQL + try/except 缓存（migration 未跑时静默跳过缓存）
- [x] Dockerfile CMD 恢复为原始 `["uvicorn", ...]`（移除 `alembic upgrade head`）
- [x] 后端恢复正常，health check 通过，文章 API 全部日期正常响应

### 翻译缓存迁移（2026-03-09）
- [x] 手动在 Railway 执行 `alembic upgrade head`（b2f94e1c7a30，添加 title_zh / ai_summary_zh 列）
- [x] `app/core/config.py` 加 `extra="ignore"`（防止 Railway 注入的多余 env vars 导致 pydantic 验证失败）
- [x] 翻译缓存上线验证：第二次调用 170ms（直接读 DB，不走 OpenAI）✅

### UX 修复（2026-03-09）
- [x] 日期选择刷新持久化（sessionStorage，tab 内保留，tab 关闭后重置为今天）
- [x] 竞态条件修复：快速切换日期时旧请求响应不再覆盖新请求结果（reqIdRef 机制）
- [x] UTC 时区偏移 Bug 修复（第一轮）：DateNavigator 箭头切换日期后，非 UTC 时区用户查询日期偏移一天；重写为 `Date.UTC()` 纯 UTC 运算
- [x] 本地时区日期导航（根本修复）：整个日期系统改为用户本地时区；后端新增 `date_from`/`date_to` ISO 时间戳参数；前端用 `toLocalMidnight()` + `toLocalDayRange()` 计算本地零点的 UTC 边界；PST/CST/任意时区的"今天"与本地时钟完全一致，DST 自动处理

### 域名与部署（2026-03-09）
- [x] 购买 finlens.io（Namecheap，$34.98/年）
- [x] Namecheap DNS：A `@` → Vercel IP；CNAME `www` → Vercel DNS
- [x] Vercel 配置 finlens.io + www.finlens.io（Valid Configuration，HTTPS 自动签发）
- [x] 后端 CORS 新增 finlens.io + www.finlens.io（commit `0adb98d`）
- [x] 代码品牌：email.py + config.py 由 "NewsAnalyst" 改为 "FinLens"，默认地址改为 finlens.io

### 邮件生产化（2026-03-09 完成）
- [x] Resend 控制台添加 finlens.io 域名 → 获取 DKIM/SPF/DMARC DNS 记录
- [x] Namecheap Advanced DNS 添加 TXT 记录（SPF + DKIM；MX 无需添加，仅发信不收信）
- [x] Resend 验证通过（状态 Verified ✅）
- [x] Railway 环境变量：`EMAIL_FROM=FinLens <noreply@finlens.io>`，`FRONTEND_BASE_URL=https://www.finlens.io`

### 移动端响应式适配（2026-03-09 完成）
- [x] 文章详情页：`flex-col-reverse md:flex-row`，侧边栏移动端水平排列在底部
- [x] MarketTicker：移动端隐藏市场指标卡（`hidden md:flex`），HeadlineTicker 占满全宽
- [x] HomeFeed 导航栏：移动端 SearchBar 独占全宽，DateNavigator 居中显示在下方
- [x] TopBar：用户名截断（`truncate max-w-[60px]`），分隔符小屏隐藏
- [x] MenuBar：右侧渐变遮罩提示可横向滑动

### 安全、账号管理与稳定性（2026-03-13）

#### Cloudflare Turnstile CAPTCHA
- [x] 排查 site key 失效导致注册按钮永久 disabled 的根因（Cloudflare JS SDK 抛出未捕获异常，不触发 React `onError`）
- [x] 新增 8 秒超时兜底：`useEffect` + `captchaResolvedRef` 检测 widget 是否 resolve，超时则 `setCaptchaUnavailable(true)` 解锁按钮
- [x] Widget 切换为 `size: 'invisible'`（Cloudflare 控制台同步改为 Invisible 模式）
- [x] 更新 Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 为有效 key
- [x] `captcha.py`：空 token 静默返回 true（widget 未加载时的降级策略）
- [x] `auth.py`：CAPTCHA 拒绝时输出 ip + token_len 诊断日志

#### 邮箱校验强化
- [x] `email_guard.py` 扩展辅音检查：4-9 字符字符串要求至少 1 个元音，否则判定为可疑
- [x] 覆盖案例：`sdss`、`qwrt`、`sdssqwrt` 等全辅音乱码邮箱被拒绝；`john`、`alice` 等正常名字放行

#### 未验证账号自动清除
- [x] `scheduler.py` 新增 `cleanup_unverified_accounts()`：查询并删除超 24 小时未验证的账号
- [x] 外键安全删除顺序：`article_votes` → `user_saved_articles` → `users`
- [x] 调度策略：`IntervalTrigger(hours=1)` 每小时运行；启动时立即执行一次（daemon thread）

#### 注册流程改进
- [x] 注册成功页新增"重发验证邮件"按钮（`idle → sending → sent/error` 状态机）
- [x] `frontend/messages/en.json` + `zh.json` 新增 `auth.resendEmail/resending/resendSent/resendError`

#### 配置诊断与可观测性
- [x] `main.py` 启动时打印各关键环境变量状态（`SET ✓` / `MISSING ✗`）
- [x] 新增 `GET /health/services` 端点：返回 email / captcha / database 配置状态，不暴露实际 key 值
- [x] `email.py` 新增 429 专项错误日志（配额耗尽时明确提示 Resend 用量和重置时间）

### 待完成（低优先级，可与 Phase 3 并行）
- [ ] 抓取日志管理页（内部工具，不阻塞用户功能）
- [ ] 错误处理全站补完（当前主流程已有 fallback，可渐进式补强）

---

## 🤖 Phase 3 · AI 深度接入（进行中）

- [x] 自动摘要（AI 生成客观摘要，已前移至 Phase 2 完成）

### UI 品牌重塑（2026-03-09 完成）
- [x] TopBar Logo：`NewsAnalyst` → `FinLens`，双色 Wordmark + slogan（桌面端）
- [x] 板块切换器标签：`American/Chinese` → `U.S. News/Chinese News`（英文模式），`英文资讯/中文资讯`（中文模式）

### AI 重要性评分（2026-03-10 完成）
- [x] `backend/app/services/scorer.py`：LLM 打分模块，预留 `user_context` 参数（B 接口占位）
- [x] `backend/app/services/ai/openai_processor.py`：prompt 扩展，新文章在现有调用中顺带输出 `importance_score`
- [x] `backend/scripts/backfill_scores.py`：对所有 `ai_score IS NULL` 的历史文章 LLM 打分（约 3431 篇，<$1）
- [x] 前端 NewsCard：`Relevance` 标签改为 `Impact` + 颜色梯度 + 分数数字

### Impact 排序 + Feed UX（2026-03-10 完成）
- [x] 后端 `articles.py`：新增 `?sort=impact`，`ORDER BY ai_score DESC NULLS LAST`，日期过滤始终保留
- [x] `NewsFeed.tsx`：sort 类型扩展为 `'latest' | 'popular' | 'impact'`
- [x] `HomeFeed.tsx`：新增 `sort` state + Latest ↔ ⚡Impact 切换按钮（desktop + mobile 两处）
- [x] Impact 模式性能修复：移除绕过日期过滤的逻辑，避免全表 3400+ 行扫描
- [x] Impact 模式 DateNavigator 修复：移除误加的 `pointer-events-none` / `disabled`，日期切换恢复可用
- [x] NewsCard Impact 条布局修复：卡片 `flex flex-col`，评分条始终固定底部，多行标题不错位

### Settings 按钮重设计（2026-03-10 完成）
- [x] 汉堡图标 ≡ → 齿轮图标（SVG）+ 文字标签
- [x] 文字标签接入 i18n：`t('title')`（settings 命名空间）

### 语言切换器重设计（2026-03-10 完成）
- [x] A/文 toggle → `LangDropdown` 可扩展下拉菜单组件
- [x] `LANGUAGES` 数组驱动，扩展语言只需追加一条记录，无需改组件
- [x] 按钮文字：`tS('language')`，随 locale 自动切换 "Language" / "语言"
- [x] 外部点击关闭：`useRef` + `document.addEventListener`

### 全站 i18n 补完（2026-03-10 完成）
- [x] Feed 层 5 处修复：板块切换标签、时间显示、搜索框占位、排序按钮、Settings 按钮
- [x] 新增 `feed` namespace key：`searchPlaceholder` / `sortLatest` / `sortImpact`
- [x] `timeAgo()` 函数重写为 hook-based（`useTranslations('feed')`），替换原始 60 行硬编码英文函数
- [x] 新增 `article` namespace（约 15 个 key）：覆盖文章详情页所有字符串
- [x] 新增 `auth` namespace（约 25 个 key）：覆盖登录/注册/忘记密码页所有字符串
- [x] `ShareButton.tsx`：接入 `useTranslations('article')`，"Share"/"Copied!" 翻译
- [x] `SaveButton.tsx`：接入 `useTranslations('article')`，"Save"/"Saved"/验证提示/重发邮件 全部翻译
- [x] `article/[id]/page.tsx`：Server Component 使用 `getTranslations('article'/'feed')`；`timeAgo` locale-aware；所有 `isZh ? '...' : '...'` 内联三元改为 `t('key')`
- [x] `login/page.tsx`：全页面硬编码 → `useTranslations('auth')`
- [x] `register/page.tsx`：同上，含注册成功页 + 错误提示
- [x] `forgot-password/page.tsx`：同上，邮件地址插值拆分 key 保留加粗样式

### NewsCard 摘要弹窗（2026-03-10 完成）
- [x] 移除卡片内联摘要文字（`<p line-clamp-3>`）
- [x] 标题取消截断（移除 `line-clamp-2`），完整展示
- [x] 移除 ZH 专属"查看中文摘要"内联展开区域
- [x] 统一新增底部"查看摘要"按钮（EN + ZH，有摘要时显示）
- [x] 摘要弹窗：`fixed inset-0 z-50`，`backdrop-blur-sm bg-black/40` 背景虚化
- [x] 弹窗内：完整标题 + 摘要全文 + "阅读全文"链接
- [x] ZH 模式：点击时如无缓存即 fetch 翻译，loading 态显示 spinning icon
- [x] 三种关闭方式：背景点击 / ✕ 按钮 / `Escape` 键
- [x] 新增 i18n key：`viewSummary` / `translating` / `noSummary` / `readFullArticle`

### 相关资讯标题翻译（2026-03-10 完成）
- [x] `article/[id]/page.tsx`：zh locale 下批量构建 `relatedTitleMap`（Map<id, title_zh>）
- [x] 优先读文章对象自带的 `title_zh`（DB 缓存，0 额外请求）
- [x] 未缓存时并发调 `getTranslation(r.id)`（Next.js fetch 缓存 24h）
- [x] 渲染改为 `relatedTitleMap.get(related.id) ?? related.title`

### 智能推荐（后续）
- [ ] 基于标签的智能推荐（Related Articles 雏形已有，待扩展）

---

## 🌏 Phase 4 · 中文板块（待启动）

- [x] 中文板块框架（BoardProvider + 板块切换器 UI + 空状态）已就绪
- [ ] 中文新闻源调研与接入（RSS fetcher 注册表已插件化，直接加源即可）
- [ ] i18n 中文界面翻译（next-intl 配置已就绪，填写 zh.json 即可）

---

_最后更新：2026-03-13（Turnstile CAPTCHA 修复 + 邮箱校验强化 + 未验证账号自动清除 + 配置诊断 + 注册重发邮件按钮）_
