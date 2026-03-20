---
summary: "Gateway 服務的執行手冊、生命週期與操作"
read_when:
  - 執行或偵錯 Gateway 處理程序
title: "Gateway Runbook"
---

# Gateway Runbook

本頁面用於 Gateway 服務的第 1 天啟動與第 2 天操作。

<CardGroup cols={2}>
  <Card title="深度疑難排解" icon="siren" href="/zh-Hant/gateway/troubleshooting">
    以症狀為優先的診斷，包含精確的指令階梯與日誌特徵。
  </Card>
  <Card title="組態" icon="sliders" href="/zh-Hant/gateway/configuration">
    以任務為導向的設定指南 + 完整組態參考。
  </Card>
  <Card title="秘密管理" icon="key-round" href="/zh-Hant/gateway/secrets">
    SecretRef 契約、執行時期快照行為，以及遷移/重新載入操作。
  </Card>
  <Card
    title="Secrets plan contract"
    icon="shield-check"
    href="/zh-Hant/gateway/secrets-plan-contract"
  >
    精確的 `secrets apply` target/path 規則與僅參照的 auth-profile 行為。
  </Card>
</CardGroup>

## 5 分鐘本機啟動

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

  <Step title="驗證服務健康狀態">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基準：`Runtime: running` 與 `RPC probe: ok`。

  </Step>

  <Step title="驗證通道就緒狀態">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>
  Gateway 組態重新載入會監看有效的組態檔案路徑（解析自 profile/state 預設值，或設定時的
  `OPENCLAW_CONFIG_PATH`）。 預設模式為 `gateway.reload.mode="hybrid"`。
</Note>

## 執行時期模型

- 單一常駐程序，負責路由、控制平面與通道連線。
- 單一多工連接埠用於：
  - WebSocket 控制/RPC
  - HTTP API（相容 OpenAI、Responses、工具叫用）
  - 控制 UI 與 hooks
- 預設綁定模式：`loopback`。
- 預設需要驗證（`gateway.auth.token` / `gateway.auth.password`，或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。

### 連接埠與綁定優先順序

| 設定           | 解析順序                                                      |
| -------------- | ------------------------------------------------------------- |
| Gateway 連接埠 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 綁定模式       | CLI/override → `gateway.bind` → `loopback`                    |

### 熱重載模式

| `gateway.reload.mode` | 行為                     |
| --------------------- | ------------------------ |
| `off`                 | 不重載配置               |
| `hot`                 | 僅套用熱安全變更         |
| `restart`             | 當需要重載時重啟         |
| `hybrid` (預設)       | 安全時熱套用，需要時重啟 |

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

然後在本地將客戶端連接到 `ws://127.0.0.1:18789`。

<Warning>
  若已配置 Gateway 驗證，客戶端即使透過 SSH tunnel 連線仍需發送驗證資訊 (`token`/`password`)。
</Warning>

請參閱：[Remote Gateway](/zh-Hant/gateway/remote)、[Authentication](/zh-Hant/gateway/authentication)、[Tailscale](/zh-Hant/gateway/tailscale)。

## 監控與服務生命週期

請使用受監控的執行以獲得類似生產環境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 標籤為 `ai.openclaw.gateway` (預設) 或 `ai.openclaw.<profile>` (命名 profile)。`openclaw doctor` 會稽核並修復服務設定漂移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在登出後持續執行，請啟用 lingering：

```bash
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (system service)">

對於多使用者/主機，請使用 system unit。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 單一主機上的多個 Gateway

大多數設定應該只執行 **一個** Gateway。
僅在需要嚴格隔離/備援時使用多個 Gateway (例如救援 profile)。

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

請參閱：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

### 開發設定檔快速路徑

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

預設值包含隔離的狀態/設定以及基礎 Gateway 埠 `19001`。

## 通訊協定快速參考（操作員觀點）

- 第一個客戶端框架必須是 `connect`。
- Gateway 會傳回 `hello-ok` 快照 (`presence`, `health`, `stateVersion`, `uptimeMs`, limits/policy)。
- 請求：`req(method, params)` → `res(ok/payload|error)`。
- 常見事件：`connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`。

Agent 執行分為兩個階段：

1. 立即接受的 ack (`status:"accepted"`)
2. 最終完成回應 (`status:"ok"|"error"`)，中間包含串流的 `agent` 事件。

查看完整協議文件：[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 操作檢查

### 存活度

- 開啟 WS 並發送 `connect`。
- 預期包含快照的 `hello-ok` 回應。

### 就緒度

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 差距恢復

事件不會重播。若有序列間隙，請在繼續之前重新整理狀態 (`health`、`system-presence`)。

## 常見失敗特徵

| 特徵                                                           | 可能問題                              |
| -------------------------------------------------------------- | ------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非 loopback 繫結且沒有 token/password |
| `another gateway instance is already listening` / `EADDRINUSE` | 連接埠衝突                            |
| `Gateway start blocked: set gateway.mode=local`                | 設定設為遠端模式                      |
| 連線時的 `unauthorized`                                        | 客戶端與 Gateway 之間的驗證不符       |

如需完整的診斷階梯，請使用 [Gateway Troubleshooting](/zh-Hant/gateway/troubleshooting)。

## 安全性保證

- 當 Gateway 無法使用時，Gateway 通訊協定客戶端會快速失敗（沒有隱含的直接通道後援）。
- 無效或非連線的第一個框架會被拒絕並關閉。
- 優雅關閉會在 socket 關閉前發出 `shutdown` 事件。

---

相關連結：

- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [背景程序](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [健康狀態](/zh-Hant/gateway/health)
- [診斷工具](/zh-Hant/gateway/doctor)
- [驗證](/zh-Hant/gateway/authentication)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
