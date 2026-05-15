---
summary: "CLI 參考文件 `openclaw channels`（帳戶、狀態、登入/登出、日誌）"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "頻道"
---

# `openclaw channels`

管理 Gateway 上的聊天頻道帳戶及其執行時狀態。

相關文件：

- 頻道指南：[頻道](/zh-Hant/channels)
- 閘道設定：[設定](/zh-Hant/gateway/configuration)

## 常用指令

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

`channels list` 僅顯示聊天頻道：預設為已設定的帳戶，每個帳戶附帶 `installed`、`configured` 和 `enabled` 狀態標籤。傳遞 `--all` 以顯示尚未設定帳戶的內建頻道，以及尚未安裝至磁碟的可安裝目錄頻道。驗證提供者（OAuth + API 金鑰）和模型提供者使用量/配額快照不再列印於此；請使用 `openclaw models auth list` 檢視提供者驗證設定檔，並使用 `openclaw status` 或 `openclaw models list` 檢視使用量。

## 狀態 / 功能 / 解析 / 日誌

- `channels status`：`--probe`、`--timeout <ms>`、`--json`
- `channels capabilities`：`--channel <name>`、`--account <id>`（僅限 `--channel`）、`--target <dest>`、`--timeout <ms>`、`--json`
- `channels resolve`：`<entries...>`、`--channel <name>`、`--account <id>`、`--kind <auto|user|group>`、`--json`
- `channels logs`：`--channel <name|all>`、`--lines <n>`、`--json`

`channels status --probe` 是即時路徑：在可連線的閘道上，它會針對每個帳戶執行
`probeAccount` 和選用的 `auditAccount` 檢查，因此輸出內容可包含傳輸
狀態以及探測結果，例如 `works`、`probe failed`、`audit ok` 或 `audit failed`。
若閘道無法連線，`channels status` 將改為僅依據設定進行摘要，
而不會輸出即時探測結果。

請勿將 `openclaw sessions`、Gateway `sessions.list` 或代理程式
`sessions_list` 工具用作通道 socket 健康狀態的訊號。這些介面回報的是
已儲存的對話記錄，而非提供者的執行階段狀態。Discord 提供者重啟後，
一個已連線但靜止的帳號可能是健康的，但在下一次傳入或傳出對話事件
之前，不會出現任何 Discord 工作階段記錄。

