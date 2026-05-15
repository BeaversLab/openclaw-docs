---
summary: "CLI 参考文档，用于 `openclaw path`（通过 `oc://` 寻址方案检查和编辑工作区文件）"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Path"
---

# `openclaw path`

插件提供的 Shell 访问 `oc://` 寻址基底层：一种
按种类分发的路径方案，用于检查和编辑可寻址的工作区
文件（markdown、c、l）。自托管用户、插件作者和编辑器
扩展使用它来读取、查找或更新特定位置，而无需
为每种文件类型手动编写解析器。

CLI 映射了底层的公共动词：

- `resolve` 是具体的且仅匹配单个结果。
- `find` 是用于通配符、联合、谓词和
  位置扩展的多重匹配动词。
- `set` 仅接受具体路径或插入标记；通配符模式在
  写入前会被拒绝。

`path` 由捆绑的可选 `oc-path` 插件提供。首次使用前请
启用它：

```bash
openclaw plugins enable oc-path
```

## 为何使用它

OpenClaw 状态分散在人工编辑的 markdown、带注释的 JSONC 配置
和仅追加的 JSONL 日志中。Shell 脚本、钩子和代理通常需要从
这些文件中获取一个很小的值：frontmatter 键、插件设置、日志记录
字段或命名部分下的项目符号。

`openclaw path` 为这些调用者提供了一个稳定的地址，而不是为每种
文件类型编写一次性的 grep、正则或解析器。同一个 `oc://` 路径可以在终端中
被验证、解析、搜索、试运行和写入，这使得小范围的自动化更易于审查
且更安全地重放。当您想要更新一个叶子节点同时保留文件的其余注释、
行尾符和周围格式时，它特别有用。

当您想要的内容具有逻辑地址，但物理文件
形状各异时，请使用它：

- 钩子想要从带注释的 JSONC 中读取一个设置，并在
  写回值时不丢失注释。
- 一个维护脚本想要在 JSONL 日志中找到每个匹配的事件字段，而无需将整个日志加载到自定义解析器中。
- 一个编辑器扩展想要通过 slug 跳转到 markdown 部分或列表项，然后渲染它解析到的确切行。
- 一个代理想要在应用微小的工作区编辑之前进行空运行，并在审查中查看更改的字节。

对于普通的整文件编辑、复杂的配置迁移或特定于内存的写入，您可能不需要 `openclaw path`。这些应该使用所有者命令或插件。`path` 适用于小型的、可寻址的文件操作，在这种情况下，可重复的终端命令比另一个自定义解析器更清晰。

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

这些命令旨在可复制到 shell 脚本中。当调用者需要结构化输出时使用 `--json`，当人员正在检查结果时使用 `--human`。

## 工作原理

`openclaw path` 做四件事：

1. 将 `oc://` 地址解析为插槽：文件、部分、项目、字段和可选的会话。
2. 从目标扩展（`.md`、`.jsonc`、`.jsonl` 和相关别名）中选择文件类型适配器。
3. 根据该文件类型的 AST 解析插槽：markdown 标题/项目、JSONC 对象键/数组索引或 JSONL 行记录。
4. 对于 `set`，通过相同的适配器发出编辑后的字节，以便文件的未触及部分保留其注释、行结束符和附近的格式（在该类型支持的情况下）。

`resolve` 和 `set` 需要一个具体的目标。`find` 是探索性动词：它将通配符、联合、谓词和序数扩展为具体的匹配项，您可以在选择一个进行写入之前检查这些匹配项。

## 子命令

| 子命令                  | 目的                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `resolve <oc-path>`     | 打印路径下的具体匹配项（或“未找到”）。                             |
| `find <pattern>`        | 枚举通配符 / 联合 / 谓词语径的匹配项。                             |
| `set <oc-path> <value>` | 在具体路径下写入叶子节点或插入目标。支持 `--dry-run`。             |
| `validate <oc-path>`    | 仅解析；打印结构细分（文件 / 章节 / 项目 / 字段）。                |
| `emit <file>`           | 通过 `parseXxx` + `emitXxx` 对文件进行往返测试（字节保真度诊断）。 |

