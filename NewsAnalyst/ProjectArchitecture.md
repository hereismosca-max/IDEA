# Project Architecture

## 系统架构总览 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        用户浏览器                         │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              前端层  Frontend (Vercel)                    │
│                    Next.js + TypeScript                   │
│            TopBar │ MenuBar │ NewsCards │ i18n            │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API /api/v1/...
┌─────────────────────▼───────────────────────────────────┐
│              后端层  Backend (Railway)                    │
│                    Python FastAPI                         │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth模块   │  │  新闻API模块  │  │   调度器模块    │  │
│  │  用户认证   │  │  查询/筛选   │  │  每6小时抓取    │  │
│  └─────────────┘  └──────────────┘  └───────┬────────┘  │
│                                              │           │
│  ┌───────────────────────────────┐           │           │
│  │        AI处理层（占位）        │◄──────────┘           │
│  │  现在：直接透传                │                       │
│  │  未来：摘要/评分/分类          │                       │
│  └───────────────────────────────┘                       │
│                                                          │
│  ┌───────────────────────────────┐                       │
│  │        新闻抓取模块            │                       │
│  │  Financial Times │ CNBC       │                       │
│  │  BBC Business │ Yahoo Finance │                       │
│  │  MarketWatch                  │                       │
│  └───────────────────────────────┘                       │
└─────────────────────┬───────────────────────────────────┘
                      │ SQLAlchemy ORM
