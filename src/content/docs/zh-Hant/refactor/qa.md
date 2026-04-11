# QA 重構

狀態：基礎遷移已完成。

## 目標

將 OpenClaw QA 從分割定義模型轉移到單一真實來源：

- 情境元數據
- 發送給模型的提示詞
- 設置與拆除
- 線束邏輯
- 斷言與成功標準
- 產物與報告提示

理想的終態是一個通用的 QA 線束，用於載入強大的情境定義檔案，而不是將大部分行為硬編碼在 TypeScript 中。

## 目前狀態

主要的真實來源現在位於 `qa/scenarios/index.md`，加上 `qa/scenarios/*.md` 下每個情境的一個檔案。

已實作：

- `qa/scenarios/index.md`
  - 標準 QA 套件元數據
  - 操作員身分
  - 啟動任務
- `qa/scenarios/*.md`
  - 每個情境一個 markdown 檔案
  - 情境元數據
  - 處理程序綁定
  - 情境特定的執行配置
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 套件解析器 + zod 驗證
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 從 markdown 套件渲染計畫
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - 種子生成的相容性檔案加上 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 透過 markdown 定義的處理程序綁定選擇可執行的情境
- QA 匯流排協定 + UI
  - 用於圖片/視訊/音訊/檔案渲染的通用內嵌附件

剩餘的分割層面：

- `extensions/qa-lab/src/suite.ts`
  - 仍擁有大部分可執行的自訂處理程序邏輯
- `extensions/qa-lab/src/report.ts`
  - 仍從執行時輸出推導報告結構

因此真實來源的分割已修復，但執行主要仍依賴處理程序支援，而非完全宣告式。

## 真實情境層面的樣貌

閱讀目前的套件顯示了幾種不同的情境類別。

### 簡單互動

- 頻道基準
- DM 基準
- 執行緒後續追蹤
- 模型切換
- 批准後續執行
- 反應/編輯/刪除

### 配置與執行時變異

- 配置修補技能停用
- 配置應用重啟喚醒
- 配置重啟能力切換
- 執行時清單漂移檢查

### 檔案系統與程式庫斷言

- source/docs 探索報告
- 建置 Lobster Invaders
- 生成的圖像產物查找

### 記憶體編排

- 記憶回憶
- 頻道上下文中的記憶工具
- 記憶失敗後備
- 會話記憶排名
- 執行緒記憶隔離
- 記憶夢境掃描

### 工具與外掛整合

- MCP 外掛工具呼叫
- 技能可見性
- 技能熱安裝
- 原生映像檔生成
- 映像檔往返
- 來自附件的映像檔理解

### 多輪與多參與者

- 子代理交接
- 子代理分發合成
- 重新啟動恢復樣式流程

這些分類很重要，因為它們推動了 DSL 需求。單純的提示詞加上預期文字的列表是不夠的。

## 方向

### 單一真實來源

使用 `qa/scenarios/index.md` 加上 `qa/scenarios/*.md` 作為撰寫的
真實來源。

該套件應保持：

- 在審查時易於人類閱讀
- 機器可解析
- 夠豐富以驅動：
  - 套件執行
  - QA 工作區引導
  - QA Lab UI 元資料
  - 文件/探索提示詞
  - 報告生成

### 首選撰寫格式

使用 Markdown 作為頂層格式，其中包含結構化的 YAML。

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
- prose sections
  - objective
  - notes
  - debugging hints
- fenced YAML blocks
  - setup
  - steps
  - assertions
  - cleanup

這提供了：

- 比巨大 JSON 更好的 PR 可讀性
- 比純 YAML 更豐富的語境
- 嚴格的解析與 zod 驗證

原始 JSON 僅作為中間生成的形式可接受。

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
- create a session, then reuse `sessionKey`
- generate an image, then attach the file on the next turn
- 產生一個喚醒標記字串，然後斷言它稍後出現

所需能力：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 針對路徑、工作階段金鑰、執行緒 ID、標記、工具輸出的類型參照

如果沒有變數支援，測試工具持續器將不斷將場景邏輯洩漏回 TypeScript。

## 什麼應保留為緊急出口

在第一階段，完全純粹的宣告式執行器是不切實際的。

某些場景本質上涉及大量編排：

- 記憶體夢境掃描
- 設定套用重新啟動喚醒
- 設定重新啟動功能切換
- 依時間戳記/路徑解析生成的影像產物
- 探索報告評估

這些目前應使用明確的自訂處理程式。

建議規則：

