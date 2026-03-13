---
summary: “将网关身份验证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）”
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# 受信任的代理身份验证

> ⚠️ **安全敏感功能。** 此模式将身份验证完全委托给您的反向代理。配置错误可能会使您的网关暴露于未经授权的访问。在启用之前，请仔细阅读此页面。

## 何时使用

在以下情况下使用 `trusted-proxy` 身份验证模式：

- 您在 **感知身份的代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw
- 您的代理处理所有身份验证并通过标头传递用户身份
- 您处于 Kubernetes 或容器环境中，且代理是访问网关的唯一路径
- 您遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递令牌

## 何时不使用

- 如果您的代理不对用户进行身份验证（仅作为 TLS 终结器或负载均衡器）
- 如果存在任何绕过代理访问网关的路径（防火墙漏洞、内部网络访问）
- 如果您不确定您的代理是否正确剥离/覆盖了转发的标头
- 如果您只需要个人单用户访问（考虑使用 Tailscale Serve + loopback 以获得更简单的设置）

## 工作原理

1. 您的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）
2. 代理添加一个包含经过身份验证的用户身份的标头（例如 `x-forwarded-user: nick@example.com`）
3. OpenClaw 检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）
4. OpenClaw 从配置的标头中提取用户身份
5. 如果一切检查通过，该请求即获得授权

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态且请求通过了受信任代理检查时，控制 UI WebSocket 会话无需设备配对身份即可连接。

影响：

- 在此模式下，配对不再是控制 UI 访问的主要关卡。
- 您的反向代理身份验证策略和 `allowUsers` 成为有效的访问控制。
- 将网关入口仅锁定为受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

## 配置

```json5
{
  gateway: {
    // Use loopback for same-host proxy setups; use lan/custom for remote proxy hosts
    bind: "loopback",

    // CRITICAL: Only add your proxy's IP(s) here
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // Header containing authenticated user identity (required)
        userHeader: "x-forwarded-user",

        // Optional: headers that MUST be present (proxy verification)
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // Optional: restrict to specific users (empty = allow all)
        allowUsers: ["nick@example.com", "admin@company.org"],
      },
    },
  },
}
```

如果 `gateway.bind` 为 `loopback`，请在 `gateway.trustedProxies` 中包含一个回环代理地址
（`127.0.0.1`、`::1` 或等效的回环 CIDR）。

### 配置参考

| 字段                                       | 必填   | 说明                                                                 |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `gateway.trustedProxies`                    | 是     | 受信任的代理 IP 地址列表。来自其他 IP 的请求将被拒绝。                     |
| `gateway.auth.mode`                         | 是     | 必须为 `"trusted-proxy"`                                                   |
| `gateway.auth.trustedProxy.userHeader`      | 是     | 包含已认证用户身份的 Header 名称                                          |
| `gateway.auth.trustedProxy.requiredHeaders` | 否     | 请求受信任时必须存在的其他 Header                                         |
| `gateway.auth.trustedProxy.allowUsers`      | 否     | 用户身份白名单。为空表示允许所有已认证的用户。                            |

## TLS 终止与 HSTS

仅使用一个 TLS 终止点并在该处应用 HSTS。

### 推荐模式：代理 TLS 终止

当您的反向代理为 `https://control.example.com` 处理 HTTPS 时，请
在该域名的代理处设置 `Strict-Transport-Security`。

- 适合面向互联网的部署。
- 将证书 + HTTP 加固策略集中在一处管理。
- OpenClaw 可以保持在代理后端的回环 HTTP 上运行。

Header 值示例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway TLS 终止

如果 OpenClaw 本身直接提供 HTTPS（无 TLS 终止代理），请设置：

```json5
{
  gateway: {
    tls: { enabled: true },
    http: {
      securityHeaders: {
        strictTransportSecurity: "max-age=31536000; includeSubDomains",
      },
    },
  },
}
```

`strictTransportSecurity` 接受字符串 header 值，或接受 `false` 以显式禁用。

### 上线指导

- 验证流量时，首先使用较短的 max age（例如 `max-age=300`）。
- 仅在确认无误后，再增加到长期值（例如 `max-age=31536000`）。
- 仅当每个子域都准备好 HTTPS 时，才添加 `includeSubDomains`。
- 仅当您有意为整个域名集满足预加载要求时，才使用预加载。
- 仅限本地回环的本地开发无法从 HSTS 中受益。

