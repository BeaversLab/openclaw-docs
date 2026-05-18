---
summary: "`openclaw path` 的 CLI 參考資料（透過 `oc://` 定址配置來檢查和編輯工作區檔案）"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Path"
---

# `openclaw path`

外掛程式提供的 Shell 存取權限，可存取 `oc://` 定址基層 (substrate)：一種
用於檢查和編輯可定址工作區檔案（markdown、c、l、yaml/yml/lobster）的單一種類分派
路徑配置。自託管者、外掛程式作者和編輯器擴充功能使用它來讀取、尋找或更新
特定位置，而無需手動為每種檔案類型編寫解析器。

此 CLI 反映了基層的公開動詞：

- `resolve` 是具體且單一匹配的。
- `find` 是用於萬用字元、聯集、述詞和
  位置擴充的多重匹配動詞。
- `set` 僅接受具體路徑或插入標記；萬用字元模式會
  在寫入前被拒絕。

`path` 是由內建的可選 `oc-path` 外掛程式提供。請在
首次使用前啟用它：

```bash
openclaw plugins enable oc-path
```

## 為何使用它

OpenClaw 狀態分散在人工編輯的 markdown、註解 JSONC 設定、
僅附加 JSONL 日誌以及 YAML 工作流程/規格檔案中。Shell 腳本、Hooks
和代理程式通常需要從這些檔案中取得一個小數值：frontmatter 鍵、
外掛程式設定、日誌記錄欄位、YAML 步驟，或命名區段下的
項目符號項目。

`openclaw path` 為這些呼叫者提供穩定的位址，而不是針對每種檔案類型使用一次性 grep、
regex 或解析器。同一個 `oc://` 路徑可以從終端機進行驗證、
解析、搜尋、試執行和寫入，這使得細微的自動化更容易審查且更安全地重放。當
您想要更新一個葉節點同時保留檔案其餘部分的註解、
換行符號和周圍格式時，這特別有用。

當您想要的目標具有邏輯位址，但實體檔案結構各有不同時，請使用它：

- Hook 想要從帶註解的 JSONC 中讀取一個設定，並在將值寫回時不遺失註解。
- 維護腳本想要在 JSONL 日誌中尋找每個符合條件的事件欄位，而無需將整個日誌載入自訂解析器。
- 編輯器擴充功能想要透過 slug 跳轉到 markdown 區塊或項目符號項目，
  然後渲染其解析到的確切行。
- 代理程式想要在套用微小的工作區編輯之前進行試跑，並在審查時
  查看變更的位元組。

對於一般的整個檔案編輯、豐富的設定遷移或記憶體特定的寫入，您可能不需要 `openclaw path`。
這些應該使用擁有者命令或外掛程式。`path` 適用於小型、可定址的檔案操作，其中
可重複的終端機命令比另一個專屬解析器更清晰。

## 如何使用

從人工編輯的設定檔中讀取一個值：

```bash
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled'
```

預覽寫入而不觸碰磁碟：

```bash
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

在僅附加的 JSONL 日誌中尋找符合的記錄：

```bash
openclaw path find 'oc://session.jsonl/[event=tool_call]/name'
```

透過區塊和項目而非行號來定址 markdown 中的指令：

```bash
openclaw path resolve 'oc://AGENTS.md/runtime-safety/openclaw-gateway'
```

在腳本讀取或寫入之前，在 CI 或預檢腳本中驗證路徑：

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

這些指令旨在可複製到 shell 腳本中。當呼叫者需要結構化輸出時請使用 `--json`，當人員正在檢查結果時請使用 `--human`。

## 運作原理

`openclaw path` 做了四件事：

1. 將 `oc://` 位址解析為插槽：file、section、item、field 和可選的 session。
2. 根據目標副檔名選擇檔案種類的配接器（`.md`、`.jsonc`、`.jsonl`、`.yaml`、`.yml`、`.lobster` 和相關別名）。
3. 根據該檔案種類的 AST 解析插槽：markdown 標題/項目、JSONC 物件鍵/陣列索引、JSONL 行記錄，或 YAML 對應/序列節點。
4. 對於 `set`，透過相同的配接器發出編輯後的位元組，以便檔案的未接觸部分保留其註解、行尾和附近的格式，前提是該種類支援這些功能。