- 85-90% 宣告式
- 其餘困難部分使用明確的 `customHandler` 步驟
- 僅使用已命名且記錄的自訂處理程式
- 場景檔案中不使用匿名內嵌程式碼

這既能保持通用引擎的乾淨，同時又能允許進展。

## 架構變更

### 目前

場景 markdown 已經是以下內容的單一真實來源：

- 套件執行
- 工作區啟動檔案
- QA Lab UI 場景目錄
- 報表中繼資料
- 探索提示

產生的相容性：

- 種子工作區仍包含 `QA_KICKOFF_TASK.md`
- 種子工作區仍包含 `QA_SCENARIO_PLAN.md`
- 種子工作區現在也包含 `QA_SCENARIOS.md`

## 重構計畫

### 階段 1：載入器和綱要

完成。

- 已新增 `qa/scenarios/index.md`
- 將場景拆分為 `qa/scenarios/*.md`
- 為命名的 markdown YAML 套件內容新增解析器
- 使用 zod 驗證
- 將消費者切換到已解析的套件
- 移除了存放庫層級的 `qa/seed-scenarios.json` 和 `qa/QA_KICKOFF_TASK.md`

### 階段 2：通用引擎

- 將 `extensions/qa-lab/src/suite.ts` 拆分為：
  - 載入器
  - 引擎
  - 動作登錄
  - 斷言登錄
  - 自訂處理程式
- 將現有的輔助函式保留為引擎操作

交付成果：

- 引擎執行簡單的宣告式場景

從主要為提示 + 等待 + 斷言的場景開始：

- 執行緒後續追蹤
- 來自附件的影像理解
- 技能可見性和叫用
- 頻道基線

交付成果：

- 首批透過通用引擎發布的真正由 markdown 定義的場景

### Phase 4: migrate medium scenarios

- 圖像生成往返
- 通道上下文中的記憶工具
- 會話記憶排序
- 子代理移交
- 子代理分發合成

交付成果：

- 變數、製品、工具斷言、請求日誌斷言已驗證

### Phase 5: keep hard scenarios on custom handlers

- 記憶夢境清理
- 組態套用重啟喚醒
- 組態重啟功能切換
- 執行時庫存漂移

交付成果：

- 相同的編寫格式，但在需要的地方包含明確的自訂步驟區塊

### Phase 6: delete hardcoded scenario map

一旦套件覆蓋率足夠好：

- 從 `extensions/qa-lab/src/suite.ts` 中移除大多數特定於場景的 TypeScript 分支邏輯

## Fake Slack / Rich Media Support

目前的 QA 總線是以文字為優先的。

相關檔案：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

目前 QA 總線支援：

- 文字
- 反應
- 討論串

它尚未對內嵌媒體附件進行建模。

### 所需的傳輸契約

新增一個通用的 QA 總線附件模型：

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

不要構建僅限 Slack 的媒體模型。

取而代之：

- 一個通用的 QA 傳輸模型
- 在其之上構建多個渲染器
  - 目前的 QA Lab 聊天
  - 未來的假 Slack Web
  - 任何其他假傳輸檢視

這可以避免重複邏輯，並讓媒體場景保持傳輸不可知。

### 所需的 UI 工作

更新 QA UI 以渲染：

- 內嵌圖像預覽
- 內嵌音訊播放器
- 內嵌影片播放器
- 檔案附件標籤

目前的 UI 已經可以渲染討論串和反應，因此附件渲染應該疊加到相同的訊息卡片模型上。

### 媒體傳輸啟用的場景工作

一旦附件流經 QA 總線，我們就可以新增更豐富的假聊天場景：

- 在假 Slack 中的內嵌圖像回覆
- 音訊附件理解
- 影片附件理解
- 混合附件排序
- 保留媒體的討論串回覆

## 建議

下一個實作部分應該是：

1. 新增 markdown 場景載入器 + zod schema
2. 從 markdown 產生目前的目錄
3. 先遷移幾個簡單的場景
4. 新增通用 QA 匯流排附加支援
5. 在 QA UI 中呈現內嵌圖片
6. 然後擴充到音訊和視訊

這是證明這兩個目標的最小路徑：

- 通用 markdown 定義的 QA
- 更豐富的模擬傳訊介面

## 未決問題

- 場景檔案是否應允許內嵌帶有變數插值的 markdown 提示模板
- 設定/清理 應該是命名區段還是僅作為排序的動作列表
- 構件參照在 Schema 中應為強型別還是基於字串
- 自訂處理程式應置於同一個註冊表中還是各介面的獨立註冊表
- 遷移期間產生的 JSON 相容性檔案是否應保持簽入狀態
