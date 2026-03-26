---
summary: "透過 SSH 控制遠端 OpenClaw 閘道的 macOS app 流程"
read_when:
  - Setting up or debugging remote mac control
title: "遠端控制"
---

# Remote OpenClaw (macOS ⇄ remote host)

此流程讓 macOS app 能充當在另一台主機（桌面/伺服器）上執行的 OpenClaw 閘道的完整遠端控制。這是 app 的 **Remote over SSH**（遠端執行）功能。所有功能——健康檢查、Voice Wake 轉發和 Web Chat——都會重複使用 _Settings → General_ 中的相同遠端 SSH 設定。

## 模式

- **Local (this Mac)**：所有內容都在筆記型電腦上執行。不涉及 SSH。
- **Remote over SSH (default)**：OpenClaw 指令在遠端主機上執行。mac app 會開啟 SSH 連線，並使用 `-o BatchMode` 加上您選擇的身分/金鑰以及本地連接埠轉發。
- **Remote direct (ws/wss)**：不使用 SSH 隧道。Mac 應用程式直接連接到 gateway URL（例如，透過 Tailscale Serve 或公開 HTTPS 反向代理）。

## Remote transports

Remote 模式支援兩種傳輸方式：

- **SSH tunnel**（預設）：使用 `ssh -N -L ...` 將 gateway 埠轉發到 localhost。由於隧道是 loopback，gateway 會將節點的 IP 視為 `127.0.0.1`。
- **Direct (ws/wss)**：直接連接到 gateway URL。Gateway 會看到真實的用戶端 IP。

## Prereqs on the remote host

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 確保 `openclaw` 在非互動式 shell 的 PATH 中（如有需要，可建立 symlink 到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 開啟金鑰驗證的 SSH。我們建議使用 **Tailscale** IP 以確保非區域網路 (LAN) 下的穩定連線能力。

## macOS app setup

1. 開啟 _Settings → General_。
2. 在 **OpenClaw runs** 下，選擇 **Remote over SSH** 並設定：
   - **Transport**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH target**：`user@host`（選用 `:port`）。
     - 如果閘道位於同一個區域網路並廣播 Bonjour，請從探索清單中選取它以自動填入此欄位。
   - **Gateway URL**（僅限 Direct）：`wss://gateway.example.ts.net`（若是本機/LAN 則為 `ws://...`）。
   - **Identity file**（進階）：您的金鑰路徑。
   - **Project root**（進階）：用於指令的遠端 checkout 路徑。
   - **CLI path**（進階）：可執行 `openclaw` 進入點/二進位檔案的選用路徑（廣播時會自動填入）。
3. 點擊 **Test remote**。成功表示遠端 `openclaw status --json` 正確執行。失敗通常代表 PATH/CLI 問題；exit 127 表示在遠端找不到 CLI。
4. Health checks and Web Chat 現在會透過此 SSH 通道自動執行。

## Web Chat

- **SSH 通道**：Web Chat 透過轉發的 WebSocket 控制連接埠（預設為 18789）連接至閘道。
- **直接連接 (ws/wss)**：Web Chat 直接連線至已設定的閘道 URL。
- 已不再有獨立的 WebChat HTTP 伺服器。

## Permissions

- 遠端主機需要與本機相同的 TCC 許可（Automation、Accessibility、Screen Recording、Microphone、Speech Recognition、Notifications）。請在該機器上執行 onboard 並一次性授予這些許可。
- 節點會透過 `node.list` / `node.describe` 公告其許可狀態，以便代理程式知道有哪些功能可用。

## Security notes

- 建議在遠端主機上使用 loopback 綁定，並透過 SSH 或 Tailscale 進行連線。
- SSH 通道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將 Gateway 綁定到非 loopback 介面，請要求使用 token/密碼驗證。
- 請參閱 [安全性](/zh-Hant/gateway/security) 和 [Tailscale](/zh-Hant/gateway/tailscale)。

## WhatsApp 登入流程 (遠端)

- 在 **遠端主機上** 執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR code。
- 如果驗證過期，請在該主機上重新執行登入。健康檢查會顯示連結問題。

## 疑難排解

- **exit 127 / not found**: `openclaw` 不在非登入 shell 的 PATH 中。請將其加入 `/etc/paths`、您的 shell rc，或 symlink 到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**: 檢查 SSH 連線能力、PATH，以及 Baileys 是否已登入 (`openclaw status --json`)。
- **Web Chat 卡住**：請確認 gateway 正在遠端主機上執行，且轉發的連接埠符合 gateway 的 WS 連接埠；UI 需要健全的 WS 連線。
- **Node IP 顯示 127.0.0.1**：這是 SSH 隧道的預期行為。如果您希望 gateway 看到真實的客戶端 IP，請將 **Transport** 切換為 **Direct (ws/wss)**。
- **Voice Wake**：觸發短語會在遠端模式下自動轉發；不需要額外的轉發器。

## 通知音效

從腳本中為每個通知選擇音效，使用 `openclaw` 和 `node.invoke`，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

應用程式中不再有全域的「預設音效」切換開關；呼叫者會針對每個請求選擇音效（或不選）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
