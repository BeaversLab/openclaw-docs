---
summary: "將 OpenClaw Gateway 暴露至 loopback 之外前的飛行檢查與回滾檢查清單"
title: "Gateway 暴露手冊"
sidebarTitle: "暴露手冊"
read_when:
  - Exposing the Gateway over LAN, tailnet, Tailscale Serve, Funnel, or a reverse proxy
  - Reviewing a deployment before allowing real messaging users
  - Rolling back a risky remote access or DM configuration
---

<Warning>只有在您能說明誰可以存取 Gateway、他們如何進行驗證、他們可以觸發哪些 Agent，以及這些 Agent 可以使用哪些工具之後，才暴露 Gateway。如果有疑問，請恢復僅限 loopback 的存取並重新執行稽核。</Warning>

本手冊將更廣泛的 [安全性](/zh-Hant/gateway/security) 指引轉化為遠端存取和訊息暴露的操作員檢查清單。

## 選擇暴露模式

優先選擇滿足工作流程的最狹窄模式。

| 模式                       | 建議時機                                      | 必要管制措施                                                                       |
| -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Loopback + SSH tunnel      | 個人使用、管理員存取、偵錯                    | 保持 `gateway.bind: "loopback"` 並透過 tunnel `127.0.0.1:18789`                    |
| Loopback + Tailscale Serve | 針對 Control UI/WebSocket 的個人 tailnet 存取 | 保持 Gateway 僅限 loopback；僅針對支援的介面依賴 Tailscale 身份標頭                |
| Tailnet/LAN bind           | 具備已知裝置的專用私人網路                    | Gateway 驗證、防火牆允許清單、無公開埠口轉發                                       |
| 受信任的反向 Proxy         | Gateway 前方的組織 SSO/OIDC                   | `trusted-proxy` 驗證、嚴格的 `trustedProxies`、標頭覆寫/移除規則、明確的允許使用者 |
| 公開網際網路               | 罕見、高風險的部署                            | 具備感知能力的 Proxy、TLS、速率限制、嚴格的允許清單、沙盒化的非主要工作階段        |

避免直接公開埠口轉發至 Gateway。如果您需要公開存取，
請在前面放置一個具備感知能力的 Proxy，並使該 Proxy 成為 Gateway 的唯一網路
路徑。

## 飛行前盤點

在變更 bind、proxy、Tailscale 或通道政策之前，請記錄以下內容：

- Gateway 主機、OS 使用者和狀態目錄。
- Gateway URL 和 bind 模式。
- 驗證模式、權杖/密碼來源，或受信任 Proxy 身份來源。
- 所有已啟用的通道，以及它們是否接受 DM、群組或 Webhook。
- 可從非本機發送者存取的 Agent。
- 每個可存取 Agent 的工具設定檔、沙盒模式和提升的工具政策。
- 這些 Agent 可用的外部憑證。
- `~/.openclaw/openclaw.json` 和憑證的備份位置。

如果超過一人可以向機器人發送訊息，請將此視為共享的委託工具權限，而非每個使用者的主機隔離。

## 基準檢查

在開啟存取權之前執行這些操作：

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

請優先解決關鍵發現。僅當警告是有意的且已針對部署進行文件化記錄時，才可被接受。

針對遠端 CLI 驗證，請明確傳遞憑證：

