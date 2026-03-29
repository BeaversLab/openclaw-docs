---
summary: "透過 NIP-04 加密訊息傳送的 Nostr DM 頻道"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**狀態：** 可選外掛（預設停用）。

Nostr 是一個去中心化的社交網路協定。此頻道讓 OpenClaw 能夠透過 NIP-04 接收並回覆加密的直訊（DMs）。

## 安裝（按需）

### 入門指引（推薦）

- 入門指引（`openclaw onboard`）和 `openclaw channels add` 列出可選的頻道外掛。
- 選擇 Nostr 會提示您按需安裝此外掛。

安裝預設值：

- **開發頻道 + 可用 git checkout：** 使用本地外掛路徑。
- **穩定版/Beta 版：** 從 npm 下載。

您始終可以在提示中覆寫該選擇。

### 手動安裝

```bash
openclaw plugins install @openclaw/nostr
```

使用本地 checkout（開發工作流程）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安裝或啟用外掛後，請重新啟動 Gateway。

### 非互動式設定

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 將 `NOSTR_PRIVATE_KEY` 保留在環境變數中，而不是將金鑰儲存在設定中。

## 快速設定

1. 產生 Nostr 金鑰對（如需要）：

```bash
# Using nak
nak key generate
```

2. 新增至設定：

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

| 金鑰         | 類型     | 預設值                                      | 說明                            |
| ------------ | -------- | ------------------------------------------- | ------------------------------- |
| `privateKey` | 字串     | 必填                                        | `nsec` 或十六進位格式的私密金鑰 |
| `relays`     | 字串陣列 | `['wss://relay.damus.io', 'wss://nos.lol']` | 中繼 URL（WebSocket）           |
| `dmPolicy`   | 字串     | `pairing`                                   | DM 存取原則                     |
| `allowFrom`  | 字串陣列 | `[]`                                        | 允許的發送者公鑰                |
| `enabled`    | 布林值   | `true`                                      | 啟用/停用頻道                   |
| `name`       | 字串     | -                                           | 顯示名稱                        |
| `profile`    | 物件     | -                                           | NIP-01 個人資料元數據           |

## 個人資料元數據

個人資料數據會作為 NIP-01 `kind:0` 事件發佈。您可以透過控制 UI（Channels -> Nostr -> Profile）進行管理，或直接在設定中設定。

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
- 從中繼匯入會合併欄位並保留本機覆寫值。

## 存取控制

### DM 原則

- **配對**（預設）：未知發送者會獲得配對碼。
- **白名單**：僅允許 `allowFrom` 中的公鑰發送 DM。
- **開放**：公開的傳入 DM（需要 `allowFrom: ["*"]`）。
- **停用**：忽略傳入的 DM。

執行備註：

- 發送者策略會在簽章驗證和 NIP-04 解密之前進行檢查。
- 配對回覆會在不處理原始 DM 內文的情況下發送。
- 傳入的 DM 會受到速率限制，且過大的負載會在解密前被丟棄。

### 白名單範例

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

- **私鑰：** `nsec...` 或 64 字元的十六進位碼
- **公鑰 (`allowFrom`)：** `npub...` 或十六進位碼

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

- 使用 2-3 個中繼站以提供冗餘。
- 避免使用過多中繼站（延遲、重複）。
- 付費中繼站可以提高可靠性。
- 本地中繼站適合用於測試（`ws://localhost:7777`）。

## 通訊協定支援

| NIP    | 狀態   | 描述                        |
| ------ | ------ | --------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 檔案詮釋資料 |
| NIP-04 | 已支援 | 加密 DM (`kind:4`)          |
| NIP-17 | 計劃中 | 禮物包裝的 DM               |
| NIP-44 | 計劃中 | 版本化加密                  |

## 測試

### 本地中繼站

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
2. 開啟一個 Nostr 客戶端（Damus、Amethyst 等）。
3. 傳送 DM 給機器人的公鑰。
4. 驗證回應。

## 故障排除

### 未收到訊息

- 驗證私鑰是否有效。
- 確保中繼站 URL 可以連線，並使用 `wss://`（或針對本地使用 `ws://`）。
- 確認 `enabled` 不是 `false`。
- 檢查 Gateway 日誌中的中繼站連線錯誤。

### 未發送回應

- 檢查中繼站是否接受寫入。
- 驗證連出連線能力。
- 注意中繼站的速率限制。

### 重複的回應

- 使用多個中繼站時是預期的行為。
- 訊息會透過事件 ID 去重；只有第一次遞送會觸發回應。

## 安全性

- 切勿提交私鑰。
- 使用環境變數來儲存金鑰。
- 考慮為生產環境的機器人使用 `allowlist`。
- 配對和白名單策略會在解密之前強制執行，因此未知發送者無法強制進行完整的加密運算。

## 限制 (MVP)

- 僅限直接訊息（無群組聊天）。
- 無媒體附件。
- 僅支援 NIP-04（計劃支援 NIP-17 gift-wrap）。
