# Edition Log

> 记录每个版本的功能变化。每完成一个阶段（Phase）或发布一个重要更新时在此记录。
> 版本号格式：`v主版本.次版本.补丁` （Major.Minor.Patch）

---

## 版本规划 Version Roadmap

| 版本 | 对应Phase | 预期内容 | 状态 |
|------|-----------|---------|------|
| v0.1.0 | Phase 1 | 地基：新闻抓取 + 基础展示 + 用户认证后端 | ✅ 已发布 |
| v0.2.0 | Phase 2 | AI分析 + 日期导航 + 分类筛选 + 用户认证 + 文章投票 | ✅ 已发布 |
| v0.3.0 | Phase 2+ | 邮箱验证 + 忘记密码 + 收藏 + 文章详情增强 + Feed 质量优化 | 🔨 进行中 |
| v1.0.0 | Phase 3+4 | AI 重要性评分 + 智能推荐 + 中文板块 | 📋 待启动 |

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

## v0.2.0 · 核心功能版本 — 2026-02-27

**线上地址**
- 前端：https://idea-brown.vercel.app
- 后端 API：https://idea-production.up.railway.app

**本次交付**

**AI 分析层**
- trafilatura + httpx 抓取文章全文，GPT-4o-mini 单次调用同时生成摘要（2-3 句客观中立）+ 结构化标签
- 标签结构：`entities`（公司/人物）/ `locations`（地区）/ `sectors`（行业）/ `topics`（事件类型）/ `scale`（影响范围）
- 历史文章 backfill 脚本补全所有 `ai_summary` 和 `ai_tags`

**内容导航**
- 日期导航栏（← 日期标签 → 箭头 + 日历弹窗），按 UTC 日期筛选文章
- MenuBar 6 板块真实联动（All / Markets / Technology / Economy / Energy / Crypto），基于 PostgreSQL JSONB `@>` 查询

**文章详情页**
- 内部路由 `/[locale]/article/[id]`（Server Component，SEO generateMetadata + 5 min revalidate）
- 全面展示 AI 分析：sector/topic 标签、entities/locations/scale 元数据、完整 AI 摘要、原文链接卡片

**用户认证系统**
- 后端：`GET /api/v1/auth/me` 端点；`get_current_user` / `get_optional_user` FastAPI 依赖
- 前端：AuthProvider Context（login / logout / register / 会话自动恢复）
- 登录页 + 注册页（表单验证 + 错误提示）
- TopBar 动态：登录后显示用户名 + Sign Out，未登录显示 Sign In 链接

**文章投票**
- `article_votes` 表（`UNIQUE(user_id, article_id)`，`vote ±1`）
- toggle 投票逻辑（同方向再投 = 撤票，反方向 = 切换）
- 文章详情页左栏 sticky ▲/▼ 按钮，乐观更新，首屏无额外请求
- 未登录点击自动跳转 `/login`

**关键技术决策**
- AI 摘要 + 标签合并为单次 API 调用（节省 50% 成本和延迟）
- 投票初始值在 Server Component 服务端获取并通过 props 传入，首屏零请求
- `get_optional_user` 模式处理公开端点，无需强制登录

**已知限制（v0.3.0 解决）**
- 暂无搜索功能
- 暂无用户收藏功能
- 移动端响应式未完整适配

---

## v0.3.0 · 进行中 — 2026-02-28 起

**线上地址**
- 前端：https://www.finlens.io（旧：https://idea-brown.vercel.app，仍可访问）
- 后端 API：https://idea-production.up.railway.app

**已完成（部分交付）**

**Bug 修复**
- passlib 替换为 bcrypt 直接调用，解决 bcrypt 5.0.0 兼容问题
- 修复 Alembic 空迁移导致的 `article_votes` 表缺失（根因：`ArticleVote` 未在 `models/__init__.py` import）

**邮箱验证系统**
- 注册后自动发送验证邮件（Resend API，邮件失败不阻断注册）
- `POST /verify-email`：Token 验证，设置 `email_verified=True`
- `POST /resend-verification`：重新发送验证邮件（需登录）
- 软性强制策略：登录不受限，投票等核心操作需先验证邮箱
- 前端：注册成功 → "请查收邮件"提示页；`/verify-email` 验证落地页（三态）
- `VoteButtons`：未验证时展示 amber 提示框 + 一键重发邮件

**忘记密码 / 重置密码**
- `POST /forgot-password`（公开）：生成重置 token，始终返回 200（防邮箱枚举）
- `POST /reset-password`（公开）：验证 token，更新密码，清除 token（1 小时有效）
- 前端：`/forgot-password` 表单页；`/reset-password` 新密码页
- 登录页新增"Forgot password?"快捷入口

