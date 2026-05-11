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

在以下情況使用 `trusted-proxy` 驗證模式：

- 您在 **具身分識別能力的代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）後方執行 OpenClaw。
- 您的代理處理所有驗證，並透過標頭傳遞使用者身分。
- 您處於 Kubernetes 或容器環境中，且該代理是通往閘道的唯一路徑。
- 您遇到了 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 負載中傳遞權杖。

## 何時不使用

- 如果您的代理不驗證使用者（僅作為 TLS 終止器或負載平衡器）。
- 如果有任何通往閘道的路徑繞過了代理（防火牆漏洞、內部網路存取）。
- 如果您不確定您的代理是否正確地移除/覆寫轉送標頭。
- 如果您只需要個人的單使用者存取（建議考慮使用 Tailscale Serve + loopback 以進行更簡單的設定）。

## 運作方式

<Steps>
  <Step title="代理驗證使用者">您的反向代理會驗證使用者（OAuth、OIDC、SAML 等）。</Step>
  <Step title="代理新增身分標頭">會新增一個包含已驗證使用者身分的標頭（例如 `x-forwarded-user: nick@example.com`）。</Step>
  <Step title="閘道驗證受信任來源">OpenClaw 會檢查請求是否來自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中設定）。</Step>
  <Step title="閘道提取身分">OpenClaw 會從設定的標頭中提取使用者身分。</Step>
  <Step title="Authorize">如果一切檢查無誤，請求將被授權。</Step>
</Steps>

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 啟用且請求通過 trusted-proxy 檢查時，控制 UI WebSocket 會話可以在沒有裝置配對身分的情況下連接。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要閘門。
- 您的反向代理驗證策略和 `allowUsers` 將成為有效的存取控制。
- 請將閘道入口僅鎖定為受信任的 Proxy IP（`gateway.trustedProxies` + 防火牆）。

## 設定

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
**重要的執行時規則**

- Trusted-proxy 驗證會拒絕來自回環來源的請求（`127.0.0.1`、`::1`、回環 CIDR）。
- 同主機回環反向代理 **不** 滿足 trusted-proxy 驗證。
- 對於同主機回環 proxy 設定，請改用權杖/密碼驗證，或透過 OpenClaw 可驗證的非回環受信任 proxy 位址進行路由。
- 非回環控制 UI 部署仍需要明確的 `gateway.controlUi.allowedOrigins`。
- **轉送標頭證據會覆蓋回環本地性。** 如果請求到達回環但帶有指向非本機來源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 標頭，該證據將取消回環本地性宣告。該請求將被視為遠端請求，用於配對、trusted-proxy 驗證和控制 UI 裝置身分閘道。這可防止同主機回環 proxy 將轉送標頭身分洗白為 trusted-proxy 驗證。
  </Warning>

### 設定參考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 位址陣列。來自其他 IP 的請求將被拒絕。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必須是 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已驗證使用者身分的標頭名稱。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  請求被信任必須存在的額外標頭。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  使用者身分白名單。留空表示允許所有已驗證的使用者。
</ParamField>

## TLS 終止與 HSTS

使用單一 TLS 終止點並在該處套用 HSTS。

<Tabs>
  <Tab title="Proxy TLS termination (recommended)">
    當您的反向代理為 `https://control.example.com` 處理 HTTPS 時，請在該網域的代理上設定 `Strict-Transport-Security`。

    - 適合面向網際網路的部署。
    - 將憑證 + HTTP 加固政策保持在同一個地方。
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

    `strictTransportSecurity` 接受字串標頭值，或 `false` 以明確停用。

  </Tab>
</Tabs>

### 推出指引

- 在驗證流量時，首先使用較短的有效期（例如 `max-age=300`）。
- 只有在確定無誤後，才增加為長期值（例如 `max-age=31536000`）。
- 只有在每個子網域都已準備好 HTTPS 時，才新增 `includeSubDomains`。
- 只有當您有意為完整的網域名稱集合符合預先載入要求時，才使用預先載入。
- 僅限 loopback 的本機開發無法從 HSTS 獲益。

## 代理設定範例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 會在 `x-pomerium-claim-email` （或其他聲明標頭）中傳遞身分，並在 `x-pomerium-jwt-assertion` 中傳遞 JWT。

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
    搭配 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身分標頭。

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
    oauth2-proxy 會驗證使用者並在 `x-auth-request-email` 中傳遞身分。

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

## 混合權杖配置

OpenClaw 會拒絕模稜兩可的配置，即同時啟用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式。混合權杖配置可能導致回送請求在錯誤的驗證路徑上被靜默驗證。

如果您在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除共用權杖，或
- 如果您打算使用基於權杖的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

回送 trusted-proxy 驗證也會以封閉式失敗處理：同主機呼叫者必須透過受信任的代理提供配置的身分標頭，而不是被靜默驗證。

## 操作員範圍標頭

Trusted-proxy 驗證是一種**攜帶身分**的 HTTP 模式，因此呼叫者可以使用 `x-openclaw-scopes` 選擇性宣告操作員範圍。

範例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行為：

