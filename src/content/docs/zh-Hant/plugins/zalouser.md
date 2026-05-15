---
summary: "Zalo Personal 外掛程式：透過原生 zca-js 進行 QR 登入 + 傳訊（外掛程式安裝 + 頻道設定 + 工具）"
read_when:
  - You want Zalo Personal (unofficial) support in OpenClaw
  - You are configuring or developing the zalouser plugin
title: "Zalo 個人外掛"
---

透過外掛為 OpenClaw 提供 Zalo Personal 支援，使用原生的 `zca-js` 來自動化一般的 Zalo 使用者帳號。

<Warning>非官方的自動化可能會導致帳號停權或封鎖。使用風險自行承擔。</Warning>

## 命名

頻道 ID 是 `zalouser`，以明確表明這是用來自動化 **個人 Zalo 使用者帳號**（非官方）。我們保留 `zalo` 給未來可能推出的官方 Zalo API 整合。

## 執行位置

此外掛程式 **在 Gateway 程序內** 執行。

如果您使用遠端 Gateway，請在 **執行 Gateway 的機器** 上安裝/配置它，然後重新啟動 Gateway。

不需要外部的 `zca`/`openzca` CLI 執行檔。

## 安裝

### 選項 A：從 npm 安裝

```bash
openclaw plugins install @openclaw/zalouser
```

使用純套件名稱以追蹤目前的官方發行標籤。僅在需要可重現的安裝時，才鎖定特定版本。

之後請重新啟動 Gateway。

### 選項 B：從本機資料夾安裝（開發用）

```bash
PLUGIN_SRC=./path/to/local/zalouser-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

之後請重新啟動 Gateway。

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

頻道訊息動作也支援 `react` 用於訊息回應。

## 相關

- [建置外掛](/zh-Hant/plugins/building-plugins)
- [ClawHub](/zh-Hant/clawhub)
