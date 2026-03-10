---
summary: "Google Chat 应用支持状态、功能和配置"
read_when:
  - "Working on Google Chat channel features"
title: "Google Chat"
---

# Google Chat (Chat API)

状态：通过 Google Chat API webhooks 支持 DM 和 spaces（仅 HTTP）。

## 快速设置（初学者）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - 转到：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未启用 API，请启用它。
2. 创建**服务帐户**：
   - 按**创建凭据** > **服务帐户**。
   - 随意命名（例如 `openclaw-chat`）。
   - 将权限留空（按**继续**）。
   - 将具有访问权限的主体留空（按**完成**）。
3. 创建并下载 **JSON 密钥**：
   - 在服务帐户列表中，单击您刚刚创建的服务帐户。
   - 转到**密钥**选项卡。
   - 单击**添加密钥** > **创建新密钥**。
   - 选择 **JSON** 并按**创建**。
4. 将下载的 JSON 文件存储在您的 gateway 主机上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建 Google Chat 应用：
   - 填写**应用程序信息**：
     - **应用名称**：（例如 `OpenClaw`）
     - **头像 URL**：（例如 `https://openclaw.ai/logo.png`）
     - **描述**：（例如 `Personal AI Assistant`）
   - 启用**交互式功能**。
   - 在**功能**下，选中**加入 spaces 和群组对话**。
   - 在**连接设置**下，选择 **HTTP 端点 URL**。
   - 在**触发器**下，选择**为所有触发器使用通用 HTTP 端点 URL** 并将其设置为 gateway 的公共 URL，后跟 `/googlechat`。
     - _提示：运行 `openclaw status` 查找您的 gateway 的公共 URL。_
   - 在**可见性**下，选中**使此 Chat 应用可用于 &lt;您的域&gt; 中的特定人员和群组**。
   - 在文本框中输入您的电子邮件地址（例如 `user@example.com`）。
   - 单击底部的**保存**。
6. **启用应用状态**：
   - 保存后，**刷新页面**。
   - 查找**应用状态**部分（通常在保存后靠近顶部或底部）。
   - 将状态更改为**在线 - 对用户可用**。
   - 再次单击**保存**。
7. 使用服务帐户路径 + webhook 受众配置 OpenClaw：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或配置：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 设置 webhook 受众类型 + 值（匹配您的 Chat 应用配置）。
9. 启动 gateway。Google Chat 将 POST 到您的 webhook 路径。

## 添加到 Google Chat

一旦 gateway 正在运行并且您的电子邮件已添加到可见性列表中：

1. 转到 [Google Chat](https://chat.google.com/)。
2. 单击**直接消息**旁边的 **+**（加号）图标。
3. 在搜索栏（通常添加人员的地方）中，输入您在 Google Cloud Console 中配置的**应用名称**。
   - **注意**：机器人不会出现在"Marketplace"浏览列表中，因为它是一个私有应用。您必须按名称搜索它。
4. 从结果中选择您的机器人。
5. 单击**添加**或**聊天**开始 1:1 对话。
6. 发送"Hello"以触发助手！

## 公共 URL（仅 Webhook）

Google Chat webhooks 需要公共 HTTPS 端点。为了安全起见，**仅将 `/googlechat` 路径暴露到互联网**。将 OpenClaw 仪表板和其他敏感端点保留在您的私有网络上。

### 选项 A：Tailscale Funnel（推荐）

将 Tailscale Serve 用于私有仪表板，将 Funnel 用于公共 webhook 路径。这保持 `/` 私有，同时仅暴露 `/googlechat`。

1. **检查您的 gateway 绑定到的地址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   Note the IP address (e.g., `127.0.0.1`, `0.0.0.0`, or your Tailscale IP like `100.x.x.x`）。

2. **仅将仪表板暴露到 tailnet（端口 8443）：**

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
   如果提示，请访问输出中显示的授权 URL，以在您的 tailnet 策略中为此节点启用 Funnel。

5. **验证配置：**
   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公共 webhook URL 将是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私有仪表板保持 tailnet-only：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公共 URL（不带 `:8443`）。

> 注意：此配置在重新启动后仍然存在。要稍后删除它，请运行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 选项 B：反向代理（Caddy）

如果您使用 Caddy 等反向代理，请仅代理特定路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此配置，对 `your-domain.com/` 的任何请求都将被忽略或返回 404，而 `your-domain.com/googlechat` 则被安全路由到 OpenClaw。

### 选项 C：Cloudflare Tunnel

配置您的隧道的入口规则以仅路由 webhook 路径：

- **路径**：`/googlechat` -> `http://localhost:18789/googlechat`
- **默认规则**：HTTP 404（未找到）

## 工作原理

1. Google Chat 向 gateway 发送 webhook POST 请求。每个请求包含一个 `Authorization: Bearer <token>` 标头。
2. OpenClaw 根据配置的 `audienceType` + `audience` 验证令牌：
   - `audienceType: "app-url"` → 受众是您的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众是 Cloud 项目编号。
3. 消息按空间路由：
   - DM 使用会话密钥 `agent:<agentId>:googlechat:dm:<spaceId>`。
   - Spaces 使用会话密钥 `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 访问默认为配对。未知发送者收到配对代码；使用以下命令批准：
   - `openclaw pairing approve googlechat <code>`
5. 群组 spaces 默认需要 @-提及。如果提及检测需要应用程序的用户名，请使用 `botUser`。

## 目标

使用这些标识符进行传递和允许列表：

- 直接消息：`users/<userId>` 或 `users/<email>`（接受电子邮件地址）。
- Spaces：`spaces/<spaceId>`。

## 配置要点

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890", "name@example.com"],
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

注意：

- 服务帐户凭据也可以通过 `serviceAccount` 内联传递（JSON 字符串）。
- 如果未设置 `webhookPath`，默认 webhook 路径为 `/googlechat`。
- 当启用 `actions.reactions` 时，反应可通过 `reactions` 工具和 `channels action` 使用。
- `typingIndicator` 支持 `none`、`message`（默认）和 `reaction`（反应需要用户 OAuth）。
- 附件通过 Chat API 下载并存储在媒体管道中（大小由 `mediaMaxMb` 限制）。

## 故障排除

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 显示如下错误：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

这意味着 webhook 处理程序未注册。常见原因：

1. **频道未配置**：您的配置中缺少 `channels.googlechat` 部分。使用以下命令验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回"Config path not found"，请添加配置（参见 [Config highlights](#config-highlights)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   If it shows "disabled", add `plugins.entries.googlechat.enabled: true` 到您的配置。

3. **Gateway 未重新启动**：添加配置后，重新启动 gateway：
   ```bash
   openclaw gateway restart
   ```

验证频道正在运行：

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他问题

- 检查 `openclaw channels status --probe` 查看认证错误或缺少受众配置。
- 如果没有收到消息，请确认 Chat 应用的 webhook URL + 事件订阅。
- 如果提及阻止阻止回复，请将 `botUser` 设置为应用的用户资源名称并验证 `requireMention`。
- 发送测试消息时使用 `openclaw logs --follow` 查看请求是否到达 gateway。

相关文档：

- [Gateway configuration](/zh/gateway/configuration)
- [Security](/zh/gateway/security)
- [Reactions](/zh/tools/reactions)
