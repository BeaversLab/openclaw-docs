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

## 需要外掛程式

Zalo Personal 以外掛程式形式提供，並未包含在核心安裝中。

- 透過 CLI 安裝： `openclaw plugins install @openclaw/zalouser`
- 或者從原始碼結帳：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 詳細資訊：[外掛程式](/en/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 執行檔。

## 快速設定 (初學者)

1. 安裝外掛程式 (見上文)。
2. 登入 (QR，在 Gateway 機器上)：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 行動應用程式掃描 QR code。
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

4. 重新啟動 Gateway (或完成設定)。
5. DM 存取預設為配對；請在首次聯絡時核准配對碼。

## 相關說明

- 完全透過 `zca-js` 在程序內運行。
- 使用原生事件監聽器接收傳入訊息。
- 直接透過 JS API 傳送回覆 (文字/媒體/連結)。
- 專為無法使用 Zalo Bot API 的「個人帳號」使用情境設計。

## 命名

頻道 ID 為 `zalouser`，以明確表示此為自動化 **Zalo 個人使用者帳號** 的整合 (非官方)。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合。

## 尋找 ID (目錄)

使用目錄 CLI 來探索對象/群組及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 傳出文字會分割為約 2000 個字元 (Zalo 用戶端限制)。
- 串流預設為封鎖狀態。

## 存取控制 (DMs)

`channels.zalouser.dmPolicy` 支援： `pairing | allowlist | open | disabled` (預設： `pairing`)。

`channels.zalouser.allowFrom` 接受使用者 ID 或名稱。在設定期間，名稱會透過外掛程式的程序內聯絡人查詢解析為 ID。

透過以下方式核准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群組存取（可選）

- 預設：`channels.zalouser.groupPolicy = "open"`（允許群組）。使用 `channels.defaults.groupPolicy` 以在未設定時覆寫預設值。
- 使用以下方式限制為允許列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（鍵應為穩定的群組 ID；名稱會在啟動時盡可能解析為 ID）
  - `channels.zalouser.groupAllowFrom`（控制允許群組中的哪些發送者可以觸發機器人）
- 封鎖所有群組：`channels.zalouser.groupPolicy = "disabled"`。
- 設定精靈可以提示輸入群組允許列表。
- 在啟動時，OpenClaw 會將允許列表中的群組/用戶名稱解析為 ID 並記錄對應關係。
- 群組允許列表匹配預設僅限 ID。除非啟用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否則未解析的名稱將在驗證時被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一種應急相容模式，可重新啟用可變的群組名稱匹配。
- 如果未設定 `groupAllowFrom`，執行時將回退到 `allowFrom` 進行群組發送者檢查。
- 發送者檢查適用於普通群組訊息和控制指令（例如 `/new`、`/reset`）。

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

### 群組提及閘控

- `channels.zalouser.groups.<group>.requireMention` 控制群組回覆是否需要提及。
- 解析順序：精確群組 ID/名稱 -> 正規化群組代碼 -> `*` -> 預設值（`true`）。
- 這同時適用於允許列表中的群組和開放群組模式。
- 授權的控制指令（例如 `/new`）可以繞過提及閘控。
- 當因需要提及而跳過群組訊息時，OpenClaw 會將其儲存為待處理的群組歷史記錄，並包含在下一次處理的群組訊息中。
- 群組歷史記錄限制預設為 `messages.groupChat.historyLimit`（後備 `50`）。您可以使用 `channels.zalouser.historyLimit` 為每個帳戶進行覆寫。

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

## 多重帳戶

帳戶對應到 OpenClaw 狀態中的 `zalouser` 設定檔。範例：

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

## 輸入中、反應和傳遞確認

- OpenClaw 會在發送回覆之前發送輸入事件（盡力而為）。
- 頻道動作支援針對 `zalouser` 的訊息反應動作 `react`。
  - 使用 `remove: true` 從訊息中移除特定的反應表情符號。
  - 反應語意：[反應](/en/tools/reactions)
- 對於包含事件元資料的傳入訊息，OpenClaw 會發送已送達 + 已讀回執（盡力而為）。

## 疑難排解

**無法保持登入狀態：**

- `openclaw channels status --probe`
- 重新登入： `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允許清單/群組名稱無法解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用數字 ID，或確切的好友/群組名稱。

**從舊版基於 CLI 的設定升級：**

- 移除任何舊的外部 `zca` 程序假設。
- 該頻道現在完全在 OpenClaw 中運行，無需外部 CLI 二進位檔案。

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘控
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化措施
