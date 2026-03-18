---
summary: "透過原生 zca-js (QR 登入)、功能和設定支援 Zalo 個人帳號"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo Personal"
---

# Zalo Personal (非官方)

狀態：實驗性。此整合透過 OpenClaw 內的原生 `zca-js` 自動化 **Zalo 個人帳號**。

> **警告：** 這是非官方整合，可能導致帳號暫停或封鎖。使用風險自負。

## 需要外掛程式

Zalo Personal 以外掛程式形式發行，未隨附於核心安裝中。

- 透過 CLI 安裝：`openclaw plugins install @openclaw/zalouser`
- 或從原始碼取出安裝：`openclaw plugins install ./extensions/zalouser`
- 詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二進位檔案。

## 快速設定 (初學者)

1. 安裝外掛（見上文）。
2. 登入（QR 碼，在 Gateway 機器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 行動應用程式掃描 QR 碼。
3. 啟用通道：

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
5. DM（直接訊息）存取預設為配對模式；請在首次聯絡時批准配對碼。

## 它是什麼

- 完全透過 `zca-js` 在程序內運作。
- 使用原生事件監聽器接收傳入訊息。
- 直接透過 JS API 發送回覆（文字/媒體/連結）。
- 專為無法使用 Zalo Bot API 的「個人帳號」使用情境設計。

## 命名

通道 ID 為 `zalouser`，以明確表示這是用來自動化 **個人 Zalo 使用者帳戶** 的（非官方）。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合使用。

## 尋找 ID（目錄）

使用目錄 CLI 來探索對等端/群組及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 傳出文字會被分割為約 2000 個字元（受 Zalo 客戶端限制）。
- 串流預設被封鎖。

## 存取控制（私訊）

`channels.zalouser.dmPolicy` 支援：`pairing | allowlist | open | disabled`（預設：`pairing`）。

`channels.zalouser.allowFrom` 接受使用者 ID 或名稱。在設定期間，名稱將使用外掛程式的程序內聯絡人查詢解析為 ID。

透過以下方式核准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群組存取（可選）

- 預設值：`channels.zalouser.groupPolicy = "open"`（允許群組）。若未設定，請使用 `channels.defaults.groupPolicy` 覆蓋預設值。
- 使用以下方式限制為允許列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（鍵值應為穩定的群組 ID；名稱會在啟動時盡可能解析為 ID）
  - `channels.zalouser.groupAllowFrom`（控制允許群組中的哪些傳送者可以觸發機器人）
- 封鎖所有群組：`channels.zalouser.groupPolicy = "disabled"`。
- 設定精靈可以提示輸入群組允許列表。
- 啟動時，OpenClaw 會將允許列表中的群組/使用者名稱解析為 ID，並記錄對應關係。
- 群組允許列表匹配預設僅限 ID。除非啟用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否則無法解析的名稱在授權時會被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一種緊急相容性模式，可重新啟用可變的群組名稱匹配。
- 如果未設定 `groupAllowFrom`，執行階段會回退到 `allowFrom` 進行群組傳送者檢查。
- 傳送者檢查適用於一般群組訊息和控制指令（例如 `/new`、`/reset`）。

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

### 群組提及閘道

- `channels.zalouser.groups.<group>.requireMention` 控制群組回覆是否需要提及。
- 解析順序：精確群組 ID/名稱 -> 正規化群組代碼 -> `*` -> 預設值 (`true`)。
- 這適用於允許列表中的群組和開放群組模式。
- 授權的控制指令（例如 `/new`）可以略過提及閘道。
- 當群組訊息因需要提及而被跳過時，OpenClaw 會將其儲存為待處理的群組歷史記錄，並包含在下一則處理的群組訊息中。
- 群組歷史記錄限制預設為 `messages.groupChat.historyLimit`（後備值 `50`）。您可以使用 `channels.zalouser.historyLimit` 針對每個帳戶進行覆蓋。

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

## 多帳戶

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

## 輸入中、反應和傳送確認

- OpenClaw 會在分派回覆之前發送輸入事件（盡力而為）。
- 頻道動作中支援對 `zalouser` 使用訊息反應動作 `react`。
  - 使用 `remove: true` 移除訊息中的特定反應 emoji。
  - 反應語意：[Reactions](/zh-Hant/tools/reactions)
- 對於包含事件元資料的傳入訊息，OpenClaw 會發送已送達 + 已讀回執（盡力而為）。

## 疑難排解

**登入無法保持：**

- `openclaw channels status --probe`
- 重新登入： `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允許清單/群組名稱無法解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用數字 ID，或確切的好友/群組名稱。

**從舊版基於 CLI 的設定升級：**

- 移除任何舊的外部 `zca` 程序假設。
- 該頻道現已完全在 OpenClaw 中執行，無需外部 CLI 二進位檔案。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
