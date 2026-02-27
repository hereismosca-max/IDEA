# Codebase Guide

> 本文档帮助开发者（或AI工具）快速理解项目代码结构、各模块职责和核心设计思路。
> This document helps developers (or AI tools) quickly understand the project's code structure, module responsibilities, and core design decisions.

---

## 项目结构速览 Quick Structure Overview

```
NewsAnalyst/
├── frontend/        ← Next.js 前端（用户界面）
├── backend/         ← Python FastAPI 后端（逻辑 + 数据 + 定时任务）
├── CODEBASE.md      ← 本文件：代码导读
├── DatabaseStructure.md  ← 数据库表结构详细说明
├── ProjectArchitecture.md ← 系统架构与开发规划
├── ProductContent.md     ← 产品定义与目标
├── TODO.md          ← 任务进度追踪
├── DevLog.md        ← 开发日志
└── EditionLog.md    ← 版本更新记录
```

---

## 前端 Frontend (`/frontend`)

### 技术：Next.js 14 + TypeScript + Tailwind CSS + next-intl

### 目录说明

```
frontend/src/
├── app/
│   └── [locale]/           ← 所有页面都在语言路由下（en / zh）
│       ├── layout.tsx       ← 全局布局（TopBar + MenuBar 包裹在这里）
│       └── page.tsx         ← 首页（新闻流主页面）
│
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx       ← 顶部栏：Logo（左）+ 语言切换（右）+ 用户入口（右）
│   │   └── MenuBar.tsx      ← 横向分类菜单：All / Markets / Economy / ...
│   ├── news/
│   │   ├── NewsCard.tsx     ← 单条新闻卡片组件（标题/来源/时间/摘要/标签）
│   │   └── NewsFeed.tsx     ← 新闻流容器（负责请求数据 + 渲染卡片列表 + 分页）
│   └── ui/                  ← 通用基础UI组件（按钮、标签、加载动画等）
│
├── lib/
│   ├── api.ts               ← 所有后端API请求的统一封装（fetch wrapper）
│   └── auth.ts              ← 前端认证工具（Token存储、用户状态管理）
│
└── types/                   ← TypeScript类型定义（Article, User, Category等）

frontend/messages/
├── en.json                  ← 英文UI文本（所有界面文字都在这里，不硬编码）
└── zh.json                  ← 中文UI文本（预留，Phase 4填入）
```

### 重要设计说明
- **i18n路由**：所有页面路径为 `/en/...` 或 `/zh/...`，通过 `[locale]` 动态路由实现
- **API调用**：前端只通过 `lib/api.ts` 调用后端，不在组件里直接写 fetch
- **类型安全**：所有数据结构在 `types/` 中定义，前后端保持一致

---

## 后端 Backend (`/backend`)

### 技术：Python FastAPI + SQLAlchemy + Alembic + APScheduler

### 目录说明

```
backend/app/
├── main.py                  ← FastAPI应用入口，注册所有路由，启动调度器
│
├── api/v1/routes/           ← 所有HTTP接口（按资源分文件）
│   ├── auth.py              ← POST /auth/register, POST /auth/login
│   ├── articles.py          ← GET /articles, GET /articles/{id}
│   ├── sources.py           ← GET /sources（管理用）
│   └── categories.py        ← GET /categories
│
├── core/                    ← 核心配置，不含业务逻辑
│   ├── config.py            ← 读取.env环境变量（数据库URL、JWT密钥等）
│   ├── security.py          ← JWT生成/验证、bcrypt密码加密
│   └── database.py          ← SQLAlchemy引擎和Session配置
│
├── models/                  ← 数据库表的Python类定义（SQLAlchemy ORM）
│   ├── user.py              ← Users表
│   ├── article.py           ← Articles表
│   ├── source.py            ← Sources表
│   └── category.py          ← Categories + ArticleCategories表
│
├── schemas/                 ← API请求/响应的数据格式（Pydantic）
│   ├── auth.py              ← 登录/注册的请求体和响应体格式
│   ├── user.py              ← 用户数据格式
│   └── article.py           ← 新闻数据格式
│
├── services/
│   ├── fetcher/             ← 新闻抓取模块（插件式设计）
│   │   ├── base.py          ← 抽象基类 BaseFetcher，定义 fetch() 接口
│   │   ├── rss.py           ← RSSFetcher，实现RSS抓取逻辑
│   │   └── registry.py      ← 来源注册表（新增来源只改这个文件）
│   │
│   ├── ai/                  ← AI处理层（当前为占位，未来替换实现）
│   │   ├── base.py          ← 抽象基类 BaseAIProcessor，定义接口
│   │   └── processor.py     ← PassthroughProcessor（现在直接返回原文）
│   │                           未来替换为 OpenAIProcessor / ClaudeProcessor
│   │
│   └── scheduler.py         ← APScheduler配置，注册每6小时抓取任务
│
└── utils/
    └── logger.py            ← 统一日志格式配置（文件 + 控制台输出）
```

### 重要设计说明

**API版本控制**
所有接口路径以 `/api/v1/` 开头。未来需要破坏性更改时，新建 `/api/v2/` 而不是修改现有接口，保证向后兼容。

**插件式抓取器**
`fetcher/registry.py` 维护一个来源列表，每个来源对应一个配置（名称、RSS URL、语言等）。调度器遍历这个列表，为每个来源实例化 `RSSFetcher` 并调用 `fetch()`。**新增新闻来源只需在 registry.py 里加一行配置，不需要改其他代码。**

**AI占位层**
`ai/base.py` 定义了 `BaseAIProcessor` 抽象类，规定了 `summarize()` / `tag()` / `score()` 等方法接口。当前 `processor.py` 实现的 `PassthroughProcessor` 什么都不做，直接返回原始内容。**等到Phase 3接入AI时，只需新建一个 `OpenAIProcessor` 继承 `BaseAIProcessor`，在 `main.py` 里切换一行即可，其余代码零修改。**

**环境变量**
所有配置（数据库连接URL、JWT密钥、API密钥等）通过 `.env` 文件注入，绝对不硬编码在代码里。`.env` 文件在 `.gitignore` 中，不会提交到GitHub。`.env.example` 是模板，展示需要哪些变量但不含真实值。

---

## 数据库 Database

详见 `DatabaseStructure.md`。

数据库操作通过 SQLAlchemy ORM 进行，直接写 SQL 的情况应尽量避免。表结构变更必须通过 Alembic 迁移脚本完成，不允许直接在数据库里手动改表。

---

## API接口约定 API Conventions

- **方法**：GET（查询）/ POST（创建）/ PUT（更新）/ DELETE（删除）
- **认证**：需要登录的接口，Header 中携带 `Authorization: Bearer <token>`
- **响应格式**：统一返回 JSON
- **错误码**：遵循HTTP标准（200成功 / 400请求错误 / 401未认证 / 404未找到 / 500服务器错误）

---

## 环境变量说明 Environment Variables

```
# 数据库（使用 psycopg3，注意前缀为 postgresql+psycopg://）
DATABASE_URL=postgresql+psycopg://user:password@host:port/dbname?sslmode=require

# JWT认证
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080  # 7天

# 应用配置
APP_ENV=development  # development / production
APP_PORT=8000

# AI（Phase 3填入）
OPENAI_API_KEY=
```

---

_最后更新：2026-02-27（v0.1.0 发布，更新 psycopg3 连接串说明）_
