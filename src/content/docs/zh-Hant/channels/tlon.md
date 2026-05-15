---
summary: "Tlon/Urbit 支援狀態、功能和設定"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

Tlon 是一個建構於 Urbit 的去中心化訊息應用程式。OpenClaw 連接到您的 Urbit ship 並能
回覆私訊和群組聊天訊息。群組回覆預設需要 @ 提及，並且可以透過允許清單進一步限制。

狀態：內建外掛。支援私訊、群組提及、串列回覆、富文本格式以及
圖片上傳。尚未支援反應和投票。

## 內建外掛

Tlon 在目前的 OpenClaw 版本中作為內建外掛隨附，因此一般的封裝
建置不需要額外安裝。

如果您使用的是較舊的版本或是不包含 Tlon 的自訂安裝，請安裝目前的 npm 套件：

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/tlon
```

使用 bare 套件以遵循目前的官方發行標籤。僅在需要可重現的安裝時才固定確切版本。

本機檢出 (從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

詳細資訊：[Plugins](/zh-Hant/tools/plugin)

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

自動接受來自信任船隻的群組邀請：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
      groupInviteAllowlist: ["~zod"],
    },
  },
}
```

當 `groupInviteAllowlist` 為空時，`autoAcceptGroupInvites` 預設為關閉（拒絕）。將允許清單設定為其群組邀請應被自動接受的船隻。

## 傳遞目標 (CLI/cron)

將這些與 `openclaw message send` 或 cron 傳遞搭配使用：

- DM：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群組：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 內建技能

Tlon 外掛包含一個內建技能 ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))，
提供對 Tlon 操作的 CLI 存取：

- **Contacts**：取得/更新個人資料，列出聯絡人
- **Channels**：列出、建立、張貼訊息、取得歷史記錄
- **Groups**：列出、建立、管理成員
- **DMs**：傳送訊息、對訊息做出反應
- **Reactions**：對貼文和 DM 新增/移除 emoji 反應
- **Settings**：透過斜線指令管理外掛權限

安裝外掛後，該技能會自動啟用。

## 功能

| 功能            | 狀態                                    |
| --------------- | --------------------------------------- |
| Direct messages | ✅ 已支援                               |
| Groups/channels | ✅ 已支援（預設需提及）                 |
| Threads         | ✅ 已支援（在串列中自動回覆）           |
| Rich text       | ✅ Markdown 已轉換為 Tlon 格式          |
| Images          | ✅ 已上傳至 Tlon 儲存空間               |
| Reactions       | ✅ 透過 [bundled skill](#bundled-skill) |
| Polls           | ❌ 尚未支援                             |
| Native commands | ✅ 已支援（預設僅限擁有者）             |

## 疑難排解

請先執行此指令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常見失敗原因：

- **DMs ignored**：傳送者不在 `dmAllowlist` 中且未設定 `ownerShip` 以進行核准流程。
- **Group messages ignored**：頻道未被發現或傳送者未經授權。
- **Connection errors**：檢查 ship URL 是否可存取；對於本地 ship 啟用 `allowPrivateNetwork`。
- **Auth errors**：驗證登入代碼是否為最新（代碼會輪換）。

## 設定參考

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.tlon.enabled`：啟用/停用頻道啟動。
- `channels.tlon.ship`：機器人的 Urbit ship 名稱（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登入碼。
- `channels.tlon.allowPrivateNetwork`：允許 localhost/LAN URL（SSRF 繞過）。
- `channels.tlon.ownerShip`：審核系統的擁有者 ship（始終已授權）。
- `channels.tlon.dmAllowlist`：允許傳送私訊（DM）的 ships（空白表示無）。
- `channels.tlon.autoAcceptDmInvites`：自動接受來自允許清單 ships 的私訊。
- `channels.tlon.autoAcceptGroupInvites`：自動接受來自允許清單 ships 的群組邀請。
- `channels.tlon.groupInviteAllowlist`：其群組邀請可能被自動接受的 ships。
- `channels.tlon.autoDiscoverChannels`：自動探索群組頻道（預設為 true）。
- `channels.tlon.groupChannels`：手動固定的頻道巢。
- `channels.tlon.defaultAuthorizedShips`：獲得所有頻道授權的 ships。
- `channels.tlon.authorization.channelRules`：各頻道的授權規則。
- `channels.tlon.showModelSignature`：將模型名稱附加到訊息。

## 備註

- 群組回覆需要提及（例如 `~your-bot-ship`）才能回應。
- 串列回覆：如果傳入訊息位於串列中，OpenClaw 將在串列內回覆。
- 富文字：Markdown 格式（粗體、斜體、程式碼、標題、清單）會轉換為 Tlon 的原生格式。
- 圖片：URL 會上傳至 Tlon 儲存空間並內嵌為圖片區塊。

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證和配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及閘道
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型和強化防護
