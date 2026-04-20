---
summary: "透過外部 openclaw-weixin 外掛程式設定 WeChat 頻道"
read_when:
  - You want to connect OpenClaw to WeChat or Weixin
  - You are installing or troubleshooting the openclaw-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

# WeChat

OpenClaw 透過騰訊的外部
`@tencent-weixin/openclaw-weixin` 頻道外掛程式連接到 WeChat。

狀態：外部外掛程式。支援直接聊天與媒體。目前的外掛程式功能元資料未公告群組聊天。

## 命名

- **WeChat** 是這些文件中使用者看到的名稱。
- **Weixin** 是騰訊套件與外掛程式 ID 使用的名稱。
- `openclaw-weixin` 是 OpenClaw 頻道 ID。
- `@tencent-weixin/openclaw-weixin` 是 npm 套件。

在 CLI 指令與設定路徑中使用 `openclaw-weixin`。

## 運作方式

WeChat 程式碼並未存放於 OpenClaw 核心儲存庫中。OpenClaw 提供通用頻道外掛程式合約，而外部外掛程式則提供
WeChat 特有的執行環境：

1. `openclaw plugins install` 安裝 `@tencent-weixin/openclaw-weixin`。
2. Gateway 會探索外掛程式清單並載入外掛程式進入點。
3. 外掛程式註冊頻道 ID `openclaw-weixin`。
4. `openclaw channels login --channel openclaw-weixin` 啟動 QR 登入。
5. 外掛程式會將帳號憑證儲存在 OpenClaw 狀態目錄下。
6. 當 Gateway 啟動時，外掛程式會為每個
   已設定的帳號啟動其 Weixin 監控器。
7. 傳入的 WeChat 訊息會透過頻道合約進行正規化，路由至
   選定的 OpenClaw 代理程式，並透過外掛程式傳出路徑傳回。

這種區分至關重要：OpenClaw 核心應保持與頻道無關。WeChat 登入、
騰訊 iLink API 呼叫、媒體上傳/下載、內容權杖與帳號
監控皆由外部外掛程式負責。

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

使用手機上的 WeChat 掃描 QR 碼並確認登入。掃描成功後，外掛程式會將
帳號權杖儲存在本機。

若要新增另一個 WeChat 帳號，請再次執行相同的登入指令。對於多個
帳號，請依帳號、頻道與發送者隔離直接訊息階段：

```bash
openclaw config set session.dmScope per-account-channel-peer
```

## 存取控制

直接訊息使用適用於頻道
外掛程式的標準 OpenClaw 配對與允許清單模型。

批准新發送者：

```bash
openclaw pairing list openclaw-weixin
openclaw pairing approve openclaw-weixin <CODE>
```

有關完整的存取控制模型，請參閱[配對](/zh-Hant/channels/pairing)。

## 相容性

外掛程式會在啟動時檢查主機 OpenClaw 版本。

| 外掛程式版本線 | OpenClaw 版本           | npm 標籤 |
| -------------- | ----------------------- | -------- |
| `2.x`          | `>=2026.3.22`           | `latest` |
| `1.x`          | `>=2026.1.0 <2026.3.22` | `legacy` |

如果外掛程式回報您的 OpenClaw 版本過舊，請更新 OpenClaw 或安裝舊版外掛程式版本線：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

## Sidecar 程序

WeChat 外掛程式可以在監控騰訊 iLink API 的同時，在 Gateway 旁邊執行輔助工作。在問題 #68451 中，該輔助路徑暴露了 OpenClaw 通用過期 Gateway 清理中的一個錯誤：子程序可能會嘗試清理父 Gateway 程序，導致在 systemd 等程序管理員下出現重啟迴圈。

目前的 OpenClaw 啟動清理會排除目前程序及其祖先，因此通道輔助程式不得終止啟動它的 Gateway。此修復是通用的；它不是核心中特定於 WeChat 的路徑。

## 疑難排解

檢查安裝和狀態：

```bash
openclaw plugins list
openclaw channels status --probe
openclaw --version
```

如果通道顯示為已安裝但無法連接，請確認外掛程式已啟用並重新啟動：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
openclaw gateway restart
```

如果啟用 WeChat 後 Gateway 反覆重啟，請更新 OpenClaw 和外掛程式：

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

- 通道概覽：[聊天通道](/zh-Hant/channels)
- 配對：[配對](/zh-Hant/channels/pairing)
- 通道路由：[通道路由](/zh-Hant/channels/channel-routing)
- 外掛程式架構：[外掛程式架構](/zh-Hant/plugins/architecture)
- 通道外掛程式 SDK：[通道外掛程式 SDK](/zh-Hant/plugins/sdk-channel-plugins)
- 外部套件：[@tencent-weixin/openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin)
