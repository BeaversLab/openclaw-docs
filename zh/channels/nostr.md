---
summary: "Nostr 私信 渠道 via NIP-04 encrypted messages"
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

- 入门向导 (`openclaw onboard`) and `openclaw channels add` list optional 渠道 plugins.
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

安装或启用插件后，重启 Gateway 网关。

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

4. 重启 Gateway 网关。

## 配置参考

| 键           | 类型     | 默认值                                      | 描述                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | string   | 必填                                        | `nsec` 或十六进制格式的私钥 |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继 URL (WebSocket)        |
| `dmPolicy`   | string   | `pairing`                                   | 私信访问策略                |
| `allowFrom`  | string[] | `[]`                                        | 允许的发送者公钥            |
| `enabled`    | boolean  | `true`                                      | 启用/禁用渠道               |
| `name`       | string   | -                                           | 显示名称                    |
| `profile`    | object   | -                                           | NIP-01 个人资料元数据       |

## 个人资料元数据

个人资料数据作为 NIP-01 `kind:0` 事件发布。您可以在控制 UI（Channels -> Nostr -> Profile）中管理它，或者直接在配置中设置。

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

注意：

- 个人资料 URL 必须使用 `https://`。
- 从中继导入会合并字段并保留本地覆盖。

## 访问控制

### 私信策略

- **pairing** (默认)：未知发送者将获得配对码。
- **allowlist**：仅 `allowFrom` 中的公钥可以发送私信。
- **open**：公共入站私信 (需要 `allowFrom: ["*"]`)。
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

- **私钥：** `nsec...` 或 64 字符十六进制
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

- 使用 2-3 个中继以实现冗余。
- 避免使用过多中继（延迟、重复）。
- 付费中继可以提高可靠性。
- 本地中继适合测试 (`ws://localhost:7777`)。

## 协议支持

| NIP    | 状态   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 支持   | 基本事件格式 + 个人资料元数据 |
| NIP-04 | 支持   | 加密私信 (`kind:4`)           |
| NIP-17 | 计划中 | 礼品包装的私信                |
| NIP-44 | 计划中 | 版本化加密                    |

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

1. 从日志中记录 bot 公钥 (npub)。
2. 打开一个 Nostr 客户端（Damus、Amethyst 等）。
3. 向 bot 公钥发送私信。
4. 验证响应。

## 故障排除

### 未收到消息

- 验证私钥是否有效。
- 确保中继 URL 可访问，并使用 `wss://`（本地环境使用 `ws://`）。
- 确认 `enabled` 未被设置为 `false`。
- 检查 Gateway(网关) 日志以查找中继连接错误。

### 未发送响应

- 检查中继是否接受写入。
- 验证出站连接。
- 留意中继速率限制。

### 响应重复

- 使用多个中继时属于预期现象。
- 消息会根据事件 ID 进行去重；仅首次投递会触发响应。

## 安全

- 切勿提交私钥。
- 使用环境变量存储密钥。
- 对于生产环境中的 bot，请考虑使用 `allowlist`。

## 限制（MVP）

- 仅支持私信（无群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（计划支持 NIP-17 gift-wrap）。

import zh from '/components/footer/zh.mdx';

<zh />
