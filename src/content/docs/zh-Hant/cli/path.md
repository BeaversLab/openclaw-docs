---
summary: "`openclaw path` 的 CLI 參考（透過 `oc://` 定址機制來檢查與編輯工作區檔案）"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Path"
---

# `openclaw path`

外掛程式提供的 Shell 存取方式，可連接至 `oc://` 定址基層：這是一種依類型分發的路徑機制，用於檢查與編輯可定址的工作區檔案（markdown、c、l）。自託管使用者、外掛作者以及編輯器擴充功能使用它來讀取、尋找或更新特定位置，而無需手動為每種檔案類型編寫解析器。

此 CLI 反映了基層的公開動詞：

- `resolve` 是具體且單一匹配的。
- `find` 是用於萬用字元、聯集、述詞和位置擴展的多重匹配動詞。
- `set` 僅接受具體路徑或插入標記；萬用字元模式會在寫入前被拒絕。

`path` 是由內建的可選 `oc-path` 外掛程式所提供。請在首次使用前啟用它：

```bash
openclaw plugins enable oc-path
```

## 為何使用它

OpenClaw 狀態散佈於人為編輯的 markdown、帶註解的 JSONC 設定以及僅追加的 JSONL 日誌中。Shell 腳本、Hook 和代理程式通常需要從這些檔案中取得一個小數值：frontmatter 鍵值、外掛設定、日誌記錄欄位，或是具名區段下的清單項目。

`openclaw path` 為這些呼叫者提供了一個穩定的位址，而不是為每種檔案類型撰寫一次性的 grep、regex 或解析器。同一個 `oc://` 路徑可以在終端機中進行驗證、解析、搜尋、試執行和寫入，這讓精簡的自動化更容易審查且更安全地重播。當您想更新一個葉節點同時保留檔案其餘部分的註解、換行符號和周圍格式時，這特別有用。

當您想要的目標具有邏輯位址，但實體檔案結構各有不同時，請使用它：

- Hook 想要從帶註解的 JSONC 中讀取一個設定，並在將值寫回時不遺失註解。
- 維護腳本想要在 JSONL 日誌中尋找每個符合條件的事件欄位，而無需將整個日誌載入自訂解析器。
- 編輯器擴充功能想要透過 slug 跳轉到 markdown 區塊或項目符號項目，
  然後渲染其解析到的確切行。
- 代理程式想要在套用微小的工作區編輯之前進行試跑，並在審查時
  查看變更的位元組。

對於一般的全檔案編輯、豐富的設定遷移或記憶體特定的寫入，您可能不需要 `openclaw path`。這些應該使用擁有者
指令或外掛程式。`path` 適用於小型、可定址的檔案操作，在這種情況下，
可重複的終端機指令比另一個客製解析器更清晰。

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

這些指令旨在複製到 shell 腳本中。當呼叫者需要結構化輸出時使用 `--json`，當人員正在檢查
結果時使用 `--human`。

## 運作原理

`openclaw path` 做四件事：

1. 將 `oc://` 位址解析為插槽：檔案、區塊、項目、欄位和
   可選的工作階段。
2. 從目標副檔名選擇檔案類型適配器（`.md`、`.jsonc`、
   `.jsonl` 和相關別名）。
3. 根據該檔案類型的 AST 解析插槽：markdown 標題/項目、
   JSONC 物件鍵/陣列索引，或 JSONL 行記錄。
4. 對於 `set`，透過相同的適配器輸出編輯後的位元組，以便檔案的未觸碰
   部分保留其註解、行尾和附近的格式，
   只要該類型支援。

`resolve` 和 `set` 需要一個具體的目標。`find` 是探索性
指令：它將萬用字元、聯集、述詞和序數擴充為具體的
符合項，您可以在選擇一個進行寫入之前進行檢查。

## 子指令

| 子指令                  | 用途                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `resolve <oc-path>`     | 列印路徑處的具體符合項（或「not found」）。                        |
| `find <pattern>`        | 列舉萬用字元 / 聯集 / 述詞路徑的符合項。                           |
| `set <oc-path> <value>` | 在具體路徑寫入葉節點或插入目標。支援 `--dry-run`。                 |
| `validate <oc-path>`    | 僅解析；列印結構分解（檔案 / 區塊 / 項目 / 欄位）。                |
| `emit <file>`           | 透過 `parseXxx` + `emitXxx` 進行檔案來回轉換（位元組精確度診斷）。 |

