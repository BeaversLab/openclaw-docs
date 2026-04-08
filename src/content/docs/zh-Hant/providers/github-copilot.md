---
summary: "使用裝置流程從 OpenClaw 登入 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

## 什麼是 GitHub Copilot？

GitHub Copilot 是 GitHub 的 AI 程式碼編寫助手。它能根據您的 GitHub 帳號和方案提供存取 Copilot 模組的權限。OpenClaw 可以透過兩種不同的方式將 Copilot 作為模型提供者使用。

## 在 OpenClaw 中使用 Copilot 的兩種方式

### 1) 內建 GitHub Copilot 提供者 (`github-copilot`)

使用原生的裝置登入流程取得 GitHub 權杖，然後在 OpenClaw 執行時將其交換為 Copilot API 權杖。這是**預設**且最簡單的方法，因為它不需要 VS Code。

### 2) Copilot Proxy 外掛程式 (`copilot-proxy`)

將 **Copilot Proxy** VS Code 擴充功能作為本機橋接器使用。OpenClaw 會與 Proxy 的 `/v1` 端點通訊，並使用您在那裡設定的模型清單。當您已在 VS Code 中執行 Copilot Proxy 或需要透過它進行路由時，請選擇此選項。您必須啟用此外掛程式並保持 VS Code 擴充功能正在執行。

使用 GitHub Copilot 作為模型提供者 (`github-copilot`)。登入指令會執行 GitHub 裝置流程，儲存驗證設定檔，並更新您的設定以使用該設定檔。

## CLI 設定

```bash
openclaw models auth login-github-copilot
```

系統會提示您造訪 URL 並輸入一次性代碼。在完成之前請保持終端機開啟。

### 選用旗標

```bash
openclaw models auth login-github-copilot --yes
```

若要同時在一步中套用提供者建議的預設模型，請改用通用驗證指令：

```bash
openclaw models auth login --provider github-copilot --method device --set-default
```

## 設定預設模型

```bash
openclaw models set github-copilot/gpt-4o
```

### 設定片段

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## 備註

- 需要互動式 TTY；請直接在終端機中執行。
- Copilot 模型可用性取決於您的方案；如果模型被拒絕，請嘗試另一個 ID（例如 `github-copilot/gpt-4.1`）。
- Claude 模型 ID 會自動使用 Anthropic Messages 傳輸；GPT、o 系列和 Gemini 模型則保留 OpenAI Responses 傳輸。
- 登入會將 GitHub 權杖儲存在驗證設定檔存放區中，並在 OpenClaw 執行時將其交換為 Copilot API 權杖。
