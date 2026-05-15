---
summary: "將閘道驗證委派給受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任的代理驗證"
sidebarTitle: "受信任的代理驗證"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

<Warning>**安全敏感性功能。** 此模式會將驗證完全委派給您的反向代理。設定錯誤可能會導致您的閘道暴露於未經授權的存取。在啟用之前請仔細閱讀此頁面。</Warning>

## 何時使用

在以下情況下使用 `trusted-proxy` 驗證模式：

- 您在 **具身分識別能力的代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）後方執行 OpenClaw。
- 您的代理處理所有驗證，並透過標頭傳遞使用者身分。
- 您處於 Kubernetes 或容器環境中，且該代理是通往閘道的唯一路徑。
- 您遇到 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 負載中傳遞權杖。

## 何時不使用

- 如果您的代理不驗證使用者（僅作為 TLS 終止器或負載平衡器）。
- 如果有任何通往閘道的路徑繞過了代理（防火牆漏洞、內部網路存取）。
- 如果您不確定您的代理是否正確地移除/覆寫轉送標頭。
- 如果您只需要個人的單使用者存取（建議考慮使用 Tailscale Serve + loopback 以進行更簡單的設定）。

## 運作方式

<Steps>
  <Step title="代理驗證使用者">您的反向代理會驗證使用者（OAuth、OIDC、SAML 等）。</Step>
  <Step title="Proxy adds an identity header">Proxy 新增一個包含已驗證使用者身分的標頭（例如 `x-forwarded-user: nick@example.com`）。</Step>
  <Step title="Gateway verifies trusted source">OpenClaw 檢查請求是否來自 **受信任的 Proxy IP**（在 `gateway.trustedProxies` 中設定）。</Step>
  <Step title="閘道提取身分">OpenClaw 會從設定的標頭中提取使用者身分。</Step>
  <Step title="Authorize">如果一切檢查無誤，請求將被授權。</Step>
</Steps>

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 處於啟用狀態且請求通過受信任 proxy 檢查時，Control UI WebSocket 會話可以在不進行裝置配對身分的情況下連線。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要閘門。
- 您的反向代理驗證政策和 `allowUsers` 將成為有效的存取控制。
- 請將閘道入口鎖定僅限受信任的 Proxy IP（`gateway.trustedProxies` + 防火牆）。

## 設定

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
**重要的運行時規則**

- Trusted-proxy auth 預設會拒絕來自回環來源的請求（`127.0.0.1`、`::1`、loopback CIDRs）。
- 同主機回環反向代理**不**滿足 trusted-proxy auth，除非您明確設定 `gateway.auth.trustedProxy.allowLoopback = true` 並將回環位址包含在 `gateway.trustedProxies` 中。
- `allowLoopback` 對 Gateway 主機上的本機程序給予與反向代理相同的信任度。僅當 Gateway 仍透過防火牆與遠端直接存取隔離，且本機代理會移除或覆寫用戶端提供的識別標頭時，才啟用它。
- 未通過反向代理的內部 Gateway 用戶端應使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而非 trusted-proxy 識別標頭。
- 非回環 Control UI 部署仍需要明確的 `gateway.controlUi.allowedOrigins`。
- **轉送標頭證據會覆寫本機直接後援的回環本地性。** 如果請求到達回環介面但帶有指向非本機來源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 標頭，該證據將取消本機直接密碼後援和裝置身分閘門的資格。在 `allowLoopback: true` 的情況下，trusted-proxy auth 仍可將請求作為同主機代理請求接受，而 `requiredHeaders` 和 `allowUsers` 繼續適用。

</Warning>

### 設定參考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 位址陣列。來自其他 IP 的請求會被拒絕。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必須是 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已驗證使用者身分的標頭名稱。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  請求被信任時必須存在的額外標頭。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  使用者身分白名單。留空表示允許所有已驗證的使用者。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  選用的同主機迴路反向代理支援。預設為 `false`。
</ParamField>

<Warning>僅當本機反向代理是預期的信任邊界時，才啟用 `allowLoopback`。任何能連線到 Gateway 的本機程序都可以嘗試發送代理身分標頭，因此請將直接存取 Gateway 的權限限制在主機上，並要求使用代理擁有的標頭（例如 `x-forwarded-proto`），或在您的代理支援的情況下使用簽署的斷言標頭。</Warning>

