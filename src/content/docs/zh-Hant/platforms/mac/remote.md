---
summary: "用於控制遠端 OpenClaw 閘道的 macOS 應用程式流程"
read_when:
  - Setting up or debugging remote mac control
title: "遠端控制"
---

此流程讓 macOS 應用程式能充當在另一台主機（桌面/伺服器）上執行之 OpenClaw 閘道的完整遠端控制器。該應用程式可以直接連線到受信任的 LAN/Tailnet 閘道 URL，或在遠端閘道僅限本機回環時管理 SSH 隧道。健康檢查、語音喚醒轉送和 Web 聊天都會重複使用來自 _設定 → 一般_ 的相同遠端設定。

## 模式

- **Local (this Mac)**：所有操作都在筆記型電腦上執行。不涉及 SSH。
- **透過 SSH 遠端（預設）**：OpenClaw 指令在遠端主機上執行。Mac 應用程式會開啟一個含有 `-o BatchMode` 的 SSH 連線，加上您選擇的身分/金鑰以及本地埠轉送。
- **直接遠端 (ws/wss)**：無 SSH 隧道。Mac 應用程式直接連線到閘道 URL（例如，透過 LAN、Tailscale、Tailscale Serve 或公開 HTTPS 反向代理）。

## 遠端傳輸

遠端模式支援兩種傳輸方式：

- **SSH 隧道**（預設）：使用 `ssh -N -L ...` 將閘道埠轉送到 localhost。由於隧道是本機回環，閘道會將節點的 IP 視為 `127.0.0.1`。
- **Direct (ws/wss)**：直接連接到閘道 URL。閘道會看到真實的客戶端 IP。

在 SSH 隧道模式下，探索到的 LAN/tailnet 主機名稱會儲存為
`gateway.remote.sshTarget`。應用程式會在本地
隧道端點上保留 `gateway.remote.url`，例如 `ws://127.0.0.1:18789`，因此 CLI、Web 聊天和
本地 node-host 服務都會使用相同的本機回環傳輸。
如果本地隧道埠與遠端閘道埠不同，請將
`gateway.remote.remotePort` 設定為遠端主機上的埠。

遠端模式下的瀏覽器自動化是由 CLI 節點主機管理，而非由
原生 macOS 應用程式節點管理。應用程式會在可能時啟動已安裝的節點主機服務；
如果您需要從該 Mac 進行瀏覽器控制，請使用
`openclaw node install ...` 和 `openclaw node start` 安裝/啟動它（或在前景中執行
`openclaw node run ...`），然後以該具備瀏覽器功能的節點為目標。

## 遠端主機的先決條件

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 確保 `openclaw` 在非互動式 shell 的 PATH 中（如有需要，請建立符號連結至 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 僅限 SSH 傳輸：使用金鑰驗證開啟 SSH。我們建議使用 **Tailscale** IP 以確保在區域網路外的穩定連線。

## macOS 應用程式設定

若要在不使用歡迎流程的情況下預先設定應用程式：

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway.local \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

若閘道已可透過信任的區域網路或 Tailnet 存取，請完全略過 SSH：

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

這會寫入遠端設定、將引導程式標記為完成，並讓應用程式在啟動時擁有
選定的傳輸方式。

1. 開啟 _Settings → General_。
2. 在 **OpenClaw runs** 下，選擇 **Remote** 並設定：
   - **Transport**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH target**：`user@host` (選用 `:port`)。
     - 如果閘道位於相同的區域網路並廣播 Bonjour，請從探索清單中選取它以自動填入此欄位。
   - **Gateway URL** (僅限 Direct)：`wss://gateway.example.ts.net` (或 `ws://...` 用於本地/區域網路)。
   - **Identity file** (進階)：您的金鑰路徑。
   - **Project root** (進階)：用於指令的遠端簽出路徑。
   - **CLI path** (進階)：可執行 `openclaw` 進入點/二進位檔的選用路徑 (廣播時會自動填入)。
3. 點擊 **Test remote**。成功表示遠端 `openclaw status --json` 運作正常。失敗通常意味著 PATH/CLI 問題；結束代碼 127 表示在遠端找不到 CLI。
4. 健康檢查和 Web Chat 現在將透過選定的傳輸方式自動執行。

## Web Chat

- **SSH tunnel**：Web Chat 透過轉發的 WebSocket 控制埠連線至閘道 (預設 18789)。
- **Direct (ws/wss)**：Web Chat 直接連線至設定的閘道 URL。
- 不再有獨立的 WebChat HTTP 伺服器。

## Permissions

- 遠端主機需要與本地相同的 TCC 核准 (Automation、Accessibility、Screen Recording、Microphone、Speech Recognition、Notifications)。請在該機器上執行引導程式以一次授予這些權限。
- 節點透過 `node.list` / `node.describe` 廣播其權限狀態，以便代理程式知道有哪些可用功能。

## Security notes

- 建議在遠端主機上使用 loopback 繫結，並透過 SSH、Tailscale Serve 或受信任的 Tailnet/區域網路直接 URL 進行連線。
- SSH 隧道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將綁定到非回環介面，請要求有效的 Gateway 驗證：token、密碼，或具備身分感知的反向 Proxy 並搭配 `gateway.auth.mode: "trusted-proxy"`。
- 請參閱 [安全性](/zh-Hant/gateway/security) 和 [Tailscale](/zh-Hant/gateway/tailscale)。

## WhatsApp 登入流程（遠端）

- 在**遠端主機**上執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR 碼。
- 如果驗證過期，請在該主機上重新執行登入。健康檢查將會顯示連線問題。

## 疑難排解

- **exit 127 / not found**：`openclaw` 不在非登入 shell 的 PATH 中。將其加入 `/etc/paths`、您的 shell rc，或 symlink 到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：檢查 SSH 連線能力、PATH，以及 Baileys 是否已登入（`openclaw status --json`）。
- **Web Chat 卡住**：確認 gateway 正在遠端主機上執行，且轉送的連接埠與 gateway WS 連接埠相符；UI 需要健康的 WS 連線。
- **Node IP 顯示 127.0.0.1**：使用 SSH 隧道時這是預期的。如果您希望 gateway 看到真實的用戶端 IP，請將**傳輸**切換為**直接**。
- **Dashboard 可用但 Mac 功能離線**：這表示應用程式的操作員/控制連線正常，但 companion node 連線未連線或缺少指令介面。開啟選單列裝置區段並檢查 Mac 是否 `paired · disconnected`。對於 `wss://*.ts.net` Tailscale Serve 端點，應用程式會在憑證輪換後偵測到過時的舊版 TLS 葉片 pin，並在 macOS 信任新憑證時清除過時的 pin，然後自動重試。如果憑證不受系統信任或主機不是 Tailscale Serve 名稱，請將 `gateway.remote.tlsFingerprint` 設為預期的憑證指紋、審查憑證，或切換至**透過 SSH 遠端**。
- **Voice Wake**：觸發短語會在遠端模式下自動轉發；不需要單獨的轉發器。

## 通知音效

使用 `openclaw` 和 `node.invoke` 從腳本中為每個通知選擇音效，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

應用程式中已不再有全域的「預設音效」切換開關；呼叫者會在每次請求時選擇音效（或不選擇）。

## 相關

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [遠端存取](/zh-Hant/gateway/remote)
