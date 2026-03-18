---
summary: "透過 SSH 控制遠端 OpenClaw 閘道的 macOS app 流程"
read_when:
  - Setting up or debugging remote mac control
title: "遠端控制"
---

# 遠端 OpenClaw (macOS ⇄ 遠端主機)

此流程讓 macOS app 能充當在另一台主機（桌面/伺服器）上執行的 OpenClaw 閘道的完整遙控器。這是該 app 的 **透過 SSH 遠端**（遠端執行）功能。所有功能——健康檢查、語音喚醒轉發和網路聊天——都會重複使用來自 _Settings → General_ 的相同遠端 SSH 設定。

## 模式

- **本地端（此 Mac）**：所有東西都在筆記型電腦上執行。不涉及 SSH。
- **透過 SSH 遠端（預設）**：OpenClaw 指令會在遠端主機上執行。Mac app 會開啟一個 SSH 連線，並搭配 `-o BatchMode` 加上您選擇的身分/金鑰以及本地連接埠轉發。
- **直接遠端（ws/wss）**：無 SSH 隧道。Mac app 直接連線到閘道 URL（例如，透過 Tailscale Serve 或公開 HTTPS 反向代理）。

## 遠端傳輸

遠端模式支援兩種傳輸方式：

- **SSH 隧道**（預設）：使用 `ssh -N -L ...` 將閘道連接埠轉發到 localhost。由於隧道是回送，閘道會將節點的 IP 視為 `127.0.0.1`。
- **直接（ws/wss）**：直接連線到閘道 URL。閘道會看到真實的用戶端 IP。

## 遠端主機的先決條件

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 確保 `openclaw` 位於非互動式 shell 的 PATH 中（如有需要，可建立 symlink 到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 使用金鑰驗證開啟 SSH。我們建議使用 **Tailscale** IP 以確保在非區域網路環境下的穩定連線。

## macOS app 設定

1. 開啟 _Settings → General_。
2. 在 **OpenClaw runs** 下，選擇 **Remote over SSH** 並設定：
   - **傳輸方式**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH 目標**：`user@host`（選用 `:port`）。
     - 如果閘道位於相同的區域網路並廣播 Bonjour，請從探索清單中選擇它以自動填入此欄位。
   - **Gateway URL**（僅限直接模式）：`wss://gateway.example.ts.net`（或針對本地/區域網路使用 `ws://...`）。
   - **身分檔案**（進階）：您的金鑰路徑。
   - **Project root**（進階）：用於指令的遠端簽出路徑。
   - **CLI path**（進階）：可執行 `openclaw` 進入點/二進位檔的選用路徑（廣播時自動填入）。
3. 點擊 **Test remote**。成功表示遠端 `openclaw status --json` 執行正確。失敗通常意味著 PATH/CLI 問題；exit 127 表示在遠端找不到 CLI。
4. 健康檢查和 Web Chat 現在將透過此 SSH 通道自動執行。

## Web Chat

- **SSH tunnel**：Web Chat 透過轉發的 WebSocket 控制埠（預設 18789）連線到閘道。
- **Direct (ws/wss)**：Web Chat 直接連線到設定的閘道 URL。
- 不再有獨立的 WebChat HTTP 伺服器。

## Permissions

- 遠端主機需要與本機相同的 TCC 許可（Automation、Accessibility、Screen Recording、Microphone、Speech Recognition、Notifications）。在該機器上執行 onboarding 以一次性授予它們。
- 節點透過 `node.list` / `node.describe` 廣播其許可狀態，以便代理人知道可用的內容。

## Security notes

- 偏好在遠端主機上使用 loopback 綁定並透過 SSH 或 Tailscale 連線。
- SSH 通道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將 Gateway 綁定到非 loopback 介面，請要求 token/password 認證。
- 請參閱 [Security](/zh-Hant/gateway/security) 和 [Tailscale](/zh-Hant/gateway/tailscale)。

## WhatsApp login flow (remote)

- 在遠端主機上執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR 碼。
- 如果認證過期，請在該主機上重新執行登入。健康檢查會顯示連結問題。

## Troubleshooting

- **exit 127 / not found**：`openclaw` 不在非登入 shell 的 PATH 中。將其加入 `/etc/paths`、您的 shell rc，或連結到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：檢查 SSH 連線能力、PATH，以及 Baileys 是否已登入（`openclaw status --json`）。
- **Web Chat stuck**：確認閘道正在遠端主機上執行，且轉發的埠符合閘道 WS 埠；UI 需要健全的 WS 連線。
- **節點 IP 顯示 127.0.0.1**：這是 SSH 隧道的預期行為。如果您希望閘道看到真實的用戶端 IP，請將 **傳輸方式** 切換為 **直接 (ws/wss)**。
- **語音喚醒 (Voice Wake)**：觸發短語會在遠端模式下自動轉發；不需要額外的轉發器。

## 通知聲音

使用腳本中的 `openclaw` 和 `node.invoke` 為每個通知選擇聲音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

應用程式中已經沒有全域的「預設聲音」切換開關；呼叫者會根據每次請求選擇一個聲音（或不選擇）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
