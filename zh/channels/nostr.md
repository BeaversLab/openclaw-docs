---
summary: "通过 NIP-04 加密消息接入 Nostr DM"
read_when:
  - 你想让 OpenClaw 通过 Nostr 接收私信
  - 你在设置去中心化消息
---
# Nostr

**状态：** 可选插件（默认禁用）。

Nostr 是一个去中心化的社交网络协议。该渠道让 OpenClaw 能通过 NIP-04 接收并回复加密私信（DM）。

## 安装（按需）

### Onboarding（推荐）

- 上手向导（`openclaw onboard`）与 `openclaw channels add` 会列出可选渠道插件。
- 选择 Nostr 后会提示按需安装插件。

安装默认策略：

- **Dev 频道 + 本地 git 检出可用：** 使用本地插件路径。
- **Stable/Beta：** 从 npm 下载。

你随时可在提示中手动覆盖选择。

### 手动安装

```bash
openclaw plugins install @openclaw/nostr
```

使用本地检出（dev 流程）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安装或启用插件后请重启 Gateway。

## 快速设置

1) 生成 Nostr 密钥对（如需）：

```bash
# Using nak
nak key generate
```

2) 添加到配置：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

3) 导出 key：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4) 重启 Gateway。

## 配置参考

| Key | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `privateKey` | string | required | `nsec` 或 hex 格式私钥 |
| `relays` | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | Relay URL（WebSocket） |
| `dmPolicy` | string | `pairing` | 私聊访问策略 |
| `allowFrom` | string[] | `[]` | 允许发送者 pubkey |
| `enabled` | boolean | `true` | 启用/禁用渠道 |
| `name` | string | - | 显示名 |
| `profile` | object | - | NIP-01 资料元数据 |

## Profile 元数据

Profile 数据会以 NIP-01 `kind:0` 事件发布。你可以在 Control UI（Channels -> Nostr -> Profile）中管理，也可以直接写在配置里。

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

- Profile URL 必须使用 `https://`。
- 从 relay 导入会合并字段，并保留本地覆盖。

## 访问控制

### DM 策略

- **pairing**（默认）：未知发送者会收到配对码。
- **allowlist**：仅 `allowFrom` 中的 pubkey 可私信。
- **open**：公开接收私信（需 `allowFrom: ["*"]`）。
- **disabled**：忽略入站私信。

### Allowlist 示例

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

## Key 格式

支持格式：

- **私钥：** `nsec...` 或 64 位 hex
- **Pubkey（allowFrom）：** `npub...` 或 hex

## Relays

默认：`relay.damus.io` 与 `nos.lol`。

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nostr.wine"
      ]
    }
  }
}
```

建议：

- 使用 2-3 个 relay 以保证冗余。
- 避免过多 relay（延迟、重复）。
- 付费 relay 可提升可靠性。
- 本地 relay 可用于测试（`ws://localhost:7777`）。

## 协议支持

| NIP | 状态 | 说明 |
| --- | --- | --- |
| NIP-01 | 支持 | 基本事件格式 + Profile 元数据 |
| NIP-04 | 支持 | 加密私信（`kind:4`） |
| NIP-17 | 计划中 | Gift-wrapped DMs |
| NIP-44 | 计划中 | 版本化加密 |

## 测试

### 本地 relay

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

1) 从日志中获取 bot pubkey（npub）。
2) 打开 Nostr 客户端（Damus、Amethyst 等）。
3) 向 bot pubkey 发送私信。
4) 验证回复。

## 故障排查

### 收不到消息

- 确认私钥有效。
- 确保 relay URL 可达且使用 `wss://`（本地可用 `ws://`）。
- 确认 `enabled` 不为 `false`。
- 查看 Gateway 日志中的 relay 连接错误。

### 无法发送回复

- 检查 relay 是否允许写入。
- 验证出站连通性。
- 留意 relay 限流。

### 重复回复

- 多 relay 时属正常现象。
- 消息按 event ID 去重；仅第一次投递会触发回复。

## 安全

- 切勿提交私钥。
- 使用环境变量存储密钥。
- 生产环境建议使用 `allowlist`。

## 限制（MVP）

- 仅支持私信（不支持群聊）。
- 无媒体附件。
- 仅 NIP-04（计划支持 NIP-17 gift-wrap）。
