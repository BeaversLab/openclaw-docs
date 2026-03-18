---
summary: "透過 NIP-04 加密訊息進行 Nostr DM 傳輸"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**狀態：** 選用插件（預設停用）。

Nostr 是一個去中心化的社交網路協定。此通道讓 OpenClaw 能透過 NIP-04 接收並回應加密的直訊 (DM)。

## 安裝（按需）

### 入門引導（推薦）

- 入門引導 (`openclaw onboard`) 和 `openclaw channels add` 會列出選用的通道插件。
- 選擇 Nostr 會提示您按需安裝該插件。

安裝預設值：

- **開發者通道 + git checkout 可用：** 使用本地插件路徑。
- **穩定版/Beta：** 從 npm 下載。

您隨時可以在提示中覆寫該選擇。

### 手動安裝

```bash
openclaw plugins install @openclaw/nostr
```

使用本地 checkout（開發工作流程）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安裝或啟用插件後，請重新啟動 Gateway。

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

2. 新增至設定：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

3. 匯出金鑰：

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. 重新啟動 Gateway。

## 設定參考

| 金鑰         | 類型   | 預設值                                      | 說明                        |
| ------------ | ------ | ------------------------------------------- | --------------------------- |
| `privateKey` | 字串   | 必填                                        | `nsec` 或十六進位格式的私鑰 |
| `relays`     | 字串[] | `['wss://relay.damus.io', 'wss://nos.lol']` | 中繼網址 (WebSocket)        |
| `dmPolicy`   | 字串   | `pairing`                                   | DM 存取權限原則             |
| `allowFrom`  | 字串[] | `[]`                                        | 允許的發送者公鑰            |
| `enabled`    | 布林值 | `true`                                      | 啟用/停用通道               |
| `name`       | 字串   | -                                           | 顯示名稱                    |
| `profile`    | 物件   | -                                           | NIP-01 個人資料元數據       |

## 個人資料元數據

個人資料資料會以 NIP-01 `kind:0` 事件發布。您可以從控制 UI (Channels -> Nostr -> Profile) 進行管理，或直接在設定檔中設定。

範例：

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "openclaw",
        "displayName": "OpenClaw",
        "about": "Personal assistant DM bot",
        "picture": "https://example.com/avatar.png",
        "banner": "https://example.com/banner.png",
        "website": "https://example.com",
        "nip05": "openclaw@example.com",
        "lud16": "openclaw@example.com"
      }
    }
  }
}
```

備註：

- 個人資料網址必須使用 `https://`。
- 從中繼匯入會合併欄位並保留本機覆寫。

## 存取控制

### DM 原則

- **配對**（預設）：未知發送者會獲得配對碼。
- **白名單**：僅 `allowFrom` 中的公鑰可以發送 DM。
- **開放**：公開接收 DM（需要 `allowFrom: ["*"]`）。
- **停用**：忽略接收到的 DM。

### 白名單範例

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}
```

## 金鑰格式

接受的格式：

- **私密金鑰：** `nsec...` 或 64 字元十六進位
- **公鑰 (`allowFrom`)：** `npub...` 或十六進位

## 中繼站

預設值：`relay.damus.io` 和 `nos.lol`。

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"]
    }
  }
}
```

提示：

- 使用 2-3 個中繼站以確保備援。
- 避免使用過多中繼站（延遲、重複）。
- 付費中繼站可提升可靠性。
- 本機中繼站適合用於測試 (`ws://localhost:7777`)。

## 協定支援

| NIP    | 狀態   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 個人資料元數據 |
| NIP-04 | 已支援 | 加密 DM (`kind:4`)            |
| NIP-17 | 計畫中 | 禮物包裝 DM                   |
| NIP-44 | 計畫中 | 版本化加密                    |

## 測試

### 本機中繼站

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
}
```

### 手動測試

1. 從日誌中記下 bot 的公鑰 (npub)。
2. 開啟 Nostr 用戶端（Damus、Amethyst 等）。
3. 傳送 DM 給該 bot 公鑰。
4. 驗證回應。

## 疑難排解

### 未收到訊息

- 確認私密金鑰是有效的。
- 確保中繼站 URL 可連線並使用 `wss://`（或本機使用 `ws://`）。
- 確認 `enabled` 未設定為 `false`。
- 檢查 Gateway 日誌中的中繼站連線錯誤。

### 未發送回應

- 檢查中繼站是否接受寫入。
- 驗證輸出連線能力。
- 留意中繼站的速率限制。

### 重複的回應

- 使用多個中繼站時屬預期行為。
- 訊息會依事件 ID 去重；僅首次傳遞會觸發回應。

## 安全性

- 切勿提交私密金鑰。
- 使用環境變數來儲存金鑰。
- 考慮對正式環境的 Bot 使用 `allowlist`。

## 限制 (MVP)

- 僅支援直接訊息（無群組聊天）。
- 不支援媒體附件。
- 僅支援 NIP-04（計畫支援 NIP-17 gift-wrap）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
