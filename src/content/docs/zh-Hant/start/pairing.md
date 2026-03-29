---
summary: "配對概覽：批准誰可以與您 DM 以及哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

# 配對

「配對」是 OpenClaw 的明確**擁有者批准**步驟。
它在兩個地方使用：

1. **DM 配對**（誰被允許與機器人對話）
2. **節點配對**（哪些設備/節點被允許加入閘道網路）

安全性背景：[安全性](/en/gateway/security)

## 1) DM 配對（入站聊天存取權）

當頻道設定為 DM 原則 `pairing` 時，未知傳送者會收到一個簡短代碼，且其訊息在您批准之前**不會被處理**。

預設 DM 原則記載於：[安全性](/en/gateway/security)

配對代碼：

- 8 個字元，大寫，無易混淆字元 (`0O1I`)。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每個傳送者大約每小時一次）。
- 待處理的 DM 配對請求預設上限為每個頻道 **3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准傳送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的允許清單儲存：`<channel>-allowFrom.json`

請將這些視為敏感資料（它們控制對您助理的存取權）。

## 2) 節點設備配對（iOS/Android/macOS/headless 節點）

節點以 `role: node` 作為**設備**連線到閘道。閘道會建立一個必須批准的設備配對請求。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 狀態儲存位置

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短暫儲存；待處理請求會過期）
- `paired.json`（已配對設備 + 權杖）

### 備註

- 舊版 `node.pair.*` API (CLI: `openclaw nodes pending/approve`) 是一個
  獨立的閘道擁有的配對儲存。WS 節點仍需要設備配對。

## 相關文件

- Security model + prompt injection: [Security](/en/gateway/security)
- Updating safely (run doctor): [Updating](/en/install/updating)
- Channel configs:
  - Telegram: [Telegram](/en/channels/telegram)
  - WhatsApp: [WhatsApp](/en/channels/whatsapp)
  - Signal: [Signal](/en/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/en/channels/bluebubbles)
  - iMessage (legacy): [iMessage](/en/channels/imessage)
  - Discord: [Discord](/en/channels/discord)
  - Slack: [Slack](/en/channels/slack)
