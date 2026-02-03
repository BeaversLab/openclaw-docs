---
summary: "Google Chat 应用支持状态、能力与配置"
read_when:
  - 开发 Google Chat 渠道功能
title: "Google Chat"
---

# Google Chat（Chat API）

状态：通过 Google Chat API webhook（仅 HTTP）支持私聊与 Space。

## 快速设置（新手）

1. 创建 Google Cloud 项目并启用 **Google Chat API**。
   - 前往：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 若未启用，先启用 API。
2. 创建**服务账号**：
   - 点击 **Create Credentials** > **Service Account**。
   - 名称随意（如 `openclaw-chat`）。
   - 权限留空（点击 **Continue**）。
   - 访问主体留空（点击 **Done**）。
3. 创建并下载 **JSON Key**：
   - 在服务账号列表中点击你刚创建的账号。
   - 进入 **Keys** 标签页。
   - 点击 **Add Key** > **Create new key**。
   - 选择 **JSON** 并点击 **Create**。
4. 将下载的 JSON 文件放到 gateway 主机（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中创建 Google Chat 应用：
   - 填写 **Application info**：
     - **App name**：（如 `OpenClaw`）
     - **Avatar URL**：（如 `https://openclaw.ai/logo.png`）
     - **Description**：（如 `Personal AI Assistant`）
   - 启用 **Interactive features**。
   - 在 **Functionality** 勾选 **Join spaces and group conversations**。
   - 在 **Connection settings** 选择 **HTTP endpoint URL**。
   - 在 **Triggers** 中选择 **Use a common HTTP endpoint URL for all triggers**，并设置为你的 gateway 公网 URL 加 `/googlechat`。
     - _提示：运行 `openclaw status` 可查看 gateway 公网 URL。_
   - 在 **Visibility** 勾选 **Make this Chat app available to specific people and groups in &lt;Your Domain&gt;**。
   - 在文本框输入你的邮箱（如 `user@example.com`）。
   - 点击底部 **Save**。
6. **启用应用状态**：
   - 保存后**刷新页面**。
   - 找到 **App status**（通常在保存后页面顶部或底部）。
   - 将状态改为 **Live - available to users**。
   - 再点击一次 **Save**。
7. 配置 OpenClaw 的服务账号路径 + webhook 受众：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或配置：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 设置 webhook 受众类型 + 值（与 Chat 应用配置匹配）。
9. 启动 gateway。Google Chat 会向你的 webhook 路径 POST。

## 添加到 Google Chat

当 gateway 在运行且你的邮箱已加入可见性列表后：

1. 打开 [Google Chat](https://chat.google.com/)。
2. 点击 **Direct Messages** 旁的 **+**（加号）。
3. 在搜索框输入你在控制台配置的 **App name**。
   - **注意**：该 bot 不会出现在 “Marketplace” 浏览列表中，因为它是私有应用。必须用名称搜索。
4. 从结果中选择你的 bot。
5. 点击 **Add** 或 **Chat** 开始 1:1 对话。
6. 发送 “Hello” 触发助手！

## 公网 URL（仅 webhook）

Google Chat webhook 需要公网 HTTPS 端点。为安全起见，**只暴露 `/googlechat` 路径**。OpenClaw 仪表盘和其他敏感端点应保持在私有网络内。

### 选项 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 提供私有仪表盘，Funnel 仅公开 webhook 路径。这样 `/` 保持私有，只暴露 `/googlechat`。

1. **检查 gateway 绑定地址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   记录 IP（如 `127.0.0.1`、`0.0.0.0` 或你的 Tailscale IP：`100.x.x.x`）。

2. **仅向 tailnet 暴露仪表盘（端口 8443）：**

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # 如果仅绑定到 Tailscale IP（如 100.106.161.80）：
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **仅公开 webhook 路径：**

   ```bash
   # 如果绑定到 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # 如果仅绑定到 Tailscale IP（如 100.106.161.80）：
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **为该节点授权 Funnel：**
   如果提示，访问输出中的授权 URL，在 tailnet policy 中为该节点启用 Funnel。

5. **验证配置：**
   ```bash
   tailscale serve status
   tailscale funnel status
   ```

你的公网 webhook URL：
`https://<node-name>.<tailnet>.ts.net/googlechat`

你的私有仪表盘（仅 tailnet）：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公网 URL（不带 `:8443`）。

> 注意：该配置会在重启后保留。若要移除，运行 `tailscale funnel reset` 与 `tailscale serve reset`。

### 选项 B：反向代理（Caddy）

如果你使用 Caddy 这类反向代理，请只代理特定路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

这样 `your-domain.com/` 会被忽略或返回 404，而 `your-domain.com/googlechat` 会安全转发到 OpenClaw。

### 选项 C：Cloudflare Tunnel

配置 Tunnel 的 ingress 规则，仅路由 webhook 路径：

- **Path**：`/googlechat` -> `http://localhost:18789/googlechat`
- **Default Rule**：HTTP 404（Not Found）

## 工作原理

1. Google Chat 向 gateway 发送 webhook POST。每个请求都带 `Authorization: Bearer <token>` header。
2. OpenClaw 使用配置的 `audienceType` + `audience` 校验 token：
   - `audienceType: "app-url"` → 受众为你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众为 Cloud 项目编号。
3. 按 space 路由消息：
   - DMs 使用会话 key `agent:<agentId>:googlechat:dm:<spaceId>`。
   - Spaces 使用会话 key `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 默认需要配对。未知发送者会收到配对码；使用以下命令批准：
   - `openclaw pairing approve googlechat <code>`
5. Group spaces 默认要求 @ 提及。若提及识别需要应用用户名，请设置 `botUser`。

## 目标

投递与 allowlist 使用以下标识：

- 私聊：`users/<userId>` 或 `users/<email>`（支持邮箱）。
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

说明：

- 服务账号凭据也可通过 `serviceAccount` 内联传入（JSON 字符串）。
- 未设置 `webhookPath` 时默认 `/googlechat`。
- 开启 `actions.reactions` 后，可通过 `reactions` 工具与 `channels action` 使用 reactions。
- `typingIndicator` 支持 `none`、`message`（默认）与 `reaction`（reaction 需要用户 OAuth）。
- 附件会通过 Chat API 下载并进入媒体管线（大小受 `mediaMaxMb` 限制）。

## 故障排查

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 出现：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

这说明 webhook 处理器未注册。常见原因：

1. **未配置渠道**：配置中缺少 `channels.googlechat`。可验证：

   ```bash
   openclaw config get channels.googlechat
   ```

   若返回 “Config path not found”，请补充配置（见 [配置要点](#配置要点)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   若显示 “disabled”，请在配置中添加 `plugins.entries.googlechat.enabled: true`。

3. **Gateway 未重启**：添加配置后重启：
   ```bash
   openclaw gateway restart
   ```

验证渠道运行：

```bash
openclaw channels status
# 应显示：Google Chat default: enabled, configured, ...
```

### 其他问题

- 用 `openclaw channels status --probe` 检查认证错误或缺失的 audience 配置。
- 若未收到消息，确认 Chat 应用的 webhook URL + 事件订阅。
- 若提及门控阻塞回复，设置 `botUser` 为应用用户资源名并检查 `requireMention`。
- 发送测试消息时运行 `openclaw logs --follow`，确认请求是否到达 gateway。

相关文档：

- [Gateway configuration](/zh/gateway/configuration)
- [Security](/zh/gateway/security)
- [Reactions](/zh/tools/reactions)
