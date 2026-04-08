---
summary: "透過 SSH 控制遠端 OpenClaw 閘道的 macOS app 流程"
read_when:
  - Setting up or debugging remote mac control
title: "遠端控制"
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

## 遠端主機的先決條件

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 確保 `openclaw` 在非互動式 shell 的 PATH 中（如有需要，請建立符號連結至 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 使用金鑰驗證開啟 SSH。我們建議使用 **Tailscale** IP 以在離開 LAN 時保持穩定的連線能力。

## macOS app 設定

1. 開啟 _Settings → General_。
2. 在 **OpenClaw runs** 下，選擇 **Remote over SSH** 並設定：
   - **Transport**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH target**：`user@host`（選填 `:port`）。
     - 如果閘道位於相同的 LAN 且廣播 Bonjour，請從探索清單中選取它以自動填入此欄位。
   - **Gateway URL**（僅限 Direct）：`wss://gateway.example.ts.net`（或是本地/LAN 的 `ws://...`）。
   - **Identity file**（進階）：您的金鑰路徑。
   - **專案根目錄** (進階)：用於指令的遠端簽出路徑。
   - **CLI 路徑** (進階)：可執行 `openclaw` 進入點/二進位檔的可選路徑（在通告時自動填入）。
3. 點擊 **測試遠端**。成功表示遠端 `openclaw status --json` 執行正確。失敗通常意味著 PATH/CLI 問題；退出代碼 127 表示遠端找不到 CLI。
4. 健康檢查和 Web 聊天現在將自動透過此 SSH 通道執行。

## Web 聊天

- **SSH 通道**：Web 聊天透過轉發的 WebSocket 控制埠（預設為 18789）連接到閘道。
- **直接連線 (ws/wss)**：Web 聊天直接連接到設定的閘道 URL。
- 不再有獨立的 WebChat HTTP 伺服器。

## 權限

- 遠端主機需要與本機相同的 TCC 許可（自動化、輔助功能、螢幕錄製、麥克風、語音辨識、通知）。在該機器上執行上架流程以一次性授予這些許可。
- 節點透過 `node.list` / `node.describe` 通告其權限狀態，以便代理程式知道可用的功能。

## 安全性備註

- 優先在遠端主機上使用回環綁定，並透過 SSH 或 Tailscale 連線。
- SSH 通道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將 Gateway 繫結到非 loopback 介面，請要求有效的 Gateway 身分驗證：token、密碼，或是具備 `gateway.auth.mode: "trusted-proxy"` 的具備身份感知能力的反向代理伺服器。
- 請參閱 [安全性](/en/gateway/security) 和 [Tailscale](/en/gateway/tailscale)。

## WhatsApp 登入流程（遠端）

- **在遠端主機上** 執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR Code。
- 如果授權過期，請在該主機上重新執行登入。健康檢查將顯示連線問題。

## 疑難排解

- **exit 127 / not found**：`openclaw` 不在非登入 shell 的 PATH 中。請將其新增至 `/etc/paths`、您的 shell rc，或是建立符號連結至 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：請檢查 SSH 連線能力、PATH，以及 Baileys 是否已登入 (`openclaw status --json`)。
- **Web 聊天卡住**：確認閘道正在遠端主機上運作，且轉發的埠與閘道 WS 埠相符；UI 需要健康的 WS 連線。
- **節點 IP 顯示為 127.0.0.1**：使用 SSH 通道時屬於正常情況。如果您希望閘道看到真實的客戶端 IP，請將**傳輸方式 (Transport)** 切換至 **直接 (ws/wss)**。
- **語音喚醒 (Voice Wake)**：觸發詞組會在遠端模式下自動轉發；無需額外的轉發器。

## 通知音效

使用透過腳本中的 `openclaw` 和 `node.invoke` 為每個通知選擇音效，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

應用程式中不再有全域「預設音效」切換開關；呼叫者需在每次請求時選擇音效（或無音效）。
