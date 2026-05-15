---
summary: "`openclaw voicecall`（voice-call 外掛程式指令介面）的 CLI 參考資料"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛程式提供的指令。只有在安裝並啟用 voice-call 外掛程式後才會顯示。

當 Gateway 正在執行時，操作指令（`call`、`start`、
`continue`、`speak`、`dtmf`、`end` 和 `status`）會傳送至該 Gateway 的
voice-call runtime。如果無法連接到任何 Gateway，它們會退而求其次使用獨立
的 CLI runtime。

主要文件：

- Voice-call 外掛程式：[Voice Call](/zh-Hant/plugins/voice-call)

## 常用指令

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` 預設會列印人類可讀的就緒檢查結果。請使用 `--json` 供
腳本使用：

```bash
openclaw voicecall setup --json
```

`status` 預設會以 JSON 格式列印通話中。傳遞 `--call-id <id>` 以檢查
單一通話。

對於外部供應商（`twilio`、`telnyx`、`plivo`），設定必須解析來自 `publicUrl`、
通道 或 Tailscale exposure 的公開 webhook URL。因為電信業者無法連線到回送/私有服務，所以會拒絕回退。

`smoke` 會執行相同的就緒檢查。除非同時存在 `--to` 和 `--yes`，否則它不會
撥打真實電話：

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## 公開 Webhook (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全性提示：僅將 webhook 端點公開給您信任的網路。如果可能，請優先選擇 Tailscale Serve 而非 Funnel。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Voice call 外掛程式](/zh-Hant/plugins/voice-call)
