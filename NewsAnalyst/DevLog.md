# Dev Log

> 记录每次开发会话的主要工作内容、决策思路和遇到的问题。
> 格式：`## YYYY-MM-DD`，从最新到最旧排列。

---

## 2026-03-08 · Feed 质量优化 + 搜索 + 市场行情栏 + 板块切换

### 背景
v0.3.0 收尾阶段，本次会话完成了以下几块独立但相互关联的工作：调度器/Feed 可靠性修复、搜索功能、市场行情迷你卡片栏、板块切换器（取代语言切换）。

---

### 一、调度器 & Feed 可靠性修复

**问题描述**：03/08 当天新抓取的文章没有摘要；等了 10 分钟还是没有——原因是旧调度器间隔 6 小时。

**修复方案：**

**`backend/app/core/config.py`**
- `FETCH_INTERVAL_HOURS: int = 6` → `FETCH_INTERVAL_MINUTES: int = 5`

**`backend/app/services/scheduler.py`**
- `IntervalTrigger(hours=...)` → `IntervalTrigger(minutes=settings.FETCH_INTERVAL_MINUTES)`
- 在来源循环结束后新增"兜底补全"步骤：查询 `ai_summary IS NULL AND ai_processed_at IS NULL` 的文章，每次最多处理 20 篇，确保历史遗留/新抓但未 AI 处理的文章能被追上

**`backend/app/api/v1/routes/articles.py`**
- Feed 过滤条件从 `OR(ai_processed_at IS NULL, ai_summary IS NOT NULL)` 改为严格的 `ai_summary IS NOT NULL`
- 前者会把"未处理"的空卡片也显示出来，后者只显示已有摘要的文章

**`frontend/src/components/news/NewsCard.tsx`**
- 完全重写 `timeAgo()` 函数为精细格式：`X h Y min ago`、`X days Y h ago`、`X weeks Y days Z h ago`，以此类推直到年级别，所有零分量自动省略

---

### 二、搜索功能

**`backend/app/api/v1/routes/articles.py`**
- 新增 `search` 查询参数（`ILIKE %term%` 同时搜 `title` 和 `ai_summary`）
- 新增 `sort` 参数（`latest` / `popular`，popular 使用相关子查询 `SUM(ArticleVote.vote)` 按净票数排序）
- 搜索激活时忽略日期过滤，跨所有日期搜索

**`frontend/src/lib/api.ts`**
- `FetchArticlesParams` 新增 `search?: string` 和 `sort?: 'latest' | 'popular'`

**新建 `frontend/src/components/news/SearchBar.tsx`**
- 防抖 350ms 的文本输入框，左侧搜索图标，有内容时显示清空 ✕ 按钮
- 父组件清空时（`value === ''`）同步本地状态

**`frontend/src/components/news/DateNavigator.tsx`**
- 新增 `disabled?: boolean` prop，搜索激活时外层加 `opacity-40 pointer-events-none` 样式，视觉上提示日期导航已临时停用

**`frontend/src/components/news/NewsFeed.tsx`**
- props 新增 `search?: string`，`useEffect` 依赖数组加入 `search`
- 空状态文案根据是否在搜索分别展示："No results for X" vs "No articles for this date"

**`frontend/src/components/news/HomeFeed.tsx`**
- 三列 Flex 布局：`[flex-1 SearchBar] [flex-none DateNavigator] [flex-1 占位块]`
- `isSearching` 时 `dateForFeed = undefined`，同时给 DateNavigator 传 `disabled`
- Popular 排序短暂上线后因目前用户投票数极少而移除，按钮 UI 同步清理

---

### 三、市场行情迷你卡片栏（Market Ticker）

**`backend/requirements.txt`**
- 新增 `yfinance>=0.2.54`

**新建 `backend/app/api/v1/routes/market.py`**
- `GET /api/v1/market/snapshot`：返回 6 个指标（S&P 500 / NASDAQ / DJIA / VIX / 10Y Yield / Gold）
- 每个指标字段：`symbol` / `label` / `price` / `change` / `change_pct`
- **5 分钟内存缓存**（`threading.Lock` + 时间戳），避免频繁请求 Yahoo Finance
- 任何单个 ticker 失败时返回 `null` 占位，不影响其他指标

**`backend/app/main.py`**
- 注册 `market.router`，prefix = `/api/v1/market`

**`frontend/src/types/index.ts`**
- 新增 `MarketIndicator`、`MarketSnapshot` 接口

**`frontend/src/lib/api.ts`**
- 新增 `fetchMarketSnapshot(): Promise<MarketSnapshot>`

**新建 `frontend/src/components/layout/MarketTicker.tsx`**
- 位置：`HomeFeed` 中 MenuBar 上方（即 TopBar 与 MenuBar 之间）
- Mini Card 样式：上涨绿底/绿字，下跌红底/红字，无数据灰底
- 每张卡显示：标签、价格（千分位格式）、涨跌幅（▲/▼ 前缀）
- 首次加载骨架动画；**每 60 秒自动刷新**；单个 ticker 失败不影响其他；全部失败时不渲染（不破坏页面）

---

### 四、板块切换器（取代 EN/中文 语言切换）

**决策背景**：EN/中文 原本设计为 UI 语言切换，但实际上平台核心差异是内容来源（美国英文新闻 vs 中国中文新闻），与 UI 语言无关。改为"板块切换"更符合产品定位。

**新建 `frontend/src/providers/BoardProvider.tsx`**
- React Context，`board: 'en' | 'zh'`，默认 `'en'`（美国板块）
- 导出 `BoardProvider`（包裹组件）和 `useBoard()`（消费 hook）

**`frontend/src/app/[locale]/layout.tsx`**
- 用 `<BoardProvider>` 包裹 `<AuthProvider>` 内层（两层 Provider 共存）

