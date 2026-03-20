---
summary: "研究筆記：Clawd 工作區的離線記憶系統（Markdown 唯一事實來源 + 衍生索引）"
read_when:
  - 設計工作區記憶 (~/.openclaw/workspace) 以超越每日 Markdown 日誌
  - 決定：獨立 CLI 與深度 OpenClaw 整合
  - 增加離線召回 + 反思（retain/recall/reflect）
title: "工作區記憶研究"
---

# 工作區記憶 v2（離線）：研究筆記

目標：Clawd 風格的工作區（`agents.defaults.workspace`，預設 `~/.openclaw/workspace`），其中「記憶」儲存為每天一個 Markdown 檔案（`memory/YYYY-MM-DD.md`）以及一小組穩定檔案（例如 `memory.md`、`SOUL.md`）。

本文提出了一個**離線優先（offline-first）**的記憶架構，將 Markdown 保留為可審查的規範性唯一事實來源，但透過衍生索引增加**結構化召回（structured recall）**（搜尋、實體摘要、信心更新）。

## 為何改變？

目前的設定（每天一個檔案）非常適用於：

- 「僅附加」日記
- 人工編輯
- git 備援的持久性 + 可審計性
- 低摩擦擷取（「直接寫下來」）

其弱點在於：

- 高召回率檢索（「我們對 X 決定了什麼？」、「上次我們嘗試 Y 時怎麼樣？」）
- 以實體為中心的答案（「告訴我關於 Alice / The Castle / warelay 的事」）而無需重讀多個檔案
- 意見/偏好穩定性（以及變更時的證據）
- 時間限制（「2025 年 11 月期間什麼是真的？」）和衝突解決

## 設計目標

- **離線**：無需網路即可運作；可在筆記型電腦/Castle 上執行；不依賴雲端。
- **可解釋**：檢索到的項目應可歸因（檔案 + 位置）並可與推斷分離。
- **低儀式感**：每日記錄保持 Markdown 格式，無繁重的架構工作。
- **漸進式**：v1 僅使用 FTS 即有用；語義/向量和圖譜為可選升級。
- **對 Agent 友善**：讓「在 token 預算內召回」變得容易（返回小捆的事實）。

## 指標模型（North star model）（Hindsight × Letta）

兩個需要融合的部分：

1. **Letta/MemGPT 風格的控制迴圈**

- 在上下文中保持一個小的「核心」（persona + 關鍵使用者事實）
- 其他所有內容都在上下文之外，並透過工具檢索
- 記憶寫入是明確的工具呼叫（append/replace/insert），被持久化，然後在下一輪重新注入

2. **Hindsight 風格的記憶基底**

- 區分所觀察到的、所相信的、以及所總結的內容
- 支援 保留/回顧/反思
- 帶有信心的觀點，可隨證據演進
- 實體感知檢索 + 時間性查詢（即使沒有完整的知識圖譜）

## 提議的架構（Markdown 真實來源 + 衍生索引）

### 正式儲存庫（git-friendly）

將 `~/.openclaw/workspace` 作為正式的人類可讀記憶保留。

建議的工作區佈局：

```
~/.openclaw/workspace/
  memory.md                    # small: durable facts + preferences (core-ish)
  memory/
    YYYY-MM-DD.md              # daily log (append; narrative)
  bank/                        # “typed” memory pages (stable, reviewable)
    world.md                   # objective facts about the world
    experience.md              # what the agent did (first-person)
    opinions.md                # subjective prefs/judgments + confidence + evidence pointers
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

備註：

- **每日日誌保持為每日日誌**。無需將其轉換為 JSON。
- `bank/` 檔案是經過**策劃**的，由反思工作產生，且仍可手動編輯。
- `memory.md` 保持「小型 + 核心」：那些您希望 Clawd 每次工作階段都能看到的內容。

### 衍生儲存庫（機器回顧）

在工作區下新增一個衍生索引（不一定需要 git 追蹤）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

後端支援：

- 用於事實 + 實體連結 + 觀點元數據的 SQLite schema
- 用於詞彙回顧的 SQLite **FTS5**（快速、微小、離線）
- 用於語意回顧的可選嵌入表（仍為離線）

索引始終可**從 Markdown 重建**。

## 保留 / 回顧 / 反思（操作循環）

### 保留：將每日日誌正規化為「事實」

Hindsight 在此關鍵見解：儲存**敘述性、自包含的事實**，而非微小的片段。

對 `memory/YYYY-MM-DD.md` 的實用規則：

- 在一天結束時（或期間），新增一個 `## Retain` 區塊，包含 2-5 個項目符號，且必須：
  - 敘述性（保留跨輪次的語境）
  - 自包含（獨立存在且在之後仍有意義）
  - 標記類型 + 實體提及

範例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最小解析：

