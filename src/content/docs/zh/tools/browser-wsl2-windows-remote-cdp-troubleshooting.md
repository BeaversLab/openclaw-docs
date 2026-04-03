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

它还涵盖了来自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分层故障模式：多个独立问题可能同时出现，这会导致错误的层级首先看起来像是坏了。

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

对于 WSL2 Gateway(网关) + Windows Chrome，首选原始远程 CDP。Chrome MCP 是主机本地的，而不是 WSL2 到 Windows 的桥接。

## 工作原理架构

参考架构：

- WSL2 在 `127.0.0.1:18789` 上运行 Gateway(网关)
- Windows 在普通浏览器中于 `http://127.0.0.1:18789/` 打开控制 UI
- Windows Chrome 在端口 `9222` 上暴露 CDP 端点
- WSL2 可以访问该 Windows CDP 端点
- OpenClaw 将浏览器配置文件指向可从 WSL2 访问的地址

## 为什么此设置令人困惑

多个故障可能会重叠：

- WSL2 无法访问 Windows CDP 端点
- 控制 UI 是从非安全源打开的
- `gateway.controlUi.allowedOrigins` 与页面源不匹配
- 缺少令牌或配对
- 浏览器配置文件指向了错误的地址

因此，修复一个层级后，可能仍然会看到不同的错误。

## 控制 UI 的关键规则

当从 Windows 打开 UI 时，请使用 Windows localhost，除非您有意设置了 HTTPS。

使用：

`http://127.0.0.1:18789/`

不要将控制 UI 默认设置为 LAN IP。在 LAN 或 tailnet 地址上使用纯 HTTP 可能会触发与 CDP 本身无关的不安全源/设备认证行为。参见[控制 UI](/en/web/control-ui)。

## 分层验证

从上到下操作。不要跳过。

### 第 1 层：验证 Chrome 在 Windows 上正在提供 CDP

在 Windows 上启动 Chrome 并启用远程调试：

```powershell
chrome.exe --remote-debugging-port=9222
```

在 Windows 上，首先验证 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失败，OpenClaw 还不是问题所在。

### 第 2 层：验证 WSL2 可以访问该 Windows 端点

在 WSL2 中，测试您计划在 `cdpUrl` 中使用的确切地址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

良好结果：

- `/json/version` 返回带有 Browser / Protocol-Version 元数据的 JSON
- `/json/list` 返回 JSON（如果没有打开的页面，空数组也可以）

如果失败：

- Windows 尚未向 WSL2 公开端口
- 对于 WSL2 端来说地址错误
- 仍然缺少防火墙 / 端口转发 / 本地代理

在修改 OpenClaw 配置之前先解决此问题。

### 第 3 层：配置正确的浏览器配置文件

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

- 使用 WSL2 可访问的地址，而不是仅适用于 Windows 的地址
- 对于外部管理的浏览器，保留 `attachOnly: true`
- 在期望 OpenClaw 成功之前，使用 `curl` 测试相同的 URL

### 第 4 层：单独验证控制 UI 层

从 Windows 打开 UI：

`http://127.0.0.1:18789/`

然后验证：

- 页面源与 `gateway.controlUi.allowedOrigins` 期望的匹配
- 令牌身份验证或配对配置正确
- 不要将控制 UI 身份验证问题当作浏览器问题来调试

有用的页面：

- [控制 UI](/en/web/control-ui)

### 第 5 层：验证端到端浏览器控制

从 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

良好的结果：

- 标签页在 Windows Chrome 中打开
- `openclaw browser tabs` 返回目标
- 后续操作（`snapshot`、`screenshot`、`navigate`）在同一配置文件中工作

## 常见的误导性错误

将每条消息视为特定于某一层的线索：

- `control-ui-insecure-auth`
  - UI 源 / 安全上下文问题，而不是 CDP 传输问题
- `token_missing`
  - 身份验证配置问题
- `pairing required`
  - 设备批准问题
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 无法访问已配置的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 可达性或缓慢/不可访问的远程端点问题
- `No Chrome tabs found for profile="user"`
  - 选择了本地 Chrome MCP 配置文件，但没有可用的主机本地标签页

## 快速分诊检查清单

1. Windows：`curl http://127.0.0.1:9222/json/version` 是否正常工作？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 是否正常工作？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了完全相同的 WSL2 可访问地址？
4. 控制 UI：您是否打开了 `http://127.0.0.1:18789/` 而不是 LAN IP？
5. 您是否尝试在 WSL2 和 Windows 之间使用 `existing-session` 而不是原始远程 CDP？

## 实用要点

此设置通常是可行的。困难的部分在于，浏览器传输、控制 UI 源安全以及令牌/配对可能会各自独立失败，而从用户角度来看这些失败看起来很相似。

如有疑问：

- 首先在本地验证 Windows Chrome 端点
- 其次从 WSL2 验证同一端点
- 仅在此之后再调试 OpenClaw 配置或控制 UI 身份验证