## 全域旗標

| 旗標            | 用途                                                 |
| --------------- | ---------------------------------------------------- |
| `--cwd <dir>`   | 針對此目錄解析檔案插槽（預設：`process.cwd()`）。    |
| `--file <path>` | 覆寫檔案插槽的解析路徑（絕對存取）。                 |
| `--json`        | 強制 JSON 輸出（當 stdout 不是 TTY 時為預設）。      |
| `--human`       | 強制人類可讀輸出（當 stdout 是 TTY 時為預設）。      |
| `--dry-run`     | （僅適用於 `set`）列印將被寫入的位元組而不實際寫入。 |

## `oc://` 語法

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

插槽規則：`field` 需要 `item`，而 `item` 需要 `section`。對於所有四個插槽：

- **引號片段** — `"a/b.c"` 可保留 `/` 和 `.` 分隔符。
  內容為位元組字面量；`"` 和 `\` 不允許出現在引號內。
  檔案插槽也具有引號感知能力：`oc://"skills/email-drafter"/Tools/$last`
  將 `skills/email-drafter` 視為單一檔案路徑。
- **謂詞** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、
  `[k>=v]`。數值運算要求兩側皆可強制轉換為有限數字。
- **聯集** — `{a,b,c}` 符合任何一個替代項。
- **萬用字元** — `*`（單一子片段）和 `**`（零或多個，
  遞迴）。`find` 接受這些；`resolve` 和 `set` 因具有歧義而拒絕這些字元。
- **位置** — `$last` 解析為最後一個索引 / 最後一個宣告的鍵。
- **序數** — `#N` 用於按文件順序的第 N 個匹配項。
- **插入標記** — `+`、`+key`、`+nnn` 用於鍵/索引
  插入（與 `set` 一起使用）。
- **會話作用域** — `?session=cron-daily` 等。與插槽
  巢套正交。會話值是原始的，未經百分比解碼；它們不能包含
  控制字元或保留的查詢分隔符（`?`、`&`、`%`）。

引號、謂詞或聯集
片段之外的保留字元（`?`、`&`、`%`）將被拒絕。控制字元（U+0000-U+001F、U+007F）在
任何地方都會被拒絕，包括 `session` 查詢值。

對於正規路徑，保證 `formatOcPath(parseOcPath(path)) === path`。
除了第一個非空的
`session=` 值外，非正規查詢參數將被忽略。

## 依檔案類型定址

| 類型       | 定址模型                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Markdown   | 透過 slug 定址 H2 區段，透過 slug 或 `#N` 定址項目符號項目，透過 `[frontmatter]` 定址 frontmatter。 |
| JSONC/JSON | 物件鍵和陣列索引；除非加上引號，否則點號會分割巢狀子片段。                                          |
| JSONL      | 頂層行位址（`L1`、`L2`、`$last`），然後在行內進行 JSONC 風格的下降存取。                            |

`resolve` 返回一個結構化匹配：`root`、`node`、`leaf` 或
`insertion-point`，並附帶從 1 開始的行號。葉值會以文字形式呈現
以及一個 `leafType`，以便外掛程式作者可以在不依賴
特定類型 AST 形狀的情況下呈現預覽。

## 變更約定

`set` 寫入一個具體目標：

- Markdown frontmatter 值和 `- key: value` 項目欄位是字串葉節點。
  Markdown 插入動作會附加區段、frontmatter 鍵值或區段項目，並為變更後的檔案
  轉譯出標準的 markdown 形式。
- JSONC 葉節點寫入會將字串值強制轉換為現有葉節點的類型
  (`string`、有限的 `number`、`true`/`false` 或 `null`)。JSONC 物件和陣列
  插入會將 `<value>` 解析為 JSON，並對於
  一般葉節點寫入使用 `jsonc-parser` 編輯路徑，同時保留註解與
  附近的格式設定。
- JSONL 葉節點寫入會像 JSONC 一樣在行內進行強制轉換。整行取代與
  附加會將 `<value>` 解析為 JSON。轉譯後的 JSONL
  會保留檔案中主要的 LF/CRLF 行尾慣例。

