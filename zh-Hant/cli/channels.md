---
summary: "CLI 參考資料 `openclaw channels` (帳號、狀態、登入/登出、記錄檔)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check channel status or tail channel logs
title: "channels"
---

# `openclaw channels`

管理聊天頻道帳號及其在 Gateway 上的執行時狀態。

相關文件：

- 頻道指南：[頻道](/zh-Hant/channels/index)
- Gateway 設定：[設定](/zh-Hant/gateway/configuration)

## 常用指令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 新增 / 移除帳號

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 會顯示各頻道的旗標 (token、金鑰、app token、signal-cli 路徑等)。

當您在不加旗標的情況下執行 `openclaw channels add` 時，互動式精靈會提示：

- 每個所選頻道的帳號 ID
- 這些帳號的選用顯示名稱
- `Bind configured channel accounts to agents now?`

如果您選擇立即綁定，精靈會詢問哪個代理程式應擁有每個設定的頻道帳號，並寫入帳號範圍的路由綁定。

您稍後也可以使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 來管理相同的路由規則 (請參閱 [agents](/zh-Hant/cli/agents))。

當您新增非預設帳號至仍使用單一帳號頂層設定 (尚無 `channels.<channel>.accounts` 項目) 的頻道時，OpenClaw 會將帳號範圍的單一帳號頂層值移入 `channels.<channel>.accounts.default`，然後寫入新帳號。這會在轉移至多帳號結構時保留原始帳號行為。

路由行為保持一致：

- 現有的僅頻道綁定 (無 `accountId`) 會繼續符合預設帳號。
- `channels add` 不會在非互動模式下自動建立或重寫綁定。
- 互動式設定可以選擇性地新增帳號範圍的綁定。

如果您的設定已處於混合狀態 (存在具名帳號、缺少 `default`，且仍設定頂層單一帳號值)，請執行 `openclaw doctor --fix` 以將帳號範圍的值移入 `accounts.default`。

## 登入 / 登出 (互動式)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## 疑難排解

- 執行 `openclaw status --deep` 以進行廣泛的探測。
- 使用 `openclaw doctor` 進行引導修復。
- `openclaw channels list` 會列印 `Claude: HTTP 403 ... user:profile` → 使用情況快照需要 `user:profile` 範圍。請使用 `--no-usage`，或提供 claude.ai 工作階段金鑰（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或透過 Claude Code CLI 重新驗證。
- 當閘道無法連線時，`openclaw channels status` 會退回至僅設定的摘要。如果支援的頻道憑證是透過 SecretRef 設定的，但在目前的指令路徑中無法使用，它會回報該帳號已設定並附上降級說明，而不是顯示為未設定。

## 功能探測

擷取提供者功能提示（可用的意圖/範圍）以及靜態功能支援：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

備註：

- `--channel` 為選填；省略以列出每個頻道（包括擴充功能）。
- `--target` 接受 `channel:<id>` 或原始數值頻道 ID，且僅適用於 Discord。
- 探測因提供者而異：Discord 意圖 + 可選頻道權限；Slack Bot + 使用者範圍；Telegram Bot 旗標 + Webhook；Signal 守護程式版本；MS Teams 應用程式權杖 + Graph 角色/範圍（在已知處會加上註解）。沒有探測的頻道會回報 `Probe: unavailable`。

## 將名稱解析為 ID

使用提供者目錄將頻道/使用者名稱解析為 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

備註：

- 使用 `--kind user|group|auto` 強制指定目標類型。
- 當多個項目共用相同名稱時，解析會優先使用符合的使用中項目。
- `channels resolve` 為唯讀。如果選取的帳號是透過 SecretRef 設定的，但該憑證在目前的指令路徑中無法使用，該指令會傳回附上說明的降級未解析結果，而不是中止整個執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
