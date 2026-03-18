---
summary: "研究筆記：適用於 Clawd 工作區的離線記憶系統（Markdown 唯一來源 + 衍生索引）"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "工作區記憶研究"
---

# 工作區記憶 v2（離線）：研究筆記

目標：Clawd 風格的工作區（`agents.defaults.workspace`，預設 `~/.openclaw/workspace`），其中「記憶」以每天一個 Markdown 檔案（`memory/YYYY-MM-DD.md`）加上一小組穩定檔案（例如 `memory.md`、`SOUL.md`）的方式儲存。

本文件提出了一個**離線優先**的記憶架構，將 Markdown 保留為標準的、可審查的資訊來源，但透過衍生索引增加**結構化召回**（搜尋、實體摘要、信心更新）。

## 為何變更？

目前的設定（每天一個檔案）非常適合：

- 「僅追加」日誌
- 人工編輯
- git 支援的持久性 + 可審計性
- 低阻力捕捉（「直接寫下來」）

它的弱點在於：

- 高召回檢索（「我們關於 X 決定了什麼？」、「上次我們嘗試 Y 的情況如何？」）
- 以實體為中心的答案（「告訴我關於 Alice / The Castle / warelay」），無需重讀許多檔案
- 意見/偏好穩定性（以及變更時的證據）
- 時間約束（「2025 年 11 月期間什麼是真實的？」）和衝突解決

## 設計目標

- **離線**：無需網路即可運作；可在筆記型電腦/Castle 上執行；不依賴雲端。
- **可解釋**：檢索到的項目應可歸屬（檔案 + 位置）且與推論分開。
- **低儀式感**：每日記錄保持為 Markdown，無繁重的 Schema 工作。
- **漸進式**：v1 僅搭配 FTS 即有用；語義/向量和圖形是可選升級。
- **Agent 友善**：讓「在 Token 預算內召回」變得簡單（傳回小捆的事實）。

## 北極星模型（Hindsight × Letta）

兩個要結合的部分：

1. **Letta/MemGPT 風格的控制迴圈**

- 在語境中保持一個小的「核心」（角色 + 關鍵使用者事實）
- 其他所有東西都位於語境之外，並透過工具檢索
- 記憶寫入是明確的工具呼叫（append/replace/insert），會被持久化，然後在下一輪重新注入

2. **Hindsight 風格的記憶基質**

- 區分觀察到的內容、相信的內容與總結的內容
- 支援保留/召回/反思
- 附帶信度的觀點，可隨證據演進
- 實體感知檢索 + 時序查詢（即便沒有完整的知識圖譜）

## 提議架構（Markdown 事實來源 + 衍生索引）

### 規範儲存庫（git-friendly）

將 `~/.openclaw/workspace` 作為規範的人類可讀記憶。

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

註記：

- **每日日誌保持為每日日誌**。無需將其轉換為 JSON。
- `bank/` 檔案是經過**策劃**的，由反思工作產生，但仍可手動編輯。
- `memory.md` 保持「小型 + 核心」的性質：那些您希望 Clawd 每次工作階段都能看到的內容。

### 衍生儲存庫（機器召回）

在工作區下新增一個衍生索引（不一定需要 git 追蹤）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

以此為後端：

- 用於事實、實體連結和觀點元資料的 SQLite schema
- 用於詞彙召回的 SQLite **FTS5**（快速、小巧、離線）
- 用於語意召回的選用嵌入表（仍為離線）

索引始終可以**從 Markdown 重建**。

## 保留 / 召回 / 反思（操作迴圈）

### 保留：將每日日誌正規化為「事實」

Hindsight 此處相關的關鍵洞察：儲存**敘述性、自包含的事實**，而非微小的片段。

針對 `memory/YYYY-MM-DD.md` 的實用規則：

- 在一天結束時（或期間），新增一個 `## Retain` 區塊，包含 2-5 個項目符號，這些項目應：
  - 敘述性（保留跨語境的內容）
  - 自包含（獨立存在於後期仍合理）
  - 標記類型 + 實體提及

範例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最小化解析：

- 類型前綴：`W` (world)，`B` (experience/biographical)，`O` (opinion)，`S` (observation/summary; usually generated)
- 實體：`@Peter`，`@warelay` 等 (slug 對應到 `bank/entities/*.md`)
- 觀點信度：`O(c=0.0..1.0)` 為選用

