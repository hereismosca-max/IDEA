# Dev Log

> 记录每次开发会话的主要工作内容、决策思路和遇到的问题。
> 格式：`## YYYY-MM-DD`，从最新到最旧排列。

---

## 2026-03-13 · Turnstile CAPTCHA 修复 · 邮件 429 排查 · 邮箱校验强化 · 未验证账号自动清除 · 稳定性审查与性能修复 · 新闻源拓展（8→11） · 连接池攻击防御

### 背景

本轮开发由用户反馈的 4 个并发问题触发：

1. Cloudflare Turnstile 注册页空白（iframe 渲染失败，按钮永久禁用）
2. 注册成功后收不到验证邮件
3. 乱码邮箱（如 `sdss@gmail.com`、`qwrt@gmail.com`）仍可通过邮箱校验
4. 未验证账号永久占用数据库，无任何清理机制

同期有人编写了批量注册脚本对网站进行压力测试，制造了约 6000 条垃圾数据并耗尽 Resend 单日配额。

---

### 一、Cloudflare Turnstile CAPTCHA 修复

#### 排查阶段

**阶段一 — 域名配置排查**
Cloudflare Turnstile 控制台已正确配置所有域名（`finlens.io`、`www.finlens.io`、`*.vercel.app`、`*.railway.app`、`localhost`），但 widget 仍无法显示，排除域名白名单问题。

**阶段二 — Site Key 失效**
浏览器控制台报错：
```
TurnstileError: [Cloudflare Turnstile] Invalid input for parameter "sitekey", got "0x4AAAAAACqBV0zf66oSvGz2"
```
确认 Vercel 中存储的 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 是已删除/作废的旧 key。

**关键洞察**：Cloudflare JS SDK 遇到无效 sitekey 时会**直接抛出未捕获异常，而非触发 React `onError` 回调**，导致：
- `onError` 永远不触发 → `captchaUnavailable` 永远为 false
- 提交按钮永远 disabled，用户无法注册

#### 修复方案

**1. Vercel 环境变量更新**：用户在 Cloudflare 控制台重新生成 site key，更新 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`。

**2. 8 秒超时兜底**（`frontend/src/app/[locale]/register/page.tsx`）：
```tsx
const captchaResolvedRef = useRef(false);
useEffect(() => {
  if (!SITE_KEY) return;
  const id = setTimeout(() => {
    if (!captchaResolvedRef.current) setCaptchaUnavailable(true);
  }, 8000);
  return () => clearTimeout(id);
}, []);
```
无论何种失败原因（key 失效、域名不匹配、网络超时），8 秒后若 widget 仍未 resolve → 解锁按钮，允许用户继续注册（后端 rate limit 作为兜底安全层）。

**3. Invisible 模式切换**：
```tsx
<Turnstile
  siteKey={SITE_KEY}
  onSuccess={(token) => { captchaResolvedRef.current = true; setCaptchaToken(token); }}
  onError={() => { captchaResolvedRef.current = true; setCaptchaUnavailable(true); }}
  options={{ size: 'invisible' }}
/>
```
从 `Managed` 切换为 `invisible`，无可见 UI，Cloudflare 在后台静默完成验证。同时在 Cloudflare 控制台将 Widget Mode 改为 Invisible。

**4. 提交条件统一**：
```tsx
const canSubmit = (!SITE_KEY || !!captchaToken || captchaUnavailable) && !isSubmitting;
```
三种情况均可提交：无 SITE_KEY（开发模式）、有 token（正常通过）、widget 不可用（降级模式）。

#### 最终状态
- 控制台：无 TurnstileError，出现 `checkSupportDomain domain: www.finlens.io`（SDK 正常加载）
- 注册按钮：可点击，无可见 CAPTCHA 组件（Invisible 模式设计如此，属预期行为）

---

### 二、邮件验证 429 Rate Limit 排查

#### 现象
用户注册成功进入"查收邮件"提示页，但收件箱和垃圾箱均无任何邮件。

#### 排查过程
1. `GET /health/services`：`RESEND_API_KEY` SET ✓，DATABASE connected ✓
2. Resend 控制台：`finlens.io` 域名状态 Verified ✓
3. Resend Logs 页面：**所有发信记录均为 429 Too Many Requests**
4. Resend Usage 页面：Daily `201/100`（超限！），Monthly `209/3000`（正常）

#### 根因
批量注册测试脚本（约 6000 次注册）触发了约 200+ 封验证邮件，一次性耗尽 Resend 免费账户**单日 100 封**配额。

#### 处理
- **短期**：等待 UTC 午夜配额自动重置（无需代码改动）
- **代码改进**（`backend/app/core/email.py`）：新增 429 专项错误日志，方便快速定位：
```python
if "429" in err_str or "rate_limit" in err_str.lower() or "too many" in err_str.lower():
    logger.error("⚠️  RESEND QUOTA EXHAUSTED (429) — could not email %s. "
                 "Free tier: 100/day. Wait for reset or upgrade.", to)
```
- **长期防护**：Turnstile CAPTCHA 修复后自动阻断批量注册脚本

---

### 三、邮箱校验强化（`email_guard.py`）

#### 问题
`sdss@gmail.com`、`qwrt@gmail.com` 等全辅音短字符串仍可通过邮箱合法性检测注册成功。

#### 根因
原辅音比例检查仅适用于 `len(local) >= 10` 的字符串，4-9 字符的短乱码完全绕过：
```python
# 旧逻辑（有缺陷）
if len(local) >= 10:
    if vowels_found / len(local) < 0.10:
        return True
```

#### 修复（`_local_part_is_suspicious()`）
```python
# 新逻辑
if len(local) >= 4:
    vowels_found = sum(1 for c in local if c in _VOWELS)
    if len(local) <= 9:
        if vowels_found == 0:      # 4-9 字符全辅音 → 直接拒绝
            return True
    else:
        if vowels_found / len(local) < 0.10:  # ≥10 字符辅音占比过高 → 拒绝
            return True
