---
summary: "通过原生 zca-js（二维码登录）、功能和配置支持 Zalo 个人帐户"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo 个人版"
---

状态：实验性。此集成通过 OpenClaw 内部的原生 `zca-js` 自动化一个 **个人 Zalo 账号**。

<Warning>这是一个非官方集成，可能会导致账户暂停或封禁。使用风险自负。</Warning>

## bundled plugin

Zalo Personal 作为 bundled plugin 包含在当前的 OpenClaw 版本中，因此普通的打包版本不需要单独安装。

如果您使用的是旧版本构建或自定义安装且不包括 Zalo Personal，
请直接安装 npm 软件包：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 固定版本：`openclaw plugins install @openclaw/zalouser@2026.5.2`
- 或者从源代码检出：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/zh/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 快速设置（初学者）

1. 确保 Zalo Personal 插件可用。
   - 当前打包的 OpenClaw 版本已将其捆绑在内。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 登录（二维码，在 Gateway(网关) 机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 移动应用扫描二维码。
3. 启用渠道：

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

4. 重启 Gateway(网关)（或完成设置）。
5. 私信访问默认为配对模式；请在首次联系时批准配对码。

## 简介

- 通过 `zca-js` 完全在进程内运行。
- 使用原生事件监听器来接收传入消息。
- 通过 JS API 直接发送回复（文本/媒体/链接）。
- 专为“个人帐户”用例设计，在该场景下 Zalo Bot API 不可用。

## 命名

渠道 ID 为 `zalouser`，以明确表明这是自动化 **个人 Zalo 用户帐户**（非官方）。我们将 `zalo` 保留给未来可能的官方 Zalo API 集成。

## 查找 ID（目录）

使用目录 CLI 来发现对等方/群组及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 出站文本被分块为约 2000 个字符（Zalo 客户端限制）。
- 默认情况下阻止流式传输。

## 访问控制（私信）

`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 应使用稳定的 Zalo 用户 ID。它还可以引用静态发送者访问组（`accessGroup:<name>`）。在交互式设置期间，可以使用插件的进程内联系人查找将输入的名称解析为 ID。

如果配置中保留了原始名称，则仅在启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，启动时才会解析它。如果没有选择加入，运行时发送者检查仅基于 ID，并且原始名称在授权时会被忽略。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认值：`channels.zalouser.groupPolicy = "open"`（允许群组）。在未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 限制为允许列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；仅在启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，名称才会在启动时解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组中哪些发送者可以触发机器人；可以使用 `accessGroup:<name>` 引用静态发送者访问组）
- 阻止所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可以提示输入群组允许列表。
- 启动时，OpenClaw 会将允许列表中的群组/用户名称解析为 ID，并仅在启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时记录映射关系。
- 默认情况下，群组允许列表匹配仅基于 ID。除非启用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则未解析的名称在授权时将被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，它重新启用了可变的启动时名称解析和运行时群组名称匹配。
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

### 群组提及控制

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：精确群组 id/名称 -> 标准化群组别名 -> `*` -> 默认（`true`）。
- 这既适用于允许列表中的群组，也适用于开放群组模式。
- 引用机器人消息算作用于激活群组的隐式提及。
- 授权的控制命令（例如 `/new`）可以绕过提及限制。
- 当由于需要提及而跳过群组消息时，OpenClaw 会将其存储为待处理的群组历史记录，并将其包含在下一个处理的群组消息中。
- 群组历史记录限制默认为 `messages.groupChat.historyLimit`（回退值为 `50`）。您可以使用 `channels.zalouser.historyLimit` 为每个帐号覆盖此设置。

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

## 多帐号

帐号映射到 OpenClaw 状态中的 `zalouser`OpenClaw 个人资料。示例：

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

## 正在输入、反应和送达回执

- OpenClaw 会在发送回复之前发送正在输入事件（尽力而为）。
- 在渠道操作中，支持针对 `zalouser` 的消息反应操作 `react`。
  - 使用 `remove: true` 从消息中移除特定的反应表情符号。
  - 反应语义：[反应](/zh/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 会发送已送达 + 已读回执（尽力而为）。

## 故障排除

**登录无法保持：**

- `openclaw channels status --probe`
- 重新登录： `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允许列表/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom` 中使用数字 ID，并在 `groups` 中使用稳定的群组 ID。如果您确实需要确切的好友/群组名称，请启用 `channels.zalouser.dangerouslyAllowNameMatching: true`。

**从旧的基于 CLI 的设置升级：**

- 移除任何旧的外部 `zca` 进程假设。
- 该渠道现在完全在 OpenClaw 中运行，无需外部 CLI 二进制文件。

## 相关

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及限制
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
