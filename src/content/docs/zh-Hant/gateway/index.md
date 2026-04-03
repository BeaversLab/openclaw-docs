---
summary: "Gateway 服務的 Runbook、生命週期和操作"
read_when:
  - Running or debugging the gateway process
title: "Gateway Runbook"
---

# Gateway runbook

使用此頁面進行 Gateway 服務的第一天啟動和第二天操作。

<CardGroup cols={2}>
  <Card title="Deep troubleshooting" icon="siren" href="/en/gateway/troubleshooting">
    透過確切的命令階梯和日誌特徵進行以症狀為先導的診斷。
  </Card>
  <Card title="Configuration" icon="sliders" href="/en/gateway/configuration">
    以任務為導向的設定指南 + 完整設定參考。
  </Card>
  <Card title="Secrets management" icon="key-round" href="/en/gateway/secrets">
    SecretRef 合約、執行時期快照行為，以及遷移/重新載入作業。
  </Card>
  <Card title="Secrets plan contract" icon="shield-check" href="/en/gateway/secrets-plan-contract">
    精確的 `secrets apply` target/path 規則和僅參照 auth-profile 行為。
  </Card>
</CardGroup>

## 5 分鐘本地啟動

<Steps>
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="Verify service health">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基準：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="Validate channel readiness">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>Gateway 設定重新載入會監看作用中的設定檔路徑（從 profile/state 預設值解析，或在設定時為 `OPENCLAW_CONFIG_PATH`）。 預設模式為 `gateway.reload.mode="hybrid"`。 在第一次成功載入後，執行中的程序會提供作用中的記憶體內設定快照；成功重新載入會以原子方式交換該快照。</Note>

## Runtime model

- 一個用於路由、控制平面和通道連線的常駐程序。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 相容 (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - 控制 UI 和 hooks
- 預設綁定模式：`loopback`。
- 預設情況下需要身份驗證 (`gateway.auth.token` / `gateway.auth.password`，或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)。

## OpenAI 相容端點

OpenClaw 目前最高杠杆的相容性介面為：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

為何這組端點很重要：

- 大多數 Open WebUI、LobeChat 和 LibreChat 整合首先會探測 `/v1/models`。
- 許多 RAG 和記憶管線期望使用 `/v1/embeddings`。
- Agent 原生客戶端越來越偏好使用 `/v1/responses`。

規劃備註：

- `/v1/models` 是代理優先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一個穩定的別名，始終映射到設定的預設代理。
- 當您想要後端提供者/模型覆寫時，請使用 `x-openclaw-model`；否則，所選代理的常規模型和嵌入設定將保持控制。

所有這些都運作在主要 Gateway 連接埠上，並使用與其餘 Gateway HTTP API 相同的可信操作員驗證邊界。

### 連接埠與綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/override → `gateway.bind` → `loopback`                    |

### 熱重載模式

| `gateway.reload.mode` | 行為                     |
| --------------------- | ------------------------ |
| `off`                 | 不重新載入設定           |
| `hot`                 | 僅套用熱安全變更         |
| `restart`             | 當需要重新載入變更時重啟 |
| `hybrid` (預設)       | 安全時熱套用，必要時重啟 |

## 操作員指令集

```bash
openclaw gateway status
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

## 遠端存取

首選：Tailscale/VPN。
備選：SSH tunnel。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後將客戶端在本地連接到 `ws://127.0.0.1:18789`。

<Warning>如果已配置 Gateway 驗證，即使透過 SSH 通道，客戶端仍必須發送驗證資訊 (`token`/`password`)。</Warning>

參閱：[Remote Gateway](/en/gateway/remote)、[Authentication](/en/gateway/authentication)、[Tailscale](/en/gateway/tailscale)。

## 監控與服務生命週期

在生產環境等對可靠性要求高的場景中，請使用監控模式運行。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務配置漂移。

  </Tab>

  <Tab title="Linux (systemd 使用者)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後保持持續運作，請啟用 lingering：

```bash
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (系統服務)">

請使用系統單元適用於多使用者/永遠在線的主機。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 在單一主機上執行多個 Gateway

大多數設定應執行 **一** 個 Gateway。
僅在需要嚴格隔離/冗餘時（例如救援設定檔）才使用多個。

每個執行個體的檢查清單：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

範例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

請參閱：[多重閘道](/en/gateway/multiple-gateways)。

### 開發設定檔快速路徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括隔離的狀態/組態和基礎閘道連接埠 `19001`。

## 協定快速參考 (操作員視圖)

- 第一個客戶端框架必須是 `connect`。
- Gateway 傳回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/原則）。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件：`connect.challenge`、`agent`、`chat`、`presence`、`tick`、`health`、`heartbeat`、`shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的 ack（`status:"accepted"`）
2. 最終完成回應（`status:"ok"|"error"`），中間包含串流的 `agent` 事件。

請參閱完整的協定文件：[Gateway Protocol](/en/gateway/protocol)。

## 操作檢查

### 存活度

- 開啟 WS 並發送 `connect`。
- 預期會收到帶有快照的 `hello-ok` 回應。

### 就緒度

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。遇到序列間隙時，請先重新整理狀態 (`health`, `system-presence`) 再繼續。

## 常見失敗特徵

| 特徵                                                           | 可能問題                        |
| -------------------------------------------------------------- | ------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回環綁定但未提供令牌/密碼     |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                      |
| `Gateway start blocked: set gateway.mode=local`                | 設定設為遠端模式                |
| 連線時發生 `unauthorized`                                      | 用戶端與 Gateway 之間的驗證不符 |

如需完整的診斷步驟，請使用 [Gateway Troubleshooting](/en/gateway/troubleshooting)。

## 安全保證

- 當 Gateway 無法使用時，Gateway 協定用戶端會快速失敗 (沒有隱含的直接通道回退)。
- 無效或非連線的第一個影格會被拒絕並關閉。
- 優雅關閉會在通訊端關閉前發出 `shutdown` 事件。

---

相關：

- [故障排除](/en/gateway/troubleshooting)
- [背景程序](/en/gateway/background-process)
- [設定](/en/gateway/configuration)
- [健康狀態](/en/gateway/health)
- [Doctor](/en/gateway/doctor)
- [Authentication](/en/gateway/authentication)
