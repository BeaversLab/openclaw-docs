---
summary: "透過外部 openclaw-weixin 外掛程式設定 WeChat 頻道"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

OpenClaw 通過騰訊的外部 `@tencent-weixin/openclaw-weixin` 頻道外掛程式連接到微信。

狀態：外部外掛程式。支援直接聊天和媒體。目前的插件功能元數據未宣佈支援群聊。

## 命名

- **WeChat** 是這些文件中面向用戶的名稱。
- **Weixin** 是騰訊套件和外掛程式 ID 使用的名稱。
- `openclaw-weixin` 是 OpenClaw 頻道 ID。
- `@tencent-weixin/openclaw-weixin` 是 npm 套件。

在 CLI 指令和設定路徑中使用 `openclaw-weixin`。

## 運作原理

微信程式碼並不駐留在 OpenClaw 核心儲存庫中。OpenClaw 提供通用的頻道外掛程式合約，而外部外掛程式則提供微信特定的運行時環境：

1. `openclaw plugins install` 安裝 `@tencent-weixin/openclaw-weixin`。
2. Gateway 會發現外掛程式清單並載入外掛程式進入點。
3. 該外掛程式註冊頻道 ID `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 啟動 QR 登入。
5. 該外掛程式會將帳號憑證儲存在 OpenClaw 狀態目錄下。
6. 當 Gateway 啟動時，該外掛程式會為每個設定的帳號啟動其 Weixin 監視器。
7. 傳入的微信訊息會透過頻道合約進行正規化，路由到選定的 OpenClaw 代理程式，然後透過外掛程式傳出路徑發回。

這種分離很重要：OpenClaw 核心應保持與頻道無關。微信登入、騰訊 iLink API 呼叫、媒體上傳/下載、上下文權杖和帳號監控都由外部外掛程式負責。

## 安裝

快速安裝：

```bash
npx -y @tencent-weixin/openclaw-weixin-cli install
```

手動安裝：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

安裝後重新啟動 Gateway：

```bash
openclaw gateway restart
```

## 登入

在執行 Gateway 的同一台機器上執行 QR 登入：

```bash
openclaw channels login --channel openclaw-weixin
```

使用手機上的微信掃描 QR 碼並確認登入。掃描成功後，外掛程式會在本機儲存帳號權杖。

若要新增另一個微信帳號，請再次執行相同的登入指令。對於多個帳號，請依帳號、頻道和傳送者區隔直接訊息工作階段：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## 存取控制

直接訊息使用標準的 OpenClaw 配對和允許清單模型用於頻道外掛程式。

核准新傳送者：

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

如需完整的存取控制模型，請參閱[配對](/zh-Hant/channels/pairing)。

## 相容性

該外掛程式會在啟動時檢查主機 OpenClaw 版本。

| 外掛程式版本 | OpenClaw 版本           | npm 標籤 |
| ------------ | ----------------------- | -------- |
| `2.x`        | `>=2026.3.22`           | `latest` |
| `1.x`        | `>=2026.1.0 <2026.3.22` | `legacy` |

如果外掛程式回報您的 OpenClaw 版本過舊，請更新
OpenClaw 或安裝舊版外掛程式系列：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Sidecar 程序

當監控 Tencent iLink API 時，WeChat 外掛程式可以在 Gateway 旁邊執行輔助工作。在 issue #68451 中，該輔助路徑暴露了 OpenClaw
通用過期 Gateway 清理中的一個錯誤：子程序可能會嘗試清理父
Gateway 程序，從而導致在 systemd 等程序管理器下出現重啟迴圈。

目前的 OpenClaw 啟動清理排除了目前程序及其祖先程序，
因此通道輔助程式不得終止啟動它的 Gateway。此修復是
通用的；它不是核心中特定於 WeChat 的路徑。

## 疑難排解

檢查安裝和狀態：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果通道顯示為已安裝但未連接，請確認外掛程式已
啟用並重新啟動：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

如果在啟用 WeChat 後 Gateway 反復重新啟動，請同時更新 OpenClaw 和
外掛程式：

```bash
npm view @tencent-weixin/openclaw-weixin version
openclaw plugins install "@tencent-weixin/openclaw-weixin" --force
openclaw gateway restart
```

暫時停用：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled false
openclaw gateway restart
```

## 相關文件

- 通道概述：[聊天通道](/zh-Hant/channels)
- 配對：[配對](/zh-Hant/channels/pairing)
- 通道路由：[通道路由](/zh-Hant/channels/channel-routing)
- 外掛程式架構：[外掛程式架構](/zh-Hant/plugins/architecture)
- 通道外掛程式 SDK：[通道外掛程式 SDK](/zh-Hant/plugins/sdk-channel-plugins)
- 外部套件：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
