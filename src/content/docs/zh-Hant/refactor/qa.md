---
summary: "場景目錄與測試架構整合的 QA 重構計畫"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "QA 重構"
---

# QA 重構

狀態：基礎遷移已落地。

## 目標

將 OpenClaw QA 從分散定義模型轉移至單一真實來源：

- 場景元數據
- 發送至模型的提示詞
- 設定與拆解
- 測試架構邏輯
- 斷言與成功標準
- 產出物與報告提示

期望的最終狀態是一個通用的 QA 測試架構，它載入功能強大的場景定義檔案，而不是在 TypeScript 中硬編碼大多數行為。

## 目前狀態

主要的真實來源現在位於 `qa/scenarios/index.md`，外加 `qa/scenarios/<theme>/*.md` 下每個場景的一個檔案。

已實作：

- `qa/scenarios/index.md`
  - 正規的 QA 套件元數據
  - 操作員身分
  - 啟動任務
- `qa/scenarios/<theme>/*.md`
  - 每個場景一個 markdown 檔案
  - 場景元數據
  - 處理器綁定
  - 特定場景的執行設定
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 套件解析器 + zod 驗證
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 從 markdown 套件渲染計畫
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - seeds 生成的相容性檔案加上 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 透過 markdown 定義的處理器綁定選取可執行的場景
- QA bus 協定 + UI
  - 用於圖片/影片/音訊/檔案渲染的通用內嵌附件

剩餘的分散表面：

- `extensions/qa-lab/src/suite.ts`
  - 仍然擁有大多數可執行的自訂處理器邏輯
- `extensions/qa-lab/src/report.ts`
  - 仍然從執行時輸出推導報告結構

因此真實來源的分散已修復，但執行仍然主要依賴處理器，而非完全宣告式。

## 真實的場景表面長什麼樣子

閱讀當前的套件顯示出幾種不同的場景類別。

### 簡單互動

- 頻道基準
- DM 基準
- 執行緒後續
- 模型切換
- 批准執行
- 反應/編輯/刪除

### 設定與執行時變更

- 設定修補技能停用
- 設定套用重啟喚醒
- 設定重啟能力切換
- 執行時清單漂移檢查

### 檔案系統與 repo 斷言

- source/docs 探索報告
- 建構 Lobster Invaders
- 生成圖像工件查找

### 記憶體編排

- 記憶檢索
- 頻道上下文中的記憶工具
- 記憶失效回退
- 會話記憶排名
- 執行緒記憶隔離
- 記憶夢境清理

### 工具和外掛整合

- MCP 外掛工具呼叫
- 技能可見性
- 技能熱安裝
- 原生圖像生成
- 圖像來回傳遞
- 從附件理解圖像

### 多輪和多執行者

- 子代理交接
- 子代理分發合成
- 重啟恢復樣式流程

這些類別至關重要，因為它們驅動了 DSL 的需求。一個簡單的提示詞加預期文本列表是不夠的。

## 方向

### 單一事實來源

使用 `qa/scenarios/index.md` 加上 `qa/scenarios/<theme>/*.md` 作為編寫的
事實來源。

該套件應保持：

- 在審查中具有人類可讀性
- 機器可解析
- 足夠豐富以驅動：
  - 套件執行
  - QA 工作區引導
  - QA Lab UI 元資料
  - 文件/探索提示詞
  - 報告生成

### 首選編寫格式

使用 Markdown 作為頂層格式，其中包含結構化的 YAML。

建議的結構：

- YAML 前置元資料
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
- 圍欄 YAML 區塊
  - setup
  - steps
  - assertions
  - cleanup

這提供了：

- 比巨大的 JSON 更好的 PR 可讀性
- 比純 YAML 更豐富的上下文
- 嚴格的解析和 zod 驗證

原始 JSON 僅作為中間生成形式是可接受的。

## 建議的場景檔案結構

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

## DSL 必須涵蓋的執行器功能

根據目前的測試套件，通用執行器需要的功能不僅僅是提示詞執行。

### 環境與設定動作

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Agent 回合動作

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### 設定與執行時動作

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### 檔案與構件動作

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### 記憶體與 cron 動作

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP 動作

- `mcp.callTool`

### 斷言

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

## 變數與構件參考

DSL 必須支援儲存輸出以及後續參考。

目前套件中的範例：

- 建立一個執行緒，然後重複使用 `threadId`
- 建立一個對話，然後重複使用 `sessionKey`
- 生成一張圖片，然後在下一輪附加該檔案
- 生成一個喚醒標記字串，然後斷言它隨後出現

所需功能：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 用於路徑、對話金鑰、執行緒 ID、標記和工具輸出的型別參考

如果沒有變數支援，測試框架將不斷將場景邏輯洩漏回 TypeScript。

## 什麼應該保留作為逃逸機制

在第一階段，完全純粹的宣告式執行器是不現實的。

某些場景本質上涉及大量編排：