- 類型前綴：`W` (world)、`B` (experience/biographical)、`O` (opinion)、`S` (observation/summary; usually generated)
- 實體：`@Peter`、`@warelay` 等（slug 對應至 `bank/entities/*.md`）
- 觀點信心：`O(c=0.0..1.0)` 可選

如果您不想讓作者考慮這個問題：reflect 任務可以從日誌的其餘部分推斷出這些要點，但擁有一個明確的 `## Retain` 部分是最簡單的「品質槓桿」。

### Recall：對衍生索引的查詢

Recall 應支援：

- **詞彙**：「尋找精確的術語 / 名稱 / 指令」（FTS5）
- **實體**：「告訴我關於 X 的事」（實體頁面 + 實體連結的事實）
- **時間**：「11 月 27 日左右發生了什麼」 / 「上週以來」
- **觀點**：「Peter 偏好什麼？」（附帶信心度 + 證據）

返回格式應對代理友善並引用來源：

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (來源日期，或存在的提取時間範圍)
- `entities` (`["Peter","warelay"]`)
- `content` (敘述性事實)
- `source` (`memory/2025-11-27.md#L12` 等)

### Reflect：產生穩定頁面 + 更新信念

反思是一個排程任務（每天或心跳 `ultrathink`)，它會：

- 根據最近的事實更新 `bank/entities/*.md`（實體摘要）
- 根據增強/矛盾更新 `bank/opinions.md` 信心度
- 選擇性地提出對 `memory.md` 的編輯建議（「核心類」的持久事實）

觀點演進（簡單、可解釋）：

- 每個觀點都有：
  - 陳述
  - 信心度 `c ∈ [0,1]`
  - 上次更新
  - 證據連結（支援 + 矛盾的事實 ID）
- 當新事實到達時：
  - 透過實體重疊 + 相似性（先 FTS，後 embeddings）尋找候選觀點
  - 以小幅增量更新信心度；大幅跳躍需要強烈的矛盾 + 重複的證據

## CLI 整合：獨立運作 vs 深度整合

建議：**在 OpenClaw 中深度整合**，但保持核心庫可分離。

### 為什麼要整合進 OpenClaw？

- OpenClaw 已經知道：
  - 工作區路徑 (`agents.defaults.workspace`)
  - 會話模型 + 心跳
  - 記錄 + 故障排除模式
- 您希望代理本身呼叫這些工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 為什麼還要拆分出一個函式庫？

- 保持記憶邏輯在沒有 gateway/runtime 的情況下可測試
- 從其他情境重複使用（本機腳本、未來的桌面應用程式等）

形狀：
記憶體工具旨在成為一個小型 CLI + 程式庫層，但這僅屬探索性質。

## “S-Collide” / SuCo：何時使用它（研究）

如果 “S-Collide” 指的是 **SuCo (Subspace Collision)**：這是一種 ANN 檢索方法，通過在子空間中使用學習/結構化碰撞來實現強勁的召回/延遲權衡（論文：arXiv 2411.14754, 2024）。

對於 `~/.openclaw/workspace` 的實用觀點：

- **不要**從 SuCo 開始。
- 從 SQLite FTS +（可選的）簡單嵌入開始；你將立即獲得大部分 UX 收益。
- 僅在以下情況考慮 SuCo/HNSW/ScaNN 類解決方案：
  - 語料庫很大（數萬/數十萬個區塊）
  - 暴力嵌入搜索變得太慢
  - 召回質量明顯受到詞彙搜索的瓶頸限制

離線友好的替代方案（複雜度遞增）：

- SQLite FTS5 + 元數據過濾器（零機器學習）
- 嵌入 + 暴力搜尋（如果區塊數量較少，效果出奇地好）
- HNSW 索引（常見、穩健；需要程式庫綁定）
- SuCo（研究級別；如果有可靠的可嵌入實現方案則具吸引力）

未解決的問題：

- 在你的機器（筆記型電腦 + 桌上型電腦）上，用於「個人助理記憶」的**最佳**離線嵌入模型是什麼？
  - 如果你已經有 Ollama：使用本地模型進行嵌入；否則在工具鏈中附帶一個小型嵌入模型。

## 最小有用的試點

如果你想要一個最小但仍然有用的版本：

- 在日誌中新增 `bank/` 實體頁面和 `## Retain` 區塊。
- 使用 SQLite FTS 進行帶有引用（路徑 + 行號）的召回。
- 僅當召回質量或規模需要時才添加嵌入。

## 參考資料

- Letta / MemGPT 概念：「核心記憶區塊」+「歸檔記憶」+ 工具驅動的自我編輯記憶。
- Hindsight 技術報告：「保留 / 召回 / 反思」，四網路記憶，敘事性事實提取，意見信心演變。
- SuCo: arXiv 2411.14754 (2024): 「Subspace Collision」近似最近鄰檢索。

import en from "/components/footer/en.mdx";

<en />