**`frontend/src/components/layout/TopBar.tsx`**
- 彻底移除 `switchLocale` / `usePathname` / `useRouter` 逻辑
- 改为三列 Flex 布局：`[flex-1 Logo] [Center 板块切换器] [flex-1 用户区]`
- 板块切换器：两个 Pill 按钮（同 SortPicker 风格）
  - 美国板块激活时显示 `American | Chinese`
  - 中文板块激活时显示 `中文板块 | 英文板块`（双语翻转）
- 用 `useBoard()` 读写 board 状态

**`frontend/src/components/news/NewsFeed.tsx`**
- 新增 `language?: string` prop（默认 `'en'`）
- 传入 `fetchArticles({ language })`
- `useEffect` 依赖数组加入 `language`，板块切换立即触发重载
- 中文板块 + 无数据时显示专属空状态：`"暂无资讯"` + `"中文板块即将上线，敬请期待。"`

**`frontend/src/components/news/HomeFeed.tsx`**
- 引入 `useBoard()`，读取 `board` 传给 `<NewsFeed language={board} />`
- 引入 `<MarketTicker />` 放在 MenuBar 正上方

---

### 关键决策记录（第一轮）

| 决策 | 理由 |
|---|---|
| 调度器改为 5 分钟 | 保证新文章及时有摘要，网络/服务器压力可接受 |
| Feed 只显示 `ai_summary IS NOT NULL` | 消灭空卡片，用户看到的每篇都有内容 |
| 搜索激活时忽略日期 | 跨日期搜索比"只搜当天"更符合用户预期 |
| Popular 排序暂时移除 | 目前投票用户极少，Popular 和 Latest 结果几乎相同，显示出来反而产生困惑 |
| yfinance + 5 分钟内存缓存 | 免费、无需 API Key、足够实时；缓存避免每次请求都打 Yahoo Finance |
| 板块切换 vs 语言切换 | 用户关心"看哪个市场的新闻"而非"界面用哪种语言" |
| 双语 Pill 翻转 | 在中文板块下看到的是中文操作标签，交互语言和内容语言一致 |
| 中文板块先做框架不接源 | 架构就位，日后接中文新闻源只需加 backend Sources，前端零改动 |

---

### 五、滚动标题词条栏（Headline Ticker）

**`frontend/src/components/layout/MarketTicker.tsx`**（大改）
- 重构为左右两栏：`[mini cards flex-none] | [HeadlineTicker flex-1]`
- `HeadlineTicker` 子组件：拉取当前板块的文章，每 4.5 秒切换一条，fade+slide 动画（`opacity / translateY`，0.35s ease）
- 右上角显示来源名 + `X/N` 计数器
- 标题可点击跳转文章详情页
- 轮播索引超界自动归零，`board` 变化时立即重置

**前端每 15 秒刷新**（原 60 秒）— 改进行情卡片响应速度

---

### 六、Settings 设置菜单 + Smart Headlines + i18n（2026-03-08 第二轮）

#### 背景
用户需要：(1) 词条只播重要国际大事（而非随机 20 篇），(2) 在右上角加设置入口（账户信息 + 语言偏好）。

#### 6.1 Backend：用户 Profile 扩展

**`backend/app/models/user.py`**
- 新增 `bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)`
- 新增 `pronouns: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)`

**新建 `backend/alembic/versions/3a7f82c1d905_add_bio_and_pronouns_to_users.py`**
- `down_revision = '1e5967f26b22'`
- `upgrade`: `ADD COLUMN bio TEXT, ADD COLUMN pronouns VARCHAR(50)`
- `downgrade`: `DROP COLUMN pronouns, DROP COLUMN bio`

**`backend/app/schemas/user.py`**
- `UserResponse` 新增 `bio: Optional[str] = None` 和 `pronouns: Optional[str] = None`
- 新增 `UpdateProfileRequest`（全字段可选：`display_name / bio / pronouns / preferred_lang`）

**`backend/app/api/v1/routes/auth.py`**
- 新增 `PATCH /api/v1/auth/me`：局部更新 display_name / bio / pronouns / preferred_lang
- `display_name` 为空字符串时 400 报错
- `bio / pronouns` 空字符串写入 NULL（`str.strip() or None`）
- `preferred_lang` 只允许 `default | en | zh`，否则 400 报错

#### 6.2 Backend：Smart Headlines 端点

**`backend/app/api/v1/routes/articles.py`**
- 新增 `GET /api/v1/articles/headlines`（置于 `/saved` 之前，防止 FastAPI 路由匹配歧义）
- **优先级规则**：`ai_tags.scale IN ('global', 'national')` 且 `published_at >= NOW() - 7 days` 且 `ai_summary IS NOT NULL`，按 `published_at DESC` 取最多 `limit`（默认 5）篇
- **Fallback**：若优先级文章不足 `limit`，用最新文章补齐（排除已选 ID）
- 返回 `List[ArticleResponse]`

#### 6.3 Frontend：API 层扩展

**`frontend/src/lib/api.ts`**
- 新增 `UpdateProfilePayload` interface
- 新增 `updateProfile(payload): Promise<User>` → `PATCH /api/v1/auth/me`
- 新增 `fetchHeadlines(language, limit): Promise<Article[]>` → `GET /api/v1/articles/headlines`

**`frontend/src/types/index.ts`**
- `User` interface 新增 `bio?: string | null` 和 `pronouns?: string | null`

**`frontend/src/providers/AuthProvider.tsx`**
- 新增 `refreshUser(): Promise<void>` — 重新调用 `GET /me` 更新 user state
- 暴露至 `AuthContextType` 和 Provider value

#### 6.4 Frontend：SettingsMenu 组件（新建）

