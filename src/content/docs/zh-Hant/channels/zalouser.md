---
summary: "透過原生 zca-js (QR 登入) 支援 Zalo 個人帳號，包含功能與設定"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo 個人"
---

狀態：實驗性。此整合透過 OpenClaw 內的原生 `zca-js` 自動化 **Zalo 個人帳戶**。

<Warning>這是非官方整合，可能導致帳戶暫停或封鎖。使用風險自負。</Warning>

## bundled 外掛程式

Zalo Personal 作為 bundled 外掛程式內建於目前的 OpenClaw 版本中，因此一般的
打包版本不需要額外安裝。

如果您使用的是較舊的版本或排除 Zalo Personal 的自訂安裝，
請直接安裝 npm 套件：

- 透過 CLI 安裝：`openclaw plugins install @openclaw/zalouser`
- 釘選版本：`openclaw plugins install @openclaw/zalouser@2026.5.2`
- 或從原始碼檢出： `openclaw plugins install ./path/to/local/zalouser-plugin`
- 詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

不需要外部的 `zca`/`openzca` CLI 二進位檔案。

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

- 完全透過 `zca-js` 在程序內執行。
- 使用原生事件監聽器接收傳入訊息。
- 直接透過 JS API 傳送回覆（文字/媒體/連結）。
- 專為無法使用 Zalo Bot API 的「個人帳號」使用案例設計。

## 命名

通道 ID 為 `zalouser`，以明確表示這是用於自動化 **Zalo 個人用戶帳號**（非官方）。我們保留 `zalo` 給未來潛在的官方 Zalo API 整合使用。

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

`channels.zalouser.dmPolicy` 支援： `pairing | allowlist | open | disabled` (預設值： `pairing`)。

`channels.zalouser.allowFrom` 應使用穩定的 Zalo 用戶 ID。它也可以參照靜態發送者存取群組 (`accessGroup:<name>`)。在互動式設定期間，輸入的名稱可以使用外掛程式的程序內聯絡人查詢解析為 ID。

如果設定中保留了原始名稱，則僅在啟用 `channels.zalouser.dangerouslyAllowNameMatching: true` 時才會在啟動時進行解析。如果未加入此選項，執行時期的發送者檢查僅限於 ID，並且會忽略原始名稱的授權。

透過以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群組存取 (選用)

- 預設值： `channels.zalouser.groupPolicy = "open"` (允許群組)。當未設定時，使用 `channels.defaults.groupPolicy` 來覆寫預設值。
- 使用以下方式限制為允許清單：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (鍵值應為穩定的群組 ID；僅在啟用 `channels.zalouser.dangerouslyAllowNameMatching: true` 時，才會在啟動時將名稱解析為 ID)
  - `channels.zalouser.groupAllowFrom` (控制允許群組中哪些發送者可以觸發機器人；可以使用 `accessGroup:<name>` 參照靜態發送者存取群組)
- 封鎖所有群組： `channels.zalouser.groupPolicy = "disabled"`。
- 設定精靈可以提示輸入群組允許清單。
- 啟動時，OpenClaw 會將允許清單中的群組/使用者名稱解析為 ID，並且僅在啟用 `channels.zalouser.dangerouslyAllowNameMatching: true` 時記錄該對應關係。
- 群組允許清單比對預設僅使用 ID。除非啟用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否則未解析的名稱在授權時會被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一種應急相容模式，可重新啟用可變的啟動名稱解析和執行時期群組名稱比對。
- 如果未設定 `groupAllowFrom`，執行時期會回退到 `allowFrom` 進行群組發送者檢查。
- 發送者檢查同時適用於一般群組訊息和控制指令（例如 `/new`、`/reset`）。

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
- 解析順序：精確群組 ID/名稱 -> 正規化群組簡稱 -> `*` -> 預設值 (`true`)。
- 這同時適用於允許清單中的群組和開放群組模式。
- 引用機器人訊息視為隱含提及，可用於群組啟用。
- 經授權的控制指令（例如 `/new`）可以繞過提及閘道。
- 當群組訊息因需要提及而被跳過時，OpenClaw 會將其儲存為待處理的群組歷史記錄，並包含在下一筆處理的群組訊息中。
- 群組歷史記錄限制預設為 `messages.groupChat.historyLimit` (回退值 `50`)。您可以針對每個帳號使用 `channels.zalouser.historyLimit` 進行覆寫。

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

## 多重帳號

帳號對應至 OpenClaw 狀態中的 `zalouser` 設定檔。範例：

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

## 輸入中、反應和傳遞回執

- OpenClaw 會在發送回覆之前發送輸入中事件 (盡力而為)。
- 在頻道動作中，支援對 `zalouser` 使用訊息反應動作 `react`。
  - 使用 `remove: true` 從訊息中移除特定的反應表情符號。
  - 反應語意：[Reactions](/zh-Hant/tools/reactions)
- 對於包含事件元資料的傳入訊息，OpenClaw 會發送已傳遞 + 已讀回執 (盡力而為)。

## 疑難排解

**無法保持登入：**

- `openclaw channels status --probe`
- 重新登入：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允許清單/群組名稱無法解析：**

- 在 `allowFrom`/`groupAllowFrom` 中使用數字 ID，並在 `groups` 中使用穩定的群組 ID。如果您確實需要精確的好友/群組名稱，請啟用 `channels.zalouser.dangerouslyAllowNameMatching: true`。

**從舊版基於 CLI 的設定升級：**

- 移除任何關於舊的外部 `zca` 程序的假設。
- 該頻道現已在 OpenClaw 中完全運行，無需外部 CLI 二進位文件。

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證和配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及閘控
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型和強化措施
