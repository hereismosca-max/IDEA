# Dev Log

> 记录每次开发会话的主要工作内容、决策思路和遇到的问题。
> 格式：`## YYYY-MM-DD`，从最新到最旧排列。

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
