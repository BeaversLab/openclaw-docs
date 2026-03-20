---
summary: "透過 NIP-04 加密訊息進行的 Nostr DM 頻道"
read_when:
  - 您希望 OpenClaw 透過 Nostr 接收 DM
  - 您正在設定去中心化訊息傳遞
title: "Nostr"
---

# Nostr

**狀態：** 選用外掛（預設停用）。

Nostr 是一個用於社交網路的去中心化通訊協定。此頻道讓 OpenClaw 能透過 NIP-04 接收並回應加密的直訊 (DM)。

## 安裝（視需求）

### 上架（建議）

- 上架 (`openclaw onboard`) 和 `openclaw channels add` 會列出選用的頻道外掛。
- 選擇 Nostr 將會提示您視需求安裝此外掛。

安裝預設值：

- **Dev channel + git checkout available：** 使用本機外掛路徑。
- **Stable/Beta：** 從 npm 下載。

您隨時都可以在提示中覆寫該選項。

### 手動安裝

```bash
openclaw plugins install @openclaw/nostr
```

使用本機 checkout（開發工作流程）：

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

安裝或啟用外掛後，請重新啟動 Gateway。

### 非互動式設定

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

使用 `--use-env` 將 `NOSTR_PRIVATE_KEY` 保留在環境中，而不是將金鑰儲存在設定中。

## 快速設定

1. 生成 Nostr 金鑰對（如需要）：

```bash
# Using nak
nak key generate
```

2. 加入到設定：

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

| 金鑰         | 類型     | 預設值                                      | 描述                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | string   | 必要                                        | `nsec` 或十六進位格式的私鑰 |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | Relay URLs (WebSocket)      |
| `dmPolicy`   | string   | `pairing`                                   | DM 存取原則                 |
| `allowFrom`  | string[] | `[]`                                        | 允許的發送者公鑰            |
| `enabled`    | boolean  | `true`                                      | 啟用/停用頻道               |
| `name`       | string   | -                                           | 顯示名稱                    |
| `profile`    | object   | -                                           | NIP-01 檔案元資料           |

## 檔案元資料

檔案資料會作為 NIP-01 `kind:0` 事件發佈。您可以從控制 UI (Channels -> Nostr -> Profile) 管理它，或直接在設定中設定。

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

- 檔案 URL 必須使用 `https://`。
- 從中繼器匯入會合併欄位並保留本機覆寫。

## 存取控制

### DM 原則

- **pairing** (預設)：未知發送者會收到配對碼。
- **allowlist**：僅 `allowFrom` 中的公鑰可以發送私訊。
- **open**：公開接收私訊（需要 `allowFrom: ["*"]`）。
- **disabled**：忽略接收到的私訊。

### 允許清單範例

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

- **私鑰：** `nsec...` 或 64 字元十六進位
- **公鑰 (`allowFrom`)：** `npub...` 或十六進位

## 中繼器

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

- 使用 2-3 個中繼器以提供冗餘。
- 避免使用過多中繼器（延遲、重複）。
- 付費中繼器可以提高可靠性。
- 本機中繼器適合用於測試 (`ws://localhost:7777`)。

## 通訊協定支援

| NIP    | 狀態   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 個人資料元數據 |
| NIP-04 | 已支援 | 加密私訊 (`kind:4`)           |
| NIP-17 | 計劃中 | 禮物包裝私訊                  |
| NIP-44 | 計劃中 | 版本化加密                    |

## 測試

### 本機中繼器

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

1. 從日誌中記下機器人公鑰 (npub)。
2. 開啟 Nostr 用戶端 (Damus, Amethyst 等)。
3. 傳送私訊給機器人公鑰。
4. 驗證回應。

## 故障排除

### 未收到訊息

- 驗證私鑰是否有效。
- 確保中繼器 URL 可連線並使用 `wss://`（本機則使用 `ws://`）。
- 確認 `enabled` 未設為 `false`。
- 檢查 Gateway 日誌中的中繼器連線錯誤。

### 未發送回應

- 檢查中繼器是否接受寫入。
- 驗證出站連線能力。
- 留意中繼器的速率限制。

### 重複的回應

- 使用多個中繼器時屬預期行為。
- 訊息會依事件 ID 進行去重；只有第一次遞送會觸發回應。

## 安全性

- 絕不要提交私鑰。
- 使用環境變數來存放金鑰。
- 對於正式環境的機器人，請考慮 `allowlist`。

## 限制 (MVP)

- 僅支援直接訊息（不支援群組聊天）。
- 不支援媒體附件。
- 僅支援 NIP-04（NIP-17 禮物包裝功能計劃中）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
