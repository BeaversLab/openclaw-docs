---
summary: "瀏覽器自動化 + X/Twitter 發文的手動登入"
read_when:
  - 您需要登入網站以進行瀏覽器自動化
  - 您想將更新發布到 X/Twitter
title: "瀏覽器登入"
---

# 瀏覽器登入 + X/Twitter 發文

## 手動登入（推薦）

當網站需要登入時，請在**主機**瀏覽器設定檔（openclaw 瀏覽器）中**手動登入**。

請**切勿**向模型提供您的憑證。自動登入通常會觸發反機器人防禦並可能鎖定帳戶。

回到主要瀏覽器文件：[Browser](/zh-Hant/tools/browser)。

## 使用哪個 Chrome 設定檔？

OpenClaw 控制一個**專屬的 Chrome 設定檔**（名為 `openclaw`，介面帶有橙色調）。這與您日常使用的瀏覽器設定檔是分開的。

對於代理程式瀏覽器工具呼叫：

- 預設選擇：代理程式應使用其隔離的 `openclaw` 瀏覽器。
- 僅當現有的已登入工作階段很重要，且使用者在電腦前可點擊/批准任何附加提示時，才使用 `profile="user"`。
- 如果您有多個使用者瀏覽器設定檔，請明確指定設定檔，而不要進行猜測。

存取它的兩種簡單方式：

1. **要求代理程式開啟瀏覽器**，然後自行登入。
2. **透過 CLI 開啟**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果您有多個設定檔，請傳遞 `--browser-profile <name>`（預設為 `openclaw`）。

## X/Twitter：推薦流程

- **閱讀/搜尋/串回：** 使用**主機**瀏覽器（手動登入）。
- **發布更新：** 使用**主機**瀏覽器（手動登入）。

## 沙盒 + 主機瀏覽器存取

沙盒化的瀏覽器工作階段**更有可能**觸發機器人偵測。對於 X/Twitter（和其他嚴格的網站），請優先使用**主機**瀏覽器。

如果代理程式處於沙盒中，瀏覽器工具預設會使用沙盒。若要允許主機控制：

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

然後以主機瀏覽器為目標：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或者針對發布更新的代理程式停用沙盒。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
