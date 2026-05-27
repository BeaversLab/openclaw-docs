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
- 您遇到 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 負載中傳遞令牌。

## 何時不使用

- 如果您的代理不驗證使用者（僅作為 TLS 終止器或負載平衡器）。
- 如果有任何通往閘道的路徑繞過了代理（防火牆漏洞、內部網路存取）。
- 如果您不確定您的代理是否正確地移除/覆寫轉送標頭。
- 如果您只需要個人的單使用者存取（建議考慮使用 Tailscale Serve + loopback 以進行更簡單的設定）。

## 運作方式

<Steps>
  <Step title="代理驗證使用者">您的反向代理會驗證使用者（OAuth、OIDC、SAML 等）。</Step>
  <Step title="Proxy adds an identity header">Proxy 會新增一個包含已驗證使用者身分的標頭 (例如 `x-forwarded-user: nick@example.com`)。</Step>
  <Step title="Gateway verifies trusted source">OpenClaw 會檢查請求是否來自 **受信任的 Proxy IP** (在 `gateway.trustedProxies` 中設定)。</Step>
  <Step title="閘道提取身分">OpenClaw 會從設定的標頭中提取使用者身分。</Step>
  <Step title="Authorize">如果一切檢查無誤，請求將被授權。</Step>
</Steps>

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 處於啟用狀態且請求通過受信任 proxy 檢查時，Control UI WebSocket 工作階段可以在不配對裝置身分的情況下連線。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要閘門。
- 您的反向 Proxy 驗證政策和 `allowUsers` 將成為實際的存取控制。
- 請確保 Gateway 入站僅鎖定受信任的 Proxy IP (`gateway.trustedProxies` + 防火牆)。

**無裝置身分時的範圍清除：** 由於透過純 HTTP 連線的瀏覽器
無法建立 OpenClaw 用於綁定操作員範圍的裝置身分，
缺乏裝置身分的受信任 Proxy WebSocket 連線會將其
自行宣告的範圍清除為空集合。連線是允許的，但
受範圍限制的方法 (`operator.read`、 `operator.write` 等) 會失敗並回報
`missing scope`。

若要在沒有裝置身分的受信任 Proxy WebSocket 連線上保留操作員範圍，請設定 `gateway.controlUi.dangerouslyDisableDeviceAuth: true`。
這是一個緊急存取標誌 (`openclaw security audit` 會將其回報為關鍵)。
僅在反向 Proxy 是通往 Gateway 的唯一路徑且無法
建立裝置身分時使用它。

## 組態

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

- 預設情況下，Trusted-proxy 身份驗證會拒絕來自回環來源的請求（`127.0.0.1`、`::1`、回環 CIDRs）。
- 除非您明確設定 `gateway.auth.trustedProxy.allowLoopback = true` 並在 `gateway.trustedProxies` 中包含回環位址，否則同主機回環反向代理**不會**滿足 trusted-proxy 身份驗證。
- `allowLoopback` 對閘道主機上的本機程序給予與反向代理相同的信任程度。僅當閘道仍受到防火牆保護以防止直接遠端存取，並且本機代理會移除或覆寫用戶端提供的識別標頭時，才啟用此功能。
- 未通過反向代理的內部閘道用戶端應使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是 trusted-proxy 識別標頭。
- 非回環控制 UI 部署仍需要明確的 `gateway.controlUi.allowedOrigins`。
- **轉送標頭證據會覆蓋本機直接後援的回環位置。** 如果請求來自回環但攜帶 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 標頭證據，該證據將取消本機直接密碼後援和裝置識別閘門。透過 `allowLoopback: true`，trusted-proxy 身份驗證仍可將請求作為同主機代理請求接受，同時 `requiredHeaders` 和 `allowUsers` 繼續適用。

</Warning>

### 組態參考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 位址陣列。來自其他 IP 的請求會被拒絕。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必須為 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已驗證使用者身分的標頭名稱。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  請求受信任時必須存在的額外標頭。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  使用者身分白名單。留空表示允許所有已驗證的使用者。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  同主機迴路反向代理的選用支援。預設值為 `false`。
</ParamField>

<Warning>僅當本地反向代理是預期的信任邊界時，才啟用 `allowLoopback`。任何可以連線到 Gateway 的本地程序都可能嘗試發送代理身分標頭，因此請將對 Gateway 的直接存取限制在主機內部，並要求由代理擁有的標頭（例如 `x-forwarded-proto`）或您的代理支援的簽署斷言標頭。</Warning>

## TLS 終止與 HSTS

使用一個 TLS 終止點並在此處套用 HSTS。

