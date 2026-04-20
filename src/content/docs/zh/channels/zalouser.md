---
summary: "通过原生 zca-js（二维码登录）、功能和配置支持 Zalo 个人帐户"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo Personal"
---

# Zalo Personal (非官方)

状态：实验性。此集成通过 OpenClaw 内部的原生 `zca-js` 自动化 **Zalo 个人帐户**。

> **警告：** 这是一个非官方集成，可能导致账户被暂停或封禁。使用风险自负。

## 捆绑插件

Zalo Personal 作为捆绑插件包含在当前的 OpenClaw 版本中，因此正常的打包版本不需要单独安装。

如果您使用的是旧版本或排除了 Zalo Personal 的自定义安装，请手动安装：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 或从源代码检出：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/zh/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 快速设置（初学者）

1. 确保 Zalo Personal 插件可用。
   - 当前的 OpenClaw 打包版本已包含它。
   - 旧版本/自定义安装可以使用上述命令手动添加它。
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

- 完全通过 `zca-js` 在进程内运行。
- 使用原生事件监听器接收传入消息。
- 通过 JS API 直接发送回复（文本/媒体/链接）。
- 专为 Zalo Bot API 不可用的“个人账户”用例设计。

## 命名

渠道 ID 为 `zalouser`，以明确表明这是自动化的**个人 Zalo 用户账户**（非官方）。我们将 `zalo` 保留给未来可能出现的官方 Zalo API 集成。

## 查找 ID（目录）

使用目录 CLI 发现对等方/群组及其 ID：

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

`channels.zalouser.allowFrom` 接受用户 ID 或名称。在设置期间，名称使用插件的进程内联系人查找解析为 ID。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认值：`channels.zalouser.groupPolicy = "open"`（允许群组）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 使用以下命令限制为允许列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；名称在启动时会尽可能解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组中的哪些发送者可以触发机器人）
- 屏蔽所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可以提示输入群组白名单。
- 启动时，OpenClaw 会将白名单中的群组/用户名解析为 ID 并记录映射关系。
- 群组白名单匹配默认仅基于 ID。未解析的名称将忽略用于身份验证，除非启用了 `channels.zalouser.dangerouslyAllowNameMatching: true`。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，用于重新启用可变群组名称匹配。
- 如果未设置 `groupAllowFrom`，运行时会回退到 `allowFrom` 进行群组发送者检查。
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

### 群组提及限制

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：精确群组 ID/名称 -> 标准化群组标识 -> `*` -> 默认（`true`）。
- 这既适用于白名单群组，也适用于开放群组模式。
- 引用机器人消息算作群组激活的隐式提及。
- 授权的控制命令（例如 `/new`）可以绕过提及门控。
- 当因需要提及而跳过群组消息时，OpenClaw 会将其存储为待处理的群组历史记录，并包含在下一个处理的群组消息中。
- 群组历史记录限制默认为 `messages.groupChat.historyLimit`（回退 `50`）。您可以使用 `channels.zalouser.historyLimit` 为每个帐户覆盖此设置。

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

帐户映射到 OpenClaw 状态中的 `zalouser` 配置文件。示例：

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

- OpenClaw 在发送回复之前发送正在输入事件（尽力而为）。
- 渠道操作中支持针对 `zalouser` 的消息反应操作 `react`。
  - 使用 `remove: true` 从消息中移除特定的反应表情符号。
  - 反应语义：[Reactions](/zh/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 发送送达 + 已读确认（尽力而为）。

## 故障排除

**登录无法保持：**

- `openclaw channels status --probe`
- 重新登录： `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允许列表/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用数字 ID，或使用确切的好友/群组名称。

**从旧的基于 CLI 的设置升级：**

- 移除任何关于旧的外部 `zca` 进程的假设。
- 该渠道现在完全在 OpenClaw 中运行，无需外部 CLI 二进制文件。

## 相关

- [Channels Overview](/zh/channels) — 所有支持的渠道
- [Pairing](/zh/channels/pairing) — 私信认证和配对流程
- [Groups](/zh/channels/groups) — 群聊行为和提及门控
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
