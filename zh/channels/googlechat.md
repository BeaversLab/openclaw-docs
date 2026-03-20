---
summary: "Google Chat app 支持状态、功能和配置"
read_when:
  - 正在处理 Google Chat 渠道功能
title: "Google Chat"
---

# Google Chat (Chat API)

状态：已支持通过 Google Chat API webhook（仅限 HTTP）进行私信和群组对话。

## 快速设置（入门）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - 前往：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未启用 API，请启用它。
2. 创建一个 **Service Account**：
   - 点击 **Create Credentials** > **Service Account**。
   - 随意命名（例如 `openclaw-chat`）。
   - 将权限留空（点击 **Continue**）。
   - 将有访问权限的主体留空（点击 **Done**）。
3. 创建并下载 **JSON Key**：
   - 在服务帐号列表中，点击您刚刚创建的那个。
   - 转到 **Keys** 标签页。
   - 点击 **Add Key** > **Create new key**。
   - 选择 **JSON** 并点击 **Create**。
4. 将下载的 JSON 文件存储在您的网关主机上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建一个 Google Chat 应用：
   - 填写 **Application info**：
     - **App name**：（例如 `OpenClaw`）
     - **Avatar URL**：（例如 `https://openclaw.ai/logo.png`）
     - **Description**：（例如 `Personal AI Assistant`）
   - 启用 **Interactive features**。
   - 在 **Functionality** 下，勾选 **Join spaces and group conversations**。
   - 在 **Connection settings** 下，选择 **HTTP endpoint URL**。
   - 在 **Triggers** 下，选择 **Use a common HTTP endpoint URL for all triggers** 并将其设置为您的网关公用 URL 后加上 `/googlechat`。
     - _提示：运行 `openclaw status` 查找您的网关公用 URL._
   - 在 **Visibility** 下，勾选 **Make this Chat app available to specific people and groups in &lt;Your Domain&gt;**。
   - 在文本框中输入您的电子邮件地址（例如 `user@example.com`）。
   - 点击底部的 **Save**。
6. **启用应用状态**：
   - 保存后，**刷新页面**。
   - 查找 **App status** 部分（通常在保存后位于顶部或底部附近）。
   - 将状态更改为 **Live - available to users**。
   - 再次点击 **Save**。
7. 使用服务帐号路径 + webhook 受众配置 OpenClaw：
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - Or config: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`.
8. 设置 webhook 受众类型和值（需与您的 Chat 应用配置匹配）。
9. 启动网关。Google Chat 将向您的 webhook 路径发送 POST 请求。

## 添加到 Google Chat

网关运行且您的电子邮件已添加到可见性列表后：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 点击 **Direct Messages** 旁边的 **+**（加号）图标。
3. 在搜索栏（通常用于添加人员的地方）中，输入您在 Google Cloud Console 中配置的 **App name**。
   - **注意**：机器人不会出现在“Marketplace”浏览列表中，因为它是私人应用。您必须按名称搜索。
4. 从结果中选择您的机器人。
5. 点击 **Add** 或 **Chat** 以开始 1:1 对话。
6. 发送“Hello”以触发助手！

## 公开 URL（仅限 Webhook）

Google Chat webhook 需要一个公用 HTTPS 端点。为了安全起见，**仅向互联网公开 `/googlechat` 路径**。请将 OpenClaw 仪表板和其他敏感端点保留在您的私有网络上。

### 选项 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 作为私有仪表板，使用 Funnel 作为公用 webhook 路径。这使 `/` 保持私密，同时仅公开 `/googlechat`。

1. **检查您的网关绑定到的地址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   记下 IP 地址（例如 `127.0.0.1`、`0.0.0.0` 或您的 Tailscale IP，如 `100.x.x.x`）。

2. **仅向 tailnet 公开仪表板（端口 8443）：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **仅公开 webhook 路径：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **授权节点进行 Funnel 访问：**
   如果出现提示，请访问输出中显示的授权 URL，以便在您的 tailnet 策略中为此节点启用 Funnel。

5. **验证配置：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公用 webhook URL 将为：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私有仪表板保持仅限 tailnet 访问：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公用 URL（不含 `:8443`）。

> 注意：此配置在重启后仍然有效。如需稍后将其删除，请运行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 选项 B：反向代理 (Caddy)

如果您使用像 Caddy 这样的反向代理，请仅代理特定路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此配置，对 `your-domain.com/` 的任何请求都将被忽略或返回 404，而 `your-domain.com/googlechat` 则会安全地路由到 OpenClaw。

### 选项 C：Cloudflare Tunnel

配置您的隧道入口规则以仅路由 webhook 路径：

- **路径**：`/googlechat` -> `http://localhost:18789/googlechat`
- **默认规则**：HTTP 404 (未找到)

