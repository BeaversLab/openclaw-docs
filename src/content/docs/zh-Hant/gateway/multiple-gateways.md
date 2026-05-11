---
summary: "在同一台主機上運行多個 OpenClaw Gateway（隔離、連接埠和設定檔）"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Multiple gateways"
---

大多數設定應該使用一個 Gateway，因為單一 Gateway 可以處理多個訊息連線和代理程式。如果您需要更強的隔離或備援（例如救援機器人），請執行具有隔離設定檔/連接埠的獨立 Gateway。

## 最佳推薦設定

對於大多數使用者來說，最簡單的救援機器人設定是：

- 將主要機器人保留在預設設定檔上
- 在 `--profile rescue` 上執行救援機器人
- 為救援帳戶使用完全獨立的 Telegram 機器人
- 將救援機器人保留在不同的基底連接埠上，例如 `19789`

這可讓救援機器人與主要機器人保持隔離，以便在主要機器人停機時進行偵錯或套用
設定變更。請在基底連接埠之間保留至少 20 個連接埠，
以免衍生的瀏覽器/canvas/CDP 連接埠發生衝突。

## 救援機器人快速入門

除非您有強烈的理由採取其他做法，否則請將此作為預設路徑：

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果您的主要機器人已在執行，通常這就是您所需要的全部。

在 `openclaw --profile rescue onboard` 期間：

- 使用獨立的 Telegram 機器人權杖
- 保留 `rescue` 設定檔
- 使用比主要機器人至少高 20 的基底連接埠
- 接受預設的救援工作區，除非您已自行管理一個

如果入門流程已為您安裝了救援服務，則最終的
`gateway install` 並非必要。

## 為何這樣做有效

救援機器人保持獨立，因為它擁有自己的：

- 設定檔/設定
- 狀態目錄
- 工作區
- 基底連接埠（加上衍生的連接埠）
- Telegram 機器人權杖

對於大多數設定，請為救援設定檔使用完全獨立的 Telegram 機器人：

- 易於保持僅限操作員存取
- 獨立的機器人權杖和身分識別
- 獨立於主要機器人的頻道/應用程式安裝
- 當主要機器人損壞時，簡單的基於 DM 的復原路徑

## `--profile rescue onboard` 會變更什麼

`openclaw --profile rescue onboard` 使用標準的入門流程，但它
會將所有內容寫入到單獨的設定檔中。

實務上，這意味著救援機器人會獲得自己的：

- 設定檔
- 狀態目錄
- 工作區（預設為 `~/.openclaw/workspace-rescue`）
- 受管理的服務名稱

提示與標準入門流程相同。

## 一般多 Gateway 設定

上述的救援機器人佈局是最簡單的預設選項，但相同的隔離模式也適用於單一主機上的任何一對或一組閘道。

對於更通用的設置，請為每個額外的閘道指定自己的命名配置檔案和基本埠：

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果您希望兩個閘道都使用命名配置檔案，這也是可行的：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服務遵循相同的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

當您需要備用操作員通道時，請使用救援機器人快速入門。當您需要為不同的通道、租戶、工作區或操作角色設置多個長期執行的閘道時，請使用通用配置檔案模式。

## 隔離檢查清單

請確保每個閘道實例保持以下項目的唯一性：

- `OPENCLAW_CONFIG_PATH` — 每個實例的配置檔案
- `OPENCLAW_STATE_DIR` — 每個實例的會話、憑證、快取
- `agents.defaults.workspace` — 每個實例的工作區根目錄
- `gateway.port` (或 `--port`) — 每個實例唯一
- 衍生的瀏覽器/canvas/CDP 埠

如果共用這些項目，您將遇到配置競爭和埠衝突。

## 埠映射（衍生）

基本埠 = `gateway.port` (或 `OPENCLAW_GATEWAY_PORT` / `--port`)。

- 瀏覽器控制服務埠 = 基本埠 + 2 (僅限迴路)
- canvas 主機由 Gateway HTTP 伺服器提供 (與 `gateway.port` 相同的埠)
- 瀏覽器設定檔 CDP 埠從 `browser.controlPort + 9 .. + 108` 自動分配

如果您在配置或環境變數中覆蓋了其中任何一項，您必須確保每個實例的唯一性。

## 瀏覽器/CDP 注意事項（常見陷阱）

- 請**勿**將多個實例上的 `browser.cdpUrl` 固定為相同的值。
- 每個實例都需要自己的瀏覽器控制埠和 CDP 範圍（衍生自其閘道埠）。
- 如果您需要明確的 CDP 埠，請為每個實例設定 `browser.profiles.<name>.cdpPort`。
- 遠端 Chrome：請使用 `browser.profiles.<name>.cdpUrl` (每個設定檔，每個實例)。

## 手動環境變數範例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## 快速檢查

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

解讀：

- `gateway status --deep` 有助於發現來自舊安裝的過時 launchd/systemd/schtasks 服務。
- 僅當您有意執行多個隔離的閘道時，才預期會出現 `gateway probe` 警告文字，例如 `multiple reachable gateways detected`。

## 相關

- [Gateway 操作手冊](/zh-Hant/gateway)
- [Gateway lock](/zh-Hant/gateway/gateway-lock)
- [Configuration](/zh-Hant/gateway/configuration)
