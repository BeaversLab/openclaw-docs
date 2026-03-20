---
summary: "通过原生 zca-js（二维码登录）支持 Zalo 个人账号，功能及配置"
read_when:
  - 为 Zalo 配置 OpenClaw 个人版
  - 调试 Zalo 个人版登录或消息流程
title: "Zalo 个人版"
---

# Zalo 个人版（非官方）

状态：实验性。此集成通过 Zalo 内部的原生 `zca-js` 自动化操作**个人 OpenClaw 账号**。

> **警告：** 这是一个非官方集成，可能会导致账号被封禁或限制。使用风险自负。

## 需要插件

Zalo 个人版作为插件提供，未包含在核心安装中。

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 或从源码检出安装：`openclaw plugins install ./extensions/zalouser`
- 详情：[插件](/zh/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 快速设置（初学者）

1. 安装插件（见上文）。
2. 登录（二维码，在 Gateway(网关) 机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 手机应用扫描二维码。
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
- 使用原生事件监听器接收入站消息。
- 通过 JS API 直接发送回复（文本/媒体/链接）。
- 专用于“个人账号”用例，即无法使用 Zalo 机器人 API 的场景。

## 命名

渠道 ID 为 `zalouser`，以明确表明这是自动化操作**个人 Zalo 用户账号**（非官方）。我们将 `zalo` 预留给未来潜在的官方 Zalo API 集成。

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

`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 接受用户 ID 或名称。设置期间，使用插件的进程内联系人查找将名称解析为 ID。

批准方式：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认值：`channels.zalouser.groupPolicy = "open"`（允许群组）。如果未设置，请使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 使用以下方式限制为允许列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；如果可能，名称会在启动时解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组中哪些发件人可以触发机器人）
- 阻止所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可以提示输入群组允许列表。
- 启动时，OpenClaw 会将允许列表中的群组/用户名称解析为 ID 并记录映射关系。
- 默认情况下，群组允许列表匹配仅限 ID。除非启用了 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则未解析的名称在进行身份验证时将被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种应急兼容模式，可重新启用可变的群组名称匹配。
- 如果未设置 `groupAllowFrom`，运行时将回退到 `allowFrom` 进行群组发件人检查。
- 发件人检查既适用于普通群组消息，也适用于控制命令（例如 `/new`、`/reset`）。

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
- 解析顺序：精确群组 ID/名称 -> 标准化群组别名 -> `*` -> 默认值（`true`）。
- 这既适用于允许列表中的群组，也适用于开放群组模式。
- 授权的控制命令（例如 `/new`）可以绕过提及门控。
- 当由于需要提及而跳过群组消息时，OpenClaw 会将其存储为待处理的群组历史记录，并将其包含在下一个已处理的群组消息中。
- 群组历史记录限制默认为 `messages.groupChat.historyLimit`（回退值 `50`）。您可以使用 `channels.zalouser.historyLimit` 为每个帐户覆盖此设置。

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
- 消息反应动作 `react` 支持在渠道操作中用于 `zalouser`。
  - 使用 `remove: true` 从消息中移除特定的反应表情符号。
  - 反应语义：[反应](/zh/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 会发送已送达 + 已读回执（尽力而为）。

## 故障排除

**登录无法保持：**

- `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**Allowlist/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用数字 ID，或使用确切的好友/群组名称。

**从旧的 CLI 设置升级：**

- 移除任何旧的关于外部 `zca` 进程的假设。
- 该渠道现在完全在 OpenClaw 中运行，无需外部 CLI 二进制文件。

import en from "/components/footer/en.mdx";

<en />
