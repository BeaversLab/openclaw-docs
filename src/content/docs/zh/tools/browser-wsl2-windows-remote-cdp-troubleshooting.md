---
summary: "逐层排查 WSL2 Gateway(网关) + Windows Chrome 远程 CDP 故障"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + remote Chrome CDP 故障排除"
---

在常见的拆分主机设置中，OpenClaw Gateway(网关) 运行在 WSL2 内部，Chrome 运行在 Windows 上，浏览器控制必须跨越 WSL2 和 Windows 的边界。来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层故障模式意味着可能会同时出现几个独立的问题，这会首先让错误的层级看起来像是坏掉了。

## 首先选择正确的浏览器模式

你有两种有效的模式：

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用指向从 WSL2 到 Windows Chrome CDP 端点的远程浏览器配置文件。

在以下情况选择此项：

- Gateway(网关) 保持在 WSL2 内部
- Chrome 运行在 Windows 上
- 你需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：主机本地 Chrome MCP

仅当 Gateway(网关) 本身与 Chrome 运行在同一主机上时，才使用 `existing-session` / `user`。

在以下情况选择此项：

- OpenClaw 和 Chrome 在同一台机器上
- 你想要本地已登录的浏览器状态
- 你不需要跨主机浏览器传输
- 你不需要高级的 managed/raw-CDP-only 路由，如 `responsebody`、PDF
  导出、下载拦截或批量操作

对于 WSL2 Gateway(网关) + Windows Chrome，首选原始远程 CDP。Chrome MCP 是主机本地的，而不是 WSL2 到 Windows 的桥接。

## 工作架构

参考架构：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway(网关)
- Windows 在普通浏览器的 `http://127.0.0.1:18789/` 处打开控制 UI
- Windows Chrome 在端口 `9222` 上公开一个 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向可从 WSL2 访问的地址

## 为什么此设置令人困惑

多个故障可能会重叠：

- WSL2 无法访问 Windows CDP 端点
- 控制 UI 是从非安全源打开的
- `gateway.controlUi.allowedOrigins` 与页面源不匹配
- 缺少令牌或配对
- 浏览器配置文件指向了错误的地址

因此，修复一个层级后可能仍然会显示另一个错误。

## 控制 UI 的关键规则

当从 Windows 打开 UI 时，请使用 Windows localhost，除非你有特意设置的 HTTPS 环境。

使用：

`http://127.0.0.1:18789/`

不要默认为控制 UI 使用局域网 IP。在局域网或 tailnet 地址上的纯 HTTP 可能会触发不安全来源/设备认证行为，这与 CDP 本身无关。请参阅 [Control UI](/zh/web/control-ui)。

## 分层验证

从上到下进行。不要跳过步骤。

### 第一层：验证 Chrome 正在 Windows 上提供 CDP 服务

在 Windows 上启用远程调试并启动 Chrome：

```powershell
chrome.exe --remote-debugging-port=9222
```

从 Windows，首先验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失败，OpenClaw 还不是问题所在。

### 第二层：验证 WSL2 能否访问该 Windows 端点

在 WSL2 中，测试您计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

好的结果：

- `/json/version` 返回带有 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也是正常的）

如果失败：

- Windows 尚未向 WSL2 暴露端口
- 该地址对于 WSL2 端来说是错误的
- 防火墙 / 端口转发 / 本地代理仍然缺失

在动 OpenClaw 配置之前修复此问题。

### 第三层：配置正确的浏览器配置文件

对于原始远程 CDP，将 OpenClaw 指向可从 WSL2 访问的地址：

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

注意：

- 使用 WSL2 可访问的地址，而不是仅在 Windows 上有效的地址
- 对于外部管理的浏览器，请保留 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)
- 仅当浏览器提供商为您提供了直接的 DevTools 套接字 URL 时才使用 WS(S)
- 在预期 OpenClaw 成功之前，请使用 `curl` 测试相同的 URL

### 第四层：单独验证控制 UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面来源与 `gateway.controlUi.allowedOrigins` 期望的相匹配
- 令牌认证或配对配置正确
- 您没有将控制 UI 认证问题误当作浏览器问题进行调试

有用的页面：

- [Control UI](/zh/web/control-ui)

### 第五层：验证端到端的浏览器控制

在 WSL2 中：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

好的结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）在同一配置文件中工作

## 常见的误导性错误

将每条消息视为特定于某一层的线索：

- `control-ui-insecure-auth`
  - UI 源 / 安全上下文问题，而非 CDP 传输问题
- `token_missing`
  - 身份验证配置问题
- `pairing required`
  - 设备批准问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问已配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端点有响应，但 DevTools WebSocket 仍无法打开
- 远程会话后过时的视口/深色模式/区域设置/离线覆盖
  - 运行 `openclaw browser stop --browser-profile remote`
  - 这将关闭活动的控制会话并释放 Playwright/CDP 模拟状态，而无需重启网关或外部浏览器
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 可达性或远程端点缓慢/不可达的问题
- `No Chrome tabs found for profile="user"`
  - 选择了本地 Chrome MCP 配置文件，但没有可用的主机本地标签页

## 快速分类检查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 能工作吗？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能工作吗？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了该确切的 WSL2 可访问地址？
4. 控制 UI：您是否打开的是 `http://127.0.0.1:18789/` 而不是局域网 IP？
5. 您是否试图跨 WSL2 和 Windows 使用 `existing-session`，而不是使用原始远程 CDP？

## 实用要点

该设置通常是可行的。难点在于，浏览器传输、控制 UI 源安全性以及令牌/配对都可能会独立失败，而从用户角度看这些失败表现相似。

如有疑问：

- 首先在本地验证 Windows Chrome 端点
- 其次从 WSL2 验证同一端点
- 只有这样才调试 OpenClaw 配置或控制 UI 身份验证

## 相关

- [浏览器](/zh/tools/browser)
- [浏览器登录](/zh/tools/browser-login)
- [浏览器 Linux 故障排除](/zh/tools/browser-linux-troubleshooting)