## 工作原理

1. Google Chat 会将 webhook POST 请求发送到网关。每个请求都包含一个 `Authorization: Bearer <token>` 标头。
   - 当存在该请求头时，OpenClaw 会在读取/解析完整的 webhook 主体之前验证 bearer 身份验证。
   - 通过更严格的预认证正文预算支持正文中携带 `authorizationEventObject.systemIdToken` 的 Google Workspace 插件请求。
2. OpenClaw 会根据配置的 `audienceType` + `audience` 验证令牌：
   - `audienceType: "app-url"` → 受众是您的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众是 Cloud 项目编号。
3. 消息按空间路由：
   - 私信使用会话密钥 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - 群组空间使用会话密钥 `agent:<agentId>:googlechat:group:<spaceId>`。
4. 私信访问默认为配对模式。未知发送者会收到配对码；通过以下方式批准：
   - `openclaw pairing approve googlechat <code>`
5. 群组空间默认需要 @ 提及。如果提及检测需要应用的用户名，请使用 `botUser`。

## 目标对象

使用这些标识符进行投递和允许列表匹配：

- 私信：`users/<userId>`（推荐）。
- 原始电子邮件 `name@example.com` 是可变的，仅当 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于直接允许列表匹配。
- 已弃用：`users/<email>` 被视为用户 ID，而不是电子邮件允许列表。
- 群组空间：`spaces/<spaceId>`。

## 配置要点

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // or serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only.",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

说明：

- 服务帐号凭据也可以通过 `serviceAccount`（JSON 字符串）内联传递。
- 也支持 `serviceAccountRef`（环境变量/文件 SecretRef），包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的每个帐户引用。
- 如果未设置 `webhookPath`，则默认 webhook 路径为 `/googlechat`。
- `dangerouslyAllowNameMatching` 重新启用允许列表的可变电子邮件主体匹配（紧急兼容模式）。
- 当启用 `actions.reactions` 时，可以通过 `reactions` 工具和 `channels action` 使用反应。
- `typingIndicator` 支持 `none`、`message`（默认）和 `reaction`（反应需要用户 OAuth）。
- 附件通过 Chat API 下载并存储在媒体管道中（大小受 `mediaMaxMb` 限制）。

密钥参考详情：[密钥管理](/zh/gateway/secrets)。

## 故障排除

### 405 Method Not Allowed

如果 Google Cloud 日志资源管理器显示如下错误：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

这意味着 Webhook 处理程序未注册。常见原因：

1. **未配置频道**：您的配置中缺少 `channels.googlechat` 部分。请验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回“未找到配置路径”，请添加配置（参见 [配置亮点](#config-highlights)）。

2. **未启用插件**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果显示“已禁用”，请将 `plugins.entries.googlechat.enabled: true` 添加到您的配置中。

3. **Gateway(网关) 未重启**：添加配置后，请重启网关：

   ```bash
   openclaw gateway restart
   ```

验证渠道是否正在运行：

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他问题

- 检查 `openclaw channels status --probe` 是否存在身份验证错误或缺少受众配置。
- 如果没有收到消息，请确认 Chat 应用的 Webhook URL 和事件订阅。
- 如果提及拦截阻止了回复，请将 `botUser` 设置为应用的用户资源名称，并验证 `requireMention`。
- 在发送测试消息时使用 `openclaw logs --follow`，以查看请求是否到达网关。

相关文档：

- [Gateway(网关) 配置](/zh/gateway/configuration)
- [安全](/zh/gateway/security)
- [反应](/zh/tools/reactions)

import zh from "/components/footer/zh.mdx";

<zh />
