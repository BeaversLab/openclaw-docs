---
summary: "OpenClawGateway(网关)使用 Podman 和 Caddy 在 EasyRunner 上运行 OpenClaw Gateway"
read_when:
  - Deploying OpenClaw on EasyRunner
  - Running the Gateway behind EasyRunner's Caddy proxy
  - Choosing persistent volumes and auth for a hosted Gateway
title: "EasyRunner"
---

EasyRunner 可以在其 Caddy 代理后面托管 OpenClaw Gateway 作为一个小型容器化应用。本指南假设一个运行兼容 Podman 的 Compose 应用并通过 Caddy 暴露 HTTPS 的 EasyRunner 主机。

## 在开始之前

- 一个配置了域名路由的 EasyRunner 服务器。
- 一个已构建或发布的 OpenClaw 容器镜像。
- 用于 `/home/node/.openclaw` 的持久化配置卷。
- 用于 `/workspace` 的持久化工作空间卷。
- 一个强 Gateway 令牌或密码。

尽可能保持设备身份验证开启。如果您的反向代理部署无法正确传递设备身份，请首先修复 trusted-proxy 设置；仅在对操作员控制的完全私有网络中使用危险的身份验证绕过方式。

## Compose 应用

创建一个具有如下结构的 Compose 文件的 EasyRunner 应用：

```yaml
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    environment:
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      OPENCLAW_HOME: /home/node
      OPENCLAW_STATE_DIR: /home/node/.openclaw
      OPENCLAW_CONFIG_PATH: /home/node/.openclaw/openclaw.json
      OPENCLAW_WORKSPACE_DIR: /workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

将 `openclaw.example.com`Gateway(网关) 替换为您的 Gateway 主机名。将
`OPENCLAW_GATEWAY_TOKEN` 存储在 EasyRunner 的 secret/environment 管理器中，而不是
将其提交到应用定义中。

## 配置 OpenClaw

在持久化配置卷内部，确保 Gateway 仅通过代理访问并要求身份验证：

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

如果 Caddy 为 Gateway 终止 TLS，请为确切的代理路径配置受信任代理设置，而不是全局禁用身份验证检查。请参阅
[Trusted proxy auth](<Gateway(网关)/en/gateway/trusted-proxy-auth>)。

## 验证

从您的工作站：

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

从 EasyRunner 主机，检查应用日志以查看 Gateway 是否正在监听，且不存在启动时的 SecretRef、插件或渠道身份验证失败。

## 更新和备份

- 拉取或构建新的 OpenClaw 镜像，然后重新部署 EasyRunner 应用。
- 更新前备份 `openclaw-config` 卷。
- 如果代理在其中写入持久的项目数据，请备份 `openclaw-workspace`。
- 主要更新后运行 `openclaw doctor` 以捕获配置迁移和
  服务警告。

## 故障排除

- `gateway probe` 无法连接：请确认 Caddy 主机名指向该应用程序，并且容器正在监听 `0.0.0.0:1455`。
- 认证失败：请在 EasyRunner 密钥和本地客户端命令中同时轮换令牌。
- 恢复后文件为 root 所有：修复挂载的卷，以便容器用户可以写入 `/home/node/.openclaw` 和 `/workspace`。
- 浏览器或渠道插件失败：检查容器内是否有所需的外部二进制文件、网络出口和挂载凭据。
