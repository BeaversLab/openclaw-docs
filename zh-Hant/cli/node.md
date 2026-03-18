---
summary: "CLI 參考資料，適用於 `openclaw node`（無頭節點主機）"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

執行連線至 Gateway WebSocket 並在這台機器上暴露
`system.run` / `system.which` 的 **無頭節點主機**。

## 為什麼要使用節點主機？

當您希望代理程式在您網路中的**其他機器上執行指令**，而不需在那裡安裝完整的 macOS 伴隨應用程式時，請使用節點主機。

常見使用案例：

- 在遠端 Linux/Windows 機器（建置伺服器、實驗室機器、NAS）上執行指令。
- 將 exec **沙盒化**保留在 Gateway 上，但將已批准的執行委派給其他主機。
- 為自動化或 CI 節點提供輕量級的無頭執行目標。

執行仍然受到節點主機上的 **exec 批准**和每個代理程式允許清單的保護，因此您可以保持指令存取的範圍明確。

## 瀏覽器代理（零設定）

如果節點上未停用 `browser.enabled`，節點主機會自動通告瀏覽器代理。這允許代理程式在該節點上使用瀏覽器自動化，而無需額外設定。

如有需要，請在節點上停用它：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## 執行（前景）

```bash
openclaw node run --host <gateway-host> --port 18789
```

選項：

- `--host <host>`：Gateway WebSocket 主機（預設：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 連接埠（預設：`18789`）
- `--tls`：對 Gateway 連線使用 TLS
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋（sha256）
- `--node-id <id>`：覆寫節點 ID（清除配對 Token）
- `--display-name <name>`：覆寫節點顯示名稱

## 節點主機的 Gateway 驗證

`openclaw node run` 和 `openclaw node install` 會從設定/環境解析 Gateway 驗證（節點指令上沒有 `--token`/`--password` 標誌）：

- 會先檢查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然後是本機設定備援：`gateway.auth.token` / `gateway.auth.password`。
- 在本機模式中，節點主機刻意不繼承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定且未解析，節點身分驗證解析會失敗關閉（沒有遠端後援遮罩）。
- 在 `gateway.mode=remote` 中，根據遠端優先順序規則，遠端客戶端欄位 (`gateway.remote.token` / `gateway.remote.password`) 也符合資格。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數會在節點主機身分驗證解析中被忽略。

## 服務 (背景)

將無介面節點主機安裝為使用者服務。

```bash
openclaw node install --host <gateway-host> --port 18789
```

選項：

- `--host <host>`：Gateway WebSocket 主機 (預設：`127.0.0.1`)
- `--port <port>`：Gateway WebSocket 連接埠 (預設：`18789`)
- `--tls`：對閘道連線使用 TLS
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋 (sha256)
- `--node-id <id>`：覆寫節點 ID (清除配對權杖)
- `--display-name <name>`：覆寫節點顯示名稱
- `--runtime <runtime>`：服務執行階段 (`node` 或 `bun`)
- `--force`：如果已安裝則重新安裝/覆寫

管理服務：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 執行前景節點主機 (無服務)。

服務指令接受 `--json` 以取得機器可讀的輸出。

## 配對

第一次連線會在 Gateway 上建立待處理的裝置配對請求 (`role: node`)。
透過以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

節點主機會將其節點 ID、權杖、顯示名稱和閘道連線資訊儲存在
`~/.openclaw/node.json` 中。

## 執行核准

`system.run` 受到本機執行核准的限制：

- `~/.openclaw/exec-approvals.json`
- [執行核准](/zh-Hant/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (從 Gateway 編輯)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
