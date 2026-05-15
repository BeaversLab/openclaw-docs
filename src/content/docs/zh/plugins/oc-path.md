---
summary: "内置 `oc-path` 插件：提供用于 `oc://` 工作区文件寻址方案的 `openclaw path`CLI CLI"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "OC Path 插件"
---

内置的 `oc-path` 插件为 `oc://`CLI 工作区文件寻址方案添加了 [`openclaw path`](/zh/cli/pathOpenClaw) CLI。该插件随 OpenClaw 代码库中的 `extensions/oc-path/` 一起发布，但默认是可选的 —— 在你启用它之前，安装/构建过程会使其处于休眠状态。

`oc://` 地址指向工作区文件内的单个叶子（或一组通配符叶子）。该插件目前支持三种类型的文件：

- **markdown** (`.md`, `.mdx`)：frontmatter、sections、items、fields
- **c** (`.jsonc`, `.json5`, `.json`)：保留注释和格式
- **l** (`.jsonl`, `.ndjson`)：面向行的记录

自托管用户和编辑器扩展使用 CLI 来读取或写入单个叶子，而无需直接针对 SDK 进行脚本编写；代理和钩子将其视为一个确定性的底层，因此字节保真度的往返和编辑哨兵保护能跨所有类型统一应用。

## 为何启用它

当你希望脚本、钩子或本地代理工具能够指向工作区状态的精确部分，而不必为每种文件形状发明解析器时，请启用 `oc-path`。单个 `oc://` 地址可以命名 markdown frontmatter 键、section item、JSONC 配置叶子或 JSONL 事件字段。

这对于维护者的工作流程很重要，因为这些变更应当是微小的、可审计的且可重复的：检查一个值，查找匹配的记录，试运行写入，然后仅应用该叶节点，同时保留注释、行尾和附近的格式不变。将其保留为可选插件，可以让高级用户获得寻址基础能力，而无需为那些从未需要它的安装版本将解析器依赖或 CLI 表面引入核心。

启用它的常见原因：

- **本地自动化**：Shell 脚本可以使用 `openclaw path … --json` 来解析或更新一个工作区值，而无需携带单独的 markdown、JSONC 和 JSONL 解析代码。
- **Agent 可见的编辑**：Agent 可以在写入之前显示针对特定寻址叶节点的试运行差异，这比审查自由格式的文件重写要容易得多。
- **编辑器集成**：编辑器可以将 `oc://AGENTS.md/tools/gh` 映射到精确的 markdown 节点和行号，而无需根据标题文本进行猜测。
- **诊断**：`emit` 通过解析器和发射器对文件进行往返处理，因此您可以在依赖自动化编辑之前检查文件类型是否是字节稳定的。

具体示例：

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

该插件有意不作为高级语义的所有者。内存插件仍然拥有内存写入，配置命令仍然拥有完整的配置管理，LKG 逻辑仍然拥有恢复/提升。`oc-path` 是一个狭窄的寻址和字节保留文件操作层，这些高级工具可以围绕它进行构建。

## 运行位置

该插件运行在您调用命令的主机上的 **`openclaw` CLI 内部进程中**。它不需要运行中的 Gateway(网关)，也不打开任何网络套接字 —— 每个动词都是对您指向的文件的纯转换。

插件元数据位于 `extensions/oc-path/openclaw.plugin.json` 中：

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

`onStartup: false` 将插件排除在 Gateway(网关) 热路径之外。`onCommands:
["path"]` 告知 CLI 在您首次运行 `openclaw path …` 时延迟加载插件，因此从不使用该动词的安装版本不会产生任何开销。

## 启用

```bash
openclaw plugins enable oc-path
```

重启 Gateway（如果您运行了一个），以便清单快照能够获取新状态。在相同主机上直接调用 Gateway(网关)`openclaw path`CLI 即可立即生效 — CLI 会按需加载该插件。

禁用方式：

```bash
openclaw plugins disable oc-path
```

## 依赖

所有解析器依赖都是插件局部的 — 启用 `oc-path` 不会将新的包拉入核心运行时：

| 依赖           | 用途                                                             |
| -------------- | ---------------------------------------------------------------- |
| `commander`    | 用于 `resolve`、`find`、`set`、`validate`、`emit` 的子命令连接。 |
| `jsonc-parser` | JSONC 解析 + 保留注释和尾随逗号的叶子节点编辑。                  |
| `markdown-it`  | 针对 section / item / field 模型的 Markdown 标记化。             |

JSONL 保持手工编写 — 面向行的解析比任何依赖都要简单，并且每行的 JSONC 解析已经通过 `jsonc-parser` 进行。

## 它提供的内容

| 表面                        | 提供者                                                  |
| --------------------------- | ------------------------------------------------------- |
| `openclaw path`CLI CLI      | `extensions/oc-path/cli-registration.ts`                |
| `oc://` 解析器 / 格式化程序 | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 按类型的解析 / 发出 / 编辑  | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl}`       |
| 通用解析 / 查找 / 设置      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 红哨兵守卫                  | `extensions/oc-path/src/oc-path/sentinel.ts`            |

目前 CLI 是唯一的公共表面。Substrate 动词是插件私有的；使用者使用 CLI（或针对 SDK 构建自己的插件）。

## 与其他插件的关系

- **`memory-*`**：内存写入通过内存插件进行，而不是通过 `oc-path`。
  `oc-path` 是一个通用的文件基底；内存插件在其之上构建了自己的语义。
- **LKG**: `path` 不知道 Last-Known-Good 配置还原。如果
  文件由 LKG 跟踪，下一次 `observe` 调用将决定是提升还是
  恢复；`set --batch` 用于通过 LKG 提升/恢复
  生命周期进行原子化多集操作的功能计划与 LKG 恢复基础层一起提供。

## 安全性

`set` 通过基础层的发送路径写入原始字节，该路径会自动应用
红哨兵防护。携带
`__OPENCLAW_REDACTED__`（逐字或作为子字符串）的叶子在写入时会被拒绝，
并返回 `OC_EMIT_SENTINEL`。该 CLI 还会从其打印的任何
人工或 JSON 输出中清理字面意义上的哨兵，将其替换为 `[REDACTED]`，以便终端
捕获和管道永远不会泄露该标记。

## 相关

- [`openclaw path` CLI 参考](/zh/cli/path)
- [管理插件](/zh/plugins/manage-plugins)
- [构建插件](/zh/plugins/building-plugins)
