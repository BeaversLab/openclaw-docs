---
summary: "工具搜索：通过搜索、描述和调用精简大型 PI 工具目录"
title: "工具搜索"
read_when:
  - You want PI agents to use a large tool catalog without adding every tool schema to the prompt
  - You want OpenClaw tools, MCP tools, and client tools exposed through one compact PI surface
  - You are implementing or debugging tool discovery for PI runs
---

工具搜索是一项实验性的 OpenClaw PI 代理功能。它为 PI 代理提供了一种精简的方式来发现和调用大型工具目录。当运行中有许多可用工具，但模型可能只需要其中少数几个时，此功能非常有用。

本文档记录 OpenClaw PI 工具搜索。这不是 Codex 原生工具搜索或动态工具表面。Codex 原生代码模式、工具搜索、延迟动态工具和嵌套工具调用是稳定的 Codex harness 表面，不依赖于 `tools.toolSearch`。

当为 PI 启用时，模型默认接收一个 `tool_search_code` 工具。
该工具在隔离的 Node 子进程中运行简短的 JavaScript 主体，并带有
`openclaw.tools` 桥接：

```js
const hits = await openclaw.tools.search("create a GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "Crash on startup",
  body: "Steps to reproduce...",
});
```

该目录可以包含 OpenClaw 工具、插件工具、MCP 工具和客户端提供的工具。模型预先不会看到每个完整的架构。相反，它会搜索紧凑的描述符，在需要精确架构时描述一个选定的工具，并通过 OpenClaw 调用该工具。

Codex harness 运行不会接收这些实验性的 OpenClaw 工具搜索控件。OpenClaw 将产品功能作为动态工具传递给 Codex，而 Codex 拥有稳定的原生代码模式、原生工具搜索、延迟动态工具和嵌套工具调用。

## 轮次如何运行

在规划时，PI 嵌入式运行器将为运行构建有效目录：

1. 解析代理、配置文件、沙箱和会话的活动工具策略。
2. 列出符合条件的 OpenClaw 和插件工具。
3. 通过会话 MCP 运行时列出符合条件的 MCP 工具。
4. 添加为当前运行提供的符合条件的客户端工具。
5. 为搜索建立紧凑描述符的索引。
6. 向模型公开 PI 代码桥或结构化回退工具。

在执行时，每个真实的工具调用都会返回到 OpenClaw。隔离的 Node 运行时不持有插件实现、MCP 客户端对象或机密。`openclaw.tools.call(...)` 跨越桥接返回到 Gateway(网关)，在此处，正常的策略、审批、挂钩、日志记录和结果处理仍然适用。

## 模式

`tools.toolSearch` 有两种面向模型的模式：

- `code`：公开 `tool_search_code`，即默认的紧凑型 JavaScript 桥接。
- `tools`：将 `tool_search`、`tool_describe` 和 `tool_call` 作为普通
  结构化工具公开，提供给不应接收代码的提供商使用。

两种模式使用相同的目录和执行路径。唯一的区别在于模型看到的形状。如果当前运行时无法启动隔离的 Node 代码模式子进程，默认的 `code` 模式将在目录压缩之前回退到 `tools`。

两种模式均为实验性功能。对于小型 PI 工具目录，首选直接工具暴露；对于 Codex harness 运行，首选 Codex 原生稳定表面。

没有单独的源选择配置。当启用 Tool Search 时，在经过常规策略筛选后，目录将包含符合条件的 OpenClaw、MCP 和客户端工具。

## 存在原因

大型目录很有用但成本高昂。将每个工具架构发送给模型会增加请求大小，减缓规划速度，并增加意外选择工具的可能性。

Tool Search 改变了这一格局：

- 直接工具：模型在生成第一个 token 之前会看到所有选定的架构
- 工具搜索代码模式：模型会看到一个紧凑的代码工具和一个简短的 API
  协议
- 工具搜索工具模式：模型会看到三个紧凑的结构化后备
  工具
- 在轮次期间：模型仅加载其实际需要的工具架构