<Tabs>
  <Tab title="Proxy TLS termination (recommended)">
    當您的反向代理為 `https://control.example.com` 處理 HTTPS 時，請在針對該網域的代理上設定 `Strict-Transport-Security`。

    - 適合面向網際網路的部署。
    - 將憑證與 HTTP 加強政策保持在同一位置。
    - OpenClaw 可以停留在代理後方的迴路 HTTP 上。

    標頭值範例：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway TLS termination">
    如果 OpenClaw 本身直接提供 HTTPS（沒有 TLS 終止代理），請設定：

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

    `strictTransportSecurity` 接受字串標頭值，或是設定為 `false` 以明確停用。

  </Tab>
</Tabs>

### 推出指引

- 在驗證流量時，請先從較短的最長使用期限開始（例如 `max-age=300`）。
- 只有在確信度很高之後，才增加至長效數值（例如 `max-age=31536000`）。
- 僅當每個子網域都準備好使用 HTTPS 時，才新增 `includeSubDomains`。
- 僅當您有意為完整網域集符合預載要求時，才使用預載功能。
- 僅限回送的本機開發環境無法從 HSTS 獲益。

## Proxy 設定範例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 在 `x-pomerium-claim-email`（或其他宣告標頭）中傳遞身份，並在 `x-pomerium-jwt-assertion` 中傳遞 JWT。

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
    搭配 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身份標頭。

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
    oauth2-proxy 驗證使用者並在 `x-auth-request-email` 中傳遞身份。

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

當 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式同時啟用時，OpenClaw 會拒絕此種模糊的設定。混合權杖設定可能導致回送請求在錯誤的驗證路徑上靜默地進行驗證。

如果您在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除共用權杖，或
- 如果您打算使用基於權杖的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

回送 trusted-proxy 身份標頭仍會以封閉式失敗處理：同主機呼叫者不會被靜默驗證為 Proxy 使用者。繞過 Proxy 的內部 OpenClaw 呼叫者改為使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 進行驗證。在 trusted-proxy 模式中，刻意不支援 Token 備援。

## 操作員範圍標頭

Trusted-proxy 驗證是一種**承載身份** 的 HTTP 模式，因此呼叫者可選擇使用 `x-openclaw-scopes` 宣告操作員範圍。

