---
summary: "code_execution -- 使用 xAI 執行沙箱化遠端 Python 分析"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "代碼執行"
---

`code_execution` 在 xAI 的 Responses API 上執行沙箱遠端 Python 分析。
這與本機的 [`exec`](/zh-Hant/tools/exec) 不同：

- `exec` 在您的機器或節點上執行 shell 指令
- `code_execution` 在 xAI 的遠端沙箱中執行 Python

使用 `code_execution` 進行：

- 計算
- 製表
- 快速統計
- 圖表風格分析
- 分析 `x_search` 或 `web_search` 返回的資料

當您需要本機檔案、您的 shell、您的 repo 或配對裝置時，請**勿**使用它。請使用 [`exec`](/zh-Hant/tools/exec)。

## 設定

您需要 xAI API 金鑰。以下任何一種均可：

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

範例：

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## 如何使用

自然提問並明確指出分析意圖：

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

該工具內部接受單一 `task` 參數，因此代理應在一個提示中發送完整的分析請求和任何內聯資料。

## 限制

- 這是遠端 xAI 執行，而非本機程序執行。
- 應將其視為暫時性分析，而非持久性筆記本。
- 不要假設可以存取本機檔案或您的工作區。
- 對於最新的 X 資料，請先使用 [`x_search`](/zh-Hant/tools/web#x_search)。

## 相關

- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)
- [apply_patch 工具](/zh-Hant/tools/apply-patch)
- [Web 工具](/zh-Hant/tools/web)
- [xAI](/zh-Hant/providers/xai)
