---
summary: "Nostr 渠道，通过 NIP-04 加密消息实现"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**状态：** 可选的捆绑插件（默认禁用，直到配置完成）。

Nostr 是一个去中心化的社交网络协议。此频道使 OpenClaw 能够通过 NIP-04 接收和回复加密的直连消息 (DM)。

## 捆绑插件

当前的 OpenClaw 发行版将 Nostr 作为捆绑插件提供，因此正常的打包版本不需要单独安装。

### 旧版本/自定义安装

- 新手引导 (`openclaw onboard`) 和 `openclaw channels add` 仍然会从共享渠道目录中显示 Nostr。
- 如果您的构建版本排除了捆绑的 Nostr，请手动安装它。

```bash
openclaw plugins install @openclaw/nostr
```

使用本地检出版本（开发工作流）：

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

安装或启用插件后，请重启 Gateway(网关)。

### 非交互式设置

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 将 `NOSTR_PRIVATE_KEY` 保留在环境中，而不是将密钥存储在配置文件中。

## 快速设置

1. 生成一个 Nostr 密钥对（如果需要）：

```bash
# Using nak
nak key generate
```

2. 添加到配置：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. 导出密钥：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重启 Gateway(网关)。

## 配置参考

| Key          | Type     | 默认值                                      | 描述                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | string   | required                                    | `nsec` 或十六进制格式的私钥 |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中继 URL（WebSocket）       |
| `dmPolicy`   | string   | `pairing`                                   | 私信访问策略                |
| `allowFrom`  | string[] | `[]`                                        | 允许的发送者公钥            |
| `enabled`    | boolean  | `true`                                      | 启用/禁用渠道               |
| `name`       | string   | -                                           | 显示名称                    |
| `profile`    | object   | -                                           | NIP-01 个人资料元数据       |

## 个人资料元数据

个人资料数据作为 NIP-01 `kind:0` 事件发布。您可以从控制 UI（渠道 -> Nostr -> 个人资料）进行管理，或者直接在配置中设置。

示例：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

注意：

- 个人资料 URL 必须使用 `https://`。
- 从中继导入会合并字段并保留本地覆盖。

## 访问控制

### 私信策略

- **pairing**（默认）：未知发送者会收到配对代码。
- **allowlist**：只有 `allowFrom` 中的公钥可以发送私信。
- **open**：公开的入站私信（需要 `allowFrom: ["*"]`）。
- **disabled**：忽略入站私信。

执行说明：

- 在执行发送者策略和 NIP-04 解密之前会验证入站事件的签名，因此伪造的事件会被及早拒绝。
- 配对回复是在不处理原始私信正文的情况下发送的。
- 接收到的私信受速率限制，过大的负载会在解密前被丢弃。

### 允许列表示例

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## 密钥格式

接受的格式：

- **私钥：** `nsec...` 或 64 个字符的十六进制
- **公钥 (`allowFrom`)：** `npub...` 或十六进制

## 中继

默认值：`relay.damus.io` 和 `nos.lol`。

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

提示：

- 使用 2-3 个中继以实现冗余。
- 避免使用过多的中继（延迟、重复）。
- 付费中继可以提高可靠性。
- 本地中继适用于测试 (`ws://localhost:7777`)。

## 协议支持

| NIP    | 状态   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 已支持 | 基本事件格式 + 个人资料元数据 |
| NIP-04 | 已支持 | 加密私信 (`kind:4`)           |
| NIP-17 | 计划中 | 礼品包装的私信                |
| NIP-44 | 计划中 | 版本化加密                    |

## 测试

### 本地中继

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### 手动测试

1. 从日志中记录机器人公钥 (npub)。
2. 打开 Nostr 客户端 (Damus, Amethyst 等)。
3. 向机器人公钥发送私信。
4. 验证响应。

## 故障排除

### 未收到消息

- 验证私钥是否有效。
- 确保中继 URL 可访问，并使用 `wss://`（或本地使用 `ws://`）。
- 确认 `enabled` 未设置为 `false`。
- 检查 Gateway(网关) 日志中的中继连接错误。

### 未发送响应

- 检查中继是否接受写入。
- 验证出站连接。
- 留意中继速率限制。

### 重复响应

- 使用多个中继时的预期情况。
- 消息根据事件 ID 去重；只有第一次投递会触发响应。

## 安全性

- 切勿提交私钥。
- 使用环境变量存储密钥。
- 对于生产环境的机器人，请考虑 `allowlist`。
- 签名在发送方策略之前进行验证，而发送方策略在解密之前执行，因此伪造的事件会被尽早拒绝，未知发送者无法强制进行完整的加密工作。

## 限制 (MVP)

- 仅支持私信（不支持群聊）。
- 不支持媒体附件。
- 仅支持 NIP-04（计划支持 NIP-17 礼品包装）。

## 相关

- [通道概述](/zh/channels) — 所有支持的通道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [Groups](/zh/channels/groups) — 群组聊天行为和提及门控
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
