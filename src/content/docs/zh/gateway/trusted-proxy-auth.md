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

在以下情况下使用 `trusted-proxy` 认证模式：

- 您在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw。
- 您的代理处理所有身份验证并通过标头传递用户身份。
- 您处于 Kubernetes 或容器环境中，其中代理是通往 Gateway(网关) 的唯一路径。
- 由于浏览器无法在 WS 载荷中传递令牌，您遇到了 WebSocket `1008 unauthorized` 错误。

## 何时不使用

- 如果您的代理不验证用户身份（仅作为 TLS 终结器或负载均衡器）。
- 如果存在任何绕过代理通往 Gateway(网关) 的路径（防火墙漏洞、内部网络访问）。
- 如果您不确定您的代理是否正确剥离/覆盖转发的标头。
- 如果您只需要个人单用户访问（考虑使用 Tailscale Serve + 回环以进行更简单的设置）。

## 工作原理

<Steps>
  <Step title="代理对用户进行身份验证">您的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）。</Step>
  <Step title="代理添加身份标头">代理添加一个包含已验证用户身份的标头（例如 `x-forwarded-user: nick@example.com`）。</Step>
  <Step title="Gateway(网关) 验证受信任来源">OpenClaw 检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）。</Step>
  <Step title="Gateway(网关) 提取身份">OpenClaw 从配置的标头中提取用户身份。</Step>
  <Step title="授权">如果一切检查无误，该请求即获得授权。</Step>
</Steps>

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态且请求通过受信任代理检查时，控制 UI WebSocket 会话可以在没有设备配对身份的情况下进行连接。

影响：

- 在此模式下，配对不再是控制 UI 访问的主要关卡。
- 您的反向代理身份验证策略和 `allowUsers` 将成为有效的访问控制。
- 确保网关入站流量仅锁定到受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

**在没有设备身份的情况下清除作用域：** 由于通过纯 HTTP 的浏览器
无法创建 OpenClaw 用于绑定操作员作用域的设备身份，
因此缺少设备身份的受信任代理 WebSocket 连接的
自声明作用域将被清除为空集。连接是允许的，但
受作用域限制的方法（`operator.read`、`operator.write` 等）将失败并返回
`missing scope`。

要在没有设备身份的受信任代理 WebSocket 连接上保留操作员作用域，
请设置 `gateway.controlUi.dangerouslyDisableDeviceAuth: true`。
这是一个紧急情况标志（`openclaw security audit` 将其报告为关键）。
仅当反向代理是通往 Gateway(网关) 的唯一路径且无法
建立设备身份时才使用它。

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

- 受信任代理认证默认拒绝来自环回源的请求（`127.0.0.1`、`::1`、环回 CIDR）。
- 同主机环回反向代理**不**满足受信任代理认证，除非您显式设置了 `gateway.auth.trustedProxy.allowLoopback = true` 并在 `gateway.trustedProxies` 中包含了环回地址。
- `allowLoopback`Gateway(网关)Gateway(网关)Gateway(网关) 以与反向代理相同的程度信任 Gateway(网关) 主机上的本地进程。仅当 Gateway(网关) 仍处于防火墙保护以防止直接远程访问，并且本地代理剥离或覆盖了客户端提供的身份标头时，才启用此功能。
- 不通过反向代理传输的内部 Gateway(网关) 客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是受信任代理身份标头。
- 非环回控制 UI 部署仍然需要显式的 `gateway.controlUi.allowedOrigins`。
- **转发标头证据会覆盖用于本地直接回退的环回本地性。** 如果请求在环回上到达但带有 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 标头证据，则该证据将使本地直接密码回退和设备身份门控失效。使用 `allowLoopback: true` 时，受信任代理认证仍可将请求作为同主机代理请求接受，而 `requiredHeaders` 和 `allowUsers` 继续适用。

</Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址数组。来自其他 IP 的请求将被拒绝。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必须是 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已认证用户身份的 Header 名称。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  请求受信任时必须存在的附加 Header。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  用户身份白名单。为空表示允许所有已认证用户。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  选择性支持同主机回环反向代理。默认为 `false`。
</ParamField>

<Warning>仅当本地反向代理是预期的信任边界时，才启用 `allowLoopback`Gateway(网关)Gateway(网关)。任何能够连接到 Gateway(网关) 的本地进程都可以尝试发送代理身份 Header，因此请将对 Gateway(网关) 的直接访问限制在主机内部，并要求代理拥有的 Header（如 `x-forwarded-proto`）或代理支持的签名断言 Header。</Warning>

