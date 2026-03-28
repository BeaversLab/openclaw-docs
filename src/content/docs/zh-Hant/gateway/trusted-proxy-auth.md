---
title: "可信任的 Proxy 驗證"
summary: "將 Gateway 驗證委派給可信任的反向 Proxy (Pomerium、Caddy、nginx + OAuth)"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# 可信任的 Proxy 驗證

> ⚠️ **安全敏感性功能。** 此模式將驗證完全委派給您的反向 Proxy。設定錯誤可能會將您的 Gateway 暴露在未經授權的存取下。啟用前請仔細閱讀此頁面。

## 使用時機

在以下情況使用 `trusted-proxy` 驗證模式：

- 您在 **身分識別感知 Proxy** (Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth) 後方執行 OpenClaw
- 您的 Proxy 處理所有驗證並透過標頭傳遞使用者身分識別
- 您處於 Kubernetes 或容器環境中，且 Proxy 是通往 Gateway 的唯一途徑
- 您遇到 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 負載中傳遞令牌

## 何時不使用

- 如果您的代理不驗證用戶身份（僅作為 TLS 終結器或負載平衡器）
- 如果存在任何繞過代理訪問 Gateway 的路徑（防火牆漏洞、內部網絡訪問）
- 如果您不確定您的代理是否正確剝除/覆蓋轉發的標頭
- 如果您只需要個人單用戶訪問（考慮使用 Tailscale Serve + loopback 以獲得更簡單的設置）

## 工作原理

1. 您的反向代理對用戶進行身份驗證（OAuth、OIDC、SAML 等）
2. 代理添加一個包含已驗證用戶身份的標頭（例如 `x-forwarded-user: nick@example.com`）
3. OpenClaw 檢查請求是否來自**受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）
4. OpenClaw 從配置的標頭中提取用戶身份
5. 如果一切檢查通過，該請求即被授權

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 處於啟用狀態且請求通過
受信任 proxy 檢查時，控制 UI WebSocket 會話可以在沒有設備
配對身分的情況下連接。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要門檻。
- 您的反向 proxy 驗證政策和 `allowUsers` 成為實際的存取控制。
- 請確保僅將閘道入口鎖定為受信任的 proxy IP（`gateway.trustedProxies` + 防火牆）。

## 組態

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

如果 `gateway.bind` 為 `loopback`，請在
`gateway.trustedProxies` 中包含一個迴路 proxy 位址
（`127.0.0.1`、`::1` 或等效的迴路 CIDR）。

### 組態參考

| 欄位                                        | 必要 | 說明                                                   |
| ------------------------------------------- | ---- | ------------------------------------------------------ |
| `gateway.trustedProxies`                    | 是   | 要信任的代理 IP 位址陣列。來自其他 IP 的請求會被拒絕。 |
| `gateway.auth.mode`                         | 是   | 必須為 `"trusted-proxy"`                               |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已驗證使用者身分的標頭名稱                         |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 請求被信任時必須存在的額外標頭                         |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 使用者身分白名單。留空表示允許所有已驗證的使用者。     |

## TLS 終止與 HSTS

使用一個 TLS 終止點並在此處套用 HSTS。

### 建議模式：代理 TLS 終止

當您的反向代理為 `https://control.example.com` 處理 HTTPS 時，請在該網域的代理上設定
`Strict-Transport-Security`。

- 適合面對網際網路的部署。
- 將憑證 + HTTP 加固政策保持在同一處。
- OpenClaw 可以保留在代理後方的 loopback HTTP 上。

標頭值範例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway TLS 終止

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

### 推出指引

- 在驗證流量時，首先使用較短的最大使用期限（例如 `max-age=300`）。
- 只有在信心充足後，才增加到長效數值（例如 `max-age=31536000`）。
- 僅當每個子網域都準備好 HTTPS 時，才新增 `includeSubDomains`。
- 只有在您刻意為整個網域集符合預載要求時，才使用預載。
- 僅限迴路的本機開發無法從 HSTS 獲益。

## 代理設定範例

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

使用 `caddy-security` 外掛程式的 Caddy 可以驗證使用者並傳遞身分標頭。

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

Caddyfile 程式碼片段：

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

## 安全性檢查清單

啟用 trusted-proxy auth 之前，請驗證：

- [ ] **Proxy is the only path**：Gateway 連接埠已設防火牆，僅允許您的代理伺服器存取
- [ ] **trustedProxies is minimal**：僅包含您實際的 Proxy IP，而非整個子網路
- [ ] **Proxy strips headers**：您的代理伺服器會覆寫（而非附加）來自客戶端的 `x-forwarded-*` 標頭
- [ ] **TLS termination**：您的代理伺服器處理 TLS；使用者透過 HTTPS 連線
- [ ] **allowUsers is set**（建議）：限制為已知使用者，而非允許任何經過驗證的人

## 安全性稽核

`openclaw security audit` 會將受信任代理程式驗證標記為 **critical** （重大）嚴重性發現。這是有意的 — 它是在提醒您，您正將安全性委派給您的代理程式設定。

稽核會檢查：

- 缺少 `trustedProxies` 設定
- 缺少 `userHeader` 設定
- 空值 `allowUsers` （允許任何已驗證的使用者）

## 疑難排解

### "trusted_proxy_untrusted_source"

請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

- 代理程式 IP 是否正確？（Docker 容器 IP 可能會改變）
- 您的代理程式前方是否有負載平衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 來找出實際 IP

### "trusted_proxy_user_missing"

使用者標頭為空白或遺失。請檢查：

- 您的代理程式是否已設定為傳遞識別標頭？
- 標頭名稱是否正確？（不區分大小寫，但拼寫很重要）
- 使用者是否實際上已在代理伺服器通過驗證？

### "trusted*proxy_missing_header*\*"

缺少必要的標頭。請檢查：

- 您針對這些特定標頭的代理伺服器設定
- 標頭是否在鏈路中的某個位置被移除

### "trusted_proxy_user_not_allowed"

使用者已通過驗證，但不在 `allowUsers` 中。請將其加入，或移除允許清單。

### WebSocket 仍然失敗

請確保您的代理伺服器：

- 支援 WebSocket 升級（`Upgrade: websocket`、`Connection: upgrade`）
- 在 WebSocket 升級請求上傳遞身分標頭（而不僅僅是 HTTP）
- 沒有為 WebSocket 連線設置單獨的驗證路徑

## 從 Token Auth 遷移

如果您正在從 token auth 遷移到 trusted-proxy：

1. 設定您的代理伺服器以驗證使用者並傳遞標頭
2. 獨立測試代理設定（使用帶有標頭的 curl）
3. 使用 trusted-proxy auth 更新 OpenClaw 設定
4. 重新啟動 Gateway
5. 從 Control UI 測試 WebSocket 連線
6. 執行 `openclaw security audit` 並檢查結果

## 相關

- [Security](/zh-Hant/gateway/security) — 完整的安全指南
- [Configuration](/zh-Hant/gateway/configuration) — 設定參考
- [Remote Access](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅用於 tailnet 存取的更簡單替代方案