## TLS 終止與 HSTS

使用單一 TLS 終止點並在此處套用 HSTS。

<Tabs>
  <Tab title="Proxy TLS termination (recommended)">
    當您的反向代理為 `https://control.example.com` 處理 HTTPS 時，請在該網域的代理上設定 `Strict-Transport-Security`。

    - 適合面對網際網路的部署。
    - 將憑證與 HTTP 加強策略集中在一處。
    - OpenClaw 可以保留在代理後方的 loopback HTTP 上。

    標頭值範例：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway TLS termination">
    如果 OpenClaw 本身直接提供 HTTPS（無 TLS 終止代理），請設定：

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

    `strictTransportSecurity` 接受字串標頭值，或設為 `false` 以明確停用。

  </Tab>
</Tabs>

### 推出指引

- 驗證流量時，請先從較短的最大使用期限開始（例如 `max-age=300`）。
- 僅在確認無誤後，才將其增加到較長的有效期限（例如 `max-age=31536000`）。
- 僅當每個子網域都準備好使用 HTTPS 時，才新增 `includeSubDomains`。
- 只有當您有意為整個網域集符合預先載入的要求時，才使用預先載入。
- 僅限本機迴路的開發環境無法從 HSTS 獲益。

## Proxy 設定範例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 會在 `x-pomerium-claim-email`（或其他宣告標頭）中傳遞身分識別，並在 `x-pomerium-jwt-assertion` 中傳遞 JWT。

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

    Pomerium 設定片段：

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
    搭配 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身分識別標頭。

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

    Caddyfile 設定片段：

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
    oauth2-proxy 會驗證使用者並在 `x-auth-request-email` 中傳遞身分識別。

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

    nginx 設定片段：

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

## 混合權杖設定

OpenClaw 會拒絕模稜兩可的設定，即當 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式同時處於啟用狀態時。混合權杖設定可能會導致迴路請求在錯誤的驗證路徑上無聲地通過驗證。

如果您在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除共享權杖，或
- 如果您打算使用基於權杖的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

Loopback trusted-proxy 身份標頭仍然會關閉失敗（fail closed）：相同主機的呼叫者不會被靜默驗證為代理使用者。繞過代理的內部 OpenClaw 呼叫者反而可以使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 進行驗證。在 trusted-proxy 模式下，Token 回退（fallback）仍然故意不受支援。

## Operator scopes 標頭

Trusted-proxy auth 是一種**攜帶身份**（identity-bearing）的 HTTP 模式，因此呼叫者可以選擇使用 `x-openclaw-scopes` 宣告 operator scopes。

範例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行為：

- 當標頭存在時，OpenClaw 會遵守宣告的 scope 集合。
- 當標頭存在但為空時，請求宣告**沒有** operator scopes。
- 當標頭不存在時，正常的攜帶身份 HTTP API 會回退到標準的 operator 預設 scope 集合。
- Gateway-auth **plugin HTTP routes** 預設更嚴格：當 `x-openclaw-scopes` 不存在時，其執行時 scope 會回退到 `operator.write`。
- 瀏覽器來源的 HTTP 請求即使在 trusted-proxy auth 成功後，仍必須通過 `gateway.controlUi.allowedOrigins`（或刻意設定的 Host 標頭回退模式）。

實用規則：當您希望 trusted-proxy 請求比預設值更嚴格，或者當 gateway-auth plugin 路由需要比 write scope 更強的權限時，請明確發送 `x-openclaw-scopes`。

## 安全檢查清單

啟用 trusted-proxy auth 之前，請確認：

- [ ] **Proxy 是唯一的途徑**：Gateway 連接埠已受到防火牆保護，僅允許您的 Proxy 存取。
- [ ] **trustedProxies 是最小化設定**：僅包含您實際的 Proxy IP，而非整個子網路。
- [ ] **Loopback 來源 Proxy 是刻意設定的**：除非針對相同主機的 Proxy 明確啟用了 `gateway.auth.trustedProxy.allowLoopback`，否則來自 loopback 來源的請求使用 trusted-proxy auth 時會關閉失敗（fail closed）。
- [ ] **Proxy 會移除標頭**：您的 Proxy 會覆寫（而非附加）來自用戶端的 `x-forwarded-*` 標頭。
- [ ] **TLS 終止**：您的 Proxy 處理 TLS；使用者透過 HTTPS 連線。
- [ ] **allowedOrigins 是明確指定的**：非 loopback 的 Control UI 使用明確指定的 `gateway.controlUi.allowedOrigins`。
- [ ] **allowUsers is set**（推薦）：限制為已知用戶，而不是允許任何通過驗證的用戶。
- [ ] **No mixed token config**：請勿同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **Local password fallback is private**：如果您為內部直接呼叫者設定 `gateway.auth.password`，請保持 Gateway 連接埠在防火牆保護之下，以免非代理的遠端用戶端直接連線。

