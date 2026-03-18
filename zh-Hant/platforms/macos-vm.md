---
summary: "當您需要隔離或 iMessage 時，在沙盒化的 macOS VM（本機或託管）中執行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虛擬機"
---

# OpenClaw on macOS VMs (沙盒化)

## 推薦預設（適合大多數使用者）

- 使用**小型 Linux VPS** 作為持續運作的 Gateway 且成本低廉。請參閱 [VPS hosting](/zh-Hant/vps)。
- 使用**專屬硬體**（Mac mini 或 Linux 主機），如果您想要完全控制權以及用於瀏覽器自動化的**住宅 IP**。許多網站會封鎖資料中心 IP，因此本機瀏覽通常效果更好。
- **混合模式：**將 Gateway 保留在廉價的 VPS 上，並在需要瀏覽器/UI 自動化時將您的 Mac 作為**節點**連接。請參閱 [Nodes](/zh-Hant/nodes) 和 [Gateway remote](/zh-Hant/gateway/remote)。

當您特別需要僅限 macOS 的功能（iMessage/BlueBubbles）或想要與日常使用的 Mac 嚴格隔離時，請使用 macOS VM。

## macOS VM 選項

### 在您的 Apple Silicon Mac 上的本機 VM (Lume)

使用 [Lume](https://cua.ai/docs/lume) 在您現有的 Apple Silicon Mac 上於沙盒化的 macOS VM 中執行 OpenClaw。

這為您提供：

- 完全隔離的 macOS 環境（您的主機保持乾淨）
- 透過 BlueBubbles 支援 iMessage（在 Linux/Windows 上無法實現）
- 透過複製 VM 即可立即重設
- 無需額外的硬體或雲端成本

### 託管 Mac 提供商（雲端）

如果您想要雲端上的 macOS，託管 Mac 提供商也是可行的選擇：

- [MacStadium](https://www.macstadium.com/) (託管 Mac)
- 其他託管 Mac 供應商也可以使用；請遵循他們的 VM + SSH 文件

一旦您擁有 macOS VM 的 SSH 存取權限，請繼續進行下面的步驟 6。

---

## 快速路徑 (Lume, 進階使用者)

1. 安裝 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成設定助理，啟用遠端登入 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登入，安裝 OpenClaw，設定頻道
6. 完成

---

## 您需要的準備工作 (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- 主機上的 macOS Sequoia 或更新版本
- 每個 VM 約 60 GB 的可用磁碟空間
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

文件：[Lume Installation](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 建立 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

這會下載 macOS 並建立 VM。VNC 視窗會自動開啟。

注意：根據您的連線速度，下載可能需要一段時間。

---

## 3) 完成設定助理

在 VNC 視窗中：

1. 選取語言與地區
2. 略過 Apple ID（如果您之後需要使用 iMessage，請登入）
3. 建立使用者帳號（請記住使用者名稱與密碼）
4. 略過所有選用功能

設定完成後，啟用 SSH：

1. 開啟系統設定 → 一般 → 共享
2. 啟用「遠端登入」

---

## 4) 取得 VM 的 IP 位址

```bash
lume get openclaw
```

尋找 IP 位址（通常為 `192.168.64.x`）。

---

## 5) SSH 連線至 VM

```bash
ssh youruser@192.168.64.X
```

將 `youruser` 替換為您建立的帳號，並將 IP 替換為您 VM 的 IP。

---

## 6) 安裝 OpenClaw

在 VM 內：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

依照入場提示設定您的模型提供者（Anthropic、OpenAI 等）。

---

## 7) 設定頻道

編輯設定檔：

```bash
nano ~/.openclaw/openclaw.json
```

新增您的頻道：

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15551234567"]
    },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  }
}
```

接著登入 WhatsApp（掃描 QR Code）：

```bash
openclaw channels login
```

---

## 8) 以無介面模式執行 VM

停止 VM 並在無顯示狀態下重新啟動：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 將在背景執行。OpenClaw 的守護程序會保持閘道運作。

檢查狀態：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 加分功能：iMessage 整合

這是在 macOS 上執行的絕佳功能。使用 [BlueBubbles](https://bluebubbles.app) 將 iMessage 新增至 OpenClaw。

在 VM 內：

1. 從 bluebubbles.app 下載 BlueBubbles
2. 使用您的 Apple ID 登入
3. 啟用 Web API 並設定密碼
4. 將 BlueBubbles webhook 指向您的閘道（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

新增至您的 OpenClaw 設定：

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

重新啟動閘道。現在您的代理程式即可傳送與接收 iMessage。

完整設定詳情：[BlueBubbles channel](/zh-Hant/channels/bluebubbles)

---

## 儲存黃金映像

在進一步客製化之前，為您的乾淨狀態建立快照：

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

隨時重設：

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

---

## 全天候 24/7 執行

透過以下方式保持 VM 執行：

- 讓 Mac 保持接電
- 在系統設定 → 省電中關閉休眠
- 如有需要，使用 `caffeinate`

若要真正保持全天候運作，請考慮使用專用的 Mac mini 或小型 VPS。請參閱 [VPS hosting](/zh-Hant/vps)。

---

## 疑難排解

| 問題                      | 解決方案                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| 無法 SSH 連線至 VM        | 檢查 VM 的系統設定中是否已啟用「遠端登入」                       |
| 未顯示 VM IP              | 等待 VM 完全開機，然後再次執行 `lume get openclaw`               |
| 找不到 Lume 指令          | 將 `~/.local/bin` 新增至您的 PATH                                |
| 無法掃描 WhatsApp QR Code | 執行 `openclaw channels login` 時，請確保您已登入 VM（而非主機） |

---

## 相關文件

- [VPS hosting](/zh-Hant/vps)
- [節點](/zh-Hant/nodes)
- [Gateway remote](/zh-Hant/gateway/remote)
- [BlueBubbles 頻道](/zh-Hant/channels/bluebubbles)
- [Lume 快速開始](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 參考](https://cua.ai/docs/lume/reference/cli-reference)
- [無人值守 VM 設定](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (進階)
- [Docker 沙箱隔離](/zh-Hant/install/docker) (替代隔離方案)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
