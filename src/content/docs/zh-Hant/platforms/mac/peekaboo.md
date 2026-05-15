---
summary: "適用於 macOS UI 自動化的 PeekabooBridge 整合"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
  - Deciding between PeekabooBridge, Codex Computer Use, and cua-driver MCP
title: "Peekaboo bridge"
---

OpenClaw 可以將 **PeekabooBridge** 託管為本地的、具備權限感知的 UI 自動化代理程式。這讓 `peekaboo` CLI 能夠驅動 UI 自動化，同時重用 macOS 應用程式的 TCC 權限。

## 這是什麼（以及不是什麼）

- **主機**：OpenClaw.app 可以充當 PeekabooBridge 主機。
- **客戶端**：使用 `peekaboo` CLI（沒有單獨的 `openclaw ui ...` 介面）。
- **UI**：視覺覆蓋層保留在 Peekaboo.app 中；OpenClaw 是一個輕量級的代理主機。

## 與 Computer Use 的關係

OpenClaw 有三種桌面控制路徑，它們故意保持分離：

- **PeekabooBridge 主機**：OpenClaw.app 可以託管本地的 PeekabooBridge socket。
  `peekaboo` CLI 保持為客戶端，並使用 OpenClaw.app 的 macOS
  權限來執行 Peekaboo 自動化基本操作，例如螢幕截圖、點擊、
  選單、對話框、Dock 動作和視窗管理。
- **Codex Computer Use**：內建的 `codex` 外掛程式會準備 Codex app-server，
  驗證 Codex 的 `computer-use` MCP 伺服器是否可用，然後讓
  Codex 在 Codex 模式輪次中擁有原生桌面控制工具呼叫。OpenClaw
  不會透過 PeekabooBridge 代理這些動作。
- **直接 `cua-driver` MCP**：OpenClaw 可以將 TryCua 的上游
  `cua-driver mcp` 伺服器註冊為正常的 MCP 伺服器。這為代理程式提供 CUA
  驅動程式自己的 schema 和 pid/window/element-index 工作流程，而無需
  透過 Codex 市集或 PeekabooBridge socket 進行路由。

當您想要廣泛的 macOS 自動化介面和 OpenClaw.app 的
權限感知橋接主機時，請使用 Peekaboo。當 Codex 模式代理程式
應依賴 Codex 的原生電腦使用外掛程式時，請使用 Codex Computer Use。當您希望將 CUA 驅動程式作為正常的
MCP 伺服器公開給任何 OpenClaw 管理的執行時，請使用直接 `cua-driver mcp`。

## 啟用橋接器

在 macOS 應用程式中：

- Settings → **Enable Peekaboo Bridge**

啟用後，OpenClaw 會啟動本地 UNIX socket 伺服器。如果停用，主機
將停止，且 `peekaboo` 將回退到其他可用的主機。

## 客戶端探索順序

Peekaboo 客戶端通常會依此順序嘗試主機：

1. Peekaboo.app (完整 UX)
2. Claude.app (如果已安裝)
3. OpenClaw.app (輕量級代理程式)

使用 `peekaboo bridge status --verbose` 來查看哪個主機處於活動狀態以及正在使用
哪個 socket 路徑。您可以使用以下命令進行覆寫：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全性和權限

- 橋接器會驗證**呼叫者程式碼簽章**；會強制執行 TeamID 的
  允許清單 (Peekaboo 主機 TeamID + OpenClaw 應用程式 TeamID)。
- 請求會在大約 10 秒後逾時。
- 如果缺少必要的權限，橋接器會傳回明確的錯誤訊息，而不是啟動系統設定。

## 快照行為 (自動化)

快照會儲存在記憶體中，並在短時間後自動過期。如果您需要更長的保留時間，請從用戶端重新擷取。

## 疑難排解

- 如果 `peekaboo` 回報「bridge client is not authorized」，請確保用戶端已正確簽署，或者僅在 **debug** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 執行主機。
- 如果找不到任何主機，請開啟其中一個主機應用程式 (Peekaboo.app 或 OpenClaw.app)，並確認已授與權限。

## 相關內容

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [macOS 權限](/zh-Hant/platforms/mac/permissions)