**关键技术说明（邮件）**
- 邮件服务：Resend（`pip install resend`，免费 3000 封/月）
- 测试阶段使用 `onboarding@resend.dev` 作为发件人，**只能向 Resend 账号注册邮箱发送**
- 生产上线前需购买域名并在 Resend 控制台完成 DNS 验证（DKIM + SPF + DMARC），再更新 `EMAIL_FROM` 环境变量，无需改代码

**用户收藏功能**
- `POST/GET /api/v1/articles/{id}/save` — toggle + 状态查询
- `GET /api/v1/articles/saved` — 收藏列表（分页，按 saved_at DESC）
- `SaveButton` 组件：乐观更新，未验证邮箱提示，详情页侧边栏 + NewsCard 右上角双入口
- `/saved` 收藏列表页，空状态引导，Load more 分页
- TopBar 登录后显示 "Saved" 链接

**文章详情页增强**
- 后端新增 `GET /api/v1/articles/{id}/related`：基于 PostgreSQL JSONB `@>` 查询，匹配相同 sector 或 topic 的文章，最多返回 5 篇，按 `published_at DESC` 排序
- 前端文章详情页改为 `Promise.all` 并行请求（article + related），消除串行 waterfall
- 底部"Related Articles"区块：有相关文章时显示，无匹配标签时自动隐藏
- `ShareButton` 组件：点击直接写入剪贴板（`navigator.clipboard.writeText`），2 秒 "Copied!" 状态反馈，不调用 Web Share API（避免 iOS 弹出原生分享面板）

**Feed 质量与 AI 准确性优化（2026-03-08）**

*背景：发现 Railway 调度器在 OPENAI_API_KEY 未生效期间（Period of inactivity）抓取了约 2000 篇文章但未打标签/摘要，同时原 AI Prompt 存在叙述性总结而非纯数据提取的问题。*

- **AI Prompt 重写**：角色定义从"信息提取者"改为"数据提取器"，明确要求只提取数字、百分比、具体事件，禁止解读和叙述性总结，以确保摘要的客观性和数据准确性
- **付费墙过滤机制**：
  - `openai_processor.py`：content < 150 字符判定为付费墙/内容不可达，直接跳过 AI 调用（节省 OpenAI 成本），返回空结果
  - `scheduler.py`：无论 AI 是否成功，处理后都写入 `ai_processed_at`，区分"未处理"和"处理过但无内容"两种状态
  - `backfill_ai_summaries.py`：同步逻辑，失败时也写入 `ai_processed_at`
- **Feed 过滤**：articles API 新增条件 `OR(ai_processed_at IS NULL, ai_summary IS NOT NULL)`，付费墙文章（有处理时间戳但无摘要）不出现在 feed 中
- **Related articles 过滤**：仅推荐有真实摘要（`ai_summary IS NOT NULL`）的文章，不推荐付费墙文章
- **大规模 backfill**：本地运行 `backfill_ai_summaries.py`，补全约 2000 篇无摘要文章（2026-03-08 执行中，预计当天完成）

**关键技术说明（AI 过滤）**
- PostgreSQL JSONB 列存储 Python `None` 时为 `'null'::jsonb`（JSON null），而非 SQL NULL——两者语义不同，过滤条件需区分 `IS NULL`（SQL null）和 `= 'null'::jsonb`（JSON null）
- `ai_processed_at` 字段承担双重职责：(1) 记录处理时间，(2) 作为"是否曾尝试 AI 处理"的布尔标志，配合 `ai_summary` 共同决定文章可见性

**搜索功能**
- 搜索框（防抖 350ms，搜索激活时日期导航自动变灰不可用）
- 后端 `ILIKE` 同时搜 `title` + `ai_summary`，搜索时自动跨日期
- 空状态文案根据搜索/非搜索分别展示

**调度器与 Feed 可靠性**
- 调度器间隔从 6 小时缩短至 5 分钟，新文章几分钟内即有摘要
- 新增调度器"兜底补全"：每次运行后处理最多 20 篇无摘要文章（处理历史遗留/一次性失败的文章）
- Feed 过滤改为严格的 `ai_summary IS NOT NULL`，彻底消灭空卡片
- NewsCard 时间显示改为精细格式（`X h Y min ago` / `X days Y h ago` 等）

**市场行情迷你卡片栏**
- 位置：TopBar 与 MenuBar 之间
- 展示 6 个指标：S&P 500 / NASDAQ / DJIA / VIX / 10Y Yield / Gold
- 来源：Yahoo Finance（yfinance），后端 5 分钟缓存
- 前端每 60 秒自动刷新；上涨绿底、下跌红底；骨架动画加载态