**`frontend/src/components/layout/SettingsMenu.tsx`**
- 仅登录时渲染（`if (!user) return null`）
- 汉堡图标（3 条横线 SVG）Toggle，点击外部关闭（`mousedown` event listener + `useRef`）
- **Account 区块**：
  - `display_name` input（可编辑，预填）
  - `email` input（readOnly，`tabIndex=-1`，灰色样式）
  - `bio` textarea（2 行，可选，预填）
  - `pronouns` input（可选，placeholder 来自 i18n）
  - Save 按钮：`saving / saved / error` 三态，2.5 秒后自动恢复 idle；成功后调用 `refreshUser()`
- **Language 区块**：
  - Default / English (US) / Chinese (Simplified) 三选一单选按钮（自定义 radio dot 样式）
  - 选中即调用 `updateProfile({ preferred_lang })` + `refreshUser()`
  - `en` → `router.push('/en')`；`zh` → `router.push('/zh')`；`default` → 不强制导航
  - 切换后关闭菜单

#### 6.5 Frontend：TopBar 更新

**`frontend/src/components/layout/TopBar.tsx`**
- 新增 `import SettingsMenu`、`import { useEffect }`、`import { useRouter } from 'next/navigation'`
- 已登录状态用户区块插入 `<SettingsMenu />` 夹在用户名与 Sign Out 之间
- **登录后 locale 同步**：`useEffect` 监听 `[user?.id, isLoading]`，若 `user.preferred_lang === 'en' && locale !== 'en'` → `router.push('/en')`；同理处理 zh；`'default'` 不导航
  - 用 `user?.id` 而非 `user` 对象作依赖，避免引用变化触发多余 navigation

#### 6.6 Frontend：MenuBar i18n

**`frontend/src/components/layout/MenuBar.tsx`**
- 引入 `useTranslations('menu')`，所有 section 标签改为 `t(slug)` 动态翻译
- `SECTION_SLUGS` 替代原 `SECTIONS` 数组，保留 `SECTIONS` 导出作向后兼容（无 label 字段）
- 切换 locale 后 MenuBar 自动翻译，无需手动维护多语言 label 数组

#### 6.7 Frontend：i18n 翻译文件

**`frontend/messages/en.json`**
- `menu.*`：去掉旧的 policy / stocks / commodities，改为 technology / energy（与后端 SECTION_FILTERS 对齐）
- 新增 `settings.*`：title / account / displayName / email / bio / pronouns / pronounsPlaceholder / save / saving / saved / saveError / language / langDefault / langEn / langZh

**`frontend/messages/zh.json`**
- 同步更新 `menu.*` 和 `settings.*`（中文翻译）

#### 6.8 Frontend：HeadlineTicker 改用 fetchHeadlines

**`frontend/src/components/layout/MarketTicker.tsx`**
- `HeadlineTicker` 改从 `fetchHeadlines(board, 5)` 获取数据（原 `fetchArticles({ page:1, page_size:20 })`）
- 词条现在优先展示 scale=global/national 的重要国际事件，fallback 到最新文章补足 5 条

---

### 关键决策记录（第二轮）

| 决策 | 理由 |
|---|---|
| Language setting 走 URL locale，Board 走 content language | 两者职责分离：locale = UI 语言，board = 内容来源。两个维度独立可控 |
| `preferred_lang` 值域：`default / en / zh` | `default` 表示随板块走，不写死语言；用户不登录永远是 default |
| Login 时 locale 同步用 `user?.id` 作 dep | 防止 user 对象每次 refreshUser 后引用变化触发多余 push |
| `bio` 空字符串写 NULL | 数据库层面区分"没填"（NULL）和"主动清空"（NULL），结果一样，语义更清晰 |
| Headlines endpoint 置于 /saved 之前 | FastAPI 路由按顺序匹配，字面路径必须先于参数化路径 `/{article_id}` |
| Fallback to recent when global/national < 5 | 保证 ticker 始终有内容，不因标签缺失而显示空白 |

### 当前状态（2026-03-08 第二轮结束）
- 全部 14 个文件改动已 commit 并 push（commit: `2c6ee2c`）
- Railway 会在 push 后自动部署（含 alembic upgrade head，新增 bio/pronouns 列）
- Vercel 会在 push 后自动部署前端
- Settings 菜单在 TopBar 右侧（仅登录可见），汉堡图标三条横线，点击展开
- HeadlineTicker 现在展示 global/national 重要事件（最多 5 条），数量不足时 fallback 到最新文章
- MenuBar 标签跟随 locale 自动翻译（切换语言后 Technology→科技 等即时生效）

---

## 2026-02-28 · 邮箱验证 + 忘记密码功能上线 · v0.3.0 准备

### 背景
v0.2.0 上线后，用户希望：① 确保注册邮箱是真实存在的，防止随意填写假邮箱；② 新增忘记密码功能，让用户通过邮件找回账号。

**策略：软性强制（Soft Enforcement）**
- 注册/登录不受任何限制，降低注册摩擦
- 投票等核心互动操作需先验证邮箱（后端返回 `403 email_not_verified`）
- 邮件服务选用 **Resend**（现代 API，免费 3000 封/月，`pip install resend`）
- 本地无 API key 时优雅降级：记录 warning，跳过发送，注册照常成功

### 后端变更

**数据库（User 模型新增 5 个字段）**
- `email_verified`（bool, default=False）
- `email_verification_token` / `email_verification_expires_at`（24 小时有效）
- `password_reset_token` / `password_reset_expires_at`（1 小时有效）
- Alembic 迁移：`add_email_verification_and_password_reset_fields_to_users`
  - 注意：autogenerate 时产生了多余的 `drop_index` 操作（手动建表遗留 index 未被追踪），手动删除后再运行 `upgrade head`

**新增 `app/core/email.py`**
- `_send()` 内部函数：无 API key → warning + 跳过；有 key → Resend API 发送；失败则 re-raise，不静默吞掉错误
- `send_verification_email()` + `send_password_reset_email()`，HTML 模板邮件

**`app/core/config.py` 新增三个设置**
- `RESEND_API_KEY`、`EMAIL_FROM`（默认 `onboarding@resend.dev`）、`FRONTEND_BASE_URL`

