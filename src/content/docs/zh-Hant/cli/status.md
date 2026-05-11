---
summary: "CLI 參考資料 for `openclaw status` (diagnostics, probes, usage snapshots)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "Status"
---

# `openclaw status`

頻道 + 工作階段的診斷。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 執行即時探測（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- `--usage` 將標準化的供應商使用視窗列印為 `X% left`。
- Session status output separates `Execution:` from `Runtime:`. `Execution` is the sandbox path (`direct`, `docker/*`), while `Runtime` tells you whether the session is using `OpenClaw Pi Default`, `OpenAI Codex`, a CLI backend, or an ACP backend such as `codex (acp/acpx)`. See [Agent runtimes](/zh-Hant/concepts/agent-runtimes) for the provider/model/runtime distinction.
- MiniMax's raw `usage_percent` / `usagePercent` fields are remaining quota, so OpenClaw inverts them before display; count-based fields win when present. `model_remains` responses prefer the chat-model entry, derive the window label from timestamps when needed, and include the model name in the plan label.
- When the current session snapshot is sparse, `/status` can backfill token and cache counters from the most recent transcript usage log. Existing nonzero live values still win over transcript fallback values.
- Transcript fallback can also recover the active runtime model label when the live session entry is missing it. If that transcript model differs from the selected model, status resolves the context window against the recovered runtime model instead of the selected one.
- For prompt-size accounting, transcript fallback prefers the larger prompt-oriented total when session metadata is missing or smaller, so custom-provider sessions do not collapse to `0` token displays.
- Output includes per-agent session stores when multiple agents are configured.
- Overview includes Gateway + node host service install/runtime status when available.
- Overview includes update channel + git SHA (for source checkouts).
- Update info surfaces in the Overview; if an update is available, status prints a hint to run `openclaw update` (see [Updating](/zh-Hant/install/updating)).
- 唯讀狀態介面（`status`、`status --json`、`status --all`）會在可能時為其目標設定路徑解析受支援的 SecretRefs。
- 如果設定了受支援的通道 SecretRef，但在目前指令路徑中無法使用，狀態將保持唯讀並回報降級輸出，而不是當機。人工輸出會顯示諸如「configured token unavailable in this command path」的警告，而 JSON 輸出則包含 `secretDiagnostics`。
- 當指令本地的 SecretRef 解析成功時，狀態會優先使用解析的快照，並從最終輸出中清除暫時性的「secret unavailable」通道標記。
- `status --all` 包含一個 Secrets 概覽列和一個診斷區段，該區段總結了秘密診斷（為了易讀性而截斷），而不會停止報告產生。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Doctor](/zh-Hant/gateway/doctor)
