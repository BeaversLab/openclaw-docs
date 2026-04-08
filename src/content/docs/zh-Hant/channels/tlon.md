---
summary: "Tlon/Urbit 支援狀態、功能和設定"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon

Tlon 是一個基於 Urbit 建構的去中心化訊息應用程式。OpenClaw 會連接到您的 Urbit ship（宇宙），並能回覆私訊和群組聊天訊息。群組回覆預設需要 @ 提及，並可透過允許清單進一步限制。

狀態：內建外掛。支援訊息 (DM)、群組提及、串列回覆、富文字格式以及圖片上傳。目前尚未支援回應和投票。

## 內建外掛

Tlon 在目前的 OpenClaw 版本中作為內建外掛附帶，因此一般的封裝版本無需另外安裝。

如果您使用的是較舊的版本或排除 Tlon 的自訂安裝，請手動安裝：

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/tlon
```

本機檢出 (從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

詳細資訊：[外掛](/en/tools/plugin)

## 設定

1. 確認 Tlon 外掛可用。
   - 目前的封裝 OpenClaw 版本已內建此功能。
   - 較舊或自訂的安裝版本可以使用上述指令手動新增。
2. 準備您的 ship URL 和登入代碼。
3. 設定 `channels.tlon`。
4. 重新啟動閘道。
5. 傳送訊息給機器人或在此群組頻道中提及它。

基本設定 (單一帳號)：

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

根據預設，OpenClaw 會阻擋私人/內部主機名稱和 IP 範圍以提供 SSRF 保護。
如果您的 ship 在私人網路上運作 (localhost、LAN IP 或內部主機名稱)，
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

⚠️ 僅在您信任區域網路時才啟用此功能。此設定會停用對您 ship URL 請求的 SSRF 保護。

## 群組頻道

根據預設會啟用自動探索。您也可以手動釘選頻道：

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

訊息許可清單 (空值 = 不允許訊息，使用 `ownerShip` 進行核准流程)：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群組授權 (預設為受限)：

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

設定一個擁有者 ship，以便當未授權使用者嘗試互動時接收核准請求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

擁有者 ship 會在**任何地方自動獲得授權** — 訊息邀請會自動接受，且
頻道訊息總是被允許。您不需要將擁有者新增到 `dmAllowlist` 或
`defaultAuthorizedShips`。

設定後，擁有者將會收到以下事項的訊息通知：

- 來自不在許可清單中 ship 的訊息請求
- 未經授權頻道中的提及
- 群組邀請請求

## 自動接受設定

自動接受訊息邀請 (針對 dmAllowlist 中的 ships)：

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

Tlon 外掛程式包含一個內建技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)），
可提供存取 Tlon 操作的 CLI：

- **聯絡人**：取得/更新個人檔案，列出聯絡人
- **頻道**：列出、建立、張貼訊息、擷取記錄
- **群組**：列出、建立、管理成員
- **DM**：傳送訊息、對訊息做出反應
- **Reactions**：對貼文和 DM 新增/移除 emoji 表情反應
- **設定**：透過斜線指令管理外掛程式權限

安裝外掛程式後，此技能會自動啟用。

## 功能

| 特色      | 狀態                               |
| --------- | ---------------------------------- |
| 直接訊息  | ✅ 已支援                          |
| 群組/頻道 | ✅ 已支援（預設限制需提及）        |
| 主題串    | ✅ 已支援（在主題串中自動回覆）    |
| 富文字    | ✅ Markdown 已轉換為 Tlon 格式     |
| 圖片      | ✅ 已上傳至 Tlon 儲存空間          |
| Reactions | ✅ 透過 [內建技能](#bundled-skill) |
| 投票      | ❌ 尚未支援                        |
| 原生指令  | ✅ 已支援（預設僅限擁有者）        |

## 疑難排解

先執行此階層：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常見失敗原因：

- **DM 已忽略**：發送者不在 `dmAllowlist` 中，且未設定 `ownerShip` 以進行核准流程。
- **群組訊息已忽略**：頻道未探索到或發送者未獲授權。
- **連線錯誤**：檢查 ship URL 是否可連線；針對本地 ship 啟用 `allowPrivateNetwork`。
- **驗證錯誤**：確認登入碼為目前有效（代碼會輪換）。

## 設定參考

完整設定：[Configuration](/en/gateway/configuration)

提供者選項：

- `channels.tlon.enabled`：啟用/停用頻道啟動。
- `channels.tlon.ship`：機器人的 Urbit ship 名稱（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登入碼。
- `channels.tlon.allowPrivateNetwork`：允許 localhost/LAN URL（SSRF 旁路）。
- `channels.tlon.ownerShip`：用於核准系統的擁有者 ship（始終已授權）。
- `channels.tlon.dmAllowlist`: 允許發送訊息的 ship (留空則為無)。
- `channels.tlon.autoAcceptDmInvites`: 自動接受來自允許列表中 ship 的訊息。
- `channels.tlon.autoAcceptGroupInvites`: 自動接受所有群組邀請。
- `channels.tlon.autoDiscoverChannels`: 自動探索群組頻道 (預設: true)。
- `channels.tlon.groupChannels`: 手動固定的頻道巢 (nest)。
- `channels.tlon.defaultAuthorizedShips`: 獲得所有頻道授權的 ship。
- `channels.tlon.authorization.channelRules`: 各頻道的授權規則。
- `channels.tlon.showModelSignature`: 將模型名稱附加至訊息。

## 備註

- 群組回覆需要提及 (例如 `~your-bot-ship`) 才能回應。
- 串列回覆: 如果收到的訊息位於串列中，OpenClaw 將在串列內回覆。
- 富文本: Markdown 格式 (粗體、斜體、程式碼、標題、列表) 將轉換為 Tlon 的原生格式。
- 圖片: URL 將上傳至 Tlon 儲存空間並以圖片區塊方式嵌入。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 訊息認證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘道
- [頻道路由](/en/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/en/gateway/security) — 存取模型與強化措施
