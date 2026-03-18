---
summary: "Chrome 擴充功能：讓 OpenClaw 控制您現有的 Chrome 分頁"
read_when:
  - You want the agent to drive an existing Chrome tab (toolbar button)
  - You need remote Gateway + local browser automation via Tailscale
  - You want to understand the security implications of browser takeover
title: "Chrome 擴充功能"
---

# Chrome 擴充功能 (瀏覽器中繼)

OpenClaw Chrome 擴充功能讓代理程式能控制您的 **現有 Chrome 分頁** (您的正常 Chrome 視窗)，而不是啟動另一個由 openclaw 管理的 Chrome 設定檔。

連接/中斷連接是透過 **單一 Chrome 工具列按鈕** 進行的。

如果您想要使用 Chrome 官方的 DevTools MCP 附加流程，而不是 OpenClaw 擴充功能中繼，請改用 `existing-session` 瀏覽器設定檔。請參閱
[瀏覽器](/zh-Hant/tools/browser#chrome-existing-session-via-mcp)。如需 Chrome 自己的設定文件，請參閱 [Chrome for Developers: Use Chrome DevTools MCP with your
browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
以及 [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)。

## 它是什麼 (概念)

包含三個部分：

- **瀏覽器控制服務** (Gateway 或節點)：代理程式/工具呼叫的 API (透過 Gateway)
- **本機中繼伺服器** (loopback CDP)：在控制伺服器和擴充功能之間進行橋接 (預設為 `http://127.0.0.1:18792`)
- **Chrome MV3 擴充功能**：使用 `chrome.debugger` 附加到目前使用中的分頁，並將 CDP 訊息傳送到中繼

然後 OpenClaw 透過正常的 `browser` 工具介面控制附加的分頁 (選取正確的設定檔)。

## 安裝 / 載入 (未封裝)

1. 將擴充功能安裝到穩定的本機路徑：

```bash
openclaw browser extension install
```

2. 列印已安裝的擴充功能目錄路徑：

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- 啟用「開發者模式」
- 「載入未封裝項目」 → 選取上方列印的目錄

4. 將擴充功能固定。

## 更新 (無建置步驟)

擴充功能隨附於 OpenClaw 版本 中作為靜態檔案。沒有獨立的「建置」步驟。

升級 OpenClaw 後：

- 重新執行 `openclaw browser extension install` 以重新整理 OpenClaw 狀態目錄下已安裝的檔案。
- Chrome → `chrome://extensions` → 按一下擴充功能上的「重新載入」。

## 使用它 (設定一次 Gateway Token)

若要使用擴充功能中繼，請為其建立瀏覽器設定檔：

在首次附加之前，請開啟擴充功能選項並設定：

- `Port` (預設為 `18792`)
- `Gateway token` (必須符合 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`)

然後建立一個設定檔：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

使用方式：

- CLI：`openclaw browser --browser-profile my-chrome tabs`
- Agent 工具：`browser` 搭配 `profile="my-chrome"`

### 自訂 Gateway 連接埠

如果您使用自訂的 gateway 連接埠，擴充功能的轉發連接埠會自動推算：

**擴充功能轉發連接埠 = Gateway 連接埠 + 3**

範例：如果 `gateway.port: 19001`，則：

- 擴充功能轉發連接埠：`19004` (gateway + 3)

請在擴充功能的選項頁面中，將擴充功能設定為使用推算出的轉發連接埠。

## 附加 / 分離 (工具列按鈕)

- 開啟您希望 OpenClaw 控制的分頁。
- 點擊擴充功能圖示。
  - 附加時，標誌會顯示 `ON`。
- 再次點擊以分離。

## 它控制哪個分頁？

- 它**不會**自動控制「您目前正在查看的任何分頁」。
- 它僅控制**您透過點擊工具列按鈕明確附加的分頁**。
- 若要切換：請開啟另一個分頁並點擊該處的擴充功能圖示。

## 標誌 + 常見錯誤

- `ON`：已附加；OpenClaw 可以控制該分頁。
- `…`：正在連接到本機轉發器。
- `!`：無法連線或驗證轉發器 (最常見原因：轉發伺服器未執行，或 gateway token 遺失/錯誤)。

如果您看到 `!`：

- 請確保 Gateway 正在本機執行 (預設設定)，或者如果 Gateway 在其他地方執行，請在此機器上執行 node host。
- 開啟擴充功能的選項頁面；它會驗證轉發器的連線性以及 gateway token 的驗證。

## 遠端 Gateway (使用 node host)

### 本機 Gateway (與 Chrome 在同一台機器上) — 通常**無需額外步驟**

如果 Gateway 與 Chrome 在同一台機器上執行，它會在 loopback 上啟動瀏覽器控制服務
並自動啟動轉發伺服器。擴充功能會與本機轉發器通訊；CLI/工具的呼叫則會送到 Gateway。

### 遠端 Gateway (Gateway 在其他地方執行) — **執行 node host**

如果您的 Gateway 在另一台機器上執行，請在執行 Chrome 的機器上啟動 node host。
Gateway 會將瀏覽器操作代理到該 node；擴充功能和轉發器則保留在瀏覽器機器本機。

如果有多個節點已連線，請使用 `gateway.nodes.browser.node` 固定其中一個，或設定 `gateway.nodes.browser.mode`。

## 沙盒（工具容器）

如果您的工作階段是在沙盒中執行（`agents.defaults.sandbox.mode != "off"`），則 `browser` 工具可能會受到限制：

- 預設情況下，沙盒工作階段通常會以 **沙盒瀏覽器**（`target="sandbox"`）為目標，而不是您的主機 Chrome。
- Chrome 擴充功能中繼接管需要控制 **主機** 瀏覽器控制伺服器。

選項：

- 最簡單的方式：從 **非沙盒** 工作階段/代理程式使用擴充功能。
- 或者，允許沙盒工作階段進行主機瀏覽器控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然後確保該工具未被工具政策拒絕，並（如有需要）使用 `target="host"` 呼叫 `browser`。

除錯：`openclaw sandbox explain`

## 遠端存取提示

- 請將 Gateway 和節點主機保持在同一個 tailnet 上；避免將中繼埠暴露至區域網路或公網。
- 有意識地配對節點；如果您不希望被遠端控制，請停用瀏覽器代理路由（`gateway.nodes.browser.mode="off"`）。
- 除非您確實有跨命名空間的需求，否則請將中繼保留在 loopback 上。對於 WSL2 或類似的分割主機設定，請將 `browser.relayBindHost` 設定為明確的綁定位址（例如 `0.0.0.0`），然後透過 Gateway 驗證、節點配對和私人網路來限制存取。

## 「擴充功能路徑」的運作方式

`openclaw browser extension path` 會列印出包含擴充功能檔案的 **已安裝** 磁碟目錄。

CLI 刻意 **不會** 列印 `node_modules` 路徑。請務必先執行 `openclaw browser extension install`，將擴充功能複製到您 OpenClaw 狀態目錄下的穩定位置。

如果您移動或刪除了該安裝目錄，Chrome 會將擴充功能標記為損壞，直到您從有效路徑重新載入它為止。

## 安全性影響（請閱讀本節）

這項功能強大但伴隨風險。請將其視為讓模型「親手操作您的瀏覽器」。

- 此擴充功能使用 Chrome 的 debugger API（`chrome.debugger`）。附加後，模型可以：
  - 在該分頁中點擊/輸入/導航
  - 讀取頁面內容
  - 存取該分頁登入工作階段可存取的任何內容
- **這並非像專屬的 openclaw 管理設定檔那樣受到隔離。**
  - 如果您連線到您日常使用的設定檔/分頁，您將授與對該帳戶狀態的存取權限。

建議：

- 為了擴充功能中繼用途，建議使用專屬的 Chrome 設定檔（與您的個人瀏覽分開）。
- 請將 Gateway 和任何節點主機保持在 tailnet 內；依賴 Gateway 驗證 + 節點配對。
- 避免在 LAN 上公開中繼連接埠（`0.0.0.0`），並避免使用 Funnel（公開）。
- 中繼會阻擋非擴充功能的來源，並且要求 `/cdp` 和 `/extension` 都必須進行 gateway-token 驗證。

相關連結：

- 瀏覽器工具概覽：[Browser](/zh-Hant/tools/browser)
- 安全稽核：[Security](/zh-Hant/gateway/security)
- Tailscale 設定：[Tailscale](/zh-Hant/gateway/tailscale)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
