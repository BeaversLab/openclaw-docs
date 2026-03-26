---
summary: "透過 NIP-04 加密訊息的 Nostr DM 頻道"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**狀態：** 選用外掛（預設停用）。

Nostr 是一個去中心化的社交網路協定。此頻道讓 OpenClaw 能透過 NIP-04 接收並回應加密的直訊（DM）。

## 安裝（按需）

### 引導（推薦）

- 引導（`openclaw onboard`）和 `openclaw channels add` 會列出選用的頻道外掛。
- 選取 Nostr 時，系統會提示您隨需安裝此外掛。

安裝預設值：

- **Dev channel + git checkout available：** 使用本地外掛路徑。
- **Stable/Beta：** 從 npm 下載。

您隨時可以在提示中覆寫該選擇。

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

使用 `--use-env` 將 `NOSTR_PRIVATE_KEY` 保留在環境變數中，而不是將金鑰儲存在設定檔中。

## 快速設定

1. （如需要）生成 Nostr 金鑰對：

```bash
# Using nak
nak key generate
```

2. 加入設定檔：

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

| 金鑰         | 類型     | 預設值                                      | 說明                        |
| ------------ | -------- | ------------------------------------------- | --------------------------- |
| `privateKey` | 字串     | 必填                                        | `nsec` 或十六進位格式的私鑰 |
| `relays`     | 字串陣列 | `['wss://relay.damus.io', 'wss://nos.lol']` | 中繼器 URL (WebSocket)      |
| `dmPolicy`   | 字串     | `pairing`                                   | DM 存取原則                 |
| `allowFrom`  | 字串陣列 | `[]`                                        | 允許的發送者公鑰            |
| `enabled`    | 布林值   | `true`                                      | 啟用/停用頻道               |
| `name`       | 字串     | -                                           | 顯示名稱                    |
| `profile`    | 物件     | -                                           | NIP-01 個人資料元數據       |

## 個人資料元數據

個人資料會以 NIP-01 `kind:0` 事件發佈。您可以從控制 UI（Channels -> Nostr -> Profile）進行管理，或直接在配置中設定。

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
- 從中繼器匯入會合併欄位並保留本機覆寫設定。

## 存取控制

### DM 政策

- **pairing**（預設）：未知的發送者會收到配對代碼。
- **allowlist**：僅允許 `allowFrom` 中的公鑰發送 DM。
- **open**：公開接收 DM（需要 `allowFrom: ["*"]`）。
- **disabled**：忽略傳入的 DM。

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

- **私密金鑰：** `nsec...` 或 64 字元十六進位
- **公鑰 (`allowFrom`):** `npub...` 或十六進位

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

- 使用 2-3 個中繼站以增加冗餘。
- 避免過多中繼站（延遲、重複）。
- 付費中繼站可提高可靠性。
- 本地中繼站適合測試 (`ws://localhost:7777`)。

## 通訊協定支援

| NIP    | 狀態   | 描述                          |
| ------ | ------ | ----------------------------- |
| NIP-01 | 已支援 | 基本事件格式 + 個人資料元數據 |
| NIP-04 | 已支援 | 加密的私人訊息 (`kind:4`)     |
| NIP-17 | 計畫中 | 禮物包裝的私人訊息            |
| NIP-44 | 計畫中 | 版本化加密                    |

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

1. 從日誌中記下 bot 公鑰 (npub)。
2. 開啟 Nostr 客戶端（Damus、Amethyst 等）。
3. 傳送私人訊息給 bot 公鑰。
4. 驗證回應。

## 疑難排解

### 未收到訊息

- 驗證私鑰是否有效。
- 確保中繼 URL 可訪問並使用 `wss://`（或本地使用 `ws://`）。
- 確認 `enabled` 未設定為 `false`。
- 檢查 Gateway 日誌中的中繼連線錯誤。

### 未發送回應

- 檢查中繼是否接受寫入。
- 驗證出站連線。
- 留意中繼速率限制。

### 重複的回應

- 使用多個中繼時屬預期行為。
- 訊息會依事件 ID 去重；僅首次遞送會觸發回應。

## 安全性

- 切勿提交私密金鑰。
- 使用環境變數儲存金鑰。
- 考慮對生產機器人使用 `allowlist`。

## 限制（MVP）

- 僅支援直接訊息（無群組聊天）。
- 不支援媒體附件。
- 僅支援 NIP-04（計畫支援 NIP-17 gift-wrap）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