**板块切换器（取代 EN/中文 语言开关）**
- TopBar 改为三列布局：`[Logo] [板块切换] [用户]`，切换器居中
- 美国板块激活：显示 `American | Chinese`
- 中文板块激活：标签双语翻转 → `中文板块 | 英文板块`
- 切换立即触发 `language` 参数更新，Feed 重新加载对应语言的文章
- 中文板块当前显示"暂无资讯"占位（框架已就绪，待接入中文新闻源）

**滚动标题词条栏（Headline Ticker）**
- MarketTicker 行情栏右侧新增词条轮播区：展示重要文章标题，每 4.5 秒切换一条
- fade+slide 入场动画、来源名 + X/N 计数器、标题可点击跳转详情页
- 前端刷新从 60s 降至 15s

**Settings 菜单（2026-03-08 第二轮）**
- 右上角汉堡图标（仅登录可见），点击展开/关闭设置面板
- **Account** 区块：显示名称（可编辑）、邮箱（只读）、Bio 简介、Pronouns 称谓，Save 按钮（三态反馈）
- **Language** 区块：Default（跟随板块）/ English (US) / Chinese (Simplified) 单选；切换后保存到后端并跳转对应 URL locale

**Smart Headlines**
- 新增 `GET /api/v1/articles/headlines` 端点：优先展示 `ai_tags.scale = global/national` 且 7 天内的重要事件（最多 5 条）
- 数量不足时 fallback 到最新文章补足，保证词条栏始终有内容

**用户 Profile 扩展**
- User 表新增 `bio`（Text）和 `pronouns`（String 50）字段
- 新增 `PATCH /api/v1/auth/me`：局部更新 display_name / bio / pronouns / preferred_lang
- `preferred_lang` 合法值：`default | en | zh`；登录后自动将偏好语言同步到 URL locale

**MenuBar i18n**
- 所有分类标签改为 next-intl 翻译，切换语言后 Tab 标签即时生效（Technology→科技 等）

**全站 i18n 补完 + SettingsMenu 重设计（2026-03-09）**
- Sign In / Saved / Today / Yesterday 全部接入 next-intl 翻译
- DateNavigator 日期格式随 locale 切换（zh-CN / en-US）
- SettingsMenu 彻底重写为 list-style 导航（Account / Language / Notifications / Display / Sign Out）
- Language 选项简化为 EN / 中文（移除 Default），以 Badge 显示当前语言

**中文翻译功能（2026-03-09）**
- 新增 `GET /articles/{id}/translate?lang=zh` 端点（GPT-4o-mini，JSON 模式，一次调用翻译 title + summary）
- 翻译结果缓存在 DB（`title_zh` / `ai_summary_zh` 列，通过 migration `b2f94e1c7a30` 添加）
- 卡片列表：zh locale 下自动 background-fetch 标题翻译（英文立即显示，中文到达后更新）
- 文章详情：zh locale 下服务端 `Promise.all` 并行拉取翻译
- Headline Ticker：zh locale 下并发翻译 5 条词条标题，翻译到达后即时更新

**⚠️ 生产事故修复（2026-03-09）**
- 三轮连锁故障：ORM 新列 → articles 全部 500 → Dockerfile `&&` → 全站 502 → `;` 未生效 → 仍 502
- 根因：SQLAlchemy ORM 映射列必须与 DB Schema 同步；`alembic upgrade head` 在 Railway 上挂起；`&&` 阻断 uvicorn
- 最终修复：Dockerfile CMD 恢复为原始 `["uvicorn", ...]`，翻译列改用 raw SQL + try/except 访问（DB 有列则缓存，无列则跳过，零停机迁移）
- 详见 DevLog 2026-03-09 完整复盘

**翻译 DB 缓存上线（2026-03-09）**
- Railway 手动执行 alembic migration `b2f94e1c7a30`，正式添加 `title_zh` / `ai_summary_zh` 列
- 翻译缓存生效：第一次请求调用 OpenAI（~2-5s），后续请求直接读 DB（~170ms）
- `config.py` 加 `extra="ignore"`，修复 Railway 平台 env vars 注入导致 pydantic 验证失败的问题

