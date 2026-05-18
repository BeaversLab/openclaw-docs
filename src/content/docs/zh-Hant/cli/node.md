---
summary: "`openclaw node` (無頭節點主機) 的 CLI 參考資料"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "節點"
---

# `openclaw node`

執行連線至 Gateway WebSocket 並在此機器上公開
`system.run` / `system.which` 的 **無頭節點主機**。

## 為什麼使用節點主機？

當您希望代理程式在網路中的**其他機器上執行命令**而無需在該處安裝完整的 macOS 伴隨應用程式時，請使用節點主機。

常見使用案例：

- 在遠端 Linux/Windows 機器（建置伺服器、實驗室機器、NAS）上執行命令。
- 將 exec 保持在閘道上的**沙盒**中，但將經批准的執行委派給其他主機。
- 為自動化或 CI 節點提供輕量級的無頭執行目標。

執行仍然受到節點主機上的 **執行核准 (exec approvals)** 和各個代理程式允許清單的保護，因此您可以保持指令存取範圍明確且受控。

## 瀏覽器代理程式（零配置）

如果節點上未停用 `browser.enabled`，節點主機會自動廣告瀏覽器代理伺服器。這讓代理程式能在該節點上使用瀏覽器自動化，而不需要額外設定。

根據預設，代理伺服器會公開節點的一般瀏覽器設定檔介面。如果您設定 `nodeHost.browserProxy.allowProfiles`，代理伺服器會變成嚴格模式：
非允許清單上的設定檔目標會被拒絕，且透過代理伺服器阻擋永久性設定檔的建立/刪除路由。

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

- `--host <host>`：Gateway WebSocket 主機 (預設值：`127.0.0.1`)
- `--port <port>`：Gateway WebSocket 連接埠 (預設值：`18789`)
- `--tls`：對閘道連線使用 TLS
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋 (sha256)
- `--node-id <id>`：覆寫節點 ID (清除配對 Token)
- `--display-name <name>`：覆寫節點顯示名稱

## 節點主機的 Gateway 驗證

`openclaw node run` 和 `openclaw node install` 會從設定/環境變數解析閘道驗證 (節點指令上沒有 `--token`/`--password` 旗標)：

- 會先檢查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然後是本地設定回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本機模式下，節點主機刻意不繼承 `gateway.remote.token` / `gateway.remote.password`。
- 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 但未解析，節點驗證解析會失敗關閉 (沒有遠端回退遮罩)。
- 在 `gateway.mode=remote` 中，遠端用戶端欄位 (`gateway.remote.token` / `gateway.remote.password`) 也有資格依據遠端優先順序規則使用。
- Node 主機身分驗證解析僅採用 `OPENCLAW_GATEWAY_*` 環境變數。

對於連接到明文 `ws://` Gateway 的節點，接受回環、私有 IP
字面量、`.local` 和 Tailnet `*.ts.net` 主機。對於其他
受信任的私有 DNS 名稱，請設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`；若無
此設定，節點啟動將失敗封閉，並要求您使用 `wss://`、SSH 隧道
或 Tailscale。這是一個程序環境選項，而非 `openclaw.json` 設定
鍵。
`openclaw node install` 會在安裝指令環境中存在時將其持久化到受監控的節點服務中。

## 服務 (背景)

將 headless node 主機安裝為使用者服務。

```bash
openclaw node install --host <gateway-host> --port 18789
```

選項：

- `--host <host>`：Gateway WebSocket 主機 (預設：`127.0.0.1`)
- `--port <port>`：Gateway WebSocket 連接埠 (預設：`18789`)
- `--tls`：對 gateway 連接使用 TLS
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋 (sha256)
- `--node-id <id>`：覆寫節點 ID (清除配對 token)
- `--display-name <name>`：覆寫節點顯示名稱
- `--runtime <runtime>`：服務執行環境 (`node` 或 `bun`)
- `--force`：若已安裝則重新安裝/覆寫

管理服務：

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

請使用 `openclaw node run` 作為前景節點主機 (無服務)。

服務指令接受 `--json` 以取得機器可讀輸出。

節點主機會在程序內重試 Gateway 重新啟動和網路關閉。如果 Gateway 回報終結性的 token/密碼/啟動程式 驗證暫停，節點主機會記錄關閉詳情並以非零值退出，以便 launchd/systemd 能使用新的設定和憑證重新啟動它。需要配對的暫停會保留在前景流程中，以便待處理的要求可以被批准。

## 配對

首次連線會在 Gateway 上建立待處理的裝置配對請求 (`role: node`)。
透過以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

在嚴格控制的節點網路上，Gateway 操作員可以明確選擇自動批准來自信任 CIDR 的首次節點配對：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

此功能預設為停用。它僅適用於沒有請求範圍 的全新 `role: node` 配對。
操作員/瀏覽器客戶端、Control UI、WebChat，以及角色、
範圍、中繼資料或公開金鑰升級仍需手動批准。

如果節點使用已變更的驗證詳細資料 (角色/範圍/公開金鑰) 重試配對，
先前的待處理請求將被取代，並建立一個新的 `requestId`。
請在批准前再次執行 `openclaw devices list`。

節點主機會將其節點 ID、token、顯示名稱和 gateway 連線資訊儲存在
`~/.openclaw/node.json` 中。

## 執行核准

`system.run` 受本地執行批准限制：

- `~/.openclaw/exec-approvals.json`
- [執行批准](/zh-Hant/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` （從 Gateway 編輯）

對於已批准的非同步節點執行，OpenClaw 會在提示前準備一個標準的 `systemRunPlan`。
稍後批准的 `system.run` 轉發會重用該儲存的計畫，因此，在建立批准請求後，對 command/cwd/session 欄位的編輯將被拒絕，而不會改變節點執行的內容。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [節點](/zh-Hant/nodes)