如果您不希望作者考慮這些：反思工作可以從日誌的其餘部分推斷這些項目，但擁有一個明確的 `## Retain` 區塊是最簡單的「品質槓桿」。

### 召回：對衍生索引進行查詢

召回應支援：

- **詞彙**：「尋找確切的詞彙 / 名稱 / 指令」（FTS5）
- **實體**：「告訴我關於 X」（實體頁面 + 實體連結的事實）
- **時間**：「11 月 27 日左右發生了什麼」/「上週以來」
- **觀點**：「Peter 偏好什麼？」（附帶信心 + 證據）

回傳格式應該對代理程式友善並引用來源：

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (來源日期，若存在則為擷取的時間範圍)
- `entities` (`["Peter","warelay"]`)
- `content` (敘述性事實)
- `source` (`memory/2025-11-27.md#L12` 等)

### 反思：產生穩定頁面 + 更新信念

反思是一個排程任務（每日或心跳 `ultrathink`），它會：

- 根據近期事實更新 `bank/entities/*.md`（實體摘要）
- 根據增強/矛盾更新 `bank/opinions.md` 的信心
- 選擇性地建議編輯 `memory.md`（「核心類」持久事實）

觀點演進（簡單、可解釋）：

- 每個觀點具有：
  - 陳述
  - 信心 `c ∈ [0,1]`
  - last_updated
  - 證據連結（支援 + 矛盾的事實 ID）
- 當新事實到達時：
  - 透過實體重疊 + 相似性（先 FTS，後嵌入）尋找候選觀點
  - 以小幅變動更新信心；大幅跳動需要強烈的矛盾 + 重複的證據

## CLI 整合：獨立 vs 深度整合

建議：**在 OpenClaw 中深度整合**，但保持核心庫可分離。

### 為什麼整合到 OpenClaw？

- OpenClaw 已經知道：
  - 工作區路徑 (`agents.defaults.workspace`)
  - 會話模型 + 心跳
  - 日誌記錄 + 故障排除模式
- 您希望代理程式本身呼叫工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 為什麼還要分割出一個函式庫？

- 保持記憶邏輯可在沒有 gateway/runtime 的情況下進行測試
- 可從其他上下文重用（本地腳本、未來的桌面應用程式等）

形狀：
記憶工具預期是一個小型 CLI + 函式庫層，但這僅具探索性。

## 「S-Collide」/ SuCo：何時使用它（研究）

如果 “S-Collide” 指的是 **SuCo (Subspace Collision)**：這是一種 ANN 檢索方法，通過在子空間中使用學習/結構化的碰撞來針對強回召/延遲權衡（論文：arXiv 2411.14754，2024）。

對於 `~/.openclaw/workspace` 的實用觀點：

- **不要**從 SuCo 開始。
- 從 SQLite FTS +（可選的）簡單嵌入開始；你會立即獲得大部分 UX 收益。
- 僅在以下情況考慮 SuCo/HNSW/ScaNN 類解決方案：
  - 語料庫很大（數萬/數十萬個分塊）
  - 暴力嵌入搜索變得太慢
  - 回召品質受到詞法搜索的嚴重瓶頸

離線友好的替代方案（複雜度遞增）：

- SQLite FTS5 + 元資料過濾器（零 ML）
- 嵌入 + 暴力搜索（如果分塊數量較少，效果驚人地好）
- HNSW 索引（常見、穩健；需要庫綁定）
- SuCo（研究級別；如果有可以嵌入的紮實實現，則很有吸引力）

未解決的問題：

- 在你的機器（筆記型電腦 + 桌機）上，什麼是針對 “個人助理記憶” 的 **最佳** 離線嵌入模型？
  - 如果你已經有 Ollama：使用本地模型進行嵌入；否則在工具鏈中打包一個小型嵌入模型。

## 最小可用原型

如果你想要一個最小但仍然有用的版本：

- 添加 `bank/` 實體頁面和日誌中的 `## Retain` 部分。
- 使用 SQLite FTS 進行帶有引用（路徑 + 行號）的回召。
- 僅當回召品質或規模需要時才添加嵌入。

## 參考資料

- Letta / MemGPT 概念：“核心記憶區塊” + “歸檔記憶” + 工具驅動的自我編輯記憶。
- Hindsight 技術報告：“retain / recall / reflect”，四網絡記憶，敘事性事實提取，觀點信心演變。
- SuCo: arXiv 2411.14754 (2024): “Subspace Collision” 近似最近鄰檢索。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
