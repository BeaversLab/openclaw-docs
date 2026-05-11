---
summary: "場景目錄與測試架構整合的 QA 重構計畫"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "QA 重構"
---

狀態：基礎遷移已完成。

## 目標

將 OpenClaw QA 從分割定義模型轉移到單一真實來源：

- 場景元數據
- 發送給模型的提示詞
- 設置與拆除
- 測試線束邏輯
- 斷言與成功標準
- 產出成果與報告提示

期望的最終狀態是一個通用的 QA 測試線束，它加載強大的場景定義文件，而不是在 TypeScript 中硬編碼大多數行為。

## 當前狀態

現在主要的真實來源位於 `qa/scenarios/index.md`，以及在 `qa/scenarios/<theme>/*.md` 下每個場景一個文件。

已實作：

- `qa/scenarios/index.md`
  - 規範 QA 套件元數據
  - 操作員身分
  - 啟動任務
- `qa/scenarios/<theme>/*.md`
  - 每個場景一個 markdown 文件
  - 場景元數據
  - 處理程序綁定
  - 場景特定的執行配置
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 套件解析器 + zod 驗證
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 從 markdown 套件渲染計劃
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - 種子生成相容性文件加上 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 通過 markdown 定義的處理程序綁定選擇可執行場景
- QA bus 協定 + UI
  - 用於圖片/影片/音訊/文件渲染的通用內嵌附件

剩餘的分割介面：

- `extensions/qa-lab/src/suite.ts`
  - 仍然擁有大多數可執行的自訂處理程序邏輯
- `extensions/qa-lab/src/report.ts`
  - 仍然從執行時輸出衍生報告結構

因此，真實來源的分割已修復，但執行仍然主要由處理程序支持，而非完全聲明式。

## 真實場景介面長什麼樣子

閱讀當前的套件顯示了幾種不同的場景類別。

### 簡單互動

- 頻道基準
- DM 基準
- 執行緒後續
- 模型切換
- 批准後續處理
- 反應/編輯/刪除

### 配置與執行時變更

- 配置修補技能停用
- 配置應用重新啟動喚醒
- 配置重新啟動功能切換
- 執行時清單漂移檢查

### 檔案系統與 repo 斷言

- source/docs 探索報告
- 建置 Lobster Invaders
- 生成的圖像產出成果查找

### 記憶體編排

- 記憶體回憶
- 頻道上下文中的記憶體工具
- 記憶體失敗後備
- 會話記憶排名
- 執行緒記憶隔離
- 記憶夢境掃描

### 工具和外掛整合

- MCP 外掛工具呼叫
- 技能可見性
- 技能熱安裝
- 原生影像生成
- 影像往返
- 從附件理解影像

### 多輪與多執行者

- 子代理移交
- 子代理分發合成
- 重新啟動恢復樣式流程

這些分類很重要，因為它們驅動了 DSL 需求。一份單純的提示詞加上預期文字的清單是不夠的。

## 方向

### 單一真實來源

使用 `qa/scenarios/index.md` 加上 `qa/scenarios/<theme>/*.md` 作為編寫的
單一真實來源。

打包檔案應保持：

- 在審查時具備人類可讀性
- 機器可解析
- 足夠豐富以驅動：
  - 套件執行
  - QA 工作區啟動
  - QA Lab UI 元資料
  - 文件/探索提示詞
  - 報告生成

### 偏好的編寫格式

使用 Markdown 作為頂層格式，並在其中包含結構化的 YAML。

建議的結構：

- YAML 前置資料
  - id
  - title
  - surface
  - tags
  - docs refs
  - code refs
  - model/provider overrides
  - prerequisites
- 散文區塊
  - objective
  - notes
  - debugging hints
- 圍欄 YAML 區塊
  - setup
  - steps
  - assertions
  - cleanup

這能提供：

- 比巨大的 JSON 更好的 PR 可讀性
- 比純 YAML 更豐富的語境
- 嚴格的解析和 zod 驗證

原始 JSON 僅作為中間生成的形式是可以接受的。

## 提議的情境檔案結構

範例：

````md
---
id: image-generation-roundtrip
title: Image generation roundtrip
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# Objective

Verify generated media is reattached on the follow-up turn.

# Setup

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: session.create
  key: agent:qa:image-roundtrip
```

# Steps

```yaml scenario.steps
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Image generation check: generate a QA lighthouse image and summarize it in one short sentence.
- action: artifact.capture
  kind: generated-image
  promptSnippet: Image generation check
  saveAs: lighthouseImage
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Roundtrip image inspection check: describe the generated lighthouse attachment in one short sentence.
  attachments:
    - fromArtifact: lighthouseImage
