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
- 您遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 载荷中传递令牌。

## 何时不使用

- 如果您的代理不验证用户身份（仅作为 TLS 终结器或负载均衡器）。
- 如果存在任何绕过代理通往 Gateway(网关) 的路径（防火墙漏洞、内部网络访问）。
- 如果您不确定您的代理是否正确剥离/覆盖转发的标头。
- 如果您只需要个人单用户访问（考虑使用 Tailscale Serve + 回环以进行更简单的设置）。

## 工作原理

<Steps>
  <Step title="代理对用户进行身份验证">您的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）。</Step>
  <Step title="代理添加身份标头">代理添加一个包含已验证用户身份的标头（例如，`x-forwarded-user: nick@example.com`）。</Step>
  <Step title="Gateway(网关) 验证可信源">OpenClaw 检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）。</Step>
  <Step title="Gateway(网关) 提取身份">OpenClaw 从配置的标头中提取用户身份。</Step>
  <Step title="授权">如果一切检查无误，该请求即获得授权。</Step>
</Steps>

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态且请求通过了受信任代理检查时，控制 UI WebSocket 会话可以在没有设备配对身份的情况下进行连接。

影响：

- 在此模式下，配对不再是控制 UI 访问的主要关卡。
- 您的反向代理身份验证策略和 `allowUsers` 将成为有效的访问控制。
- 请确保 Gateway 入口仅对受信任的代理 IP 开放（`gateway.trustedProxies` + 防火墙）。

## 配置

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source by default
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

        // Optional: allow a same-host loopback proxy after explicit opt-in
        allowLoopback: false,
      },
    },
  },
}
```

<Warning>
**重要运行时规则**

- 受信任代理身份验证默认拒绝回环源请求（`127.0.0.1`、`::1`、回环 CIDR）。
- 同主机回环反向代理**不**满足受信任代理身份验证，除非您显式设置 `gateway.auth.trustedProxy.allowLoopback = true` 并在 `gateway.trustedProxies` 中包含回环地址。
- `allowLoopback`Gateway(网关)Gateway(网关)Gateway(网关) 对 Gateway(网关) 主机上的本地进程的信任程度与反向代理相同。仅当 Gateway(网关) 仍通过防火墙与直接远程访问隔离，并且本地代理剥离或覆盖客户端提供的身份标头时，才启用它。
- 不经过反向代理的内部 Gateway(网关) 客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是受信任代理身份标头。
- 非回环控制 UI 部署仍然需要显式的 `gateway.controlUi.allowedOrigins`。
- **转接头标证据会覆盖本地直接回退的回环局部性。** 如果请求到达回环接口但携带指向非本地源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 标头，则该证据将取消本地直接密码回退和设备身份门控的资格。使用 `allowLoopback: true` 时，受信任代理身份验证仍可将请求作为同主机代理请求接受，同时 `requiredHeaders` 和 `allowUsers` 继续适用。

</Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址数组。来自其他 IP 的请求将被拒绝。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必须为 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已认证用户身份的 Header 名称。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  请求受信任时必须存在的额外 Header。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  用户身份白名单。为空表示允许所有已认证用户。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  选择性支持同主机环回反向代理。默认为 `false`。
</ParamField>

<Warning>仅当本地反向代理是预期的信任边界时才启用 `allowLoopback`。任何可以连接到 Gateway(网关) 的本地进程都可以尝试发送代理身份 Header，因此请确保对主机的直接 Gateway(网关) 访问保持私密，并要求使用代理拥有的 Header（例如 `x-forwarded-proto`）或您的代理支持的签名断言 Header。</Warning>

## TLS 终止和 HSTS

使用一个 TLS 终止点并在该处应用 HSTS。

<Tabs>
  <Tab title="代理 TLS 终止（推荐）">
    当您的反向代理为 `https://control.example.com` 处理 HTTPS 时，请在该域名的代理上设置 `Strict-Transport-Security`。

    - 适用于面向互联网的部署。
    - 将证书 + HTTP 加固策略集中在一处。
    - OpenClaw 可以保持在代理后的环回 HTTP 上。

    示例 Header 值：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway(网关)Gateway(网关) TLS 终止"OpenClaw>
    如果 OpenClaw 本身直接提供 HTTPS 服务（没有 TLS 终止代理），则设置：

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

    `strictTransportSecurity` 接受字符串头值，或者使用 `false` 显式禁用。

  </Tab>
</Tabs>

### 推出指南

- 在验证流量时，首先使用较短的 max age（例如 `max-age=300`）。
- 只有在确信度很高之后，才增加到长期值（例如 `max-age=31536000`）。
- 仅当每个子域都准备好使用 HTTPS 时，才添加 `includeSubDomains`。
- 仅当您有意为整个域名集满足预加载要求时，才使用预加载。
- 仅限本地回环的本地开发不会从 HSTS 中受益。

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
  <Accordion title="OAuthCaddy 搭配 OAuth">
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
  <Accordion title="Traefik 搭配 forward auth">
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

