---
summary: "CLI 参考，用于 `openclaw path`（通过 `oc://` 寻址方案检查和编辑工作区文件）"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Path"
---

# `openclaw path`

插件提供的 Shell 访问 `oc://` 寻址基底：一种用于检查和编辑可寻址工作区文件（markdown、c、l、yaml/yml/lobster）的单一类型分发路径方案。自托管者、插件作者和编辑器扩展使用它来读取、查找或更新特定位置，而无需手动编写针对每种文件的解析器。

CLI 映射了底层的公共动词：

- `resolve` 是具体的且单次匹配的。
- `find` 是用于通配符、联合、谓词和位置扩展的多重匹配动词。
- `set` 仅接受具体路径或插入标记；通配符模式在写入前会被拒绝。

`path` 由捆绑的可选 `oc-path` 插件提供。首次使用前请启用它：

```bash
openclaw plugins enable oc-path
```

## 为何使用它

OpenClaw 状态分布在人工编辑的 markdown、带注释的 JSONC 配置、仅追加的 JSONL 日志以及 YAML 工作流/规范文件中。Shell 脚本、钩子和代理通常需要从这些文件中获取一个小值：frontmatter 键、插件设置、日志记录字段、YAML 步骤或命名部分下的项目符号项。

`openclaw path` 为这些调用者提供了一个稳定的地址，而不是针对每种文件类型的临时 grep、正则表达式或解析器。同一个 `oc://` 路径可以在终端中进行验证、解析、搜索、试运行和写入，这使得微小的自动化更容易审查且更安全地重放。当您想要更新一个叶子节点同时保留文件其余部分的注释、行尾和周围格式时，它特别有用。

当您想要的内容具有逻辑地址，但物理文件
形状各异时，请使用它：

- 钩子想要从带注释的 JSONC 中读取一个设置，并在
  写回值时不丢失注释。
- 一个维护脚本想要在 JSONL 日志中找到每个匹配的事件字段，而无需将整个日志加载到自定义解析器中。
- 一个编辑器扩展想要通过 slug 跳转到 markdown 部分或列表项，然后渲染它解析到的确切行。
- 一个代理想要在应用微小的工作区编辑之前进行空运行，并在审查中查看更改的字节。

对于常规的全文件编辑、复杂的配置迁移或内存特定的写入，您可能不需要 `openclaw path`。这些操作应使用所有者命令或插件。`path` 适用于小型的、可寻址的文件操作，在这些操作中，可重复的终端命令比另一个专用解析器更清晰。

## 如何使用

从人工编辑的配置文件中读取一个值：

```bash
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled'
```

预览写入而不接触磁盘：

```bash
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

在仅追加的 JSONL 日志中查找匹配的记录：

```bash
openclaw path find 'oc://session.jsonl/[event=tool_call]/name'
```

通过部分和项目而不是行号来寻址 markdown 中的指令：

```bash
openclaw path resolve 'oc://AGENTS.md/runtime-safety/openclaw-gateway'
```

在脚本读取或写入之前，在 CI 或预检脚本中验证路径：

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

这些命令旨在可复制到 Shell 脚本中。当调用者需要结构化输出时，请使用 `--json`；当人员正在检查结果时，请使用 `--human`。

## 工作原理

`openclaw path` 做四件事：

1. 将 `oc://` 地址解析为槽位：文件、部分、项、字段和可选的会话。
2. 根据目标扩展名（`.md`、`.jsonc`、`.jsonl`、`.yaml`、`.yml`、`.lobster` 及相关别名）选择文件类型适配器。
3. 根据该文件类型的 AST 解析槽位：markdown 标题/项、JSONC 对象键/数组索引、JSONL 行记录或 YAML 映射/序列节点。
4. 对于 `set`，通过同一适配器发出编辑后的字节，以便文件的未触及部分保留其注释、行尾和附近的格式（在该类型支持的情况下）。

`resolve` 和 `set` 需要一个具体的目标。`find` 是探索性动词：它将通配符、联合、谓词和序数扩展为您可以在选择一个进行写入之前检查的具体匹配项。

## 子命令

| 子命令                  | 目的                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `resolve <oc-path>`     | 打印路径下的具体匹配项（或“未找到”）。                       |
| `find <pattern>`        | 枚举通配符 / 联合 / 谓词语径的匹配项。                       |
| `set <oc-path> <value>` | 在具体路径写入叶节点或插入目标。支持 `--dry-run`。           |
| `validate <oc-path>`    | 仅解析；打印结构细分（文件 / 章节 / 项目 / 字段）。          |
| `emit <file>`           | 通过 `parseXxx` + `emitXxx` 往返处理文件（字节保真度诊断）。 |