```bash
openclaw gateway probe --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

請勿假設本機設定憑證適用於明確的遠端 URL。

## 最低安全基準

使用此設定作為公開部署的起點：

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

然後一次放寬一項控制。例如，在啟用具寫入權限的工具之前加入特定頻道允許清單，或在接受遠端 Control UI 流量之前啟用反向代理。

嚴格的 `exec.security: "deny"` 基準會封鎖所有 exec 呼叫，包括良性的診斷。如果需要診斷或低風險指令，請僅在選擇了符合您威脅模型的特定傳送者、代理程式、指令和核准模式後，再放寬此限制。

## 私訊和群組公開

訊息傳遞頻道是不受信任的輸入表面。在允許私訊或群組之前：

- 優先使用 `dmPolicy: "pairing"` 或嚴格的 `allowFrom` 清單。
- 除非每個傳送者都受信任，否則請避免使用 `dmPolicy: "open"`。
- 請勿將 `"*"` 允許清單與廣泛的工具存取權結合。
- 除非房間受到嚴格控制，否則請要求在群組中提及。
- 當多人可以向機器人發送私訊時，請使用 `session.dmScope: "per-channel-peer"`。
- 將共享頻道路由至具有最少工具且無個人憑證的代理程式。

配對會授權傳送者觸發機器人。它並不會讓該傳送者成為單獨的主機安全邊界。

## 反向代理檢查

針對具備身分感知能力的代理：

- 代理必須在轉發到 Gateway 之前對使用者進行驗證。
- 必須透過防火牆或網路政策封鎖對 Gateway 連接埠的直接存取。
- `gateway.trustedProxies` 必須僅包含來源代理 IP。
- 代理必須移除或覆寫用戶端提供的身分和轉發標頭。
- 當代理服務於多個受眾時，`gateway.auth.trustedProxy.allowUsers` 應列出預期的使用者。
- 只有在信任本機程序且代理擁有身份標頭時，同主機 loopback 代理模式才應使用 `allowLoopback`。

在代理變更後執行 `openclaw security audit --deep`。受信任代理的發現結果刻意具有高信號，因為代理已成為驗證邊界。

## 工具與沙盒審查

將代理暴露給遠端發送者之前：

- 確認哪些會話在主機上運行，哪些在沙盒中運行。
- 拒絕或要求批准主機 exec。
- 保持提權工具處於停用狀態，除非特定的受信任發送者需要它們。
- 對於開放或半開放訊息表面，請避免使用 browser、canvas、node、cron、gateway 和 session-spawn 工具。
- 保持 bind mount 狹窄，並避免憑證、家目錄、Docker socket 和系統路徑。
- 針對實質上不同的信任邊界，請使用獨立的 gateway、OS 使用者或主機。

如果未完全信任遠端使用者，則隔離必須來自獨立的部署，而不僅僅來自提示或會話標籤。

## 變更後驗證

每次暴露變更後：

1. 重新執行 `openclaw security audit --deep`。
2. 測試成功的已授權連線。
3. 測試未經授權的發送者或瀏覽器會話是否被拒絕。
4. 確認日誌會編輯機密資訊。
5. 確認 DM/群組路由僅到達預期的代理。
6. 確認高影響力工具會要求批准或被拒絕。
7. 記錄已接受的剩餘警告。

在了解目前的變更之前，請勿繼續進行下一個暴露變更。

## 回滾計畫

如果 Gateway 可能過度暴露：

```json5
{
  gateway: {
    bind: "loopback",
  },
  channels: {
    whatsapp: { dmPolicy: "disabled" },
    telegram: { dmPolicy: "disabled" },
    discord: { dmPolicy: "disabled" },
    slack: { dmPolicy: "disabled" },
  },
  tools: {
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

然後：

1. 停止公開轉發、Tailscale Funnel 或反向代理路由。
2. 輪換 Gateway 權杖/密碼和受影響的整合憑證。
3. 從允許清單中移除 `"*"` 和非預期的發送者。
4. 檢閱最近的稽核日誌、執行歷史記錄、工具呼叫和組態變更。
5. 重新執行 `openclaw security audit --deep`。
6. 以滿足工作流程的最狹窄模式重新啟用存取權。

## 審查檢查清單

- Gateway 保持僅限 loopback，除非有記錄在案的原因。
- 非 loopback 存取具有驗證、防火牆保護，且沒有公開的直接路由。
- 受信任代理的部署具有嚴格的代理 IP 和標頭控制。
- DM 使用配對或允許清單，預設不開放存取。
- 群組需要提及或明確的允許清單。
- 共享頻道不會接觸到個人憑證。
- 非主要工作階段會在沙箱模式下執行。
- Host exec 和提權工具已被拒絕或需經過審核閘門。
- 日誌會對機密資訊進行編修。
- 重大稽核發現已解決。
- 復原步驟已經過測試並記錄在文件中。
