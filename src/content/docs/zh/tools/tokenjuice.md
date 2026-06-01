---
summary: "使用可选的内置插件压缩嘈杂的 exec 和 bash 工具结果"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` 是一个可选的内置插件，用于在命令运行后压缩嘈杂的 `exec` 和 `bash`
工具结果。

它更改返回的 `tool_result`，而不是命令本身。Tokenjuice 不会
重写 shell 输入、重新运行命令或更改退出代码。

目前这适用于 Codex 应用服务器框架中的 OpenClaw 嵌入式运行和 OpenClaw 动态工具。Tokenjuice 挂钩 OpenClaw 的工具结果中间件，并在输出返回到活动框架会话之前对其进行修剪。

## 启用插件

快速路径：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

等效项：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已随附该插件。没有单独的 `plugins install`
或 `tokenjuice install openclaw` 步骤。

如果您更喜欢直接编辑配置：

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Tokenjuice 的更改内容

- 在将嘈杂的 `exec` 和 `bash` 结果反馈到会话之前对其进行压缩。
- 保持原始命令执行不变。
- 保留精确的文件内容读取以及 tokenjuice 应保留原样的其他命令。
- 保持可选加入：如果您希望到处都是逐字输出，请禁用该插件。

## 验证其是否正常工作

1. 启用插件。
2. 启动一个可以调用 `exec` 的会话。
3. 运行一个嘈杂的命令，例如 `git status`。
4. 检查返回的工具结果是否比原始 shell 输出更短且更有条理。

## 禁用插件

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或者：

```bash
openclaw plugins disable tokenjuice
```

## 相关

- [Exec 工具](/zh/tools/exec)
- [思考级别](/zh/tools/thinking)
- [上下文引擎](/zh/concepts/context-engine)
