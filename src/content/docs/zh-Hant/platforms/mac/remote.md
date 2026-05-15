---
summary: "透過 SSH 控制遠端 OpenClaw 閘道的 macOS app 流程"
read_when:
  - Setting up or debugging remote mac control
title: "Remote control"
---

此流程讓 macOS 應用程式能充當在另一台主機（桌面/伺服器）上執行的 OpenClaw 閘道的完整遙控器。這是該應用程式的 **Remote over SSH**（遠端執行）功能。所有功能（健康檢查、語音喚醒轉送和網頁聊天）都重複使用來自 _Settings → General_ 的相同遠端 SSH 設定。

## 模式

- **Local (this Mac)**：所有操作都在筆記型電腦上執行。不涉及 SSH。
- **Remote over SSH (default)**：OpenClaw 指令在遠端主機上執行。mac 應用程式會開啟一個 SSH 連線，使用 `-o BatchMode` 加上您選擇的身分/金鑰以及本機連接埠轉送。
- **Remote direct (ws/wss)**：無 SSH 隧道。mac 應用程式直接連接到閘道 URL（例如，透過 Tailscale Serve 或公開 HTTPS 反向代理）。

## 遠端傳輸

遠端模式支援兩種傳輸方式：

- **SSH tunnel**（預設）：使用 `ssh -N -L ...` 將閘道連接埠轉送到 localhost。由於隧道是回環，閘道會將節點的 IP 視為 `127.0.0.1`。
- **Direct (ws/wss)**：直接連接到閘道 URL。閘道會看到真實的客戶端 IP。

在 SSH 隧道模式下，探索到的 LAN/tailnet 主機名稱會儲存為
`gateway.remote.sshTarget`。應用程式會在本地
隧道端點上保留 `gateway.remote.url`，例如 `ws://127.0.0.1:18789`，因此 CLI、網頁聊天和
本機 node-host 服務都使用相同的安全回環傳輸。

遠端模式下的瀏覽器自動化由 CLI 節點主機擁有，而非
原生 macOS 應用程式節點。應用程式會在可能時啟動已安裝的節點主機服務；
如果您需要從該 Mac 進行瀏覽器控制，請使用
`openclaw node install ...` 和 `openclaw node start` 安裝/啟動它（或在前景中執行
`openclaw node run ...`），然後以該具備瀏覽器功能的
節點為目標。

## 遠端主機的先決條件

1. 安裝 Node + pnpm 並建置/安裝 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 確保 `openclaw` 在非互動式 shell 的 PATH 中（如需要，請符號連結到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 開啟具有金鑰驗證的 SSH。我們建議使用 **Tailscale** IP 以在區域網路外穩定連線。

## macOS 應用程式設定

1. 開啟 _Settings → General_。
2. 在 **OpenClaw runs** 下，選擇 **Remote over SSH** 並設定：
   - **傳輸**：**SSH 通道** 或 **直接 (ws/wss)**。
   - **SSH 目標**：`user@host` (選用 `:port`)。
     - 如果閘道位於同一個區域網路 (LAN) 並廣播 Bonjour，請從探索清單中選取它以自動填入此欄位。
   - **閘道 URL** (僅直接連線)：`wss://gateway.example.ts.net` (或本地/LAN 使用 `ws://...`)。
   - **身分識別檔案** (進階)：您的金鑰路徑。
   - **專案根目錄** (進階)：用於指令的遠端檢出路徑。
   - **CLI 路徑** (進階)：可執行 `openclaw` 進入點/二進位檔的選用路徑 (廣播時會自動填入)。
3. 點擊 **測試遠端**。成功表示遠端 `openclaw status --json` 執行正確。失敗通常意味著 PATH/CLI 問題；結束代碼 127 表示在遠端找不到 CLI。
4. 健康檢查和 Web 聊天現在將自動透過此 SSH 通道執行。

## Web 聊天

- **SSH 通道**：Web 聊天透過轉送的 WebSocket 控制埠 (預設 18789) 連線至閘道。
- **直接 (ws/wss)**：Web 聊天直接連線至已設定的閘道 URL。
- 不再有獨立的 WebChat HTTP 伺服器。

## 權限

- 遠端主機需要與本地相同的 TCC 核准 (自動化、輔助功能、螢幕錄製、麥克風、語音辨識、通知)。請在該機器上執行入門設定以一次授與這些權限。
- 節點透過 `node.list` / `node.describe` 廣播其權限狀態，讓代理程式知道可用的功能。

## 安全備註

- 優先在遠端主機上使用回環綁定，並透過 SSH 或 Tailscale 連線。
- SSH 通道使用嚴格的主機金鑰檢查；請先信任主機金鑰，使其存在於 `~/.ssh/known_hosts` 中。
- 如果您將閘道綁定到非回環介面，請要求有效的閘道驗證：權杖、密碼，或具有 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。
- 參閱 [安全](/zh-Hant/gateway/security) 和 [Tailscale](/zh-Hant/gateway/tailscale)。

## WhatsApp 登入流程 (遠端)

- 在遠端主機上執行 `openclaw channels login --verbose`。使用手機上的 WhatsApp 掃描 QR 碼。
- 如果驗證過期，請在該主機上重新執行登入。健康檢查將會顯示連結問題。

## 疑難排解

- **exit 127 / not found**: `openclaw` 不在非登入 shell 的 PATH 中。請將其新增至 `/etc/paths`、您的 shell rc，或 symlink 到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**: 檢查 SSH 連線性、PATH，以及 Baileys 是否已登入 (`openclaw status --json`)。
- **Web Chat stuck**: 確認 gateway 正在遠端主機上執行，且轉發的連接埠符合 gateway 的 WS 連接埠；UI 需要健康的 WS 連線。
- **Node IP shows 127.0.0.1**: 這是 SSH 隧道的預期行為。如果您希望 gateway 看到真實的客戶端 IP，請將 **Transport** 切換為 **Direct (ws/wss)**。
- **Dashboard works but Mac capabilities are offline**: 這表示 App 的 operator/control 連線正常，但 companion node 連線未連接或缺少其指令介面。開啟選單列裝置區段並檢查 Mac 是否為 `paired · disconnected`。對於 `wss://*.ts.net` Tailscale Serve 端點，App 會在憑證輪替後偵測到過時的舊版 TLS 葉子 pin，並在 macOS 信任新憑證時清除過時的 pin，然後自動重試。如果憑證未受系統信任或主機不是 Tailscale Serve 名稱，請審查憑證或切換至 **Remote over SSH**。
- **Voice Wake**：觸發短語會在遠端模式下自動轉發；不需要額外的轉發器。

## 通知音效

使用 `openclaw` 和 `node.invoke` 從腳本中為每個通知選擇聲音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

App 中已不再有全域的「預設聲音」切換開關；呼叫者需根據每次請求選擇聲音（或不選）。

## 相關

- [macOS app](/zh-Hant/platforms/macos)
- [Remote access](/zh-Hant/gateway/remote)
