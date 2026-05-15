---
summary: "隨附的 `oc-path` 外掛程式：為 `oc://` 工作區檔案定址方案提供 `openclaw path` CLI"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "OC Path 外掛程式"
---

隨附的 `oc-path` 外掛程式新增了用於
`oc://` 工作區檔案定址方案的 [`openclaw path`](/zh-Hant/cli/path) CLI。它隨附於 OpenClaw 存儲庫中的
`extensions/oc-path/`，但屬於選用功能 — 安裝/建構會使其處於休眠狀態，直到您
啟用它為止。

`oc://` 位址指向工作區檔案內的單個節點（或一組通配符節點）。
該外掛程式目前支援三種檔案類型：

- **markdown** (`.md`, `.mdx`)：frontmatter、章節、項目、欄位
- **c** (`.jsonc`, `.json5`, `.json`)：保留註解和格式
- **l** (`.jsonl`, `.ndjson`)：行導向記錄

自託管者和編輯器擴充功能使用 CLI 來讀取或寫入單個節點，
而無需直接針對 SDK 進行腳本編寫；代理程式和掛鉤將其視為
確定性基質，因此位元精確度的往返和編輯
哨兵防護在各種類型中均統一適用。

## 為何啟用它

當您希望腳本、掛鉤或本機代理程式工具能夠指向
工作區狀態的特定部分，而無需為每種檔案
形狀發明解析器時，請啟用 `oc-path`。單個 `oc://` 位址可以命名 markdown frontmatter 鍵、章節
項目、JSONC 配置節點或 JSONL 事件欄位。

這對於維護者工作流程很重要，因為變更應該是微小的、
可審計的且可重複的：檢查一個值，尋找匹配記錄，對
寫入進行試執行，然後僅應用該節點，同時保留註解、行尾和
附近的格式不變。將其保留為選用外掛程式為高級用戶提供了
定址基質，而無需將解析器依賴項或 CLI 介面放入
從不需要它的安裝的核心中。

啟用它的常見原因：

- **本機自動化**：Shell 腳本可以使用 `openclaw path … --json` 來解析或更新單一工作區數值，而無需攜帶各自的 Markdown、JSONC 和 JSONL 解析代碼。
- **代理可見的編輯**：代理在寫入之前可以顯示單一定位葉節點的試運行差異，這比自由形式的文件重寫更容易審查。
- **編輯器整合**：編輯器可以將 `oc://AGENTS.md/tools/gh` 映射到精確的 Markdown 節點和行號，而無需從標題文字進行猜測。
- **診斷**：`emit` 將文件通過解析器和發射器進行來回轉換，因此您可以在依賴自動化編輯之前檢查文件類型是否位元組穩定。

具體範例：

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

該外掛刻意不擁有高階語意。記憶體外掛仍然擁有記憶體寫入，配置指令仍然擁有完整的配置管理，而 LKG 邏輯仍然擁有還原/提升。`oc-path` 是這些高階工具可以圍繞其構建的狹尋址和位元組保留文件操作層。

## 運行位置

該外掛在您調用指令的主機上，於 `openclaw` CLI **內部進程中**運行。它不需要運行中的 Gateway，也不會開啟任何網路套接字——每個動詞都是對您指定的文件進行的純轉換。

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

`onStartup: false` 使該外掛脫離 Gateway 的熱路徑。`onCommands:
["path"]` 告訴 CLI 在您首次運行 `openclaw path …` 時延遲加載該外掛，因此從不使用該動詞的安裝不會產生任何成本。

## 啟用

```bash
openclaw plugins enable oc-path
```

重新啟動 Gateway（如果您運行一個），以便清單快照能獲取新狀態。純 `openclaw path` 調用在同一主機上立即生效——CLI 會按需加載該外掛。

停用方式：

```bash
openclaw plugins disable oc-path
```

## 相依性

所有解析器相依性都是外掛本地的——啟用 `oc-path` 不會將新套件引入核心運行時：

| 相依性         | 用途                                                             |
| -------------- | ---------------------------------------------------------------- |
| `commander`    | 用於 `resolve`、`find`、`set`、`validate`、`emit` 的子指令佈線。 |
| `jsonc-parser` | JSONC 解析 + 編輯葉節點並保留註解與尾隨逗號。                    |
| `markdown-it`  | 針對 section / item / field 模型的 Markdown 標記化。             |

JSONL 維持手寫實作 — 逐行解析比任何相依套件都簡單，且每行的 JSONC 解析已透過 `jsonc-parser` 處理。

## 提供的功能

| 介面                        | 提供者                                                  |
| --------------------------- | ------------------------------------------------------- |
| `openclaw path` CLI         | `extensions/oc-path/cli-registration.ts`                |
| `oc://` 解析器 / 格式化工具 | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 依類型解析 / 輸出 / 編輯    | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl}`       |
| 通用解析 / 查找 / 設定      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 編輯哨兵防護                | `extensions/oc-path/src/oc-path/sentinel.ts`            |

CLI 是目前唯一的公開介面。基礎動詞為外掛程式內部私有；使用者使用 CLI（或透過 SDK 建構自己的外掛程式）。

## 與其他外掛程式的關係

- **`memory-*`**：記憶體寫入會透過記憶體外掛程式進行，而非 `oc-path`。
  `oc-path` 是通用檔案基礎層；記憶體外掛程式會在其上疊加自身的語義。
- **LKG**：`path` 不瞭解「上次已知良好 (Last-Known-Good)」設定還原。若
  檔案受 LKG 追蹤，下一次 `observe` 呼叫會決定要提升還是
  復原；透過 LKG 提升/復原生命週期進行原子性多重設定的 `set --batch` 已規劃與 LKG 復原基礎層一起推出。

## 安全性

`set` 透過基礎層的輸出路徑寫入原始位元組，該路徑會自動套用
編輯哨兵防護。攜帶
`__OPENCLAW_REDACTED__`（原樣或作為子字串）的葉節點會在寫入時被拒絕
並回傳 `OC_EMIT_SENTINEL`。CLI 也會從其列印的任何
人類可讀或 JSON 輸出中清除字面哨兵，將其替換為 `[REDACTED]`，以免終端機
擷取與管線洩漏標記。

## 相關連結

- [`openclaw path` CLI 參考資料](/zh-Hant/cli/path)
- [管理外掛程式](/zh-Hant/plugins/manage-plugins)
- [建構外掛程式](/zh-Hant/plugins/building-plugins)