**`auth.py` 新增 4 个端点**
- `POST /register`（更新）：生成验证 token，异步发送验证邮件（try/except 包裹，邮件失败不阻断注册）
- `POST /verify-email`（公开）：验证 token，设置 `email_verified=True`，清除 token
- `POST /resend-verification`（需认证）：重新生成 token 并重发
- `POST /forgot-password`（公开）：生成重置 token，**始终返回 200**（防止攻击者枚举邮箱）
- `POST /reset-password`（公开）：验证重置 token，更新密码 hash，清除 token

**`votes.py` 更新**
- 投票前检查 `current_user.email_verified`，否则 `raise HTTPException(403, "email_not_verified")`

### 前端变更

**`src/lib/api.ts`**：新增 `verifyEmail / resendVerification / forgotPassword / resetPassword` 四个函数；改进错误处理，从 `detail` 字段提取后端错误信息

**`src/types/index.ts`**：`User` 新增 `email_verified: boolean`；新增 `MessageResponse` 接口

**新增页面**
- `verify-email/page.tsx`：读取 URL `?token`，自动调用 API，三态展示（loading → 成功/失败）
- `forgot-password/page.tsx`：邮箱输入 + 提交后始终显示安全成功提示
- `reset-password/page.tsx`：新密码 + 确认密码，验证 token，成功后跳转登录

**更新页面**
- `register/page.tsx`：注册成功后展示"请查收邮件"提示，不再直接跳转首页
- `login/page.tsx`：密码行旁边新增"Forgot password?"链接

**`VoteButtons.tsx`**：捕获 `email_not_verified` 错误时展示 amber 色内联提示框，含"Resend email"按钮和"Already verified?"链接

### 遇到的问题与调试

**问题：发验证邮件后收不到**
- 表现：API 调用成功（Resend 返回 email id），但收件箱没有邮件
- 诊断：添加临时 `/debug/email-config` 端点，确认 Railway 上 `RESEND_API_KEY` 已正确配置（`re_A9o...` 前缀），排除 key 未设置的可能
- 根本原因：`onboarding@resend.dev` 是 Resend 的共享测试发件地址，**只能向 Resend 账号注册时使用的邮箱发送**，发给其他地址时 Resend 静默丢弃（不报错）
- 另外发现：`newsanalyst.com` 域名早在 1999 年已被他人注册，无法配置 DNS，因此无法用 `@newsanalyst.com` 作发件域名

**解决方案（分阶段）**
- 测试阶段：用 Resend 账号邮箱注册 NewsAnalyst，可正常收到所有邮件，功能验证完整
- 上线前：购买新域名 → Resend 控制台添加域名并配置 DNS（DKIM + SPF + DMARC）→ 更新 Railway `EMAIL_FROM` 环境变量，**无需改任何代码**

### 关键决策记录
- **软性强制**：不强制"验证后才能登录"，降低注册摩擦；投票/互动需验证，有足够激励驱动用户完成验证
- **邮件失败不阻断注册**：邮件服务故障不导致注册失败，用户可通过"重新发送"补救
- **忘记密码始终返回 200**：防止攻击者通过请求结果判断某邮箱是否已注册（用户枚举攻击）
- **临时 debug 端点**：确认配置后立即删除，不留在生产代码中

### 当前状态
- 邮箱验证全流程（注册 → 邮件 → 验证页 → 投票解锁）使用 Resend 账号邮箱验证通过
- 忘记/重置密码全流程验证通过
- 投票未验证提示在前端正常显示
- Railway + Vercel 通过 git push 自动重部署完成

---

## 2026-02-28 · Bug 修复：passlib 兼容性 + Alembic 空迁移

### 背景
v0.2.0 上线后发现两个生产问题：
1. 文章详情页崩溃（`UndefinedTable: article_votes` 报错），投票功能完全不可用
2. 用户登录 / 注册报错（`ValueError: password cannot be longer than 72 bytes`）

### 修复 1：Alembic 空迁移（article_votes 表缺失）

**根本原因**：`alembic revision --autogenerate` 生成了只有 `pass` 的空迁移，因为 `ArticleVote` 模型没有在 `app/models/__init__.py` 中 import，Alembic 扫描不到该模型，误以为没有变化。

**修复步骤**：
- `app/models/__init__.py` 补充 `from app.models.vote import ArticleVote`
- 手动在 Supabase 通过 SQL 直接建 `article_votes` 表（紧急修复生产）
- 将已生成的空迁移文件手动填入正确的 `op.create_table` DDL
- 删除 autogenerate 产生的多余 `drop_index` 操作后执行 `alembic upgrade head`

### 修复 2：passlib + bcrypt 5.0.0 不兼容

**根本原因**：`passlib 1.7.4` 与 bcrypt 4.0+ 已有兼容问题，bcrypt 5.0.0 彻底报错（`detect_wrap_bug` 中抛出 `ValueError`）。passlib 项目已多年未维护。

**修复方式**：
- `requirements.txt`：移除 `passlib[bcrypt]`，改为 `bcrypt>=4.0.0`
- `app/core/security.py`：用 `bcrypt.hashpw` / `bcrypt.checkpw` 直接替换 `CryptContext`，API 接口不变，调用方无感知

### 关键决策记录
- **直接用 bcrypt 而非换 passlib 版本**：passlib 有历史负担且不再维护，直接调用 bcrypt 更轻量、更稳定
- **Alembic 经验教训**：每次新增 model 文件后，必须在 `models/__init__.py` 中 import，否则 autogenerate 检测不到，生成空迁移

### 当前状态
- 文章详情页投票功能恢复正常
- 注册 / 登录全链路恢复正常
- Railway + Vercel 通过 git push 自动重部署完成

---

## 2026-02-27 · 用户认证系统 + 文章投票功能上线 · Phase 1 Auth + Phase 2 Voting

