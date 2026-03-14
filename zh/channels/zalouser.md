---
summary: "通过原生 zca-js（二维码登录）、功能和配置支持 Zalo 个人帐户"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo Personal"
---

# Zalo Personal (非官方)

状态：实验性。此集成通过 OpenClaw 内部的原生 `zca-js` 自动化 **Zalo 个人帐户**。

> **警告：** 这是一个非官方集成，可能会导致账户暂停/封禁。使用风险自负。

## 所需插件

Zalo Personal 作为插件提供，不包含在核心安装中。

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 或者从源代码检出：`openclaw plugins install ./extensions/zalouser`
- 详情：[Plugins](/zh/en/tools/plugin)

不需要外部 `zca`/`openzca` CLI 二进制文件。

## 快速设置（初学者）

1. 安装插件（见上文）。
2. 登录（二维码，在 Gateway 网关 机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 移动应用程序扫描二维码。
3. 启用通道：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

4. 重启 Gateway 网关（或完成入职引导）。
5. 私信 (私信) 访问默认为配对模式；首次联系时批准配对码。

## 简介

- 完全通过 `zca-js` 在进程内运行。
- 使用原生事件监听器接收传入消息。
- 直接通过 JS API（文本/媒体/链接）发送回复。
- 专为 Zalo Bot API 不可用的“个人账户”使用场景设计。

## 命名

频道 ID 为 `zalouser`，以明确说明这自动化的是 **Zalo 个人用户帐户**（非官方）。我们保留 `zalo` 用于未来可能的官方 Zalo API 集成。

## 查找 ID（目录）

使用目录 CLI 发现对等方/群组及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 出站文本被分块为约 2000 个字符（Zalo 客户端限制）。
- 流式传输默认被阻止。

## 访问控制（私信）

`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认值：`pairing`）。

`channels.zalouser.allowFrom` 接受用户 ID 或名称。在载入期间，名称将使用插件的进程内联系人查找解析为 ID。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认值：`channels.zalouser.groupPolicy = "open"`（允许群组）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 限制为仅允许列表（allowlist），使用：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；如果可能，名称会在启动时解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组中哪些发送者可以触发机器人）
- 阻止所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可以提示输入群组允许列表。
- 启动时，OpenClaw 将允许列表中的群组/用户名称解析为 ID 并记录映射。
- 默认情况下，群组允许列表匹配仅基于 ID。除非启用了 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则未解析的名称在身份验证中将被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种紧急兼容模式，可重新启用可变群组名称匹配。
- 如果未设置 `groupAllowFrom`，运行时将回退到 `allowFrom` 进行群组发送者检查。
- 发送者检查适用于普通群组消息和控制命令（例如 `/new`、`/reset`）。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true },
      },
    },
  },
}
```

### 群组提及门控

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：确切的群组 ID/名称 -> 标准化的群组别名 -> `*` -> 默认值（`true`）。
- 这适用于允许列表中的群组和开放群组模式。
- 授权的控制命令（例如 `/new`）可以绕过提及限制。
- 当因需要提及而跳过群组消息时，OpenClaw 会将其存储为待处理的群组历史记录，并将其包含在下一条已处理的群组消息中。
- 群组历史记录限制默认为 `messages.groupChat.historyLimit`（回退 `50`）。您可以使用 `channels.zalouser.historyLimit` 为每个帐号覆盖此设置。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { allow: true, requireMention: true },
        "Work Chat": { allow: true, requireMention: false },
      },
    },
  },
}
```

## 多帐户

帐号映射到 OpenClaw 状态中的 `zalouser` 配置文件。例如：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" },
      },
    },
  },
}
```

## 正在输入、反应和送达确认

- OpenClaw 在发送回复之前会发送正在输入事件（尽力而为）。
- 在频道操作中，支持针对 `zalouser` 的消息反应操作 `react`。
  - 使用 `remove: true` 从消息中移除特定的反应表情符号。
  - 反应语义：[Reactions](/zh/en/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 会发送已送达 + 已读确认（尽力而为）。

## 故障排除

**登录无法保存：**

- `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允许列表/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用数字 ID，或确切的好友/群组名称。

**从旧的基于 CLI 的设置升级：**

- 移除任何关于旧的外部 `zca` 进程的假设。
- 该频道现在完全在 OpenClaw 中运行，无需外部 CLI 二进制文件。

import zh from '/components/footer/zh.mdx';

<zh />
