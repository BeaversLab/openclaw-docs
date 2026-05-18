---
summary: "隨附的 `oc-path` 外掛程式：為 `oc://` 工作區檔案定址方案提供 `openclaw path` CLI"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "OC Path 外掛程式"
---

隨附的 `oc-path` 外掛程式針對 `oc://` 工作區檔案定址方案新增了 [`openclaw path`](/zh-Hant/cli/path) CLI。它隨附於 OpenClaw 存儲庫的 `extensions/oc-path/` 下，但屬於選用功能 — 安裝/建置會使其保持休眠狀態，直到您啟用它。

`oc://` 位址指向工作區檔案內的單一葉子（或一組通配符葉子）。此外掛程式目前支援四種檔案類型：

- **markdown** (`.md`, `.mdx`)：frontmatter、章節、項目、欄位
- **c** (`.jsonc`, `.json5`, `.json`)：保留註解和格式
- **l** (`.jsonl`, `.ndjson`)：行導向記錄
- **yaml** (`.yaml`, `.yml`, `.lobster`)：透過
  YAML 文件 API 操作 map/sequence/scalar 節點

自託管者和編輯器擴充功能使用 CLI 來讀取或寫入單一葉子，而無需直接針對 SDK 撰寫腳本；代理程式和掛鉤將其視為確定性基質，因此位元精確度的往返和編輯哨兵防護可在所有類型中統一應用。

## 為什麼要啟用它

當您希望腳本、掛鉤或本地代理程式工具能夠指向工作區狀態的特定部分，而無需為每種檔案形狀發明解析器時，請啟用 `oc-path`。單一 `oc://` 位址可以命名 markdown 前置資料鍵、區段項目、JSONC 設定葉子、JSONL 事件欄位或 YAML 工作流程步驟。

這對於維護者工作流程至關重要，因為變更應當是細微、可審計且可重複的：檢查一個值、尋找匹配記錄、試運行寫入，然後僅套用該葉子，同時保留註解、行尾和附近格式。將其保持為選用外掛程式可為進階使用者提供定址基質，而不會將解析器依賴項或 CLI 介面放入從不需要它的核心安裝中。

啟用的常見原因：

- **本地自動化**：Shell 腳本可以使用 `openclaw path … --json` 來解析或更新一個工作區值，
  而無需攜帶單獨的 markdown、JSONC、
  JSONL 和 YAML 解析程式碼。
- **代理程式可見的編輯**：代理程式可以在寫入之前顯示一個定址葉子的試運行差異，
  這比自由格式的檔案重寫更容易審查。
- **編輯器整合**：編輯器可以將 `oc://AGENTS.md/tools/gh` 對應到
  確切的 markdown 節點和行號，而無需從標題文字推測。
- **診斷**：`emit` 將檔案透過解析器和發射器進行來回轉換，因此您可以在依賴自動化編輯之前，檢查檔案類型是否位元穩定。

具體範例：

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

該外掛刻意不擁有更高層級的語意。記憶體外掛仍然擁有記憶體寫入，配置命令仍然擁有完整的配置管理，而 LKG 邏輯仍然擁有還原/提升。`oc-path` 是一個狹隘的定址和位元保留檔案操作層，這些更高層級的工具可以圍繞它來建構。

## 運行位置

該外掛在您呼叫指令的主機上，於 **`openclaw` CLI 內部運行**。它不需要運行中的 Gateway，也不會開啟任何網路 socket — 每個動詞都是針對您指向的檔案進行的純粹轉換。

外掛元數據位於 `extensions/oc-path/openclaw.plugin.json`：

```json
{
  "id": "oc-path",
  "name": "OC Path",
  "activation": {
    "onStartup": false,
    "onCommands": ["path"]
  },
  "commandAliases": [{ "name": "path", "kind": "cli" }]
}
```

`onStartup: false` 使該外掛保持在 Gateway 熱路徑之外。`onCommands:
["path"]` 告訴 CLI 在您第一次執行 `openclaw path …` 時延遲載入該外掛，因此從不使用該動詞的安裝不會產生任何成本。

## 啟用

```bash
openclaw plugins enable oc-path
```

重新啟動 Gateway（如果您有運行），以便清單快照能夠擷取新的狀態。單純的 `openclaw path` 呼叫會立即在同一台主機上運作 — CLI 會按需載入該外掛。

停用方式：

```bash
openclaw plugins disable oc-path
```

## 相依性

所有的解析器相依性都是外掛本地的 — 啟用 `oc-path` 不會將新的套件拉入核心執行時期：

| 相依性         | 用途                                                        |
| -------------- | ----------------------------------------------------------- |
| `commander`    | `resolve`、`find`、`set`、`validate`、`emit` 的子指令接線。 |
| `jsonc-parser` | JSONC 解析 + 葉節點編輯，並保留註解和尾隨逗號。             |
| `markdown-it`  | 針對章節 / 項目 / 欄位模型的 Markdown 標記化。              |
| `yaml`         | YAML `Document` 解析 / 發射 / 編輯，並保留註解和流樣式。    |

JSONL 保持手動編寫 — 面向行的解析比任何相依性都簡單，並且每行 JSONC 解析已經透過 `jsonc-parser`。

## 提供的功能

| 介面                        | 提供者                                                  |
| --------------------------- | ------------------------------------------------------- |
| `openclaw path` CLI         | `extensions/oc-path/cli-registration.ts`                |
| `oc://` 解析器 / 格式化工具 | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 依類型解析 / 發送 / 編輯    | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| 通用解析 / 尋找 / 設定      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 編輯保護哨兵                | `extensions/oc-path/src/oc-path/sentinel.ts`            |

CLI 是目前唯一的公開介面。基礎動詞為外掛程式私有；使用者使用 CLI（或根據 SDK 建構自己的外掛程式）。

## 與其他外掛程式的關係

- **`memory-*`**：記憶體寫入透過記憶體外掛程式進行，而非 `oc-path`。
  `oc-path` 是一個通用檔案基質；記憶體外掛程式會在其上層疊自己的語意。
- **LKG**：`path` 不知道上次已知良好 (Last-Known-Good) 組態還原。如果
  檔案受到 LKG 追蹤，下一次 `observe` 呼叫會決定是升級還是
  還原；透過 LKG 升級/還原生命週期進行原子多重設定的 `set --batch`
  預計將與 LKG 還原基質一起推出。

## 安全性

`set` 透過基質的發送路徑寫入原始位元組，這會自動套用
編輯保護哨兵。攜帶
`__OPENCLAW_REDACTED__`（逐字或作為子字串）的葉節點會在寫入時被拒絕
並回傳 `OC_EMIT_SENTINEL`。CLI 也會從其列印的任何
人類或 JSON 輸出中清理字面哨兵，將其替換為 `[REDACTED]`，因此終端機
擷取和管線從不會洩漏標記。

## 相關

- [`openclaw path` CLI 參考資料](/zh-Hant/cli/path)
- [管理外掛程式](/zh-Hant/plugins/manage-plugins)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
