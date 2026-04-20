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

### 組態參考

| 欄位                                        | 必填 | 說明                                                   |
| ------------------------------------------- | ---- | ------------------------------------------------------ |
| `gateway.trustedProxies`                    | 是   | 要信任的代理 IP 位址陣列。來自其他 IP 的請求將被拒絕。 |
| `gateway.auth.mode`                         | 是   | 必須為 `"trusted-proxy"`                               |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已驗證使用者身份的標頭名稱                         |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 請求要被信任必須存在的額外標頭                         |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 使用者身份允許清單。空值表示允許所有已驗證的使用者。   |

## TLS 終止與 HSTS

使用一個 TLS 終止點並在那裡套用 HSTS。

### 建議模式：代理 TLS 終止

當您的反向代理處理 `https://control.example.com` 的 HTTPS 時，請
在該網域的代理上設定 `Strict-Transport-Security`。

- 非常適合面向網際網路的部署。
- 將憑證和 HTTP 強化策略保持在同一個地方。
- OpenClaw 可以停留在代理後方的回環 HTTP 上。

標頭值範例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 閘道 TLS 終止

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

`strictTransportSecurity` 接受字串標頭值，或接受 `false` 以明確停用。

### 推出指引

- 驗證流量時，請先從較短的有效期限開始（例如 `max-age=300`）。
- 只有在信心充足後，才增加為長效數值（例如 `max-age=31536000`）。
- 僅當每個子網域都準備好使用 HTTPS 時，才新增 `includeSubDomains`。
- 僅當您有意為完整的網域集合滿足預載要求時，才使用預載。
- 僅限回環的本機開發無法從 HSTS 獲益。

## 代理設置範例

### Pomerium

Pomerium 會在 `x-pomerium-claim-email` （或其他聲明標頭）以及 `x-pomerium-jwt-assertion` 中的 JWT 傳遞身分資訊。

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

### nginx + oauth2-proxy

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

### 使用 Forward Auth 的 Traefik

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

## 混合 Token 設定

OpenClaw 會拒絕同時啟用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式的模稜兩可設定。混合 Token 設定可能會導致回送請求在錯誤的驗證路徑上以靜默方式通過驗證。

如果您在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除共用 Token，或
- 如果您打算使用基於 Token 的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

回送 trusted-proxy 驗證也會以封閉方式失敗：相同主機的呼叫者必須透過受信任的 Proxy 提供設定的身分標頭，而不是被靜默驗證。

## 操作員範圍標頭

Trusted-proxy 驗證是一種**攜帶身分** 的 HTTP 模式，因此呼叫者可以選擇使用 `x-openclaw-scopes` 宣告操作員範圍。

範例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行為：

- 當標頭存在時，OpenClaw 會遵守宣告的範圍集合。
- 當標頭存在但為空時，請求會宣告**沒有** 操作員範圍。
- 當標頭不存在時，正常的攜帶身分 HTTP API 會回退到標準的操作員預設範圍集合。
- Gateway-auth **外掛程式 HTTP 路由** 預設更為嚴格：當 `x-openclaw-scopes` 不存在時，其執行時間範圍會回退至 `operator.write`。
- 瀏覽器來源的 HTTP 請求即使是在 trusted-proxy 驗證成功後，仍然必須通過 `gateway.controlUi.allowedOrigins`（或刻意設定的 Host 標頭回退模式）。

實用規則：

- 當您希望受信任代理請求比預設值更嚴格，或者當 gateway-auth 外掛路由需要比寫入權限更強的權限時，請明確發送 `x-openclaw-scopes`。

## 安全檢查清單

在啟用受信任代理驗證之前，請驗證：

- [ ] **代理是唯一路徑**：Gateway 連接埠已設有防火牆，僅允許您的代理存取
- [ ] **trustedProxies 極小化**：僅包含您實際的 IP，而非整個子網路
- [ ] **無回送代理來源**：受信任代理驗證對來自回送的請求採取「失敗關閉」策略
- [ ] **代理剝除標頭**：您的代理覆寫（而非附加）來自客戶端的 `x-forwarded-*` 標頭
- [ ] **TLS 終止**：您的代理處理 TLS；使用者透過 HTTPS 連線
- [ ] **allowedOrigins 已明確指定**：非回送 Control UI 使用明確指定的 `gateway.controlUi.allowedOrigins`
- [ ] **已設定 allowUsers**（建議）：限制為已知使用者，而不是允許任何通過驗證的人
- [ ] **無混合權杖配置**：請勿同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`

## 安全稽核

`openclaw security audit` 會將受信任代理驗證標記為 **嚴重** 等級的發現。這是有意為之的——這是一項提醒，表示您將安全性委託給了您的代理設定。

稽核會檢查以下項目：

- 基本 `gateway.trusted_proxy_auth` 警告/嚴重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 為空（允許任何通過驗證的使用者）
- 暴露的 Control UI 介面上使用萬用字元或缺少瀏覽器來源政策

## 疑難排解

### "trusted_proxy_untrusted_source"

請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

- 代理 IP 是否正確？（Docker 容器 IP 可能會變更）
- 您的代理前方是否有負載平衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 來尋找實際 IP

### "trusted_proxy_loopback_source"

OpenClaw 拒絕了來自回送來源的受信任代理請求。

檢查：

- 代理是否從 `127.0.0.1` / `::1` 連線？
- 您是否嘗試將受信任代理驗證與同主機回送反向代理搭配使用？

修正方法：

- 對於相同主機的迴圈代理設定，請使用權杖/密碼驗證，或
- 透過非迴路的受信任代理位址進行路由，並將該 IP 保留在 `gateway.trustedProxies` 中。

### "trusted_proxy_user_missing"

使用者標頭為空白或遺失。請檢查：

- 您的代理是否設定為傳遞身份標頭？
- 標頭名稱是否正確？（不區分大小寫，但拼寫很重要）
- 使用者是否實際上已在代理處通過驗證？

### "trusted*proxy_missing_header*\*"

缺少必要的標頭。請檢查：

- 您對這些特定標頭的代理設定
- 標頭是否在鏈結中的某個位置被移除

### "trusted_proxy_user_not_allowed"

使用者已通過驗證，但不在 `allowUsers` 中。請將其加入或移除允許清單。

### "trusted_proxy_origin_not_allowed"

受信任代理驗證成功，但瀏覽器 `Origin` 標頭未通過控制 UI 來源檢查。

請檢查：

- `gateway.controlUi.allowedOrigins` 包含確切的瀏覽器來源
- 除非您有意要允許所有行為，否則請勿依賴萬用字元來源
- 如果您有意使用 Host 標頭備用模式，則有意設定了 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`

### WebSocket 仍然失敗

確保您的代理：

- 支援 WebSocket 升級（`Upgrade: websocket`，`Connection: upgrade`）
- 在 WebSocket 升級請求上傳遞身份標頭（不僅僅是 HTTP）
- 沒有針對 WebSocket 連線的單獨驗證路徑

## 從權杖驗證遷移

如果您正在從權杖驗證移轉至受信任代理：

1. 設定您的代理以驗證使用者並傳遞標頭
2. 獨立測試代理設定（使用帶有標頭的 curl）
3. 使用受信任代理驗證更新 OpenClaw 設定
4. 重新啟動閘道
5. 從控制 UI 測試 WebSocket 連線
6. 執行 `openclaw security audit` 並檢視結果

## 相關

- [安全性](/zh-Hant/gateway/security) — 完整的安全性指南
- [設定](/zh-Hant/gateway/configuration) — 設定參考
- [遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
