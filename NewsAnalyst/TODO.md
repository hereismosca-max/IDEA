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

## 🔨 Phase 1 · 地基（当前阶段）

### ⬇️ 下一步：验证与部署
- [x] 填写 `frontend/.env.local`（NEXT_PUBLIC_API_URL=http://localhost:8000）
- [x] 安装前端依赖（`npm install`）
- [x] 本地启动后端（`uvicorn app.main:app --reload`）— 164篇文章抓取成功
- [x] 本地启动前端（`npm run dev`）
- [x] 验证后端 API 文档（http://localhost:8000/docs）
- [x] 验证新闻抓取任务正常运行（5来源 164篇文章入库）
- [x] 验证前端能正常渲染新闻卡片 ✅

### 部署
- [ ] 部署后端至 Railway（配置环境变量）
- [ ] 部署前端至 Vercel（配置 NEXT_PUBLIC_API_URL）
- [ ] 线上端到端验证

---

## 📋 Phase 2 · 基础功能完善（待启动）

- [ ] 前端登录 / 注册页面
- [ ] 用户收藏新闻功能
- [ ] 分类筛选联动
- [ ] 搜索功能
- [ ] 无限滚动 / 分页
- [ ] 抓取日志管理页
- [ ] 移动端响应式适配
- [ ] 错误处理与友好提示

---

## 🤖 Phase 3 · AI接入（待启动）

- [ ] 选定AI服务商
- [ ] 替换AI占位层
- [ ] 自动摘要
- [ ] 自动分类标签
- [ ] 重要性评分

---

## 🌏 Phase 4 · 中文板块（待启动）

- [ ] 中文新闻源调研与接入
- [ ] i18n中文翻译
- [ ] 语言切换功能
- [ ] 中文板块UI

---

_最后更新：2026-02-26（数据库上线，种子数据写入完成）_
