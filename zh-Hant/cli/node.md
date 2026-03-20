---
summary: "CLI 參考資料，適用於 `openclaw node` (無頭節點主機)"
read_when:
  - 執行無頭節點主機
  - 配對非 macOS 節點以進行 system.run
title: "node"
---

# `openclaw node`

執行連線至 Gateway WebSocket 並在此機器上公開
`system.run` / `system.which` 的**無頭節點主機**。

## 為什麼使用節點主機？

當您希望代理程式**在您網路中的其他機器上執行命令**，而無需在該處安裝完整的 macOS 伴隨應用程式時，請使用節點主機。

常見使用案例：

- 在遠端 Linux/Windows 方塊上執行命令 (建置伺服器、實驗室機器、NAS)。
- 將 exec 保持在閘道上的 **沙盒** 中，但將核准的執行委派給其他主機。
- 為自動化或 CI 節點提供輕量級的無頭執行目標。

執行仍然受到節點主機上的 **執行核准** 和每個代理程式允許清單的保護，因此您可以將命令存取保持在受限且明確的狀態。

## 瀏覽器代理（零配置）

如果節點上未停用 `browser.enabled`，節點主機會自動通告瀏覽器代理。這讓代理程式可以在該節點上使用瀏覽器自動化，而無需額外設定。

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
- `--port <port>`：Gateway WebSocket 埠（預設：`18789`）
- `--tls`：使用 TLS 進行 Gateway 連線
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋 (sha256)
- `--node-id <id>`：覆寫節點 ID（清除配對 Token）
- `--display-name <name>`：覆寫節點顯示名稱

## 節點主機的閘道驗證

`openclaw node run` 和 `openclaw node install` 從設定/環境變數解析閘道驗證（節點指令上沒有 `--token`/`--password` 標誌）：

- 會先檢查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然後是本機設定後備：`gateway.auth.token` / `gateway.auth.password`。
- 在本機模式下，節點主機刻意不繼承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定且未解析，節點驗證解析會以封閉式失敗（沒有遠端後備遮罩）。
- 在 `gateway.mode=remote` 中，根據遠端優先順序規則，遠端客戶端欄位（`gateway.remote.token` / `gateway.remote.password`）也符合資格。
- 舊版的 `CLAWDBOT_GATEWAY_*` 環境變數會在解析節點主機驗證時被忽略。

## 服務（背景）

將無頭節點主機安裝為使用者服務。

```bash
openclaw node install --host <gateway-host> --port 18789
```

選項：

- `--host <host>`：Gateway WebSocket 主機（預設：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 連接埠（預設：`18789`）
- `--tls`：使用 TLS 進行 Gateway 連線
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋（sha256）
- `--node-id <id>`：覆寫節點 ID（清除配對權杖）
- `--display-name <name>`：覆寫節點顯示名稱
- `--runtime <runtime>`：服務執行階段（`node` 或 `bun`）
- `--force`：若已安裝則重新安裝/覆寫

管理服務：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 作為前景節點主機（無服務）。

服務指令接受 `--json` 以輸出機器可讀格式。

## 配對

第一次連線會在 Gateway 上建立待處理的裝置配對請求（`role: node`）。
透過以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

節點主機會將其節點 ID、權杖、顯示名稱和 Gateway 連線資訊儲存在
`~/.openclaw/node.json` 中。

## 執行核批

`system.run` 受本地端執行核批限制：

- `~/.openclaw/exec-approvals.json`
- [執行核批](/zh-Hant/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（從 Gateway 編輯）

import en from "/components/footer/en.mdx";

<en />