### 背景
用户希望在文章详情页添加 ▲/▼ 投票按钮，记录用户赞同/反对并统计结果。投票需要绑定真实用户账号，因此先建立完整的认证系统（Phase 1），再在此基础上实现投票（Phase 2）。

### Phase 1 — 认证系统

**后端：**
- `security.py` 新增 `get_current_user`（无效 token 返回 401）和 `get_optional_user`（无效 token 返回 None）两个 FastAPI 依赖函数，使用 `HTTPBearer` 从 Authorization header 提取 token
- `auth.py` 新增 `GET /api/v1/auth/me` 端点，返回当前已登录用户的完整 profile

**前端：**
- 新建 `providers/AuthProvider.tsx`：React Context，提供 `login / logout / register` 方法，挂载时自动从 `localStorage` 读取 token → 调用 `/me` 恢复会话；token 过期时自动清除
- `lib/api.ts` 更新：`request()` 函数自动在所有请求中注入 `Authorization: Bearer <token>` 头；新增 `getCurrentUser()` 函数
- `app/[locale]/layout.tsx` 用 `<AuthProvider>` 包裹整个应用
- `TopBar.tsx` 更新为动态认证 UI：已登录显示 `display_name` + `Sign Out` 按钮，未登录显示 `Sign In` 链接；session 检查期间显示骨架 pulse 动画
- 新建 `app/[locale]/login/page.tsx`：邮箱 + 密码登录表单，含错误提示和跳转注册的链接
- 新建 `app/[locale]/register/page.tsx`：显示名 + 邮箱 + 密码（最少 8 位）注册表单，注册成功后自动登录并跳转首页

### Phase 2 — 文章投票

**后端：**
- 新建 `models/vote.py`：`ArticleVote` 表，字段 `user_id / article_id / vote(+1/-1)`，`UNIQUE(user_id, article_id)` 约束防止重复投票
- 运行 `alembic revision --autogenerate` + `upgrade head`，在 Supabase 上创建 `article_votes` 表
- 新建 `api/v1/routes/votes.py`：
  - `POST /api/v1/articles/{id}/vote`（需认证）：toggle 逻辑——同方向再次投 = 撤票，反方向 = 切换，新投票 = 插入
  - `GET /api/v1/articles/{id}/votes`（认证可选）：返回 `upvotes / downvotes / user_vote`
- `articles.py` 单篇文章接口（`GET /articles/{id}`）新增 vote count 查询，返回 `upvotes / downvotes / user_vote`
- `ArticleResponse` schema 新增 `upvotes: int = 0 / downvotes: int = 0 / user_vote: Optional[int] = None`
- `main.py` 注册 votes router

**前端：**
- 新建 `components/article/VoteButtons.tsx`：Client Component，▲ 绿色激活 / ▼ 红色激活；乐观更新（先改 UI 再等 API 确认，失败则回滚）；未登录点击跳转 `/login`
- `app/[locale]/article/[id]/page.tsx` 改为左右两栏布局：左栏 sticky `<VoteButtons>`，右栏文章正文；vote 初始值从 Server Component 服务端直接获取（无首屏请求）
- `types/index.ts` 新增 `VoteCounts` 接口；`Article` 接口新增可选 vote 字段

### 遇到的问题与修复
- SQLAlchemy 循环导入：`get_current_user` 需要 `User` 模型，但 `security.py` 在应用启动早期就被加载。解决：在函数体内部 local import `from app.models.user import User`
- `[locale]` 路径含方括号：`mkdir` 需要加引号，`git add` 同理

### 关键决策记录
- **乐观更新（Optimistic UI）**：投票按钮点击后立即更新计数，API 响应后用服务端真实值同步（而非等 API 再更新），保证交互零延迟感
- **Server Component 传初始 votes**：文章详情页是 Server Component，直接在服务端把 `upvotes/downvotes/user_vote` 塞入 ArticleResponse，VoteButtons 收到 `initialXxx` props 后无需再发请求，首屏无额外 API 调用
- **两栏布局**：vote 按钮放左侧固定列（sticky），视觉上类似 Hacker News / Reddit 风格，比内联更自然
- **`get_optional_user` 处理匿名访问**：文章详情和投票计数页不要求登录，用 `get_optional_user` 拿到 None 时也能正常返回，不返回 401

### 当前状态
- 注册 / 登录 / 登出全链路通畅
- TopBar 动态展示用户名
- 文章详情页左侧 ▲/▼ 按钮，乐观更新，数值同步
- Railway + Vercel 已通过 git push 触发自动重部署

---

## 2026-02-27 · 文章详情页上线 · 内部路由 + AI 标签全展示

### 本次完成
- `NewsCard.tsx` 改为 `'use client'`，使用 `useLocale()` + `next/link` 将点击链接从外部原文 URL 改为内部路由 `/[locale]/article/[id]`
- `lib/api.ts` 新增 `fetchArticle(id)` 函数
- `types/index.ts` 新增 `AiTags` 接口（`entities / locations / sectors / topics / scale`），修复 `ai_tags` 类型（原为 `string[] | null`，实际是 dict）
- 新建 `app/[locale]/article/[id]/page.tsx`（Server Component）：
  - `generateMetadata()` 动态设置 SEO 标题和描述
  - `revalidate: 300`（5 分钟缓存）
  - 展示：来源名 + 发布时间、大标题、sector 蓝色标签、topic 灰色标签、entities/locations/scale 元数据行、完整 AI 摘要、底部原文链接卡片

### 关键决策记录
- **内部路由而非外跳**：用户点卡片后进入站内详情页，可展示完整 AI 分析结果；直接跳外站则 AI 分析无处展示，体验割裂
- **Server Component**：详情页数据为只读，无需 client-side state，Server Component 更快（无 JS bundle 膨胀）+ SEO 友好

---

## 2026-02-27 · AI 摘要生成上线 · trafilatura 全文抓取 + GPT-4o-mini 摘要

