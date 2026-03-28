---
summary: "在數分鐘內安裝 OpenClaw 並執行您的第一次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "開始使用"
---

# 開始使用

安裝 OpenClaw，執行入門引導，並與您的 AI 助手聊天 — 全部
大約 5 分鐘即可完成。結束時，您將擁有一個執行中的 Gateway、已配置的驗證
以及一個可運作的聊天工作階段。

## 您需要什麼

- **Node.js** — 建議使用 Node 24（也支援 Node 22.16+）
- **API 金鑰**，來自模型供應商（Anthropic、OpenAI、Google 等） — 入門引導會提示您輸入

<Tip>使用 `node --version` 檢查您的 Node 版本。 **Windows 使用者：** 原生 Windows 和 WSL2 均獲 支援。WSL2 更穩定，建議用於完整體驗。請參閱 [Windows](/zh-Hant/platforms/windows)。需要安裝 Node 嗎？請參閱 [Node 設定](/zh-Hant/install/node)。</Tip>

## 快速設定

<Steps>
  <Step title="安裝 OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```exec
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安裝腳本流程"
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
    其他安裝方法（Docker、Nix、npm）：[安裝](/zh-Hant/install)。
    </Note>

  </Step>
  <Step title="執行入門引導">
    ```exec
    openclaw onboard --install-daemon
    ```

    精靈會引導您完成選擇模型供應商、設定 API 金鑰

以及設定 Gateway 的過程。大約需要 2 分鐘。

    如需完整參考，請參閱 [入門引導 (CLI)](/zh-Hant/start/wizard)。

  </Step>
  <Step title="驗證 Gateway 正在執行">
    ```exec
    openclaw gateway status
    ```

    您應該會看到 Gateway 正在監聽連接埠 18789。

  </Step>
  <Step title="開啟儀表板">
    ```exec
    openclaw dashboard
    ```

    這會在您的瀏覽器中開啟控制 UI。如果它能載入，表示一切正常運作。

  </Step>
  <Step title="傳送您的第一則訊息">
    在控制 UI 聊天中輸入一則訊息，您應該會收到 AI 的回覆。

    想改用手機聊天嗎？設定最快的管道是
    [Telegram](/zh-Hant/channels/telegram)（只需要一個 bot token）。請參閱 [管道](/zh-Hant/channels)
    以了解所有選項。

  </Step>
</Steps>

## 接下來做什麼

<Columns>
  <Card title="連接管道" href="/zh-Hant/channels" icon="message-square">
    WhatsApp、Telegram、Discord、iMessage 等等。
  </Card>
  <Card title="配對與安全性" href="/zh-Hant/channels/pairing" icon="shield">
    控制誰可以傳送訊息給您的代理程式。
  </Card>
  <Card title="設定 Gateway" href="/zh-Hant/gateway/configuration" icon="settings">
    模型、工具、沙盒和進階設定。
  </Card>
  <Card title="瀏覽工具" href="/zh-Hant/tools" icon="wrench">
    瀏覽器、exec、網路搜尋、技能和外掛程式。
  </Card>
</Columns>

<Accordion title="進階：環境變數">
  如果您以服務帳戶身分執行 OpenClaw 或想要自訂路徑：

- `OPENCLAW_HOME` — 用於內部路徑解析的主目錄
- `OPENCLAW_STATE_DIR` — 覆寫狀態目錄
- `OPENCLAW_CONFIG_PATH` — 覆寫設定檔路徑

完整參考：[環境變數](/zh-Hant/help/environment)。

</Accordion>