## TLS 终止和 HSTS

使用一个 TLS 终止点并在那里应用 HSTS。

<Tabs>
  <Tab title="Proxy TLS termination (recommended)">
    当您的反向代理为 `https://control.example.com` 处理 HTTPS 时，请在该域名的代理上设置 `Strict-Transport-Security`OpenClaw。

    - 适用于面向互联网的部署。
    - 将证书 + HTTP 加固策略集中在一处。
    - OpenClaw 可以留在代理后的回环 HTTP 上。

    Header 值示例：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway(网关)Gateway(网关) TLS termination"OpenClaw>
    如果 OpenClaw 本身直接提供 HTTPS 服务（没有 TLS 终止代理），请设置：

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

    `strictTransportSecurity` 接受字符串标头值，或者使用 `false` 以显式禁用。

  </Tab>
</Tabs>

### 推广指南

- 在验证流量时，首先使用较短的最长有效期（例如 `max-age=300`）。
- 只有在确信度很高之后，才增加到长期有效的值（例如 `max-age=31536000`）。
- 仅当每个子域都准备好使用 HTTPS 时，才添加 `includeSubDomains`。
- 仅当您有意为整个域名集满足预加载要求时，才使用预加载。
- 仅限环回的本地开发无法从 HSTS 中受益。

## 代理设置示例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 在 `x-pomerium-claim-email`（或其他声明标头）中传递身份，并在 `x-pomerium-jwt-assertion` 中传递 JWT。

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
  <Accordion title="OAuthCaddy with OAuth">
    配有 `caddy-security` 插件的 Caddy 可以对用户进行身份验证并传递身份标头。

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