### 背景
Yahoo Finance RSS 条目几乎不包含文章正文（`content_snippet` 为空或极短），导致新闻卡片无内容显示。用户希望 AI 读取原文后生成客观摘要展示在卡片上。

### 本次完成
- 新建 `app/services/fetcher/content_fetcher.py`：httpx + trafilatura 从文章 URL 抓取并提取正文（最多 4000 字符），任何失败均静默返回 None
- 扩展 `OpenAIProcessor.process()`：新增 `url` 参数，优先用全文，回退到 RSS snippet；单次 API 调用同时返回 `summary`（2-3句客观摘要）+ `tags`（原结构化标签）
- `max_tokens` 从 300 增至 500 以容纳摘要输出
- 更新 `BaseAIProcessor` 和 `PassthroughProcessor` 签名，新增 `url` 可选参数
- 更新 `scheduler.py` Phase 2：传入 `url=item.url`，将 `ai_result.summary` 和 `ai_result.tags` 一起保存
- 新增 `scripts/backfill_ai_summaries.py`：对历史无摘要文章补全，支持 `--limit` 和 `--dry-run`
- 新增依赖：`trafilatura>=1.12.0` + `lxml>=5.0.0`

### 关键决策记录
- **单次 API 调用（summary + tags 合并）**：节省 50% API 费用和延迟，且同一次"阅读"生成的摘要和标签语义一致
- **trafilatura 而非 newspaper3k**：trafilatura 在金融新闻网站提取质量更高，内置 lxml 解析器，失败率更低
- **前端零改动**：`NewsCard` 早在 Phase 1 就实现了 `ai_summary ?? content_snippet` 回退，这次功能上线前端完全不用动

### 当前状态
- 新抓取文章自动全文抓取 + GPT 摘要
- 历史文章 backfill 后台运行中（`/tmp/backfill_summaries.log`）

---

## 2026-02-27 · MenuBar 分类筛选上线 · AI 标签驱动的板块联动

### 本次完成
- 分析 337 篇已打标文章的标签分布，数据驱动确定 5 个板块方案
  - Technology 29.1%、earnings 20.5%、Finance 9.5%、Crypto 独立板块
- 后端 `articles.py` 新增 SECTION_FILTERS：基于 JSONB `@>` 运算符的 PostgreSQL 查询
  - `_s(sector)` / `_t(topic)` / `_scale(scale)` 三个辅助函数
  - 5 个板块：markets / technology / economy / energy / crypto
  - 未知 slug 返回空结果（`filter(text("false"))`），不报 400
- 重构 `MenuBar.tsx`：从固定渲染改为接受 props（`activeCategory` + `onCategoryChange`）
  - 板块定义更新为 All / Markets / Technology / Economy / Energy / Crypto
- 重构 `HomeFeed.tsx`：新增 `selectedCategory` 状态，内部渲染 `<MenuBar>` 实现状态共享
- 更新 `NewsFeed.tsx`：新增 `category` prop，切换板块时重置并从第 1 页重新加载
- 从 `layout.tsx` 移除 `<MenuBar />`：MenuBar 迁入 HomeFeed 层，避免跨布局边界传 state

### 关键决策记录
- **数据驱动板块划分**：先分析真实标签分布，再定板块，而非主观拍脑袋
- **状态下移到 HomeFeed**：MenuBar 必须和 NewsFeed 共享 category 状态；layout.tsx 是 Server Component，无法持有 state；因此将两者都收进 HomeFeed（Client Component）统一管理
- **`category !== 'all'` 过滤**：前端不传 `category_slug` 给 "all"，后端收不到此参数时不加过滤，返回全部文章，逻辑简洁

### 当前状态
- MenuBar 六个板块（All / Markets / Technology / Economy / Energy / Crypto）全部联动正常
- 切换板块 + 切换日期双维度过滤，互相独立，同时生效
- Railway 后端、Vercel 前端已部署，等待本次 push 自动触发重部署

---

## 2026-02-27 · 日期导航功能上线 · DateNavigator + 按日过滤

### 本次完成
- 后端 `GET /articles` 新增 `?date=YYYY-MM-DD` 参数，按 UTC 日历天过滤文章
- 新建 `DateNavigator` 组件：← 上一天 / 日期标签 / → 下一天箭头导航
- 日期标签点击弹出 react-day-picker v9 日历，可选年月日，未来日期禁用
- 点击日历外部自动关闭弹窗
- `NewsFeed` 接受 `date` prop，切换日期时清空重载，到底显示"End of articles for this day"
- 无该日文章时显示"No articles found for this date"友好提示
- `HomeFeed` 作为 client wrapper 管理日期状态，`page.tsx` 保持 Server Component 身份

### 遇到的问题与修复
- `git add` 对含方括号的路径（`[locale]`）需要加引号，否则 shell glob 展开失败

### 关键决策记录
- **UTC 日期过滤**：`published_at` 存储为 UTC，前端用 `toUTCDateString()` 转换保持一致性；时区问题留 Phase 3 处理
- **每天到底就停**：`has_next: false` 时不显示"Load more"，自然截止；底部加分割线提示用户已到当天末尾
- **不可选未来**：日历和右箭头双重限制，体验一致

---

## 2026-02-27 · AI 标签提取上线 · OpenAIProcessor (GPT-4o-mini)

### 本次完成
- 实现 `OpenAIProcessor`：调用 GPT-4o-mini 对每篇文章做结构化事实提取
- 标签结构：`entities`（公司/人物）/ `locations`（地区）/ `sectors`（行业）/ `topics`（事件类型）/ `scale`（影响范围）
- 更新 `processor.py` 智能切换：有 `OPENAI_API_KEY` 用 OpenAI，无则降级为 Passthrough
- 更新 `AIProcessingResult.tags` 类型从 `List[str]` 改为 `dict`（匹配 JSONB 存储）
- 更新 `scheduler.py`：INSERT 时同时记录 `ai_processed_at` 时间戳
- 更新 `ArticleResponse` schema：`ai_tags` 类型从 `list` 改为 `dict`
- 新增 `scripts/backfill_ai_tags.py`：支持 `--limit` 和 `--dry-run` 的批量补标签脚本
- 对数据库现有 313 篇文章执行 backfill，全部成功（0 失败）
- 添加 `openai>=1.0.0` 依赖

