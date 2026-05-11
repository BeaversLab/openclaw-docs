---
summary: "在幾分鐘內安裝 OpenClaw 並執行您的第一次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "快速開始"
---

安裝 OpenClaw、執行導引程式，並與您的 AI 助手聊天——全程只需約 5 分鐘。最後您將擁有一個運行中的 Gateway、已配置的身份驗證以及一個可用的聊天工作階段。

## 您需要什麼

- **Node.js** — 推薦使用 Node 24（也支援 Node 22.14+）
- **一個 API 金鑰**，來自模型供應商（Anthropic、OpenAI、Google 等）——導引程式會提示您輸入

<Tip>使用 `node --version` 檢查您的 Node 版本。 **Windows 使用者：** 同時支援原生 Windows 和 WSL2。WSL2 更穩定，建議使用以獲得完整體驗。參閱 [Windows](/zh-Hant/platforms/windows)。 需要安裝 Node 嗎？參閱 [Node 設定](/zh-Hant/install/node)。</Tip>

## 快速設定

<Steps>
  <Step title="安裝 OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安裝腳本過程"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    其他安裝方式（Docker、Nix、npm）：[安裝](/zh-Hant/install)。
    </Note>

  </Step>
  <Step title="執行導引程式">
    ```bash
    openclaw onboard --install-daemon
    ```

    精靈會引導您選擇模型供應商、設定 API 金鑰以及配置 Gateway。大約需要 2 分鐘。

    參閱 [導引程式 (CLI)](/zh-Hant/start/wizard) 以取得完整參考資料。

  </Step>
  <Step title="驗證 Gateway 是否正在運行">
    ```bash
    openclaw gateway status
    ```

    您應該會看到 Gateway 正在監聽連接埠 18789。

  </Step>
  <Step title="開啟儀表板">
    ```bash
    openclaw dashboard
    ```

    這會在您的瀏覽器中開啟控制 UI。如果能載入，就表示一切運作正常。

  </Step>
  <Step title="Send your first message">
    在 Control UI 聊天中輸入一條訊息，您應該會收到 AI 的回覆。

    想改用手機聊天？設定最快的管道是
    [Telegram](/zh-Hant/channels/telegram)（只需要一個 bot token）。請參閱 [Channels](/zh-Hant/channels)
    了解所有選項。

  </Step>
</Steps>

<Accordion title="Advanced: mount a custom Control UI build">
  如果您維護本地化或自訂的 dashboard 版本，請將
  `gateway.controlUi.root` 指向包含您建置好的靜態資源
  和 `index.html` 的目錄。

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# Copy your built static files into that directory.
```

然後設定：

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
    }
  }
}
```

重新啟動 gateway 並重新開啟 dashboard：

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## What to do next

<Columns>
  <Card title="Connect a channel" href="/zh-Hant/channels" icon="message-square">
    Discord、Feishu、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo 等等。
  </Card>
  <Card title="Pairing and safety" href="/zh-Hant/channels/pairing" icon="shield">
    控制誰可以傳訊息給您的 agent。
  </Card>
  <Card title="Configure the Gateway" href="/zh-Hant/gateway/configuration" icon="settings">
    模型、工具、沙盒與進階設定。
  </Card>
  <Card title="Browse tools" href="/zh-Hant/tools" icon="wrench">
    瀏覽器、exec、網頁搜尋、技能與外掛。
  </Card>
</Columns>

<Accordion title="Advanced: 環境變數">
  如果您將 OpenClaw 作為服務帳號執行或想要自訂路徑：

- `OPENCLAW_HOME` — 內部路徑解析的主目錄
- `OPENCLAW_STATE_DIR` — 覆蓋狀態目錄
- `OPENCLAW_CONFIG_PATH` — 覆蓋設定檔路徑

完整參考：[Environment variables](/zh-Hant/help/environment)。

</Accordion>

## 相關

- [安裝概觀](/zh-Hant/install)
- [通道概觀](/zh-Hant/channels)
- [設定](/zh-Hant/start/setup)