## 全局标志

| 标志            | 用途                                                 |
| --------------- | ---------------------------------------------------- |
| `--cwd <dir>`   | 根据此目录解析文件槽位（默认：`process.cwd()`）。    |
| `--file <path>` | 覆盖文件插槽的解析路径（绝对访问）。                 |
| `--json`        | 强制 JSON 输出（当 stdout 不是 TTY 时的默认值）。    |
| `--human`       | 强制人类可读输出（当 stdout 是 TTY 时的默认值）。    |
| `--dry-run`     | （仅限 `set`）打印将要写入的字节而不实际写入。       |
| `--diff`        | （配合 `set --dry-run`）打印统一差异而不是完整字节。 |

## `oc://` 语法

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

插槽规则：`field` 需要 `item`，而 `item` 需要 `section`。在所有四个插槽中：

- **引用片段** — `"a/b.c"` 在 `/` 和 `.` 分隔符中保留。
  内容是字节字面量；`"` 和 `\` 不允许出现在引号内。
  文件插槽也支持引用：`oc://"skills/email-drafter"/Tools/$last`
  将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、
  `[k>=v]`。数值运算要求两侧都强制转换为有限数字。
- **联合** — `{a,b,c}` 匹配任意一个候选项。
- **通配符** — `*`（单个子片段）和 `**`（零个或多个，
  递归）。`find` 接受这些；`resolve` 和 `set` 因歧义拒绝这些。
- **位置** — `$first` / `$last` 解析为第一个 / 最后一个索引或
  声明的键。
- **序数** — `#N` 用于按文档顺序的第 N 次匹配。
- **插入标记** — `+`、`+key`、`+nnn` 用于按键 / 索引
  插入（与 `set` 一起使用）。
- **会话作用域** — `?session=cron-daily` 等。与插槽嵌套正交。会话值是原始值，不是百分比解码的；它们不能包含控制字符或保留的查询分隔符（`?`、`&`、`%`）。

引号、谓词或联合片段之外保留的字符（`?`、`&`、`%`）将被拒绝。控制字符（U+0000-U+001F、U+007F）在任何地方都会被拒绝，包括 `session` 查询值。

对于规范路径，保证 `formatOcPath(parseOcPath(path)) === path`。除第一个非空的 `session=` 值外，非规范的查询参数将被忽略。

## 按文件种类寻址

| 种类              | 寻址模型                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Markdown          | 通过 slug 寻址 H2 部分，通过 slug 或 `#N` 寻址项目符号项，通过 `[frontmatter]` 寻址 frontmatter。 |
| JSONC/JSON        | 对象键和数组索引；除非被引号括起来，否则点号会分割嵌套的子片段。                                  |
| JSONL             | 顶层行地址（`L1`、`L2`、`$first`、`$last`），然后在行内进行 JSONC 风格的下行查找。                |
| YAML/YML/.lobster | Map 键和序列索引；注释和流式样式由 YAML 文档 API 处理。                                           |

`resolve` 返回一个结构化匹配项：`root`、`node`、`leaf` 或 `insertion-point`，并带有从 1 开始的行号。叶节点值作为文本加上 `leafType` 呈现，以便插件作者可以在不依赖每种类型 AST 形状的情况下呈现预览。

## 变更约定

`set` 写入一个具体目标：

- Markdown frontmatter 值和 `- key: value` 项目字段是字符串叶节点。Markdown 插入会追加部分、frontmatter 键或部分项目，并为更改后的文件呈现规范的 markdown 形状。
- JSONC 叶节点写入会将字符串值强制转换为现有叶节点类型
  (`string`、有限 `number`、`true`/`false` 或 `null`)。JSONC 对象和数组
  插入会将 `<value>` 解析为 JSON，并使用 `jsonc-parser` 编辑路径进行
  普通叶节点写入，同时保留注释和附近的格式。
- JSONL 叶节点写入会在行内像 JSONC 一样进行强制转换。整行替换和
  追加会将 `<value>` 解析为 JSON。呈现的 JSONL 会保留文件主要的
  LF/CRLF 行尾约定。
- YAML 叶节点写入会强制转换为现有的标量类型 (`string`、有限
  `number`、`true`/`false` 或 `null`)。YAML 插入使用捆绑的
  `yaml`API 包的文档 API 进行映射/序列更新。在变异之前，格式错误的 YAML
  文档（带有解析器错误）将被 `parse-error` 拒绝。