`resolve` 和 `set` 需要一個具體的目標。`find` 是探索性的動詞：它將萬用字元、聯集、述詞和序數擴展為您可以檢查的具體匹配項，然後再選擇一個進行寫入。

## 子指令

| 子指令                  | 用途                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `resolve <oc-path>`     | 列印路徑處的具體符合項（或「not found」）。                          |
| `find <pattern>`        | 列舉萬用字元 / 聯集 / 述詞路徑的符合項。                             |
| `set <oc-path> <value>` | 在具體路徑寫入 leaf 或插入目標。支援 `--dry-run`。                   |
| `validate <oc-path>`    | 僅解析；列印結構分解（檔案 / 區塊 / 項目 / 欄位）。                  |
| `emit <file>`           | 透過 `parseXxx` + `emitXxx` 對檔案進行來回轉換（位元組一致性診斷）。 |

## 全域旗標

| 旗標            | 用途                                                   |
| --------------- | ------------------------------------------------------ |
| `--cwd <dir>`   | 根據此目錄解析檔案插槽（預設：`process.cwd()`）。      |
| `--file <path>` | 覆寫檔案插槽的解析路徑（絕對存取）。                   |
| `--json`        | 強制 JSON 輸出（當 stdout 不是 TTY 時為預設）。        |
| `--human`       | 強制人類可讀輸出（當 stdout 是 TTY 時為預設）。        |
| `--dry-run`     | （僅限 `set`）列印將要寫入的位元組而不實際寫入。       |
| `--diff`        | （配合 `set --dry-run`）列出統一差異而不是完整位元組。 |

## `oc://` 語法

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

插槽規則：`field` 需要 `item`，而 `item` 需要 `section`。在所有四個插槽中：

- **引號段落** — `"a/b.c"` 可保留 `/` 和 `.` 分隔符。
  內容為位組字面值；`"` 和 `\` 不允許出現在引號內。
  檔案插槽也支援引號：`oc://"skills/email-drafter"/Tools/$last`
  將 `skills/email-drafter` 視為單一檔案路徑。
- **述詞** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、
  `[k>=v]`。數值運算要求兩側皆可強制轉換為有限數字。
- **聯集** — `{a,b,c}` 符合任何一個選項。
- **萬用字元** — `*`（單一子段落）和 `**`（零或多個，
  遞迴）。`find` 接受這些；`resolve` 和 `set` 因模稜兩可而拒絕它們。
- **位置性** — `$first` / `$last` 解析為首個 / 最後索引或
  宣告的鍵。
- **序數** — `#N` 用於依文件順序的第 N 個符合項。
- **插入標記** — `+`、`+key`、`+nnn` 用於鍵值 / 索引
  插入（與 `set` 搭配使用）。
- **工作階段範圍** — `?session=cron-daily` 等。與插槽
  巢狀結構正交。工作階段值為原始值，未經百分比解碼；它們不可包含
  控制字元或保留的查詢分隔符（`?`、`&`、`%`）。

位於引號、述詞或聯集區段之外的保留字元（`?`、`&`、`%`）會被拒絕。控制字元（U+0000-U+001F、U+007F）在任何地方都會被拒絕，包括 `session` 查詢值。

對於規範路徑，保證 `formatOcPath(parseOcPath(path)) === path`。非規範查詢參數會被忽略，但第一個非空的 `session=` 值除外。

## 按檔案類型定址

| 類型              | 定址模型                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Markdown          | 依照 slug 定址 H2 區段，依照 slug 或 `#N` 定址項目項目，透過 `[frontmatter]` 定址 frontmatter。 |
| JSONC/JSON        | 物件鍵和陣列索引；除非加引號，否則點號會分割巢狀子區段。                                        |
| JSONL             | 頂層行位址（`L1`、`L2`、`$first`、`$last`），然後在行內進行 JSONC 樣式的下探。                  |
| YAML/YML/.lobster | 映射鍵和序列索引；註解和流暢樣式由 YAML 文件 API 處理。                                         |

`resolve` 傳回結構化比對結果：`root`、`node`、`leaf` 或 `insertion-point`，並附上從 1 開始的行號。葉節點值會以文字形式呈現，並附帶 `leafType`，讓外掛作者可以呈現預覽，而無需依賴特定類型的 AST 形狀。

