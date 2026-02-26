# Dev Log

> 记录每次开发会话的主要工作内容、决策思路和遇到的问题。
> 格式：`## YYYY-MM-DD`，从最新到最旧排列。

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
