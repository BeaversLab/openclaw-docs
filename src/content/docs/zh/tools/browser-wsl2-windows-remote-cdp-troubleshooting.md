---
summary: "逐层排查 WSL2 Gateway(网关) + Windows Chrome 远程 CDP 故障"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + remote Chrome CDP 故障排除"
---

# WSL2 + Windows + 远程 Chrome CDP 故障排查

本指南涵盖了常见的分主机设置，其中：

- OpenClaw Gateway(网关) 网关 在 WSL2 内部运行
- Chrome 在 Windows 上运行
- 浏览器控制必须跨越 WSL2/Windows 边界

它还涵盖了 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 中的分层失败模式：几个独立的问题可能会同时出现，这会使得错误的层级首先看起来像是出了问题。

## 首先选择正确的浏览器模式

您有两种有效的模式：

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用从 WSL2 指向 Windows Chrome CDP 端点的远程浏览器配置文件。

在以下情况下选择此选项：

- Gateway(网关) 保留在 WSL2 内部
- Chrome 在 Windows 上运行
- 您需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：主机本地 Chrome MCP

仅当 Gateway(网关) 本身与 Chrome 在同一主机上运行时，才使用 `existing-session` / `user`。

在以下情况下选择此选项：

- OpenClaw 和 Chrome 位于同一台机器上
- 您需要本地已登录的浏览器状态
- 您不需要跨主机浏览器传输
- 你不需要像 `responsebody`、PDF 导出、下载拦截或批量操作这样的高级托管/仅原始 CDP 路由

对于 WSL2 Gateway(网关) + Windows Chrome，首选原始远程 CDP。Chrome MCP 是主机本地的，而不是 WSL2 到 Windows 的桥接。

## 工作架构

参考形态：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway(网关)
- Windows 在普通浏览器的 `http://127.0.0.1:18789/` 打开控制 UI
- Windows Chrome 在端口 `9222` 上公开 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向可从 WSL2 访问的地址

## 为什么此设置令人困惑

多种失败可能会重叠：

- WSL2 无法访问该 Windows CDP 端点
- 控制 UI 是从非安全源打开的
- `gateway.controlUi.allowedOrigins` 与页面源不匹配
- 缺少令牌或配对
- 浏览器配置文件指向了错误的地址

因此，修复一层可能仍然会留下不同的错误可见。

## 控制 UI 的关键规则

当从 Windows 打开 UI 时，请使用 Windows localhost，除非你有专门的 HTTPS 设置。

使用：

`http://127.0.0.1:18789/`

不要默认将控制 UI 设置为 LAN IP。LAN 或 tailnet 地址上的纯 HTTP 可能会触发不安全源/设备身份验证行为，这与 CDP 本身无关。请参阅[控制 UI](/zh/web/control-ui)。

## 分层验证

从上到下工作。不要跳过。

### 第 1 层：验证 Chrome 是否在 Windows 上提供 CDP

在 Windows 上启动 Chrome 并启用远程调试：

```powershell
chrome.exe --remote-debugging-port=9222
```

从 Windows，首先验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失败，OpenClaw 还不是问题所在。

### 第 2 层：验证 WSL2 是否可以访问该 Windows 端点

从 WSL2，测试你计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

好的结果：

- `/json/version` 返回带有 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也没关系）

如果失败：

- Windows 尚未向 WSL2 公开该端口
- 该地址对于 WSL2 端来说是错误的
- firewall / port forwarding / local proxying is still missing

在修改 OpenClaw 配置之前，请先解决此问题。

### 第 3 层：配置正确的浏览器配置文件

对于原始远程 CDP，将 OpenClaw 指向从 WSL2 可访问的地址：

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

备注：

- 使用 WSL2 可访问的地址，而不是仅在 Windows 上有效的地址
- 对于外部管理的浏览器，请保留 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)
- 仅当浏览器提供商为您提供直接的 DevTools 套接字 URL 时，才使用 WS(S)
- 在期望 OpenClaw 成功之前，使用 `curl` 测试相同的 URL

### 第 4 层：单独验证控制 UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面来源与 `gateway.controlUi.allowedOrigins` 期望的相匹配
- 令牌身份验证或配对配置正确
- 您没有将控制 UI 身份验证问题当作浏览器问题来调试

有用的页面：

- [控制 UI](/zh/web/control-ui)

### 第 5 层：验证端到端浏览器控制

从 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

好的结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）在同一配置文件中工作

## 常见的误导性错误

将每条消息视为特定于层的线索：

- `control-ui-insecure-auth`
  - UI 来源 / 安全上下文问题，而不是 CDP 传输问题
- `token_missing`
  - 身份验证配置问题
- `pairing required`
  - 设备审批问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问已配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端点已响应，但 DevTools WebSocket 仍无法打开
- 远程会话后过时的视口/暗色模式/区域设置/离线覆盖设置
  - 运行 `openclaw browser stop --browser-profile remote`
  - 这将关闭活动的控制会话并释放 Playwright/CDP 模拟状态，而无需重启网关或外部浏览器
- `gateway timeout after 1500ms`
  - 通常是 CDP 连通性问题，或者是远程端点缓慢或无法访问
- `No Chrome tabs found for profile="user"`
  - 在没有主机本地标签页可用的情况下选择了本地 Chrome MCP 配置文件

## 快速排查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 能工作吗？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能工作吗？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了确切的 WSL2 可访问地址？
4. Control UI：您是否打开了 `http://127.0.0.1:18789/` 而不是 LAN IP？
5. 您是否尝试在 WSL2 和 Windows 之间使用 `existing-session` 而不是原始远程 CDP？

## 实用建议

此设置通常是可行的。难点在于，浏览器传输、Control UI 源安全性以及令牌/配对各自可能独立失败，但在用户看来却很相似。

如有疑问：

- 首先在本地验证 Windows Chrome 端点
- 其次从 WSL2 验证同一端点
- 只有这样才调试 OpenClaw 配置或 Control UI 身份验证