对于小型目录，直接工具暴露仍然是正确的默认选择。当一次运行可以看到许多工具时，尤其是来自 MCP 服务器或客户端提供的应用程序工具时，工具搜索是最好的选择。

## API

`openclaw.tools.search(query, options?)`

搜索当前运行的有效目录。结果紧凑且可以安全地放回提示上下文中。

```js
const hits = await openclaw.tools.search("calendar event", { limit: 5 });
```

`openclaw.tools.describe(id)`

加载一个搜索结果的完整元数据，包括确切的输入架构。

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

通过 OpenClaw 调用选定的工具。

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "Planning",
  start: "2026-05-09T14:00:00Z",
});
```

结构化回退模式公开了与工具相同的操作：

- `tool_search`
- `tool_describe`
- `tool_call`

## 运行时边界

代码桥在短暂的 Node 子进程中运行。子进程启动时启用了 Node 权限模式，环境为空，没有文件系统或网络权限，也没有子进程或 worker 权限。OpenClaw 强制执行父进程的挂钟超时，并在超时时终止子进程，包括在异步延续之后。

运行时仅公开：

- `console.log`、`console.warn` 和 `console.error`
- `openclaw.tools.search`
- `openclaw.tools.describe`
- `openclaw.tools.call`

正常的 OpenClaw 行为仍然适用于最终调用：

- 工具允许和拒绝策略
- 每个代理和每个沙箱的工具限制
- 渠道/运行时工具策略
- 批准钩子
- 插件 `before_tool_call` 钩子
- 会话标识、日志和遥测

## 配置

为使用默认代码桥接的 PI 运行启用工具搜索：

```bash
openclaw config set tools.toolSearch true
```

等效 JSON：

```json5
{
  tools: {
    toolSearch: true,
  },
}
```

对于 PI 运行，请改用结构化回退工具：

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
    },
  },
}
```

调整代码模式超时和搜索结果限制：

```json5
{
  tools: {
    toolSearch: {
      mode: "code",
      codeTimeoutMs: 10000,
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

禁用它：

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## 提示词和遥测

工具搜索记录了足够的遥测数据，以便将其与直接工具暴露进行比较：

- 发送到工具架的序列化工具和提示词总字节数
- 目录大小和来源细分
- 搜索、描述和调用计数
- 通过 OpenClaw 执行的最终工具调用
- 选定的工具 ID 和来源

会话日志应能够回答：

- 模型预先看到了多少工具架构
- 它执行了多少次搜索和描述操作
- 调用了哪个最终工具
- 结果是来自 OpenClaw、MCP 还是客户端工具

## 端到端验证

网关 E2E 运行器使用 PI 装置验证了这两个路径：

```bash
node --import tsx scripts/tool-search-gateway-e2e.ts
```

它会创建一个拥有大型工具目录的临时假插件，启动模拟 OpenAI 提供商，启动一次 Gateway(网关)（一次使用直接模式，一次启用工具搜索），然后比较提供商请求负载和会话日志。

回归测试证明了：

1. 直接模式可以调用假插件工具。
2. 工具搜索可以调用同一个假插件工具。
3. 直接模式将伪造的插件工具模式直接暴露给提供商。
4. 工具搜索仅暴露紧凑的桥接器。
5. 对于大型伪造目录，工具搜索请求负载更小。
6. 会话日志显示预期的工具调用计数和桥接调用遥测。

## 失败行为

工具搜索应失败关闭：

- 如果工具不在有效策略中，搜索不应返回它
- 如果选定的工具变得不可用，`tool_call` 应该失败
- 如果策略或批准阻止了执行，调用结果应报告该阻止而不是绕过它
- 如果代码桥接无法创建隔离的运行时，请使用 `mode: "tools"` 或
  针对该部署禁用工具搜索

## 相关

- [工具和插件](/zh/tools)
- [多代理沙盒和工具](/zh/tools/multi-agent-sandbox-tools)
- [Exec 工具](/zh/tools/exec)
- [ACP 代理设置](/zh/tools/acp-agents-setup)
- [构建插件](/zh/plugins/building-plugins)
