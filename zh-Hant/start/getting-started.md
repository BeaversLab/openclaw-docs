---
summary: "在幾分鐘內安裝 OpenClaw 並執行您的第一次聊天。"
read_when:
  - 首次從零開始設定
  - 您想要通往可運作聊天的最快路徑
title: "入門指南"
---

# 入門指南

目標：從零開始，以最少的設定完成第一次可運作的聊天。

<Info>
  最快聊天方式：開啟控制介面（無需設定頻道）。執行 `openclaw dashboard` 並在瀏覽器中聊天，或在
  <Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">
    閘道主機
  </Tooltip>
  上開啟 `http://127.0.0.1:18789/`。 文件：[儀表板](/zh-Hant/web/dashboard) 和
  [控制介面](/zh-Hant/web/control-ui)。
</Info>

## 先決條件

- 建議使用 Node 24（Node 22 LTS，目前為 `22.16+`，為了相容性仍支援）

<Tip>如果不確定，請使用 `node --version` 檢查您的 Node 版本。</Tip>

## 快速設定（CLI）

<Steps>
  <Step title="安裝 OpenClaw (建議)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安裝腳本程序"
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
    其他安裝方法和需求：[安裝](/zh-Hant/install)。
    </Note>

  </Step>

  <Step title="執行入門引導">
    ```bash
    openclaw onboard --install-daemon
    ```

    入門引導會配置身份驗證、網關設定和可選頻道。
    詳情請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。

  </Step>

  <Step title="Check the Gateway">
    如果您已安裝該服務，它應該已經在運行：

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="Open the Control UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>如果控制 UI 加載成功，表示您的閘道已準備就緒。</Check>

## 可選檢查與額外功能

<AccordionGroup>
  <Accordion title="Run the Gateway in the foreground">
    適用於快速測試或故障排除。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Send a test message">
    需要已配置的頻道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 實用的環境變數

如果您以服務帳戶運行 OpenClaw，或想要自訂設定/狀態位置：

- `OPENCLAW_HOME` 設定用於內部路徑解析的主目錄。
- `OPENCLAW_STATE_DIR` 覆寫狀態目錄。
- `OPENCLAW_CONFIG_PATH` 覆寫設定檔路徑。

完整的環境變數參考：[環境變數](/zh-Hant/help/environment)。

## 深入了解

<Columns>
  <Card title="CLI 入門指南" href="/zh-Hant/start/wizard">
    完整的 CLI 入門參考和高級選項。
  </Card>
  <Card title="macOS 應用程式入門" href="/zh-Hant/start/onboarding">
    macOS 應用程式的首次執行流程。
  </Card>
</Columns>

## 您將擁有

- 一個運行中的 Gateway
- 已配置的認證
- 控制 UI 存取權或已連接的頻道

## 後續步驟

- DM 安全性與核准：[配對](/zh-Hant/channels/pairing)
- 連接更多頻道：[Channels](/zh-Hant/channels)
- 進階工作流程與從原始碼安裝：[Setup](/zh-Hant/start/setup)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