当精确字节至关重要时，请在用户可见的写入之前使用 `--dry-run`。虽然
substrate 在解析/发射往返中保持字节相同的输出，但根据类型，
变异可能会规范化编辑区域或整个文件。
当您希望预览为集中的前后差异补丁而不是
完整的呈现文件时，请添加 `--diff`。

## 示例

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

更多语法示例：

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

## 按文件类型分类的配方

相同的五个动词适用于所有类型；寻址方案根据
文件扩展名进行分派。下面的示例使用了 PR 描述中的 fixture。

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

`[frontmatter]` 谓词用于寻址 YAML frontmatter 块；`tools`
通过 slug 匹配 `## Tools` 标题，并且项目叶节点会保持其 slug 形式，
即使源文件使用下划线 (`send_email` → `send-email`)。

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

JSONC 编辑通过 `jsonc-parser` 进行，因此注释和空白字符可以在 `set` 中保留下来。在提交之前，请先运行 `--dry-run` 以检查字节内容。

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

每一行是一条记录。当您不知道行号时，使用谓词 (`[event=action]`) 寻址；如果知道，则使用规范的 `LN` 段进行寻址。

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

YAML 使用 `yaml` 包的 `Document` API 而不是手工编写的解析器，因此普通的解析/输出往返会保留注释和编写形状，而解析后的路径使用与 JSONC 相同的 map-key / sequence-index 模型。同一个适配器处理 `.yaml`、`.yml` 和 `.lobster` 文件。

## 子命令参考

### `resolve <oc-path>`

读取单个叶子节点或节点。不接受通配符 — 请为此使用 `find`。匹配时退出 `0`，干净未匹配时退出 `1`，解析错误或拒绝模式时退出 `2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

枚举通配符 / 谓词 / 联合模式的每个匹配项。如果至少有一个匹配项则退出 `0`，如果没有匹配项则退出 `1`。文件槽位通配符会被拒绝并显示 `OC_PATH_FILE_WILDCARD_UNSUPPORTED` — 请传递一个具体的文件（多文件全局匹配是后续功能）。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

写入一个叶子节点。配合 `--dry-run` 使用，以在不接触文件的情况下预览将要写入的字节。添加 `--diff` 以获取统一差异预览。写入成功时退出 `0`，如果底层拒绝（例如，触及哨兵保护）则退出 `1`，解析错误时退出 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入标记会在指定的子项不存在时创建它；`+nnn` 和单独的 `+` 分别适用于索引插入和追加插入。

### `validate <oc-path>`

仅解析检查。不访问文件系统。当您想在替换变量之前确认模板路径格式正确，或者想要用于调试的结构化细分时，这很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效时退出 `0`，无效时退出 `1`（附带结构化的 `code` 和 `message`），参数错误时退出 `2`。

### `emit <file>`

通过特定类型的解析器和发射器对文件进行往返处理。对于健全的文件，输出应与输入在字节上完全一致——如果出现差异，则表示存在解析器错误或触发了哨兵值。这对于调试真实输入的基底行为很有用。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出代码

| 代码 | 含义                                                              |
| ---- | ----------------------------------------------------------------- |
| `0`  | 成功。（`resolve` / `find`：至少有一个匹配项。`set`：写入成功。） |
| `1`  | 无匹配项，或 `set` 被基底拒绝（无系统级错误）。                   |
| `2`  | 参数或解析错误。                                                  |

## 输出模式

`openclaw path` 支持 TTY 感知：在终端上输出人类可读的内容，当 stdout 被管道传输或重定向时输出 JSON。`--json` 和 `--human` 会覆盖自动检测。

## 注意

- `set` 通过基底的发射路径写入字节，该路径会自动应用编辑哨兵保护。包含 `__OPENCLAW_REDACTED__`（逐字或作为子字符串）的叶子节点会在写入时被拒绝。
- JSONC 解析和叶子编辑使用插件本地的 `jsonc-parser` 依赖项，因此在常规叶子写入时会保留注释和格式，而不是通过手动解析的解析器/重新渲染路径。
- `path` 不知道 LKG 的存在。如果文件受 LKG 跟踪，下一次 observe 调用将决定是提升还是恢复。计划通过 LKG 提升/恢复生命周期进行原子性多重设置的 `set --batch` 将与 LKG 恢复基底一起推出。

## 相关

- [CLI 参考](CLI/en/cli)
