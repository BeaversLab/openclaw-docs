---
title: "受信任的代理身份验证"
summary: "将网关身份验证委派给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# 受信任的代理身份验证

> ⚠️ **安全敏感功能。** 此模式将身份验证完全委派给您的反向代理。配置错误可能会使您的 Gateway(网关) 暴露于未经授权的访问。在启用之前，请仔细阅读此页面。

## 何时使用

在以下情况下使用 `trusted-proxy` 身份验证模式：

- 您在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw
- 您的代理处理所有身份验证并通过标头传递用户身份
- 您处于 Kubernetes 或容器环境中，且代理是通往 Gateway(网关) 的唯一路径
- 您遇到了 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 载荷中传递令牌

## 何时不使用

- 如果您的代理不对用户进行身份验证（仅作为 TLS 终结器或负载均衡器）
- 如果存在任何绕过代理通往 Gateway(网关) 的路径（防火墙漏洞、内部网络访问）
- 如果您不确定您的代理是否正确剥离/覆盖转发的标头
- 如果您只需要个人单用户访问（考虑使用 Tailscale Serve + 环回以进行更简单的设置）

## 工作原理

1. 您的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）
2. 代理添加一个包含已验证用户身份的标头（例如 `x-forwarded-user: nick@example.com`）
3. OpenClaw 检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）
4. OpenClaw 从配置的标头中提取用户身份
5. 如果一切检查通过，则请求获得授权

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态且请求通过
受信任代理检查时，控制 UI WebSocket 会话无需设备
配对身份即可连接。

影响：

- 在此模式下，配对不再是控制 UI 访问的主要关卡。
- 您的反向代理身份验证策略和 `allowUsers` 成为有效的访问控制。
- 保持网关入口仅限于受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

## 配置

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source
    bind: "lan",

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

重要的运行时规则：

- 受信任代理认证会拒绝回环源请求（`127.0.0.1`、`::1`、回环 CIDRs）。
- 同主机回环反向代理**不**满足受信任代理认证的要求。
- 对于同主机回环代理设置，请改用令牌/密码认证，或通过 OpenClaw 可以验证的非回环受信任代理地址进行路由。
- 非回环控制 UI 部署仍然需要显式的 `gateway.controlUi.allowedOrigins`。

### 配置参考

| 字段                                        | 必需 | 描述                                                   |
| ------------------------------------------- | ---- | ------------------------------------------------------ |
| `gateway.trustedProxies`                    | 是   | 受信任的代理 IP 地址数组。来自其他 IP 的请求将被拒绝。 |
| `gateway.auth.mode`                         | 是   | 必须是 `"trusted-proxy"`                               |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已认证用户身份的标头名称                           |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 请求受信任必须存在的其他标头                           |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 用户身份允许列表。为空表示允许所有已认证用户。         |

## TLS 终止和 HSTS

使用一个 TLS 终止点并在那里应用 HSTS。

### 推荐模式：代理 TLS 终止

当您的反向代理为 `https://control.example.com` 处理 HTTPS 时，
在该代理上为该域设置 `Strict-Transport-Security`。

- 非常适合面向互联网的部署。
- 将证书 + HTTP 加固策略保留在一处。
- OpenClaw 可以保留在代理后面的回环 HTTP 上。

示例标头值：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway(网关) TLS 终止

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

`strictTransportSecurity` 接受字符串标头值，或使用 `false` 显式禁用。

### 上线指导

- 验证流量时，首先使用较短的 max age（例如 `max-age=300`）。
- 只有在信心很高时，才增加到长期值（例如 `max-age=31536000`）。
- 仅当每个子域都准备好 HTTPS 时，才添加 `includeSubDomains`。
- 仅当您有意识地满足完整域集的预加载要求时，才使用预加载。
- 仅限回环的本地开发不会从 HSTS 中受益。

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
    trustedProxies: ["10.0.0.1"], // Caddy/sidecar proxy IP
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

### Traefik 与 Forward Auth

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

## 混合令牌配置

OpenClaw 会拒绝混合配置，即同时启用了 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式。混合令牌配置可能导致回环请求在错误的身份验证路径上静默通过验证。

如果在启动时看到 `mixed_trusted_proxy_token` 错误：

- 使用 trusted-proxy 模式时移除共享令牌，或
- 如果您打算使用基于令牌的身份验证，请将 `gateway.auth.mode` 切换为 `"token"`。

回环 trusted-proxy 身份验证也会失败关闭：同主机调用者必须通过受信任的代理提供配置的身份头，而不是被静默身份验证。

## Operator 范围头

