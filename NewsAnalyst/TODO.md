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

### 日期导航
- [x] 后端 `/articles?date=YYYY-MM-DD` 按 UTC 日期过滤
- [x] DateNavigator 组件（← 日期标签 → 箭头导航）
- [x] 日历弹窗（react-day-picker v9，未来日期禁用）
- [x] NewsFeed 按日切换，加载到底停止，显示"End of articles for this day"

### 待完成
- [ ] 搜索功能
- [ ] 前端登录 / 注册页面
- [ ] 用户收藏新闻功能
- [ ] 抓取日志管理页
- [ ] 移动端响应式适配
- [ ] 错误处理与友好提示

---

## 🤖 Phase 3 · AI 深度接入（待启动）

- [ ] 自动摘要（AI 生成客观摘要替换 content_snippet）
- [ ] 重要性评分（填入 ai_score）
- [ ] 基于标签的智能推荐

---

## 🌏 Phase 4 · 中文板块（待启动）

- [ ] 中文新闻源调研与接入
- [ ] i18n中文翻译
- [ ] 语言切换功能
- [ ] 中文板块UI

---

_最后更新：2026-02-27（Phase 2 进行中：AI 标签系统 + 日期导航 + MenuBar 分类筛选完成）_
