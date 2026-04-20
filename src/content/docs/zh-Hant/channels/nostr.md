---
summary: "透過 NIP-04 加密訊息傳送的 Nostr DM 頻道"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**狀態：** 可選的捆綁外掛（預設為停用，直到設定完成）。

Nostr 是一個去中心化的社交網路協定。此頻道讓 OpenClaw 能夠透過 NIP-04 接收並回覆加密的直訊（DMs）。

## 捆綁外掛

目前的 OpenClaw 發行版本將 Nostr 作為捆綁外掛隨附，因此一般的打包版本
無需單獨安裝。

### 舊版/自訂安裝

- Onboarding (`openclaw onboard`) 和 `openclaw channels add` 仍然會
  從共用通道目錄中提供 Nostr。
- 如果您的版本排除了捆綁的 Nostr，請手動安裝。

```bash
openclaw plugins install @openclaw/nostr
```

使用本地 checkout（開發工作流程）：

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

1. 產生 Nostr 金鑰對（如果需要）：

```bash
# Using nak
nak key generate
```

2. 加入到設定：

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
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | Relay URLs (WebSocket)      |
| `dmPolicy`   | string   | `pairing`                                   | DM 存取原則                 |
| `allowFrom`  | string[] | `[]`                                        | 允許的發送者公鑰            |
| `enabled`    | boolean  | `true`                                      | 啟用/停用通道               |
| `name`       | string   | -                                           | 顯示名稱                    |
| `profile`    | object   | -                                           | NIP-01 個人資料元數據       |

## 個人資料元數據

個人資料數據會作為 NIP-01 `kind:0` 事件發佈。您可以從控制 UI (Channels -> Nostr -> Profile) 管理，或直接在設定中設定。

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
- 從 relays 匯入會合併欄位並保留本機覆蓋設定。

## 存取控制

### DM 原則

- **pairing** (預設)：未知發送者會收到配對碼。
- **allowlist**：僅 `allowFrom` 中的公鑰可以發送 DM。
- **open**：公開接收的 DM (需要 `allowFrom: ["*"]`)。
- **disabled**：忽略接收的 DM。

執行備註：

- 傳入事件簽章會在發送者原則和 NIP-04 解密之前進行驗證，因此偽造的事件會被提早拒絕。
- 配對回覆會在未處理原始 DM 內文的情況下發送。
- 傳入的 DM 受到速率限制，且過大的負載會在解密前被丟棄。

### 允許清單範例

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

- **私鑰：** `nsec...` 或 64 字元的十六進位字串
- **公鑰 (`allowFrom`)：** `npub...` 或十六進位字串

## 中繼器 (Relays)

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

- 使用 2-3 個中繼器以提供冗餘。
- 避免使用過多中繼器（延遲、重複）。
- 付費中繼器可提高可靠性。
- 本地中繼器適合用於測試 (`ws://localhost:7777`)。

## 通訊協定支援

| NIP    | 狀態   | 描述                             |
| ------ | ------ | -------------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 個人資料元數據    |
| NIP-04 | 已支援 | 加密 DM (`kind:4`)               |
| NIP-17 | 計畫中 | 禮物包裝的 DM (Gift-wrapped DMs) |
| NIP-44 | 計畫中 | 版本化加密                       |

## 測試

### 本地中繼器

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

1. 從日誌中記下機器人的公鑰 (npub)。
2. 開啟一個 Nostr 客戶端 (Damus, Amethyst 等)。
3. 傳送 DM 給機器人的公鑰。
4. 驗證回應。

## 疑難排解

### 未收到訊息

- 確認私鑰有效。
- 確保中繼器 URL 可存取並使用 `wss://` (或使用 `ws://` 連線至本地)。
- 確認 `enabled` 未設定為 `false`。
- 檢查 Gateway 日誌中的中繼器連線錯誤。

### 未發送回應

- 檢查中繼器是否接受寫入。
- 驗證輸出連線能力。
- 注意中繼器的速率限制。

### 重複的回應

- 使用多個中繼器時這是預期行為。
- 訊息會依事件 ID 進行重複資料刪除；僅首次傳遞會觸發回應。

## 安全性

- 切勿提交私鑰。
- 使用環境變數來儲存金鑰。
- 考慮為生產環境的機器人使用 `allowlist`。
- 簽章會在發送者原則之前進行驗證，而發送者原則則在解密之前執行，因此偽造的事件會被提早拒絕，且未知的發送者無法強制進行完整的加密運算。

## 限制 (MVP)

- 僅限直接訊息（無群組聊天）。
- 無媒體附件。
- 僅支援 NIP-04（計畫支援 NIP-17 gift-wrap）。

## 相關內容

- [頻道概觀](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群聊行為與提及閘控
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
