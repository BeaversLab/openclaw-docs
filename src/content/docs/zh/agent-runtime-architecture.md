---
title: "Agent 运行时架构"
summary: "OpenClawOpenClaw 如何运行内置的 Agent 运行时、提供商、会话、工具和扩展。"
---

OpenClaw 直接拥有内置的 Agent 运行时。运行时代码位于 OpenClaw`src/agents/`，模型/提供商助手位于 `src/llm/`，面向插件的合约通过 `openclaw/plugin-sdk/*` barrels 暴露。

## 运行时布局

- `src/agents/embedded-agent-runner/`：内置 Agent 尝试循环、提供商流适配器、压缩、模型选择和会话连接。
- `src/agents/sessions/`TUI：会话持久化、扩展加载、资源发现、技能、提示、主题和 TUI 支持的工具渲染器。
- `packages/agent-core/`：可重用的 Agent 核心、低级工具类型、消息、压缩助手、提示模板和工具/会话合约。
- `src/agents/runtime/`OpenClaw：用于 `@openclaw/agent-core` 的 OpenClaw 外观以及本地代理实用程序。
- `src/agents/agent-tools*.ts`OpenClaw：OpenClaw 拥有的工具定义、架构、策略、前/后挂钩适配器和主机编辑支持。
- `src/agents/agent-hooks/`：内置运行时挂钩，如压缩保护和上下文修剪。
- `src/llm/`：模型/提供商注册表、传输助手和特定于提供商的流实现。

## 边界

核心代码通过 OpenClaw 模块和 SDK barrels 调用内置运行时，而不是通过旧的外部 Agent 包。插件使用记录在案的 OpenClaw`openclaw/plugin-sdk/*` 入口点，并且不导入 `src/**` 内部。

`@earendil-works/pi-tui`TUITUI 仍然是第三方的 TUI 依赖项。它被本地 TUI 和会话渲染器用作终端组件工具包；将其内部化将是一个单独的供应商化工作。

## 清单

资源包在包元数据中声明 OpenClaw 资源：

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

包管理器还会发现常规的 `extensions/`、`skills/`、`prompts/` 和 `themes/` 目录。

## 运行时选择

默认内置运行时 id 为 `openclaw`。插件框架可以注册额外的运行时 id。`auto` 会在存在支持它的插件框架时进行选择，否则使用内置的 OpenClaw 运行时。

## 相关

- [OpenClaw 代理运行时工作流](/zh/openclaw-agent-runtime)
- [代理运行时](/zh/concepts/agent-runtimes)
