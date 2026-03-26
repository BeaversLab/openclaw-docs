---
summary: "在同一台主機上執行多個 OpenClaw 閘道（隔離、連接埠和設定檔）"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "多個閘道"
---

# 多個閘道（相同主機）

大多數安裝設定應使用一個閘道，因為單一閘道可以處理多個訊息連線和代理程式。如果您需要更強的隔離或冗餘（例如，救援機器人），請使用隔離的設定檔/連接埠執行獨立的閘道。

## 隔離檢查清單（必要）

- `OPENCLAW_CONFIG_PATH` — 每個執行個體的設定檔
- `OPENCLAW_STATE_DIR` — 每個執行個體的工作階段、憑證、快取
- `agents.defaults.workspace` — 每個執行個體的工作區根目錄
- `gateway.port` (或 `--port`) — 每個執行個體唯一
- 衍生的連接埠（瀏覽器/canvas）不得重疊

如果共用這些資源，您將會遇到配置競爭和連接埠衝突。

## 建議：設定檔 (`--profile`)

設定檔會自動限定 `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` 的範圍，並為服務名稱加上後綴。

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

每個設定檔的服務：

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## 救援機器人指南

在同一台主機上執行第二個 Gateway，並使用其獨立的：

- profile/config
- state dir
- workspace
- base port (plus derived ports)

這能讓救援機器人與主要機器人保持隔離，以便在主要機器人停機時進行偵錯或套用配置變更。

連接埠間距：在基礎連接埠之間至少保留 20 個連接埠，以避免衍生的 browser/canvas/CDP 連接埠發生衝突。

### 如何安裝 (救援機器人)

```bash
# Main bot (existing or fresh, without --profile param)
# Runs on port 18789 + Chrome CDC/Canvas/... Ports
openclaw onboard
openclaw gateway install

# Rescue bot (isolated profile + ports)
openclaw --profile rescue onboard
# Notes:
# - workspace name will be postfixed with -rescue per default
# - Port should be at least 18789 + 20 Ports,
#   better choose completely different base port, like 19789,
# - rest of the onboarding is the same as normal

# To install the service (if not happened automatically during setup)
openclaw --profile rescue gateway install
```

## 連接埠對應 (衍生)

Base port = `gateway.port` (or `OPENCLAW_GATEWAY_PORT` / `--port`).

- browser control service port = base + 2 (僅限 loopback)
- canvas host 是由 Gateway HTTP 伺服器提供的（與 `gateway.port` 相同的連接埠）
- 瀏覽器設定檔 CDP 連接埠從 `browser.controlPort + 9 .. + 108` 自動分配

如果您在配置或環境變數中覆蓋了其中任何一項，則必須確保每個實例的值都是唯一的。

## 瀏覽器/CDP 注意事項（常見陷阱）

- 請**切勿**將 `browser.cdpUrl` 在多個實例上固定為相同的值。
- 每個實例都需要自己的瀏覽器控制連接埠和 CDP 範圍（從其 gateway 連接埠衍生）。
- 如果您需要明確的 CDP 連接埠，請為每個實例設定 `browser.profiles.<name>.cdpPort`。
- 遠端 Chrome：使用 `browser.profiles.<name>.cdpUrl`（每個設定檔，每個實例）。

## 手動環境變數範例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## 快速檢查

```bash
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
