---
summary: "研究筆記：Clawd 工作區的離線記憶系統（Markdown 唯一來源 + 衍生索引）"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "Workspace Memory Research"
---

# Workspace Memory v2（離線）：研究筆記

目標：Clawd 風格的工作區（`agents.defaults.workspace`，預設 `~/.openclaw/workspace`），其中「記憶」以每日一個 Markdown 檔案（`memory/YYYY-MM-DD.md`）加上一小組穩定檔案（例如 `memory.md`、`SOUL.md`）的形式儲存。

本文提出了一種**優先離線**的記憶架構，將 Markdown 保留為規範的、可審查的準則，並透過衍生索引新增**結構化檢索**（搜尋、實體摘要、信心度更新）。

## 為何要變更？

目前的設定（每日一個檔案）非常適合用於：

- 「僅追加」日誌
- 人工編輯
- git 支援的持久性與可審計性
- 低摩擦擷取（「直接寫下來」）

但在以下方面較弱：

- 高召回率檢索（「我們關於 X 決定了什麼？」、「上次我們嘗試 Y 的結果如何？」）
- 以實體為中心的答案（「告訴我關於 Alice / The Castle / warelay」），無需重新閱讀多個檔案
- 意見/偏好的穩定性（以及其變更時的證據）
- 時間限制（「2025 年 11 月期間的真實情況為何？」）與衝突解決

## 設計目標

- **離線**：無需網路即可運作；可在筆記型電腦/Castle 上執行；不依賴雲端。
- **可解釋**：檢索項目應可歸因（檔案 + 位置）且與推論分開。
- **低儀式**：每日日誌保持 Markdown 格式，無繁重的 schema 工作。
- **漸進式**：v1 僅使用 FTS 即有用；語意/向量和圖形為可選升級。
- **代理友善**：讓「在 token 預算內檢索」變得簡單（傳回小捆事實）。

## 北極星模型

要結合的兩個部分：

1. **Letta/MemGPT 風格的控制迴圈**

- 始終在 context 中保留一個小型的「核心」（角色設定 + 關鍵使用者事實）
- 其他所有內容都在 context 之外，並透過工具檢索
- 記憶寫入是明確的工具呼叫（追加/取代/插入），會被持久化，然後在下一個輪次重新注入

2. **Hindsight 風格的記憶基底**

- 區分觀察到的內容、相信的內容與摘要的內容
- 支援 retain/recall/reflect
- 帶有置信度的觀點，可隨證據演進
- 實體感知檢索 + 時序查詢（即使沒有完整的知識圖譜）

## 提議架構（Markdown 事實來源 + 衍生索引）

### 規範存儲（git-friendly）

將 `~/.openclaw/workspace` 保留為規範的人類可讀記憶。

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

- **日誌仍是日誌**。無需將其轉換為 JSON。
- `bank/` 檔案是經過**策劃**的，由反思任務產生，但仍可手動編輯。
- `memory.md` 保持「小型 + 核心」：您希望 Clawd 在每個會話中看到的內容。

### 衍生存儲（機器回憶）

在工作區下新增一個衍生索引（不一定需要 git 追蹤）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

後端支援：

- 用於事實 + 實體連結 + 觀點元數據的 SQLite 結構描述
- 用於詞彙回憶的 SQLite **FTS5**（快速、輕量、離線）
- 用於語意回憶的可選嵌入表（仍為離線）

索引始終可以**從 Markdown 重建**。

## 保留 / 回憶 / 反思（操作循環）

### 保留：將每日日誌正規化為「事實」

Hindsight 關鍵且相關的見解：存儲**敘述性、自包含的事實**，而非微小的片段。

`memory/YYYY-MM-DD.md` 的實用規則：

- 在一天結束時（或期間），新增一個 `## Retain` 部分，包含 2–5 個項目符號，這些符號應為：
  - 敘述性（保留跨輪次語境）
  - 自包含（獨立內容在之後仍有意義）
  - 標記類型 + 實體提及

範例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最簡解析：

- 類型前綴：`W` (world)、`B` (experience/biographical)、`O` (opinion)、`S` (observation/summary; usually generated)
- 實體：`@Peter`、`@warelay` 等（slug 對應至 `bank/entities/*.md`）
- 觀點置信度：`O(c=0.0..1.0)` 可選

如果您不希望作者考慮這一點：反思任務可以從日誌的其餘部分推斷這些項目符號，但擁有一個明確的 `## Retain` 部分是最簡單的「品質槓桿」。