- 記憶體夢境掃描
- 組態套用重啟喚醒
- 組態重啟功能翻轉
- 透過時間戳記/路徑解析生成的圖片產出
- 探索報告評估

這些目前應該使用明確的自訂處理程序。

建議規則：

- 85-90% 宣告式
- 對於其餘困難部分，使用明確的 `customHandler` 步驟
- 僅使用具名且記載的自訂處理程序
- 場景檔案中不包含匿名內嵌程式碼

這保持了通用引擎的乾淨，同時仍允許進度。

## 架構變更

### 當前

場景 markdown 已經是以下內容的事實來源：

- 套件執行
- 工作區啟動檔案
- QA Lab UI 場景目錄
- 報告元數據
- 探索提示

生成的相容性：

- 植入的工作區仍然包含 `QA_KICKOFF_TASK.md`
- 植入的工作區仍然包含 `QA_SCENARIO_PLAN.md`
- 植入的工作區現在也包括 `QA_SCENARIOS.md`

## 重構計劃

### 階段 1：載入器和架構

完成。

- 新增了 `qa/scenarios/index.md`
- 將場景拆分為 `qa/scenarios/<theme>/*.md`
- 新增了具名 markdown YAML 封包內容的解析器
- 使用 zod 進行驗證
- 將消費者切換到解析後的封包
- 移除了儲存庫層級的 `qa/seed-scenarios.json` 和 `qa/QA_KICKOFF_TASK.md`

### 階段 2：通用引擎

- 將 `extensions/qa-lab/src/suite.ts` 拆分為：
  - 載入器
  - 引擎
  - 動作註冊表
  - 斷言註冊表
  - 自訂處理程序
- 將現有的輔助函式保留為引擎操作

交付成果：

- 引擎執行簡單的宣告式場景

從大多由 prompt + wait + assert 組成的情境開始：

- 執行續後續追蹤
- 從附件進行圖片理解
- 技能可見性與叫用
- 頻道基準

交付成果：

- 第一批透過通用引擎交付的實際 markdown 定義情境

### 階段 4：遷移中等情境

- 圖片生成往返
- 頻道語境中的記憶工具
- 工作階段記憶排序
- 子代理交涉
- 子代理分發綜合

交付成果：

- 變數、產物、工具斷言、請求日誌斷言已驗證

### 階段 5：將困難情境保留在自訂處理程式上

- 記憶重構整理
- 組態套用重新啟動喚醒
- 組態重新啟動功能切換
- 執行時期清單漂移

交付成果：

- 相同的撰寫格式，但在需要時包含明確的自訂步驟區塊

### 階段 6：刪除硬式編碼的情境對應

一旦套件覆蓋率足夠好：

- 從 `extensions/qa-lab/src/suite.ts` 移除大多數特定情境的 TypeScript 分支

## Fake Slack / Rich Media Support

目前的 QA bus 是以文字為優先。

相關檔案：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

目前 QA bus 支援：

- 文字
- 反應
- 執行緒

它尚未建立內嵌媒體附件的模型。

### 所需的傳輸合約

新增通用的 QA bus 附件模型：

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

然後將 `attachments?: QaBusAttachment[]` 新增至：

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### 為何要先從通用著手

不要建立僅限 Slack 的媒體模型。

取而代之：

- 一個通用的 QA 傳輸模型
- 其上的多個轉譯器
  - 目前的 QA Lab 聊天
  - 未來的 fake Slack web
  - 任何其他假造的傳輸檢視

這可以避免重複邏輯，並讓媒體情境保持傳輸無關性。

### 所需的 UI 工作

更新 QA UI 以轉譯：

- 內嵌圖片預覽
- 內嵌音訊播放器
- 內嵌影片播放器
- 檔案附件標籤

目前的 UI 已經可以轉譯執行緒和反應，因此附件轉譯應該要架構在相同的訊息卡片模型上。

### 由媒體傳輸啟用的情境工作

一旦附件通過 QA bus，我們就可以新增更豐富的假聊天情境：

- fake Slack 中的內嵌圖片回覆
- 音訊附件理解
- 影片附件理解
- 混合附加順序
- 帶有保留媒體的執行緒回覆

## 建議

下一個實作區塊應該是：

1. 新增 markdown 場景載入器 + zod schema
2. 從 markdown 產生目前的目錄
3. 先遷移幾個簡單的場景
4. 新增通用 QA bus 附加支援
5. 在 QA UI 中呈現內聯圖片
6. 然後擴充到音訊和視訊

這是證明這兩個目標的最小路徑：

- 通用的 markdown 定義 QA
- 更豐富的假訊息介面

## 未解決的問題

- 場景檔案是否應允許帶有變數插值的內嵌 markdown 提示詞範本
- 設定/清理應該是命名區段還是僅是排序的動作清單
- 成品參照是否應在 schema 中強型別或基於字串
- 自訂處理器應該位於一個註冊表中還是各介面各自的註冊表中
- 產生的 JSON 相容性檔案是否應在遷移期間保持簽入
