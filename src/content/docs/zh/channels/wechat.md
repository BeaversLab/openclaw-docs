---
summary: "通过外部 openclaw-weixin 插件设置 WeChat 渠道"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

# WeChat

OpenClaw 通过腾讯的外部 `@tencent-weixin/openclaw-weixin` 渠道插件连接到 WeChat。

状态：外部插件。支持直接聊天和媒体。当前插件功能元数据未通告群聊功能。

## 命名

- **WeChat** 是本文档中面向用户的名称。
- **Weixin** 是腾讯包和插件 ID 使用的名称。
- `openclaw-weixin` 是 OpenClaw 渠道 ID。
- `@tencent-weixin/openclaw-weixin` 是 npm 包。

在 CLI 命令和配置路径中使用 `openclaw-weixin`。

## 工作原理

WeChat 代码不位于 OpenClaw 核心仓库中。OpenClaw 提供通用渠道插件契约，外部插件提供 WeChat 特定的运行时：

1. `openclaw plugins install` 安装 `@tencent-weixin/openclaw-weixin`。
2. Gateway(网关) 发现插件清单并加载插件入口点。
3. 插件注册渠道 ID `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 启动二维码登录。
5. 插件将帐户凭据存储在 OpenClaw 状态目录下。
6. 当 Gateway(网关) 启动时，插件会为每个配置的帐户启动其 Weixin 监视器。
7. 入站 WeChat 消息通过渠道契约进行规范化，路由到选定的 OpenClaw 代理，并通过插件出站路径发回。

这种分离很重要：OpenClaw 核心应保持与渠道无关。WeChat 登录、腾讯 iLink API 调用、媒体上传/下载、上下文令牌和帐户监视由外部插件拥有。

## 安装

快速安装：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

手动安装：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

安装后重启 Gateway(网关)：

```bash
openclaw gateway restart
```

## 登录

在运行 Gateway(网关) 的同一台机器上运行二维码登录：

```bash
openclaw channels login --channel openclaw-weixin
```

使用手机上的 WeChat 扫描二维码并确认登录。扫描成功后，插件会在本地保存帐户令牌。

要添加另一个 WeChat 帐户，请再次运行相同的登录命令。对于多个帐户，请按帐户、渠道和发送者隔离直接消息会话：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## 访问控制

直接消息使用 OpenClaw 的标准配对和允许列表模型进行渠道插件控制。

批准新发送者：

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

有关完整的访问控制模型，请参阅 [配对](/zh/channels/pairing)。

## 兼容性

插件在启动时会检查主 OpenClaw 的版本。

| 插件系列 | OpenClaw 版本           | npm 标签 |
| -------- | ----------------------- | -------- |
| `2.x`    | `>=2026.3.22`           | `latest` |
| `1.x`    | `>=2026.1.0 <2026.3.22` | `legacy` |

如果插件报告您的 OpenClaw 版本过旧，请更新 OpenClaw 或安装旧版插件系列：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## 边车进程

当微信插件监控腾讯 iLink Gateway(网关) 时，可以在 API 旁边运行辅助工作。在问题 #68451 中，该辅助路径暴露了 OpenClaw 通用过时 Gateway(网关) 清理中的一个错误：子进程可能会尝试清理父 Gateway(网关) 进程，从而导致在 systemd 等进程管理器下出现重启循环。

当前的 OpenClaw 启动清理会排除当前进程及其祖先进程，因此渠道助手不得终止启动它的 Gateway(网关)。此修复是通用的；它不是核心中微信特定的路径。

## 故障排除

检查安装和状态：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果渠道显示已安装但未连接，请确认插件已启用并重启：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

如果启用微信后 Gateway(网关) 反复重启，请同时更新 OpenClaw 和插件：

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

临时禁用：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## 相关文档

- 渠道概述：[聊天渠道](/zh/channels)
- 配对：[配对](/zh/channels/pairing)
- 渠道路由：[渠道路由](/zh/channels/channel-routing)
- 插件架构：[插件架构](/zh/plugins/architecture)
- 渠道插件 SDK：[渠道插件 SDK](/zh/plugins/sdk-channel-plugins)
- 外部包：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
