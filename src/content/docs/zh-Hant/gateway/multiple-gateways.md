---
summary: "在同一台主機上運行多個 OpenClaw Gateway（隔離、連接埠和設定檔）"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "多個 Gateway"
---

# 多個閘道（同一主機）

大多數安裝應該使用一個閘道，因為單一閘道可以處理多個訊息連線和代理程式。如果您需要更強的隔離或冗餘（例如，救援機器人），請使用獨立的設定檔/連接埠執行分開的閘道。

## 最佳推薦設定

對於大多數使用者來說，最簡單的救援機器人設定是：

- 將主要機器人保留在預設設定檔上
- 在 `--profile rescue` 上執行救援機器人
- 為救援帳號使用完全獨立的 Telegram 機器人
- 將救援機器人保留在不同的基礎連接埠上，例如 `19789`

這能保持救援機器人與主要機器人隔離，以便在主要機器人停機時進行除錯或套用設定變更。請在基礎連接埠之間保留至少 20 個連接埠，以免衍生的瀏覽器/canvas/CDP 連接埠發生衝突。

## 救援機器人快速入門

除非您有充分的理由採用其他方式，否則請將此作為預設路徑：

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果您的主要機器人已經在執行，通常這樣就足夠了。

在 `openclaw --profile rescue onboard` 期間：

- 使用獨立的 Telegram 機器人權杖
- 保留 `rescue` 設定檔
- 使用比主要機器人至少高 20 的基礎連接埠
- 接受預設的救援工作區，除非您已經自行管理了一個

如果入門程式已經為您安裝了救援服務，則不需要最後的 `gateway install`。

## 為何這樣做有效

救援機器人保持獨立，因為它擁有自己專屬的：

- 設定檔/設定
- 狀態目錄
- 工作區
- 基礎連接埠（以及衍生的連接埠）
- Telegram 機器人權杖

對於大多數設定，請為救援設定檔使用完全獨立的 Telegram 機器人：

- 易於保持僅供操作員使用
- 分開的機器人權杖和身分
- 獨立於主要機器人的頻道/應用程式安裝
- 當主要機器人故障時，提供簡單的基於 DM 的復原路徑

## `--profile rescue onboard` 會變更什麼

`openclaw --profile rescue onboard` 使用正常的入門流程，但它會將所有內容寫入到獨立的設定檔中。

實際上，這意味著救援機器人會獲得自己專屬的：

- 設定檔
- 狀態目錄
- 工作區（預設為 `~/.openclaw/workspace-rescue`）
- 受管理的服務名稱

除此之外，提示與正常入門流程相同。

## 一般多 Gateway 設定

上述的救援機器人佈局是最簡單的預設選項，但相同的隔離模式也適用於同一台主機上的任何 Gateway 配對或群組。

對於更通用的設定，請為每個額外的 Gateway 提供其專屬的命名設定檔 (profile) 和
專屬的基礎連接埠：

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果您希望兩個 Gateway 都使用命名設定檔 (named profiles)，這也是可行的：

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

當您需要備用操作員通道時，請使用 rescue-bot 快速入門。當您需要為
不同的通道、租戶、工作區或操作角色設定多個長期運行的 Gateway 時，請使用
通用設定檔模式。

## 隔離檢查清單

請為每個 Gateway 實例保持以下項目的唯一性：

- `OPENCLAW_CONFIG_PATH` — 每個實例的設定檔
- `OPENCLAW_STATE_DIR` — 每個實例的 sessions、creds、caches
- `agents.defaults.workspace` — 每個實例的工作區根目錄
- `gateway.port` (或 `--port`) — 每個實例唯一
- 衍生的 browser/canvas/CDP 連接埠

如果這些項目共享，您將會遇到設定競爭和連接埠衝突。

## 連接埠對應 (derived)

基礎連接埠 = `gateway.port` (或 `OPENCLAW_GATEWAY_PORT` / `--port`)。

- 瀏覽器控制服務連接埠 = 基礎連接埠 + 2 (僅限回送)
- canvas 主機由 Gateway HTTP 伺服器提供服務 (連接埠與 `gateway.port` 相同)
- 瀏覽器設定檔 CDP 連接埠從 `browser.controlPort + 9 .. + 108` 自動分配

如果您在設定或環境變數中覆寫了其中任何一項，您必須確保每個實例都保持唯一。

## 瀏覽器/CDP 注意事項 (常見陷阱)

- 請**勿**將多個實例上的 `browser.cdpUrl` 固定為相同的值。
- 每個實例都需要自己的瀏覽器控制連接埠和 CDP 範圍 (從其 gateway 連接埠衍生)。
- 如果您需要明確指定 CDP 連接埠，請為每個實例設定 `browser.profiles.<name>.cdpPort`。
- 遠端 Chrome：使用 `browser.profiles.<name>.cdpUrl` (每個設定檔，每個實例)。

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
- `gateway probe` 警告文字 (例如 `multiple reachable gateways detected`) 僅在您有意執行多個隔離的 gateway 時才屬正常。