┌─────────────────────▼───────────────────────────────────┐
│              数据层  Database (Supabase Pro)              │
│                      PostgreSQL                           │
│   Users │ Articles │ Sources │ Categories │ Logs         │
└─────────────────────────────────────────────────────────┘
```

---

## 技术栈 Tech Stack

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14+ + TypeScript | i18n支持、SEO好、部署简单 |
| 前端样式 | Tailwind CSS | 快速构建整洁UI |
| 后端框架 | Python FastAPI | 现代、快速、AI生态最佳入口 |
| 数据库 | PostgreSQL | 稳定、关系型 |
| ORM | SQLAlchemy 2.0+ | Python标准数据库工具 |
| 数据迁移 | Alembic | 数据库版本控制 |
| RSS抓取 | feedparser + httpx | 成熟的RSS解析库 |
| 定时任务 | APScheduler | 轻量可靠的Python调度器 |
| 用户认证 | JWT + bcrypt | 行业标准，安全无状态 |
| 国际化 | next-intl | Next.js最佳i18n方案 |
| 前端部署 | Vercel | 免费、自动CI/CD |
| 后端部署 | Railway | ~$10/月、稳定不休眠 |
| 数据库托管 | Supabase Pro | $25/月、自动备份、永不暂停 |

---

## 项目目录结构 Directory Structure

```
news-aggregator/                    ← GitHub仓库根目录
│
├── frontend/                       ← Next.js前端
│   ├── src/
│   │   ├── app/
│   │   │   └── [locale]/           ← i18n路由（en / zh）
│   │   │       ├── page.tsx        ← 首页
│   │   │       └── layout.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TopBar.tsx      ← 顶栏（Logo+语言切换+用户）
│   │   │   │   └── MenuBar.tsx     ← 横向分类菜单
│   │   │   ├── news/
│   │   │   │   ├── NewsCard.tsx    ← 单条新闻卡片
│   │   │   │   └── NewsFeed.tsx    ← 新闻流容器
│   │   │   └── ui/                 ← 通用UI组件
│   │   ├── lib/
│   │   │   ├── api.ts              ← 统一的后端API请求封装
│   │   │   └── auth.ts             ← 前端认证工具
│   │   └── types/                  ← TypeScript类型定义
│   ├── messages/
│   │   ├── en.json                 ← 英文翻译文本
│   │   └── zh.json                 ← 中文翻译文本（预留）
│   ├── next.config.js
│   └── package.json
│
├── backend/                        ← Python FastAPI后端
│   ├── app/
│   │   ├── main.py                 ← 应用入口
│   │   ├── api/
│   │   │   └── v1/                 ← API版本控制
│   │   │       └── routes/
│   │   │           ├── auth.py     ← 登录/注册接口
│   │   │           ├── articles.py ← 新闻查询接口
│   │   │           ├── sources.py  ← 来源管理接口
│   │   │           └── categories.py
│   │   ├── core/
│   │   │   ├── config.py           ← 环境变量配置
│   │   │   ├── security.py         ← JWT + 密码加密
│   │   │   └── database.py         ← 数据库连接
│   │   ├── models/                 ← SQLAlchemy数据库模型
│   │   │   ├── user.py
│   │   │   ├── article.py
│   │   │   ├── source.py
│   │   │   └── category.py
│   │   ├── schemas/                ← 接口数据格式定义
│   │   │   ├── user.py
│   │   │   ├── article.py
│   │   │   └── auth.py
│   │   ├── services/
│   │   │   ├── fetcher/            ← 新闻抓取模块（插件式）
│   │   │   │   ├── base.py         ← 抓取器基类
│   │   │   │   ├── rss.py          ← RSS抓取实现
│   │   │   │   └── registry.py     ← 来源注册表
│   │   │   ├── ai/                 ← AI处理层（当前为占位）
│   │   │   │   ├── base.py         ← AI接口定义（抽象类）
│   │   │   │   └── processor.py    ← 当前透传，未来接AI
│   │   │   └── scheduler.py        ← APScheduler定时任务
│   │   └── utils/
│   │       └── logger.py           ← 统一日志配置
│   ├── alembic/                    ← 数据库迁移文件
│   ├── tests/                      ← 单元测试
│   ├── .env.example                ← 环境变量模板
│   ├── requirements.txt
│   └── Dockerfile
│
├── .gitignore
└── README.md
```

---

## 开发阶段规划 Development Roadmap

### Phase 1 · 地基 Foundation ✅ 已完成（2026-02-27）
> 目标：项目可以跑起来，能抓到新闻并在页面上展示

**后端**
- [x] 项目初始化，目录结构搭建
- [x] 数据库全部表结构创建（含迁移脚本）
- [x] 用户认证系统（注册 / 登录 / JWT）
- [x] RSS抓取器（5个来源，插件式）
- [x] APScheduler定时调度（每6小时）
- [x] 基础API接口（获取新闻列表、单篇详情）
- [x] AI占位层接口搭建

**前端**
- [x] Next.js项目初始化（含i18n配置）
- [x] TopBar组件
- [x] MenuBar组件（分类tabs，placeholder）
- [x] NewsCard组件
- [x] NewsFeed组件（分页加载）
- [x] 前后端本地联调跑通

**部署**
- [x] 部署后端至 Railway（https://idea-production.up.railway.app）
- [x] 部署前端至 Vercel（https://www.finlens.io）
- [x] 配置 Supabase Pro 数据库
- [x] 线上环境联调验证

---

### Phase 2 · 基础功能完善 Core Features（第4-6周）
> 目标：产品可以日常使用

- [ ] 前端登录 / 注册页面
- [ ] 用户收藏新闻功能
- [ ] 分类筛选（菜单栏真实联动数据）
- [ ] 搜索功能
- [ ] 分页 / 无限滚动
- [ ] 抓取日志管理页（自用）
- [ ] 移动端响应式适配
- [ ] 错误处理与友好提示

---

### Phase 3 · AI接入 AI Integration（第2-3个月）
> 目标：新闻有客观摘要、自动分类、重要性评分

- [ ] 选定AI服务商（OpenAI / Claude API）
- [ ] 替换AI占位层为真实实现
- [ ] 自动生成客观摘要（替换content_snippet）
- [ ] 自动分类打标签（填入ai_tags）
- [ ] 新闻重要性评分（填入ai_score）
- [ ] 菜单栏分类与AI标签真实联动
- [ ] 摘要展示UI调整

---

### Phase 4 · 中文板块 Chinese Module（第3-5个月）
> 目标：完整双语产品上线

- [ ] 调研并接入中文财经新闻源
- [ ] 完善i18n中文翻译文本
- [ ] 中文板块独立新闻流
- [ ] 语言切换功能前后端联通
- [ ] 整体产品体验打磨

---

## 核心设计原则 Design Principles

1. **模块化**：每个功能独立，改一处不影响其他
2. **接口优先**：AI层、抓取器层面向接口编程，实现可替换
3. **版本化API**：`/api/v1/`，未来升级不破坏现有功能
4. **环境隔离**：开发/生产配置分离，密钥永远不进Git
5. **日志先行**：每个关键操作都有记录，出问题能查
6. **地基优先**：先把数据库、认证、抓取器做稳，再堆功能
