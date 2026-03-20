---
summary: "將閘道驗證委派給受信任的反向代理伺服器 (Pomerium, Caddy, nginx + OAuth)"
read_when:
  - 在身分感知代理伺服器後運行 OpenClaw
  - 在 OpenClaw 前設定 Pomerium、Caddy 或使用 OAuth 的 nginx
  - 修復反向代理設置中的 WebSocket 1008 未授權錯誤
  - 決定在哪裡設定 HSTS 和其他 HTTP 加固標頭
---

# 受信任代理驗證

> ⚠️ **安全敏感性功能。** 此模式將驗證完全委派給您的反向代理伺服器。錯誤的配置可能會將您的閘道暴露給未授權的存取。啟用前請仔細閱讀此頁面。

## 何時使用

在以下情況使用 `trusted-proxy` 驗證模式：

- 您在 **身分感知代理伺服器** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + forward auth) 後運行 OpenClaw
- 您的代理伺服器處理所有驗證並透過標頭傳遞使用者身分
- 您處於 Kubernetes 或容器環境中，且代理伺服器是通往閘道的唯一路徑
- 您遇到 WebSocket `1008 unauthorized` 錯誤，因為瀏覽器無法在 WS 載荷中傳遞權杖

## 何時不使用

- 如果您的代理伺服器不驗證使用者 (僅作為 TLS 終止器或負載平衡器)
- 如果存在任何繞過代理伺服器通往閘道的路徑 (防火牆漏洞、內部網路存取)
- 如果您不確定您的代理伺服器是否正確移除/覆寫轉送標頭
- 如果您只需要個人單一使用者存取 (考慮使用 Tailscale Serve + loopback 以獲得更簡單的設置)

## 運作原理

1. 您的反向代理伺服器驗證使用者 (OAuth, OIDC, SAML 等)
2. 代理伺服器新增一個包含已驗證使用者身分的標頭 (例如 `x-forwarded-user: nick@example.com`)
3. OpenClaw 檢查請求是否來自 **受信任的代理 IP** (在 `gateway.trustedProxies` 中配置)
4. OpenClaw 從配置的標頭中提取使用者身分
5. 如果一切檢查無誤，請求即獲授權

## 控制 UI 配對行為

當 `gateway.auth.mode = "trusted-proxy"` 啟用且請求通過
受信任代理檢查時，控制 UI WebSocket 工作階段可以在沒有裝置
配對身分的情況下連線。

影響：

- 在此模式下，配對不再是控制 UI 存取的主要閘門。
- 您的反向代理驗證政策和 `allowUsers` 成為有效的存取控制。
- 將閘道連入鎖定為僅限受信任的 Proxy IP（`gateway.trustedProxies` + 防火牆）。

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

如果 `gateway.bind` 為 `loopback`，請在 `gateway.trustedProxies` 中包含一個 loopback proxy 位址（`127.0.0.1`、`::1` 或等效的 loopback CIDR）。

### 設定參考

| 欄位                                        | 必要 | 說明                                                     |
| ------------------------------------------- | ---- | -------------------------------------------------------- |
| `gateway.trustedProxies`                    | 是   | 要信任的 Proxy IP 位址陣列。來自其他 IP 的請求會被拒絕。 |
| `gateway.auth.mode`                         | 是   | 必須為 `"trusted-proxy"`                                 |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已驗證使用者身分的標頭名稱                           |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 請求受信任必須存在的其他標頭                             |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 使用者身分白名單。空白表示允許所有已驗證的使用者。       |

## TLS 終止與 HSTS

使用一個 TLS 終止點並在那裡套用 HSTS。

### 建議模式：Proxy TLS 終止

當您的反向 Proxy 處理 `https://control.example.com` 的 HTTPS 時，請在該網域的 Proxy 上設定 `Strict-Transport-Security`。

