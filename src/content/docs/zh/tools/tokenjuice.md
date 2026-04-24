---
title: "Tokenjuice"
summary: "使用可选的内置插件压缩嘈杂的 exec 和 bash 工具结果"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

# Tokenjuice

`tokenjuice` 是一个可选的内置插件，用于在命令运行后压缩嘈杂的 `exec` 和 `bash` 工具结果。

它更改返回的 `tool_result`，而不是命令本身。Tokenjuice 不会重写 shell 输入、重新运行命令或更改退出代码。

目前这适用于 Pi 嵌入式运行，其中 tokenjuice 挂钩嵌入式 `tool_result` 路径并修剪返回到会话的输出。

## 启用插件

快速路径：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

等效项：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已附带该插件。没有单独的 `plugins install` 或 `tokenjuice install openclaw` 步骤。

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

- 在将嘈杂的 `exec` 和 `bash` 结果反馈回会话之前对其进行压缩。
- 保持原始命令执行未受触动。
- 保留精确的文件内容读取和其他 tokenjuice 应保留原样的命令。
- 保持可选：如果您希望在任何地方都获得逐字输出，请禁用该插件。

## 验证其是否工作

1. 启用插件。
2. 启动一个可以调用 `exec` 的会话。
3. 运行一个嘈杂的命令，例如 `git status`。
4. 检查返回的工具结果是否比原始 shell 输出更短且结构更清晰。

## 禁用插件

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或者：

```bash
openclaw plugins disable tokenjuice
```
