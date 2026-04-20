---
summary: "透過原生 zca-js (QR 登入) 支援 Zalo 個人帳號，包含功能與設定"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo Personal"
---

# Zalo Personal (非官方)

狀態：實驗性。此整合透過 OpenClaw 內的原生 `zca-js` 自動化 **Zalo 個人帳號**。

> **警告：** 這是一個非官方整合，可能導致帳號暫停或封鎖。使用風險自負。

## 內建外掛

Zalo Personal 在目前的 OpenClaw 版本中作為內建外掛發布，因此一般的
打包版本不需要另外安裝。

如果您使用的是舊版本或排除 Zalo Personal 的自訂安裝，
請手動安裝：

- 透過 CLI 安裝：`openclaw plugins install @openclaw/zalouser`
- 或是從原始碼副本：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 詳細資訊：[外掛](/zh-Hant/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 執行檔。

## 快速設定（初學者）

1. 確保 Zalo Personal 外掛可用。
   - 目前的 OpenClaw 打包版本已經包含它。
   - 舊版本/自訂安裝可以使用上述指令手動新增。
2. 登入（QR 碼，在 Gateway 機器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 行動應用程式掃描 QR 碼。
3. 啟用頻道：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

4. 重新啟動 Gateway（或完成設定）。
5. DM 存取預設為配對模式；請在首次聯絡時核准配對碼。

## 簡介

- 完全透過 `zca-js` 在程序內運行。
- 使用原生事件監聽器接收傳入訊息。
- 直接透過 JS API 傳送回覆（文字/媒體/連結）。
- 專為無法使用 Zalo Bot API 的「個人帳號」使用案例設計。

## 命名

頻道 ID 為 `zalouser`，以明確表示此為自動化 **Zalo 個人使用者帳號** 的整合（非官方）。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合。

## 尋找 ID（目錄）

使用目錄 CLI 探索對象/群組及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 傳出文字會被分割為約 2000 個字元（Zalo 用戶端限制）。
- 預設封鎖串流傳輸。

## 存取控制（DM）

`channels.zalouser.dmPolicy` 支援：`pairing | allowlist | open | disabled`（預設：`pairing`）。

`channels.zalouser.allowFrom` 接受使用者 ID 或名稱。設定期間，會使用外掛的程序內聯絡人查詢將名稱解析為 ID。

透過以下方式核准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群組存取（選用）

- 預設值：`channels.zalouser.groupPolicy = "open"`（允許群組）。若未設定，請使用 `channels.defaults.groupPolicy` 覆蓋預設值。
- 使用白名單限制：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（鍵應為穩定的群組 ID；名稱會在啟動時盡可能解析為 ID）
  - `channels.zalouser.groupAllowFrom`（控制允許群組中的哪些發送者可以觸發機器人）
- 封鎖所有群組：`channels.zalouser.groupPolicy = "disabled"`。
- 設定精靈可以提示輸入群組白名單。
- 啟動時，OpenClaw 會將白名單中的群組/使用者名稱解析為 ID，並記錄該對應關係。
- 預設情況下，群組白名單比對僅使用 ID。未解析的名稱將被忽略，除非啟用了 `channels.zalouser.dangerouslyAllowNameMatching: true`。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一種緊急相容模式，可重新啟用可變的群組名稱比對。
- 如果未設定 `groupAllowFrom`，執行時將回退到 `allowFrom` 進行群組發送者檢查。
- 發送者檢查適用於一般群組訊息和控制指令（例如 `/new`、`/reset`）。

範例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true },
      },
    },
  },
}
```

### 群組提及閘門

- `channels.zalouser.groups.<group>.requireMention` 控制群組回覆是否需要提及。
- 解析順序：精確群組 ID/名稱 -> 正規化群組 slug -> `*` -> 預設值（`true`）。
- 這適用於白名單群組和開放群組模式。
- 引用機器人訊息視為群組啟動的隱性提及。
- 授權的控制指令（例如 `/new`）可以繞過提及閘門。
- 當因需要提及而跳過群組訊息時，OpenClaw 會將其儲存為待處理的群組歷史記錄，並包含在下一則處理的群組訊息中。
- 群組歷史記錄限制預設為 `messages.groupChat.historyLimit`（後備值 `50`）。您可以使用 `channels.zalouser.historyLimit` 為每個帳號覆寫此設定。

範例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { allow: true, requireMention: true },
        "Work Chat": { allow: true, requireMention: false },
      },
    },
  },
}
```

## 多帳號

帳號對應到 OpenClaw 狀態中的 `zalouser` 設定檔。範例：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" },
      },
    },
  },
}
```

## 輸入中、反應和已送達確認

- OpenClaw 會在發送回覆前發送輸入中事件（盡力而為）。
- 頻道動作中支援對 `zalouser` 使用訊息反應動作 `react`。
  - 使用 `remove: true` 從訊息中移除特定的反應表情符號。
  - 反應語意：[Reactions](/zh-Hant/tools/reactions)
- 對於包含事件元資料的傳入訊息，OpenClaw 會發送已送達和已讀確認（盡力而為）。

## 疑難排解

**無法保持登入：**

- `openclaw channels status --probe`
- 重新登入： `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允許清單/群組名稱無法解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用數字 ID，或確切的好友/群組名稱。

**從舊版基於 CLI 的設定升級：**

- 移除任何舊的外部 `zca` 程序假設。
- 該頻道現在完全在 OpenClaw 中運行，無需外部 CLI 執行檔。

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — 私訊驗證和配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為和提及閘門
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [Security](/zh-Hant/gateway/security) — 存取模型和加固
