---
summary: "用於瀏覽器自動化的手動登入 + X/Twitter 發文"
read_when:
  - You need to log into sites for browser automation
  - You want to post updates to X/Twitter
title: "Browser login"
---

## 手動登入（建議）

當網站需要登入時，請在 **主機** 瀏覽器設定檔（openclaw 瀏覽器）中**手動登入**。

請**勿**將您的憑證提供給模型。自動登入經常會觸發反機器人防禦，並可能導致帳戶被鎖定。

回到主要瀏覽器文件：[瀏覽器](/zh-Hant/tools/browser)。

## 使用哪個 Chrome 設定檔？

OpenClaw 控制一個**專屬的 Chrome 設定檔**（名為 `openclaw`，介面呈橘色）。這與您日常使用的瀏覽器設定檔是分開的。

對於代理程式瀏覽器工具呼叫：

- 預設選擇：代理程式應使用其獨立的 `openclaw` 瀏覽器。
- 僅當現有的已登入工作階段很重要，且使用者在電腦前可點擊/核准任何附加提示時，才使用 `profile="user"`。
- 如果您有多個使用者瀏覽器設定檔，請明確指定設定檔，而不是讓系統猜測。

存取它的兩種簡單方式：

1. **要求代理程式開啟瀏覽器**，然後自行登入。
2. **透過 CLI 開啟**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果您有多個設定檔，請傳入 `--browser-profile <name>`（預設為 `openclaw`）。

## X/Twitter：建議流程

- **閱讀/搜尋/串動：** 使用 **主機** 瀏覽器（手動登入）。
- **發布更新：** 使用 **主機** 瀏覽器（手動登入）。

## 沙盒 + 主機瀏覽器存取

沙盒瀏覽器工作階段**更有可能**觸發機器人偵測。對於 X/Twitter（及其他嚴格的網站），建議使用 **主機** 瀏覽器。

如果代理程式處於沙盒中，瀏覽器工具預設為使用沙盒。若要允許主機控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然後指定主機瀏覽器：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或為發布更新的代理程式停用沙盒。

## 相關

- [瀏覽器](/zh-Hant/tools/browser)
- [瀏覽器 Linux 疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)
- [瀏覽器 WSL2 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
