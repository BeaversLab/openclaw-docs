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

- 頻道指南：[頻道](/zh-Hant/channels/index)
- Gateway 組態：[組態](/zh-Hant/gateway/configuration)

## 常用指令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 狀態 / 功能 / 解析 / 日誌

- `channels status`: `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (僅適用於 `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` 是即時路徑：在可連線的 gateway 上，它會對每個帳戶執行
`probeAccount` 和選用的 `auditAccount` 檢查，因此輸出可能包含傳輸
狀態以及探測結果，例如 `works`、`probe failed`、`audit ok` 或 `audit failed`。
如果無法連線到 gateway，`channels status` 會改為回退到僅含組態的摘要，
而不是即時探測輸出。

## 新增 / 移除帳戶

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 會顯示各頻道的旗標（token、私鑰、app token、signal-cli 路徑等）。

常見的非互動式新增介面包括：

- bot-token 頻道：`--token`, `--bot-token`, `--app-token`, `--token-file`
- Signal/iMessage 傳輸欄位：`--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Google Chat 欄位：`--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`
- Matrix 欄位：`--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit`
- Nostr 欄位：`--private-key`、`--relay-urls`
- Tlon 欄位：`--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`
- `--use-env` 用於受支援的基於環境變數的預設帳戶驗證

當您不帶旗標執行 `openclaw channels add` 時，互動式精靈可能會提示：

- 每個所選頻道的帳戶 ID
- 這些帳戶的選用顯示名稱
- `Bind configured channel accounts to agents now?`

如果您確認現在綁定，精靈會詢問哪個代理應該擁有每個已設定的頻道帳戶，並寫入帳戶範圍的路由綁定。

您稍後也可以使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由規則（請參閱 [agents](/zh-Hant/cli/agents)）。

當您新增非預設帳戶到仍在使用單一帳戶頂層設定的頻道時，OpenClaw 會在寫入新帳戶之前，將帳戶範圍的頂層值提升至頻道的帳戶對映中。大多數頻道會將這些值放入 `channels.<channel>.accounts.default`，但捆綁頻道可以保留現有的相符提升帳戶。Matrix 是目前的範例：如果一個命名帳戶已經存在，或者 `defaultAccount` 指向現有的命名帳戶，提升操作會保留該帳戶，而不是建立新的 `accounts.default`。

路由行為保持一致：

- 現有的僅頻道綁定（無 `accountId`）繼續符合預設帳戶。
- `channels add` 不會在非互動模式下自動建立或重寫綁定。
- 互動式設定可以選擇性新增帳戶範圍的綁定。

如果您的配置已處於混合狀態（存在命名帳戶且仍設定了頂層單一帳戶值），請執行 `openclaw doctor --fix` 將帳戶範圍的值移至為該頻道選擇的升級帳戶。大多數頻道會升級至 `accounts.default`；Matrix 可以保留現有的命名/預設目標。

## 登入 / 登出（互動式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

注意：

- `channels login` 支援 `--verbose`。
- 當僅設定了一個支援的登入目標時，`channels login` / `logout` 可以推斷頻道。

## 疑難排解

- 執行 `openclaw status --deep` 進行廣泛探查。
- 使用 `openclaw doctor` 進行引導式修復。
- `openclaw channels list` 顯示 `Claude: HTTP 403 ... user:profile` → 使用快照需要 `user:profile` 範圍。使用 `--no-usage`，或提供 claude.ai 工作階段金鑰 (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`)，或透過 Claude CLI 重新驗證。
- 當無法連線到閘道時，`openclaw channels status` 會退回到僅設定摘要。如果支援的頻道憑證是透過 SecretRef 設定的，但在目前命令路徑中無法取得，它會將該帳戶回報為已設定並附上降級註記，而不是顯示為未設定。

## 功能探查

取得提供者功能提示（可用時的意圖/範圍）以及靜態功能支援：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

注意：

- `--channel` 是選用的；省略它以列出每個頻道（包括擴充功能）。
- `--account` 僅對 `--channel` 有效。
- `--target` 接受 `channel:<id>` 或原始數字頻道 ID，且僅適用於 Discord。
- 探查因提供者而異：Discord 意圖 + 可選頻道權限；Slack 機器人 + 使用者範圍；Telegram 機器人旗標 + webhook；Signal 守護程序版本；Microsoft Teams 應用程式權杖 + Graph 角色/範圍（已知處會標註）。無探查的頻道會回報 `Probe: unavailable`。

## 將名稱解析為 ID

使用提供者目錄將頻道/使用者名稱解析為 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

注意：

- 使用 `--kind user|group|auto` 強制指定目標類型。
- 當多個條目共用相同名稱時，解析會優先考慮活動的相符項。
- `channels resolve` 是唯讀的。如果選取的帳戶是透過 SecretRef 設定，但該憑證在目前的指令路徑中無法使用，該指令會傳回附帶註記的降級未解析結果，而不是中止整個執行程序。