- 非常適合面向網際網路的部署。
- 將憑證 + HTTP 強化原則保持在同一個地方。
- OpenClaw 可以保持在 Proxy 後方的 loopback HTTP 上。

標頭值範例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 閘道 TLS 終止

如果 OpenClaw 本身直接提供 HTTPS（無 TLS 終止 Proxy），請設定：

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

`strictTransportSecurity` 接受字串標頭值，或是 `false` 以明確停用。

### 推出指引

- 首先從較短的有效期限開始（例如 `max-age=300`），同時驗證流量。
- 只有在高度確認後，才增加為長效數值（例如 `max-age=31536000`）。
- 僅當每個子網域都已準備好使用 HTTPS 時，才新增 `includeSubDomains`。
- 僅當您有意為完整的網域集符合預載要求時，才使用預載。
- 僅限 loopback 的本機開發不會受益於 HSTS。

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

搭配 `caddy-security` 插件的 Caddy 可以驗證使用者並傳遞身分標頭。

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

- [ ] **Proxy is the only path**：Gateway 連接埠已設有防火牆，僅允許您的 Proxy 存取
- [ ] **trustedProxies is minimal**：僅包含您實際的 Proxy IP，而非整個子網路
- [ ] **Proxy strips headers**：您的 Proxy 會覆寫（而非附加）來自用戶端的 `x-forwarded-*` 標頭
- [ ] **TLS termination**：您的 Proxy 處理 TLS；使用者透過 HTTPS 連線
- [ ] **allowUsers is set** (建議)：限制為已知的使用者，而非允許任何已驗證的人

## 安全性稽核

`openclaw security audit` 會將 trusted-proxy auth 標記為 **critical** 嚴重性發現。這是有意為之的 —— 這是在提醒您將安全性委派給您的 Proxy 設定。

稽核會檢查：

- 缺少 `trustedProxies` 設定
- 缺少 `userHeader` 設定
- `allowUsers` 為空（允許任何已驗證的使用者）

## 疑難排解

### "trusted_proxy_untrusted_source"

請求並非來自 `gateway.trustedProxies` 中的 IP。請檢查：

- Proxy IP 是否正確？（Docker 容器 IP 可能會變更）
- 您的 Proxy 前面是否有負載平衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 來找出實際 IP

### "trusted_proxy_user_missing"

使用者標頭為空或遺失。請檢查：

- 您的 Proxy 是否設定為傳遞身分標頭？
- 標頭名稱是否正確？（不區分大小寫，但拼字很重要）
- 使用者實際上是否已在 Proxy 處完成驗證？

### "trusted*proxy_missing_header*\*"

遺失必要的標頭。請檢查：

- 您針對這些特定標頭的 Proxy 設定
- 標頭是否在鏈結中的某處被移除

### "trusted_proxy_user_not_allowed"

使用者已通過驗證，但不在 `allowUsers` 中。請將其加入或移除允許清單。

### WebSocket 仍然失敗

請確保您的 Proxy：

- 支援 WebSocket 升級 (`Upgrade: websocket`, `Connection: upgrade`)
- 在 WebSocket 升級請求上傳遞身份標頭 (不僅限於 HTTP)
- WebSocket 連線沒有單獨的驗證路徑

## 從 Token 驗證遷移

如果您正在從 token 驗證移轉到 trusted-proxy：

1. 設定您的代理以驗證使用者並傳遞標頭
2. 獨立測試代理設定 (使用標頭的 curl)
3. 使用 trusted-proxy 驗證更新 OpenClaw 設定
4. 重新啟動 Gateway
5. 從控制 UI 測試 WebSocket 連線
6. 執行 `openclaw security audit` 並檢視結果

## 相關

- [安全性](/zh-Hant/gateway/security) — 完整的安全指南
- [設定](/zh-Hant/gateway/configuration) — 設定參考
- [遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Tailscale](/zh-Hant/gateway/tailscale) — 僅限 tailnet 存取的更簡單替代方案

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
