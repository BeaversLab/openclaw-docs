---
summary: "Chrome 扩展程序：让 OpenClaw 驱动您现有的 Chrome 标签页"
read_when:
  - 您希望代理驱动现有的 Chrome 标签页（工具栏按钮）
  - 您需要通过 Tailscale 实现远程 Gateway(网关) + 本地浏览器自动化
  - 您想了解接管浏览器的安全影响
title: "Chrome 扩展程序"
---

# Chrome 扩展程序（浏览器中继）

OpenClaw Chrome 扩展程序允许代理控制您的 **现有 Chrome 标签页**（您的普通 Chrome 窗口），而不是启动单独的由 openclaw 管理的 Chrome 配置文件。

附加/分离通过 **单个 Chrome 工具栏按钮** 进行。

如果您想要使用 Chrome 官方的 DevTools MCP 附加流程，而不是 OpenClaw
扩展中继，请改用 `existing-session` 浏览器配置文件。请参阅
[Browser](/zh/tools/browser#chrome-existing-session-via-mcp)。有关 Chrome 自己的
设置文档，请参阅 [Chrome for Developers: Use Chrome DevTools MCP with your
browser 会话](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
以及 [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)。

## 它是什么（概念）

包含三个部分：

- **浏览器控制服务**（Gateway(网关) 或节点）：代理/工具调用的 API（通过 Gateway(网关)）
- **本地中继服务器**（环回 CDP）：在控制服务器和扩展之间建立桥接（默认为 `http://127.0.0.1:18792`）
- **Chrome MV3 扩展程序**：使用 `chrome.debugger` 附加到活动标签页，并将 CDP 消息通过管道传输到中继

然后，OpenClaw 通过正常的 `browser` 工具界面控制附加的标签页（选择正确的配置文件）。

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

在首次附加之前，打开扩展选项并设置：

- `Port`（默认 `18792`）
- `Gateway token`（必须匹配 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`）

然后创建一个配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

使用方法：

- CLI：`openclaw browser --browser-profile my-chrome tabs`
- 代理工具：`browser` 配合 `profile="my-chrome"`

### 自定义 Gateway(网关) 端口

如果您使用的是自定义网关端口，扩展程序的中继端口将自动派生：

**扩展中继端口 = Gateway(网关) 端口 + 3**

示例：如果 `gateway.port: 19001`，则：

- 扩展中继端口：`19004`（网关 + 3）

在扩展选项页面中，配置扩展程序使用派生出的中继端口。

## 附加 / 分离（工具栏按钮）

- 打开您希望 OpenClaw 控制的标签页。
- 点击扩展图标。
  - 附加时，徽章显示 `ON`。
- 再次点击以分离。

## 它控制哪个标签页？

- 它并**不**自动控制“您正在查看的任何标签页”。
- 它仅控制您通过单击工具栏按钮明确附加的标签页。
- 若要切换：打开另一个标签页并在那里点击扩展图标。

## 徽章 + 常见错误

- `ON`：已附加；OpenClaw 可以驱动该标签页。
- `…`：正在连接到本地中继。
- `!`：无法访问或验证中继（最常见的情况：中继服务器未运行，或网关令牌缺失/错误）。

如果您看到 `!`：

- 确保 Gateway(网关) 在本地运行（默认设置），或者如果 Gateway(网关) 在其他地方运行，请在此计算机上运行节点主机。
- 打开扩展选项页面；它会验证中继可达性 + 网关令牌身份验证。

## 远程 Gateway(网关)（使用节点主机）

### 本地 Gateway(网关)（与 Chrome 在同一台机器上）—— 通常**无需额外步骤**

如果 Gateway(网关) 与 Chrome 在同一台机器上运行，它会在环回接口上启动浏览器控制服务并自动启动中继服务器。扩展程序与本地中继通信；CLI/工具调用则发送到 Gateway(网关)。

### 远程 Gateway(网关)（Gateway(网关) 在其他地方运行）—— **运行节点主机**

如果您的 Gateway(网关) 在另一台机器上运行，请在运行 Chrome 的机器上启动一个节点主机。Gateway(网关) 将把浏览器操作代理到该节点；扩展程序 + 中继将保留在浏览器机器的本地。

如果连接了多个节点，请使用 `gateway.nodes.browser.node` 固定一个，或者设置 `gateway.nodes.browser.mode`。

## 沙箱隔离（工具容器）

如果您的代理会话是沙箱隔离的 (`agents.defaults.sandbox.mode != "off"`)，`browser` 工具可能会受到限制：

- 默认情况下，沙箱隔离的会话通常针对 **沙箱浏览器** (`target="sandbox"`)，而不是您的主机 Chrome。
- Chrome 扩展程序中继接管需要控制 **主机** 浏览器控制服务器。

选项：

- 最简单的方法：从 **非沙箱隔离** 会话/代理使用该扩展程序。
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

- 将 Gateway(网关) 和节点主机保留在同一个 tailnet 上；避免将中继端口暴露到局域网或公共 Internet。
- 有目的地配对节点；如果您不希望远程控制 (`gateway.nodes.browser.mode="off"`)，请禁用浏览器代理路由。
- 除非您确实有跨命名空间的需求，否则请将中继保留在回环地址上。对于 WSL2 或类似的拆分主机设置，请将 `browser.relayBindHost` 设置为显式绑定地址（例如 `0.0.0.0`），然后通过 Gateway(网关) 身份验证、节点配对和专用网络来限制访问。

## “扩展路径”的工作原理

`openclaw browser extension path` 会打印包含扩展文件的 **已安装** 磁盘目录。

CLI 故意 **不** 打印 `node_modules` 路径。始终先运行 `openclaw browser extension install`，将扩展程序复制到您的 OpenClaw 状态目录下的一个稳定位置。

如果您移动或删除了该安装目录，Chrome 将把扩展程序标记为已损坏，直到您从有效路径重新加载它。

## 安全影响（请阅读本节）

这既强大又有风险。请把它当作给模型“控制您的浏览器”一样对待。

- 该扩展程序使用 Chrome 的调试器 API (`chrome.debugger`)。连接后，模型可以：
  - 在该标签页中点击/输入/导航
  - 读取页面内容
  - 访问该标签页已登录会话可访问的任何内容
- **这并不像**专用的 openclaw 管理配置文件那样是**隔离的**。
  - 如果您附加到常用的配置文件/标签页，即授予了对该账户状态的访问权限。

建议：

- 对于扩展中继的使用，最好使用专用的 Chrome 配置文件（与您的个人浏览分开）。
- 将 Gateway(网关) 和任何节点主机保持在 tailnet 内；依赖 Gateway(网关) 认证 + 节点配对。
- 避免通过 LAN 暴露中继端口（`0.0.0.0`），并避免使用 Funnel（公开）。
- 中继会阻止非扩展来源，并且要求对 `/cdp` 和 `/extension` 都进行 gateway-token 认证。

相关：

- 浏览器工具概述：[Browser](/zh/tools/browser)
- 安全审计：[Security](/zh/gateway/security)
- Tailscale 设置：[Tailscale](/zh/gateway/tailscale)

import en from "/components/footer/en.mdx";

<en />