## 全局标志

| 标志            | 用途                                              |
| --------------- | ------------------------------------------------- |
| `--cwd <dir>`   | 针对此目录解析文件插槽（默认：`process.cwd()`）。 |
| `--file <path>` | 覆盖文件插槽的解析路径（绝对访问）。              |
| `--json`        | 强制 JSON 输出（当 stdout 不是 TTY 时的默认值）。 |
| `--human`       | 强制人类可读输出（当 stdout 是 TTY 时的默认值）。 |
| `--dry-run`     | （仅限 `set`）打印将要写入的字节而不实际写入。    |

## `oc://` 语法

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

插槽规则：`field` 需要 `item`，而 `item` 需要 `section`。对于所有
四个插槽：

- **引号包围的片段** — `"a/b.c"` 在 `/` 和 `.` 分隔符中保留。
  内容是字节字面量；`"` 和 `\` 不允许出现在引号内。
  文件插槽也支持引号感知：`oc://"skills/email-drafter"/Tools/$last`
  将 `skills/email-drafter` 视为单个文件路径。
- **谓词** — `[k=v]`、`[k!=v]`、`[k<v]`、`[k<=v]`、`[k>v]`、
  `[k>=v]`。数值运算要求两侧均可强制转换为有限数字。
- **联合** — `{a,b,c}` 匹配任意备选项。
- **通配符** — `*`（单个子段）和 `**`（零个或多个，
  递归）。`find` 接受这些；`resolve` 和 `set` 因其
  歧义而拒绝它们。
- **位置** — `$last` 解析为最后一个索引 / 最后声明的键。
- **序数** — `#N` 用于按文档顺序进行的第 N 次匹配。
- **插入标记** — `+`、`+key`、`+nnn` 用于键控 / 索引
  插入（与 `set` 一起使用）。
- **会话作用域** — `?session=cron-daily` 等。与槽位嵌套
  正交。会话值是原始值，未进行百分比解码；它们不能包含
  控制字符或保留的查询分隔符（`?`、`&`、`%`）。

引号、谓词或联合段之外的保留字符（`?`、`&`、`%`）将被拒绝。控制字符（U+0000-U+001F、U+007F）在任何地方
都将被拒绝，包括 `session` 查询值。

对于规范路径，保证 `formatOcPath(parseOcPath(path)) === path`。
除了第一个非空的 `session=` 值外，非规范查询参数将被忽略。

## 按文件类型寻址

| 类型       | 寻址模型                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------- |
| Markdown   | 通过 slug 寻址 H2 段落，通过 slug 或 `#N` 寻址列表项，通过 `[frontmatter]` 寻址 frontmatter。 |
| JSONC/JSON | 对象键和数组索引；除非加引号，否则点号会分割嵌套的子段。                                      |
| JSONL      | 顶级行地址（`L1`、`L2`、`$last`），然后在行内进行 JSONC 风格的下行查找。                      |

`resolve` 返回一个结构化匹配项：`root`、`node`、`leaf` 或
`insertion-point`，并附带从 1 开始的行号。叶节点值作为文本
以及 `leafType` 呈现，以便插件作者无需依赖
特定类型的 AST 形状即可渲染预览。

## 变更契约

`set` 写入一个具体目标：

- Markdown frontmatter 值和 `- key: value` 项字段是字符串叶节点。
  Markdown 插入操作会追加节、frontmatter 键或节项，并
  为更改后的文件呈现规范的 markdown 形状。
- JSONC 叶节点写入会将字符串值强制转换为现有的叶节点类型
  (`string`、有限的 `number`、`true`/`false` 或 `null`)。JSONC 对象和数组
  插入操作将 `<value>` 解析为 JSON，并对
  普通叶节点写入使用 `jsonc-parser` 编辑路径，同时保留注释和附近的格式。