Trusted-proxy 身份验证是一种**承载身份**的 HTTP 模式，因此调用者可以选择使用 `x-openclaw-scopes` 声明 operator 范围。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当该头存在时，OpenClaw 将遵守声明的范围集。
- 当该头存在但为空时，请求声明**没有** operator 范围。
- 当该头不存在时，正常的承载身份 HTTP API 会回退到标准的 operator 默认范围集。
- Gateway(网关)-auth **插件 HTTP 路由** 默认范围更窄：当 `x-openclaw-scopes` 不存在时，其运行时范围会回退到 `operator.write`。
- 浏览器发起的 HTTP 请求即使在 trusted-proxy 身份验证成功后，仍必须通过 `gateway.controlUi.allowedOrigins`（或故意设置的 Host 头回退模式）。

实用规则：

- 当您希望受信任代理请求的范围比默认值更窄，或者当 gateway-auth 插件路由需要的权限比写入范围更强时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

在启用受信任代理身份验证之前，请验证：

- [ ] **代理是唯一路径**：Gateway(网关) 端口已设置防火墙，仅允许您的代理访问
- [ ] **trustedProxies 是最小化的**：仅包含您的实际代理 IP，而不是整个子网
- [ ] **无环回代理源**：对于环回源请求，受信任代理身份验证将以失败关闭（fail closed）
- [ ] **代理剥离标头**：您的代理覆盖（而不是追加）来自客户端的 `x-forwarded-*` 标头
- [ ] **TLS 终止**：您的代理处理 TLS；用户通过 HTTPS 连接
- [ ] **allowedOrigins 是显式的**：非环回控制 UI 使用显式的 `gateway.controlUi.allowedOrigins`
- [ ] **已设置 allowUsers**（推荐）：限制为已知用户，而不是允许任何通过身份验证的用户
- [ ] **无混合令牌配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`

## 安全审计

`openclaw security audit` 会将受信任代理身份验证标记为**严重（critical）**级别的发现。这是有意为之——这是在提醒您将安全性委托给了您的代理设置。

审计将检查：

- 基础 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- 空的 `allowUsers`（允许任何通过身份验证的用户）
- 在暴露的控制 UI 表面上存在通配符或缺失的浏览器源策略

## 故障排除

### "trusted_proxy_untrusted_source"

请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

- 代理 IP 是否正确？（Docker 容器 IP 可能会发生变化）
- 您的代理前面是否有负载均衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP

### "trusted_proxy_loopback_source"

OpenClaw 拒绝了环回源的受信任代理请求。

检查：

- 代理是否正从 `127.0.0.1` / `::1` 连接？
- 您是否尝试将受信任代理身份验证与同主机环回反向代理一起使用？

修复：

- 对于同一主机回环代理设置，请使用令牌/密码认证，或者
- 通过非回环受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中。

### "trusted_proxy_user_missing"

用户标头为空或缺失。请检查：

- 您的代理是否配置为传递身份标头？
- 标头名称是否正确？（不区分大小写，但拼写必须正确）
- 用户是否确实在代理端通过了身份验证？

### "trusted*proxy_missing_header*\*"

缺少必需的标头。请检查：

- 您的代理关于这些特定标头的配置
- 标头是否在链中的某处被剥离

### "trusted_proxy_user_not_allowed"

用户已通过身份验证，但不在 `allowUsers` 中。请将其添加或移除允许列表。

### "trusted_proxy_origin_not_allowed"

受信任代理身份验证成功，但浏览器 `Origin` 标头未通过控制 UI 源检查。

检查：

- `gateway.controlUi.allowedOrigins` 包含确切的浏览器源
- 除非您有意想要允许所有行为，否则不要依赖通配符源
- 如果您有意使用 Host 标头回退模式，则 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 是有意设置的

### WebSocket 仍然失败

请确保您的代理：

- 支持 WebSocket 升级（`Upgrade: websocket`，`Connection: upgrade`）
- 在 WebSocket 升级请求上传递身份标头（不仅仅是 HTTP）
- 没有针对 WebSocket 连接的单独身份验证路径

## 从令牌认证迁移

如果您正在从令牌认证迁移到受信任代理认证：

1. 配置您的代理以验证用户并传递标头
2. 独立测试代理设置（使用带标头的 curl）
3. 使用受信任代理认证更新 OpenClaw 配置
4. 重启 Gateway(网关)
5. 从控制 UI 测试 WebSocket 连接
6. 运行 `openclaw security audit` 并检查发现结果

## 相关

- [安全性](/en/gateway/security) — 完整安全指南
- [配置](/en/gateway/configuration) — 配置参考
- [远程访问](/en/gateway/remote) — 其他远程访问模式
- [Tailscale](/en/gateway/tailscale) — 仅适用于 tailnet 访问的更简单替代方案
