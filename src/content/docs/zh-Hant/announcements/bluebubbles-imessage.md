---
summary: "BlueBubbles 支援已從 OpenClaw 中移除。對於新的和遷移的 iMessage 設定，請使用隨附的 iMessage 外掛與 imsg。"
read_when:
  - You used the old BlueBubbles channel and need to move to iMessage
  - You are choosing the supported OpenClaw iMessage setup
  - You need a short explanation of the BlueBubbles removal
title: "BlueBubbles 移除與 imsg iMessage 路徑"
---

# BlueBubbles 移除與 imsg iMessage 路徑

OpenClaw 不再隨附 BlueBubbles 頻道。iMessage 支援現在透過內建的 `imessage` 外掛運行，該外掛會在本地或透過 SSH 包裝器啟動 [`imsg`](https://github.com/steipete/imsg)，並透過 stdin/stdout 進行 JSON-RPC 通訊。

如果您的設定檔中仍然包含 `channels.bluebubbles`，請將其遷移至 `channels.imessage`。舊版的 `/channels/bluebubbles` 文件 URL 會重新導向至 [從 BlueBubbles 轉移](/zh-Hant/channels/imessage-from-bluebubbles)，其中包含完整的設定轉換表和切換檢查清單。

## 變更內容

- 在支援的 OpenClaw iMessage 路徑中，沒有 BlueBubbles HTTP 伺服器、webhook 路由、REST 密碼或 BlueBubbles 外掛執行環境。
- OpenClaw 透過登入 Messages.app 的 Mac 上的 `imsg` 讀取並監視訊息。
- 基本的傳送、接收、歷史記錄和媒體功能使用標準的 `imsg` 介面和 macOS 權限。
- 進階動作（例如執行緒回覆、輕拍回應、編輯、取消傳送、特效、已讀回執、輸入指示器和群組管理）需要具備可用私有 API 橋接器的 `imsg launch`。
- Linux 和 Windows 閘道仍然可以透過將 `channels.imessage.cliPath` 設定為 SSH 包裝器來使用 iMessage，該包裝器會在已登入的 Mac 上執行 `imsg`。

## 操作步驟

1. 在 Messages Mac 上安裝並驗證 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   imsg rpc --help
   ```

2. 授予執行 `imsg` 和 OpenClaw 的進程環境完全磁碟存取權 和自動化 權限。

3. 轉換舊的設定檔：

   ```json5
   {
     channels: {
       imessage: {
         enabled: true,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"],
         groupPolicy: "allowlist",
         groupAllowFrom: ["+15555550123"],
         groups: {
           "*": { requireMention: true },
         },
         includeAttachments: true,
       },
     },
   }
   ```

4. 重新啟動閘道並驗證：

   ```bash
   openclaw channels status --probe
   ```

5. 在刪除舊的 BlueBubbles 伺服器之前，請先測試私訊、群組、附件以及您依賴的任何私有 API 動作。

## 遷移注意事項

- `channels.bluebubbles.serverUrl` 和 `channels.bluebubbles.password` 沒有 iMessage 的對等項目。
- `channels.bluebubbles.allowFrom`、`groupAllowFrom`、`groups`、`includeAttachments`、附件根目錄、媒體大小限制、分塊以及動作切換都有 iMessage 對應項。
- `channels.imessage.includeAttachments` 預設仍為關閉。如果您希望接收的傳入照片、語音備忘錄、影片或檔案到達代理程式，請明確設定它。
- 使用 `groupPolicy: "allowlist"` 時，複製舊的 `groups` 區塊，包括任何 `"*"` 萬用字元項目。群組傳送者允許清單和群組註冊表是獨立的閘門。
- 符合 `channel: "bluebubbles"` 的 ACP 繫結必須變更為 `channel: "imessage"`。
- 舊的 BlueBubbles 會話金鑰不會變成 iMessage 會話金鑰。配對核准會依照 handle 帶過來，但在 BlueBubbles 會話金鑰下的對話歷史記錄則不會。

## 請參閱

- [從 BlueBubbles 轉移過來](/zh-Hant/channels/imessage-from-bluebubbles)
- [iMessage](/zh-Hant/channels/imessage)
- [設定參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