OpenClaw 会拒绝歧义配置，即同时启用了 OpenClaw`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式。混合令牌配置可能导致环回请求在错误的身份验证路径上静默进行身份验证。

如果在启动时看到 `mixed_trusted_proxy_token` 错误：

- 在使用 trusted-proxy 模式时移除共享令牌，或者
- 如果您打算使用基于令牌的身份验证，请将 `gateway.auth.mode` 切换为 `"token"`。

回环 trusted-proxy 身份标头仍然遵循“失败即关闭”原则：同主机调用方不会静默作为代理用户进行身份验证。绕过代理的内部 OpenClaw 调用方可以改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行身份验证。在 trusted-proxy 模式下，有意不支持令牌回退。

## Operator scopes 标头

Trusted-proxy 身份验证是一种 **携带身份** 的 HTTP 模式，因此调用方可以选择使用 `x-openclaw-scopes` 声明 operator scopes。

注意：`x-openclaw-scopes` 仅适用于 HTTP 端点。WebSocket scopes 由 Gateway(网关) 协议握手和设备身份绑定决定。有关 trusted-proxy 的 WebSocket scope 行为，请参阅 [Control UI pairing behavior](#control-ui-pairing-behavior)。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当标头存在时，OpenClaw 会遵守声明的 scope 集。
- 当标头存在但为空时，请求声明 **没有** operator scopes。
- 当标头不存在时，常规的携带身份 HTTP API 会回退到标准的 operator 默认 scope 集。
- Gateway(网关)-auth **插件 HTTP 路由** 默认更窄：当 `x-openclaw-scopes` 不存在时，其运行时 scope 会回退到 `operator.write`。
- 即使 trusted-proxy 身份验证成功，源自浏览器的 HTTP 请求仍必须通过 `gateway.controlUi.allowedOrigins`（或故意的 Host 标头回退模式）。

实用规则：当您希望 trusted-proxy 请求比默认值更窄，或者 gateway-auth 插件路由需要比 write scope 更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

在启用 trusted-proxy 身份验证之前，请验证：

- [ ] **Proxy is the only path**: 除了您的代理之外，Gateway(网关) 端口已受到防火墙保护，拒绝来自其他所有来源的连接。
- [ ] **trustedProxies is minimal**: 仅包含您实际的代理 IP，而不是整个子网。
- [ ] **Loopback proxy source is deliberate**: 对于源自环回地址的请求，trusted-proxy 认证默认会拒绝访问（fail closed），除非针对同主机代理显式启用了 `gateway.auth.trustedProxy.allowLoopback`。
- [ ] **Proxy strips headers**: 您的代理会覆盖（而不是追加）来自客户端的 `x-forwarded-*` 标头。
- [ ] **TLS termination**: 您的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins is explicit**: 非环回控制 UI 使用显式的 `gateway.controlUi.allowedOrigins`。
- [ ] **allowUsers is set**（推荐）：限制为已知用户，而不是允许任何通过认证的用户。
- [ ] **No mixed token config**: 不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **Local password fallback is private**: 如果您为内部直接调用方配置了 `gateway.auth.password`，请确保 Gateway(网关) 端口受到防火墙保护，以防止非代理远程客户端直接访问它。

## 安全审计

`openclaw security audit` 会标记 trusted-proxy 认证，并给出一个 **严重（critical）** 级别的发现。这是有意为之 —— 它是在提醒您将安全责任委托给了代理设置。

审计会检查以下内容：

- 基础 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何经过认证的用户）
- 针对同主机代理来源启用了 `allowLoopback`
- 暴露的控制 UI 表面上存在通配符或缺失的浏览器来源策略

## 故障排除

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

    - 代理 IP 是否正确？（Docker 容器 IP 可能会发生变化。）
    - 代理前面是否有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source"OpenClaw>
    OpenClaw 拒绝了一个来自回环源的受信任代理请求。

    检查：

    - 代理是否正从 `127.0.0.1` / `::1` 连接？
    - 您是否正在尝试通过同主机回环反向代理使用受信任代理认证？

    修复：

    - 对于不经过代理的内部同主机客户端，首选令牌/密码认证，或者
    - 通过非回环受信任代理地址路由，并将该 IP 保留在 `gateway.trustedProxies` 中，或者
    - 对于刻意的同主机反向代理，请设置 `gateway.auth.trustedProxy.allowLoopback = true`，将回环地址保留在 `gateway.trustedProxies` 中，并确保代理剥离或覆盖身份标头。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用户标头为空或缺失。检查：

    - 您的代理是否配置为传递身份标头？
    - 标头名称是否正确？（不区分大小写，但拼写很重要）
    - 用户实际上是否在代理处通过了身份验证？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    缺少必需的标头。检查：

    - 您的代理针对这些特定标头的配置。
    - 标头是否在链中的某处被剥离。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用户已通过身份验证但不在 `allowUsers` 中。请将其添加或移除允许列表。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理认证成功，但浏览器 `Origin` 标头未通过 Control UI 源检查。

    检查：

    - `gateway.controlUi.allowedOrigins` 是否包含确切的浏览器源。
    - 您是否未依赖于通配符源，除非您有意想要允许所有行为。
    - 如果您有意使用 Host 标头回退模式，则 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 是有意设置的。

  </Accordion>
  <Accordion title="Connection succeeds but methods report missing scope">
    WebSocket 连接成功，但 `chat.history` 或 `sessions.list` 失败并返回
    `missing scope: operator.read`。

    对于没有设备身份的受信任代理 WebSocket 连接，这是预期的行为。缺少设备身份的连接其作用域会被清除。浏览器无法通过纯 HTTP 生成设备身份。

    修复方法：

    - 设置 `gateway.controlUi.dangerouslyDisableDeviceAuth: true` 以在受信任代理 WebSocket 连接上保留操作员作用域，或
    - 使用设备身份配对，以便将作用域绑定到设备令牌。

  </Accordion>
  <Accordion title="WebSocket still failing">
    请确保您的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`、`Connection: upgrade`）。
    - 在 WebSocket 升级请求上传递身份标头（不仅仅是 HTTP）。
    - 没有 WebSocket 连接的单独身份验证路径。

  </Accordion>
</AccordionGroup>

## 从令牌身份验证迁移

如果您正在从令牌身份验证迁移到受信任代理：

<Steps>
  <Step title="Configure the proxy">配置您的代理以验证用户并传递标头。</Step>
  <Step title="Test the proxy independently">独立测试代理设置（使用带标头的 curl）。</Step>
  <Step title="OpenClawUpdate OpenClaw config">使用受信任代理身份验证更新 OpenClaw 配置。</Step>
  <Step title="Gateway(网关)Restart the Gateway">重启 Gateway(网关)。</Step>
  <Step title="Test WebSocket">从控制 UI 测试 WebSocket 连接。</Step>
  <Step title="Audit">运行 `openclaw security audit` 并检查结果。</Step>
</Steps>

## 相关

- [配置](/zh/gateway/configuration) — 配置参考
- [远程访问](/zh/gateway/remote) — 其他远程访问模式
- [安全](/zh/gateway/security) — 完整安全指南
- [Tailscale](Tailscale/en/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案
