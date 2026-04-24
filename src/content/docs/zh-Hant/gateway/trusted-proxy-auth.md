---
title: "Trusted Proxy Auth"
summary: "將閘道驗證委派給受信任的反向 Proxy (Pomerium, Caddy, nginx + OAuth)"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# Trusted Proxy Auth

> ⚠️ **安全敏感功能。** 此模式會將驗證完全委派給您的反向 Proxy。設定錯誤可能會導致您的閘道暴露於未經授權的存取。啟用前請仔細閱讀此頁面。

## 何時使用

在以下情況使用 `trusted-proxy` 驗證模式：

- 您在 **身分感知 Proxy** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + forward auth) 後方執行 OpenClaw
- 您的 Proxy 處理所有驗證並透過標頭傳遞使用者身分
- 您處於 Kubernetes 或容器環境中，且 Proxy 是存取閘道的唯一路徑
- 您遇到 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 資料酬載中傳遞權杖

## 何時不使用

- 如果您的 Proxy 不驗證使用者 (僅作為 TLS 終止器或負載平衡器)
- 如果有任何繞過 Proxy 的路徑可以存取閘道 (防火牆漏洞、內部網路存取)
- 如果您不確定您的 Proxy 是否正確清除/覆寫轉送標頭
- 如果您只需要個人單一使用者存取 (考慮使用 Tailscale Serve + loopback 以獲得更簡單的設定)

## 運作方式

1. 您的反向 Proxy 驗證使用者 (OAuth, OIDC, SAML 等)
2. Proxy 新增一個包含已驗證使用者身分的標頭 (例如 `x-forwarded-user: nick@example.com`)
3. OpenClaw 檢查請求是否來自 **受信任的 Proxy IP** (在 `gateway.trustedProxies` 中設定)
4. OpenClaw 從設定的標頭中提取使用者身分
5. 如果一切檢查無誤，請求即獲授權

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 啟用且請求通過
trusted-proxy 檢查時，控制 UI WebSocket 連線可以無需裝置
配對身分即可連接。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要閘門。
- 您的反向 Proxy 驗證原則和 `allowUsers` 成為有效的存取控制。
- 請確保閘道入口僅鎖定來自信任 Proxy IP 的流量 (`gateway.trustedProxies` + 防火牆)。

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

重要的運行時規則：

- 受信任的代理驗證會拒絕來自回環來源的請求（`127.0.0.1`、`::1`、回環 CIDR）。
- 同主機回環反向代理**不**滿足受信任代理驗證。
- 對於同主機回環代理設置，請改用權杖/密碼驗證，或透過 OpenClaw 可以驗證的非回環受信任代理位址進行路由。
- 非回環控制 UI 部署仍需要明確的 `gateway.controlUi.allowedOrigins`。
- **Forwarded-header 證據會覆蓋 loopback 本地性。** 如果請求在 loopback 上到達，但帶有指向非本地來源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 標頭，該證據將使 loopback 本地性宣告失效。對於配對、trusted-proxy auth 和 Control UI 裝置身分閘道，該請求將被視為遠端請求。這可以防止同主機 loopback 代理程式將 forwarded-header 身分偽裝成 trusted-proxy auth。

### 設定參考

| 欄位                                        | 必要 | 說明                                                   |
| ------------------------------------------- | ---- | ------------------------------------------------------ |
| `gateway.trustedProxies`                    | 是   | 要信任的代理 IP 位址陣列。來自其他 IP 的請求將被拒絕。 |
| `gateway.auth.mode`                         | 是   | 必須為 `"trusted-proxy"`                               |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已驗證使用者身分的標頭名稱                         |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 請求要被信任必須存在的額外標頭                         |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 使用者身分白名單。空白表示允許所有已驗證的使用者。     |

## TLS 終止與 HSTS

使用一個 TLS 終止點並在該處套用 HSTS。

### 建議模式：代理 TLS 終止

當您的反向代理程式處理 `https://control.example.com` 的 HTTPS 時，請在該網域的代理程式上設定
`Strict-Transport-Security`。

- 適合面對網際網路的部署。
- 將憑證 + HTTP 強化原則保持在同一個地方。
- OpenClaw 可以停留在代理程式後方的 loopback HTTP 上。

標頭值範例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway TLS 終止

如果 OpenClaw 本身直接提供 HTTPS（沒有 TLS 終止代理程式），請設定：

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

`strictTransportSecurity` 接受字串標頭值，或使用 `false` 明確停用。

### 逐步推出指引

- 首先從較短的有效期限開始（例如 `max-age=300`），同時驗證流量。
- 只有在高度確定之後，才增加到長效數值（例如 `max-age=31536000`）。
- 只有在每個子網域都準備好 HTTPS 時，才新增 `includeSubDomains`。
- 只有當您有意為完整網域集符合預載要求時，才使用預載。
- 僅限 loopback 的本機開發無法從 HSTS 獲益。

## 代理設定範例

### Pomerium

Pomerium 會在 `x-pomerium-claim-email` （或其他 claim headers）中傳遞身份，並在 `x-pomerium-jwt-assertion` 中傳遞 JWT。

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

### 使用 OAuth 的 Caddy

具有 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身份標頭。

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

oauth2-proxy 會驗證使用者並在 `x-auth-request-email` 中傳遞身份。

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

### Traefik 搭配 Forward Auth

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

## 混合 token 設定

OpenClaw 會拒絕同時啟用 `gateway.auth.token` （或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式的模糊設定。混合 token 設定可能會導致回送請求在錯誤的驗證路徑上無聲地通過驗證。