## 變更契約

`set` 寫入一個具體目標：

- Markdown frontmatter 值和 `- key: value` 項目欄位是字串葉節點。
  Markdown 插入會附加區段、frontmatter 鍵或區段項目，並為變更後的檔案呈現規範的 markdown 形狀。
- JSONC leaf writes coerce the string value to the existing leaf type
  (`string`, finite `number`, `true`/`false`, or `null`). JSONC object and array
  insertions parse `<value>` as JSON and use the `jsonc-parser` edit path for
  ordinary leaf writes, preserving comments and nearby formatting.
- JSONL leaf writes coerce like JSONC inside a line. Whole-line replacement and
  append parse `<value>` as JSON. Rendered JSONL preserves the file's dominant
  LF/CRLF line-ending convention.
- YAML leaf writes coerce to the existing scalar type (`string`, finite
  `number`, `true`/`false`, or `null`). YAML insertions use the bundled
  `yaml` package's document API for map/sequence updates. Malformed YAML
  documents with parser errors are refused before mutation with `parse-error`.

Use `--dry-run` before user-visible writes when the exact bytes matter. The
substrate preserves byte-identical output for parse/emit round-trips, but a
mutation can canonicalize the edited region or file depending on kind.
Add `--diff` when you want the preview as a focused before/after patch instead
of the full rendered file.

## Examples

```bash
# Validate a path (no filesystem access)
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# Read a leaf
openclaw path resolve 'oc://gateway.jsonc/version'

# Wildcard search
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# Dry-run a write
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# Dry-run a write as a unified diff
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff

# Apply the write
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# Byte-fidelity round-trip (diagnostic)
openclaw path emit ./AGENTS.md
```

More grammar examples:

```bash
# Quote keys containing / or .
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# Predicate search over JSONC children
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# Insert into a JSONC array
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# Insert a JSONC object key
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# Append a JSONL event
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# Resolve the last JSONL value line
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# Resolve a YAML workflow step
openclaw path resolve 'oc://workflow.yaml/steps/0/id'

# Update a YAML scalar
openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --dry-run

# Address markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# Insert markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# Find markdown item fields
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# Validate a session-scoped path
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## Recipes by file kind

The same five verbs work across kinds; the addressing scheme dispatches on the
file extension. The examples below use the fixtures from the PR description.

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: email drafting agent
tier: core
---
## Tools
- gh: GitHub CLI
- curl: HTTP client
- send_email: enabled
```

```bash
$ openclaw path resolve 'oc://x.md/[frontmatter]/tier' --file frontmatter.md --human
leaf @ L4: "core" (string)

$ openclaw path resolve 'oc://x.md/tools/gh/gh' --file frontmatter.md --human
leaf @ L9: "GitHub CLI" (string)

$ openclaw path find 'oc://x.md/tools/*' --file frontmatter.md --human
3 matches for oc://x.md/tools/*:
  oc://x.md/tools/gh           →  node @ L9 [md-item]
  oc://x.md/tools/curl         →  node @ L10 [md-item]
  oc://x.md/tools/send-email   →  node @ L11 [md-item]
```

The `[frontmatter]` predicate addresses the YAML frontmatter block; `tools`
matches the `## Tools` heading via slug, and item leaves keep their slug form
even when the source uses underscores (`send_email` → `send-email`).

### JSONC

```text
// config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": false, "role": "chat"}
  }
}
```

```bash
$ openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --file config.jsonc --human
leaf @ L4: "true" (boolean)

$ openclaw path set 'oc://config.jsonc/plugins/slack/enabled' 'true' --file config.jsonc --dry-run
--dry-run: would write 142 bytes to /…/config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": true, "role": "chat"}
  }
}
```

JSONC 編輯作業透過 `jsonc-parser` 進行，因此註解和空白字元能在 `set` 中保留下來。請先執行 `--dry-run` 以在提交前檢查位元組內容。

### JSONL

```text
{"event":"start","userId":"u1","ts":1}
{"event":"action","userId":"u1","ts":2}
{"event":"end","userId":"u1","ts":3}
```

