---
summary: "透過 SSH 控制遠端 OpenClaw 閘道的 macOS app 流程"
read_when:
  - Setting up or debugging remote mac control
title: "Remote control"
---

# Remote OpenClaw (macOS ⇄ remote host)

此流程讓 macOS app 成為在另一台主機（桌上型電腦/伺服器）上執行之 OpenClaw 閘道的完整遙控器。這是該 app 的 **Remote over SSH**（遠端執行）功能。所有功能——健康檢查、語音喚醒轉送以及 Web Chat——皆重複使用來自 _Settings → General_ 的相同遠端 SSH 設定。

## 模式

- **本地（此 Mac）**：所有內容都在筆記型電腦上執行。不涉及 SSH。
- **Remote over SSH（預設）**：OpenClaw 指令是在遠端主機上執行。mac app 會開啟 SSH 連線，搭配 `-o BatchMode` 以及您選擇的身分/金鑰和本地連接埠轉送。
- **Remote direct (ws/wss)**：無 SSH 隧道。mac app 直接連線至閘道 URL（例如，透過 Tailscale Serve 或公開 HTTPS 反向代理）。

## 遠端傳輸

遠端模式支援兩種傳輸方式：

- **SSH 隧道**（預設）：使用 `ssh -N -L ...` 將閘道連接埠轉送至 localhost。由於隧道是 loopback，閘道會將節點 IP 視為 `127.0.0.1`。
- **Direct (ws/wss)**：直接連線至閘道 URL。閘道會看到真實的客戶端 IP。

在 SSH 隧道模式下，已探索的 LAN/tailnet 主機名稱會儲存為
`gateway.remote.sshTarget`。App 會在本地
隧道端點上保留 `gateway.remote.url`，例如 `ws://127.0.0.1:18789`，因此 CLI、Web Chat 和
本地 node-host 服務都會使用相同的安全 loopback 傳輸。

遠端模式下的瀏覽器自動化是由 CLI node host 控管的，而非由
原生 macOS app node 控管。App 會在可能時啟動已安裝的 node host 服務；
如果您需要從該 Mac 進行瀏覽器控制，請使用
`openclaw node install ...` 和 `openclaw node start` 安裝/啟動它（或在前景中執行
`openclaw node run ...`），然後以該具備瀏覽器功能的
node 為目標。

## 遠端主機的先決條件

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 請確保 `openclaw` 位於非互動式 shell 的 PATH 中（如有需要，請建立符號連結至 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 開啟使用金鑰驗證的 SSH。我們建議使用 **Tailscale** IP 以在非 LAN 環境下保持穩定的連線能力。

## macOS app 設定

1. 開啟 _設定 → 一般_。
2. 在 **OpenClaw 執行** 下，選擇 **透過 SSH 遠端** 並設定：
   - **傳輸**：**SSH 隧道** 或 **Direct (ws/wss)**。
   - **SSH 目標**：`user@host`（選填 `:port`）。
     - 如果閘道位於同一個 LAN 並透過 Bonjour 廣播，請從探索列表中選取它以自動填入此欄位。
   - **閘道 URL**（僅限 Direct）：`wss://gateway.example.ts.net`（或是用於本地/LAN 的 `ws://...`）。
   - **身分識別檔案**（進階）：您的金鑰路徑。
   - **專案根目錄**（進階）：用於指令的遠端 checkout 路徑。
   - **CLI 路徑**（進階）：可執行 `openclaw` 進入點/二進位檔的選用路徑（廣播時會自動填入）。
3. 點擊 **測試遠端**。成功表示遠端 `openclaw status --json` 執行正確。失敗通常意味著 PATH/CLI 問題；exit code 127 表示在遠端找不到 CLI。
4. 健康檢查和 Web Chat 現在將自動透過此 SSH 隧道執行。

## Web Chat

- **SSH 隧道**：Web Chat 透過轉送的 WebSocket 控制埠（預設 18789）連線至閘道。
- **直接 (ws/wss)**：Web Chat 直接連線到設定的閘道 URL。
- 不再有獨立的 WebChat HTTP 伺服器。

## 權限

- 遠端主機需要與本機相同的 TCC 許可（自動化、輔助功能、螢幕錄製、麥克風、語音辨識、通知）。在該機器上執行入門流程以一次性授予這些權限。
- 節點會透過 `node.list` / `node.describe` 公布其權限狀態，以便代理程式了解可用的功能。

## 安全注意事項

- 優先在遠端主機上使用 loopback 綁定，並透過 SSH 或 Tailscale 連線。
- SSH 隧道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將閘道綁定到非 loopback 介面，請要求有效的閘道驗證：權杖、密碼，或具有 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。
- 請參閱 [安全性](/zh-Hant/gateway/security) 和 [Tailscale](/zh-Hant/gateway/tailscale)。

## WhatsApp 登入流程（遠端）

- **在遠端主機上**執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR Code。
- 如果驗證過期，請在該主機上重新執行登入。健康檢查將會顯示連結問題。

## 疑難排解

- **exit 127 / not found**：`openclaw` 不在非登入 shell 的 PATH 中。將其加入 `/etc/paths`、您的 shell rc，或 symlink 到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：請檢查 SSH 連線性、PATH，以及 Baileys 是否已登入 (`openclaw status --json`)。
- **Web Chat 卡住**：請確認閘道正在遠端主機上執行，且轉發的連接埠符合閘道的 WS 連接埠；UI 需要健康的 WS 連線。
- **Node IP 顯示 127.0.0.1**：使用 SSH 隧道時屬於預期行為。如果您希望閘道看到真實的用戶端 IP，請將**傳輸**切換為**直接 (ws/wss)**。
- **Voice Wake**：觸發短語會在遠端模式下自動轉發；不需要額外的轉發器。

## 通知音效

使用 `openclaw` 和 `node.invoke` 從腳本中為每個通知選擇音效，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

應用程式中不再有全域的「預設音效」切換開關；呼叫者會根據每個請求選擇音效（或無音效）。

## 相關

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [遠端存取](/zh-Hant/gateway/remote)
