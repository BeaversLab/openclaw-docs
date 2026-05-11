---
summary: "透過 NIP-04 加密訊息傳送的 Nostr DM 頻道"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

**狀態：** 選用的隨附外掛（在設定前預設為停用）。

Nostr 是一個去中心化的社群網路協定。此管道讓 OpenClaw 能透過 NIP-04 接收並回應加密的私人訊息 (DM)。

## 隨附外掛

目前 OpenClaw 的發行版本將 Nostr 作為隨附外掛提供，因此一般的封裝建置
不需要額外安裝。

### 舊版/自訂安裝

- Onboarding (`openclaw onboard`) 和 `openclaw channels add` 仍會從
  共用管道目錄中顯示 Nostr。
- 如果您的建置排除了隨附的 Nostr，請手動安裝它。

```bash
openclaw plugins install @openclaw/nostr
```

使用本地檢出（開發工作流程）：

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

安裝或啟用外掛後，請重新啟動 Gateway。

### 非互動式設定

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 將 `NOSTR_PRIVATE_KEY` 保留在環境變數中，而不是將金鑰儲存在設定檔中。

## 快速設定

1. 生成 Nostr 金鑰對（如果需要）：

```bash
# Using nak
nak key generate
```

2. 加入設定：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. 匯出金鑰：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重新啟動 Gateway。

## 設定參考

| 金鑰         | 類型     | 預設值                                      | 描述                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | string   | required                                    | `nsec` 或十六進位格式的私鑰 |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中繼器 URL (WebSocket)      |
| `dmPolicy`   | string   | `pairing`                                   | DM 存取原則                 |
| `allowFrom`  | string[] | `[]`                                        | 允許的傳送者公鑰            |
| `enabled`    | boolean  | `true`                                      | 啟用/停用管道               |
| `name`       | string   | -                                           | 顯示名稱                    |
| `profile`    | object   | -                                           | NIP-01 個人資料元數據       |

## 個人資料元數據

個人資料資料會作為 NIP-01 `kind:0` 事件發佈。您可以透過 Control UI (Channels -> Nostr -> Profile) 管理它，或直接在設定中進行設定。

範例：

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

備註：

- 個人資料 URL 必須使用 `https://`。
- 從中繼器匯入會合併欄位並保留本機覆寫。

## 存取控制

### DM 原則

- **pairing** (預設)：未知的傳送者會收到配對代碼。
- **allowlist**：只有 `allowFrom` 中的公鑰可以傳送 DM。
- **open**：公開的連入 DM (需要 `allowFrom: ["*"]`)。
- **disabled**：忽略傳入的 DM。

執行注意事項：

- 傳入事件簽名會在發送者策略和 NIP-04 解密之前進行驗證，因此偽造的事件會被提早拒絕。
- 配對回應的發送不會處理原始 DM 內文。
- 傳入的 DM 受到速率限制，且過大的承載會在解密前被丟棄。

### 許可清單範例

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## 金鑰格式

接受的格式：

- **私鑰：** `nsec...` 或 64 字元的十六進位
- **公鑰 (`allowFrom`)：** `npub...` 或十六進位

## 中繼站

預設值：`relay.damus.io` 和 `nos.lol`。

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

提示：

- 使用 2-3 個中繼站以實現備援。
- 避免使用過多中繼站（延遲、重複）。
- 付費中繼站可以提高可靠性。
- 本機中繼站適合測試使用 (`ws://localhost:7777`)。

## 通訊協定支援

| NIP    | 狀態   | 描述                      |
| ------ | ------ | ------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 檔案元數據 |
| NIP-04 | 已支援 | 加密的 DM (`kind:4`)      |
| NIP-17 | 計畫中 | Gift-wrapped DMs          |
| NIP-44 | 計畫中 | 版本化加密                |

## 測試

### 本機中繼站

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### 手動測試

1. 從日誌中記下 bot 公鑰 (npub)。
2. 開啟 Nostr 客戶端 (Damus、Amethyst 等)。
3. 傳送 DM 給 bot 公鑰。
4. 驗證回應。

## 疑難排解

### 未收到訊息

- 驗證私鑰是否有效。
- 確保中繼站 URL 可連線，並使用 `wss://` (或使用 `ws://` 進行本機連線)。
- 確認 `enabled` 不是 `false`。
- 檢查 Gateway 日誌中的中繼站連線錯誤。

### 未發送回應

- 檢查中繼站是否接受寫入。
- 驗證輸出連線能力。
- 留意中繼站的速率限制。

### 重複的回應

- 使用多個中繼站時屬於正常現象。
- 訊息會依據事件 ID 進行重複資料刪除；僅有首次傳遞會觸發回應。

## 安全性

- 切勿提交私鑰。
- 使用環境變數來儲存金鑰。
- 請考慮為生產環境的機器人使用 `allowlist`。
- 簽名會在發送者策略之前進行驗證，且發送者策略會在解密之前執行，因此偽造的事件會被提早拒絕，未知的發送者無法強制進行完整的加密運算。

## 限制 (MVP)

- 僅支援直接訊息 (無群組聊天)。
- 不支援媒體附件。
- 僅支援 NIP-04 (計畫支援 NIP-17 gift-wrap)。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群聊行為與提及閘道
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