注意：`x-openclaw-scopes` 僅適用於 HTTP 端點。WebSocket 範圍由 Gateway 協定握手和裝置身分綁定決定。關於 trusted-proxy 的 WebSocket 範圍行為，請參閱[控制 UI 配對行為](#control-ui-pairing-behavior)。

範例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行為：

- 當標頭存在時，OpenClaw 會遵從宣佈的範圍集。
- 當標頭存在但為空時，請求宣稱**沒有** 操作員範圍。
- 當標頭不存在時，一般的身分承載 HTTP API 會回退至標準操作員預設範圍集。
- Gateway-auth **外掛 HTTP 路由** 預設範圍更窄：當 `x-openclaw-scopes` 不存在時，其執行時範圍會回退至 `operator.write`。
- 源自瀏覽器的 HTTP 請求即使 trusted-proxy 驗證成功，仍必須通過 `gateway.controlUi.allowedOrigins`（或刻意啟用的 Host 標頭回退模式）。

實用規則：當您希望 trusted-proxy 請求範圍小於預設值，或是當 gateway-auth 外掛路由需要高於寫入 範圍的權限時，請明確發送 `x-openclaw-scopes`。

## 安全性檢查清單

啟用 trusted-proxy 驗證之前，請確認：

- [ ] **Proxy 為唯一路徑**：Gateway 連接埠已透過防火牆封鎖，僅允許您的 Proxy 存取。
- [ ] **trustedProxies 已最小化**：僅包含您實際的 Proxy IP，而非整個子網路。
- [ ] **回送 Proxy 來源是刻意設定的**：除非為同主機 Proxy 明確啟用 `gateway.auth.trustedProxy.allowLoopback`，否則來源為回送位址的請求將因 trusted-proxy 驗證而封閉式失敗。
- [ ] **Proxy strips headers**: 您的 Proxy 會覆寫（而非附加）來自用戶端的 `x-forwarded-*` 標頭。
- [ ] **TLS termination**: 您的 Proxy 處理 TLS；使用者透過 HTTPS 連線。
- [ ] **allowedOrigins is explicit**: 非本機迴路的 Control UI 使用明確的 `gateway.controlUi.allowedOrigins`。
- [ ] **allowUsers is set** (建議): 限制為已知使用者，而非允許任何已驗證的使用者。
- [ ] **No mixed token config**: 請勿同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **Local password fallback is private**: 若您為內部直接呼叫者設定 `gateway.auth.password`，請將 Gateway 連接埠設於防火牆內，以防止非 Proxy 的遠端用戶端直接連線。

## Security audit

`openclaw security audit` 會將受信任 Proxy 驗證標記為 **critical** 嚴重性發現。這是有意為之的 — 這是一項提醒，表示您將安全性委派給您的 Proxy 設定。

稽核會檢查以下項目：

- 基底 `gateway.trusted_proxy_auth` 警告/嚴重提醒
- 缺少 `trustedProxies` 設定
- 缺少 `userHeader` 設定
- 空的 `allowUsers` (允許任何已驗證的使用者)
- 針對同主機 Proxy 來源啟用了 `allowLoopback`
- 在暴露的 Control UI 介面上，有萬用字元或缺少瀏覽器來源原則

## Troubleshooting

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

    - Proxy IP 是否正確？（Docker 容器 IP 可能會變更。）
    - Proxy 前方是否有負載平衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 來找出實際 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒絕了一個來自來環回位址的可信代理請求。

    檢查：

    - 代理是否從 `127.0.0.1` / `::1` 連接？
    - 您是否試圖將可信代理驗證用於同主機環回反向代理？

    修復方法：

    - 對於不通過代理的內部同主機用戶端，優先使用 token/密碼驗證，或者
    - 透過非環回的可信代理位址進行路由並將該 IP 保留在 `gateway.trustedProxies` 中，或者
    - 對於刻意的同主機反向代理，設定 `gateway.auth.trustedProxy.allowLoopback = true`，將環回位址保留在 `gateway.trustedProxies` 中，並確保代理剝離或覆寫標頭。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用戶標頭為空或遺失。請檢查：

    - 您的代理是否設定為傳遞標頭？
    - 標頭名稱是否正確？（不區分大小寫，但拼寫很重要）
    - 用戶是否實際上已在代理處完成驗證？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    遺失必要的標頭。請檢查：

    - 您針對這些特定標頭的代理設定。
    - 標頭是否在鏈條的某處被剝離。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用戶已通過驗證，但不在 `allowUsers` 中。請將其加入，或者移除允許清單。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    可信代理驗證成功，但瀏覽器 `Origin` 標頭未通過控制 UI origin 檢查。

    檢查：

    - `gateway.controlUi.allowedOrigins` 包含確切的瀏覽器 origin。
    - 除非您有意要允許所有行為，否則不要依賴萬用字元 origin。
    - 如果您刻意使用 Host 標頭後援模式，則應刻意設定 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion title="Connection succeeds but methods report missing scope">
    WebSocket 已連接，但 `chat.history` 或 `sessions.list` 失敗並顯示
    `missing scope: operator.read`。

    對於沒有裝置身分的 trusted-proxy WebSocket 連線，這是預期的行為。缺少裝置身分的連線其範圍會被清除。
    瀏覽器無法透過純 HTTP 產生裝置身分。

    修正方法：

    - 設定 `gateway.controlUi.dangerouslyDisableDeviceAuth: true` 以在 trusted-proxy WebSocket 連線上保留操作員範圍，或
    - 使用裝置身分配對，讓範圍繫結至裝置權杖。

  </Accordion>
  <Accordion title="WebSocket still failing">
    請確保您的 Proxy：

    - 支援 WebSocket 升級 (`Upgrade: websocket`, `Connection: upgrade`)。
    - 在 WebSocket 升級請求上傳遞身分標頭（不僅是 HTTP）。
    - 針對 WebSocket 連線沒有個別的驗證路徑。

  </Accordion>
</AccordionGroup>

## 從權杖驗證遷移

如果您要從權杖驗證移轉至 trusted-proxy：

<Steps>
  <Step title="Configure the proxy">設定您的 Proxy 以驗證使用者並傳遞標頭。</Step>
  <Step title="Test the proxy independently">獨立測試 Proxy 設定（使用標頭的 curl）。</Step>
  <Step title="Update OpenClaw config">使用 trusted-proxy 驗證更新 OpenClaw 設定。</Step>
  <Step title="Restart the Gateway">重新啟動 Gateway。</Step>
  <Step title="Test WebSocket">從 Control UI 測試 WebSocket 連線。</Step>
  <Step title="Audit">執行 `openclaw security audit` 並檢閱結果。</Step>
</Steps>

## 相關

- [Configuration](/zh-Hant/gateway/configuration) — 設定參考
- [Remote access](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Security](/zh-Hant/gateway/security) — 完整安全性指南
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
