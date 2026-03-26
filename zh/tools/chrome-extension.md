---
summary: "Chrome 扩展：让 OpenClaw 驱动您现有的 Chrome 标签页"
read_when:
  - You want the agent to drive an existing Chrome tab (toolbar button)
  - You need remote Gateway + local browser automation via Tailscale
  - You want to understand the security implications of browser takeover
title: "Chrome 扩展"
---

# Chrome 扩展程序（浏览器中继）

OpenClaw Chrome 扩展程序允许代理控制您的**现有 Chrome 标签页**（您的普通 Chrome 窗口），而不是启动单独的由 openclaw 管理的 Chrome 配置文件。

附加/分离通过**单个 Chrome 工具栏按钮**进行。

如果您想要 Chrome 官方的 DevTools MCP 附加流程，而不是 OpenClaw 扩展中继，请改用 `existing-session` 浏览器配置文件。请参阅 [Browser](/zh/tools/browser#chrome-existing-session-via-mcp)。有关 Chrome 自己的设置文档，请参阅 [Chrome for Developers: Use Chrome DevTools MCP with your browser 会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session) 和 [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)。

## 它是什么（概念）

包含三个部分：

- **浏览器控制服务**（Gateway(网关) 或 node）：代理/工具调用的 API（通过 Gateway(网关)）
- **本地中继服务器**（loopback CDP）：在控制服务器和扩展之间建立桥接（默认为 `http://127.0.0.1:18792`）
- **Chrome MV3 扩展程序**：使用 `chrome.debugger` 附加到活动标签页，并将 CDP 消息通过管道传输到中继

OpenClaw 然后通过普通的 `browser` 工具表面控制附加的标签页（选择正确的配置文件）。

## 安装 / 加载（未打包）

1. 将扩展程序安装到稳定的本地路径：

```bash
openclaw browser extension install
```

2. 打印已安装的扩展程序目录路径：

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- 启用“开发者模式”
- “加载已解压的扩展程序” → 选择上面打印的目录

4. 固定扩展程序。

## 更新（无需构建步骤）

该扩展程序作为静态文件包含在 OpenClaw 发行版（npm 包）中。没有单独的“构建”步骤。

升级 OpenClaw 后：

- 重新运行 `openclaw browser extension install` 以刷新 OpenClaw 状态目录下的已安装文件。
- Chrome → `chrome://extensions` → 点击扩展程序上的“重新加载”。

## 使用它（设置一次 Gateway 令牌）

要使用扩展中继，请为其创建一个浏览器配置文件：

首次附加之前，打开扩展程序选项并设置：

- `Port` (默认 `18792`)
- `Gateway token` (必须匹配 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`)

然后创建一个配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

使用它：

- CLI：`openclaw browser --browser-profile my-chrome tabs`
- Agent 工具：`browser` 配合 `profile="my-chrome"`

### Custom Gateway ports

If you're using a custom gateway port, the extension relay port is automatically derived:

**Extension Relay Port = Gateway Port + 3**

示例：如果 `gateway.port: 19001`，则：

- 扩展中继端口：`19004` (gateway + 3)

Configure the extension to use the derived relay port in the extension Options page.

## Attach / detach (toolbar button)

- Open the tab you want OpenClaw to control.
- Click the extension icon.
  - 附加时，徽章显示 `ON`。
- Click again to detach.

## Which tab does it control?

- It does **not** automatically control “whatever tab you’re looking at”.
- It controls **only the tab(s) you explicitly attached** by clicking the toolbar button.
- To switch: open the other tab and click the extension icon there.

## Badge + common errors

- `ON`：已附加；OpenClaw 可以驱动该标签页。
- `…`：正在连接到本地中继。
- `!`：中继无法访问或未通过身份验证（最常见原因：中继服务器未运行，或网关令牌缺失/错误）。

如果您看到 `!`：

- Make sure the Gateway is running locally (default setup), or run a node host on this machine if the Gateway runs elsewhere.
- Open the extension Options page; it validates relay reachability + gateway-token auth.

## Remote Gateway (use a node host)

### Local Gateway (same machine as Chrome) — usually **no extra steps**

If the Gateway runs on the same machine as Chrome, it starts the browser control service on loopback
and auto-starts the relay server. The extension talks to the local relay; the CLI/工具 calls go to the Gateway.

### Remote Gateway (Gateway runs elsewhere) — **run a node host**

如果您的 Gateway(网关) 在另一台机器上运行，请在运行 Chrome 的机器上启动一个 node host。
Gateway(网关) 将把浏览器操作代理到该节点；扩展程序 + 中继保持在浏览器机器本地。

如果连接了多个节点，请使用 `gateway.nodes.browser.node` 固定其中一个，或设置 `gateway.nodes.browser.mode`。

## 沙箱隔离（工具容器）

如果您的 Agent 会话处于沙箱隔离状态 (`agents.defaults.sandbox.mode != "off"`)，`browser` 工具可能会受到限制：

- 默认情况下，沙箱隔离的会话通常以 **sandbox browser** (`target="sandbox"`) 为目标，而不是您的主机 Chrome。
- Chrome 扩展程序中继接管需要控制 **host** 浏览器控制服务器。

选项：

- 最简单的方法：从 **非沙箱隔离** 会话/代理使用扩展程序。
- 或者允许沙箱隔离的会话进行主机浏览器控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然后确保该工具未被工具策略拒绝，并且（如果需要）使用 `target="host"` 调用 `browser`。

调试：`openclaw sandbox explain`

## 远程访问提示

- 将 Gateway(网关) 和 node host 保留在同一个 tailnet 上；避免将中继端口暴露到 LAN 或公共 Internet。
- 有目的地配对节点；如果您不想要远程控制 (`gateway.nodes.browser.mode="off"`)，请禁用浏览器代理路由。
- 除非确实有跨命名空间的需求，否则请将中继保留在环回地址上。对于 WSL2 或类似的拆分主机设置，请将 `browser.relayBindHost` 设置为显式绑定地址（例如 `0.0.0.0`），然后通过 Gateway(网关) 认证、节点配对和专用网络来限制访问。

## “扩展路径”如何工作

`openclaw browser extension path` 会打印包含扩展文件的 **已安装** 磁盘目录。

CLI 故意 **不** 打印 `node_modules` 路径。请始终先运行 `openclaw browser extension install`，将扩展复制到 OpenClaw 状态目录下的稳定位置。

如果您移动或删除该安装目录，Chrome 会将该扩展标记为已损坏，直到您从有效路径重新加载它。

## 安全影响（请阅读本节）

这既强大又充满风险。请将其视为让模型“直接操作您的浏览器”。

- 该扩展使用 Chrome 的调试器 API (`chrome.debugger`)。连接后，模型可以：
  - 在该选项卡中点击/输入/导航
  - 读取页面内容
  - 访问该选项卡登录会话所能访问的任何内容
- **这并非隔离的**，不像专用的 openclaw 管理的配置文件那样。
  - 如果您连接到日常使用的配置文件/选项卡，即授予对该账户状态的访问权限。

建议：

- 对于扩展中继的使用，最好使用专用的 Chrome 配置文件（与您的个人浏览分开）。
- 保持 Gateway(网关) 和任何节点主机仅限 tailnet 访问；依赖 Gateway(网关) 身份验证 + 节点配对。
- 避免通过 LAN (`0.0.0.0`) 暴露中继端口，并避免使用 Funnel (公开)。
- 该中继会阻止非扩展程序来源，并要求对 `/cdp` 和 `/extension` 进行网关令牌（gateway-token）身份验证。

相关：

- 浏览器工具概述：[Browser](/zh/tools/browser)
- 安全审计：[Security](/zh/gateway/security)
- Tailscale 设置：[Tailscale](/zh/gateway/tailscale)

import zh from "/components/footer/zh.mdx";

<zh />
