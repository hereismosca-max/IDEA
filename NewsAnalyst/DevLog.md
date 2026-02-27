# Dev Log

> 记录每次开发会话的主要工作内容、决策思路和遇到的问题。
> 格式：`## YYYY-MM-DD`，从最新到最旧排列。

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
