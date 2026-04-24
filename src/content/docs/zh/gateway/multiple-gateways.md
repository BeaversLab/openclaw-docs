---
summary: "在同一主机上运行多个 OpenClaw 网关（隔离、端口和配置文件）"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "多个网关"
---

# 多个网关（同一主机）

大多数设置应使用一个 Gateway(网关) 网关，因为单个 Gateway(网关) 网关 可以处理多个消息连接和代理。如果您需要更强的隔离性或冗余（例如，救援机器人），请使用隔离的配置文件/端口运行单独的 Gateway(网关) 网关。

## 最佳推荐设置

对于大多数用户来说，最简单的救援机器人设置是：

- 将主机器人保留在默认配置文件上
- 在 `--profile rescue` 上运行救援机器人
- 为救援账户使用一个完全独立的 Telegram 机器人
- 将救援机器人保留在不同的基础端口上，例如 `19789`

这使救援机器人与主机器人保持隔离，以便在主机器人停机时可以进行调试或应用配置更改。基础端口之间至少保留 20 个端口，以免派生的浏览器/canvas/CDP 端口发生冲突。

## 救援机器人快速入门

将其用作默认路径，除非您有充分理由执行其他操作：

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果您的主机器人已经在运行，通常只需这样做即可。

在 `openclaw --profile rescue onboard` 期间：

- 使用单独的 Telegram bot 令牌
- 保留 `rescue` 配置文件
- 使用比主 bot 高出至少 20 的基础端口
- 接受默认的救援工作区，除非您已经自己管理了一个

如果新手引导已经为您安装了救援服务，则最后的 `gateway install` 不是必需的。

## 为什么这样做有效

救援 bot 保持独立，因为它拥有自己的：

- 配置文件/配置
- 状态目录
- 工作区
- 基础端口（以及派生端口）
- Telegram bot 令牌

对于大多数设置，请为救援配置文件使用完全独立的 Telegram bot：

- 易于保持仅限操作员访问
- 独立的 bot 令牌和身份
- 独立于主 bot 的渠道/应用安装
- 当主 bot 故障时，简单的基于私信的恢复路径

## `--profile rescue onboard` 更改的内容

`openclaw --profile rescue onboard` 使用标准的新手引导流程，但它会将所有内容写入到单独的配置文件中。

实际上，这意味着救援机器人将拥有自己独立的：

- 配置文件
- 状态目录
- 工作区（默认为 `~/.openclaw/workspace-rescue`）
- 托管服务名称

除此之外，提示信息与标准新手引导完全相同。

## 通用多 Gateway(网关) 设置

上述救援机器人的布局是最简单的默认方案，但相同的隔离模式也适用于同一主机上的任何一对或一组 Gateway(网关)。

对于更通用的设置，请为每个额外的 Gateway(网关) 分配其自己的命名配置文件和基础端口：

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果您希望两个 Gateway(网关) 都使用命名配置文件，那也是可行的：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服务遵循相同的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

当您需要备用操作员通道时，请使用救援机器人快速入门。当您需要为不同的通道、租户、工作区或运营角色设置多个长期运行的 Gateway(网关) 时，请使用通用配置文件模式。

## 隔离检查清单

保持每个 Gateway(网关) 实例的这些项唯一：

- `OPENCLAW_CONFIG_PATH` — 每个实例的配置文件
- `OPENCLAW_STATE_DIR` — 每个实例的会话、凭据、缓存
- `agents.defaults.workspace` — 每个实例的工作区根目录
- `gateway.port` (或 `--port`) — 每个实例唯一
- 派生的 browser/canvas/CDP 端口

如果共享这些项，您将遇到配置竞争和端口冲突。

## 端口映射（派生）

基础端口 = `gateway.port` (或 `OPENCLAW_GATEWAY_PORT` / `--port`)。

- 浏览器控制服务端口 = 基础端口 + 2（仅限环回）
- canvas 主机由 Gateway(网关) HTTP 服务器提供服务（端口与 `gateway.port` 相同）
- 浏览器配置文件 CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配

如果你在配置或环境变量中覆盖了其中任何一项，必须确保每个实例的值是唯一的。

## 浏览器/CDP 说明（常见陷阱）

- 请**勿**在多个实例中将 `browser.cdpUrl` 固定为相同的值。
- 每个实例都需要自己的浏览器控制端口和 CDP 范围（从其网关端口派生）。
- 如果需要显式的 CDP 端口，请为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（每个配置文件，每个实例）。

## 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## 快速检查

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

解读：

- `gateway status --deep` 有助于捕捉来自旧安装的过时 launchd/systemd/schtasks 服务。
- 仅当你有意运行多个隔离的网关时，才会预期出现 `gateway probe` 警告文本（例如 `multiple reachable gateways detected`）。
