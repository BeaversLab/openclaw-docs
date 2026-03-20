---
summary: "分层排除 WSL2 Gateway(网关) + Windows Chrome 远程 CDP 故障"
read_when:
  - 在 WSL2 中运行 OpenClaw Gateway(网关)，而 Chrome 位于 Windows 上
  - 在 WSL2 和 Windows 之间看到重叠的浏览器/控制 UI 错误
  - 在拆分主机设置中决定使用主机本地 Chrome MCP 还是原始远程 CDP
title: "WSL2 + Windows + remote Chrome CDP 故障排除"
---

# WSL2 + Windows + remote Chrome CDP 故障排除

本指南涵盖了常见的拆分主机设置，其中：

- OpenClaw Gateway(网关) 在 WSL2 内运行
- Chrome 在 Windows 上运行
- 浏览器控制必须跨越 WSL2/Windows 边界

它还涵盖了来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层故障模式：几个独立的问题可能同时出现，这使得错误的层看起来像是先坏了。

## 首先选择正确的浏览器模式

你有两种有效的模式：

### 选项 1：从 WSL2 到 Windows 的原始远程 CDP

使用一个远程浏览器配置文件，该配置文件从 WSL2 指向 Windows Chrome CDP 端点。

在以下情况选择此项：

- Gateway(网关) 保持在 WSL2 内部
- Chrome 在 Windows 上运行
- 你需要浏览器控制跨越 WSL2/Windows 边界

### 选项 2：主机本地 Chrome MCP

仅当 Gateway(网关) 本身与 Chrome 在同一主机上运行时，才使用 `existing-session` / `user`。

在以下情况选择此项：

- OpenClaw 和 Chrome 在同一台机器上
- 你想要本地已登录的浏览器状态
- 你不需要跨主机浏览器传输

对于 WSL2 Gateway(网关) + Windows Chrome，首选原始远程 CDP。Chrome MCP 是主机本地的，而不是 WSL2 到 Windows 的桥接。

## 工作架构

参考形状：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway(网关)
- Windows 在普通浏览器的 `http://127.0.0.1:18789/` 处打开控制 UI
- Windows Chrome 在端口 `9222` 上公开 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向从 WSL2 可访问的地址

## 为什么此设置令人困惑

多个故障可能会重叠：

- WSL2 无法访问 Windows CDP 端点
- 控制 UI 是从不安全的源打开的
- `gateway.controlUi.allowedOrigins` 与页面源不匹配
- 缺少令牌或配对
- 浏览器配置文件指向了错误的地址

因此，修复一层可能仍然会显示另一个错误。

## 控制 UI 的关键规则

当从 Windows 打开 UI 时，请使用 Windows localhost，除非您专门设置了 HTTPS。

使用：

`http://127.0.0.1:18789/`

不要为 Control UI 默认使用局域网 IP。在局域网或 tailnet 地址上使用纯 HTTP 可能会触发与 CDP 本身无关的不安全来源/设备认证行为。请参阅 [Control UI](/zh/web/control-ui)。

## 分层验证

从上到下进行操作。不要跳步。

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

如果在 Windows 上失败，OpenClaw 还不是问题所在。

### 第 2 层：验证 WSL2 是否可以访问该 Windows 端点

从 WSL2 测试您计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

好的结果：

- `/json/version` 返回带有 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开页面，空数组也没关系）

如果失败：

- Windows 尚未向 WSL2 公开端口
- 该地址对于 WSL2 端是错误的
- 仍然缺少防火墙 / 端口转发 / 本地代理

在触碰 OpenClaw 配置之前先解决此问题。

### 第 3 层：配置正确的浏览器配置文件

对于原始远程 CDP，请将 OpenClaw 指向可从 WSL2 访问的地址：

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
- 对于外部管理的浏览器，请保留 `attachOnly: true`
- 在期望 OpenClaw 成功之前，先使用 `curl` 测试相同的 URL

### 第 4 层：单独验证 Control UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面源与 `gateway.controlUi.allowedOrigins` 期望的一致
- 令牌认证或配对配置正确
- 您没有将 Control UI 认证问题当作浏览器问题来调试

有用的页面：

- [Control UI](/zh/web/control-ui)

### 第 5 层：验证端到端浏览器控制

从 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

好的结果：

- 选项卡在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）在同一配置文件中正常工作

## 常见的误导性错误

将每条消息视为特定于层的线索：

- `control-ui-insecure-auth`
  - UI 源 / 安全上下文问题，而非 CDP 传输问题
- `token_missing`
  - 身份验证配置问题
- `pairing required`
  - 设备审批问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问配置的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍是 CDP 可达性或缓慢/无法访问的远程端点问题
- `No Chrome tabs found for profile="user"`
  - 选择了本地 Chrome MCP 配置文件，但不可用主机本地标签页

## 快速排查检查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 是否可用？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 是否可用？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了确切的 WSL2 可访问地址？
4. 控制 UI：您是否正在打开 `http://127.0.0.1:18789/` 而不是 LAN IP？
5. 您是否尝试在 WSL2 和 Windows 之间使用 `existing-session` 而不是原始远程 CDP？

## 实用要点

该设置通常是可行的。难点在于，浏览器传输、控制 UI 源安全性以及令牌/配对可能会各自独立失败，但在用户看来表现相似。

如有疑问：

- 首先在本地验证 Windows Chrome 端点
- 其次从 WSL2 验证同一端点
- 然后再调试 OpenClaw 配置或控制 UI 身份验证

import en from "/components/footer/en.mdx";

<en />
