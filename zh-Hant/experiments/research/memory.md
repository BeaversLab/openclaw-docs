---
summary: "研究筆記：Clawd 工作區的離線記憶系統（Markdown 事實來源 + 衍生索引）"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "工作區記憶研究"
---

# 工作區記憶 v2（離線）：研究筆記

目標：Clawd 風格的工作區（`agents.defaults.workspace`，預設 `~/.openclaw/workspace`），其中「記憶」儲存為每天一個 Markdown 檔案（`memory/YYYY-MM-DD.md`）加上一組穩定的檔案（例如 `memory.md`，`SOUL.md`）。

本文件提出了一種**離線優先**的記憶體架構，將 Markdown 保留為標準的、可審查的事實來源，但透過衍生索引增加了**結構化回憶**（搜尋、實體摘要、信心更新）。

## 為何變更？

目前的設定（每天一個檔案）非常適合用於：

- “僅追加”日誌
- 人工編輯
- git 備份的持久性與可審計性
- 低摩擦捕捉（「直接寫下來」）

它弱在於：

- 高召回率檢索（「我們關於 X 決定了什麼？」、「上次我們嘗試 Y 時是怎樣？」）
- 以實體為中心的答案（「告訴我關於 Alice / The Castle / warelay 的資訊」）而無需重讀多個檔案
- 意見/偏好的穩定性（以及變更時的證據）
- 時間約束（「2025 年 11 月期間哪些情況屬實？」）與衝突解決

## 設計目標

- **離線**：無需網路即可運作；可在筆記型電腦/Castle 上執行；無雲端依賴。
- **可解釋**：檢索項應可歸因（檔案 + 位置）且與推斷分離。
- **低儀式感**：每日記錄保持 Markdown 格式，無繁重的 schema 工作。
- **漸進式**：v1 僅需 FTS 即可用；語義/向量和圖譜為可選升級。
- **適合代理程式**：使「在 Token 預算內召回」變得容易（返回小束的事實）。

## 北極星模型（Hindsight × Letta）

兩個需要融合的部份：

1. **Letta/MemGPT 風格的控制迴圈**

- 保持一個小的「核心」始終在上下文中（角色 + 關鍵使用者事實）
- 其他所有內容都在上下文之外，並透過工具檢索
- 記憶寫入是明確的工具呼叫（追加/替換/插入），會被持久化，然後在下一輪重新注入

2. **Hindsight 風格的記憶基質**

- 將觀察到的、相信的與總結的內容分開
- 支援保留/召回/反思
- 帶有置信度的觀點，可隨證據演進
- 實體感知檢索 + 時間查詢（即使沒有完整的知識圖譜）

## 提議的架構（Markdown 來源真值 + 導出索引）

### 正規儲存庫（git 友善）

將 `~/.openclaw/workspace` 作為正規的人類可讀記憶。

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

筆記：

- **日誌依然是日誌**。無需將其轉換為 JSON。
- `bank/` 檔案是經過**策劃**的，由反思任務生成，並且仍可手動編輯。
- `memory.md` 保持「小型且核心」：那些您希望 Clawd 在每次會話中都能看到的內容。

### 衍生存儲（機器回憶）

在工作區下新增一個衍生索引（不一定要被 git 追蹤）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

使用以下技術作為後端：

- 用於事實 + 實體連結 + 觀點元數據的 SQLite 架構
- 用於詞彙回憶的 SQLite **FTS5**（快速、輕量、離線）
- 用於語義回憶的可選嵌入表（仍為離線）

該索引始終可以**從 Markdown 重建**。

## 保留 / 回憶 / 反思（操作循環）

### 保留：將日誌正規化為「事實」

Hindsight 的一個在此至關重要的見解：存儲**敘述性、自包含的事實**，而非零碎片段。

適用於 `memory/YYYY-MM-DD.md` 的實用規則：

- 在一天結束時（或期間），新增一個 `## Retain` 區塊，其中包含 2–5 個要點，且這些要點必須是：
  - 敘事性（保留跨回合的語境）
  - 自包含（獨立內容在之後依然合理）
  - 標記了類型與實體提及

範例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最精簡的解析：

- 類型前綴：`W` (world)、`B` (experience/biographical)、`O` (opinion)、`S` (observation/summary; usually generated)
- 實體：`@Peter`、`@warelay` 等（別名 slug 對應至 `bank/entities/*.md`）
- 意見信心度：`O(c=0.0..1.0)` 選填