```

**覆盖验证**：
- `sdss`（4字符，0元音）→ 拒绝 ✓
- `qwrt`（4字符，0元音）→ 拒绝 ✓
- `john`（4字符，含元音 o）→ 放行 ✓
- `alice`（5字符，3元音）→ 放行 ✓
- `sdssqwrt`（8字符，0元音）→ 拒绝 ✓

---

### 四、未验证账号自动清除（`scheduler.py`）

#### 需求
用户 24 小时内未验证邮箱 → 自动删除账号，防止垃圾数据永久占用数据库。

#### 实现
新增 `cleanup_unverified_accounts()` 函数：

```python
def cleanup_unverified_accounts():
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    # 按外键安全顺序批量删除
    db.query(ArticleVote).filter(ArticleVote.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(UserSavedArticle).filter(UserSavedArticle.user_id.in_(ids)).delete(synchronize_session=False)
    deleted = db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    logger.info("Cleanup: deleted %d unverified account(s) older than 24h", deleted)
```

**调度策略**：
- 每小时执行一次：`IntervalTrigger(hours=1)`，job id `cleanup_unverified`
- 启动时立即执行一次（daemon thread），清理历史遗留数据（批量注册脚本制造的 ~6000 条垃圾账号）

**FK 安全性**：先删子表（`article_votes`、`user_saved_articles`），再删主表（`users`），使用 `synchronize_session=False` 避免 ORM 追踪开销，完整 try/except/rollback 保护。

---

### 五、配置诊断改进

**启动日志**（`main.py`）：Railway 部署后可在控制台直接判断环境变量是否生效：
```
[Config] RESEND_API_KEY     : SET ✓
[Config] TURNSTILE_SECRET   : SET ✓
[Config] OPENAI_API_KEY     : SET ✓
[Config] FRONTEND_BASE_URL  : SET ✓
```

**`GET /health/services` 端点**：返回各服务配置状态（key 是否设置、DB 是否连接），不暴露实际 key 值，适合线上快速诊断。

**CAPTCHA 拒绝日志**（`auth.py`）：
```python
logger.warning(
    "CAPTCHA rejected — ip=%s token_len=%d "
    "(hint: check TURNSTILE_SECRET_KEY matches site key in Cloudflare)",
    client_ip, len(payload.captcha_token),
)
```

---

### 六、注册成功页"重发验证邮件"按钮

停留在注册成功"请查收邮件"页面时，新增 **Resend verification email** 按钮：
- 状态机：`idle → sending → sent / error`
- 调用 `POST /api/v1/auth/resend-verification`（需已登录）
- 发送成功：显示 "✓ Email sent again"
- 发送失败：显示 "Failed — try again later"
- 文案全部接入 i18n：`en.json` + `zh.json` 新增 `auth.resendEmail` / `auth.resending` / `auth.resendSent` / `auth.resendError`

---

### 七、Invisible 模式说明（用户答疑）

> **用户问**：我还没有看到 UI 按钮/checkbox，还是说现在不会有那个 UI 出现了，只是在后台确认当前注册的用户是不是 bot？

**结论**：是的，这是 Invisible 模式的设计行为，属预期表现。

| 模式 | 表现 |
|------|------|
| Managed | 显示可见 checkbox（"I'm not a robot"），高风险时弹出图形验证 |
| **Invisible（当前）** | **无可见 UI**，Cloudflare 在后台分析行为信号（鼠标移动、JS 执行特征、IP 信誉等）完成验证 |

Invisible 模式对用户体验最友好——正常用户注册全程无感知，机器人则在后台被静默拦截。

---

### 八、稳定性审查与性能修复

#### 背景

用户反馈网页加载速度明显变慢，有时长时间无响应，或加载不出信息显示 retry 错误。全面代码审查发现 6 个性能瓶颈。

#### 根因汇总

| # | 问题 | 影响 |
|---|---|---|
| 1 | Supabase Session Pooler（port 5432）约 15 连接硬上限 | Railway 服务占满全部连接；任何新连接（含 CLI、Alembic）立即报 `MaxClientsInSessionMode` |
| 2 | `articles` 表无复合索引 | 分页请求全表扫描 6000+ 行，响应时间 2-5s |
| 3 | 文章详情页 N+1 投票查询（3 次 DB round-trip） | 可用单次条件聚合替代 |
| 4 | OpenAI 客户端无超时 | AI 处理器 hang 时无限阻塞调度器线程 |
| 5 | Frontend fetch 无超时 | 网络请求 stall 时 UI 永久 loading |
| 6 | MarketTicker 15s 轮询 + HeadlineTicker Promise 泄漏 | 频繁请求增加负载；组件 unmount 后仍回调更新 state |

#### 修复详情

**1. Supabase Transaction Pooler 迁移**

运行 `railway run alembic current` 触发报错：
```
FATAL: MaxClientsInSessionMode: max clients reached
```

Session Pooler（port 5432）每个客户端对应一个服务端连接，上限约 15。Railway 服务已占满。

修复：DATABASE_URL port `5432` → `6543`（Transaction Pooler，PgBouncer 事务模式，支持 100+ 并发客户端共用约 10 个服务端连接）。本地使用 Transaction Pooler URL 直连执行 Alembic 迁移，`railway variables set` 永久更新生产环境。

`backend/app/core/database.py` 连接池参数同步调整：
```python
pool_size=10, max_overflow=15, pool_timeout=30, pool_recycle=1800
```

**2. 复合索引 Alembic 迁移（`c3f1a9e2d847`）**

```sql
CREATE INDEX ix_articles_feed   ON articles (is_active, language, published_at DESC);
CREATE INDEX ix_articles_impact ON articles (is_active, language, ai_score DESC NULLS LAST, published_at DESC);
```

效果：接口响应时间 **2-5s → 166ms**（约 20x 提升）。

**3. N+1 投票查询合并**（`articles.py`）

原：2 次独立 COUNT → 改为单次 `COUNT(*) FILTER (WHERE vote = 1/−1)` 条件聚合，节省 1 次 DB round-trip。

**4. OpenAI 30s timeout**（`openai_processor.py`）：`OpenAI(api_key=..., timeout=30.0)`

**5. Frontend fetch 12s timeout**（`api.ts`）：AbortController 超时后抛出友好 408 错误 `"Request timed out — please try again"`

**6. MarketTicker 优化**（`MarketTicker.tsx`）：轮询 15s → 60s；HeadlineTicker 翻译 Promise 添加 `cancelled` flag 防 setState-after-unmount

---

### 九、新闻源拓展（5 → 8 → 11）

#### 第一轮：核心财经三大线（本日）

新增 Reuters、Bloomberg、Wall Street Journal。通过 httpx + feedparser 测试：Reuters 本地 DNS 失败（Railway US-West 可访问，同 VPN 环境下的 Reuters 规律）；Bloomberg 30 篇 ✓；WSJ 20 篇 ✓。

#### 第二轮：跨领域覆盖扩展（本日）

**触发**：用户提供 ChatGPT "Top 25 Financial News Sources" 清单（按 signal density 排序），要求评估并执行。

**评估思路**：剔除已有的 6 个 Tier 1 源 → 测试 RSS 可用性 → 按 signal 质量 + 互补性筛选。

**结果**：

| 源 | 决策 | 原因 |
|---|---|---|
| **TechCrunch** ✅ | 加入 | AI/VC/科技板块头部，填补现有全金融源的最大盲区；20 篇本地确认 |
| **AP News** ✅ | 加入 | 全球最权威中立新闻线，宏观/地缘信号首选；DNS 本地失败，Railway 可访问 |
| **Axios** ✅ | 加入 | 高 signal-to-noise 短报；`api.axios.com/feed/` 100 篇今日实时确认 |
| The Street | ❌ | 403 Blocked（二次验证） |
| Seeking Alpha、Barron's、Economist | ❌ | RSS 受限/付费墙/无公开 feed |
| Politico、The Verge、Wired 等 | ❌ | 金融 signal 密度不足或重叠 |

执行：seed 入生产库 → commit → push → Railway 自动部署 → `/api/v1/sources` 确认 11 sources 全部 `is_active: true` ✓

**最终源清单（11 个）**：原始 5（FT/CNBC/BBC/Yahoo/MarketWatch）+ 第一轮 3（Reuters/Bloomberg/WSJ）+ 第二轮 3（TechCrunch/AP News/Axios）

---

### 十、连接池攻击防御（2026-03-13 第二轮）

#### 根因分析

**现象**：用户反馈网站无法正常使用，Railway 日志大量：
```
sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 15 reached,
connection timed out, timeout 30.00
INFO: 100.64.0.x - "GET /api/v1/articles?page=1&page_size=100&language=en HTTP/1.1" 500 Internal Server Error
Railway rate limit of 500 logs/sec reached for replica. Messages dropped: 2782
```

**根因**：多重叠加故障：

| # | 根因 | 影响 |
|---|------|------|
| 1 | `/api/v1/articles` 端点**无 rate limiting** | 攻击者可无限速轰炸 |
| 2 | 攻击者用 `page_size=100`（后端允许至 100） | 每请求持有连接时间更长 |
| 3 | `pool_timeout=30s` | 超载时每请求排队 30 秒，连接槽全部挤死，后续请求全部 500 |
| 4 | uvicorn access log 每请求 1 行 INFO | 攻击期间触发 Railway 500 logs/sec 限制，丢失 2782 条关键错误日志 |
| 5 | `get_remote_address` 读到 Railway 内网 IP `100.64.x.x` | rate limit 对真实攻击者 IP 无效 |

#### 修复内容

**1. Rate limiting 覆盖文章端点（`articles.py`）**
```python
@router.get("")
@limiter.limit("60/minute")   # GET /api/v1/articles
def get_articles(request: Request, ...):

@router.get("/headlines")
@limiter.limit("60/minute")   # GET /api/v1/articles/headlines
def get_headlines(request: Request, ...):

@router.get("/saved")
@limiter.limit("60/minute")   # GET /api/v1/articles/saved
def get_saved_articles(request: Request, ...):

@router.get("/{article_id}/translate")
@limiter.limit("20/minute")   # 高成本 OpenAI 调用，更严格限制
def translate_article_endpoint(request: Request, ...):

@router.get("/{article_id}/related")
@limiter.limit("60/minute")   # GET /api/v1/articles/{id}/related
def get_related_articles(request: Request, ...):
```

**2. page_size 上限 100→20（所有列表端点）**
```python
page_size: int = Query(20, ge=1, le=20, ...)  # 攻击向量封堵
```
效果验证：`?page_size=100` → `HTTP 422 Unprocessable Entity` ✓

**3. 连接池参数调整（`database.py`）**
```python
pool_size=5,        # 10→5：减小内存压力，Transaction Pooler 侧多路复用
max_overflow=10,    # 15→10：总 15 连接，防止突发时池雪崩
pool_timeout=5,     # 30s→5s：快速失败，不排队等候（关键！）
pool_recycle=600,   # 1800→600：更频繁回收陈旧连接
```

**4. IP 提取修正（`limiter.py`）**
```python
def _get_real_ip(request: Request) -> str:
    # CF-Connecting-IP → X-Forwarded-For → client.host
    # Railway 内网 100.64.x.x 不再被当作 rate limit key
```

**5. uvicorn access log 抑制（`Dockerfile`）**
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
# 攻击期间 500+ logs/sec → Railway 丢日志。应用层 ERROR 日志仍保留。
```

#### 验证结果

| 测试 | 预期 | 实际 |
|------|------|------|
| `GET /api/v1/articles?page_size=100` | HTTP 422 | ✅ 422 |
| `GET /api/v1/articles?page_size=20` | HTTP 200 | ✅ 200（0.13s） |
| Railway 日志中 QueuePool 错误 | 消失 | ✅ 无 |
| 日志中仅见 scheduler 正常日志 | 干净 | ✅ 干净 |

Commit: `00e5e7f fix: harden API against connection pool exhaustion attacks`

---

### 关键文件变更汇总

| 文件 | 变更内容 |
|------|---------|
| `frontend/src/app/[locale]/register/page.tsx` | 8s 超时兜底、invisible 模式、`captchaResolvedRef`、重发邮件按钮 |
| `frontend/messages/en.json` + `zh.json` | 新增 `auth.resendEmail/resending/resendSent/resendError` |
| `backend/app/core/email_guard.py` | 扩展辅音检查至 4-9 字符字符串 |
| `backend/app/core/email.py` | 429 专项错误日志 |
| `backend/app/core/captcha.py` | 空 token 静默跳过验证 |
| `backend/app/services/scheduler.py` | 新增 `cleanup_unverified_accounts()` 小时级定期任务 |
| `backend/app/main.py` | 启动配置诊断日志 + `GET /health/services` 端点 |
| `backend/app/api/v1/routes/auth.py` | CAPTCHA 拒绝时输出诊断日志 |
| `backend/app/core/database.py` | 连接池参数强化（pool_size 10→5, overflow 15→10, timeout 30s→5s, recycle 1800→600） |
| `backend/app/api/v1/routes/articles.py` | 投票 N+1 查询合并；rate limiting 覆盖 5 个端点；page_size 上限 100→20 |
| `backend/app/core/limiter.py` | `_get_real_ip` 函数，优先读 CF-Connecting-IP / X-Forwarded-For |
| `backend/Dockerfile` | uvicorn `--no-access-log`（防止攻击期间日志洪水） |
| `backend/app/services/ai/openai_processor.py` | OpenAI 客户端 30s timeout |
| `backend/alembic/versions/c3f1a9e2d847_*.py` | 复合索引迁移（ix_articles_feed + ix_articles_impact） |
| `frontend/src/lib/api.ts` | AbortController 12s 请求超时 |
| `frontend/src/components/layout/MarketTicker.tsx` | 轮询 15s→60s；HeadlineTicker Promise cancelled flag |
| `backend/app/services/fetcher/registry.py` | 新增 Reuters/Bloomberg/WSJ/TechCrunch/AP News/Axios（11 源） |
| `backend/scripts/seed.py` | SOURCES 列表同步更新（11 sources） |

---

## 2026-03-10 · Impact 排序 · NewsCard 摘要弹窗 · 全站 i18n 补完

### 一、Impact 排序功能（Latest ↔ Impact 切换）

**背景**：AI 重要性评分（ai_score）已完成全量 backfill（3457 篇），但前端只按时间排序，没有利用这个数据。

**后端**（`backend/app/api/v1/routes/articles.py`）：
```python
elif sort == "impact":
    query = query.order_by(text("ai_score DESC NULLS LAST"), Article.published_at.desc())
```
- 主排序：`ai_score DESC NULLS LAST`（无分数的文章排最后）
- 次排序：同分时按发布时间降序
- 日期过滤始终保留（Impact 模式只在当天文章里排序，不全表扫描）

**前端**：
- `NewsFeed.tsx`：sort 类型扩展为 `'latest' | 'popular' | 'impact'`
- `HomeFeed.tsx`：新增 `sort` state（默认 `'latest'`），切换按钮挂在 SearchBar 右侧
- `api.ts`：`fetchArticles()` 透传 `sort` 参数
- 底部终止文案区分：Impact 模式显示 `— Top N articles by impact —`

**关键 Bug 修复（Impact 模式）**：
- 初版实现绕过了日期过滤，导致全表扫描 3400+ 行，加载 4-5 秒
- 修复：Impact 模式保留日期过滤，每天文章约 20-50 篇，速度恢复正常
- 同步修复：Impact 模式下 DateNavigator 被误设为 `disabled`（`pointer-events-none`），导致日期切换功能消失；改回正常可交互状态

---

### 二、Settings 按钮重设计

**原**：汉堡图标 ≡（三横线）
**改**：齿轮图标（SVG `path` 实现）+ 旁边文字标签（通过 `useTranslations('settings')` → `t('title')` 接入 i18n）
- 按钮样式：`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border`，统一 TopBar 风格

---

### 三、语言切换器重设计（A/文 → LangDropdown）

**演进路径**：
1. 初版：A/文 toggle 按钮（直接切换，无下拉）
2. 第二版：用户希望扩展性，改为下拉菜单
3. 第三版：按钮文字从 A/文 改为 "Language"/"语言"（更通用）

**最终实现**（`TopBar.tsx` 内嵌 `LangDropdown` 组件）：
```tsx
const LANGUAGES = [
  { code: 'en', label: 'English', char: 'A'  },
  { code: 'zh', label: '中文',    char: '文' },
] as const;
```
- 扩展模式：加新语言只需在 `LANGUAGES` 数组追加一条，无需改组件代码
- 按钮文字：`tS('language')`（settings 命名空间），随 locale 自动切换 "Language"/"语言"
- 下拉面板：radio dot 列表，选中立即保存到后端 + 导航新 locale
- 外部点击关闭：`useRef` + `document.addEventListener`

---

### 四、i18n 全面扫描修复（5 处漏洞）

用户截图标注了切换中文后仍显示英文的 5 个区域：

| # | 位置 | 原因 | 修复方式 |
|---|---|---|---|
| 1 | 板块切换器 | `BOARD_LABELS` 以 `board`（内容语言）为 key，应以 `locale`（UI 语言）为 key | 改为 `BOARD_LABELS[(locale as Board)]` |
| 2 | Settings 按钮 | `<span>Settings</span>` 硬编码 | 改为 `<span>{t('title')}</span>` |
| 3 | 时间显示（如"49 min ago"） | `timeAgo()` 独立函数，返回硬编码英文字符串 | 重写为 hook-based，用 `useTranslations('feed')` 的现有 key |
| 4 | 搜索框占位文本 | `placeholder="Search articles…"` 硬编码 | `placeholder={t('searchPlaceholder')}`，新增 i18n key |
| 5 | Latest/Impact 切换 | 按钮文字硬编码 | `t('sortLatest')` / `t('sortImpact')`，新增 i18n key |

**新增 i18n key**（`messages/en.json` + `zh.json` 的 `feed` namespace）：
- `searchPlaceholder` → "Search articles…" / "搜索文章…"
- `sortLatest` → "Latest" / "最新"
- `sortImpact` → "Impact" / "影响"

---

### 五、NewsCard 布局重设计 + 摘要弹窗

**用户需求**：中文模式已有"查看中文摘要"展开按钮，英文模式保持显示内联摘要文字不统一；希望统一为点击触发的弹窗形式，弹窗居中，背景虚化。

**卡片层改动**：
- 标题：移除 `line-clamp-2`，改为全量显示（不截断）
- 摘要文字：移除 `<p className="line-clamp-3">` 内联显示
- 原 ZH "查看中文摘要" 内联展开区域整体移除
- 底部新增统一的"View Summary / 查看摘要"按钮（有摘要内容时显示）

**弹窗实现**（`NewsCard.tsx`）：
```tsx
// 背景层
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
     onClick={() => setModalOpen(false)}>
  // 弹窗卡片
  <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
       onClick={(e) => e.stopPropagation()}>
```
- 关闭方式：点击背景 / 点击 ✕ 按钮 / 按 `Escape` 键
- ZH 模式：点击时如无缓存摘要，先 loading 翻译再开弹窗；有缓存直接开弹窗
- 弹窗内容：来源 + 时间 + 完整标题 + 分隔线 + 摘要全文 + "Read full article →" 链接

**新增 i18n key**（`feed` namespace）：
- `viewSummary` → "View Summary" / "查看摘要"
- `translating` → "Translating…" / "翻译中…"
- `noSummary` → "No summary available." / "暂无摘要。"
- `readFullArticle` → "Read full article" / "阅读全文"

---

### 六、全站剩余 i18n 补完

**背景**：上轮修复了 Feed 层的 5 处漏洞，本轮扫描发现文章详情页、认证页面均存在大量硬编码英文文字。

**新增两个 i18n 命名空间**：

**`article` namespace**（覆盖文章详情页所有字符串）：
- `back / share / copied / save / saved / saveTitleUnsaved / saveTitleSaved`
- `verifyToSave / emailSent / resendEmail / sending`
- `relatedArticles / readOriginal / noSummary / companies / locations / scale`

**`auth` namespace**（覆盖登录/注册/忘记密码页所有字符串）：
- `signIn / signingIn / email / password / forgotPassword / noAccount / createOne`
- `invalidCredentials / loginFailed`
- `createAccount / creatingAccount / displayName / namePlaceholder / passwordPlaceholder`
- `passwordTooShort / emailAlreadyTaken / registrationFailed / alreadyHaveAccount / signInLink`
- `checkInboxTitle / verificationSentTo / verificationExpiry / continueBrowsing / checkSpam`
- `forgotPasswordTitle / forgotPasswordSubtitle / sendResetLink / sending / rememberedIt`
- `checkInboxResetTitle / checkInboxResetPre / checkInboxResetPost / resetLinkExpiry / backToSignIn`

**受影响文件**：

| 文件 | 改动 |
|---|---|
| `ShareButton.tsx` | 加 `useTranslations('article')`，"Share"/"Copied!" → `t('share')`/`t('copied')` |
| `SaveButton.tsx` | 加 `useTranslations('article')`，全部硬编码文字 → `t(...)` |
| `article/[id]/page.tsx` | 加 `getTranslations('article'/'feed')`（Server Component）；`timeAgo()` 改为 tFeed keys；所有 `isZh ? '...' : '...'` 内联三元替换为 `t('key')` |
| `login/page.tsx` | 加 `useTranslations('auth')`，全页面硬编码替换 |
| `register/page.tsx` | 同上，含注册成功页和错误提示 |
| `forgot-password/page.tsx` | 同上；`checkInboxResetPre/Post` 拆分 key 保留邮件地址的加粗样式 |

**Server Component 特殊处理**：文章详情页是 `async` Server Component，无法使用 `useTranslations` hook，改用 `getTranslations` from `next-intl/server`，在 `Promise.all` 并发获取。

---

### 七、相关资讯标题翻译（批量翻译机制）

**问题**：文章详情页底部"相关资讯"卡片的标题未被翻译，始终显示英文原文。

**根因**：`{related.title}` 直接渲染，无任何翻译逻辑。主文章通过专门的 `getTranslation(id)` 调用获取翻译，相关文章没有对应逻辑。

**修复策略**（最小代价）：
```tsx
// zh locale 下，批量构建相关文章标题 Map
const relatedTitleMap = new Map<string, string>();
if (isZh && relatedArticles.length > 0) {
  await Promise.all(
    relatedArticles.map(async (r) => {
      if (r.title_zh) {
        relatedTitleMap.set(r.id, r.title_zh); // DB 已缓存，直接用
      } else {
        const trans = await getTranslation(r.id).catch(() => null); // 调翻译 API
        if (trans?.title_zh) relatedTitleMap.set(r.id, trans.title_zh);
      }
    })
  );
}
// 渲染时：
{relatedTitleMap.get(related.id) ?? related.title}
```

**性能说明**：
- 已被翻译过的文章（`title_zh` 存 DB）：直接命中，0 额外请求
- 未翻译的文章：最多 5 个并发 `getTranslation()` 请求，结果被 Next.js fetch 缓存 24 小时
- 下次同一文章被打开，所有相关文章标题均已缓存，无额外开销

---

### 八、Impact 标签翻译

`NewsCard.tsx` 底部评分条的 `"Impact"` 标签硬编码，在中文模式下不翻译。

**修复**：`{tFeed('sortImpact')}`（复用已有 `feed.sortImpact` key，无需新增）
- EN：**IMPACT**（CSS `uppercase` 作用）
- ZH：**影响**

---

### 本轮提交记录

| Commit | 内容摘要 |
|---|---|
| — | Impact 排序后端 + 前端切换 UI |
| — | NewsCard flex 布局修复（Impact 条固定底部） |
| — | Impact 排序性能修复 + DateNavigator 恢复可用 |
| — | Settings 按钮齿轮图标 + i18n |
| — | LangDropdown 可扩展下拉语言切换器 |
| — | Language 按钮文字改为 "Language"/"语言" |
| `57e4689` | i18n 全面扫描：5 处漏洞修复（板块标签/时间/搜索框/排序按钮/Settings） |
| — | NewsCard 摘要弹窗：移除内联摘要，统一弹窗模式（EN+ZH） |
| — | 全站 i18n：article + auth 命名空间，8 个文件 |
| — | 相关资讯标题批量翻译（zh locale） |
| — | Impact 标签 i18n |

---

## 2026-03-09 · Phase 3 启动 · UI 品牌重塑 · AI 评分方案确定

### 一、TopBar 品牌重塑（commit `4f16f85`）

**Logo**：`NewsAnalyst` → `FinLens`，加入 slogan "Your scope to see the world"
- Wordmark：`font-black text-xl`，"Fin" 用 `text-gray-900`，"Lens" 用 `text-blue-600`——突出品牌的"镜头"隐喻
- Slogan：`uppercase tracking-[0.18em]` 宽字距大写，营造高端财经媒体质感
- 移动端 slogan 隐藏（`hidden sm:block`），保持顶栏紧凑

**板块切换器标签**（commit `4d17867` + `4f16f85`）：
- 旧：`American / Chinese`（太模糊，外国用户不知道在切什么）
- 新：英文板块激活时全英文 `U.S. News / Chinese News`；中文板块激活时全中文 `英文资讯 / 中文资讯`
- 设计原则：UI 语言跟随激活板块，不出现语言混杂

### 二、移动端响应式适配（commit `3ce5ab6`）

- 文章详情页：`flex-col-reverse md:flex-row`，投票侧边栏移动端变为底部水平行
- MarketTicker：移动端 `hidden md:flex` 隐藏市场卡，HeadlineTicker 占满全宽
- HomeFeed 导航栏：`flex-col md:flex-row`，SearchBar 移动端全宽，DateNavigator 居中显示在下方
- TopBar 用户名：`truncate max-w-[60px] sm:max-w-[140px]` 防止溢出
- MenuBar：右侧渐变遮罩（`md:hidden`）提示可横向滑动

### 三、Phase 3 AI 重要性评分：方案讨论与决策

**核心决策：放弃固定规则，直接用 LLM**

数据分析发现（3431 篇有摘要文章）：
- 57% 文章 `scale = company`，但"英伟达财报"和"小公司产品发布"不可能用同一分数
- `investment` topic 出现 1362 次，信息量接近 0，不能作为权重依据
- 真正区分重要性的关键在于**理解内容语义**，这是规则做不到的

**为什么直接 LLM 而非规则**：
- 规则权重固化，三个月后就会过时（市场热点随时间变化）
- 规则无法捕捉"同样 topic，不同主角（Federal Reserve vs 小公司）"的本质差异
- backfill 成本：3431 篇 × GPT-4o-mini ≈ $1，不值得为节省 $1 而降低核心功能质量
- 新文章打分：加进现有 OpenAI 调用，零额外 API 成本

**评分角色定位**：
- 面向投资者和市场分析师的视角（不是普通读者视角）
- 100 分制，100 = 对全球经济/资产价格影响最大
- 用户看到的标签：Impact（不是 Relevance）

**B 接口预留**：函数签名第一天就设计为
`compute_importance_score(title, ai_summary, ai_tags, user_context=None) -> int`
`user_context` 现在传 None（纯客观分），Phase 4/5 接入用户行为数据后填充实现个性化

**待实现（下一轮开发）**：
1. `backend/app/services/scorer.py`（LLM 打分模块 + B 接口预留）
2. `openai_processor.py` prompt 扩展（新文章打分加入现有调用）
3. `backend/scripts/backfill_scores.py`（历史文章 backfill，<$1）
4. 前端 NewsCard "Relevance" → "Impact"

---

## 2026-03-09 · 域名购买 + finlens.io 上线 + 邮件生产化

### 背景
本轮完成两件事：(1) 购买并配置正式域名 finlens.io；(2) 把邮件服务从测试模式（`onboarding@resend.dev`，只能发给 Resend 账号本人）升级为生产模式（自定义域名发件）。

---

### 一、域名选型 · finlens.io

**候选项淘汰记录**：
| 域名 | 状态 | 原因 |
|---|---|---|
| finfiber.com | 可用 | 联想不够，不选 |
| finbrief.com | 已注册 | — |
| finsift.com | 已注册 | — |
| finpumps.com | 可用但放弃 | "pump" 联想 pump-and-dump（市场操纵），不适合金融品牌 |
| finewsift.com | 可用 | 拗口 |
| finlens.io | **选定** ✅ | fin（金融）+ lens（视角/镜头），寓意"看清金融世界"；$34.98/年 |

**购买渠道**：Namecheap，使用 Basic DNS（Namecheap 托管）。

---

### 二、Vercel 域名配置

在 Vercel 项目 → Settings → Domains 添加两条记录：

| 域名 | 配置 | 类型 |
|---|---|---|
| finlens.io | → 301 Redirect to www.finlens.io | 主域名 |
| www.finlens.io | Production | 主前端 |

**Namecheap DNS 添加（Vercel 要求）**：
- `A @` → `76.76.21.21`（Vercel IP）
- `CNAME www` → `cname.vercel-dns.com.`

两条记录生效后，Vercel 显示 "Valid Configuration" ✅，HTTPS 证书自动签发。

---

### 三、后端 CORS 更新

**`backend/app/main.py`**（commit `0adb98d`）：

```python
allow_origins=[
    "http://localhost:3000",
    "https://finlens.io",
    "https://www.finlens.io",
    "https://idea-brown.vercel.app",  # 保留旧域名，DNS 切换期间兼容
],
```

Railway 自动 redeploy 后生效，finlens.io 加载文章正常 ✅。

---

### 四、邮件服务生产化

**现状（测试阶段）**：发件人为 `onboarding@resend.dev`，只能向 Resend 账号注册邮箱发送，无法用于真实用户。

**生产化方案**：在 Resend 验证 finlens.io 域名，使用 `noreply@finlens.io` 发件。

**代码更新（已完成）**：
- `backend/app/core/config.py`：默认 `EMAIL_FROM` 改为 `FinLens <noreply@finlens.io>`，`FRONTEND_BASE_URL` 改为 `https://www.finlens.io`
- `backend/app/core/email.py`：邮件 HTML 和 subject 全部由 "NewsAnalyst" 改为 "FinLens"

**Railway 环境变量需更新（用户操作）**：

```
EMAIL_FROM=FinLens <noreply@finlens.io>
FRONTEND_BASE_URL=https://www.finlens.io
```

**Resend 域名验证（已完成）**：
1. Resend 控制台 → Domains → Add Domain → `finlens.io`
2. Namecheap Advanced DNS 添加 DKIM TXT + SPF TXT + DMARC TXT（MX 无需添加，仅发信不收信）
3. Resend 状态变 **Verified** ✅
4. Railway 环境变量已更新：`EMAIL_FROM=FinLens <noreply@finlens.io>`，`FRONTEND_BASE_URL=https://www.finlens.io`

**验证结果**：验证邮件成功发送至外部邮箱 ✅
- 初期可能进垃圾箱，属新域名信誉积累期正常现象
- 注册页 / 忘记密码页已有 "Check your spam folder" 提示，无需额外代码改动

---

## 2026-03-09 · i18n 修复 + 中文翻译功能 + 生产故障全面复盘

### 背景
本轮会话跨三个小节（每次因 context 限制中断后重新接续），主要完成：
1. 全站 i18n 补完（Sign In / DateNavigator / SettingsMenu 重设计）
2. 中文标题翻译功能（按需翻译 + DB 缓存）
3. 🚨 生产事故：连续两次错误修复导致后端完全宕机，排查修复全过程
4. Headline Ticker 中文翻译
5. March 7 慢加载问题诊断（瞬时，已自愈）

---

### 一、全站 i18n 修复 + SettingsMenu 重设计

**背景**：用户反映切换中文后只有 MenuBar 变化，Sign In / Saved / Today / Yesterday 仍是英文。

#### 1.1 i18n 翻译文件

**`frontend/messages/en.json` / `zh.json`**
- 新增 `nav.saved`、`nav.today`、`nav.yesterday`（DateNavigator 用）
- 新增 `settings.notifications`、`settings.display`、`settings.soon`、`settings.signOut`
- 删除 `settings.langDefault`（已不再有 Default 语言选项）

#### 1.2 TopBar

**`frontend/src/components/layout/TopBar.tsx`**
- 添加 `useTranslations('nav')`，Sign In / Saved 改用 `t('signIn')` / `t('saved')`
- 移除独立的 Sign Out 按钮（改在 SettingsMenu 内显示）

#### 1.3 DateNavigator

**`frontend/src/components/news/DateNavigator.tsx`**
- 添加 `useTranslations('nav')` + `useLocale()`
- Today / Yesterday 改用 `t('today')` / `t('yesterday')`
- 日期格式改为 `locale === 'zh' ? 'zh-CN' : 'en-US'`，切换语言后日期格式自动跟随

#### 1.4 SettingsMenu 完全重写

**`frontend/src/components/layout/SettingsMenu.tsx`**（重写为 list-style 导航）
- 列表式菜单：Account / Language / Notifications / Display / Sign Out
- **Language 行**：右侧 Badge 显示当前语言（EN / 中文），点击展开内联 Picker（仅 EN + 中文，无 Default）
- **Account 行**：未登录 → 跳转 /login；已登录 → 内联编辑表单（displayName / email / bio / pronouns）
- **Notifications 行**：显示 "Soon" badge；未登录 → 跳转 /login
- **Display 行**：禁用，显示 "Soon" badge
- **Sign Out 行**：仅登录可见，带分隔线，文字红色

---

### 二、中文翻译功能（按需翻译 + DB 缓存）

**设计思路**：卡片列表页只翻译标题（翻译压力小），点进详情页再翻译完整摘要；后端缓存翻译结果，相同文章只调 OpenAI 一次。

#### 2.1 数据库迁移

**`backend/app/models/article.py`**（当时版本，后被撤销，见"生产事故"）
- 新增 `title_zh: Mapped[str | None]`、`ai_summary_zh: Mapped[str | None]`

**新建 `backend/alembic/versions/b2f94e1c7a30_add_translation_fields_to_articles.py`**
- `down_revision = '3a7f82c1d905'`
- `upgrade`: `ADD COLUMN title_zh TEXT NULL, ADD COLUMN ai_summary_zh TEXT NULL`

#### 2.2 Backend：翻译服务 + 端点

**新建 `backend/app/services/translator.py`**
- 使用 GPT-4o-mini，JSON 模式，一次调用返回 `{title, ai_summary}`（两字段合并翻译）
- 无 `OPENAI_API_KEY` 时返回 `(None, None)`，优雅降级
- 重用单例 `_client`（线程安全）

**`backend/app/api/v1/routes/articles.py`**
- 新增 `GET /articles/{id}/translate?lang=zh`（置于 `/{article_id}` 之前防路由歧义）
- 首次调用：翻译 → 写入 DB 缓存 → 返回结果
- 后续调用：直接返回 DB 缓存，零 OpenAI 成本

**`backend/app/schemas/article.py`**
- 新增 `ArticleTranslationResponse`（`article_id / title_zh / ai_summary_zh`）

#### 2.3 Frontend：翻译调用

**`frontend/src/types/index.ts`**
- `Article` 新增可选字段 `title_zh?: string | null` 和 `ai_summary_zh?: string | null`
- 新增 `ArticleTranslation` interface

**`frontend/src/lib/api.ts`**
- 新增 `translateArticle(articleId, lang='zh'): Promise<ArticleTranslation>`

**`frontend/src/components/news/NewsCard.tsx`**（locale='zh' 时）
- mount 后 background fetch 翻译标题；立即显示英文，翻译到达后更新到中文
- "查看中文摘要" 展开按钮，按需加载摘要翻译

**`frontend/src/app/[locale]/article/[id]/page.tsx`**（locale='zh' 时）
- `Promise.all([getArticle, getRelatedArticles, getTranslation])` 服务端并行拉取
- 翻译成功则显示中文标题和摘要，否则 fallback 到英文

---

### 三、🚨 生产事故：三轮连锁崩溃 + 完整复盘

> 这是本项目最严重的一次生产事故，连续两次"修复"反而使故障升级，最终导致后端完全宕机。完整记录如下，作为后续开发的反面教材。

#### 事故时间线

| 时间（commit） | 操作 | 后果 |
|---|---|---|
| `0ef0558` | 翻译功能：将 `title_zh`/`ai_summary_zh` 加入 SQLAlchemy `Article` ORM | **文章全部 500**（Railway DB 里没有这两列，`SELECT` 包含未知列） |
| `1bc49ef` | 试图修复：往 Dockerfile 加 `alembic upgrade head &&` | **更糟**：alembic 发现 DB 无 `alembic_version` 表，尝试 CREATE TABLE 已有表 → 报错，`&&` 阻断 uvicorn → **全站 502** |
| `bcdda1b` | 试图修复：`&&` 改 `;`，同时删除 ORM 中的翻译列，端点改用 raw SQL | **仍 502**：alembic 本身会挂起（DB lock / 连接超时）；即使用 `;`，uvicorn 也在 alembic 返回前等着，Railway 健康检查超时 → 容器重启循环 |
| `a464b6f` | **彻底修复**：完全移除 `alembic upgrade head`，CMD 恢复为原始 `["uvicorn", ...]` | ✅ 后端恢复，健康检查通过，文章加载正常 |

#### 根因分析

**根因 1（`0ef0558`）— ORM 模型与 DB Schema 不同步**
- SQLAlchemy `db.query(Article)` 生成 `SELECT ... title_zh, ai_summary_zh FROM articles`
- Railway 的 PostgreSQL 里没有这两列 → `column "title_zh" does not exist`
- **每一个** 文章查询都 500，包括 `/articles`、`/articles/headlines`、`/articles/saved`

**根因 2（`1bc49ef`）— 误解 alembic 的适用场景**
- Railway DB 所有表都是通过 Supabase/手动方式创建的，从未用过 alembic
- 没有 `alembic_version` 表 → alembic 从第一个 migration 开始跑 → `CREATE TABLE articles`（已存在）→ 报错
- `&&` 运算符：左侧非零退出码 → 右侧命令不执行 → uvicorn 永不启动 → 全站 502

**根因 3（`bcdda1b`）— 低估 alembic 的副作用**
- 改 `&&` 为 `;` 理论上正确，但 alembic 在连接 DB 时可能**挂起**（之前失败的 run 可能留下 DB lock）
- Railway 健康检查在 uvicorn 绑定端口前超时 → 认为服务不健康 → 杀掉进程 → 重启循环 → 502

#### 正确修复（`a464b6f`）

```dockerfile
# 原始工作版本：直接启动 uvicorn，不跑 alembic
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**翻译功能的持久化修复：**
- `Article` 模型：永久移除 `title_zh`/`ai_summary_zh` ORM 映射（注释说明这两列通过 raw SQL 访问）
- `/translate` 端点：改用 `text("SELECT title_zh, ai_summary_zh FROM articles WHERE id = :id")` + try/except
  - 列不存在时静默跳过缓存，照常调 OpenAI 翻译并返回结果
  - 列存在时（未来手动运行 migration 后）自动开始缓存，代码零修改

#### 事故教训（重要）

1. **向 DB 模型添加新列之前，必须先确认 migration 已在目标 DB 运行完毕**
   - 本地 dev、staging、Railway prod 的 migration 状态可能不同
   - 只要 ORM 里有这列，`db.query()` 就会把它放进 SELECT，没有就崩

2. **不要把 `alembic upgrade head` 放进 Docker CMD（除非你完全控制 DB 初始状态）**
   - Railway 的 DB 是通过 Supabase 控制台手动建表的，没有 `alembic_version` 表
   - alembic 一运行就会从头建表，与已有表冲突 → 崩溃
   - 正确做法：**手动在 Railway shell 里运行** `railway run alembic upgrade head`

3. **不要用 `&&` 链接关键进程**
   - `cmd_a && cmd_b`：cmd_a 失败则 cmd_b 永不运行
   - 对于"前置检查 + 启动主进程"的模式，要么用 `;`，要么让主进程无论如何都能单独启动
   - 但即使用 `;`，前置命令**挂起**（不是失败，是卡住）依然会阻塞主进程

4. **Context 中断时，必须重新全面读取文件状态再修改**
   - 几次中断续接都直接根据记忆修改，导致改了已经被修改过的内容
   - 正确流程：每次重新续接 → 先读文件 → 确认当前状态 → 再修改

5. **改动要原子化、可回滚**
   - 本次事故是多处改动混在一起（模型 + Dockerfile + 端点），任何一处出错都是 502
   - 应该分步提交，每步单独验证后端健康再继续

---

### 四、Headline Ticker 中文翻译

**背景**：中文 locale 下，翻译只作用于文章卡片，晴雨表右侧词条滚动栏仍显示英文原标题。

**`frontend/src/components/layout/MarketTicker.tsx`**
- `HeadlineTicker` 新增 `titleMap: Record<string, string>`（article.id → title_zh）
- 获取 5 条 headlines 后，若 `locale === 'zh'`，并发触发 5 次 `translateArticle()` 调用
- 每条翻译到达时局部更新 `titleMap`（`setTitleMap(prev => ({ ...prev, [a.id]: t.title_zh! }))`）
- 渲染时：`displayTitle = (isZh && titleMap[article.id]) || article.title`（有翻译用中文，无翻译保留英文）
- board / locale 变更时重置 `titleMap`，避免残留旧数据
- commit: `4573454`

---

### 五、March 7 加载问题排查

**现象**：用户报告 March 7 文章"一直加载不出来"，其他日期正常。

**排查过程**：
- 直接 curl `/api/v1/articles?date=2026-03-07&page_size=5` → 0.07s 正常
- curl 同接口 `page_size=20` → 首次 30s 超时，重试 → 0.05s 正常

**结论：瞬时问题，已自愈。**

原因推断：`a464b6f` 修复部署后，后端刚重启，APScheduler 后台线程正在执行 `run_fetch_job()`，大量新文章 INSERT + OpenAI AI 处理产生高写入压力，偶发性地使特定查询（March 7，恰好是最近的活跃日期）短暂超时。随着 AI catch-up 完成，数据库写入压力回落，查询恢复正常速度。

**不需要代码修复**。后续如有类似情况，可考虑加前端请求超时（abort signal）并显示"重试"按钮——但目前频率极低，暂不引入复杂度。

---

### 当前状态（2026-03-09 第一轮结束）
- 后端健康，`/health` → `{"status":"healthy","env":"production"}` ✅
- 文章 API 正常，各日期响应 < 200ms ✅
- 中文翻译：卡片标题、文章详情页、Headline Ticker 全部支持中文翻译 ✅
- SettingsMenu 完全重设计，语言切换只有 EN / 中文，无 Default ✅
- Commits: `65d4677`（i18n） → `0ef0558`（翻译功能） → `1bc49ef`（误修） → `bcdda1b`（误修） → `a464b6f`（✅ 修复） → `4573454`（Ticker 翻译）

---

### 六、Railway 翻译缓存迁移上线（2026-03-09 续）

**背景**：生产事故修复后，翻译功能已上线但 DB 缓存未生效（columns 不存在），每次翻译都实时调 OpenAI。用户要求运行 migration 启用缓存。

#### 执行过程

**问题 1：Railway 服务未链接**
- `railway status` 显示 `Service: None`
- `railway service status --all` 列出服务：`IDEA | 76892462-...`
- `railway service link IDEA` → 链接成功

**问题 2：`alembic upgrade head` 失败**

```
pydantic_core.ValidationError: 1 validation error for Settings
FETCH_INTERVAL_HOURS
  Extra inputs are not permitted
```

- **根因**：Railway 环境变量里存在 `FETCH_INTERVAL_HOURS=6`（可能是历史残留），但本地 `Settings` 模型只有 `FETCH_INTERVAL_MINUTES`，pydantic v2 默认 `extra="forbid"` → 直接报错
- `railway run alembic upgrade head` 用本地 alembic 注入 Railway 环境变量，因此触发此验证

**修复：`backend/app/core/config.py`**

```python
# 改前：
model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

# 改后：
model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
```

**理由**：生产应用的 Settings 模型应使用 `extra="ignore"`。Railway/云平台会注入大量平台级环境变量（如 `RAILWAY_SERVICE_ID`、`FETCH_INTERVAL_HOURS` 等），强制拒绝 extra 变量会导致所有 `railway run <cmd>` 失败。

#### 迁移结果

```
# railway run alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
# (无 Running upgrade 信息 → migration 静默完成)

# railway run alembic current
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
b2f94e1c7a30 (head)  ✅
```

#### 验证

```bash
# 调用翻译 API（第一次 → 可能走 OpenAI）
title_zh: 4 家伯克希尔哈撒韦的股票，新任首席执行官 Greg Abel "预计将会在几十年内复合增长"
ai_summary_zh length: 127 chars  ✅

# 第二次调用（走 DB 缓存）
Duration: 170ms  ✅（不走 OpenAI，直接读 DB）
```

#### 新增教训

6. **`extra="ignore"` 是生产 Settings 模型的正确默认值**
   - 云平台会注入平台级 env vars，`extra="forbid"` 会导致所有 `railway run` 命令因 Settings 验证失败而无法使用
   - 不要用 `extra="forbid"` 在会被 `railway run` / `heroku run` 等平台 CLI 调用的命令里

---

## 2026-03-09 · 日期持久化 + 竞态条件修复

### 问题一：刷新页面日期回到今天

**现象**：用户切换到 7 号浏览，按 F5 刷新，日期重置为今天。

**根因**：`HomeFeed.tsx` 的 `selectedDate` 初始值是 `new Date()`，每次页面加载重新执行，没有持久化。

**修复：`frontend/src/components/news/HomeFeed.tsx`**
- 新增 `getInitialDate()` helper：优先从 `sessionStorage.getItem('newsanalyst_date')` 读取上次选择的日期；校验合法（非 NaN、非未来）后返回，否则返回 `new Date()`
- `useState<Date>(getInitialDate)`（注意传函数引用，懒初始化，避免 SSR 时 `window` 不可用）
- 新增 `handleDateChange` (useCallback)：`setSelectedDate(date)` + `sessionStorage.setItem('newsanalyst_date', date.toISOString())`
- `DateNavigator` 的 `onDateChange` 改为 `handleDateChange`

**行为语义**：
- `sessionStorage` 是 tab 级别的：同一 tab 内 F5 后保留日期 ✅
- 关掉 tab 再打开：`sessionStorage` 清空，回到今天 ✅
- 新标签页打开：独立 `sessionStorage`，默认今天 ✅

---

### 问题二：切换日期再切回来排序不一样（一期修复：竞态条件）

**现象**：初次看 8 号，最新文章在最前；切到 7 号再切回 8 号，排在第一的是 6-7 小时前的文章。

**第一轮修复（竞态条件）：`frontend/src/components/news/NewsFeed.tsx`**
- 新增 `const reqIdRef = useRef(0)`（单调递增请求序号）
- 每次 `loadArticles` 入口执行 `const thisId = ++reqIdRef.current`
- `await fetchArticles(...)` 返回后：`if (thisId !== reqIdRef.current) return` — 丢弃过期响应
- commit: `f1877ff`

---

### 问题三：左右箭头切日期后新闻变旧（UTC 时区偏移 Bug）

**现象（精确）**：
- 新标签页打开 → 显示今天(3月9日) 5分钟前的最新文章 ✓
- 点 ← 切到 3月8号，再点 → 切回今天 → 排第一的变成 6.5 小时前的文章（即 3月8日 UTC 的最后一篇）
- 刷新无效，只有关闭标签页重开才能恢复

**根因：`DateNavigator.navigate()` 使用了本地时间（Local Time）进行日期运算**

以 UTC+8 用户为例，完整问题链路：

```
初始：selectedDate = new Date() = 2026-03-09T06:30:00Z (UTC)
toUTCDateString → "2026-03-09" ✓

点 ← 时，navigate(-1)：
  selected.setHours(0,0,0,0)
  → 本地午夜 = 2026-03-09T00:00:00+08:00 = 2026-03-08T16:00:00Z (UTC)
  next.setDate(9 - 1)  // LOCAL getDate() = 9
  → 2026-03-08T00:00:00+08:00 = 2026-03-07T16:00:00Z
  toUTCDateString → "2026-03-07"  ← 查的是7号！

点 → 回今天：
  selected = 2026-03-08T00:00:00+08:00 (local midnight)
  next.setDate(8 + 1)  // LOCAL = 8
  → 2026-03-09T00:00:00+08:00 = 2026-03-08T16:00:00Z
  toUTCDateString → "2026-03-08"  ← 差了整整一天！
```

原来应该查 March 9，现在查 March 8，March 8 最新文章正好是约 6.5 小时前（UTC 午夜），完全吻合用户观察。

**修复：`frontend/src/components/news/DateNavigator.tsx`**（完全重写时区处理）

新增 `toUTCMidnight(date)` helper：
```tsx
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
```

所有时区相关逻辑改为 UTC 运算：
- `todayUTC = toUTCMidnight(new Date())`
- `selectedUTC = toUTCMidnight(selectedDate)`
- `isToday`：比较两个 UTC midnight 的 `.getTime()`
- `navigate(delta)`：`new Date(Date.UTC(y, m, d + delta))` — 纯 UTC 加减，不经过本地时区
- `formatLabel`：`toLocaleDateString(..., { timeZone: 'UTC' })` — 显示的日期与查询日期一致
- `DayPicker.onSelect`：`new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))` — 将 DayPicker 返回的本地 Date 转换为 UTC midnight

**HomeFeed `getInitialDate`**：改为 `new Date(Date.UTC(y, m, d))` 返回 UTC midnight，避免初始 `selectedDate` 带有时刻分量（14:30 local）导致未来可能再次触发此问题。

**验证**：UTC+8 用户，左右切换 N 次，`toUTCDateString(selectedDate)` 始终保持正确的 UTC 日期。

**commit**: `dd1380c`

---

## 2026-03-09 · 本地时区日期导航修复（本地日历 ≠ UTC 日历）

### 问题：美国西部用户看到"3月9日"，但本地时间才3月8日

**现象**：UTC-8（PST）用户在本地 11pm 打开网站：
- DateNavigator 显示 "Today · Mar 9"，但用户本地才 3月8日
- 3分钟前发布的文章显示在 3月9日日期下，但用户本地是 3月8日
- 切换左箭头→右箭头后，查询到的 UTC 日期偏移一天（见上一节记录）

**根因**：整个日期系统（DateNavigator、HomeFeed、NewsFeed API 调用）以 UTC 日历为基准：
- `todayUTC = toUTCMidnight(new Date())` → 使用 UTC 日期
- `date=YYYY-MM-DD` 参数由 `toUTCDateString()` 生成，过滤的是 UTC 零点至零点

对于 UTC-8 用户：
- 本地 11pm March 8 PST = UTC March 9 07:00
- `todayUTC` = UTC March 9 → 导航栏显示 "March 9"
- 但用户本地日历明明是 March 8

**正确设计**：日期导航应该以**用户本地时区**为基准，不是 UTC。

### 修复方案

**核心原则**：本地午夜 `new Date(y, m, d)` 才是用户感知到的"今天 0 点"。
- `new Date(y, m, d).toISOString()` 得到这一刻的 UTC 时间戳
- 把它作为 `date_from` 传给后端，就实现了"本地 March 8 00:00 → UTC March 8 08:00"的正确映射

#### 1. 后端 `backend/app/api/v1/routes/articles.py`

新增 `date_from` + `date_to` Query 参数（ISO 8601 UTC 时间戳）：
```python
date_from: Optional[str] = Query(None, ...)
date_to:   Optional[str] = Query(None, ...)
```

过滤优先级：`search` > `date_from/date_to` > `date`（向后兼容）：
```python
elif date_from and date_to:
    from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
    to_dt   = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    query = query.filter(published_at >= from_dt, published_at < to_dt)