- 當標頭存在時，OpenClaw 會遵守宣告的範圍集合。
- 當標頭存在但為空時，請求會宣告**沒有**操作員範圍。
- 當標頭不存在時，承載身分的標準 HTTP API 會回退到標準的操作員預設範圍集。
- Gateway-auth **外掛程式 HTTP 路由**預設更嚴格：當 `x-openclaw-scopes` 不存在時，其執行時期範圍會回退到 `operator.write`。
- 即使 trusted-proxy auth 成功後，來自瀏覽器的 HTTP 請求仍須通過 `gateway.controlUi.allowedOrigins`（或刻意設定的 Host 標頭回退模式）。

實用規則：當您希望 trusted-proxy 請求比預設值更嚴格，或當 gateway-auth 外掛程式路由需要比寫入範圍更強的權限時，請明確發送 `x-openclaw-scopes`。

## 安全性檢查清單

啟用 trusted-proxy auth 之前，請驗證：

- [ ] **Proxy 是唯一的路徑**：Gateway 連接埠已透過防火牆阻擋來自您 Proxy 以外所有來源的流量。
- [ ] **trustedProxies 極簡化**：僅包含您實際的 Proxy IP，而非整個子網路。
- [ ] **無回送 Proxy 來源**：來自回送來源的請求在 trusted-proxy auth 中會預設封閉失敗。
- [ ] **Proxy 會移除標頭**：您的 Proxy 會覆寫（而非附加）來自客戶端的 `x-forwarded-*` 標頭。
- [ ] **TLS 終止**：您的 Proxy 處理 TLS；使用者透過 HTTPS 連線。
- [ ] **allowedOrigins 為明確指定**：非回送 Control UI 使用明確指定的 `gateway.controlUi.allowedOrigins`。
- [ ] **已設定 allowUsers**（建議）：限制為已知使用者，而非允許任何已驗證的使用者。
- [ ] **無混合權杖設定**：請勿同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。

## 安全性稽核

`openclaw security audit` 將以 **嚴重** 嚴重性標記 trusted-proxy auth。這是刻意的 —— 這是一項提醒，提醒您正在將安全性委派給您的 Proxy 設定。

稽核會檢查：

- 基礎 `gateway.trusted_proxy_auth` 警告/嚴重提醒
- 缺少 `trustedProxies` 設定
- 缺少 `userHeader` 設定
- 空白 `allowUsers`（允許任何已驗證的使用者）
- 暴露的 Control UI 介面上有萬用字元或遺失瀏覽器來源策略

## 疑難排解

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

    - 代理 IP 是否正確？（Docker 容器 IP 可能會變更。）
    - 您的代理前面是否有負載平衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 來找出實際 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒絕了來自回環來源的受信代理請求。

    檢查：

    - 代理是否從 `127.0.0.1` / `::1` 連線？
    - 您是否嘗試使用相同主機上的回環反向代理來使用受信代理驗證？

    修正方式：

    - 對於相同主機的回環代理設定，請使用權杖/密碼驗證，或
    - 透過非回環的受信代理位址進行路由，並將該 IP 保留在 `gateway.trustedProxies` 中。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    使用者標頭為空白或遺失。請檢查：

    - 您的代理是否設定為傳遞識別標頭？
    - 標頭名稱是否正確？（不區分大小寫，但拼寫很重要）
    - 使用者實際上是否已在代理處完成驗證？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    遺漏了必要的標頭。請檢查：

    - 您針對這些特定標頭的代理設定。
    - 標頭是否在鏈結的某處被移除。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    使用者已驗證但不在 `allowUsers` 中。請將其加入或移除允許清單。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理驗證成功，但瀏覽器的 `Origin` 標頭未通過控制 UI 的來源檢查。

    檢查：

    - `gateway.controlUi.allowedOrigins` 包含確切的瀏覽器來源。
    - 除非您刻意想要允許所有行為，否則不要依賴萬用字元來源。
    - 如果您刻意使用 Host 標頭回退模式，請確認 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 已刻意設定。

  </Accordion>
  <Accordion title="WebSocket 仍然失敗">
    請確定您的代理伺服器：

    - 支援 WebSocket 升級 (`Upgrade: websocket`, `Connection: upgrade`)。
    - 在 WebSocket 升級請求上傳遞身分標頭 (而不僅是 HTTP)。
    - 沒有針對 WebSocket 連線的個別驗證路徑。

  </Accordion>
</AccordionGroup>

## 從權杖驗證遷移

如果您要從權杖驗證移轉至受信任代理：

<Steps>
  <Step title="設定代理伺服器">設定您的代理伺服器以驗證使用者並傳遞標頭。</Step>
  <Step title="獨立測試代理伺服器">獨立測試代理伺服器設定 (使用帶有標頭的 curl)。</Step>
  <Step title="更新 OpenClaw 設定">使用受信任代理驗證更新 OpenClaw 設定。</Step>
  <Step title="重新啟動 Gateway">重新啟動 Gateway。</Step>
  <Step title="測試 WebSocket">從控制 UI 測試 WebSocket 連線。</Step>
  <Step title="稽核">執行 `openclaw security audit` 並檢閱結果。</Step>
</Steps>

## 相關

- [設定](/zh-Hant/gateway/configuration) — 設定參考
- [遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [安全性](/zh-Hant/gateway/security) — 完整的安全性指南
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
