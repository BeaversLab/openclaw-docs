---
summary: "當您需要隔離或 iMessage 時，在沙盒化的 macOS VM（本機或託管）中執行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS VM"
---

# 在 macOS VM 上執行 OpenClaw（沙盒化）

## 推薦預設選項（適合大多數使用者）

- 使用**小型 Linux VPS**作為永遠在線的 Gateway 以降低成本。請參閱 [VPS 託管](/en/vps)。
- 使用**專屬硬體**（Mac mini 或 Linux 主機），如果您需要完全的控制以及用於瀏覽器自動化的**住宅 IP**。許多網站會阻擋資料中心 IP，因此本機瀏覽通常效果更好。
- **混合式：**將 Gateway 保留在便宜的 VPS 上，並在需要瀏覽器/UI 自動化時將您的 Mac 作為**節點**連接。請參閱 [節點](/en/nodes) 和 [Gateway 遠端](/en/gateway/remote)。

當您特別需要僅限 macOS 的功能（iMessage/BlueBubbles）或希望與您日常使用的 Mac 嚴格隔離時，請使用 macOS VM。

## macOS VM 選項

### 位於您 Apple Silicon Mac 上的本機 VM (Lume)

使用 [Lume](https://cua.ai/docs/lume) 在您現有的 Apple Silicon Mac 上的沙盒化 macOS VM 中執行 OpenClaw。

這為您提供：

- 完全隔離的 macOS 環境（您的主機保持乾淨）
- 透過 BlueBubbles 支援 iMessage（在 Linux/Windows 上無法實現）
- 透過複製 VM 立即重設
- 無需額外的硬體或雲端成本

### 託管 Mac 提供商（雲端）

如果您希望在雲端使用 macOS，託管 Mac 提供商也適用：

- [MacStadium](https://www.macstadium.com/)（託管 Mac）
- 其他託管 Mac 供應商也適用；請遵循其 VM + SSH 文件

一旦您擁有 macOS VM 的 SSH 存取權限，請繼續執行下面的步驟 6。

---

## 快速路徑 (Lume，適合進階使用者)

1. 安裝 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成設定助理，啟用遠端登入 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登入，安裝 OpenClaw，設定頻道
6. 完成

---

## 您需要的項目 (Lume)

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

文件：[Lume 安裝](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 建立 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

這會下載 macOS 並建立 VM。VNC 視窗會自動開啟。

注意：下載可能需要一些時間，具體取決於您的連線速度。

---

## 3) 完成設定助理

在 VNC 視窗中：

1. 選取語言和地區
2. 跳過 Apple ID（如果您之後需要使用 iMessage，則登入）
3. 建立使用者帳號（記住使用者名稱和密碼）
4. 跳過所有選用功能

設定完成後，啟用 SSH：

1. 開啟系統設定 → 一般 → 共享
2. 啟用「遠端登入」

---

## 4) 取得 VM 的 IP 位址

```bash
lume get openclaw
```

尋找 IP 位址（通常是 `192.168.64.x`）。

---

## 5) SSH 進入 VM

```bash
ssh youruser@192.168.64.X
```

將 `youruser` 替換為您建立的帳號，並將 IP 替換為您 VM 的 IP。

---

## 6) 安裝 OpenClaw

在 VM 內部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

依照上架提示設定您的模型提供者（Anthropic、OpenAI 等）。

---

## 7) 設定頻道

編輯配置檔案：

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

然後登入 WhatsApp（掃描 QR 碼）：

```bash
openclaw channels login
```

---

## 8) 無介面執行 VM

停止 VM 並在不顯示畫面的情況下重新啟動：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 會在背景執行。OpenClaw 的守護程序會保持閘道執行。

檢查狀態：

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
4. 將 BlueBubbles webhooks 指向您的閘道（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

新增至您的 OpenClaw 配置：

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

重新啟動閘道。現在您的 Agent 可以傳送和接收 iMessages。

完整設定詳情：[BlueBubbles channel](/en/channels/bluebubbles)

---

## 儲存黃金映像

在進一步客製化之前，對您的乾淨狀態進行快照：

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

## 24/7 執行

透過以下方式讓 VM 保持執行：

- 讓您的 Mac 保持插電
- 在系統設定 → 省電中關閉睡眠
- 如有需要，使用 `caffeinate`

若要真正實現隨時運作，請考慮使用專用的 Mac mini 或小型 VPS。請參閱 [VPS hosting](/en/vps)。

---

## 疑難排解

| 問題                 | 解決方案                                                       |
| -------------------- | -------------------------------------------------------------- |
| 無法 SSH 進入 VM     | 檢查 VM 的系統設定中是否已啟用「遠端登入」                     |
| VM IP 未顯示         | 等待 VM 完全開機，再次執行 `lume get openclaw`                 |
| 找不到 Lume 指令     | 將 `~/.local/bin` 加入您的 PATH                                |
| WhatsApp QR 無法掃描 | 確保您在執行 `openclaw channels login` 時已登入 VM（而非主機） |

---

## 相關文件

- [VPS hosting](/en/vps)
- [節點](/en/nodes)
- [遠端閘道](/en/gateway/remote)
- [BlueBubbles 頻道](/en/channels/bluebubbles)
- [Lume 快速開始](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 參考](https://cua.ai/docs/lume/reference/cli-reference)
- [無人值守 VM 設定](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (進階)
- [Docker 沙箱隔離](/en/install/docker) (替代隔離方案)