- JSONL 叶节点写入在行内像 JSONC 一样进行强制转换。整行替换和
  追加操作会将 `<value>` 解析为 JSON。呈现的 JSONL 保留文件的主导
  LF/CRLF 行尾约定。

当确切字节很重要时，在用户可见的写入之前使用 `--dry-run`。该
substrate 为解析/发送往返保留字节级相同的输出，但
变更操作可能会根据类型规范化编辑区域或文件。

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
文件扩展名进行分发。以下示例使用 PR 描述中的 fixtures。

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
通过 slug 匹配 `## Tools` 标题，并且项叶节点即使源代码使用下划线也会保留其 slug 形式
(`send_email` → `send-email`)。

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

JSONC 编辑通过 `jsonc-parser` 进行，因此注释和空白字符可以在
`set` 中保留下来。在提交之前，请先运行 `--dry-run` 以检查字节。

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

每一行是一条记录。当您不知道行号时，使用谓词 (`[event=action]`) 进行寻址；如果您知道，则使用规范的 `LN` 段。

## 子命令参考

### `resolve <oc-path>`

读取单个叶节点或节点。通配符会被拒绝 — 请使用 `find` 处理此类情况。
匹配时退出码为 `0`，干净未匹配时为 `1`，解析错误或拒绝模式时为
`2`。

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

枚举通配符 / 谓词 / 联合模式的每个匹配项。如果至少有一个匹配项，退出码为
`0`，零个匹配项时为 `1`。文件槽位通配符会被拒绝并返回
`OC_PATH_FILE_WILDCARD_UNSUPPORTED` — 请传递一个具体的文件（多文件
globbing 是后续功能）。

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

写入一个叶节点。配合 `--dry-run` 使用，以预览将要写入的字节而不接触文件。
写入成功时退出码为 `0`，如果被底层拒绝（例如，触及哨兵保护），则为
`1`，解析错误时为 `2`。

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

`+key` 插入标记会在命名子项不存在时创建它；`+nnn` 和单独的 `+` 分别用于索引插入和追加插入。

### `validate <oc-path>`

仅解析检查。不访问文件系统。当您想在替换变量之前确认模板路径格式正确，或者想要获取结构化分解以进行调试时，这很有用：

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

有效时退出码为 `0`，无效时为 `1`（并带有结构化的 `code` 和
`message`），参数错误时为 `2`。

### `emit <file>`

通过按种类的解析器和发射器往返传输文件。对于健全的文件，输出应在字节上与输入完全相同——出现差异表明存在解析器错误或触及哨兵。这对于调试真实输入上的基底（substrate）行为非常有用。

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## 退出代码

| 代码 | 含义                                                              |
| ---- | ----------------------------------------------------------------- |
| `0`  | 成功。（`resolve` / `find`：至少有一个匹配项。`set`：写入成功。） |
| `1`  | 无匹配，或 `set` 被基底拒绝（无系统级错误）。                     |
| `2`  | 参数或解析错误。                                                  |

## 输出模式

`openclaw path` 支持 TTY 感知：在终端上输出人类可读的内容，当 stdout 被管道传输或重定向时输出 JSON。`--json` 和 `--human` 会覆盖自动检测。

## 注意事项

- `set` 通过基底的发射路径写入字节，该路径会自动应用编辑哨兵（redaction-sentinel）保护。包含 `__OPENCLAW_REDACTED__`（逐字或作为子字符串）的叶节点将在写入时被拒绝。
- JSONC 解析和叶节点编辑使用插件本地的 `jsonc-parser` 依赖项，因此在普通的叶节点写入时会保留注释和格式，而不是通过手动编写的解析器/重新渲染路径。
- `path` 不知道 LKG。如果文件被 LKG 跟踪，下一次 observe 调用将决定是否提升/恢复。计划通过 LKG 提升/恢复生命周期实现的原子多集 `set --batch` 将与 LKG 恢复基底一起推出。

## 相关

- [CLI 参考](/zh/cli)