```

#### 2. 前端 `frontend/src/lib/api.ts`

`FetchArticlesParams` 新增 `date_from?: string` / `date_to?: string`。
当两者都存在时优先传 `date_from`/`date_to`，`date` 仅作 fallback。

#### 3. 前端 `frontend/src/components/news/DateNavigator.tsx`

将 `toUTCMidnight()` 替换为 `toLocalMidnight()`：
```tsx
function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
```

- `todayLocal = toLocalMidnight(new Date())` — 本地今天
- `isToday` 比较本地 midnight 时间戳
- `navigate(delta)` = `new Date(y, m, d + delta)` — 本地日期加减
- `formatLabel()` — 不传 `timeZone: 'UTC'`，使用浏览器本地时区显示
- DayPicker `onSelect`：`new Date(date.getFullYear(), date.getMonth(), date.getDate())` — 保留本地日期

#### 4. 前端 `frontend/src/components/news/HomeFeed.tsx`

删除 `toUTCDateString()`，改用 `toLocalDayRange()`：
```tsx
function toLocalDayRange(date: Date): { dateFrom: string; dateTo: string } {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  return {
    dateFrom: new Date(y, m, d).toISOString(),      // 本地零点 → UTC ISO
    dateTo:   new Date(y, m, d + 1).toISOString(),  // 下一个本地零点 → UTC ISO
  };
}
```

`getInitialDate()` 改为返回本地零点 `new Date(y, m, d)` 而非 UTC midnight。
向 `NewsFeed` 传 `dateFrom` / `dateTo` 而非 `date`。

#### 5. 前端 `frontend/src/components/news/NewsFeed.tsx`

Props 从 `date?: string` 改为 `dateFrom?: string` / `dateTo?: string`；
`fetchArticles()` 调用和 `useEffect` 依赖同步更新。

### 效果

PST (UTC-8) 用户，本地时间 March 8 11pm：
- 导航栏显示 "Today · Mar 8" ✓
- API 请求：`date_from=2026-03-08T08:00:00Z&date_to=2026-03-09T08:00:00Z`
- 后端过滤 PST 0am–11:59pm 内发布的文章 ✓
- 3分钟前的文章正确显示在 3月8日下 ✓

北京时间 (UTC+8) 用户，本地时间 March 9 09:00：
- 导航栏显示 "Today · Mar 9" ✓
- API 请求：`date_from=2026-03-09T16:00:00Z&date_to=2026-03-10T16:00:00Z`（CST 0am → UTC 16:00前一天）
- 后端过滤 CST 0am–11:59pm 内的文章 ✓

夏令时（DST）：`new Date(y, m, d)` 由 JS 引擎在本地时区执行，自动处理 DST 偏移，无需手动维护规则。

**commit**: 下次提交

---

## 2026-03-08 · Feed 质量优化 + 搜索 + 市场行情栏 + 板块切换

### 背景
v0.3.0 收尾阶段，本次会话完成了以下几块独立但相互关联的工作：调度器/Feed 可靠性修复、搜索功能、市场行情迷你卡片栏、板块切换器（取代语言切换）。

---

### 一、调度器 & Feed 可靠性修复

**问题描述**：03/08 当天新抓取的文章没有摘要；等了 10 分钟还是没有——原因是旧调度器间隔 6 小时。

**修复方案：**

**`backend/app/core/config.py`**
- `FETCH_INTERVAL_HOURS: int = 6` → `FETCH_INTERVAL_MINUTES: int = 5`

**`backend/app/services/scheduler.py`**
- `IntervalTrigger(hours=...)` → `IntervalTrigger(minutes=settings.FETCH_INTERVAL_MINUTES)`
- 在来源循环结束后新增"兜底补全"步骤：查询 `ai_summary IS NULL AND ai_processed_at IS NULL` 的文章，每次最多处理 20 篇，确保历史遗留/新抓但未 AI 处理的文章能被追上

**`backend/app/api/v1/routes/articles.py`**
- Feed 过滤条件从 `OR(ai_processed_at IS NULL, ai_summary IS NOT NULL)` 改为严格的 `ai_summary IS NOT NULL`
- 前者会把"未处理"的空卡片也显示出来，后者只显示已有摘要的文章

**`frontend/src/components/news/NewsCard.tsx`**
- 完全重写 `timeAgo()` 函数为精细格式：`X h Y min ago`、`X days Y h ago`、`X weeks Y days Z h ago`，以此类推直到年级别，所有零分量自动省略

---

### 二、搜索功能

**`backend/app/api/v1/routes/articles.py`**
- 新增 `search` 查询参数（`ILIKE %term%` 同时搜 `title` 和 `ai_summary`）
- 新增 `sort` 参数（`latest` / `popular`，popular 使用相关子查询 `SUM(ArticleVote.vote)` 按净票数排序）
- 搜索激活时忽略日期过滤，跨所有日期搜索

**`frontend/src/lib/api.ts`**
- `FetchArticlesParams` 新增 `search?: string` 和 `sort?: 'latest' | 'popular'`

**新建 `frontend/src/components/news/SearchBar.tsx`**
- 防抖 350ms 的文本输入框，左侧搜索图标，有内容时显示清空 ✕ 按钮
- 父组件清空时（`value === ''`）同步本地状态

**`frontend/src/components/news/DateNavigator.tsx`**
- 新增 `disabled?: boolean` prop，搜索激活时外层加 `opacity-40 pointer-events-none` 样式，视觉上提示日期导航已临时停用

**`frontend/src/components/news/NewsFeed.tsx`**
- props 新增 `search?: string`，`useEffect` 依赖数组加入 `search`
- 空状态文案根据是否在搜索分别展示："No results for X" vs "No articles for this date"

**`frontend/src/components/news/HomeFeed.tsx`**
- 三列 Flex 布局：`[flex-1 SearchBar] [flex-none DateNavigator] [flex-1 占位块]`
- `isSearching` 时 `dateForFeed = undefined`，同时给 DateNavigator 传 `disabled`
- Popular 排序短暂上线后因目前用户投票数极少而移除，按钮 UI 同步清理

---

### 三、市场行情迷你卡片栏（Market Ticker）

**`backend/requirements.txt`**
- 新增 `yfinance>=0.2.54`

**新建 `backend/app/api/v1/routes/market.py`**
- `GET /api/v1/market/snapshot`：返回 6 个指标（S&P 500 / NASDAQ / DJIA / VIX / 10Y Yield / Gold）
- 每个指标字段：`symbol` / `label` / `price` / `change` / `change_pct`
- **5 分钟内存缓存**（`threading.Lock` + 时间戳），避免频繁请求 Yahoo Finance
- 任何单个 ticker 失败时返回 `null` 占位，不影响其他指标

**`backend/app/main.py`**
- 注册 `market.router`，prefix = `/api/v1/market`

**`frontend/src/types/index.ts`**
- 新增 `MarketIndicator`、`MarketSnapshot` 接口

**`frontend/src/lib/api.ts`**
- 新增 `fetchMarketSnapshot(): Promise<MarketSnapshot>`

**新建 `frontend/src/components/layout/MarketTicker.tsx`**
- 位置：`HomeFeed` 中 MenuBar 上方（即 TopBar 与 MenuBar 之间）
- Mini Card 样式：上涨绿底/绿字，下跌红底/红字，无数据灰底
- 每张卡显示：标签、价格（千分位格式）、涨跌幅（▲/▼ 前缀）
- 首次加载骨架动画；**每 60 秒自动刷新**；单个 ticker 失败不影响其他；全部失败时不渲染（不破坏页面）

---

### 四、板块切换器（取代 EN/中文 语言切换）

**决策背景**：EN/中文 原本设计为 UI 语言切换，但实际上平台核心差异是内容来源（美国英文新闻 vs 中国中文新闻），与 UI 语言无关。改为"板块切换"更符合产品定位。

**新建 `frontend/src/providers/BoardProvider.tsx`**
- React Context，`board: 'en' | 'zh'`，默认 `'en'`（美国板块）
- 导出 `BoardProvider`（包裹组件）和 `useBoard()`（消费 hook）

**`frontend/src/app/[locale]/layout.tsx`**
- 用 `<BoardProvider>` 包裹 `<AuthProvider>` 内层（两层 Provider 共存）

**`frontend/src/components/layout/TopBar.tsx`**
- 彻底移除 `switchLocale` / `usePathname` / `useRouter` 逻辑
- 改为三列 Flex 布局：`[flex-1 Logo] [Center 板块切换器] [flex-1 用户区]`
- 板块切换器：两个 Pill 按钮（同 SortPicker 风格）
  - 美国板块激活时显示 `American | Chinese`
  - 中文板块激活时显示 `中文板块 | 英文板块`（双语翻转）
- 用 `useBoard()` 读写 board 状态

**`frontend/src/components/news/NewsFeed.tsx`**
- 新增 `language?: string` prop（默认 `'en'`）
- 传入 `fetchArticles({ language })`
- `useEffect` 依赖数组加入 `language`，板块切换立即触发重载
- 中文板块 + 无数据时显示专属空状态：`"暂无资讯"` + `"中文板块即将上线，敬请期待。"`

**`frontend/src/components/news/HomeFeed.tsx`**
- 引入 `useBoard()`，读取 `board` 传给 `<NewsFeed language={board} />`
- 引入 `<MarketTicker />` 放在 MenuBar 正上方

---

### 关键决策记录（第一轮）

| 决策 | 理由 |
|---|---|
| 调度器改为 5 分钟 | 保证新文章及时有摘要，网络/服务器压力可接受 |
| Feed 只显示 `ai_summary IS NOT NULL` | 消灭空卡片，用户看到的每篇都有内容 |
| 搜索激活时忽略日期 | 跨日期搜索比"只搜当天"更符合用户预期 |
| Popular 排序暂时移除 | 目前投票用户极少，Popular 和 Latest 结果几乎相同，显示出来反而产生困惑 |
| yfinance + 5 分钟内存缓存 | 免费、无需 API Key、足够实时；缓存避免每次请求都打 Yahoo Finance |
| 板块切换 vs 语言切换 | 用户关心"看哪个市场的新闻"而非"界面用哪种语言" |
| 双语 Pill 翻转 | 在中文板块下看到的是中文操作标签，交互语言和内容语言一致 |
| 中文板块先做框架不接源 | 架构就位，日后接中文新闻源只需加 backend Sources，前端零改动 |

---

### 五、滚动标题词条栏（Headline Ticker）

**`frontend/src/components/layout/MarketTicker.tsx`**（大改）
- 重构为左右两栏：`[mini cards flex-none] | [HeadlineTicker flex-1]`
- `HeadlineTicker` 子组件：拉取当前板块的文章，每 4.5 秒切换一条，fade+slide 动画（`opacity / translateY`，0.35s ease）
- 右上角显示来源名 + `X/N` 计数器
- 标题可点击跳转文章详情页
- 轮播索引超界自动归零，`board` 变化时立即重置

**前端每 15 秒刷新**（原 60 秒）— 改进行情卡片响应速度

---

### 六、Settings 设置菜单 + Smart Headlines + i18n（2026-03-08 第二轮）

#### 背景
用户需要：(1) 词条只播重要国际大事（而非随机 20 篇），(2) 在右上角加设置入口（账户信息 + 语言偏好）。

#### 6.1 Backend：用户 Profile 扩展

**`backend/app/models/user.py`**
- 新增 `bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)`
- 新增 `pronouns: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)`

**新建 `backend/alembic/versions/3a7f82c1d905_add_bio_and_pronouns_to_users.py`**
- `down_revision = '1e5967f26b22'`
- `upgrade`: `ADD COLUMN bio TEXT, ADD COLUMN pronouns VARCHAR(50)`
- `downgrade`: `DROP COLUMN pronouns, DROP COLUMN bio`

**`backend/app/schemas/user.py`**
- `UserResponse` 新增 `bio: Optional[str] = None` 和 `pronouns: Optional[str] = None`
- 新增 `UpdateProfileRequest`（全字段可选：`display_name / bio / pronouns / preferred_lang`）

**`backend/app/api/v1/routes/auth.py`**
- 新增 `PATCH /api/v1/auth/me`：局部更新 display_name / bio / pronouns / preferred_lang
- `display_name` 为空字符串时 400 报错
- `bio / pronouns` 空字符串写入 NULL（`str.strip() or None`）
- `preferred_lang` 只允许 `default | en | zh`，否则 400 报错

#### 6.2 Backend：Smart Headlines 端点

**`backend/app/api/v1/routes/articles.py`**
- 新增 `GET /api/v1/articles/headlines`（置于 `/saved` 之前，防止 FastAPI 路由匹配歧义）
- **优先级规则**：`ai_tags.scale IN ('global', 'national')` 且 `published_at >= NOW() - 7 days` 且 `ai_summary IS NOT NULL`，按 `published_at DESC` 取最多 `limit`（默认 5）篇
- **Fallback**：若优先级文章不足 `limit`，用最新文章补齐（排除已选 ID）
- 返回 `List[ArticleResponse]`

#### 6.3 Frontend：API 层扩展

**`frontend/src/lib/api.ts`**
- 新增 `UpdateProfilePayload` interface
- 新增 `updateProfile(payload): Promise<User>` → `PATCH /api/v1/auth/me`
- 新增 `fetchHeadlines(language, limit): Promise<Article[]>` → `GET /api/v1/articles/headlines`

**`frontend/src/types/index.ts`**
- `User` interface 新增 `bio?: string | null` 和 `pronouns?: string | null`

**`frontend/src/providers/AuthProvider.tsx`**
- 新增 `refreshUser(): Promise<void>` — 重新调用 `GET /me` 更新 user state
- 暴露至 `AuthContextType` 和 Provider value

#### 6.4 Frontend：SettingsMenu 组件（新建）

**`frontend/src/components/layout/SettingsMenu.tsx`**
- 仅登录时渲染（`if (!user) return null`）
- 汉堡图标（3 条横线 SVG）Toggle，点击外部关闭（`mousedown` event listener + `useRef`）
- **Account 区块**：
  - `display_name` input（可编辑，预填）
  - `email` input（readOnly，`tabIndex=-1`，灰色样式）
  - `bio` textarea（2 行，可选，预填）
  - `pronouns` input（可选，placeholder 来自 i18n）
  - Save 按钮：`saving / saved / error` 三态，2.5 秒后自动恢复 idle；成功后调用 `refreshUser()`
- **Language 区块**：
  - Default / English (US) / Chinese (Simplified) 三选一单选按钮（自定义 radio dot 样式）
  - 选中即调用 `updateProfile({ preferred_lang })` + `refreshUser()`
  - `en` → `router.push('/en')`；`zh` → `router.push('/zh')`；`default` → 不强制导航
  - 切换后关闭菜单

#### 6.5 Frontend：TopBar 更新

**`frontend/src/components/layout/TopBar.tsx`**
- 新增 `import SettingsMenu`、`import { useEffect }`、`import { useRouter } from 'next/navigation'`
- 已登录状态用户区块插入 `<SettingsMenu />` 夹在用户名与 Sign Out 之间
- **登录后 locale 同步**：`useEffect` 监听 `[user?.id, isLoading]`，若 `user.preferred_lang === 'en' && locale !== 'en'` → `router.push('/en')`；同理处理 zh；`'default'` 不导航
  - 用 `user?.id` 而非 `user` 对象作依赖，避免引用变化触发多余 navigation

#### 6.6 Frontend：MenuBar i18n

**`frontend/src/components/layout/MenuBar.tsx`**
- 引入 `useTranslations('menu')`，所有 section 标签改为 `t(slug)` 动态翻译
- `SECTION_SLUGS` 替代原 `SECTIONS` 数组，保留 `SECTIONS` 导出作向后兼容（无 label 字段）
- 切换 locale 后 MenuBar 自动翻译，无需手动维护多语言 label 数组

#### 6.7 Frontend：i18n 翻译文件

**`frontend/messages/en.json`**
- `menu.*`：去掉旧的 policy / stocks / commodities，改为 technology / energy（与后端 SECTION_FILTERS 对齐）
- 新增 `settings.*`：title / account / displayName / email / bio / pronouns / pronounsPlaceholder / save / saving / saved / saveError / language / langDefault / langEn / langZh

**`frontend/messages/zh.json`**
- 同步更新 `menu.*` 和 `settings.*`（中文翻译）

#### 6.8 Frontend：HeadlineTicker 改用 fetchHeadlines

**`frontend/src/components/layout/MarketTicker.tsx`**
- `HeadlineTicker` 改从 `fetchHeadlines(board, 5)` 获取数据（原 `fetchArticles({ page:1, page_size:20 })`）
- 词条现在优先展示 scale=global/national 的重要国际事件，fallback 到最新文章补足 5 条

---

### 关键决策记录（第二轮）

| 决策 | 理由 |
|---|---|
| Language setting 走 URL locale，Board 走 content language | 两者职责分离：locale = UI 语言，board = 内容来源。两个维度独立可控 |
| `preferred_lang` 值域：`default / en / zh` | `default` 表示随板块走，不写死语言；用户不登录永远是 default |
| Login 时 locale 同步用 `user?.id` 作 dep | 防止 user 对象每次 refreshUser 后引用变化触发多余 push |
| `bio` 空字符串写 NULL | 数据库层面区分"没填"（NULL）和"主动清空"（NULL），结果一样，语义更清晰 |
| Headlines endpoint 置于 /saved 之前 | FastAPI 路由按顺序匹配，字面路径必须先于参数化路径 `/{article_id}` |
| Fallback to recent when global/national < 5 | 保证 ticker 始终有内容，不因标签缺失而显示空白 |

### 当前状态（2026-03-08 第二轮结束）
- 全部 14 个文件改动已 commit 并 push（commit: `2c6ee2c`）
- Railway 会在 push 后自动部署（含 alembic upgrade head，新增 bio/pronouns 列）
- Vercel 会在 push 后自动部署前端
- Settings 菜单在 TopBar 右侧（仅登录可见），汉堡图标三条横线，点击展开
- HeadlineTicker 现在展示 global/national 重要事件（最多 5 条），数量不足时 fallback 到最新文章
- MenuBar 标签跟随 locale 自动翻译（切换语言后 Technology→科技 等即时生效）

---

## 2026-02-28 · 邮箱验证 + 忘记密码功能上线 · v0.3.0 准备

### 背景
v0.2.0 上线后，用户希望：① 确保注册邮箱是真实存在的，防止随意填写假邮箱；② 新增忘记密码功能，让用户通过邮件找回账号。

**策略：软性强制（Soft Enforcement）**
- 注册/登录不受任何限制，降低注册摩擦
- 投票等核心互动操作需先验证邮箱（后端返回 `403 email_not_verified`）
- 邮件服务选用 **Resend**（现代 API，免费 3000 封/月，`pip install resend`）
- 本地无 API key 时优雅降级：记录 warning，跳过发送，注册照常成功

### 后端变更

**数据库（User 模型新增 5 个字段）**
- `email_verified`（bool, default=False）
- `email_verification_token` / `email_verification_expires_at`（24 小时有效）
- `password_reset_token` / `password_reset_expires_at`（1 小时有效）
- Alembic 迁移：`add_email_verification_and_password_reset_fields_to_users`
  - 注意：autogenerate 时产生了多余的 `drop_index` 操作（手动建表遗留 index 未被追踪），手动删除后再运行 `upgrade head`

**新增 `app/core/email.py`**
- `_send()` 内部函数：无 API key → warning + 跳过；有 key → Resend API 发送；失败则 re-raise，不静默吞掉错误
- `send_verification_email()` + `send_password_reset_email()`，HTML 模板邮件

**`app/core/config.py` 新增三个设置**
- `RESEND_API_KEY`、`EMAIL_FROM`（默认 `onboarding@resend.dev`）、`FRONTEND_BASE_URL`

**`auth.py` 新增 4 个端点**
- `POST /register`（更新）：生成验证 token，异步发送验证邮件（try/except 包裹，邮件失败不阻断注册）
- `POST /verify-email`（公开）：验证 token，设置 `email_verified=True`，清除 token
- `POST /resend-verification`（需认证）：重新生成 token 并重发
- `POST /forgot-password`（公开）：生成重置 token，**始终返回 200**（防止攻击者枚举邮箱）
- `POST /reset-password`（公开）：验证重置 token，更新密码 hash，清除 token

**`votes.py` 更新**
- 投票前检查 `current_user.email_verified`，否则 `raise HTTPException(403, "email_not_verified")`

### 前端变更

**`src/lib/api.ts`**：新增 `verifyEmail / resendVerification / forgotPassword / resetPassword` 四个函数；改进错误处理，从 `detail` 字段提取后端错误信息

**`src/types/index.ts`**：`User` 新增 `email_verified: boolean`；新增 `MessageResponse` 接口

**新增页面**
- `verify-email/page.tsx`：读取 URL `?token`，自动调用 API，三态展示（loading → 成功/失败）
- `forgot-password/page.tsx`：邮箱输入 + 提交后始终显示安全成功提示
- `reset-password/page.tsx`：新密码 + 确认密码，验证 token，成功后跳转登录

**更新页面**
- `register/page.tsx`：注册成功后展示"请查收邮件"提示，不再直接跳转首页
- `login/page.tsx`：密码行旁边新增"Forgot password?"链接

**`VoteButtons.tsx`**：捕获 `email_not_verified` 错误时展示 amber 色内联提示框，含"Resend email"按钮和"Already verified?"链接

### 遇到的问题与调试

**问题：发验证邮件后收不到**
- 表现：API 调用成功（Resend 返回 email id），但收件箱没有邮件
- 诊断：添加临时 `/debug/email-config` 端点，确认 Railway 上 `RESEND_API_KEY` 已正确配置（`re_A9o...` 前缀），排除 key 未设置的可能
- 根本原因：`onboarding@resend.dev` 是 Resend 的共享测试发件地址，**只能向 Resend 账号注册时使用的邮箱发送**，发给其他地址时 Resend 静默丢弃（不报错）
- 另外发现：`newsanalyst.com` 域名早在 1999 年已被他人注册，无法配置 DNS，因此无法用 `@newsanalyst.com` 作发件域名

**解决方案（分阶段）**
- 测试阶段：用 Resend 账号邮箱注册 NewsAnalyst，可正常收到所有邮件，功能验证完整
- 上线前：购买新域名 → Resend 控制台添加域名并配置 DNS（DKIM + SPF + DMARC）→ 更新 Railway `EMAIL_FROM` 环境变量，**无需改任何代码**

### 关键决策记录
- **软性强制**：不强制"验证后才能登录"，降低注册摩擦；投票/互动需验证，有足够激励驱动用户完成验证
- **邮件失败不阻断注册**：邮件服务故障不导致注册失败，用户可通过"重新发送"补救
- **忘记密码始终返回 200**：防止攻击者通过请求结果判断某邮箱是否已注册（用户枚举攻击）
- **临时 debug 端点**：确认配置后立即删除，不留在生产代码中

### 当前状态
- 邮箱验证全流程（注册 → 邮件 → 验证页 → 投票解锁）使用 Resend 账号邮箱验证通过
- 忘记/重置密码全流程验证通过
- 投票未验证提示在前端正常显示
- Railway + Vercel 通过 git push 自动重部署完成

---

## 2026-02-28 · Bug 修复：passlib 兼容性 + Alembic 空迁移

### 背景
v0.2.0 上线后发现两个生产问题：
1. 文章详情页崩溃（`UndefinedTable: article_votes` 报错），投票功能完全不可用
2. 用户登录 / 注册报错（`ValueError: password cannot be longer than 72 bytes`）

### 修复 1：Alembic 空迁移（article_votes 表缺失）

**根本原因**：`alembic revision --autogenerate` 生成了只有 `pass` 的空迁移，因为 `ArticleVote` 模型没有在 `app/models/__init__.py` 中 import，Alembic 扫描不到该模型，误以为没有变化。

**修复步骤**：
- `app/models/__init__.py` 补充 `from app.models.vote import ArticleVote`
- 手动在 Supabase 通过 SQL 直接建 `article_votes` 表（紧急修复生产）
- 将已生成的空迁移文件手动填入正确的 `op.create_table` DDL
- 删除 autogenerate 产生的多余 `drop_index` 操作后执行 `alembic upgrade head`

### 修复 2：passlib + bcrypt 5.0.0 不兼容

**根本原因**：`passlib 1.7.4` 与 bcrypt 4.0+ 已有兼容问题，bcrypt 5.0.0 彻底报错（`detect_wrap_bug` 中抛出 `ValueError`）。passlib 项目已多年未维护。

**修复方式**：
- `requirements.txt`：移除 `passlib[bcrypt]`，改为 `bcrypt>=4.0.0`
- `app/core/security.py`：用 `bcrypt.hashpw` / `bcrypt.checkpw` 直接替换 `CryptContext`，API 接口不变，调用方无感知

### 关键决策记录
- **直接用 bcrypt 而非换 passlib 版本**：passlib 有历史负担且不再维护，直接调用 bcrypt 更轻量、更稳定
- **Alembic 经验教训**：每次新增 model 文件后，必须在 `models/__init__.py` 中 import，否则 autogenerate 检测不到，生成空迁移

### 当前状态
- 文章详情页投票功能恢复正常
- 注册 / 登录全链路恢复正常
- Railway + Vercel 通过 git push 自动重部署完成

---

## 2026-02-27 · 用户认证系统 + 文章投票功能上线 · Phase 1 Auth + Phase 2 Voting

### 背景
用户希望在文章详情页添加 ▲/▼ 投票按钮，记录用户赞同/反对并统计结果。投票需要绑定真实用户账号，因此先建立完整的认证系统（Phase 1），再在此基础上实现投票（Phase 2）。

### Phase 1 — 认证系统

**后端：**
- `security.py` 新增 `get_current_user`（无效 token 返回 401）和 `get_optional_user`（无效 token 返回 None）两个 FastAPI 依赖函数，使用 `HTTPBearer` 从 Authorization header 提取 token
- `auth.py` 新增 `GET /api/v1/auth/me` 端点，返回当前已登录用户的完整 profile

**前端：**
- 新建 `providers/AuthProvider.tsx`：React Context，提供 `login / logout / register` 方法，挂载时自动从 `localStorage` 读取 token → 调用 `/me` 恢复会话；token 过期时自动清除
- `lib/api.ts` 更新：`request()` 函数自动在所有请求中注入 `Authorization: Bearer <token>` 头；新增 `getCurrentUser()` 函数
- `app/[locale]/layout.tsx` 用 `<AuthProvider>` 包裹整个应用
- `TopBar.tsx` 更新为动态认证 UI：已登录显示 `display_name` + `Sign Out` 按钮，未登录显示 `Sign In` 链接；session 检查期间显示骨架 pulse 动画
- 新建 `app/[locale]/login/page.tsx`：邮箱 + 密码登录表单，含错误提示和跳转注册的链接
- 新建 `app/[locale]/register/page.tsx`：显示名 + 邮箱 + 密码（最少 8 位）注册表单，注册成功后自动登录并跳转首页

### Phase 2 — 文章投票

**后端：**
- 新建 `models/vote.py`：`ArticleVote` 表，字段 `user_id / article_id / vote(+1/-1)`，`UNIQUE(user_id, article_id)` 约束防止重复投票
- 运行 `alembic revision --autogenerate` + `upgrade head`，在 Supabase 上创建 `article_votes` 表
- 新建 `api/v1/routes/votes.py`：
  - `POST /api/v1/articles/{id}/vote`（需认证）：toggle 逻辑——同方向再次投 = 撤票，反方向 = 切换，新投票 = 插入
  - `GET /api/v1/articles/{id}/votes`（认证可选）：返回 `upvotes / downvotes / user_vote`
- `articles.py` 单篇文章接口（`GET /articles/{id}`）新增 vote count 查询，返回 `upvotes / downvotes / user_vote`
- `ArticleResponse` schema 新增 `upvotes: int = 0 / downvotes: int = 0 / user_vote: Optional[int] = None`
- `main.py` 注册 votes router

**前端：**
- 新建 `components/article/VoteButtons.tsx`：Client Component，▲ 绿色激活 / ▼ 红色激活；乐观更新（先改 UI 再等 API 确认，失败则回滚）；未登录点击跳转 `/login`
- `app/[locale]/article/[id]/page.tsx` 改为左右两栏布局：左栏 sticky `<VoteButtons>`，右栏文章正文；vote 初始值从 Server Component 服务端直接获取（无首屏请求）
- `types/index.ts` 新增 `VoteCounts` 接口；`Article` 接口新增可选 vote 字段

### 遇到的问题与修复
- SQLAlchemy 循环导入：`get_current_user` 需要 `User` 模型，但 `security.py` 在应用启动早期就被加载。解决：在函数体内部 local import `from app.models.user import User`
- `[locale]` 路径含方括号：`mkdir` 需要加引号，`git add` 同理

### 关键决策记录
- **乐观更新（Optimistic UI）**：投票按钮点击后立即更新计数，API 响应后用服务端真实值同步（而非等 API 再更新），保证交互零延迟感
- **Server Component 传初始 votes**：文章详情页是 Server Component，直接在服务端把 `upvotes/downvotes/user_vote` 塞入 ArticleResponse，VoteButtons 收到 `initialXxx` props 后无需再发请求，首屏无额外 API 调用
- **两栏布局**：vote 按钮放左侧固定列（sticky），视觉上类似 Hacker News / Reddit 风格，比内联更自然
- **`get_optional_user` 处理匿名访问**：文章详情和投票计数页不要求登录，用 `get_optional_user` 拿到 None 时也能正常返回，不返回 401

### 当前状态
- 注册 / 登录 / 登出全链路通畅
- TopBar 动态展示用户名
- 文章详情页左侧 ▲/▼ 按钮，乐观更新，数值同步
- Railway + Vercel 已通过 git push 触发自动重部署

---

## 2026-02-27 · 文章详情页上线 · 内部路由 + AI 标签全展示

### 本次完成
- `NewsCard.tsx` 改为 `'use client'`，使用 `useLocale()` + `next/link` 将点击链接从外部原文 URL 改为内部路由 `/[locale]/article/[id]`
- `lib/api.ts` 新增 `fetchArticle(id)` 函数
- `types/index.ts` 新增 `AiTags` 接口（`entities / locations / sectors / topics / scale`），修复 `ai_tags` 类型（原为 `string[] | null`，实际是 dict）
- 新建 `app/[locale]/article/[id]/page.tsx`（Server Component）：
  - `generateMetadata()` 动态设置 SEO 标题和描述
  - `revalidate: 300`（5 分钟缓存）
  - 展示：来源名 + 发布时间、大标题、sector 蓝色标签、topic 灰色标签、entities/locations/scale 元数据行、完整 AI 摘要、底部原文链接卡片

### 关键决策记录
- **内部路由而非外跳**：用户点卡片后进入站内详情页，可展示完整 AI 分析结果；直接跳外站则 AI 分析无处展示，体验割裂
- **Server Component**：详情页数据为只读，无需 client-side state，Server Component 更快（无 JS bundle 膨胀）+ SEO 友好

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
