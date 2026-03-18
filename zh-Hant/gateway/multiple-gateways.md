---
summary: "在同一台主機上執行多個 OpenClaw Gateways（隔離、連接埠和設定檔）"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "多個 Gateways"
---

# 多個 Gateways（同一台主機）

大多數設定應該使用一個 Gateway，因為單一 Gateway 可以處理多個訊息連線和代理程式。如果您需要更強的隔離或冗餘（例如救援機器人），請使用隔離的設定檔/連接埠執行個別的 Gateways。

## 隔離檢查清單（必要）

- `OPENCLAW_CONFIG_PATH` — 每個執行個體的設定檔
- `OPENCLAW_STATE_DIR` — 每個執行個體的 sessions、creds、caches
- `agents.defaults.workspace` — 每個執行個體的工作區根目錄
- `gateway.port`（或 `--port`） — 每個執行個體唯一
- 衍生的連接埠（browser/canvas）不得重疊

如果這些項目共用，您將會遇到設定競爭和連接埠衝突。

## 建議：profiles (`--profile`)

Profiles 會自動設定 `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` 的範圍並加上服務名稱後綴。

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

Per-profile 服務：

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## 救援機器人指南

在同一台主機上執行第二個 Gateway，並具有其專屬的：

- profile/config
- state dir
- workspace
- base port（加上衍生的連接埠）

這可讓救援機器人與主機器人保持隔離，以便在主機器人停機時進行偵錯或套用設定變更。

連接埠間距：base ports 之間至少保留 20 個連接埠，以免衍生的 browser/canvas/CDP 連接埠發生衝突。

### 如何安裝（救援機器人）

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

## 連接埠對應（衍生）

Base port = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- browser control service port = base + 2（僅限 loopback）
- canvas host 服務於 Gateway HTTP 伺服器（與 `gateway.port` 相同的連接埠）
- Browser profile CDP 連接埠從 `browser.controlPort + 9 .. + 108` 自動分配

如果您在設定或環境變數中覆寫了其中任何一項，必須確保每個執行個體的唯一性。

## Browser/CDP 注意事項（常見陷阱）

- 請**勿**在多個執行個體上將 `browser.cdpUrl` 固定為相同的值。
- 每個執行個體都需要自己的瀏覽器控制連接埠和 CDP 範圍（衍生自其 gateway 連接埠）。
- 如果您需要明確的 CDP 連接埠，請為每個執行個體設定 `browser.profiles.<name>.cdpPort`。
- 遠端 Chrome：使用 `browser.profiles.<name>.cdpUrl` (每個設定檔、每個實例)。

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
