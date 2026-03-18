---
summary: "安裝 OpenClaw 並在幾分鐘內執行您的第一次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "快速入門"
---

# 快速入門

目標：從零開始，以最少的設定進行第一次可運作的聊天。

<Info>
  最快聊天方式：開啟控制 UI (無須設定通道)。執行 `openclaw dashboard` 並在 瀏覽器中聊天，或在
  <Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">
    gateway host
  </Tooltip>
  上開啟 `http://127.0.0.1:18789/`。 文件：[Dashboard](/zh-Hant/web/dashboard) 和 [Control
  UI](/zh-Hant/web/control-ui)。
</Info>

## 先決條件

- 建議使用 Node 24 (Node 22 LTS，目前為 `22.16+`，仍為相容性提供支援)

<Tip>如果不確定，請使用 `node --version` 檢查您的 Node 版本。</Tip>

## 快速設定 (CLI)

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

    入門引導會設定驗證、閘道設定和選用通道。
    詳情請參閱 [入門引導 (CLI)](/zh-Hant/start/wizard)。

  </Step>
  <Step title="檢查閘道">
    如果您安裝了服務，它應該已經在執行中：

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="開啟控制 UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>如果控制 UI 載入成功，表示您的閘道已準備就緒。</Check>

## 選用檢查和額外功能

<AccordionGroup>
  <Accordion title="在前台執行 Gateway">
    適用於快速測試或疑難排解。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="傳送測試訊息">
    需要一個已設定的頻道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 實用的環境變數

如果您將 OpenClaw 作為服務帳戶執行，或者想要自訂設定/狀態位置：

- `OPENCLAW_HOME` 設定用於內部路徑解析的家目錄。
- `OPENCLAW_STATE_DIR` 覆寫狀態目錄。
- `OPENCLAW_CONFIG_PATH` 覆寫設定檔路徑。

完整的環境變數參考：[Environment vars](/zh-Hant/help/environment)。

## 深入瞭解

<Columns>
  <Card title="Onboarding (CLI)" href="/zh-Hant/start/wizard">
    完整的 CLI 上線參考和進階選項。
  </Card>
  <Card title="macOS app onboarding" href="/zh-Hant/start/onboarding">
    macOS 應用程式的初次執行流程。
  </Card>
</Columns>

## 您將會擁有

- 執行中的 Gateway
- 已設定的驗證 (Auth)
- Control UI 存取權或已連線的頻道

## 接下來

- DM 安全性和核准：[Pairing](/zh-Hant/channels/pairing)
- 連接更多頻道：[Channels](/zh-Hant/channels)
- 進階工作流程和從原始碼：[Setup](/zh-Hant/start/setup)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
