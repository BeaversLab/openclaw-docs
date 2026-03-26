---
summary: "當您需要隔離或 iMessage 時，在沙盒化的 macOS VM（本機或託管）中執行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虛擬機"
---

# 在 macOS 虛擬機上執行 OpenClaw（沙盒化）

## 建議預設值（大多數使用者）

- 使用**小型 Linux VPS** 作為持續運作的 Gateway 且低成本。請參閱 [VPS 託管](/zh-Hant/vps)。
- 如果您想要完全控制以及用於瀏覽器自動化的**住宅 IP**，請使用**專屬硬體**（Mac mini 或 Linux 主機）。許多網站會封鎖資料中心 IP，因此本機瀏覽通常效果更好。
- **混合式：** 將 Gateway 保留在廉價 VPS 上，並在需要瀏覽器/UI 自動化時將您的 Mac 作為**節點**連接。請參閱 [節點](/zh-Hant/nodes) 和 [Gateway 遠端](/zh-Hant/gateway/remote)。

當您特別需要僅限 macOS 的功能（iMessage/BlueBubbles）或希望與您日常使用的 Mac 嚴格隔離時，請使用 macOS VM。

## macOS VM 選項

### 在您的 Apple Silicon Mac 上建立本地 VM (Lume)

使用 [Lume](https://cua.ai/docs/lume) 在您現有的 Apple Silicon Mac 上，於已沙盒化的 macOS VM 中執行 OpenClaw。

這讓您可以獲得：

- 完全隔離的 macOS 環境（您的主機保持整潔）
- 透過 BlueBubbles 支援 iMessage（在 Linux/Windows 上無法實現）
- 透過複製 VM 即可立即重置
- 無需額外的硬體或雲端成本

### 託管 Mac 供應商（雲端）

如果您希望在雲端使用 macOS，託管 Mac 供應商也是可行的選擇：

- [MacStadium](https://www.macstadium.com/) (託管 Mac)
- 其他託管 Mac 供應商也可運作；請遵循其 VM + SSH 文件

一旦您擁有 macOS VM 的 SSH 存取權限，請繼續進行下方的步驟 6。

---

## 快速路徑 (Lume，進階使用者)

1. 安裝 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成設定助理，啟用「遠端登入」（SSH）
4. `lume run openclaw --no-display`
5. 使用 SSH 登入，安裝 OpenClaw，設定頻道
6. 完成

---

## 您需要的項目（Lume）

- Apple Silicon Mac（M1/M2/M3/M4）
- 主機需安裝 macOS Sequoia 或更新版本
- 每個 VM 約需 60 GB 的可用磁碟空間
- 約 20 分鐘

---

## 1) 安裝 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在您的 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

驗證：

```bash
lume --version
```

文件：[Lume 安裝](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 建立 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

這會下載 macOS 並建立 VM。VNC 視窗會自動開啟。

注意：下載時間可能會根據您的連線速度而有所不同。

---

## 3) 完成設定助理

在 VNC 視窗中：

1. 選取語言和地區
2. 跳過 Apple ID（如果您之後想要使用 iMessage 則登入）
3. 建立使用者帳號（請記住使用者名稱和密碼）
4. 跳過所有選用功能

設定完成後，啟用 SSH：

1. 開啟「系統設定」→「一般」→「共享」
2. 啟用「遠端登入」

---

## 4) 取得 VM IP 位址

```bash
lume get openclaw
```

尋找 IP 位址（通常是 `192.168.64.x`）。

---

## 5) SSH 進入 VM

```bash
ssh youruser@192.168.64.X
```

將 `youruser` 取代為您建立的帳號，並將 IP 取代為您的 VM IP。

---

## 6) 安裝 OpenClaw

在 VM 內部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

依照入場提示設定您的模型供應商（Anthropic、OpenAI 等）。

---

## 7) 設定頻道

編輯設定檔：

```bash
nano ~/.openclaw/openclaw.json
```

加入您的頻道：

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
  },
}
```

然後登入 WhatsApp（掃描 QR code）：

```bash
openclaw channels login
```

---

## 8) 以無介面模式執行 VM

停止 VM 並在無顯示模式下重新啟動：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 會在背景執行。OpenClaw 的 daemon 會讓閘道持續運作。

若要檢查狀態：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 額外功能：iMessage 整合

這是在 macOS 上執行的殺手級功能。使用 [BlueBubbles](https://bluebubbles.app) 將 iMessage 新增至 OpenClaw。

在 VM 內部：

1. 從 bluebubbles.app 下載 BlueBubbles
2. 使用您的 Apple ID 登入
3. 啟用 Web API 並設定密碼
4. 將 BlueBubbles webhooks 指向您的 gateway（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

加入到您的 OpenClaw 設定：

```json5
{
  channels: {
    bluebubbles: {
      serverUrl: "http://localhost:1234",
      password: "your-api-password",
      webhookPath: "/bluebubbles-webhook",
    },
  },
}
```

重新啟動 gateway。現在您的 agent 可以傳送和接收 iMessage。

完整設定詳情：[BlueBubbles channel](/zh-Hant/channels/bluebubbles)

---

## 儲存黃金映像

在進一步自訂之前，為您的乾淨狀態建立快照：

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

隨時重置：

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

---

## 全天候執行

透過以下方式保持 VM 執行：

- 讓您的 Mac 保持接電狀態
- 在系統設定 → 節能器 中停用休眠
- 如有需要，使用 `caffeinate`

若要實現真正的全天候運作，請考慮使用專用的 Mac mini 或小型 VPS。請參閱 [VPS hosting](/zh-Hant/vps)。

---

## 疑難排解

| 問題                 | 解決方案                                                         |
| -------------------- | ---------------------------------------------------------------- |
| 無法 SSH 連線至 VM   | 檢查 VM 的系統設定中是否已啟用「遠端登入」                       |
| 未顯示 VM IP         | 等待 VM 完全開機，再次執行 `lume get openclaw`                   |
| 找不到 Lume 指令     | 將 `~/.local/bin` 加入您的 PATH                                  |
| WhatsApp QR 無法掃描 | 執行 `openclaw channels login` 時，請確保您已登入 VM（而非主機） |

---

## 相關文件

- [VPS 託管](/zh-Hant/vps)
- [節點](/zh-Hant/nodes)
- [Gateway 遠端](/zh-Hant/gateway/remote)
- [BlueBubbles 頻道](/zh-Hant/channels/bluebubbles)
- [Lume 快速入門](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 參考](https://cua.ai/docs/lume/reference/cli-reference)
- [無人值守 VM 設定](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (進階)
- [Docker 沙箱](/zh-Hant/install/docker) (替代隔離方法)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