**UX 可靠性修复（2026-03-09）**
- **日期刷新持久化**：使用 sessionStorage 保存选中日期；F5 刷新保留当前日期，关闭标签页后自动重置为今天
- **竞态条件修复**：快速切换日期时旧请求结果不再覆盖新请求（`reqIdRef` 单调递增计数器）
- **本地时区日期导航**（根本修复）：日期系统从 UTC 日历改为用户本地时区日历
  - 后端新增 `date_from` / `date_to` ISO 8601 UTC 时间戳参数，允许前端传入本地日期的精确 UTC 边界
  - 前端 `toLocalDayRange()` 计算"本地零点 → UTC ISO"和"本地下一个零点 → UTC ISO"
  - PST（UTC-8）用户本地 3月8日显示"Today · Mar 8"；CST（UTC+8）用户本地 3月9日显示"Today · Mar 9"
  - 夏令时（DST）由 JS `new Date(y, m, d)` 在本地时区自动处理，无需手动维护时区规则

**域名上线（2026-03-09）**
- 购买 finlens.io（Namecheap，$34.98/年）；finlens.io 301 重定向至 www.finlens.io
- Vercel 双域名配置（Valid Configuration）；Namecheap A + CNAME 记录写入
- 后端 CORS 新增 `https://finlens.io` 和 `https://www.finlens.io`（commit `0adb98d`）
- 邮件品牌由 "NewsAnalyst" 改为 "FinLens"；config 默认值更新为 finlens.io 发件地址

**邮件生产化（2026-03-09 完成）**
- Resend 验证 finlens.io 域名（DKIM + SPF + DMARC TXT 记录，Namecheap DNS 添加）
- Railway 环境变量更新：`EMAIL_FROM=FinLens <noreply@finlens.io>`，`FRONTEND_BASE_URL=https://www.finlens.io`
- 验证邮件 / 密码重置邮件已可发送至任意用户邮箱（此前仅限 Resend 账号邮箱）
- 注：新域名初期可能进入垃圾箱，属正常现象；页面已提示用户 "Check your spam folder"，信誉随发信量自然累积

**移动端响应式适配（2026-03-09 完成）**
- 文章详情页侧边栏移动端变为底部水平行（`flex-col-reverse md:flex-row`）
- MarketTicker 移动端隐藏市场指标卡，HeadlineTicker 占满全宽
- HomeFeed 导航栏移动端竖向堆叠：SearchBar 全宽 + DateNavigator 居中
- TopBar 用户名超长截断；MenuBar 右侧渐变提示可滑动

**品牌重塑（2026-03-09）**
- Logo：`NewsAnalyst` → `FinLens`，slogan "Your scope to see the world"（桌面端显示）
- Wordmark 双色：`Fin` 深灰 + `Lens` 蓝色，突出"镜头"隐喻
- 板块切换器：`American/Chinese` → `U.S. News / Chinese News`（英文模式全英文，中文模式全中文）

**AI 重要性评分（2026-03-10 完成）**
- scorer.py：LLM 打分模块，GPT-4o-mini，投资者视角 1-100 分，预留 user_context 接口（Phase B 个性化）
- openai_processor.py prompt 扩展：新文章在同一次 API 调用中顺带输出 importance_score，零额外成本
- backfill_scores.py：3457 篇历史文章全部打分，0 errors，耗时约 55 分钟，成本 <$1
- 分数分布健康：Low 16% / Moderate 26% / Notable 46% / High 12% / Systemic 1%
- 最高分（95/100）：伊朗战争系列报道（伊朗最高领袖遇袭/美以联合打击/油价历史暴涨），判断完全正确
- 前端 NewsCard：Relevance → Impact，颜色梯度（蓝-蓝-靛），分数数字显示

**UX 与排序优化（2026-03-10）**

- **Impact 排序**：HomeFeed 新增 Latest ↔ Impact 切换按钮；后端 `?sort=impact` 按 `ai_score DESC NULLS LAST` 排序（日期过滤始终保留，无全表扫描）；底部终止文案随模式切换
- **NewsCard 布局统一**：标题取消截断（`line-clamp-2` 移除），完整展示；摘要文字从卡片内联移除，改为底部"查看摘要"按钮触发弹窗
- **摘要弹窗（Summary Modal）**：居中浮层，`backdrop-blur-sm` 背景虚化 + `bg-black/40` 遮罩；含完整标题、全文摘要、"阅读全文"跳转；三种关闭方式（点背景 / ✕ / Escape）；ZH 模式自动拉取中文摘要，缓存命中则即时显示
- **Impact 条布局修复**：卡片改为 `flex flex-col`，评分条始终固定在卡片底部，多行标题不再导致对齐错位
- **Settings 按钮重设计**：汉堡图标 → 齿轮图标 + 文字标签，接入 i18n

**语言切换器（2026-03-10）**

- **LangDropdown 组件**：A/文 toggle 升级为可扩展下拉菜单；`LANGUAGES` 数组驱动，新增语言只需追加一条记录；按钮文字随 locale 切换（"Language" / "语言"）

