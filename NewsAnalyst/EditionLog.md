# Edition Log

> 记录每个版本的功能变化。每完成一个阶段（Phase）或发布一个重要更新时在此记录。
> 版本号格式：`v主版本.次版本.补丁` （Major.Minor.Patch）

---

## 版本规划 Version Roadmap

| 版本 | 对应Phase | 预期内容 | 状态 |
|------|-----------|---------|------|
| v0.1.0 | Phase 1 | 地基：新闻抓取 + 基础展示 + 用户认证后端 | ✅ 已发布 |
| v0.2.0 | Phase 2 | 基础功能：登录UI + 收藏 + 筛选 + 搜索 | 📋 待启动 |
| v0.3.0 | Phase 3 | AI接入：自动摘要 + 分类 + 评分 | 📋 待启动 |
| v1.0.0 | Phase 4 | 完整产品：双语支持 + 中文板块上线 | 📋 待启动 |

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

_最后更新：2026-02-27（v0.1.0 发布）_