### 遇到的问题与修复
- **JSONB + psycopg3 的 null 陷阱**：`None` 存入 JSONB 列时被 psycopg3 编码为 JSON `'null'`（而非 SQL `NULL`），导致 `Article.ai_tags.is_(None)` 过滤返回 0 条。修复：改用 `text("ai_tags IS NULL OR ai_tags::text = 'null'")` 同时覆盖两种情况。

### 关键决策记录
- **AI 只做事实提取，不做分析**：prompt 明确禁止市场预测和趋势判断，保证标签客观中立
- **受控词汇表**：sectors 和 topics 使用固定词汇，防止 AI 自由发挥导致标签混乱
- **`temperature=0` + JSON mode**：确保输出确定性和可解析性
- **graceful fallback**：API 调用失败时返回空结果，文章照常保存，不中断抓取流程
- **板块定义推迟**：先看全部文章的标签分布，再确定 MenuBar 的板块划分——这样板块是数据驱动的，而不是拍脑袋定的

### 当前状态
- 所有新抓取的文章都会自动经过 AI 打标签
- 现有 313 篇历史文章已补全标签
- 待办：Railway 环境变量加上 `OPENAI_API_KEY`；分析标签分布后确定板块方案；实现 MenuBar 分类联动

---

## 2026-02-27 · 线上部署完成 · Railway + Vercel 上线

### 本次完成
- Railway 部署后端成功：添加所有环境变量后服务正常启动（ACTIVE · Online）
- 生成 Railway 公开域名：`https://idea-production.up.railway.app` → Port 8000
- Vercel 部署前端成功：Root Directory = `NewsAnalyst/frontend`，`NEXT_PUBLIC_API_URL` 指向 Railway
- 前端域名：`https://idea-brown.vercel.app`
- 修复 CORS 配置：`"https://*.vercel.app"` 通配符字符串在 FastAPI CORSMiddleware 中无效，改用 `allow_origin_regex=r"https://.*\.vercel\.app"` + 显式列出正式域名

### 遇到的问题与修复
- **Railway 环境变量未配置**：首次部署 crashed，`DATABASE_URL` 为空导致 SQLAlchemy 报错。在 Variables 标签页补全所有环境变量后自动重部署成功。
- **Railway 服务未暴露**：部署成功后显示 "Unexposed service"，在 Settings → Networking 生成 Domain（Port 8000）后解决。
- **CORS 通配符无效**：FastAPI/Starlette 的 `allow_origins` 只支持精确匹配或 `"*"`，不支持 `"https://*.vercel.app"` 这类 glob 模式。改用 `allow_origin_regex` 参数解决，同时保持 `allow_credentials=True`。

### 关键决策记录
- **`allow_origin_regex` 处理 Vercel 预览 URL**：Vercel 每次 PR 预览都会生成新的子域名（如 `idea-git-feature-xxx.vercel.app`），用正则 `https://.*\.vercel\.app` 一次性覆盖所有预览域名，避免每次都要手动加白名单。

### 下一步
- 推送 CORS 修复到 GitHub（Railway 自动重部署）
- 端到端验证线上前端能正常加载新闻文章

---

## 2026-02-26 · 本地联调完成 · 后端全链路打通

### 本次完成
- 修复 `email-validator` 缺失：pydantic `EmailStr` 需要此包，加入 `requirements.txt`（改为 `pydantic[email]>=2.10.0`）
- 修复 macOS Python SSL 证书：feedparser 请求 HTTPS RSS 时 SSL 验证失败，运行 `Install Certificates.command` 解决
- 替换失效新闻来源：Reuters（`feeds.reuters.com` 2023年停用）→ Financial Times；AP News（rsshub 403）→ BBC Business；同步更新 DB、`registry.py`、`seed.py`
- 修复调度器重复插入 Bug：改用 `INSERT ... ON CONFLICT DO NOTHING`（PostgreSQL `pg_insert`），替代应用层 select-then-insert
- 本地成功启动后端（uvicorn port 8000）+ 前端（Next.js port 3000）
- 抓取验证：5个来源共 164 篇文章入库，API 正常响应

### 遇到的问题与修复
- **email-validator 缺失** → `pydantic[email]>=2.10.0` + `email-validator>=2.0.0`
- **macOS SSL 证书** → `Install Certificates.command`
- **Reuters / AP News RSS 失效** → Financial Times + BBC Business
- **调度器 PendingRollbackError** → `pg_insert().on_conflict_do_nothing()`

### 关键决策记录
- **`ON CONFLICT DO NOTHING` 替代 exists 检查**：DB 层原子操作，避免应用层竞态条件

### 下一步
- 验证前端渲染新闻卡片（http://localhost:3000）
- 验证 API 文档（http://localhost:8000/docs）

---

## 2026-02-26 · 数据库上线 · 种子数据写入

### 本次完成
- 创建 Supabase Pro 项目，获取 DATABASE_URL
- 解决 Python 3.13 依赖问题：`psycopg2-binary` 无预编译轮子，改用 `psycopg[binary]>=3.2.0`（psycopg3），URL 前缀同步改为 `postgresql+psycopg://`
- 解决 pydantic 兼容问题：所有依赖从固定版本改为 `>=` 最低版本约束
- 补全遗漏文件 `alembic/script.py.mako`（项目骨架阶段漏写）
- 执行 `alembic revision --autogenerate -m "init"`，成功检测并生成 7 张表的迁移脚本
- 执行 `alembic upgrade head`，在 Supabase 上完成建表
- 执行 `python scripts/seed.py`，写入 5 个新闻来源 + 7 个分类标签

