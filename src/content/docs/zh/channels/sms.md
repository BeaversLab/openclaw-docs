---
summary: "Twilio SMS 渠道设置、访问控制和 webhook 配置"
read_when:
  - You want to connect OpenClaw to SMS through Twilio
  - You need SMS webhook or allowlist setup
title: "SMS"
---

OpenClaw 可以通过 Twilio 电话号码或消息服务接收和发送 SMS。Gateway(网关) 默认会注册一个入站 webhook 路由，验证 Twilio 请求签名，并通过 Twilio 的 Messages API 发回回复。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    SMS 的默认私信策略是配对。
  </Card>
  <Card title="Gateway(网关) 安全" icon="shield" href="/zh/gateway/security">
    查看 webhook 暴露情况和发送方访问控制。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 在开始之前

您需要：

- 一个拥有支持 SMS 的电话号码的 Twilio 账户，或者一个 Twilio 消息服务。
- Twilio 账户 SID 和 Auth Token。
- 一个可访问您的 OpenClaw Gateway(网关) 的公网 HTTPS URL。
- 选择发送方策略：`pairing` 用于私人用途，`allowlist` 用于预先批准的电话号码，或者仅当有意公开 SMS 访问时使用 `open`。

如果号码同时具备这两种功能，请使用同一个 Twilio 号码处理 SMS 和语音呼叫。请在 Twilio 中分别配置 SMS webhook 和语音 webhook；本页面仅涵盖 SMS webhook。

## 快速设置

<Steps>
  <Step title="Create or choose a Twilio sender">
    在 Twilio 中，打开 **Phone Numbers > Manage > Active numbers** 并选择一个支持 SMS 的号码。保存：

    - Account SID，例如 `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    - Auth Token
    - Sender phone number，例如 `+15551234567`

    如果您使用 Messaging Service 而不是固定的发送方号码，请保存 Messaging Service SID，例如 `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`。

  </Step>

  <Step title="Configure the SMS 渠道">

将此保存为 `sms.patch.json5` 并更改占位符：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

应用它：

```bash
openclaw config patch --file ./sms.patch.json5 --dry-run
openclaw config patch --file ./sms.patch.json5
```

  </Step>

  <Step title="Point Twilio at the Gateway(网关) webhook">
    在 Twilio 电话号码设置中，打开 **Messaging** 并将 **A message comes in** 设置为：

```text
https://gateway.example.com/webhooks/sms
```

    使用 HTTP `POST`。默认的本地路径是 `/webhooks/sms`；如果您需要不同的路由，请更改 `channels.sms.webhookPath`。

  </Step>

  <Step title="Expose the exact SMS webhook path">
    您的公共 URL 必须将 SMS 路由到 Gateway(网关) 进程。如果您使用 Tailscale Funnel 进行本地测试，请显式暴露 `/webhooks/sms`：

```bash
tailscale funnel --bg --set-path /webhooks/sms http://127.0.0.1:<gateway-port>/webhooks/sms
tailscale funnel status
```

    语音通话和 SMS 使用单独的 webhook 路径。如果同一个 Twilio 号码处理这两者，请确保在 Twilio 和您的隧道中都配置了这两个路由。

  </Step>

  <Step title="Start the Gateway(网关) and approve first sender">

```bash
openclaw gateway
```

向 Twilio 号码发送一条短信。第一条消息将创建一个配对请求。批准它：

```bash
openclaw pairing list sms
openclaw pairing approve sms <CODE>
```

    配对代码会在 1 小时后过期。

  </Step>
</Steps>

## 配置示例

### 配置文件

当您希望渠道定义随 Gateway(网关) 配置一起移动时，请使用配置文件设置：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

### 环境变量

对于密钥来自主机环境的单账户部署，请使用环境变量设置：

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="<twilio-auth-token>"
export TWILIO_PHONE_NUMBER="+15551234567"
export SMS_PUBLIC_WEBHOOK_URL="https://gateway.example.com/webhooks/sms"
```

然后在配置中启用该渠道：

```json5
{
  channels: {
    sms: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

`TWILIO_SMS_FROM` 被接受为 `TWILIO_PHONE_NUMBER` 的别名。当 Twilio 应该从消息服务中选择发送者时，请使用 `TWILIO_MESSAGING_SERVICE_SID` 而不是电话号码发送者。

### SecretRef 认证令牌

`authToken`Gateway(网关)OpenClaw 可以是一个 SecretRef。当 Gateway(网关) 应该从 OpenClaw secrets 运行时解析 Twilio 认证令牌而不是存储明文配置时，请使用此选项：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: { source: "env", provider: "default", id: "TWILIO_AUTH_TOKEN" },
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

引用的环境变量或秘密提供商必须对 Gateway(网关) 运行时可见。更改主机环境变量后，请重启受管理的 Gateway(网关) 进程。

### 仅允许列表的私人号码

当只有已知电话号码应该能够与代理对话时，请使用 `allowlist`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "allowlist",
      allowFrom: ["+15557654321"],
    },
  },
}
```

### 消息服务发送者

