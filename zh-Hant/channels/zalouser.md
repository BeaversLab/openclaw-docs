---
summary: "Zalo 個人帳號支援透過原生 zca-js (QR 登入)、功能及設定"
read_when:
  - 為 OpenClaw 設定 Zalo Personal
  - 除錯 Zalo Personal 登入或訊息流程
title: "Zalo Personal"
---

# Zalo Personal (非官方)

狀態：實驗性。此整合透過 OpenClaw 內的原生 `zca-js` 自動化 **Zalo 個人帳號**。

> **警告：** 這是一個非官方整合，可能導致帳號暫停或封鎖。使用風險自負。

## 需要外掛程式

Zalo Personal 以外掛程式形式提供，不包含在核心安裝中。

- 透過 CLI 安裝：`openclaw plugins install @openclaw/zalouser`
- 或從來源副本安裝：`openclaw plugins install ./extensions/zalouser`
- 詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二進位檔。

## 快速設定 (初學者)

1. 安裝外掛程式 (見上文)。
2. 登入 (QR，在 Gateway 機器上)：
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

4. 重新啟動 Gateway (或完成設定)。
5. DM 存取預設為配對；在首次聯絡時批准配對碼。

## 它是什麼

- 完全透過 `zca-js` 在程序內執行。
- 使用原生事件監聽器接收傳入訊息。
- 透過 JS API 直接傳送回覆 (文字/媒體/連結)。
- 專為無法使用 Zalo Bot API 的「個人帳號」案例設計。

## 命名

頻道 ID 為 `zalouser`，以明確表示這會自動化 **Zalo 個人使用者帳號** (非官方)。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合。

## 尋找 ID (目錄)

使用目錄 CLI 來探索對象/群組及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 傳出文字會分割為約 2000 個字元 (Zalo 用戶端限制)。
- 預設會封鎖串流。

## 存取控制 (DM)

`channels.zalouser.dmPolicy` 支援：`pairing | allowlist | open | disabled` (預設：`pairing`)。

`channels.zalouser.allowFrom` 接受使用者 ID 或名稱。在設定期間，會使用外掛程式的程序內連絡人查詢將名稱解析為 ID。

透過以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群組存取（選用）

- 預設值：`channels.zalouser.groupPolicy = "open"`（允許群組）。若未設定，請使用 `channels.defaults.groupPolicy` 覆蓋預設值。
- 限制為允許名單：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（鍵應為穩定的群組 ID；名稱會在啟動時盡可能解析為 ID）
  - `channels.zalouser.groupAllowFrom`（控制允許群組中的哪些傳送者可以觸發機器人）
- 封鎖所有群組：`channels.zalouser.groupPolicy = "disabled"`。
- 設定精靈可以提示輸入群組允許名單。
- 啟動時，OpenClaw 會將允許名單中的群組/使用者名稱解析為 ID 並記錄對應關係。
- 群組允許名單比對預設僅限 ID。除非啟用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否則未解析的名稱在認證時會被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一種緊急相容模式，可重新啟用可變的群組名稱比對。
- 如果未設定 `groupAllowFrom`，執行時會回退到 `allowFrom` 進行群組傳送者檢查。
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

### 群組提及閘門

- `channels.zalouser.groups.<group>.requireMention` 控制群組回覆是否需要提及。
- 解析順序：精確群組 ID/名稱 -> 正規化群組代碼 -> `*` -> 預設值（`true`）。
- 這同時適用於允許名單中的群組和開放群組模式。
- 授權的控制指令（例如 `/new`）可以略過提及閘門。
- 當群組訊息因需要提及而被跳過時，OpenClaw 會將其儲存為待處理的群組記錄，並包含在下一筆處理的群組訊息中。
- 群組記錄限制預設為 `messages.groupChat.historyLimit`（後備 `50`）。您可以使用 `channels.zalouser.historyLimit` 為每個帳戶覆蓋設定。

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
- 頻道動作中支援對 `zalouser` 的訊息反應動作 `react`。
  - 使用 `remove: true` 移除訊息上的特定反應 emoji。
  - 反應語意：[Reactions](/zh-Hant/tools/reactions)
- 對於包含事件中繼資料的傳入訊息，OpenClaw 會傳送已送達 + 已讀回執（盡力而為）。

## 疑難排解

**無法保持登入：**

- `openclaw channels status --probe`
- 重新登入：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**許可清單/群組名稱無法解析：**

- 請在 `allowFrom`/`groupAllowFrom`/`groups` 中使用數字 ID，或使用確切的好友/群組名稱。

**從舊版 CLI 設定升級：**

- 移除任何關於舊版外部 `zca` 程序的假設。
- 該頻道現已完全在 OpenClaw 中運作，無需外部 CLI 執行檔。

import en from "/components/footer/en.mdx";

<en />
