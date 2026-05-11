---
summary: "将 Gateway(网关) 身份验证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任的代理身份验证"
sidebarTitle: "受信任的代理身份验证"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

<Warning>**安全敏感功能。** 此模式将身份验证完全委托给您的反向代理。错误配置可能会将您的 Gateway(网关) 暴露给未授权的访问。启用前请仔细阅读此页面。</Warning>

## 何时使用

在以下情况下使用 `trusted-proxy` 身份验证模式：

- 您在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw。
- 您的代理处理所有身份验证并通过标头传递用户身份。
- 您处于 Kubernetes 或容器环境中，其中代理是通往 Gateway(网关) 的唯一路径。
- 您遇到了 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递令牌。

## 何时不使用

- 如果您的代理不验证用户身份（仅作为 TLS 终结器或负载均衡器）。
- 如果存在任何绕过代理通往 Gateway(网关) 的路径（防火墙漏洞、内部网络访问）。
- 如果您不确定您的代理是否正确剥离/覆盖转发的标头。
- 如果您只需要个人单用户访问（考虑使用 Tailscale Serve + 回环以进行更简单的设置）。

## 工作原理

<Steps>
  <Step title="代理对用户进行身份验证">您的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）。</Step>
  <Step title="代理添加身份标头">代理添加一个包含已验证用户身份的标头（例如 `x-forwarded-user: nick@example.com`）。</Step>
  <Step title="Gateway(网关) 验证受信任的来源">OpenClaw 检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）。</Step>
  <Step title="Gateway(网关) 提取身份">OpenClaw 从配置的标头中提取用户身份。</Step>
  <Step title="授权">如果一切检查无误，该请求即获得授权。</Step>
</Steps>

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于激活状态且请求通过了受信任代理检查时，控制 UI WebSocket 会话无需设备配对身份即可连接。

影响：

- 在此模式下，配对不再是控制 UI 访问的主要关卡。
- 您的反向代理身份验证策略和 `allowUsers` 将成为有效的访问控制。
- 确保网关入口仅限于受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

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

<Warning>
**重要运行时规则**

- 受信任代理身份验证会拒绝回环源请求（`127.0.0.1`、`::1`、回环 CIDR）。
- 同主机回环反向代理**不**满足受信任代理身份验证条件。
- 对于同主机回环代理设置，请改用令牌/密码身份验证，或者通过 OpenClaw 可以验证的非回环受信任代理地址进行路由。
- 非回环控制 UI 部署仍然需要显式的 `gateway.controlUi.allowedOrigins`。
- **转发头证据会覆盖回环局部性。** 如果请求到达回环接口但携带指向非本地源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 头，该证据将使回环局部性声明失效。该请求在配对、受信任代理身份验证和控制 UI 设备身份门控方面将被视为远程请求。这可以防止同主机回环代理将转发头身份“洗白”为受信任代理身份验证。
  </Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  受信任的代理 IP 地址数组。来自其他 IP 的请求将被拒绝。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必须为 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已验证用户身份的 Header 名称。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  请求受信任时必须存在的额外 Header。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  用户身份白名单。为空表示允许所有已验证的用户。
</ParamField>

## TLS 终止与 HSTS

使用一个 TLS 终止点并在那里应用 HSTS。

<Tabs>
  <Tab title="代理 TLS 终止（推荐）">
    当您的反向代理为 `https://control.example.com` 处理 HTTPS 时，在该代理上为该域设置 `Strict-Transport-Security`。

    - 适用于面向互联网的部署。
    - 将证书和 HTTP 加固策略集中在一处。
    - OpenClaw 可以保留在代理后的回环 HTTP 上。

    示例 Header 值：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway(网关) TLS 终止">
    如果 OpenClaw 本身直接提供 HTTPS 服务（无 TLS 终止代理），请设置：

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

    `strictTransportSecurity` 接受字符串 Header 值，或者 `false` 以显式禁用。

  </Tab>
</Tabs>

### 上线指南

- 验证流量时，首先使用较短的最大有效期（例如 `max-age=300`）。
- 只有在确认无误后，才增加长期有效的值（例如 `max-age=31536000`）。
- 仅当每个子域都准备好 HTTPS 时，才添加 `includeSubDomains`。
- 仅当您有意为整个域名集满足预加载要求时，才使用预加载。
- 仅限本地回环开发无法从 HSTS 中受益。

## 代理设置示例

<AccordionGroup>
  <Accordion title="Pomerium">
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

  </Accordion>
  <Accordion title="Caddy with OAuth">
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

  </Accordion>
  <Accordion title="nginx + oauth2-proxy">
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

  </Accordion>
  <Accordion title="Traefik with forward auth">
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
  </Accordion>
</AccordionGroup>

## 混合令牌配置

OpenClaw 会拒绝存在歧义的配置，即当 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式同时处于活动状态时。混合令牌配置可能导致回环请求在错误的身份验证路径上静默通过身份验证。

如果在启动时看到 `mixed_trusted_proxy_token` 错误：

