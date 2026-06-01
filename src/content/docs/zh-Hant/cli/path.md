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
- JSONC leaf 寫入會將字串值強制轉換為現有的 leaf 類型
  (`string`、有限的 `number`、`true`/`false` 或 `null`)。當 JSONC/JSON/JSONL leaf 替換應將 `<value>` 解析為 JSON 且
  可能會改變形狀時（例如用物件取代字串 SecretRef 簡寫），請使用 `--value-json`。
  JSONC 物件與陣列的插入會將 `<value>` 解析為 JSON，並使用
  `jsonc-parser` 編輯路徑進行一般 leaf 寫入，以保留註解與
  相鄰的格式。
- JSONL leaf 寫入會在單行內像 JSONC 一樣進行強制轉換。整行替換與
  附加會將 `<value>` 解析為 JSON。輸出的 JSONL 會保留檔案主要的
  LF/CRLF換行符慣例。
- YAML leaf 寫入會強制轉換為現有的純量類型 (`string`、有限的
  `number`、`true`/`false` 或 `null`)。YAML 插入使用內建的
  `yaml` 套件之文件 API 進行 map/sequence 更新。格式錯誤且
  含有解析器錯誤的 YAML 文件會在變更前透過 `parse-error` 拒絕。

當確切的位元組很重要時，請在使用者可見的寫入前使用 `--dry-run`。
substrate 會在解析/輸出的往返中保留位元組一致的輸出，但根據類型，
變更可能會將編輯的區域或檔案標準化。當您希望預覽是
專注的修改前後差異，而非完整的輸出檔案時，請新增 `--diff`。

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

# Deep JSON/JSONC paths can use slash segments; they normalize to dotted subsegments
openclaw path set 'oc://openclaw.json/agents/list/0/tools/exec/security' 'allowlist' --dry-run

# Replace a JSONC leaf with a parsed object
openclaw path set 'oc://openclaw.json/gateway/auth/token' '{"source":"file","provider":"secrets","id":"/test"}' --value-json --dry-run

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

`[frontmatter]` 述詞用於定址 YAML frontmatter 區塊；`tools`
透過 slug 比對 `## Tools` 標題，且項目 leaf 會保持其 slug 形式，
即使來源使用底線也是如此 (`send_email` → `send-email`)。

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

JSONC 編輯會透過 `jsonc-parser` 進行，因此註解與空白字元能在
`set` 中保留下來。請先執行 `--dry-run` 以在提交前檢查位元組。

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

每一行都是一個記錄。當您不知道行號時，透過述詞 (`[event=action]`) 定址，或者在知道時透過標準 `LN` 區段定址。

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

YAML 使用 `yaml` 套件的 `Document` API，而非手寫的解析器，因此一般的解析/輸出往返過程會保留註解和撰寫形狀，而解析後的路徑則使用與 JSONC 相同的 map-key / sequence-index 模型。同一個配接器處理 `.yaml`、`.yml` 和 `.lobster` 檔案。

## 子命令參考

### `resolve <oc-path>`

讀取單一葉節點或節點。不接受萬用字元 — 請使用 `find`。匹配時傳回 `0`，乾淨的未匹配傳回 `1`，解析錯誤或拒絕的樣式傳回 `2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

列舉萬用字元 / 述詞 / 聯集樣式的每個匹配項。若至少有一個匹配則傳回 `0`，零個則傳回 `1`。檔案槽位的萬用字元會被拒絕並傳回 `OC_PATH_FILE_WILDCARD_UNSUPPORTED` — 請傳入具體檔案（多檔案全域搜尋是後續功能）。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

寫入葉節點。搭配 `--dry-run` 以預覽將被寫入的位元組而不會觸碰檔案。加入 `--diff` 以取得 unified diff 預覽。成功寫入時傳回 `0`，若基板拒絕（例如，觸及哨兵防護）則傳回 `1`，解析錯誤則傳回 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入標記會在具名子項不存在時建立它；`+nnn` 和裸露的 `+` 分別用於索引和附加插入。

### `validate <oc-path>`

僅解析檢查。不存取檔案系統。當您想要在替換變數前確認範本路徑格式正確，或當您想要用於除錯的結構性細分時，這很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效時傳回 `0`，無效時傳回 `1`（並帶有結構化的 `code` 和 `message`），引數錯誤則傳回 `2`。

### `emit <file>`

透過各類型解析器和發送器對檔案進行來回轉換。在健全的檔案上，輸出應在位元組上與輸入完全相同 — 差異表示解析器錯誤或遇到哨兵。這對於除錯真實輸入上的基質行為很有用。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出代碼

| 代碼 | 含義                                                            |
| ---- | --------------------------------------------------------------- |
| `0`  | 成功。（`resolve` / `find`：至少一個相符項。`set`：寫入成功。） |
| `1`  | 沒有相符項，或 `set` 被基礎層拒絕（無系統層級錯誤）。           |
| `2`  | 引數或解析錯誤。                                                |

## 輸出模式

`openclaw path` 感知 TTY：在終端機上輸出人類可讀的文字，當 stdout 被管道傳輸或重新導向時輸出 JSON。`--json` 和 `--human` 會覆寫自動偵測設定。

## 備註

- `set` 透過基礎層的發送路徑寫入位元組，這會自動套用編輯守衛。包含 `__OPENCLAW_REDACTED__`（逐字或作為子字串）的葉節點會在寫入時被拒絕。
- JSONC 解析和葉節點編輯使用外掛本地的 `jsonc-parser` 相依性，因此註解和格式會在一般葉節點寫入時被保留，而不會透過手動撰寫的解析器/重新渲染路徑。
- `path` 不瞭解 LKG。如果檔案正在追蹤 LKG，下一次的觀察呼叫會決定是否要升級 / 復原。計劃與 LKG 復原基礎層一起推出 `set --batch` 以透過 LKG 升級/復原生命週期進行原子多重設定。

## 相關

- [CLI 參考](/zh-Hant/cli)