## 新增 / 移除帳號

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` 會顯示各通道的旗標（token、私密金鑰、app token、signal-cli 路徑等）。</Tip>

`channels remove` 僅對已安裝/已設定的通道外掛程式運作。對於可安裝的目錄通道，請先使用 `channels add`。
對於由執行階段支援的通道外掛程式，`channels remove` 也會要求正在執行的 Gateway 在更新設定前停止選定的帳號，因此停用或刪除帳號不會讓舊的監聽器保持啟用直到重啟。

常見的非互動式新增介面包括：

- bot-token 通道：`--token`、`--bot-token`、`--app-token`、`--token-file`
- Signal/iMessage 傳輸欄位：`--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`、`--db-path`、`--service`、`--region`
- Google Chat 欄位：`--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`
- Matrix 欄位：`--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit`
- Nostr 欄位：`--private-key`、`--relay-urls`
- Tlon 欄位：`--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`
- `--use-env` 用於支援的基於環境變數的預設帳戶驗證

如果在標誌驅動的 add 指令期間需要安裝通道外掛，OpenClaw 會使用通道的預設安裝來源，而不會開啟互動式外掛安裝提示。

當您不帶標誌執行 `openclaw channels add` 時，互動式精靈可以提示：

- 每個所選通道的帳戶 ID
- 這些帳戶的可選顯示名稱
- `Route these channel accounts to agents now?`

如果您確認現在綁定，精靈會詢問哪個代理應該擁有每個已設定的通道帳戶，並寫入帳戶範圍的路由綁定。

您也可以稍後使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由規則（請參閱 [agents](/zh-Hant/cli/agents)）。

當您新增非預設帳戶到仍在使用單一帳戶頂層設定的通道時，OpenClaw 會在寫入新帳戶之前，將帳戶範圍的頂層值提升到通道的帳戶對應中。大多數通道會將這些值放在 `channels.<channel>.accounts.default` 中，但捆綁通道可以保留現有的匹配提升帳戶。Matrix 是目前的範例：如果已存在一個命名帳戶，或者 `defaultAccount` 指向現有的命名帳戶，提升將保留該帳戶，而不是建立新的 `accounts.default`。

路由行為保持一致：

- 現有的僅通道綁定（沒有 `accountId`）繼續匹配預設帳戶。
- `channels add` 不會在非互動模式下自動建立或重寫綁定。
- 互動式設置可以選擇性地新增帳戶範圍的綁定。

如果您的配置已經處於混合狀態（存在命名帳戶並且仍設定了頂層單一帳戶值），請執行 `openclaw doctor --fix` 將帳戶範圍的值移動到為該通道選擇的提升帳戶中。大多數通道會提升到 `accounts.default`；Matrix 可以保留現有的命名/預設目標。

## 登入和登出（互動式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支援 `--verbose`。
- 當僅配置了一個支援的登入目標時，`channels login` 和 `logout` 可以推斷出通道。
- 當可連線時，`channels logout` 優先使用即時 Gateway 路徑，因此登出會在清除通道授權狀態之前停止任何活動中的監聽器。如果無法連線到本機 Gateway，它會回退到本機授權清理。
- 從 gateway 主機上的終端機執行 `channels login`。Agent `exec` 會封鎖此互動式登入流程；當可用時，應從聊天中使用通道原生的 Agent 登入工具，例如 `whatsapp_login`。

## 疑難排解

- 執行 `openclaw status --deep` 以進行廣泛探查。
- 使用 `openclaw doctor` 進行引導式修復。
- `openclaw channels list` 不再列印模型提供者使用量/配額快照。若要查看這些資訊，請使用 `openclaw status` (概覽) 或 `openclaw models list` (各提供者)。
- 當無法連線到 gateway 時，`openclaw channels status` 會回退到僅配置的摘要。如果透過 SecretRef 配置了支援的通道憑證但在當前指令路徑中無法使用，它會將該帳戶報告為已配置並附帶降級說明，而不是顯示為未配置。

## 功能探查

取得提供者功能提示（可用的 intents/scopes）以及靜態功能支援：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

備註：

- `--channel` 是可選的；省略它以列出每個通道（包括擴充功能）。
- `--account` 僅在與 `--channel` 搭配使用時有效。
- `--target` 接受 `channel:<id>` 或原始數值通道 ID，並且僅適用於 Discord。對於 Discord 語音通道，權限檢查標誌缺少 `ViewChannel`、`Connect`、`Speak`、`SendMessages` 和 `ReadMessageHistory`。
- 探查因提供者而異：Discord intents + 可選通道權限；Slack bot + user scopes；Telegram bot 標誌 + webhook；Signal daemon 版本；Microsoft Teams app token + Graph roles/scopes（已知者會加註）。沒有探查的通道會回報 `Probe: unavailable`。

## 將名稱解析為 ID

使用提供者目錄將頻道/使用者名稱解析為 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

註記：

- 使用 `--kind user|group|auto` 來強制指定目標類型。
- 當多個條目共用相同名稱時，解析會優先使用相符的項目。
- `channels resolve` 是唯讀的。如果選取的帳戶是透過 SecretRef 設定，但該憑證在目前指令路徑中無法使用，該指令會傳回降級的未解析結果並附帶註記，而不是中止整個執行。
- `channels resolve` 不會安裝頻道外掛。在為可安裝的目錄頻道解析名稱之前，請使用 `channels add --channel <name>`。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [頻道概覽](/zh-Hant/channels)
