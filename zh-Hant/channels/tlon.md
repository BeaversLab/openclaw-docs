---
summary: "Tlon/Urbit 支援狀態、功能及設定"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon（外掛程式）

Tlon 是基於 Urbit 建構的去中心化訊息應用程式。OpenClaw 會連線至您的 Urbit ship，並且回應私人訊息 (DM) 和群組聊天訊息。群組回覆預設需要 @ 提及，且可透過允許清單進一步限制。

狀態：透過外掛程式支援。支援私人訊息、群組提及、討論串回覆、富文字格式設定以及圖片上傳。尚未支援表情符號反應和投票。

## 所需外掛程式

Tlon 以外掛程式形式提供，並未隨附於核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/tlon
```

本地簽出 (當從 git repo 執行時)：

```bash
openclaw plugins install ./extensions/tlon
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 設定

1. 安裝 Tlon 外掛程式。
2. 準備好您的 ship URL 和登入代碼。
3. 設定 `channels.tlon`。
4. 重新啟動 gateway。
5. 私訊機器人或群組提及。

最小化設定（單一帳號）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}
```

## 私人/LAN ships

預設情況下，OpenClaw 會阻擋私人/內部主機名稱和 IP 範圍以提供 SSRF 保護。
如果您的 ship 運行在私人網路上（localhost、LAN IP 或內部主機名稱），
您必須明確選擇加入：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

這適用於以下 URL：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 只有在您信任本地網路時才啟用此功能。此設定會停用對您 ship URL
請求的 SSRF 保護。

## 群組頻道

預設啟用自動探索。您也可以手動釘選頻道：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

停用自動探索：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## 存取控制

DM 許可清單（空值 = 不允許 DM，使用 `ownerShip` 進行審核流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群組授權（預設限制）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## 擁有者和審核系統

設定一個擁有者 ship 以在未授權的使用者嘗試互動時接收審核請求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

擁有者 ship **在所有地方均自動獲得授權** — DM 邀請會自動接受，且頻道訊息總是被允許。您無需將擁有者新增至 `dmAllowlist` 或
`defaultAuthorizedShips`。

設定後，擁有者將收到關於以下事項的 DM 通知：

- 來自不在允許清單中 ships 的 DM 請求
- 未獲授權頻道中的提及
- 群組邀請請求

## 自動接受設定

自動接受 DM 邀請（針對 dmAllowlist 中的 ships）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自動接受群組邀請：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## 傳送目標 (CLI/cron)

搭配 `openclaw message send` 或 cron 傳送使用：

- DM：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群組：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 內建技能

Tlon 外掛程式包含一個內建的技能 ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))，
提供對 Tlon 操作的 CLI 存取：

- **Contacts**：取得/更新個人資料、列出聯絡人
- **Channels**：列出、建立、張貼訊息、取得歷史紀錄
- **Groups**：列出、建立、管理成員
- **DMs**：傳送訊息、對訊息做出反應
- **Reactions**：對貼文和 DM 新增/移除表情符號反應
- **Settings**：透過斜線指令管理外掛程式權限

安裝外掛程式後，該技能會自動啟用。

## 功能

| 功能      | 狀態                              |
| --------- | --------------------------------- |
| 直接訊息  | ✅ 已支援                         |
| 群組/頻道 | ✅ 已支援（預設由提及觸發）       |
| 討論串    | ✅ 已支援（討論串中的自動回覆）   |
| 富文字    | ✅ Markdown 已轉換為 Tlon 格式    |
| 圖片      | ✅ 已上傳至 Tlon 儲存空間         |
| 反應      | ✅ 透過[內建技能](#bundled-skill) |
| 投票      | ❌ 尚未支援                       |
| 原生指令  | ✅ 已支援（預設僅限擁有者）       |

## 疑難排解

請先執行以下步驟：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常見失敗情況：

- **忽略私訊**：發送者不在 `dmAllowlist` 中，且未設定 `ownerShip` 以進行審核流程。
- **忽略群組訊息**：頻道未發現或發送者未獲授權。
- **連線錯誤**：請檢查 ship URL 是否可連線；對於本地 ship，請啟用 `allowPrivateNetwork`。
- **驗證錯誤**：請驗證登入代碼是否為最新（代碼會輪替）。

## 組態參考

完整組態：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.tlon.enabled`：啟用/停用頻道啟動。
- `channels.tlon.ship`：機器人的 Urbit ship 名稱（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登入碼。
- `channels.tlon.allowPrivateNetwork`：允許 localhost/LAN URL（SSRF 繞過）。
- `channels.tlon.ownerShip`：審核系統的擁有者 ship（始終已授權）。
- `channels.tlon.dmAllowlist`：允許傳送 DM 的 ships（留空表示無）。
- `channels.tlon.autoAcceptDmInvites`：自動接受來自允許清單中 ships 的 DM。
- `channels.tlon.autoAcceptGroupInvites`：自動接受所有群組邀請。
- `channels.tlon.autoDiscoverChannels`：自動探索群組頻道（預設：true）。
- `channels.tlon.groupChannels`：手動固定的頻道 nests。
- `channels.tlon.defaultAuthorizedShips`：已授權存取所有頻道的 ships。
- `channels.tlon.authorization.channelRules`：各頻道的授權規則。
- `channels.tlon.showModelSignature`：將模型名稱附加到訊息中。

## 註記

- 群組回覆需要提及（例如 `~your-bot-ship`）才能回應。
- 串列回覆：如果傳入的訊息位於串列中，OpenClaw 將會在串列內回覆。
- 富文本：Markdown 格式（粗體、斜體、程式碼、標題、清單）會轉換為 Tlon 的原生格式。
- 圖片：網址會上傳至 Tlon 儲存空間並內嵌為圖片區塊。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