## 安全稽核

`openclaw security audit` 會標記受信任代理驗證，並發出**嚴重** 級別的發現。這是有意為之的 — 這是提醒您將安全性委派給您的代理設定。

稽核會檢查：

- 基礎 `gateway.trusted_proxy_auth` 警告/嚴重提醒
- 缺少 `trustedProxies` 設定
- 缺少 `userHeader` 設定
- `allowUsers` 為空（允許任何已驗證的用戶）
- 對相同主機代理來源啟用了 `allowLoopback`
- 在暴露的控制 UI 介面上使用了萬用字元或缺少瀏覽器來源原則

## 疑難排解

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

    - 代理 IP 是否正確？（Docker 容器 IP 可能會變動。）
    - 代理前面是否有負載平衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 尋找實際 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒絕了一個來自回環來源的受信任代理請求。

    請檢查：

    - 代理是否從 `127.0.0.1` / `::1` 連線？
    - 您是否嘗試在相同主機的回環反向代理上使用受信任代理驗證？

    修正方法：

    - 對於不經過代理的內部相同主機用戶端，優先使用 token/password 驗證，或
    - 透過非回環的受信任代理位址路由，並將該 IP 保留在 `gateway.trustedProxies` 中，或
    - 對於刻意設定的相同主機反向代理，請設定 `gateway.auth.trustedProxy.allowLoopback = true`，將回環位址保留在 `gateway.trustedProxies` 中，並確保代理會移除或覆寫識別標頭。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    使用者標頭為空或遺失。請檢查：

    - 您的 Proxy 是否設定為傳遞身分標頭？
    - 標頭名稱是否正確？（不區分大小寫，但拼字很重要）
    - 使用者是否已通過 Proxy 的驗證？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    遺漏必要的標頭。請檢查：

    - 您對這些特定標頭的 Proxy 設定。
    - 標頭是否在鏈結的某處被剝離。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    使用者已通過驗證，但不在 `allowUsers` 中。請將他們加入或移除允許清單。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    可信 Proxy 驗證成功，但瀏覽器 `Origin` 標頭未通過 Control UI 來源檢查。

    請檢查：

    - `gateway.controlUi.allowedOrigins` 是否包含確切的瀏覽器來源。
    - 除非您故意想要允許所有行為，否則請勿依賴萬用字元來源。
    - 如果您故意使用 Host 標頭後援模式，請確認已刻意設定 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion title="WebSocket still failing">
    請確保您的 Proxy：

    - 支援 WebSocket 升級（`Upgrade: websocket`、`Connection: upgrade`）。
    - 在 WebSocket 升級請求上傳遞身分標頭（不僅僅是 HTTP）。
    - 沒有為 WebSocket 連線設置單獨的驗證路徑。

  </Accordion>
</AccordionGroup>

## 從 Token 驗證遷移

如果您要從 Token 驗證轉移到可信 Proxy 驗證：

<Steps>
  <Step title="Configure the proxy">設定您的 Proxy 以驗證使用者並傳遞標頭。</Step>
  <Step title="Test the proxy independently">獨立測試 Proxy 設定（使用帶有標頭的 curl）。</Step>
  <Step title="Update OpenClaw config">使用可信 Proxy 驗證更新 OpenClaw 設定。</Step>
  <Step title="重新啟動 Gateway">重新啟動 Gateway。</Step>
  <Step title="測試 WebSocket">從控制 UI 測試 WebSocket 連線。</Step>
  <Step title="稽核">執行 `openclaw security audit` 並檢閱結果。</Step>
</Steps>

## 相關

- [設定](/zh-Hant/gateway/configuration) — 設定參考
- [遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [安全性](/zh-Hant/gateway/security) — 完整安全性指南
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
