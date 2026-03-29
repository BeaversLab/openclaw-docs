---
summary: "在幾分鐘內安裝 OpenClaw 並執行您的第一次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "快速入門"
---

# 快速入門

安裝 OpenClaw，執行入門引導，並與您的 AI 助手聊天 — 全部過程
大約需要 5 分鐘。完成後，您將擁有一個執行中的 Gateway、已配置的身份驗證
以及一個可運作的聊天會話。

## 您需要什麼

- **Node.js** — 建議使用 Node 24（也支援 Node 22.14+）
- **API 金鑰** 來自模型提供商（Anthropic、OpenAI、Google 等） — 入門引導會提示您輸入

<Tip>使用 `node --version` 檢查您的 Node 版本。**Windows 使用者：** 支援原生的 Windows 和 WSL2。WSL2 更穩定，建議用於完整體驗。請參閱 [Windows](/en/platforms/windows)。需要安裝 Node 嗎？請參閱 [Node 設定](/en/install/node)。</Tip>

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
  alt="Install Script Process"
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
    其他安裝方法（Docker、Nix、npm）：[安裝](/en/install)。
    </Note>

  </Step>
  <Step title="執行入門引導">
    ```bash
    openclaw onboard --install-daemon
    ```

    精靈會引導您選擇模型提供商、設定 API 金鑰

以及配置 Gateway。大約需要 2 分鐘。

    完整參考請參閱 [入門引導 (CLI)](/en/start/wizard)。

  </Step>
  <Step title="驗證 Gateway 是否正在執行">
    ```bash
    openclaw gateway status
    ```

    您應該會看到 Gateway 正在監聽連接埠 18789。

  </Step>
  <Step title="開啟儀表板">
    ```bash
    openclaw dashboard
    ```

    這會在您的瀏覽器中開啟控制 UI。如果載入成功，表示一切正常運作。

  </Step>
  <Step title="傳送您的第一則訊息">
    在 Control UI 聊天中輸入訊息，您應該會收到 AI 的回覆。

    想改用手機聊天嗎？設定最快的管道是
    [Telegram](/en/channels/telegram) （只需要一個 bot token）。請參閱 [管道](/en/channels)
    以了解所有選項。

  </Step>
</Steps>

## 接下來做什麼

<Columns>
  <Card title="連結管道" href="/en/channels" icon="message-square">
    WhatsApp、Telegram、Discord、iMessage 等。
  </Card>
  <Card title="配對與安全性" href="/en/channels/pairing" icon="shield">
    控制誰可以傳送訊息給您的代理程式。
  </Card>
  <Card title="設定 Gateway" href="/en/gateway/configuration" icon="settings">
    模型、工具、沙盒與進階設定。
  </Card>
  <Card title="瀏覽工具" href="/en/tools" icon="wrench">
    瀏覽器、執行、網路搜尋、技能與外掛程式。
  </Card>
</Columns>

<Accordion title="進階：環境變數">
  如果您以服務帳戶身分執行 OpenClaw 或想要自訂路徑：

- `OPENCLAW_HOME` — 內部路徑解析的起始目錄
- `OPENCLAW_STATE_DIR` — 覆寫狀態目錄
- `OPENCLAW_CONFIG_PATH` — 覆寫設定檔路徑

完整參考：[環境變數](/en/help/environment)。

</Accordion>
