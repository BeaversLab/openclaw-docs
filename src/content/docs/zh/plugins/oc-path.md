---
summary: "内置 `oc-path` 插件：提供用于 `oc://` 工作区文件寻址方案的 `openclaw path`CLI CLI"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "OC Path 插件"
---

内置的 `oc-path` 插件为 `oc://` 工作区文件寻址方案添加了 [`openclaw path`](/zh/cli/path) CLI。它随 OpenClaw 仓库中的 `extensions/oc-path/` 一起提供，但是可选的——安装/构建会使其处于休眠状态，直到你启用它。

`oc://` 地址指向工作区文件内的单个叶节点（或一组通配符叶节点）。该插件目前理解四种类型的文件：

- **markdown** (`.md`, `.mdx`)：frontmatter、sections、items、fields
- **c** (`.jsonc`, `.json5`, `.json`)：保留注释和格式
- **l** (`.jsonl`, `.ndjson`)：面向行的记录
- **yaml** (`.yaml`, `.yml`, `.lobster`)：通过 YAML 文档 API 映射/序列/标量节点

自托管者和编辑器扩展使用 CLI 来读取或写入单个叶节点，而无需直接针对 SDK 进行脚本编写；代理和钩子将其视为确定性基础，以便字节保真往返和编辑哨兵守卫在各种类型中统一应用。

## 为什么要启用它

当你希望脚本、钩子或本地代理工具指向工作区状态的特定部分，而不必为每种文件形状发明解析器时，请启用 `oc-path`。单个 `oc://` 地址可以命名 markdown frontmatter 键、章节项、JSONC 配置叶节点、JSONL 事件字段或 YAML 工作流步骤。

这对于维护者工作流很重要，其中的更改应该是微小的、可审计的和可重复的：检查一个值，查找匹配记录，试运行写入，然后仅应用该叶节点，同时保留注释、行结尾和附近的格式。将其作为可选插件保留，可以为高级用户提供寻址基础，而无需将解析器依赖项或 CLI 表面放入核心，供那些不需要它的安装使用。

启用它的常见原因：

- **本地自动化**：shell 脚本可以使用 `openclaw path … --json` 解析或更新一个工作区值，而无需携带单独的 markdown、JSONC、JSONL 和 YAML 解析代码。
- **代理可见的编辑**：代理可以在写入之前显示一个已寻址叶节点的试运行差异，这比自由形式的文件重写更容易审查。
- **编辑器集成**：编辑器可以将 `oc://AGENTS.md/tools/gh` 映射到
  精确的 markdown 节点和行号，而无需根据标题文本进行猜测。
- **诊断**：`emit` 通过解析器和发射器对文件进行往返处理，因此
  您可以在依赖自动
  编辑之前检查文件类型是否字节稳定。

具体示例：

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

该插件有意不作为更高级别语义的所有者。内存
插件仍然拥有内存写入权，配置命令仍然拥有完整的配置
管理权，LKG 逻辑仍然拥有恢复/提升权。`oc-path` 是这些高级别工具
可以围绕其构建的狭窄
寻址和字节保留文件操作层。

## 运行位置

该插件在您调用命令的主机上于 `openclaw` CLI **内部进程中运行**。它不需要运行的 Gateway(网关) 并且不打开任何
网络套接字 — 每个动词都是对您指向的文件的纯转换。

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

`onStartup: false` 使插件远离 Gateway(网关) 热路径。`onCommands:
["path"]` 告诉 CLI 在您第一次运行
`openclaw path …` 时延迟加载插件，因此从不使用该动词的安装不会产生任何成本。

## 启用

```bash
openclaw plugins enable oc-path
```

重启 Gateway(网关)（如果您运行了一个），以便清单快照获取新的
状态。在同一主机上，纯 `openclaw path` 调用立即生效 —
CLI 会按需加载插件。

禁用方法：

```bash
openclaw plugins disable oc-path
```

## 依赖项

所有解析器依赖项都是插件本地的 — 启用 `oc-path` 不会将
新包拉入核心运行时：

| 依赖项         | 用途                                                        |
| -------------- | ----------------------------------------------------------- |
| `commander`    | `resolve`、`find`、`set`、`validate`、`emit` 的子命令连接。 |
| `jsonc-parser` | JSONC 解析 + 保留注释和尾随逗号的叶节点编辑。               |
| `markdown-it`  | 针对 section / item / field 模型的 Markdown 标记化。        |
| `yaml`         | YAML `Document` 解析 / 发出 / 编辑，并保留注释和流样式。    |

JSONL 保持自定义实现 —— 面向行的解析比任何依赖都更简单，并且每行的 JSONC 解析已经通过 `jsonc-parser` 进行。

## 它提供了什么

| 表面                        | 提供者                                                  |
| --------------------------- | ------------------------------------------------------- |
| `openclaw path`CLI CLI      | `extensions/oc-path/cli-registration.ts`                |
| `oc://` 解析器 / 格式化工具 | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| 按类型解析 / 发出 / 编辑    | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| 通用解析 / 查找 / 设置      | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| 编辑哨兵保护                | `extensions/oc-path/src/oc-path/sentinel.ts`            |

CLI 是目前唯一的公开表面。Substrate 动词是该插件私有的；使用者使用 CLI（或基于 SDK 构建自己的插件）。

## 与其他插件的关系

- **`memory-*`**：内存写入通过内存插件进行，而不是 `oc-path`。
  `oc-path` 是一个通用文件基底；内存插件在其之上叠加了自己的
  语义。
- **LKG**：`path` 不知道 Last-Known-Good 配置恢复。如果一个
  文件被 LKG 跟踪，下一次 `observe` 调用将决定是提升还是
  恢复；通过 LKG 提升/恢复生命周期进行原子多集设置的 `set --batch` 计划与 LKG 恢复基底一起推出。

## 安全性

`set` 通过基底（substrate）的发出路径写入原始字节，该路径会自动应用
编辑哨兵保护。携带 `__OPENCLAW_REDACTED__`（逐字或作为子串）的叶节点在写入时会被拒绝，
并返回 `OC_EMIT_SENTINEL`CLI。CLI 还会从其打印的任何
人类可读或 JSON 输出中清理字面意义的哨兵，将其替换为 `[REDACTED]`，以便终端
捕获和管道绝不会泄露该标记。

## 相关

- [`openclaw path`CLI CLI 参考](/zh/cli/path)
- [管理插件](/zh/plugins/manage-plugins)
- [构建插件](/zh/plugins/building-plugins)