```

# Expect

```yaml scenario.expect
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: Roundtrip image inspection check
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```
````

## Runner Capabilities The DSL Must Cover

Based on the current suite, the generic runner needs more than prompt execution.

### Environment and setup actions

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Agent turn actions

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### Config and runtime actions

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### File and artifact actions

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### Memory and cron actions

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP actions

- `mcp.callTool`

### Assertions

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## Variables and Artifact References

The DSL must support saved outputs and later references.

Examples from the current suite:

- create a thread, then reuse `threadId`
- 建立一個 session，然後重複使用 `sessionKey`
- 生成一張圖片，然後在下一輪附加該檔案
- 生成一個 wake marker 字串，然後斷言它稍後會出現

所需功能：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 針對路徑、session 金鑰、thread id、marker、工具輸出的型別參照

如果沒有變數支援，harness 將會持續將情境邏輯洩漏回 TypeScript 中。

## 什麼應保留作為緊急應變手段

在第 1 階段，完全純粹的宣告式執行器是不切實際的。

某些情境本質上涉及大量編排：

- memory dreaming sweep
- config apply restart wake-up
- config restart capability flip
- 透過時間戳記/路徑解析生成的圖片成品
- discovery-report evaluation

這些目前應該使用明確的自訂處理器。

建議規則：

- 85-90% 宣告式
- 針對困難的其餘部分使用明確的 `customHandler` 步驟
- 僅限已命名且有文件記錄的自訂處理器
- 情境檔案中不允許匿名行內程式碼

這既能保持通用引擎的乾淨，同時仍允許進展。

## 架構變更

### 目前

情境 markdown 已經是以下項目的真實來源：

- 套件執行
- 工作區引導檔案
- QA Lab UI 情境目錄
- 報表中繼資料
- discovery prompts

產生的相容性：

- 已植入的工作區仍然包含 `QA_KICKOFF_TASK.md`
- 已植入的工作區仍然包含 `QA_SCENARIO_PLAN.md`
- 已植入的工作區現在也包含 `QA_SCENARIOS.md`

## 重構計劃

### 第 1 階段：載入器與結構描述

完成。

- 新增了 `qa/scenarios/index.md`
- 將情境拆分為 `qa/scenarios/<theme>/*.md`
- 新增了命名 markdown YAML pack 內容的解析器
- 使用 zod 進行驗證
- 將消費者切換到已解析的 pack
- 移除了 repo 層級的 `qa/seed-scenarios.json` 和 `qa/QA_KICKOFF_TASK.md`

### 第 2 階段：通用引擎

- 將 `extensions/qa-lab/src/suite.ts` 拆分為：
  - 載入器
  - 引擎
  - 動作註冊表
  - 斷言註冊表
  - 自訂處理器
- 將現有的輔助函式保留為引擎操作

交付成果：

- 引擎執行簡單的宣告式情境

從主要包含 prompt + wait + assert 的情境開始：

- 執行緒後續追蹤
- 透過附件進行圖片理解
- 技能可見性和調用
- 通道基準

交付成果：

- 首批真正的透過通用引擎發送的 Markdown 定義場景

### 第 4 階段：遷移中等場景

- 圖像生成往返
- 通道上下文中的記憶工具
- 會話記憶排名
- 子代理交接
- 子代理分散式綜合

交付成果：

- 變數、產物、工具斷言、請求日誌斷言已驗證

### 第 5 階段：將困難場景保留在自訂處理程序上

- 記憶夢境掃描
- 配置應用重新啟動 喚醒
- 配置重新啟動能力翻轉
- 執行時清單漂移

交付成果：

- 相同的編寫格式，但在需要的地方包含明確的自訂步驟區塊

### 第 6 階段：刪除硬編碼場景映射

一旦套件覆蓋率足夠好：

- 從 `extensions/qa-lab/src/suite.ts` 中移除大多數特定場景的 TypeScript 分支

## 偽 Slack / 豐富媒體支援

目前的 QA 匯流排是以文字為先的。

相關檔案：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

目前 QA 匯流排支援：

- 文字
- 反應
- 串列

它尚未對內聯媒體附件進行建模。

### 所需的傳輸協定

新增一個通用的 QA 匯流排附件模型：

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
```

然後將 `attachments?: QaBusAttachment[]` 新增到：

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### 為何先從通用開始

不要建立僅限 Slack 的媒體模型。

相反地：

- 一個通用的 QA 傳輸模型
- 在其之上的多個渲染器
  - 目前的 QA Lab 聊天
  - 未來的偽 Slack Web
  - 任何其他偽傳輸視圖

這可以防止重複邏輯，並讓媒體場景保持傳輸不可知。

### 所需的 UI 工作

更新 QA UI 以渲染：

- 內聯圖像預覽
- 內聯音訊播放器
- 內聯視訊播放器
- 檔案附件晶片

目前的 UI 已經可以渲染串列和反應，因此附件渲染應該分層在相同的訊息卡片模型上。

### 由媒體傳輸啟用的場景工作

一旦附件在 QA 匯流排中流動，我們就可以新增更豐富的偽聊市場景：

- 偽 Slack 中的內聯圖像回覆
- 音訊附件理解
- 視訊附件理解
- 混合附件排序
- 保留媒體的串列回覆

## 建議

下一個實作區塊應該是：

1. 新增 markdown 場景載入器 + zod 架構
2. 從 markdown 生成目前的目錄
3. 先遷移幾個簡單的場景
4. 新增通用的 QA 總線附加支援
5. 在 QA UI 中渲染內嵌圖片
6. 然後擴展至音訊和影片

這是能驗證這兩個目標的最短路徑：

- 通用的 markdown 定義 QA
- 更豐富的模擬訊息介面

## 未解決的問題

- 場景檔案是否應允許帶有變數插值的內嵌 markdown 提示詞範本
- setup/cleanup 應該是具名區塊還是有序的動作列表
- artifact 參照應該在架構中使用強型別還是字串
- 自訂處理器應該放在同一個登錄檔中還是每個介面各自的登錄檔中
- 遷移期間產生的 JSON 相容性檔案是否應保持簽入狀態

## 相關

- [QA E2E automation](/zh-Hant/concepts/qa-e2e-automation)
