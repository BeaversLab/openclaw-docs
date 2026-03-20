---
summary: "Zalo Personal 外掛程式：透過原生 zca-js 進行 QR 登入 + 傳訊（外掛程式安裝 + 頻道設定 + 工具）"
read_when:
  - 您想要在 OpenClaw 中獲得 Zalo Personal（非官方）支援
  - 您正在設定或開發 zalouser 外掛程式
title: "Zalo Personal 外掛程式"
---

# Zalo Personal (外掛程式)

透過外掛程式為 OpenClaw 提供 Zalo Personal 支援，使用原生 `zca-js` 來自動化一般的 Zalo 使用者帳戶。

> **警告：** 非官方的自動化可能導致帳戶暫停或封鎖。使用風險自負。

## 命名

頻道 ID 為 `zalouser`，以明確表示此自動化對象為 **個人 Zalo 使用者帳戶**（非官方）。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合。

## 執行位置

此外掛程式執行 **於 Gateway 程序內部**。

如果您使用遠端 Gateway，請在 **執行 Gateway 的機器** 上安裝/設定它，然後重新啟動 Gateway。

不需要外部的 `zca`/`openzca` CLI 執行檔。

## 安裝

### 選項 A：從 npm 安裝

```bash
openclaw plugins install @openclaw/zalouser
```

之後重新啟動 Gateway。

### 選項 B：從本機資料夾安裝（開發用）

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

之後重新啟動 Gateway。

## 設定

頻道設定位於 `channels.zalouser` 之下（而非 `plugins.entries.*`）：

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

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名稱：`zalouser`

動作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

頻道訊息動作也支援 `react` 用於訊息反應。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
