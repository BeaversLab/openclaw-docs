---
summary: "PeekabooBridge 整合以進行 macOS UI 自動化"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
title: "Peekaboo Bridge"
---

# Peekaboo Bridge (macOS UI 自動化)

OpenClaw 可以將 **PeekabooBridge** 託管為本機、具備權限感知的 UI 自動化
broker。這讓 `peekaboo` CLI 可以驅動 UI 自動化，同時重複使用
macOS 應用程式的 TCC 權限。

## 這是什麼（以及不是什麼）

- **主機 (Host)**：OpenClaw.app 可以充當 PeekabooBridge 主機。
- **用戶端 (Client)**：使用 `peekaboo` CLI（沒有獨立的 `openclaw ui ...` 介面）。
- **UI**：視覺化覆蓋層保留在 Peekaboo.app 中；OpenClaw 是一個輕量級 broker 主機。

## 啟用橋接器

在 macOS 應用程式中：

- Settings → **Enable Peekaboo Bridge**

啟用後，OpenClaw 會啟動本地 UNIX socket 伺服器。若停用，主機
會停止運作，且 `peekaboo` 將回退至其他可用的主機。

## 用戶端探索順序

Peekaboo 用戶端通常會依下列順序嘗試主機：

1. Peekaboo.app (完整 UX)
2. Claude.app (若已安裝)
3. OpenClaw.app (輕量型中介程式)

使用 `peekaboo bridge status --verbose` 來查看目前啟用的主機及
使用的 socket 路徑。您可以透過以下方式覆寫：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全性與權限

- 橋接器會驗證 **呼叫端程式碼簽章**；系統會強制執行
  TeamID 的允許清單 (Peekaboo 主機 TeamID + OpenClaw app TeamID)。
- 請求會在約 10 秒後逾時。
- 若缺少必要的權限，橋接器會傳回明確的錯誤訊息，
  而非開啟系統設定。

## 快照行為 (自動化)

快照會儲存在記憶體中，並在短時間後自動過期。
如果您需要保留更久，請從用戶端重新擷取。

## 疑難排解

- 如果 `peekaboo` 回報「bridge client is not authorized」，請確保用戶端已正確簽署，或者僅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 執行主機。
- 如果找不到主機，請開啟其中一個主機應用程式（Peekaboo.app 或 OpenClaw.app）並確認已授予權限。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