**全站 i18n 补完（2026-03-10）**

*本轮覆盖此前所有遗漏的硬编码英文文字，i18n 覆盖率达到 100%。*

新增 2 个翻译命名空间（`article` / `auth`），共约 40 个 key：

- **Feed 层**（5 处修复）：板块切换标签、搜索框占位文字、时间显示（"X min ago"）、排序按钮文字、Settings 按钮文字
- **文章详情页**：`ShareButton`（Share/Copied!）、`SaveButton`（Save/Saved/验证提示/重发邮件）、返回按钮、相关方/地区/规模标签、"阅读原文"、"相关资讯"标题、无摘要提示
- **认证页面**：登录页、注册页、忘记密码页——所有标题、标签、按钮、占位文字、错误提示、成功页面文字
- **相关资讯标题**：文章详情页底部相关文章标题在 zh locale 下批量翻译（优先读 DB 缓存，未缓存时并发调翻译 API）
- **Impact 标签**：NewsCard 评分条的 "IMPACT" 标签接入 i18n（复用 `feed.sortImpact`）

**安全与账号管理（2026-03-13）**
- Cloudflare Turnstile CAPTCHA 修复：从 Managed 切换为 Invisible 模式（后台静默验证，无可见 UI）；新增 8 秒超时兜底机制，防止 site key 失效或网络异常导致注册按钮永久 disabled；修复 Vercel 中存储的失效 site key
- 邮箱合法性校验强化：`email_guard.py` 扩展辅音检查范围至 4-9 字符字符串（零元音即拒绝），拦截 `sdss@gmail.com`、`qwrt@gmail.com` 等全辅音乱码邮箱
- 未验证账号自动清除：`scheduler.py` 新增 `cleanup_unverified_accounts()` 任务，每小时执行，自动删除注册超 24 小时仍未验证邮箱的账号（按外键安全顺序级联删除）；启动时立即执行一次，清理历史遗留数据
- 注册成功页新增"重发验证邮件"按钮（`idle → sending → sent/error` 状态机），含完整 i18n
- Resend 429 专项错误日志：单日配额耗尽时输出明确提示，方便定位
- 配置诊断：Railway 启动日志打印各关键环境变量状态（`SET ✓` / `MISSING ✗`）；新增 `GET /health/services` 端点，线上快速诊断服务可用性
- CAPTCHA 拒绝日志：记录客户端 IP + token 长度，附带配置检查提示

**稳定性与性能修复（2026-03-13）**
- **Supabase Transaction Pooler 迁移**：DATABASE_URL port 5432 → 6543，解决 `MaxClientsInSessionMode` 连接耗尽问题；SQLAlchemy 连接池调整 pool_size=10 + max_overflow=15
- **复合 DB 索引**（Alembic migration `c3f1a9e2d847`）：`ix_articles_feed` + `ix_articles_impact`；接口响应 2-5s → **166ms**
- **N+1 查询优化**：投票计数 2 次 COUNT → 1 次条件聚合
- **OpenAI 30s / Frontend 12s timeout**：消灭调度器挂起和 UI 永久 loading 问题
- **MarketTicker**：轮询 15s → 60s；Promise cancelled flag 防内存泄漏

**新闻源拓展（5 → 11）（2026-03-13）**
- 第一轮：+Reuters / Bloomberg / Wall Street Journal → 8 源
- 第二轮（评估 ChatGPT Top 25 清单后）：+TechCrunch / AP News / Axios → **11 源**
- 覆盖维度：金融财经 + AI/科技 + 全球宏观中立线 + 高密度商业短报

**API 攻击防御（2026-03-13 第二轮）**
- **Rate limiting 全覆盖**：GET /articles、/headlines、/saved、/related（60/min per IP）；/translate（20/min）
- **page_size 上限 100→20**：封堵大页攻击向量；超限请求直接 422
- **连接池快速失败**：pool_timeout 30s→5s（不再等待排队），max_overflow 15→10，pool_size 10→5
- **Railway IP 修正**：limiter 改用 `CF-Connecting-IP / X-Forwarded-For` 提取真实客户端 IP（原来读到内网 100.64.x.x）
- **access log 抑制**：uvicorn `--no-access-log` 消除攻击期间 500+ logs/sec 日志洪水

**待完成（低优先级，留后续迭代）**
- 中文新闻源接入（Phase 4 开始时）
- 抓取日志管理页（内部工具）

---

_最后更新：2026-03-13（稳定性修复 + DB 索引 + Transaction Pooler + 新闻源 5→11 + API 攻击防御）_