### 遇到的问题
- **Supabase 直连地址（`db.xxx.supabase.co`）IPv6-only**：本机网络（Visitor WiFi）的 DPI 策略屏蔽了 PostgreSQL 协议数据，TCP 握手通但数据包超时。切换到普通网络后，改用 Session Pooler URL（`aws-1-us-west-1.pooler.supabase.com:5432`）解决。
- **`alembic/script.py.mako` 缺失**：骨架阶段只创建了目录结构，未写入 Alembic 迁移模板文件，已补全。

### 关键决策记录
- **切换至 Session Pooler 连接串**：Supabase 直连地址（`db.xxx.supabase.co`）为 IPv6-only，Session Pooler（`pooler.supabase.com`）支持 IPv4，兼容性更好，后续 Railway 部署也推荐使用此地址。

### 下一步
- 填写 `frontend/.env.local`（NEXT_PUBLIC_API_URL=http://localhost:8000）
- 安装前端依赖（`npm install`）
- 本地启动后端（`uvicorn app.main:app --reload`）
- 本地启动前端（`npm run dev`）
- 验证 API 文档与新闻抓取

---

## 2026-02-26 · 项目启动 Project Kickoff

### 本次完成
- 完成产品方向定义：经济金融新闻聚合与分析平台（英文板块先行）
- 确定目标用户与核心价值主张（反标题党、客观摘要、辅助投资决策）
- 完成新闻来源选型：Reuters / CNBC / AP News / Yahoo Finance / MarketWatch
- 确定技术栈：Next.js (frontend) + Python FastAPI (backend) + PostgreSQL (Supabase Pro) + Railway
- 完成数据库7张核心表的结构设计
- 完成项目目录结构设计
- 制定4个Phase的开发路线图（预计3-5个月）
- 创建GitHub仓库
- 初始化所有项目文档（ProductContent / ProjectArchitecture / DatabaseStructure / CODEBASE / TODO / DevLog / EditionLog）

### 关键决策记录
- **选Python FastAPI而非Node.js后端**：主要原因是Phase 3必然接入AI，Python的AI生态（OpenAI SDK、LangChain等）远优于JS生态，从一开始就选对技术栈，避免后期迁移成本。
- **Supabase Pro（$25/月）而非免费版**：免费版项目闲置7天会自动暂停，对一个有定时任务的生产项目来说不可接受。Pro版自带每日自动备份，值得。
- **AI层使用占位模式（Passthrough）**：AI接入是Phase 3的事，但AI处理层的接口从第一天就定义好、代码结构中就有这个模块的位置。等到真正接AI的时候，只替换实现，不动其他代码。
- **用户系统第一天就设计进数据库**：后期添加用户系统需要改表结构，风险极高。即便Phase 1的UI上不做登录页，数据库里Users表也必须从第一天就存在。

### 下一步
- 开始 Phase 1：创建项目目录结构，初始化前后端工程

---

## 2026-02-26 · 项目目录结构与骨架代码完成

### 本次完成

**后端（backend/）完整骨架写入：**
- `requirements.txt` — 所有 Python 依赖锁定版本
- `Dockerfile` — Railway 部署配置
- `alembic.ini` + `alembic/env.py` — 数据库迁移工具，DATABASE_URL 从环境变量动态读取
- `app/core/config.py` — pydantic-settings 读取 .env，lru_cache 单例
- `app/core/database.py` — SQLAlchemy 引擎 + Session + Base + get_db 依赖
- `app/core/security.py` — bcrypt 密码哈希 + JWT 生成/解码
- `app/main.py` — FastAPI 应用入口，CORS，路由注册，lifespan 管理调度器
- `app/models/` — 7 张表的 SQLAlchemy ORM 模型
- `app/schemas/` — Pydantic 请求/响应格式
- `app/api/v1/routes/` — auth / articles / sources / categories 路由
- `app/services/fetcher/` — 插件式 RSS 抓取器（抽象类 + 实现 + 注册表）
- `app/services/ai/` — AI 占位层（接口 + PassthroughProcessor）
- `app/services/scheduler.py` — APScheduler 6 小时调度 + 启动时立即执行
- `app/utils/logger.py` — 统一日志格式

**前端（frontend/）完整骨架写入：**
- 工具链配置（package.json / next.config.js / tailwind / tsconfig / postcss）
- next-intl 配置（middleware + i18n.ts + messages/en.json + zh.json）
- 布局文件（root layout + [locale]/layout.tsx）
- 核心组件（TopBar / MenuBar / NewsCard / NewsFeed）
- 工具库（lib/api.ts + lib/auth.ts）
- TypeScript 类型定义（types/index.ts）

**根目录：**
- `.gitignore` + `README.md`

### 关键决策记录
- **Alembic env.py 动态读 DATABASE_URL**：不写死在 alembic.ini，而是在 env.py 里从 settings 读取，开发/生产环境完全隔离
- **scheduler 启动时立即执行一次**：`start_scheduler()` 末尾调用 `run_fetch_job()`，应用一启动就有数据，不用等 6 小时
- **RSSFetcher 本地导入**：`run_fetch_job()` 里用 local import，避免 startup 时循环导入
- **NewsCard fallback**：优先显示 `ai_summary`，没有则显示 `content_snippet`，Phase 3 接 AI 后自动升级，前端不需要改代码

### 遇到的问题
- `frontend/src/lib/api.ts` 误引入了不存在的 `UserResponse` 类型，已修复为只从 `@/types` 导入存在的类型

### 下一步
- 创建 Supabase Pro 项目，获取 DATABASE_URL
- 安装依赖，填写 .env，执行 Alembic 迁移建表
- 插入种子数据（新闻来源 + 分类标签）
- 本地启动联调，验证新闻能正常抓取并在前端展示

---
