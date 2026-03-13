---
summary: "Nostr DM channel via NIP-04 encrypted messages"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**状态：** 可选插件（默认禁用）。

Nostr 是一个去中心化的社交网络协议。此频道使 OpenClaw 能够通过 NIP-04 接收和回复加密的直连消息 (DM)。

## 安装（按需）

### 入门向导（推荐）

- The onboarding wizard (`openclaw onboard`) and `openclaw channels add` list optional channel plugins.
- 选择 Nostr 会提示您按需安装该插件。

安装默认设置：

- **开发频道 + 可用 git 检出：** 使用本地插件路径。
- **稳定版/Beta 版：** 从 npm 下载。

您始终可以覆盖提示中的选择。

### 手动安装

```bash
openclaw plugins install @openclaw/nostr
```

使用本地检出（开发工作流）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安装或启用插件后，重启 Gateway。

## 快速设置

1. 生成 Nostr 密钥对（如需要）：

```bash
# Using nak
nak key generate
```

2. 添加到配置：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

3. 导出密钥：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重启 Gateway。

## 配置参考

| Key          | Type     | Default                                     | Description                         |
| ------------ | -------- | ------------------------------------------- | ----------------------------------- |
| `privateKey` | string   | required                                    | Private key in `nsec` or hex format |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | Relay URLs (WebSocket)              |
| `dmPolicy`   | string   | `pairing`                                   | DM access policy                    |
| `allowFrom`  | string[] | `[]`                                        | Allowed sender pubkeys              |
| `enabled`    | boolean  | `true`                                      | Enable/disable channel              |
| `name`       | string   | -                                           | Display name                        |
| `profile`    | object   | -                                           | NIP-01 profile metadata             |

## 个人资料元数据

Profile data is published as a NIP-01 `kind:0` event. You can manage it from the Control UI (Channels -> Nostr -> Profile) or set it directly in config.

示例：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "openclaw",
        "displayName": "OpenClaw",
        "about": "Personal assistant DM bot",
        "picture": "https://example.com/avatar.png",
        "banner": "https://example.com/banner.png",
        "website": "https://example.com",
        "nip05": "openclaw@example.com",
        "lud16": "openclaw@example.com"
      }
    }
  }
}
```

说明：

- Profile URLs must use `https://`.
- 从中继导入时会合并字段并保留本地覆盖设置。

## 访问控制

### 私信 (DM) 策略

- **pairing**（默认）：未知发送者将获得配对码。
- **allowlist**: only pubkeys in `allowFrom` can DM.
- **open**: public inbound DMs (requires `allowFrom: ["*"]`).
- **disabled**：忽略入站私信。

### 允许列表示例

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}
```

## 密钥格式

接受的格式：

- **Private key:** `nsec...` or 64-char hex
- **公钥 (`allowFrom`)：** `npub...` 或十六进制

## 中继

默认值：`relay.damus.io` 和 `nos.lol`。

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"]
    }
  }
}
```

提示：

- 使用 2-3 个中继以确保冗余。
- 避免使用过多的中继（延迟、重复）。
- 付费中继可以提高可靠性。
- 本地中继器适用于测试 (`ws://localhost:7777`)。

## 协议支持

| NIP    | 状态    | 描述                           |
| ------ | --------- | ------------------------------------- |
| NIP-01 | 支持 | 基本事件格式 + 个人资料元数据 |
| NIP-04 | 支持 | 加密 DM (`kind:4`)              |
| NIP-17 | 计划中   | 礼物包装 DM                      |
| NIP-44 | 计划中   | 版本化加密                  |

## 测试

### 本地中继

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
}
```

### 手动测试

1. 从日志中记下机器人公钥 (npub)。
2. 打开 Nostr 客户端（Damus、Amethyst 等）。
3. 向机器人公钥发送私信。
4. 验证响应。

## 故障排除

### 未收到消息

- 验证私钥是否有效。
- 确保中继器 URL 可访问并使用 `wss://`（或本地使用 `ws://`）。
- 确认 `enabled` 未设置为 `false`。
- 检查 Gateway 日志中是否存在中继连接错误。

### 未发送响应

- 检查中继是否接受写入。
- 验证出站连接性。
- 留意中继速率限制。

### 重复响应

- 使用多个中继时属于预期情况。
- 消息根据事件 ID 进行去重；仅首次投递会触发响应。

## 安全

- 切勿提交私钥。
- 使用环境变量存储密钥。
- 考虑为生产环境机器人使用 `allowlist`。

## 限制（MVP）

- 仅支持私信（不支持群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（计划支持 NIP-17 礼物封装）。

import zh from '/components/footer/zh.mdx';

<zh />