如果您不希望作者考慮這個問題：reflect 作業可以從日誌的其餘部分推斷出這些要點，但擁有一個明確的 `## Retain` 部分是最簡單的「品質槓桿」。

### Recall：對衍生索引進行查詢

Recall 應支援：

- **詞彙**：「尋找確切的術語 / 名稱 / 指令」（FTS5）
- **實體**：「告訴我關於 X 的事」（實體頁面 + 實體連結的事實）
- **時間**：「11 月 27 日左右發生了什麼」 / 「上週以來」
- **觀點**：「Peter 偏好什麼？」（附帶信心與證據）

返回格式應對代理友善並引用來源：

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (來源日期，或提取的時間範圍（如果存在）)
- `entities` (`["Peter","warelay"]`)
- `content` (敘述性事實)
- `source`（`memory/2025-11-27.md#L12` 等）

### 反思：生成穩定頁面並更新信念

反思是一個排程任務（每日或心跳 `ultrathink`)，它會：

- 根據近期事實更新 `bank/entities/*.md`（實體摘要）
- 根據增強或矛盾更新 `bank/opinions.md` 的信心度
- 可選擇性地建議編輯 `memory.md`（「核心類」的持久事實）

觀點演進（簡單、可解釋）：

- 每個觀點包含：
  - 陳述
  - 信心度 `c ∈ [0,1]`
  - last_updated
  - 證據連結（支援與矛盾的事實 ID）
- 當新事實到達時：
  - 透過實體重疊與相似度尋找候選觀點（先進行全文檢索，再進行嵌入檢索）
  - 以小幅增量更新信心度；大幅跳躍需要強烈的矛盾與重複的證據

## CLI 整合：獨立工具 vs 深度整合

建議：**深度整合進 OpenClaw**，但保持核心函式庫可獨立分離。

### 為何要整合進 OpenClaw？

- OpenClaw 已經知道：
  - 工作區路徑 (`agents.defaults.workspace`)
  - session 模型 + 心跳
  - 日誌記錄 + 故障排除模式
- 您希望代理本身呼叫這些工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 為何仍要拆分函式庫？

- 讓記憶體邏輯在不需要 gateway/runtime 的情況下可測試
- 可從其他情境重複使用（本機腳本、未來的桌面應用程式等）

形狀：
記憶體工具旨在成為一個小型 CLI + 函式庫層，但這目前僅屬探索性質。

## 「S-Collide」 / SuCo：何時使用它（研究）

如果“S-Collide”指的是 **SuCo (Subspace Collision)**：這是一種 ANN 檢索方法，透過在子空間中使用學習過的/結構化的碰撞，以達到強大的召回/延遲權衡（論文：arXiv 2411.14754, 2024）。

針對 `~/.openclaw/workspace` 的務實看法：

- **不要從** SuCo 開始。
- 從 SQLite FTS + （可選的）簡單嵌入開始；你會立即獲得大部分使用者體驗的提升。
- 僅在以下情況下考慮 SuCo/HNSW/ScaNN 類別的解決方案：
  - 語料庫很大（數萬至數十萬個區塊）
  - 暴力嵌入搜索變得太慢
  - 回憶質量明顯受到詞彙搜索的瓶頸限制

適合離線的替代方案（複雜度遞增）：

- SQLite FTS5 + 元數據過濾器（零機器學習）
- 嵌入 + 暴力力法（如果區塊數量少，效果出乎意料地好）
- HNSW 索引（常見、穩健；需要庫綁定）
- SuCo（研究級；如果有可以嵌入的紮實實作，這會很有吸引力）

開放問題：

- 在你們的機器（筆記型電腦 + 桌上型電腦）上，針對「個人助理記憶」，**最好**的離線嵌入模型是什麼？
  - 如果你已經有 Ollama：使用本地模型進行嵌入；否則在工具鏈中打包一個小型的嵌入模型。

## 最小有用的試點

如果你想要一個最小但仍然有用的版本：

- 新增 `bank/` 實體頁面以及每日日誌中的一個 `## Retain` 區塊。
- 使用 SQLite FTS 進行具引用（路徑 + 行號）的召回。
- 僅當召回品質或規模有需求時才新增嵌入。

## 參考資料

- Letta / MemGPT 概念：「核心記憶區塊」+「歸檔記憶」+ 工具驅動的自我編輯記憶。
- Hindsight Technical Report：“retain / recall / reflect”、四網路記憶體、敘事事實提取、意見信心演變。
- SuCo：arXiv 2411.14754 (2024)： “Subspace Collision”近似最近鄰檢索。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
