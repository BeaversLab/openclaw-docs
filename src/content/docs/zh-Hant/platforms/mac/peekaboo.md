---
summary: "適用於 macOS UI 自動化的 PeekabooBridge 整合"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
title: "Peekaboo Bridge"
---

# Peekaboo Bridge (macOS UI 自動化)

OpenClaw 可以將 **PeekabooBridge** 託管為本機、具備權限感知能力的 UI 自動化代理程式。這讓 `peekaboo` CLI 能在驅動 UI 自動化的同時，重複使用 macOS 應用程式的 TCC 權限。

## 這是什麼（以及不是什麼）

- **主機**：OpenClaw.app 可充當 PeekabooBridge 主機。
- **用戶端**：使用 `peekaboo` CLI（沒有獨立的 `openclaw ui ...` 介面）。
- **UI**：視覺疊加層保留在 Peekaboo.app 中；OpenClaw 是一個輕量級的代理主機。

## 啟用橋接器

在 macOS 應用程式中：

- Settings → **Enable Peekaboo Bridge**

啟用後，OpenClaw 會啟動本機 UNIX socket 伺服器。如果停用，主機會停止運作，而 `peekaboo` 將會回退至其他可用的主機。

## 用戶端探索順序

Peekaboo 用戶端通常會依以下順序嘗試主機：

1. Peekaboo.app (完整 UX)
2. Claude.app (若已安裝)
3. OpenClaw.app (輕量級代理程式)

使用 `peekaboo bridge status --verbose` 來查看哪個主機處於啟用狀態以及正在使用哪個 socket 路徑。您可以透過以下方式覆寫：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全性與權限

- 橋接器會驗證**呼叫者的程式碼簽章**；並會強制執行 TeamID 的允許清單（Peekaboo 主機 TeamID + OpenClaw 應用程式 TeamID）。
- 請求會在大約 10 秒後逾時。
- 如果缺少所需的權限，橋接器會傳回清晰的錯誤訊息，而不是啟動系統設定。

## 快照行為 (自動化)

快照會儲存在記憶體中，並會在短時間後自動過期。如果您需要更長的保留時間，請從用戶端重新擷取。

## 疑難排解

- 如果 `peekaboo` 回報「bridge client is not authorized」，請確保用戶端已正確簽章，或僅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 執行主機。
- 如果找不到任何主機，請開啟其中一個主機應用程式（Peekaboo.app 或 OpenClaw.app），並確認已授予權限。
