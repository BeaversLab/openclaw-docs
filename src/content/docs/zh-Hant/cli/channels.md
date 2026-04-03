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

- 頻道指南：[頻道](/en/channels/index)
- Gateway 設定：[設定](/en/gateway/configuration)

## 常用指令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 新增 / 移除帳戶

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 顯示各頻道的旗標（token、私密金鑰、app token、signal-cli 路徑等）。

當您不帶旗標執行 `openclaw channels add` 時，互動式精靈會提示：

- 所選頻道的帳戶 ID
- 這些帳戶的選用顯示名稱
- `Bind configured channel accounts to agents now?`

如果您現在確認綁定，精靈會詢問每個設定的頻道帳戶應由哪個代理程式擁有，並寫入帳戶範圍的路由綁定。

您稍後也可以使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由規則（請參閱 [代理程式](/en/cli/agents)）。

當您新增非預設帳戶到仍在使用單一帳戶頂層設定的頻道（尚未有 `channels.<channel>.accounts` 項目）時，OpenClaw 會將帳戶範圍的單一帳戶頂層值移至 `channels.<channel>.accounts.default`，然後寫入新帳戶。這會在轉移至多帳戶結構時保留原始帳戶行為。

路由行為保持一致：

- 現有的僅頻道綁定（無 `accountId`）會繼續符合預設帳戶。
- `channels add` 不會在非互動模式下自動建立或重寫綁定。
- 互動式設定可以選擇性地新增帳戶範圍的綁定。

如果您的設定已處於混合狀態（存在具名帳戶、缺少 `default`，且仍設定了頂層單一帳戶值），請執行 `openclaw doctor --fix` 將帳戶範圍的值移至 `accounts.default`。

## 登入 / 登出（互動式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## 疑難排解

- 執行 `openclaw status --deep` 以進行廣泛探查。
- 使用 `openclaw doctor` 進行引導式修復。
- `openclaw channels list` 會列印 `Claude: HTTP 403 ... user:profile` → 使用情況快照需要 `user:profile` 範圍。請使用 `--no-usage`，或提供 claude.ai 工作階段金鑰 (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`)，或透過 Claude Code CLI 重新驗證。
- 當無法連線到閘道時，`openclaw channels status` 會退回到僅設定摘要。如果支援的頻道憑證是透過 SecretRef 設定，但在目前的指令路徑中無法使用，它會將該帳戶回報為已設定並附帶降級註記，而不是顯示為未設定。

## 功能探測

取得提供者功能提示 (可用時的 intents/scopes) 加上靜態功能支援：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

備註：

- `--channel` 是選用的；省略它以列出每個頻道 (包括擴充功能)。
- `--target` 接受 `channel:<id>` 或原始數值頻道 ID，且僅適用於 Discord。
- 探測因提供者而異：Discord intents + 選用頻道權限；Slack bot + user scopes；Telegram bot 旗標 + webhook；Signal daemon 版本；Microsoft Teams 應用程式權杖 + Graph roles/scopes (已知者會加註)。沒有探測的頻道會回報 `Probe: unavailable`。

## 將名稱解析為 ID

使用提供者目錄將頻道/使用者名稱解析為 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

備註：

- 使用 `--kind user|group|auto` 來強制指定目標類型。
- 當多個項目共用相同名稱時，解析偏好使用中的相符項目。
- `channels resolve` 是唯讀的。如果選取的帳戶是透過 SecretRef 設定，但該憑證在目前的指令路徑中無法使用，則指令會傳回附帶註記的降級未解析結果，而不是中止整個執行。
