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

如果 `gateway.bind` 是 `loopback`，請在
`gateway.trustedProxies` 中包含一個 loopback proxy 位址（`127.0.0.1`、`::1` 或對等的 loopback CIDR）。

### 設定參考

| 欄位                                        | 必要 | 說明                                                     |
| ------------------------------------------- | ---- | -------------------------------------------------------- |
| `gateway.trustedProxies`                    | 是   | 受信任的 proxy IP 位址陣列。來自其他 IP 的請求會被拒絕。 |
| `gateway.auth.mode`                         | 是   | 必須為 `"trusted-proxy"`                                 |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已驗證使用者身分的標頭名稱                           |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 請求受信任時必須存在的額外標頭                           |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 使用者身分允許清單。留空表示允許所有已驗證的使用者。     |

## TLS 終止與 HSTS

使用一個 TLS 終止點並在此套用 HSTS。

### 建議模式：Proxy TLS 終止

當您的反向 proxy 處理 `https://control.example.com` 的 HTTPS 時，請在該網域的 proxy 上設定
`Strict-Transport-Security`。

- 適合面向網際網路的部署。
- 將憑證與 HTTP 加固政策保持在同一個地方。
- OpenClaw 可以留在 proxy 後方的 loopback HTTP 上。

標頭值範例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway TLS 終止

如果 OpenClaw 本身直接提供 HTTPS（無 TLS 終止 proxy），請設定：

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

### 推出指引

- 驗證流量時，請先從較短的 max age 開始（例如 `max-age=300`）。
- 只有在高度確信後，才增加到長期數值（例如 `max-age=31536000`）。
- 只有在每個子網域都準備好 HTTPS 時，才新增 `includeSubDomains`。
- 僅在您有意為整組網域符合預先載入要求時，才使用預先載入。
- 僅限 loopback 的本機開發環境不會受益於 HSTS。

## Proxy 設定範例

### Pomerium

Pomerium 會在 `x-pomerium-claim-email`（或其他聲明標頭）中傳遞身分，並在 `x-pomerium-jwt-assertion` 中傳遞 JWT。

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

### Caddy 搭配 OAuth

搭載 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身分標頭。

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

oauth2-proxy 驗證使用者並在 `x-auth-request-email` 中傳遞身分。

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

## 混合 Token 配置

OpenClaw 會拒絕同時啟用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式的模糊配置。混合 Token 配置可能會導致回送請求在錯誤的驗證路徑上被靜默驗證。

如果在啟動時看到 `mixed_trusted_proxy_token` 錯誤：

- 使用 trusted-proxy 模式時移除共用 Token，或
- 如果您打算使用基於 Token 的驗證，請將 `gateway.auth.mode` 切換為 `"token"`。

回送 trusted-proxy 驗證也會失敗關閉：同主機呼叫者必須透過受信任的 Proxy 提供設定的標頭，而不是被靜默驗證。

## 安全檢查清單

啟用 trusted-proxy 驗證之前，請驗證：

- [ ] **Proxy 是唯一路徑**：Gateway 連接埠已設定防火牆，僅允許您的 Proxy 存取
- [ ] **trustedProxies 是最少的**：僅包含您實際的 Proxy IP，而非整個子網路
- [ ] **Proxy 剝離標頭**：您的 Proxy 覆寫（而非附加）來自用戶端的 `x-forwarded-*` 標頭
- [ ] **TLS 終止**：您的 Proxy 處理 TLS；使用者透過 HTTPS 連線
- [ ] **已設定 allowUsers**（建議）：限制為已知使用者，而非允許任何通過驗證的人
- [ ] **無混合 Token 配置**：不要同時設定 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`

## 安全稽核

`openclaw security audit` 將以 **嚴重** 嚴重性標記 trusted-proxy 驗證。這是刻意為之 — 這是一個提醒，表示您將安全性委派給了您的 Proxy 設定。

稽核檢查項目包括：

- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 為空（允許任何已驗證的使用者）

## 疑難排解

### "trusted_proxy_untrusted_source"

請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

- Proxy IP 是否正確？（Docker 容器 IP 可能會變更）
- 您的 Proxy 前面是否有負載平衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 尋找實際 IP

### "trusted_proxy_user_missing"

使用者標頭為空或遺失。請檢查：

- 您的 Proxy 是否設定為傳遞識別標頭？
- 標頭名稱是否正確？（不區分大小寫，但拼寫很重要）
- 用戶是否實際上已通過代理驗證？

### "trusted*proxy_missing_header*\*"

缺少必要的標頭。請檢查：

- 您針對這些特定標頭的代理配置
- 標頭是否在鏈路的某處被剝離

### "trusted_proxy_user_not_allowed"

用戶已通過驗證但不在 `allowUsers` 中。請將其加入或移除允許列表。

### WebSocket 仍然失敗

請確保您的代理：

- 支援 WebSocket 升級（`Upgrade: websocket`、`Connection: upgrade`）
- 在 WebSocket 升級請求上傳遞身分標頭（而不僅僅是 HTTP）
- 沒有針對 WebSocket 連接的單獨驗證路徑

## 從 Token 驗證遷移

如果您正在從 token 驗證遷移到 trusted-proxy：

1. 配置您的代理以驗證用戶並傳遞標頭
2. 獨立測試代理設置（使用帶標頭的 curl）
3. 使用 trusted-proxy 驗證更新 OpenClaw 配置
4. 重啟 Gateway
5. 從 Control UI 測試 WebSocket 連接
6. 運行 `openclaw security audit` 並檢查發現結果

## 相關

- [安全性](/en/gateway/security) — 完整安全指南
- [配置](/en/gateway/configuration) — 配置參考
- [遠端存取](/en/gateway/remote) — 其他遠端存取模式
- [Tailscale](/en/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案
