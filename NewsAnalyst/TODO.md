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

---

## 🔨 Phase 1 · 地基（当前阶段）

### 项目初始化
- [ ] 创建项目目录结构（frontend/ + backend/）
- [ ] 初始化 Next.js 前端项目（含TypeScript + Tailwind + next-intl）
- [ ] 初始化 Python FastAPI 后端项目
- [ ] 配置 `.env.example` 环境变量模板
- [ ] 配置 `.gitignore`

### 数据库
- [ ] 创建 Supabase Pro 项目
- [ ] 配置 Alembic 数据库迁移工具
- [ ] 编写所有表的迁移脚本并执行
- [ ] 插入初始数据（5个新闻来源 + 7个分类标签）

### 后端
- [ ] 数据库连接配置（core/database.py）
- [ ] 环境变量配置（core/config.py）
- [ ] SQLAlchemy 数据库模型（models/）
- [ ] Pydantic 数据格式定义（schemas/）
- [ ] 用户认证系统（注册 / 登录 / JWT）
- [ ] RSS抓取器基类（services/fetcher/base.py）
- [ ] RSS抓取器实现（services/fetcher/rss.py）
- [ ] 新闻来源注册表（services/fetcher/registry.py）
- [ ] AI占位层接口（services/ai/base.py + processor.py）
- [ ] APScheduler定时任务（services/scheduler.py）
- [ ] 日志系统（utils/logger.py）
- [ ] API路由：新闻列表 / 新闻详情（api/v1/routes/articles.py）
- [ ] API路由：用户认证（api/v1/routes/auth.py）
- [ ] API路由：分类标签（api/v1/routes/categories.py）

### 前端
- [ ] i18n 路由结构配置（[locale]/）
- [ ] 翻译文本初始化（messages/en.json + zh.json）
- [ ] TopBar 组件
- [ ] MenuBar 组件（分类tabs）
- [ ] NewsCard 组件
- [ ] NewsFeed 组件（含分页）
- [ ] 首页组装（page.tsx）
- [ ] API请求封装（lib/api.ts）

### 联调与部署
- [ ] 本地前后端联调跑通
- [ ] 部署后端至 Railway
- [ ] 部署前端至 Vercel
- [ ] 线上环境验证（新闻能正常抓取并展示）

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

_最后更新：2026-02-26_