如果您在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除 shared token，或
- 如果您打算使用基於 token 的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

回送 trusted-proxy 驗證也會封閉式失敗：相同主機的呼叫者必須透過受信任的 proxy 提供設定的身份標頭，而不是被無聲地驗證。

## 操作員 scopes 標頭

Trusted-proxy 驗證是一種 **攜帶身份** 的 HTTP 模式，因此呼叫者可以選擇使用 `x-openclaw-scopes` 宣告操作員 scopes。

範例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行為：

- 當標頭存在時，OpenClaw 會遵守宣告的 scope 集。
- 當標頭存在但為空時，請求宣告 **沒有** 操作員 scopes。
- 當標頭不存在時，正常的攜帶身份 HTTP API 會回退到標準的操作員預設 scope 集。
- Gateway-auth **外掛程式 HTTP 路由** 預設範圍更窄：當 `x-openclaw-scopes` 不存在時，其執行時 scope 會回退到 `operator.write`。
- 瀏覽器來源的 HTTP 請求即使在 trusted-proxy 驗證成功後，仍必須通過 `gateway.controlUi.allowedOrigins` （或刻意的 Host 標頭回退模式）。

實用規則：

- 當您希望受信任代理請求的範圍比預設更窄，或者當 gateway-auth 外掛路由需要比寫入權限更強的權限時，請明確發送 `x-openclaw-scopes`。

## 安全檢查清單

啟用受信任代理驗證之前，請驗證：

- [ ] **代理是唯一路徑**：Gateway 連接埠已透過防火牆保護，僅允許您的代理存取
- [ ] **trustedProxies 是最小的**：僅包含您實際的代理 IP，而非整個子網路
- [ ] **無回送代理來源**：受信任代理驗證對於來源為回送的請求會以「拒絕存取」方式失敗
- [ ] **代理移除標頭**：您的代理會覆寫（而非附加）用戶端的 `x-forwarded-*` 標頭
- [ ] **TLS 終止**：您的代理處理 TLS；使用者透過 HTTPS 連線
- [ ] **allowedOrigins 是明確的**：非回送控制 UI 使用明確的 `gateway.controlUi.allowedOrigins`
- [ ] **已設定 allowUsers**（建議）：限制為已知使用者，而非允許任何通過驗證的使用者
- [ ] **無混合 token 配置**：請勿同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`

## 安全稽核

`openclaw security audit` 將標記受信任代理驗證為 **嚴重** 等級的發現。這是刻意為之 — 這是一項提醒，表示您正在將安全性委派給您的代理設定。

稽核會檢查：

- 基本 `gateway.trusted_proxy_auth` 警告/嚴重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- 空的 `allowUsers`（允許任何經過驗證的使用者）
- 公開的控制 UI 介面上有萬用字元或缺少瀏覽器來源政策

## 疑難排解

### "trusted_proxy_untrusted_source"

請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

- 代理 IP 是否正確？（Docker 容器 IP 可能會變更）
- 您的代理前方是否有負載平衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 來找出實際 IP

### "trusted_proxy_loopback_source"

OpenClaw 拒絕了來源為回送的受信任代理請求。

檢查：

- 代理是否從 `127.0.0.1` / `::1` 連線？
- 您是否嘗試在相同主機上使用回送反向代理來使用受信任代理驗證？

修正方法：

- 對於同主機迴路代理設定，請使用權杖/密碼驗證，或者
- 透過非迴路的受信任代理位址路由，並將該 IP 保留在 `gateway.trustedProxies` 中。

### "trusted_proxy_user_missing"

使用者標頭為空白或遺失。請檢查：

- 您的代理是否設定為傳遞身份標頭？
- 標頭名稱是否正確？（不區分大小寫，但拼字很重要）
- 使用者實際上是否已在代理處完成驗證？

### "trusted*proxy_missing_header*\*"

缺少必要的標頭。請檢查：

- 您針對這些特定標頭的代理設定
- 標頭是否在鏈結中的某個地方被移除

### "trusted_proxy_user_not_allowed"

使用者已通過驗證，但不在 `allowUsers` 中。請將其加入或移除允許清單。

### "trusted_proxy_origin_not_allowed"

受信任代理驗證成功，但瀏覽器 `Origin` 標頭未通過 Control UI 來源檢查。

請檢查：

- `gateway.controlUi.allowedOrigins` 包含確切的瀏覽器來源
- 除非您有意允許所有行為，否則請勿依賴萬用字元來源
- 如果您有意使用 Host 標頭後援模式，`gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 已經刻意設定

### WebSocket 仍然失敗

請確保您的代理：

- 支援 WebSocket 升級（`Upgrade: websocket`、`Connection: upgrade`）
- 在 WebSocket 升級請求上傳遞身份標頭（不僅僅是 HTTP）
- 沒有針對 WebSocket 連線的個別驗證路徑

## 從權杖驗證遷移

如果您要從權杖驗證轉移到受信任代理驗證：

1. 設定您的代理以驗證使用者並傳遞標頭
2. 獨立測試代理設定（使用帶有標頭的 curl）
3. 使用受信任代理驗證更新 OpenClaw 設定
4. 重新啟動 Gateway
5. 從 Control UI 測試 WebSocket 連線
6. 執行 `openclaw security audit` 並檢查結果

## 相關

- [安全性](/zh-Hant/gateway/security) — 完整的安全指南
- [設定](/zh-Hant/gateway/configuration) — 設定參考
- [遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
