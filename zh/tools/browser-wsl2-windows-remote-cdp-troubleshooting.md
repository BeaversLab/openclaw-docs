---
summary: "分层排查 WSL2 Gateway 网关 + Windows Chrome 远程 CDP 和 extension-relay 设置"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between raw remote CDP and the Chrome extension relay in split-host setups
title: "WSL2 + Windows + 远程 Chrome CDP 故障排除"
---

# WSL2 + Windows + 远程 Chrome CDP 故障排查

本指南涵盖了常见的分主机设置，其中：

- OpenClaw Gateway 网关 在 WSL2 内部运行
- Chrome 在 Windows 上运行
- 浏览器控制必须跨越 WSL2/Windows 边界

它还涵盖了来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层故障模式：几个独立的问题可能会同时出现，这会首先让错误的层级看起来像是坏了。

## 首先选择正确的浏览器模式

您有两种有效的模式：

### 选项 1：原始远程 CDP

使用从 WSL2 指向 Windows Chrome CDP 端点的远程浏览器配置文件。

在以下情况下选择此选项：

- 您只需要浏览器控制
- 您对将 Chrome 远程调试暴露给 WSL2 感到放心
- 您不需要 Chrome 扩展中继

### 选项 2：Chrome 扩展中继

使用内置的 `chrome-relay` 配置文件以及 OpenClaw Chrome 扩展程序。

在以下情况下选择此选项：

- 您想使用工具栏按钮附加到现有的 Windows Chrome 标签页
- 您想要基于扩展程序的控制，而不是原始的 `--remote-debugging-port`
- 中继本身必须可以跨越 WSL2/Windows 边界访问

如果您跨命名空间使用扩展中继，`browser.relayBindHost` 是 [Browser](/zh/tools/browser) 和 [Chrome extension](/zh/tools/chrome-extension) 中引入的重要设置。

## 工作原理架构

参考架构：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway 网关
- Windows 在普通浏览器中的 `http://127.0.0.1:18789/` 打开控制 UI
- Windows Chrome 在端口 `9222` 上暴露 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向可从 WSL2 访问的地址

## 为什么此设置令人困惑

多个故障可能会重叠：

- WSL2 无法访问 Windows CDP 端点
- 控制 UI 是从非安全源打开的
- `gateway.controlUi.allowedOrigins` 与页面来源不匹配
- 缺少令牌或配对
- 浏览器配置文件指向了错误的地址
- 当您实际需要跨命名空间访问时，扩展中继仍然是仅限环回的（loopback-only）

因此，修复一层可能仍会显示不同的错误。

## 控制 UI 的关键规则

当从 Windows 打开 UI 时，请使用 Windows localhost，除非你有专门的 HTTPS 设置。

使用：

`http://127.0.0.1:18789/`

不要默认将 Control UI 设置为 LAN IP。LAN 或 tailnet 地址上的纯 HTTP 可能会触发不安全来源/设备身份验证行为，这与 CDP 本身无关。请参阅 [Control UI](/zh/web/control-ui)。

## 分层验证

从上到下进行。不要跳过。

### 第 1 层：验证 Chrome 是否在 Windows 上提供 CDP

在 Windows 上启动 Chrome 并启用远程调试：

```powershell
chrome.exe --remote-debugging-port=9222
```

首先从 Windows 验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果这在 Windows 上失败，OpenClaw 目前还不是问题所在。

### 第 2 层：验证 WSL2 能否访问该 Windows 端点

在 WSL2 中，测试您计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

良好结果：

- `/json/version` 返回带有浏览器/协议版本元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也可以）

如果失败：

- Windows 尚未向 WSL2 暴露该端口
- 该地址对于 WSL2 端是错误的
- 防火墙 / 端口转发 / 本地代理仍然缺失

在修改 OpenClaw 配置之前请先修复此问题。

### 第 3 层：配置正确的浏览器配置文件

对于原始远程 CDP，请将 OpenClaw 指向 WSL2 可访问的地址：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

注意事项：

- 使用 WSL2 可访问的地址，而不是仅在 Windows 上有效的地址
- 对于外部管理的浏览器，保留 `attachOnly: true`
- 在期望 OpenClaw 成功之前，使用 `curl` 测试相同的 URL

### 第 4 层：如果您改用 Chrome 扩展中继

如果浏览器机器和 Gateway 网关 被命名空间边界隔开，中继可能需要非环回绑定地址。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "chrome-relay",
    relayBindHost: "0.0.0.0",
  },
}
```

仅在需要时使用此方法：

- 默认行为更安全，因为中继保持仅环回（loopback-only）
- `0.0.0.0` 扩大了暴露面
- 保持 Gateway 网关 身份验证、节点配对以及周围网络的私密性

如果您不需要扩展程序中继，请首选上述的原始远程 CDP 配置文件。

### 第 5 层：单独验证 Control UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面来源与 `gateway.controlUi.allowedOrigins` 期望的内容相匹配
- 令牌身份验证或配对已正确配置
- 您没有将其作为浏览器问题来调试 Control UI 身份验证问题

有用的页面：

- [Control UI](/zh/web/control-ui)

### 第 6 层：验证端到端浏览器控制

从 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

对于扩展程序中继：

```bash
openclaw browser tabs --browser-profile chrome-relay
```

好的结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）在同一配置文件中工作

## 常见的误导性错误

将每条消息视为特定于某一层的线索：

- `control-ui-insecure-auth`
  - UI 来源/安全上下文问题，而非 CDP 传输问题
- `token_missing`
  - 身份验证配置问题
- `pairing required`
  - 设备审批问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问已配置的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 连通性或缓慢/不可用的远程端点问题
- `Chrome extension relay is running, but no tab is connected`
  - 已选择扩展中继配置文件，但尚无附加的标签页

## 快速分诊检查清单

1. Windows: `curl http://127.0.0.1:9222/json/version` 能否工作？
2. WSL2: `curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能否工作？
3. OpenClaw config: `browser.profiles.<name>.cdpUrl` 是否使用了确切的 WSL2 可访问地址？
4. Control UI: 你打开的是 `http://127.0.0.1:18789/` 而不是 LAN IP 吗？
5. Extension relay only: 你是否确实需要 `browser.relayBindHost`，如果是，是否已显式设置？

## 实践经验

该设置通常是可行的。困难的部分在于，浏览器传输、Control UI 源安全性、令牌/配对和扩展程序中继拓扑中的每一个都可能独立失败，而从用户角度看它们的表现很相似。

如有疑问：

- 首先在本地验证 Windows Chrome 端点
- 其次从 WSL2 验证同一端点
- 然后再调试 OpenClaw 配置或 Control UI 身份验证

import zh from "/components/footer/zh.mdx";

<zh />
