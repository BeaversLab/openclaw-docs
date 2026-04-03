---
summary: "Tlon/Urbit 支援狀態、功能和設定"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon（外掛程式）

Tlon 是一個基於 Urbit 建構的去中心化訊息應用程式。OpenClaw 會連接到您的 Urbit ship（宇宙），並能回覆私訊和群組聊天訊息。群組回覆預設需要 @ 提及，並可透過允許清單進一步限制。

狀態：透過外掛程式支援。支援私訊、群組提及、串體回覆、富文字格式和圖片上傳。尚未支援反應和投票。

## 需要外掛程式

Tlon 以外掛程式形式提供，並未包含在核心安裝中。

透過 CLI 安裝（npm registry）：

```bash
openclaw plugins install @openclaw/tlon
```

本地結帳（當從 git repo 執行時）：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

詳細資訊：[外掛程式](/en/tools/plugin)

## 設定

1. 安裝 Tlon 外掛程式。
2. 準備您的 ship URL 和登入代碼。
3. 設定 `channels.tlon`。
4. 重新啟動閘道。
5. 傳送私訊給機器人，或在群組頻道中提及它。

最小設定（單一帳號）：

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

預設情況下，為了防範 SSRF 攻擊，OpenClaw 會封鎖私人/內部主機名稱和 IP 範圍。
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

這適用於以下網址：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 僅在您信任本地網路時啟用此功能。此設定會停用對您 ship URL 請求的 SSRF 保護。

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

私訊允許清單（空白 = 不允許私訊，使用 `ownerShip` 進行核准流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群組授權（預設受限制）：

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

設定一個擁有者 ship，以便在未授權使用者嘗試互動時收到核准請求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

擁有者 ship **在各地都自動獲得授權** —— 私訊邀請會自動接受，
且頻道訊息永遠被允許。您不需要將擁有者加入到 `dmAllowlist` 或
`defaultAuthorizedShips`。

設定後，擁有者會收到關於以下事項的私訊通知：

- 來自允許清單外 ships 的私訊請求
- 未經授權頻道中的提及
- 群組邀請請求

## 自動接受設定

自動接受 DM 邀請（針對 dmAllowlist 中的 ship）：

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

將這些與 `openclaw message send` 或 cron 傳送一起使用：

- DM：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群組：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 內建技能

Tlon 外掛程式包含一個內建技能 ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))，提供對 Tlon 操作的 CLI 存取：

- **聯絡人**：取得/更新個人資料，列出聯絡人
- **頻道**：列出、建立、張貼訊息、擷取歷史記錄
- **群組**：列出、建立、管理成員
- **DMs**：傳送訊息、對訊息做出反應
- **反應**：對貼文和 DM 新增/移除 emoji 反應
- **設定**：透過斜線指令管理外掛權限

安裝外掛後，該技能會自動可用。

## 功能

| 功能      | 狀態                               |
| --------- | ---------------------------------- |
| 直接訊息  | ✅ 已支援                          |
| 群組/頻道 | ✅ 已支援（預設需提及）            |
| 串列      | ✅ 已支援（串列中的自動回覆）      |
| 富文字    | ✅ Markdown 轉換為 Tlon 格式       |
| 圖片      | ✅ 已上傳至 Tlon 儲存空間          |
| 反應      | ✅ 透過 [內建技能](#bundled-skill) |
| 投票      | ❌ 尚未支援                        |
| 原生指令  | ✅ 已支援（預設僅限擁有者）        |

## 疑難排解

請先執行此步驟：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常見失敗：

- **DMs 被忽略**：發送者不在 `dmAllowlist` 中，且未設定 `ownerShip` 進行核准流程。
- **群組訊息被忽略**：頻道未發現或發送者未經授權。
- **連線錯誤**：檢查 ship URL 是否可連線；對本機 ship 啟用 `allowPrivateNetwork`。
- **驗證錯誤**：驗證登入碼是否為最新（代碼會輪換）。

## 設定參考

完整設定：[設定](/en/gateway/configuration)

提供者選項：

- `channels.tlon.enabled`：啟用/停用頻道啟動。
- `channels.tlon.ship`：機器人的 Urbit ship 名稱（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登入碼。
- `channels.tlon.allowPrivateNetwork`：允許 localhost/LAN URL（SSRF 繞過）。
- `channels.tlon.ownerShip`：用於審批系統的所有者艦艇（始終已授權）。
- `channels.tlon.dmAllowlist`：被允許發送私訊的艦艇（留空表示無）。
- `channels.tlon.autoAcceptDmInvites`：自動接受來自允許清單中艦艇的私訊。
- `channels.tlon.autoAcceptGroupInvites`：自動接受所有群組邀請。
- `channels.tlon.autoDiscoverChannels`：自動發現群組頻道（預設：true）。
- `channels.tlon.groupChannels`：手動固定的頻道巢。
- `channels.tlon.defaultAuthorizedShips`：獲得所有頻道授權的艦艇。
- `channels.tlon.authorization.channelRules`：各頻道的授權規則。
- `channels.tlon.showModelSignature`：將模型名稱附加到訊息中。

## 注意事項

- 群組回覆需要提及（例如 `~your-bot-ship`）才能回應。
- 串列回覆：如果收到的訊息位於串列中，OpenClaw 將在串列內回覆。
- 富文字：Markdown 格式（粗體、斜體、程式碼、標題、清單）會轉換為 Tlon 的原生格式。
- 圖片：URL 會上傳至 Tlon 儲存空間並嵌入為圖片區塊。

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 身份驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘控
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化
