---
summary: "Chrome 扩展程序：让 OpenClaw 控制您现有的 Chrome 标签页"
read_when:
  - You want the agent to drive an existing Chrome tab (toolbar button)
  - You need remote Gateway + local browser automation via Tailscale
  - You want to understand the security implications of browser takeover
title: "Chrome 扩展程序"
---

# Chrome 扩展程序（浏览器中继）

OpenClaw Chrome 扩展程序允许代理控制您的**现有 Chrome 标签页**（您的普通 Chrome 窗口），而不是启动单独的由 openclaw 管理的 Chrome 配置文件。

附加/分离通过**单个 Chrome 工具栏按钮**进行。

## 它是什么（概念）

包含三个部分：

- **浏览器控制服务**（Gateway 或节点）：代理/工具调用的 API（通过 Gateway）
- **本地中继服务器**（环回 CDP）：在控制服务器和扩展程序之间桥接（默认为 `http://127.0.0.1:18792`）
- **Chrome MV3 扩展程序**：使用 `chrome.debugger` 附加到活动标签页，并将 CDP 消息通过管道传输到中继

然后，OpenClaw 通过普通的 `browser` 工具界面（选择正确的配置文件）控制附加的标签页。

## 安装/加载（未打包）

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

该扩展程序作为静态文件包含在 OpenClaw 版本中。没有单独的“构建”步骤。

升级 OpenClaw 后：

- 重新运行 `openclaw browser extension install` 以刷新 OpenClaw 状态目录下的已安装文件。
- Chrome → `chrome://extensions` → 点击扩展程序上的“重新加载”。

## 使用它（设置一次网关令牌）

OpenClaw 附带一个名为 `chrome` 的内置浏览器配置文件，该配置文件以默认端口上的扩展中继为目标。

首次附加之前，打开扩展程序选项并设置：

- `Port`（默认 `18792`）
- `Gateway token`（必须匹配 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`）

使用方法：

- CLI：`openclaw browser --browser-profile chrome tabs`
- 代理工具：`browser` 配合 `profile="chrome"`

如果您想要不同的名称或不同的中继端口，请创建您自己的配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

### 自定义网关端口

如果您使用的是自定义网关端口，扩展中继端口将自动派生：

**扩展中继端口 = 网关端口 + 3**

例如：如果 `gateway.port: 19001`，那么：

- 扩展中继端口：`19004`（网关端口 + 3）

在扩展选项页面中，将扩展配置为使用派生的中继端口。

## 附加 / 分离（工具栏按钮）

- 打开您希望 OpenClaw 控制的标签页。
- 点击扩展图标。
  - 附加时，徽章将显示 `ON`。
- 再次点击以分离。

## 它控制哪个标签页？

- 它**不会**自动控制“您正在查看的任何标签页”。
- 它仅控制您通过单击工具栏按钮**明确附加的标签页**。
- 若要切换：打开另一个标签页并点击那里的扩展图标。

## 徽章 + 常见错误

- `ON`：已附加；OpenClaw 可以控制该标签页。
- `…`：正在连接到本地中继。
- `!`：无法访问或验证中继（最常见原因：中继服务器未运行，或网关令牌缺失/错误）。

如果您看到 `!`：

- 请确保网关在本地运行（默认设置），或者如果网关运行在其他位置，请在此计算机上运行节点主机。
- 打开扩展选项页面；它会验证中继的可达性以及网关令牌的身份验证。

## 远程网关（使用节点主机）

### 本地网关（与 Chrome 在同一台机器上）—— 通常**无需额外步骤**

如果网关与 Chrome 在同一台机器上运行，它会在回环接口上启动浏览器控制服务
并自动启动中继服务器。扩展与本地中继通信；CLI/工具调用则发送到网关。

### 远程网关（网关在其他地方运行）—— **运行节点主机**

如果您的网关在另一台机器上运行，请在运行 Chrome 的机器上启动一个节点主机。
网关会将浏览器操作代理到该节点；扩展和中继则保留在浏览器机器的本地。

如果连接了多个节点，请使用 `gateway.nodes.browser.node` 固定一个，或设置 `gateway.nodes.browser.mode`。

## 沙盒化（工具容器）

如果您的 Agent 会话受沙箱限制 (`agents.defaults.sandbox.mode != "off"`)，则 `browser` 工具可能会受到限制：

- 默认情况下，沙箱会话通常以 **沙箱浏览器** (`target="sandbox"`) 为目标，而不是您的主机 Chrome。
- Chrome 扩展程序中继接管需要控制 **主机** 浏览器控制服务器。

选项：

- 最简单的方法：从 **非沙箱化** 会话/Agent 使用该扩展程序。
- 或者允许沙箱会话进行主机浏览器控制：

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

- 将 Gateway 和节点主机保持在同一个 tailnet 上；避免将中继端口暴露给局域网或公共互联网。
- 有意配对节点；如果您不希望被远程控制 (`gateway.nodes.browser.mode="off"`)，请禁用浏览器代理路由。
- 除非您确实有跨命名空间的需求，否则请将中继保持在环回地址上。对于 WSL2 或类似的拆分主机设置，请将 `browser.relayBindHost` 设置为显式绑定地址（例如 `0.0.0.0`），然后通过 Gateway 身份验证、节点配对和专用网络来限制访问。

## “扩展路径”是如何工作的

`openclaw browser extension path` 会打印包含扩展文件的 **已安装** 磁盘目录。

CLI 故意 **不** 打印 `node_modules` 路径。请务必先运行 `openclaw browser extension install`，将扩展程序复制到 OpenClaw 状态目录下的稳定位置。

如果您移动或删除了该安装目录，Chrome 会将扩展程序标记为损坏，直到您从有效路径重新加载它。

## 安全影响（请阅读本节）

这功能强大且有风险。请将其视为赋予模型“直接操作您浏览器”的能力。

- 该扩展程序使用 Chrome 的调试器 API (`chrome.debugger`)。附加后，模型可以：
  - 在该标签页中点击/输入/导航
  - 读取页面内容
  - 访问该标签页已登录会话可访问的任何内容
- **这并不像** 专用的 openclaw 管理配置文件那样是**隔离的**。
  - 如果你连接到你的日常使用配置文件/标签页，你将授予对该账户状态的访问权限。

建议：

- 最好使用专用的 Chrome 配置文件（与你的个人浏览分开）来进行扩展中继使用。
- 将网关和任何节点主机保持在 tailnet 内；依赖网关身份验证 + 节点配对。
- 避免通过 LAN 暴露中继端口 (`0.0.0.0`)，并避免使用 Funnel（公开）。
- 中继会阻止非扩展来源，并且要求对 `/cdp` 和 `/extension` 都进行网关令牌身份验证。

相关内容：

- 浏览器工具概述：[Browser](/zh/tools/browser)
- 安全审计：[Security](/zh/gateway/security)
- Tailscale 设置：[Tailscale](/zh/gateway/tailscale)
