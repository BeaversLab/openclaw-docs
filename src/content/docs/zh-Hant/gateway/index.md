---
summary: "Gateway 服務的 Runbook、生命週期與作業"
read_when:
  - Running or debugging the gateway process
title: "Gateway Runbook"
---

# Gateway Runbook

使用此頁面進行 Gateway 服務的第 1 天啟動和第 2 天作業。

<CardGroup cols={2}>
  <Card title="Deep troubleshooting" icon="siren" href="/zh-Hant/gateway/troubleshooting">
    透過確切的指令階梯和日誌特徵進行以症狀為優先的診斷。
  </Card>
  <Card title="Configuration" icon="sliders" href="/zh-Hant/gateway/configuration">
    以任務為導向的設定指南 + 完整設定參考。
  </Card>
  <Card title="機密管理" icon="key-round" href="/zh-Hant/gateway/secrets">
    SecretRef 合約、執行時快照行為，以及遷移/重新載入操作。
  </Card>
  <Card title="機密計劃合約" icon="shield-check" href="/zh-Hant/gateway/secrets-plan-contract">
    精確的 `secrets apply` 目標/路徑規則與僅參考 auth-profile 行為。
  </Card>
</CardGroup>

## 5 分鐘本地啟動

<Steps>
  <Step title="Start the Gateway">

```exec
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="驗證服務健全狀況">

```exec
openclaw gateway status
openclaw status
openclaw logs --follow
```

健全基線：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="驗證通道就緒狀態">

```exec
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>Gateway config reload watches the active config file path (resolved from profile/state defaults, or `OPENCLAW_CONFIG_PATH` when set). Default mode is `gateway.reload.mode="hybrid"`.</Note>

## Runtime model

- One always-on process for routing, control plane, and channel connections.
- Single multiplexed port for:
  - WebSocket control/RPC
  - HTTP APIs (OpenAI-compatible, Responses, tools invoke)
  - Control UI and hooks
- Default bind mode: `loopback`.
- Auth is required by default (`gateway.auth.token` / `gateway.auth.password`, or `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

### Port and bind precedence

| Setting      | Resolution order                                              |
| ------------ | ------------------------------------------------------------- |
| Gateway port | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Bind mode    | CLI/覆寫 → `gateway.bind` → `loopback`                        |

### 熱重新載入模式

| `gateway.reload.mode` | 行為                         |
| --------------------- | ---------------------------- |
| `off`                 | 不重新載入設定               |
| `hot`                 | 僅套用熱安全變更             |
| `restart`             | 需要重新載入變更時重新啟動   |
| `hybrid` (預設)       | 安全時熱套用，必要時重新啟動 |

## 操作員指令集

```exec
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
備用：SSH 通道。

```exec
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然後在本機將客戶端連線至 `ws://127.0.0.1:18789`。

<Warning>若已設定 Gateway 驗證，客戶端即使在 SSH 通道上也必須傳送驗證 (`token`/`password`)。</Warning>

參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監督與服務生命週期

請使用監督執行以獲得類似生產環境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```exec
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名設定檔)。`openclaw doctor` 會稽核並修復服務設定 drift。

  </Tab>

  <Tab title="Linux (systemd user)">

```exec
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後保持執行，請啟用 lingering：

```exec
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (系統服務)">

對於多使用者/始終運行的主機，請使用系統單元（system unit）。

```exec
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 在同一台主機上執行多個閘道

大多數設定應該只執行**一個**閘道。
僅在需要嚴格隔離/冗餘時（例如救援設定檔）才使用多個閘道。

每個執行個體的檢查清單：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

範例：

```exec
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

請參閱：[多個閘道](/zh-Hant/gateway/multiple-gateways)。

### 開發設定檔快速路徑

```exec
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包括隔離的狀態/設定以及基礎閘道連接埠 `19001`。

## 通訊協定快速參考（操作員檢視）

- 第一個客戶端框架必須是 `connect`。
- Gateway 返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、limits/policy）。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件：`connect.challenge`、`agent`、`chat`、`presence`、`tick`、`health`、`heartbeat`、`shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的確認（`status:"accepted"`）
2. 最終完成回應（`status:"ok"|"error"`），中間穿插串流的 `agent` 事件。

請參閱完整的協議文件：[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 操作檢查

### 存活性

- 開啟 WS 並傳送 `connect`。
- 預期帶有快照的 `hello-ok` 回應。

### 就緒性

```exec
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 間隙恢復

事件不會重播。發生序列間隙時，請在繼續之前重新整理狀態 (`health`, `system-presence`)。

## 常見失敗特徵

| 特徵                                                           | 可能問題                          |
| -------------------------------------------------------------- | --------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回送綁定但未提供 token/password |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                        |
| `Gateway start blocked: set gateway.mode=local`                | 配置設定為遠端模式                |
| 連線時發生 `unauthorized`                                      | 客戶端與閘道之間的身份驗證不匹配  |

如需完整的診斷步驟，請使用 [閘道疑難排解](/zh-Hant/gateway/troubleshooting)。

## 安全保證

- 當 Gateway 無法使用時，Gateway 協定客戶端會快速失敗（沒有隱含的直接通道回退）。
- 無效或非連線的第一幀會被拒絕並關閉。
- 優雅關閉會在關閉 socket 之前發出 `shutdown` 事件。

---

相關連結：

- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [背景程序](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [健康狀態](/zh-Hant/gateway/health)
- [診斷](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)
