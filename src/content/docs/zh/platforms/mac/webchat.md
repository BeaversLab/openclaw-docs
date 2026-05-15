---
summary: "Mac 应用如何嵌入网关 WebChat 以及如何对其进行调试"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

macOS 菜单栏应用将 WebChat UI 嵌入为原生 SwiftUI 视图。它连接到 Gateway(网关)，默认为所选代理的**主会话**（并带有其他会话的切换器）。

- **本地模式**：直接连接到本地 Gateway(网关) WebSocket。
- **远程模式**：通过 SSH 转发 Gateway(网关) 控制端口，并将该隧道用作数据平面。

## 启动和调试

- 手动：Lobster 菜单 → “打开聊天”。
- 用于测试的自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`)。

## 工作原理

- 数据平面：Gateway(网关) WS 方法 `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` 和事件 `chat`, `agent`, `presence`, `tick`, `health`。
- `chat.history` 返回显示标准化的对话记录行：内联指令标签会从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>` 和截断的工具调用块）以及泄露的 ASCII/全角模型控制标记会被剥离，纯静默令牌助手行（如确切的 `NO_REPLY` / `no_reply`）会被省略，过大的行可以用占位符替换。
- 会话：默认为主会话（`main`，或者当范围为全局时为 `global`）。UI 可以在会话之间切换。
- 新手引导使用一个专用会话，以将首次运行设置分离开来。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway(网关) WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化（而非完整的浏览器沙箱）。

## 相关

- [WebChat](/zh/web/webchat)
- [macOS app](/zh/platforms/macos)
