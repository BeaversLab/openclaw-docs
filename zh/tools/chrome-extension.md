---
title: "Chrome 扩展"
summary: "Chrome 扩展：让 OpenClaw 驱动你现有的 Chrome 标签页"
read_when:
  - 你想让 agent 驱动现有 Chrome 标签页（工具栏按钮）
  - 你需要通过 Tailscale 实现远程 Gateway + 本地浏览器自动化
  - 你想了解浏览器接管的安全影响
---

# Chrome 扩展（浏览器中继）

OpenClaw 的 Chrome 扩展允许 agent 控制你的 **现有 Chrome 标签页**（正常的 Chrome 窗口），而无需启动独立的 openclaw 托管 profile。

附加/解绑通过 **一个 Chrome 工具栏按钮** 完成。

## 是什么（概念）

包含三部分：

- **浏览器控制服务**（Gateway 或 node）：agent/tool 调用的 API（经由 Gateway）
- **本地中继服务器**（回环 CDP）：在控制服务与扩展之间桥接（默认 `http://127.0.0.1:18792`）
- **Chrome MV3 扩展**：通过 `chrome.debugger` 附加到当前标签页，并将 CDP 消息转发到中继

随后 OpenClaw 通过常规 `browser` 工具面控制已附加的标签页（选择正确的 profile）。

## 安装 / 加载（未打包）

1. 将扩展安装到稳定的本地路径：

```bash
openclaw browser extension install
```

2. 打印已安装的扩展目录路径：

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- 启用“开发者模式”
- “加载已解压的扩展程序” → 选择上面打印的目录

4. 固定扩展。

## 更新（无需构建）

扩展以静态文件的形式随 OpenClaw 发布（npm 包内）。没有单独的构建步骤。

升级 OpenClaw 后：

- 重新运行 `openclaw browser extension install`，刷新 OpenClaw 状态目录下的安装文件。
- Chrome → `chrome://extensions` → 点击扩展的“重新加载”。

## 使用（无需额外配置）

OpenClaw 内置名为 `chrome` 的浏览器 profile，指向默认端口的扩展中继。

使用它：

- CLI：`openclaw browser --browser-profile chrome tabs`
- Agent 工具：`browser`，`profile="chrome"`

如果你想用不同名称或不同中继端口，创建自己的 profile：

```bash
openclaw browser create-profile   --name my-chrome   --driver extension   --cdp-url http://127.0.0.1:18792   --color "#00AA00"
```

## 附加 / 断开（工具栏按钮）

- 打开你希望 OpenClaw 控制的标签页。
- 点击扩展图标。
  - 徽标显示 `ON` 表示已附加。
- 再次点击即可断开。

## 它控制哪个标签页？

- 它 **不会** 自动控制“你当前查看的标签页”。
- 仅控制 **你明确附加** 的标签页（通过工具栏按钮）。
- 切换方式：打开另一个标签页并在该页点击扩展图标。

## 徽标 + 常见错误

- `ON`：已附加；OpenClaw 可驱动该标签页。
- `…`：正在连接本地中继。
- `!`：中继不可达（最常见：该机器上浏览器中继服务未运行）。

若看到 `!`：

- 确认 Gateway 本地运行（默认配置），或当 Gateway 在远程机器上运行时，在本机运行 node host。
- 打开扩展的选项页；它会显示中继是否可达。

## 远程 Gateway（使用 node host）

### 本地 Gateway（与 Chrome 同一台机器）—— 通常 **无需额外步骤**

若 Gateway 与 Chrome 在同一台机器上，它会在回环启动浏览器控制服务并自动启动中继服务器。扩展与本地中继通信；CLI/tool 调用进入 Gateway。

### 远程 Gateway（Gateway 在别处运行）—— **运行 node host**

若 Gateway 在另一台机器上运行，请在运行 Chrome 的机器上启动 node host。
Gateway 会把浏览器动作代理给该节点；扩展 + 中继仍留在浏览器机器。

若连接了多个节点，可用 `gateway.nodes.browser.node` 固定一个，或设置 `gateway.nodes.browser.mode`。

## 沙箱（工具容器）

若 agent 会话是沙箱化的（`agents.defaults.sandbox.mode != "off"`），`browser` 工具可能被限制：

- 默认情况下，沙箱会话通常指向 **沙箱浏览器**（`target="sandbox"`），而不是宿主机 Chrome。
- Chrome 扩展中继接管需要控制 **宿主机** 浏览器控制服务。

选项：

- 最简单：在 **非沙箱** 会话/agent 中使用扩展。
- 或允许沙箱会话控制宿主机浏览器：

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

然后确保工具不会被 tool policy 拒绝，并（如有需要）在调用 `browser` 时使用 `target="host"`。

调试：`openclaw sandbox explain`

## 远程访问建议

- 将 Gateway 与 node host 保持在同一 tailnet；避免把中继端口暴露到局域网或公网。
- 有意识地配对节点；若不希望远程控制，关闭浏览器代理路由（`gateway.nodes.browser.mode="off"`）。

## “extension path” 的工作方式

`openclaw browser extension path` 会打印 **已安装** 的扩展文件目录。

CLI 刻意 **不会** 打印 `node_modules` 路径。务必先运行 `openclaw browser extension install`，把扩展拷贝到 OpenClaw 状态目录下的稳定位置。

如果你移动或删除该安装目录，Chrome 会把扩展标记为损坏，直到你从有效路径重新加载。

## 安全影响（请阅读）

这非常强大也存在风险。可以把它理解为“把浏览器的手交给模型”。

- 扩展使用 Chrome 的调试 API（`chrome.debugger`）。附加后，模型可以：
  - 在该标签页中点击/输入/导航
  - 读取页面内容
  - 访问该标签页登录态可访问的一切
- **这不是隔离的**，不像专用的 openclaw 托管 profile。
  - 如果你附加到日常 profile/标签页，就等于授予了该账号状态的访问权。

建议：

- 使用专用的 Chrome profile（与个人浏览器分离）来使用扩展中继。
- 将 Gateway 与任何 node host 保持 tailnet-only；依赖 Gateway 认证 + node 配对。
- 避免将中继端口暴露到 LAN（`0.0.0.0`）并避免 Funnel（公网）。

相关：

- 浏览器工具概览：[浏览器](/zh/tools/browser)
- 安全审计：[安全](/zh/gateway/security)
- Tailscale 设置：[Tailscale](/zh/gateway/tailscale)