當確切的位元組很重要時，請在使用者可見的寫入之前使用 `--dry-run`。
substrate 會為解析/輸出循環保留位元組一致的輸出，但根據類型，
變更操作可能會將編輯區域或檔案標準化。

## 範例

```bash
# Validate a path (no filesystem access)
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# Read a leaf
openclaw path resolve 'oc://gateway.jsonc/version'

# Wildcard search
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# Dry-run a write
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# Apply the write
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# Byte-fidelity round-trip (diagnostic)
openclaw path emit ./AGENTS.md
```

更多語法範例：

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

# Address markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# Insert markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# Find markdown item fields
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# Validate a session-scoped path
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## 依檔案類型分類的配方

同樣的五個動詞適用於所有類型；定址配置會根據
檔案副檔名進行分派。下列範例使用 PR 描述中的測試資料。

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
透過 slug 符合 `## Tools` 標題，且項目葉節點會保持其 slug 形式，
即使來源使用了底線 (`send_email` → `send-email`)。

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

JSONC 編輯會透過 `jsonc-parser` 進行，因此註解與空白字元在
`set` 中會被保留下來。請先使用 `--dry-run` 執行以
在提交前檢查位元組。

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

每一行都是一筆記錄。當您不知道行號時，請透過述詞 (`[event=action]`) 定址，
或在知道行號時透過標準的 `LN` 片段定址。

## 子指令參考

### `resolve <oc-path>`

讀取單個葉子或節點。不接受萬用字元 — 請針對這些情況使用 `find`。
匹配時退出 `0`，完全未匹配時退出 `1`，發生解析錯誤或拒絕
模式時退出 `2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

列舉萬用字元 / 述詞 / 聯集模式的每個匹配項。至少有一個匹配時退出 `0`，
零個匹配時退出 `1`。檔案槽位萬用字元會被拒絕並傳回
`OC_PATH_FILE_WILDCARD_UNSUPPORTED` — 請傳入具體檔案（多檔案
萬用字元匹配是後續功能）。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

寫入一個葉子。搭配 `--dry-run` 可在不觸及檔案的情況下預覽將被寫入的
位元組。寫入成功時退出 `0`，若
基板拒絕（例如，觸發哨兵防護）則退出 `1`，發生解析
錯誤時退出 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入標記會在具名子項不存在時建立它；`+nnn` 和裸露的 `+` 分別適用於索引和附加插入。

### `validate <oc-path>`

僅解析檢查。不存取檔案系統。當您想要在替換變數之前確認範本
路徑格式正確，或者當您想要用於除錯的結構分解時，這很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效時退出 `0`，無效時退出 `1`（並附帶結構化的 `code` 和
`message`），引數錯誤時退出 `2`。

### `emit <file>`

透過各種類型的解析器和發射器對檔案進行來回轉換。對於健全的檔案，輸出應
與輸入位元組完全一致 — 出現差異表示
解析器錯誤或觸發哨兵。這對於在真實輸入上除錯基板行為
很有用。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出代碼

| 代碼 | 含義                                                        |
| ---- | ----------------------------------------------------------- |
| `0`  | 成功。(`resolve` / `find`：至少一個匹配。`set`：寫入成功。) |
| `1`  | 無相符結果，或 `set` 被基層拒絕（無系統層級錯誤）。         |
| `2`  | 引數或解析錯誤。                                            |

## 輸出模式

`openclaw path` 可感知 TTY：在終端機上輸出人類可讀的文字，當 stdout 被管道傳輸或重新導向時則輸出 JSON。`--json` 和 `--human` 可覆寫自動偵測。

## 註記

- `set` 透過基層的 emit 路徑寫入位元組，該路徑會自動套用 redaction-sentinel 防護。攜帶 `__OPENCLAW_REDACTED__`（原樣或作為子字串）的葉節點會在寫入時被拒絕。
- JSONC 解析和葉節點編輯使用外掛區域的 `jsonc-parser` 相依性，因此註解和格式會在一般的葉節點寫入中被保留，而不會透過手動解析/重新渲染路徑。
- `path` 不認識 LKG。如果檔案受到 LKG 追蹤，下一次 observe 呼叫會決定是否要提升/恢復。`set --batch` 用於透過 LKG promote/recover 生命週期進行原子性多重設定，預計會與 LKG-recovery 基層一起規劃。

## 相關

- [CLI 參考](/zh-Hant/cli)