当 Twilio 应该通过消息服务选择发送者时，请使用 `messagingServiceSid` 代替 `fromNumber`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
      dmPolicy: "pairing",
    },
  },
}
```

如果在配置和环境变量解析后 `fromNumber` 和 `messagingServiceSid` 同时存在，则使用 `fromNumber`。

### 默认出站目标

当自动化或代理发起的传递在发送流程省略显式目标时应该具有默认目标时，请设置 `defaultTo`：

```json5
{
  channels: {
    sms: {
      enabled: true,
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "twilio-auth-token",
      fromNumber: "+15551234567",
      defaultTo: "+15557654321",
      publicWebhookUrl: "https://gateway.example.com/webhooks/sms",
    },
  },
}
```

## 访问控制

`channels.sms.dmPolicy` 控制直接 SMS 访问：

- `pairing`（默认）
- `allowlist`（要求 `allowFrom` 中至少有一个发送者）
- `open`（要求 `allowFrom` 包含 `"*"`）
- `disabled`

`allowFrom` 条目应该是 E.164 电话号码，例如 `+15551234567`。接受并规范化 `sms:` 前缀。对于私人助手，首选带有显式电话号码的 `dmPolicy: "allowlist"`。

## 发送 SMS

出站 SMS 目标使用 `sms:` 服务前缀，并选择了 SMS 渠道：

```bash
openclaw message send --channel sms --target sms:+15551234567 --message "hello"
```

当渠道选择为隐式时，`twilio-sms:+15551234567` 会选择此渠道，而不会接管 iMessage 使用的现有渠道拥有的 `sms:`iMessage 服务前缀。

```bash
openclaw message send --target twilio-sms:+15551234567 --message "hello"
```

CLI 需要一个显式的 `--target`。`defaultTo` 适用于自动化和代理发起的传递路径，其中目标可以从渠道配置中解析。

来自入站 SMS 对话的代理回复会自动通过配置的 Twilio 发送者返回给发送者。

SMS 输出为纯文本。OpenClaw 会去除 markdown，展平围栏代码块，保留可读链接，并在通过 Twilio 发送之前对长回复进行分块。

## 验证设置

Gateway(网关) 启动后：

1. 确认 Gateway(网关) 日志显示 SMS webhook 路由。
2. 运行 Twilio 端探测：

```bash
openclaw channels capabilities --channel sms
openclaw channels status --channel sms --probe --json
```

3. 从您的手机向 Twilio 号码发送一条 SMS。
4. 运行 `openclaw pairing list sms`。
5. 使用 `openclaw pairing approve sms <CODE>` 批准配对代码。
6. 发送另一条 SMS 并确认代理回复。

对于仅出站测试，请使用：

```bash
openclaw message send --channel sms --target sms:+15557654321 --message "OpenClaw SMS test"
```

### 从 macOS iMessage/SMS 进行端到端测试

在可以通过“信息”发送运营商 SMS 的 Mac 上，您可以使用 `imsg` 来驱动发送方，而无需触碰您的手机：

```bash
imsg send --to "+15551234567" --service sms --text "OpenClaw SMS E2E $(date -u +%Y%m%dT%H%M%SZ)" --json
openclaw pairing list sms
openclaw pairing approve sms <CODE>
imsg send --to "+15551234567" --service sms --text "reply exactly SMS pong" --json
```

第一条消息应该创建一个配对请求。第二条消息应该通过 Twilio 接收代理回复。

## Webhook 安全

默认情况下，OpenClaw 使用 `publicWebhookUrl` 和 `authToken` 验证 OpenClaw`X-Twilio-Signature`。请保持 `publicWebhookUrl` 与 Twilio 中配置的 URL 逐字节对齐，包括 scheme、host、path 和查询字符串。

仅对于本地隧道测试，您可以设置：

```json5
{
  channels: {
    sms: {
      dangerouslyDisableSignatureValidation: true,
    },
  },
}
```

不要在公共 Gateway(网关) 上使用禁用的签名验证。

## 多账户配置

当您操作多个 Twilio 号码时，请使用 `accounts`：

```json5
{
  channels: {
    sms: {
      accounts: {
        support: {
          enabled: true,
          accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          authToken: "twilio-auth-token",
          fromNumber: "+15551234567",
          publicWebhookUrl: "https://gateway.example.com/webhooks/sms/support",
          webhookPath: "/webhooks/sms/support",
          dmPolicy: "allowlist",
          allowFrom: ["+15557654321"],
        },
      },
    },
  },
}
```

每个账户应使用不同的 `webhookPath`。

## 故障排除

### Twilio 返回 403 或 OpenClaw 拒绝 webhook

检查 `publicWebhookUrl` 是否与 Twilio 中配置的 URL 完全匹配，包括协议、主机、路径和查询字符串。Twilio 会对公共 URL 字符串进行签名，因此代理重写和替代主机名可能会破坏签名验证。

### 未显示配对请求

检查 Twilio 号码的 **Messaging**（消息）webhook URL 和方法。它必须指向 SMS webhook URL 并使用 `POST`Gateway(网关)。此外，请确认 Gateway(网关) 可从公共互联网访问或可通过您的隧道访问。

如果 Twilio 消息日志显示错误 `11200`，表示 Twilio 已接收入站 SMS 但无法访问您的 webhook。请检查：

- Twilio **Messaging > A message comes in**（消息 > 消息传入）指向 `publicWebhookUrl`。
- 方法为 `POST`。
- 隧道或反向代理暴露了确切的 `webhookPath`Tailscale；对于 Tailscale Funnel，请运行 `tailscale funnel status` 并确认列出了 `/webhooks/sms`。
- `publicWebhookUrl` 使用与 Twilio 发送的相同的协议、主机、路径和查询字符串，以便签名验证可以重现签名的 URL。

### 出站发送失败

确认 `accountSid`、`authToken` 以及 `fromNumber` 或 `messagingServiceSid` 已解析。如果您使用 Twilio 试用帐户，则可能需要在 Twilio 中验证目标号码才能发送出站 SMS。

### 消息已到达，但代理未回复

检查 `dmPolicy` 和 `allowFrom`。使用默认的 `pairing` 策略，必须先批准发件人，然后才能处理正常的代理轮次。
