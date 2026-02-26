# Database Structure

> 数据库：PostgreSQL（托管于 Supabase Pro）
> ORM：SQLAlchemy 2.0+
> 迁移工具：Alembic

---

## 表关系总览 Entity Relationship Overview

```
Users ──────────────────────── UserSavedArticles
                                       │
Sources ──── Articles ─────────────────┘
                │
                └──── ArticleCategories ──── Categories
                │
                └──── FetchLogs (via Sources)
```

---

## 表结构详细说明

### 1. Users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 用户唯一标识 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 邮箱，用于登录 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt加密后的密码 |
| display_name | VARCHAR(100) | NOT NULL | 用户显示名称 |
| preferred_lang | VARCHAR(10) | NOT NULL, DEFAULT 'en' | 语言偏好（en / zh） |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 账户是否有效（软删除用） |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 注册时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 最后更新时间 |

---

### 2. Sources（新闻来源表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 来源唯一标识 |
| name | VARCHAR(100) | NOT NULL, UNIQUE | 来源名称，如 "Reuters" |
| rss_url | TEXT | NOT NULL | RSS订阅地址 |
| base_url | TEXT | NOT NULL | 媒体主页URL |
| language | VARCHAR(10) | NOT NULL, DEFAULT 'en' | 语言（en / zh） |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否启用此来源 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 添加时间 |

**初始数据（种子数据）**：
| name | language |
|------|----------|
| Reuters | en |
| CNBC | en |
| AP News | en |
| Yahoo Finance | en |
| MarketWatch | en |

---

### 3. Articles（新闻文章表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 文章唯一标识 |
| source_id | UUID | NOT NULL, FK → Sources.id | 所属新闻来源 |
| title | TEXT | NOT NULL | 新闻标题 |
| url | TEXT | NOT NULL, UNIQUE | 原文链接（用于去重） |
| content_snippet | TEXT | | 原文前N字摘录（AI未接入时展示用） |
| published_at | TIMESTAMP | NOT NULL | 新闻原始发布时间 |
| fetched_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 被系统抓取的时间 |
| language | VARCHAR(10) | NOT NULL, DEFAULT 'en' | 语言 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否显示（下架用） |
| ai_summary | TEXT | | _(AI预留)_ AI生成的客观摘要 |
| ai_tags | JSONB | | _(AI预留)_ AI打的分类标签，如 `["Markets","Policy"]` |
| ai_score | FLOAT | | _(AI预留)_ AI评定的重要性评分（0.0 - 1.0） |
| ai_processed_at | TIMESTAMP | | _(AI预留)_ AI处理完成时间 |

> **注**：`ai_*` 字段在 Phase 1-2 全部为 NULL，Phase 3 接入AI后开始填充。

---

### 4. Categories（分类标签表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 分类唯一标识 |
| name | VARCHAR(100) | NOT NULL | 显示名称，如 "Markets" |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL友好格式，如 "markets" |
| language | VARCHAR(10) | NOT NULL, DEFAULT 'en' | 所属语言板块 |
| display_order | INTEGER | NOT NULL, DEFAULT 0 | 菜单栏显示顺序 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否显示 |

**初始数据（种子数据）**：
| display_order | name | slug |
|---------------|------|------|
| 0 | All | all |
| 1 | Markets | markets |
| 2 | Economy | economy |
| 3 | Policy & Central Banks | policy |
| 4 | Stocks | stocks |
| 5 | Commodities | commodities |
| 6 | Crypto | crypto |

---

### 5. ArticleCategories（文章-分类关联表）

> 多对多关联表：一篇文章可以属于多个分类，一个分类可以包含多篇文章。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| article_id | UUID | NOT NULL, FK → Articles.id | 关联文章 |
| category_id | UUID | NOT NULL, FK → Categories.id | 关联分类 |
| assigned_by | VARCHAR(20) | NOT NULL, DEFAULT 'manual' | 打标签的方式：`manual` / `ai` |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 关联创建时间 |

> **联合主键**：(article_id, category_id)

---

### 6. UserSavedArticles（用户收藏表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| user_id | UUID | NOT NULL, FK → Users.id | 关联用户 |
| article_id | UUID | NOT NULL, FK → Articles.id | 关联文章 |
| saved_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 收藏时间 |

> **联合主键**：(user_id, article_id)

---

### 7. FetchLogs（抓取日志表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 日志唯一标识 |
| source_id | UUID | NOT NULL, FK → Sources.id | 本次抓取的来源 |
| started_at | TIMESTAMP | NOT NULL | 抓取开始时间 |
| finished_at | TIMESTAMP | | 抓取结束时间 |
| articles_found | INTEGER | | 抓到的总条数 |
| articles_new | INTEGER | | 去重后新增的条数 |
| status | VARCHAR(20) | NOT NULL | `success` / `failed` / `running` |
| error_message | TEXT | | 失败时的错误信息 |

---

## 索引建议 Indexes

```sql
-- 按发布时间倒序查询新闻（最常见查询）
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);

-- 按来源查询
CREATE INDEX idx_articles_source_id ON articles(source_id);

-- 按语言筛选
CREATE INDEX idx_articles_language ON articles(language);

-- URL去重查询（每次抓取时检查是否已存在）
CREATE UNIQUE INDEX idx_articles_url ON articles(url);

-- 用户查找
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

---

## 数据迁移说明 Migration Notes

- 所有表结构变更必须通过 **Alembic 迁移脚本** 完成
- 迁移文件存放于 `backend/alembic/versions/`
- 生产环境部署前必须先在本地测试迁移脚本
- 禁止直接在 Supabase 控制台手动修改表结构

---

_最后更新：2026-02-26_
