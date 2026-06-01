---
title: "Agent runtime architecture"
summary: "How OpenClaw runs the built-in agent runtime, providers, sessions, tools, and extensions."
---

OpenClaw 直接擁有內建的 Agent 執行時期。執行時期程式碼位於 `src/agents/`，模型/提供者輔助程式位於 `src/llm/`，而面向外掛的合約則透過 `openclaw/plugin-sdk/*` barrels 公開。

## Runtime Layout

- `src/agents/embedded-agent-runner/`：內建 Agent 嘗試迴圈、提供者串流適配器、壓縮、模型選取和會話連線。
- `src/agents/sessions/`：會話持久性、擴充功能載入、資源探索、技能、提示、主題和 TUI 支援的工具渲染器。
- `packages/agent-core/`：可重複使用的 Agent 核心、低層級束線類型、訊息、壓縮輔助程式、提示範本和工具/會話合約。
- `src/agents/runtime/`：`@openclaw/agent-core` 的 OpenClaw 外觀，加上本機代理公用程式。
- `src/agents/agent-tools*.ts`：OpenClaw 擁有的工具定義、結構描述、原則、前/後掛勾適配器以及主機編輯支援。
- `src/agents/agent-hooks/`：內建執行時期掛勾，例如壓縮防護機制和內容修剪。
- `src/llm/`：模型/提供者註冊表、傳輸輔助程式和提供者特定的串流實作。

## Boundaries

核心程式碼透過 OpenClaw 模組和 SDK barrels 呼叫內建執行時期，而非透過舊的外部 Agent 套件。外掛使用記錄於文件的 `openclaw/plugin-sdk/*` 進入點，且不匯入 `src/**` 內部。

`@earendil-works/pi-tui` 保持為第三方 TUI 相依性。它被本機 TUI 和會話渲染器用作終端元件工具組；將其內部化將是另一個獨立的 vendoring 工作。

## Manifests

資源套件在套件元資料中宣告 OpenClaw 資源：

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

套件管理員也會探索慣例的 `extensions/`、`skills/`、`prompts/` 和 `themes/` 目錄。

## Runtime Selection

預設的內建 runtime id 是 `openclaw`。Plugin harness 可以註冊額外的 runtime id。`auto` 會在存在支援的 plugin harness 時選擇它，否則使用內建的 OpenClaw runtime。

## 相關

- [OpenClaw agent runtime workflow](/zh-Hant/openclaw-agent-runtime)
- [Agent runtimes](/zh-Hant/concepts/agent-runtimes)