```bash
$ openclaw path find 'oc://session.jsonl/[event=action]/userId' --file session.jsonl --human
1 match for oc://session.jsonl/[event=action]/userId:
  oc://session.jsonl/L2/userId  →  leaf @ L2: "u1" (string)

$ openclaw path resolve 'oc://session.jsonl/L2/ts' --file session.jsonl --human
leaf @ L2: "2" (number)
```

每一行都是一筆記錄。當您不知道行號時，請使用謂詞 (`[event=action]`) 進行定址；若知道，則使用標準的 `LN` 片段。

### YAML

```text
# workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify
    command: openclaw.invoke
```

```bash
$ openclaw path resolve 'oc://workflow.yaml/steps/0/id' --file workflow.yaml --human
leaf @ L3: "fetch" (string)

$ openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --file workflow.yaml --dry-run
--dry-run: would write 99 bytes to /…/workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify-renamed
    command: openclaw.invoke
```

YAML 使用 `yaml` 套件的 `Document` API 而非自訂的解析器，因此一般的解析/輸出來回轉換會保留註解和編寫形狀，而解析後的路徑則使用與 JSONC 相同的 map-key / sequence-index 模型。同一個適配器也處理 `.yaml`、`.yml` 和 `.lobster` 檔案。

## 子命令參考

### `resolve <oc-path>`

讀取單一 leaf 或節點。萬用字元會被拒絕 — 請使用 `find`。匹配時以 `0` 結束，乾淨地未匹配時以 `1` 結束，解析錯誤或拒絕的模式則以 `2` 結束。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

列舉萬用字元 / 謂詞 / 聯集模式的每個匹配項。至少有一個匹配時以 `0` 結束，零個時以 `1` 結束。檔案槽位的萬用字元會被拒絕並回傳 `OC_PATH_FILE_WILDCARD_UNSUPPORTED` — 請傳入具體的檔案 (多檔案 globbing 是後續功能)。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

寫入一個 leaf。搭配 `--dry-run` 以預覽將被寫入的位元組而不觸及檔案。加入 `--diff` 以取得 unified diff 預覽。成功寫入時以 `0` 結束，若基層拒絕 (例如觸及哨兵守衛) 則以 `1` 結束，解析錯誤則以 `2` 結束。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入標記會在子項不存在時建立具名的子項；`+nnn` 和單純的 `+` 則分別用於索引插入和附加插入。

### `validate <oc-path>`

僅解析檢查。不存取檔案系統。當您想要在替換變數前確認範本路徑格式正確，或當您想要用於除錯的結構性細分時，這很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效時退出 `0`，無效時退出 `1`（附帶結構化的 `code` 和
`message`），發生引數錯誤時退出 `2`。

### `emit <file>`

透過各類型解析器和發送器對檔案進行來回轉換。在健全的檔案上，輸出應在位元組上與輸入完全相同 — 差異表示解析器錯誤或遇到哨兵。這對於除錯真實輸入上的基質行為很有用。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出代碼

| 代碼 | 含義                                                            |
| ---- | --------------------------------------------------------------- |
| `0`  | 成功。（`resolve` / `find`：至少一個符合項。`set`：寫入成功。） |
| `1`  | 無符合項，或 `set` 被基質拒絕（無系統層級錯誤）。               |
| `2`  | 引數或解析錯誤。                                                |

## 輸出模式

`openclaw path` 具備 TTY 感知能力：在終端機上輸出人類可讀的文字，當 stdout 被管道傳輸或重新導向時則輸出 JSON。`--json` 和 `--human` 會覆寫自動偵測。

## 備註

- `set` 透過基質的發送路徑寫入位元組，該路徑會自動套用編輯哨兵防護。攜帶
  `__OPENCLAW_REDACTED__`（逐字或作為子字串）的葉節點會在寫入時被拒絕。
- JSONC 解析和葉節點編輯使用外掛程式本地的 `jsonc-parser`
  依賴項，因此註解和格式會在一般葉節點寫入時保留，而不會透過手動解析/重新渲染路徑。
- `path` 不認識 LKG。如果檔案受到 LKG 追蹤，下一次 observe 呼叫將決定是否升級 / 復原。`set --batch` 用於
  透過 LKG 升級/復原生命週期進行原子性多重設定，預計將與 LKG 復原基質一起推出。

## 相關

- [CLI 參考](/zh-Hant/cli)