- 在使用 trusted-proxy 模式时移除共享令牌，或者
- 如果您打算使用基于令牌的身份验证，请将 `gateway.auth.mode` 切换为 `"token"`。

回环 trusted-proxy 身份验证也会失败关闭：同主机调用者必须通过受信任的代理提供配置的身份头，而不是被静默身份验证。

## 操作员范围头

Trusted-proxy 身份验证是一种**承载身份**的 HTTP 模式，因此调用者可以选择使用 `x-openclaw-scopes` 声明操作员范围。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当存在该头时，OpenClaw 将遵守声明的范围集。
- 当存在该头但为空时，请求声明**没有**操作员范围。
- 当标头不存在时，正常的携带身份的 HTTP API 会回退到标准操作员默认范围集。
- Gateway(网关)-auth **插件 HTTP 路由** 默认范围更窄：当 `x-openclaw-scopes` 不存在时，它们的运行时范围会回退到 `operator.write`。
- 即使受信任代理认证成功，源自浏览器的 HTTP 请求仍必须通过 `gateway.controlUi.allowedOrigins`（或故意的 Host 标头回退模式）。

实用规则：当您希望受信任代理请求的范围比默认值更窄，或者当 gateway-auth 插件路由需要比写入范围更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

在启用受信任代理认证之前，请验证：

- [ ] **代理是唯一路径**：Gateway(网关) 端口已配置防火墙，仅允许您的代理访问，其他一切均被阻止。
- [ ] **trustedProxies 是最小的**：仅包含您实际的代理 IP，而不是整个子网。
- [ ] **无回环代理源**：对于来自回环源的请求，受信任代理认证将以失败关闭（fail-closed）。
- [ ] **代理剥离标头**：您的代理覆盖（而不是追加）来自客户端的 `x-forwarded-*` 标头。
- [ ] **TLS 终止**：您的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins 是显式的**：非回环控制 UI 使用显式的 `gateway.controlUi.allowedOrigins`。
- [ ] **设置了 allowUsers**（推荐）：限制为已知用户，而不是允许任何通过认证的人。
- [ ] **无混合令牌配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。

## 安全审计

`openclaw security audit` 将以 **严重** 严重性发现标记受信任代理认证。这是有意为之——这是一个提醒，表明您正在将安全委托给您的代理设置。

审计检查内容包括：

- 基础 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何经过认证的用户）
- 在暴露的控制 UI 表面上存在通配符或缺少浏览器来源策略

## 故障排除

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

    - 代理 IP 是否正确？（Docker 容器的 IP 可能会发生变化。）
    - 代理前面是否有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒绝了来自环回源的受信任代理请求。

    检查：

    - 代理是否从 `127.0.0.1` / `::1` 连接？
    - 您是否尝试将受信任代理认证与同主机环回反向代理一起使用？

    修复：

    - 对同主机环回代理设置使用令牌/密码认证，或者
    - 通过非环回受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用户标头为空或缺失。请检查：

    - 您的代理是否配置为传递身份标头？
    - 标头名称是否正确？（不区分大小写，但拼写很重要）
    - 用户是否确实在代理处通过了身份验证？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    缺少必需的标头。请检查：

    - 您针对这些特定标头的代理配置。
    - 标头是否在链中的某处被剥离。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用户已通过身份验证，但不在 `allowUsers` 中。请添加用户或删除允许列表。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理认证成功，但浏览器 `Origin` 请求头未通过 Control UI 源检查。

    检查：

    - `gateway.controlUi.allowedOrigins` 包含确切的浏览器源。
    - 除非您有意想要允许所有行为，否则不要依赖通配符源。
    - 如果您有意使用 Host 请求头回退模式，则已刻意设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion title="WebSocket 仍然失败">
    确保您的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`，`Connection: upgrade`）。
    - 在 WebSocket 升级请求上传递身份请求头（不仅仅是 HTTP）。
    - 没有为 WebSocket 连接设置单独的认证路径。

  </Accordion>
</AccordionGroup>

## 从令牌认证迁移

如果您正在从令牌认证迁移到受信任代理：

<Steps>
  <Step title="配置代理">配置您的代理以认证用户并传递请求头。</Step>
  <Step title="独立测试代理">独立测试代理设置（使用请求头进行 curl 测试）。</Step>
  <Step title="更新 OpenClaw 配置">使用受信任代理认证更新 OpenClaw 配置。</Step>
  <Step title="重启 Gateway(网关)">重启 Gateway(网关)。</Step>
  <Step title="测试 WebSocket">从 Control UI 测试 WebSocket 连接。</Step>
  <Step title="审计">运行 `openclaw security audit` 并审查发现结果。</Step>
</Steps>

## 相关

- [配置](/zh/gateway/configuration) — 配置参考
- [远程访问](/zh/gateway/remote) — 其他远程访问模式
- [安全](/zh/gateway/security) — 完整安全指南
- [Tailscale](/zh/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案
