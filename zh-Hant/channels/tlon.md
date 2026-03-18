---
summary: "Tlon/Urbit 支援狀態、功能與設定"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon (外掛程式)

Tlon 是一個基於 Urbit 建構的去中心化訊息應用程式。OpenClaw 會連線到您的 Urbit ship，並能
回應私人訊息（DM）和群組聊天訊息。依預設，群組回覆需要 @ 提及，並可透過許可清單進一步限制。

狀態：透過外掛程式支援。支援私人訊息、群組提及、串回覆、富文字格式，以及
圖片上傳。尚未支援回應和投票。

## 需要外掛程式

Tlon 以外掛程式形式提供，未包含在核心安裝中。

透過 CLI 安裝（npm registry）：

```bash
openclaw plugins install @openclaw/tlon
```

本機簽出（當從 git repo 執行時）：

```bash
openclaw plugins install ./extensions/tlon
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 設定

1. 安裝 Tlon 外掛程式。
2. 準備您的 ship URL 和登入代碼。
3. 設定 `channels.tlon`。
4. 重新啟動閘道。
5. 傳送私人訊息給機器人，或在群組頻道中提及它。

最小設定（單一帳戶）：

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

依預設，OpenClaw 會封鎖私人/內部主機名稱和 IP 範圍以進行 SSRF 防護。
如果您的 ship 執行於私人網路（localhost、LAN IP 或內部主機名稱），
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

⚠️ 僅在您信任本機網路時才啟用此功能。此設定會停用針對您 ship URL 要求的 SSRF 防護。

## 群組頻道

依預設會啟用自動探索。您也可以手動釘選頻道：

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

DM 許可清單（空白 = 不允許 DM，使用 `ownerShip` 進行核准流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群組授權（依預設受限制）：

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

## 擁有者和核准系統

設定擁有者 ship 以在未授權使用者嘗試互動時接收核准要求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

擁有者 ship **在所有地方皆自動獲得授權** — DM 邀請會自動接受，且
頻道訊息一律允許。您無需將擁有者新增至 `dmAllowlist` 或
`defaultAuthorizedShips`。

設定後，擁有者會收到以下事項的 DM 通知：

- 來自不在許可清單中的 ship 的 DM 要求
- 未經授權頻道中的提及
- 群組邀請要求

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

將這些與 `openclaw message send` 或 cron 傳送搭配使用：

- DM：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群組：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 內建技能

Tlon 外掛程式包含一個內建技能 ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))，
提供對 Tlon 操作的 CLI 存取：

- **聯絡人**：取得/更新個人資料，列出聯絡人
- **頻道**：列出、建立、貼文、擷取歷史紀錄
- **群組**：列出、建立、管理成員
- **DMs**：傳送訊息、對訊息做出反應
- **反應**：新增/移除對貼文和 DM 的 emoji 反應
- **設定**：透過斜線指令管理外掛權限

安裝外掛程式後，該技能會自動可用。

## 功能

| 功能      | 狀態                               |
| --------- | ---------------------------------- |
| 私人訊息  | ✅ 支援                            |
| 群組/頻道 | ✅ 支援（預設由提及控制）          |
| 串回      | ✅ 支援（在串中自動回覆）          |
| 富文字    | ✅ Markdown 已轉換為 Tlon 格式     |
| 圖片      | ✅ 已上傳至 Tlon 儲存空間          |
| 反應      | ✅ 透過 [內建技能](#bundled-skill) |
| 投票      | ❌ 尚未支援                        |
| 原生指令  | ✅ 支援（預設僅限擁有者）          |

## 疑難排解

請先執行此指令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常見失敗：

- **DMs 被忽略**：傳送者不在 `dmAllowlist` 中且未設定 `ownerShip` 以進行審核流程。
- **群組訊息被忽略**：頻道未探索到或傳送者未獲授權。
- **連線錯誤**：檢查 ship URL 是否可連線；啟用 `allowPrivateNetwork` 以連線本地 ships。
- **驗證錯誤**：驗證登入代碼是否為目前有效（代碼會輪替）。

## 組態參考

完整組態：[組態](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.tlon.enabled`：啟用/停用頻道啟動。
- `channels.tlon.ship`：機器人的 Urbit ship 名稱（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登入代碼。
- `channels.tlon.allowPrivateNetwork`：允許 localhost/LAN URL（SSRF 繞過）。
- `channels.tlon.ownerShip`：審核系統的所有者 ship（始終已授權）。
- `channels.tlon.dmAllowlist`：允許發送訊息的 ship（留空則表示無）。
- `channels.tlon.autoAcceptDmInvites`：自動接受來自允許清單中 ship 的訊息。
- `channels.tlon.autoAcceptGroupInvites`：自動接受所有群組邀請。
- `channels.tlon.autoDiscoverChannels`：自動探索群組頻道（預設：true）。
- `channels.tlon.groupChannels`：手動固定的頻道 nest。
- `channels.tlon.defaultAuthorizedShips`：已授權存取所有頻道的 ship。
- `channels.tlon.authorization.channelRules`：各頻道的授權規則。
- `channels.tlon.showModelSignature`：將模型名稱附加至訊息。

## 備註

- 群組回覆需要提及（例如 `~your-bot-ship`）才能回應。
- 串列回覆：如果傳入訊息位於串列中，OpenClaw 將在串列內回覆。
- 富文字：Markdown 格式（粗體、斜體、程式碼、標題、列表）會轉換為 Tlon 的原生格式。
- 圖片：URL 會上傳至 Tlon 儲存空間並以圖片區塊方式內嵌。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