OpenClaw 会拒绝同时激活 OpenClaw`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式的模糊配置。混合令牌配置可能会导致回环请求在错误的身份验证路径上静默通过身份验证。

如果在启动时看到 `mixed_trusted_proxy_token` 错误：

- 使用 trusted-proxy 模式时移除共享令牌，或者
- 如果您打算使用基于令牌的身份验证，请将 `gateway.auth.mode` 切换到 `"token"`。

Loopback trusted-proxy 身份标头仍然会失败关闭：同主机调用者不会被静默身份验证为代理用户。绕过代理的内部 OpenClaw 调用者可以使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行身份验证。在 trusted-proxy 模式下，令牌回退仍然有意不受支持。

## Operator scopes 标头

Trusted-proxy auth 是一种 **身份承载** HTTP 模式，因此调用者可以选择使用 `x-openclaw-scopes` 声明 operator scopes。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当标头存在时，OpenClaw 遵守声明的 scope 集。
- 当标头存在但为空时，请求声明 **没有** operator scopes。
- 当标头不存在时，普通的身份承载 HTTP API 会回退到标准的 operator 默认 scope 集。
- Gateway(网关)-auth **插件 HTTP 路由** 默认情况下范围更窄：当 `x-openclaw-scopes` 不存在时，它们的运行时 scope 会回退到 `operator.write`。
- 浏览器发起的 HTTP 请求仍然必须通过 `gateway.controlUi.allowedOrigins`（或故意的 Host-header 回退模式），即使 trusted-proxy auth 成功后也是如此。

实用规则：当您希望 trusted-proxy 请求的范围比默认值更窄，或者当 gateway-auth 插件路由需要比 write scope 更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

在启用 trusted-proxy auth 之前，请验证：

- [ ] **代理是唯一路径**：Gateway(网关) 端口已受到防火墙保护，仅允许代理访问。
- [ ] **trustedProxies 是最小化的**：仅包含您实际的代理 IP，而不是整个子网。
- [ ] **Loopback 代理源是有意的**：除非为同主机代理显式启用了 `gateway.auth.trustedProxy.allowLoopback`，否则 trusted-proxy auth 对于 loopback 源请求将失败关闭。
- [ ] **Proxy strips headers**: 您的代理覆盖（而非追加）来自客户端的 `x-forwarded-*` 头部。
- [ ] **TLS termination**: 您的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins is explicit**: 非环回控制 UI 使用显式的 `gateway.controlUi.allowedOrigins`。
- [ ] **allowUsers is set**（推荐）：限制为已知用户，而不是允许任何经过身份验证的用户。
- [ ] **No mixed token config**: 不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **Local password fallback is private**: 如果您为内部直接调用者配置了 `gateway.auth.password`，请确保 Gateway(网关) 端口受防火墙保护，以便非代理的远程客户端无法直接访问它。

## Security audit

`openclaw security audit` 将标记受信任代理身份验证，并给出 **严重**（critical）级别的发现。这是有意为之——它提醒您正在将安全性委托给您的代理设置。

审核检查内容：

- 基础 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何经过身份验证的用户）
- 为同主机代理源启用了 `allowLoopback`
- 暴露的控制 UI 表面上存在通配符或缺失的浏览器源策略

## Troubleshooting

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

    - 代理 IP 是否正确？（Docker 容器 IP 可能会发生变化。）
    - 代理前面是否有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source"OpenClaw>
    OpenClaw 拒绝了来自回环源的可信代理请求。

    检查：

    - 代理是否从 `127.0.0.1` / `::1` 连接？
    - 您是否尝试将可信代理认证与同主机回环反向代理一起使用？

    修复：

    - 对于不经过代理的内部同主机客户端，首选令牌/密码认证，或
    - 通过非回环可信代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中，或
    - 对于故意的同主机反向代理，请设置 `gateway.auth.trustedProxy.allowLoopback = true`，将回环地址保留在 `gateway.trustedProxies` 中，并确保代理剥离或覆盖身份标头。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用户标头为空或缺失。检查：

    - 您的代理是否配置为传递身份标头？
    - 标头名称是否正确？（不区分大小写，但拼写很重要）
    - 用户实际上是否已在代理处通过身份验证？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    缺少必需的标头。检查：

    - 针对这些特定标头的代理配置。
    - 标头是否在链中的某处被剥离。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用户已通过身份验证，但不在 `allowUsers` 中。请将其添加或移除该允许列表。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    可信代理认证成功，但浏览器 `Origin` 标头未通过 Control UI 源检查。

    检查：

    - `gateway.controlUi.allowedOrigins` 是否包含确切的浏览器源。
    - 除非您有意想要允许所有行为，否则不要依赖通配符源。
    - 如果您有意使用 Host 标头回退模式，请有意设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion title="WebSocket 仍然失败">
    请确保您的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`，`Connection: upgrade`）。
    - 在 WebSocket 升级请求中传递身份标头（不仅仅是 HTTP）。
    - 没有为 WebSocket 连接设置单独的身份验证路径。

  </Accordion>
</AccordionGroup>

## 从 token auth 迁移

如果您正从 token auth 迁移到 trusted-proxy：

<Steps>
  <Step title="配置代理">配置您的代理以对用户进行身份验证并传递标头。</Step>
  <Step title="独立测试代理">独立测试代理设置（使用带有标头的 curl）。</Step>
  <Step title="OpenClaw更新 OpenClaw 配置">使用 trusted-proxy auth 更新 OpenClaw 配置。</Step>
  <Step title="Gateway(网关)重启 Gateway">重启 Gateway(网关)。</Step>
  <Step title="测试 WebSocket">从控制 UI 测试 WebSocket 连接。</Step>
  <Step title="审计">运行 `openclaw security audit` 并检查结果。</Step>
</Steps>

## 相关

- [配置](/zh/gateway/configuration) — 配置参考
- [远程访问](/zh/gateway/remote) — 其他远程访问模式
- [安全性](/zh/gateway/security) — 完整的安全指南
- [Tailscale](/zh/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案
