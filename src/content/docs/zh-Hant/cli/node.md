---
summary: "`openclaw node`（無頭節點主機）的 CLI 參考"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

執行連線到 Gateway WebSocket 並在這台機器上公開
`system.run` / `system.which` 的 **無頭節點主機**。

## 為什麼使用節點主機？

當您希望代理程式在網路中的**其他機器上執行命令**而無需在該處安裝完整的 macOS 伴隨應用程式時，請使用節點主機。

常見使用案例：

- 在遠端 Linux/Windows 機器（建置伺服器、實驗室機器、NAS）上執行命令。
- 將 exec 保持在閘道上的**沙盒**中，但將經批准的執行委派給其他主機。
- 為自動化或 CI 節點提供輕量級的無頭執行目標。

執行仍受節點主機上的 **exec approvals** 和每個代理程式的允許列表保護，因此您可以保持命令存取範圍明確且具體。

## 瀏覽器代理程式（零配置）

如果節點上未停用 `browser.enabled`，節點主機會自動公開瀏覽器代理程式。這讓代理程式可以在該節點上使用瀏覽器自動化，而無需額外配置。

根據預設，代理程式會公開節點的一般瀏覽器設定檔表面。如果您設定
`nodeHost.browserProxy.allowProfiles`，代理程式會變得嚴格：
非允許列表的設定檔目標會被拒絕，且透過代理程式會阻擋永久性設定檔的建立/刪除路由。

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
- `--tls`：對閘道連線使用 TLS
- `--tls-fingerprint <sha256>`：預期的 TLS 憑證指紋（sha256）
- `--node-id <id>`：覆寫節點 ID（清除配對權杖）
- `--display-name <name>`：覆寫節點顯示名稱

## 節點主機的 Gateway 驗證

`openclaw node run` 和 `openclaw node install` 從設定/環境解析 gateway 驗證（節點指令上沒有 `--token`/`--password` 標誌）：

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 會優先被檢查。
- 然後是本地配置後備：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，節點主機有意不繼承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確配置但未解析，節點驗證解析將失敗關閉（無遠端後備遮罩）。
- 在 `gateway.mode=remote` 中，根據遠端優先順序規則，遠端客戶端欄位（`gateway.remote.token` / `gateway.remote.password`）也符合資格。
- 節點主機驗證解析僅遵守 `OPENCLAW_GATEWAY_*` 環境變數。

## 服務（背景）

將無頭節點主機安裝為使用者服務。

```bash
openclaw node install --host <gateway-host> --port 18789
```

選項：

- `--host <host>`: Gateway WebSocket 主機（預設：`127.0.0.1`）
- `--port <port>`: Gateway WebSocket 埠（預設：`18789`）
- `--tls`: 對閘道連線使用 TLS
- `--tls-fingerprint <sha256>`: 預期的 TLS 憑證指紋（sha256）
- `--node-id <id>`: 覆寫節點 ID（清除配對 token）
- `--display-name <name>`: 覆寫節點顯示名稱
- `--runtime <runtime>`: 服務執行時（`node` 或 `bun`）
- `--force`: 如果已安裝則重新安裝/覆寫

管理服務：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 以取得前景節點主機（無服務）。

服務指令接受 `--json` 以取得機器可讀輸出。

## 配對

首次連線會在 Gateway 上建立待處理的裝置配對請求（`role: node`）。
請透過以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果節點使用變更的驗證詳細資料（角色/範圍/公開金鑰）重試配對，
先前的待處理請求將被取代，並建立一個新的 `requestId`。
請在批准前再次執行 `openclaw devices list`。

節點主機會將其節點 ID、token、顯示名稱和閘道連線資訊儲存在
`~/.openclaw/node.json` 中。

## Exec 核准

`system.run` 受本地執行核准限制：

- `~/.openclaw/exec-approvals.json`
- [執行核准](/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (從 Gateway 編輯)