## 代理设置示例

### Pomerium

Pomerium 在 `x-pomerium-claim-email`（或其他声明头）中传递身份，并在 `x-pomerium-jwt-assertion` 中传递 JWT。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Pomerium's IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-pomerium-claim-email",
        requiredHeaders: ["x-pomerium-jwt-assertion"],
      },
    },
  },
}
```

Pomerium 配置片段：

```yaml
routes:
  - from: https://openclaw.example.com
    to: http://openclaw-gateway:18789
    policy:
      - allow:
          or:
            - email:
                is: nick@example.com
    pass_identity_headers: true
```

### 使用 OAuth 的 Caddy

带有 `caddy-security` 插件的 Caddy 可以对用户进行身份验证并传递身份头。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["127.0.0.1"], // Caddy's IP (if on same host)
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

Caddyfile 片段：

```
openclaw.example.com {
    authenticate with oauth2_provider
    authorize with policy1

    reverse_proxy openclaw:18789 {
        header_up X-Forwarded-User {http.auth.user.email}
    }
}
```

### nginx + oauth2-proxy

oauth2-proxy 对用户进行身份验证并在 `x-auth-request-email` 中传递身份。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-auth-request-email",
      },
    },
  },
}
```

nginx 配置片段：

```nginx
location / {
    auth_request /oauth2/auth;
    auth_request_set $user $upstream_http_x_auth_request_email;

    proxy_pass http://openclaw:18789;
    proxy_set_header X-Auth-Request-Email $user;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Traefik 配合 Forward Auth

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["172.17.0.1"], // Traefik container IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

## 安全检查清单

在启用 trusted-proxy 身份验证之前，请验证：

- [ ] **代理是唯一路径**：网关端口已设置防火墙，仅允许您的代理访问
- [ ] **trustedProxies 是最小的**：仅包含您的实际代理 IP，而不是整个子网
- [ ] **代理剥离头**：您的代理覆盖（而不是追加）来自客户端的 `x-forwarded-*` 头
- [ ] **TLS 终止**：您的代理处理 TLS；用户通过 HTTPS 连接
- [ ] **已设置 allowUsers**（推荐）：限制为已知用户，而不是允许任何通过身份验证的人

## 安全审计

`openclaw security audit` 将标记具有 **严重**（critical）严重性发现的 trusted-proxy 身份验证。这是有意为之——这是提醒您正在将安全委托给您的代理设置。

审计检查内容包括：

- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何经过身份验证的用户）

## 故障排除

### "trusted_proxy_untrusted_source"

请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

- 代理 IP 是否正确？（Docker 容器 IP 可能会变化）
- 代理前面是否有负载均衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP

### "trusted_proxy_user_missing"

用户头为空或缺失。请检查：

- 您的代理是否配置为传递身份头？
- 头名称是否正确？（不区分大小写，但拼写很重要）
- 用户是否确实在代理处通过了身份验证？

### "trusted*proxy_missing_header*\*"

缺少必需的请求头。请检查：

- 针对这些特定请求头的代理配置
- 请求头是否在链路中的某处被剥离

### "trusted_proxy_user_not_allowed"

用户已通过身份验证，但不在 `allowUsers` 中。请将其添加，或者移除允许列表。

### WebSocket 仍然失败

确保您的代理：

- 支持 WebSocket 升级（`Upgrade: websocket`，`Connection: upgrade`）
- 在 WebSocket 升级请求上传递身份请求头（不仅仅是 HTTP）
- 没有为 WebSocket 连接设置单独的身份验证路径

## 从令牌身份验证迁移

如果您正在从令牌身份验证迁移到受信任代理：

1. 配置您的代理以对用户进行身份验证并传递请求头
2. 独立测试代理设置（使用带请求头的 curl）
3. 使用受信任代理身份验证更新 OpenClaw 配置
4. 重启 Gateway
5. 从控制 UI 测试 WebSocket 连接
6. 运行 `openclaw security audit` 并检查结果

## 相关内容

- [安全](/zh/en/gateway/security) — 完整的安全指南
- [配置](/zh/en/gateway/configuration) — 配置参考
- [远程访问](/zh/en/gateway/remote) — 其他远程访问模式
- [Tailscale](/zh/en/gateway/tailscale) — 专用于 tailnet 访问的更简单的替代方案

import zh from '/components/footer/zh.mdx';

<zh />