### 回憶：對衍生索引進行查詢

回憶應支援：

- **lexical**：「找出精確的詞彙 / 名稱 / 指令」（FTS5）
- **entity**：「告訴我關於 X」（實體頁面 + 實體連結的事實）
- **temporal**：「11 月 27 日左右發生了什麼」/「從上週開始」
- **opinion**：「Peter 偏好什麼？」（附上信心度 + 證據）

回傳格式應該要對 Agent 友好並引用來源：

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (來源日期，若有則為擷取的時間範圍)
- `entities` (`["Peter","warelay"]`)
- `content` (敘述性事實)
- `source` (`memory/2025-11-27.md#L12` 等)

### Reflect：產生穩定頁面 + 更新信念

Reflection 是一個排程任務（每日或心跳 `ultrathink`)，其功能為：

- 根據近期事實更新 `bank/entities/*.md`（實體摘要）
- 根據增強/矛盾更新 `bank/opinions.md` 的信心度
- 選擇性地提出對 `memory.md` 的編輯建議（「核心類」的持久事實）

意見演進（簡單、可解釋）：

- 每個意見包含：
  - 陳述
  - 信心度 `c ∈ [0,1]`
  - 最後更新時間
  - 證據連結（支持 + 矛盾的事實 ID）
- 當新事實到達時：
  - 透過實體重疊 + 相似性尋找候選意見（先使用 FTS，稍後使用嵌入向量）
  - 以小幅增量更新信心度；大幅跳動需要強烈的矛盾 + 重複的證據

## CLI 整合：獨立運作 vs 深度整合

建議：**與 OpenClaw 深度整合**，但保持核心庫可分離。

### 為什麼要整合到 OpenClaw？

- OpenClaw 已經知道：
  - 工作區路徑 (`agents.defaults.workspace`)
  - Session 模型 + 心跳
  - 日誌記錄 + 疑難排解模式
- 你希望 Agent 本身來呼叫這些工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 為什麼還是要分拆出一個函式庫？

- 使記憶邏輯在沒有 gateway/runtime 的情況下仍可測試
- 可在其他情境中重複使用（本機腳本、未來的桌面應用程式等）

形狀：
記憶工具旨在成為一個小型的 CLI + 函式庫層，但這僅屬探索性質。

## 「S-Collide」/ SuCo：何時使用它（研究）

如果「S-Collide」指的是 **SuCo (Subspace Collision)**：這是一種 ANN 檢索方法，通過在子空間中使用學習到的/結構化的碰撞，以針對強召回率/延遲之間的權衡（論文：arXiv 2411.14754，2024）。

對 `~/.openclaw/workspace` 的實用觀點：

- **不要**從 SuCo 開始。
- 從 SQLite FTS +（可選的）簡單嵌入開始；您將立即獲得大部分 UX 優勢。
- 僅在以下情況考慮 SuCo/HNSW/ScaNN 類別的解決方案：
  - 語料庫很大（數萬/數十萬個區塊）
  - 暴力嵌入搜索變得太慢
  - 召回質量明顯受到詞法搜索的瓶頸限制

離線友好的替代方案（按複雜度遞增）：

- SQLite FTS5 + 元數據過濾器（零 ML）
- 嵌入 + 暴力搜索（如果區塊數量較少，效果出奇地好）
- HNSW 索引（常見、穩健；需要庫綁定）
- SuCo（研究級別；如果您有一個可以嵌入的紮實實現，則很有吸引力）

未解決的問題：

- 在您的機器（筆記本電腦 + 桌面機）上，針對「個人助理記憶」的**最佳**離線嵌入模型是什麼？
  - 如果您已經有 Ollama：使用本地模型進行嵌入；否則，在工具鏈中附帶一個小型嵌入模型。

## 最小有用的試點

如果您想要一個最小的、仍然有用的版本：

- 添加 `bank/` 實體頁面和 `## Retain` 區塊。
- 使用 SQLite FTS 進行帶有引用（路徑 + 行號）的召回。
- 僅當召回質量或規模有要求時才添加嵌入。

## 參考資料

- Letta / MemGPT 概念：「核心記憶區塊」+「存檔記憶」+ 工具驅動的自我編輯記憶。
- Hindsight Technical Report：「retain / recall / reflect」，四網絡記憶，敘事性事實提取，觀點置信度演變。
- SuCo: arXiv 2411.14754 (2024)：「Subspace Collision」近似最近鄰檢索。
