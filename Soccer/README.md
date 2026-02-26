# Soccer Predictor (体彩胜平负基础版)

这是一个可运行的第一版框架，当前已切换为静态 JSON 数据源，目标是先把以下链路跑通：

- 自动抓取天天盈球足球赛果/赔率数据（`jczq` + `bd`）
- 本地落库（SQLite）
- 训练胜平负概率模型（多模型骨架：LogReg / HistGBDT / LightGBM / CatBoost 自动可用）
- API + Web 交互界面（Mac/iPhone 浏览器可访问）
- 定时更新（每小时同步；每天一次重训，且需满足新增样本阈值）

## 1. 快速开始

```bash
make install
cp .env.example .env
make init-db
make sync-recent
```

启动 API：

```bash
make api
```

启动 UI：

```bash
make ui
```

## 2. 目录结构

- `soccer_predictor/fetcher.py`: 抓取客户端（静态 JSON：`jczq/jsbf_YYYY-MM-DD.json`、`bd/jsbf_YYYY-MM-DD.json`）
- `soccer_predictor/db.py`: SQLite 建表/写入/查询
- `soccer_predictor/features.py`: 特征构建（赔率隐含概率 + 球队滚动状态）
- `soccer_predictor/model.py`: 训练与预测
- `soccer_predictor/api.py`: FastAPI
- `soccer_predictor/scheduler.py`: 自动更新调度
- `ui/streamlit_app.py`: 简易交互界面

## 3. 常用命令

```bash
# 初始化数据库
python -m soccer_predictor.cli init-db

# 清空历史数据库
python -m soccer_predictor.cli reset-db

# 拉取某一天
python -m soccer_predictor.cli sync-date --date 2025-01-01

# 拉取区间
python -m soccer_predictor.cli sync-range --start 2025-01-01 --end 2025-01-15 --workers 4

# 拉取近期（默认含未来2天；默认只同步不重训）
python -m soccer_predictor.cli sync-recent --days-back 7 --days-forward 2 --workers 4 --no-train

# 如果你要手动同步后立刻重训，显式加 --train
python -m soccer_predictor.cli sync-recent --days-back 7 --days-forward 2 --workers 4 --train

# 仅训练（默认使用 2022-01-01 之后数据）
python -m soccer_predictor.cli train --start-date 2022-01-01

# 查看当前环境可用模型家族
python -m soccer_predictor.cli models

# 自动优化（快速模式，推荐）
python -m soccer_predictor.cli optimize --search-mode fast --weighted

# 自动优化（全量搜索，耗时更长）
python -m soccer_predictor.cli optimize --search-mode full --weighted

# 清库后从某天重建并训练（推荐）
python -m soccer_predictor.cli rebuild-from-date --start 2022-01-01 --workers 8

# 预测指定日期
python -m soccer_predictor.cli predict --date 2026-02-15
```

## 4. 当前模型说明

第一版模型重点是“先跑通链路”，不是最终策略版本。当前特征包含：

- 欧赔隐含概率（主/平/客）
- 亚盘/大小球数值化
- 主客队最近5场滚动状态（积分、净胜球）
- 联赛 ID 分类特征

在 UI 侧边栏可以点击“自动优化模型(参数组合+容量)”，支持“快速(推荐)”与“深度(更慢)”两档。系统会用固定未来窗口做稳健验证并落地最优模型。训练时默认启用“样本加权”（对过热低赔样本降权）。当前会参与优化的参数组：

- `odds_1x2`：欧赔胜平负 + 隐含概率
- `form_recent`：球队近况（近5场积分/净胜球）
- `asia_handicap`：让球指数
- `over_under`：大小球指数
- `league`：联赛分类
- `news_context`：新闻语境（占位特征，默认从 `data/news_features.csv` 读取；无文件时自动补零）

CLI 也支持按组训练（手动指定）：

```bash
python -m soccer_predictor.cli train --feature-groups odds_1x2,asia_handicap,over_under
```

后续你可以继续要求我加：

- 北京单场专门特征
- 博彩公司维度赔率差异
- 临场赔率变动特征（小时级）
- 分板块模型（按联赛/球队/时间）
- 新闻抓取与NLP特征自动化（接入 `news_context`）

高级模型依赖已纳入 `requirements.txt`（LightGBM/CatBoost）。  
macOS 下 LightGBM 需额外安装系统库：

```bash
brew install libomp
```

## 5. 重要提示

- 该项目用于数据分析与模型实验，不保证盈利。
- 彩票/体育结果具有随机性和高方差，需严格做回测与风控。
