---
summary: "2026 年 5 月效能、套件大小、相依性和 shrinkwrap 清理的視覺摘要與技術證據"
read_when:
  - You are validating the May 2026 performance and package-size cleanup
  - You need the numbers behind the OpenClaw performance and dependency blog post
  - You are changing release gates, package shrinkwrap, or plugin dependency boundaries
title: "Release performance sweep"
---

本頁面記錄了 2026 年 5 月 OpenClaw 效能、套件大小、相依性和 shrinkwrap 清理背後的證據。這是公開部落格文章的技術伴侶文件。

這裡結合了兩項稽核：

- **Release performance sweep：** 從 `v2026.5.27` 回溯至穩定版 `v2026.4.23` 的 GitHub Releases，使用 `OpenClaw Performance` 工作流程、`profile=smoke`、`repeat=1`、mock-provider lane。
- **Earlier April context：** 發布了從 `v2026.4.1` 到 `v2026.5.2` 的 `clawgrit-reports` mock-provider 基準，僅用於避免將 4 月下旬損壞的發布版本視為公開效能基準。
- **Install footprint sweep：** 將 `npm install --ignore-scripts` 全新安裝到暫存套件中，使用 `du -sk node_modules` 測量大小並透過 `node_modules` 遍歷計算套件實例數量。
- **npm package size sweep：** 針對已發布的發布版本執行 `npm pack openclaw@<version> --dry-run --json`，記錄壓縮 tarball 大小、解壓縮大小和檔案數量。

<Warning>主要的效能 sweep 使用每個標籤一個樣本測試。Earlier April context 使用來自 `clawgrit-reports` 的已發布重複 3 次中位數。請將這些數字視為趨勢證據和回歸追蹤信號，而非發布閘道統計資料。</Warning>

## 快照

效能涵蓋範圍：**76 個請求的發布版本**、**73 個有成品支援的資料點**，以及 **3 個不可用的 CI 執行**。最新測量的穩定版資料點：`v2026.5.27`。

<CardGroup cols={2}>
  <Card title="Stable agent turn" icon="gauge">
    **冷啟動速度快 2.9 倍**

    - `v2026.4.14`: 9.8s
    - `v2026.5.27`: 3.4s

  </Card>
  <Card title="已發佈的套件" icon="package">
    **17.8MB tarball**

    最新穩定版套件，已從 3 月 43.3MB 的套件大小峰值下降。

  </Card>
  <Card title="最新穩定安裝" icon="hard-drive">
    **786.9MB 全新安裝**

    `v2026.5.27` 仍然包含巢狀的 OpenClaw 相依性樹。`main` 上的下一發佈狀態為 407.4MB。

  </Card>
  <Card title="相依性圖表" icon="boxes">
    **371 個已安裝的套件**

    最新穩定發佈版本。在後續的相依性清理後，目前的 `main` 已降至 314 個。

  </Card>
</CardGroup>

## 安裝佔用時間軸

<CardGroup cols={2}>
  <Card title="每月最高" icon="triangle-alert">
    **645 個相依性**

    `2026.2.26` 是此樣本中每月相依性計數的最高點。

  </Card>
  <Card title="引進 Shrinkwrap" icon="lock">
    **1,020.6MB 安裝**

    `2026.5.22` 新增了根 shrinkwrap 並揭露了套件形狀問題：
    911.8MB 落於巢狀 `openclaw/node_modules` 之下。

  </Card>
  <Card title="最新穩定版" icon="tag">
    **786.9MB 安裝**

    `2026.5.27` 降低了峰值，但仍安裝了 675.9MB 的巢狀
    OpenClaw 樹。

  </Card>
  <Card title="下一發佈狀態" icon="scissors">
    **407.4MB 安裝**

    目前的 `main` 保留了 shrinkwrap，移除了巢狀樹，並安裝
    314 個套件。

  </Card>
</CardGroup>

<Tip>Shrinkwrap 本身並不是問題所在。套件結構不良才是。目前的 `main` 仍然隨附 shrinkwrap，但 npm 在安裝過程中不再具象化第二個 OpenClaw 相依性樹。</Tip>

## 5.27 之後的變更

在 `v2026.5.27` 與目前的 `main` 之間的清理作業移除了重複的
default-install 圖譜，而非移除功能本身。

<CardGroup cols={2}>
  <Card title="Root default graph" icon="git-branch">
    根目錄 shrinkwrap 套件路徑從 **372** 個降至 **331** 個。唯一套件 名稱從 **357** 個降至 **318** 個。
  </Card>
  <Card title="Direct root dependencies" icon="unplug">
    `@earendil-works/pi-agent-core`、`@earendil-works/pi-ai`、 `@earendil-works/pi-coding-agent` 和 `pdfjs-dist` 已離開預設根目錄 相依性路徑。
  </Card>
  <Card title="Native optional cones" icon="cpu">
    全平台的 `@napi-rs/canvas` 和 `@mariozechner/clipboard` 原生 套件 cone 不再落入預設安裝中。
  </Card>
  <Card title="Supply-chain surface" icon="shield">
    預設套件變少意味著預設需要信任的 tarball、維護者、原生二進位檔、 安裝時行為以及傳遞性更新路徑也變少了。
  </Card>
</CardGroup>

## 關鍵數字

請勿將四月下旬的損壞資料列作為公開的效能基準。
`v2026.4.23` 和 `v2026.4.29` 是有用的迴歸證據，但巨大的
`14x` 樣式差異主要描述的是從不良發行版本復原的過程。

對於部落格敘事，請使用四月較早發布的基準作為規模參考：

| 指標            | 四月較早的基準 | `v2026.5.27` |                  差異 |
| --------------- | -------------: | -----------: | --------------------: |
| Cold agent turn |        9,819ms |      3,378ms | 降低 65.6%，快 2.9 倍 |
| Warm agent turn |        7,458ms |      2,973ms | 降低 60.1%，快 2.5 倍 |
| Agent 峰值 RSS  |        686.2MB |      635.5MB |             降低 7.4% |

較早的 4 月基線來自已發布的 `clawgrit-reports` mock-provider 執行的 `v2026.4.14`。該次執行使用了 repeat 3，並且僅因為未輸出診斷時間軸而失敗；冷啟動、熱啟動和 RSS 的中位數仍可作為粗略的規模參考。將此視為敘述性背景，而非發布閘門統計資料。

在單一樣本的穩定 5 月掃描中，數據線的移動較為平緩：

| 指標              | `v2026.5.2` | `v2026.5.27` |       變化 |
| ----------------- | ----------: | -----------: | ---------: |
| 冷啟動 Agent 週轉 |     3,897ms |      3,378ms | 降低 13.3% |
| 熱啟動 Agent 週轉 |     3,610ms |      2,973ms | 降低 17.6% |
| Agent 峰值 RSS    |     613.7MB |      635.5MB |  增加 3.6% |

單一樣本掃描中的最佳預發布點：

| 指標              | `v2026.5.27` | `v2026.5.27-beta.1` |       變化 |
| ----------------- | -----------: | ------------------: | ---------: |
| 冷啟動 Agent 週轉 |      3,378ms |             2,575ms | 降低 23.8% |
| 熱啟動 Agent 週轉 |      2,973ms |             2,217ms | 降低 25.4% |
| Agent 峰值 RSS    |      635.5MB |             635.3MB |       持平 |

### 安裝佔用空間

| 指標                                            |      基線 | Current main |       變化 |
| ----------------------------------------------- | --------: | -----------: | ---------: |
| 來自 `2026.5.22` 峰值的安裝大小                 | 1,020.6MB |      407.4MB | 降低 60.1% |
| 來自最新發布版 `2026.5.27` 的安裝大小           |   786.9MB |      407.4MB | 降低 48.2% |
| 來自每月高峰 `2026.2.26` 的相依性               |       645 |          314 | 降低 51.3% |
| 來自最新發布版 `2026.5.27` 的相依性             |       371 |          314 | 降低 15.4% |
| 來自 `2026.5.22` 的巢狀 `openclaw/node_modules` |   911.8MB |          0MB |     已移除 |
| 來自 `2026.5.27` 的巢狀 `openclaw/node_modules` |   675.9MB |          0MB |     已移除 |

### npm 套件大小

| 版本        | 壓縮 tarball | 解壓縮套件 |   檔案 | 備註                       |
| ----------- | -----------: | ---------: | -----: | -------------------------- |
| `2026.1.30` |       12.8MB |     33.5MB |  4,607 | 早期重新品牌的套件         |
| `2026.2.26` |       23.6MB |     82.9MB | 10,125 | 功能增長                   |
| `2026.3.31` |       43.3MB |    182.6MB | 21,037 | 套件大小高峰               |
| `2026.4.29` |       22.9MB |     74.6MB |  9,309 | 套件修剪可見               |
| `2026.5.12` |       23.4MB |     80.1MB | 12,035 | 主要外掛程式拆分           |
| `2026.5.22` |       17.2MB |     76.9MB | 12,386 | 已從套件中排除 docs/assets |
| `2026.5.27` |       17.8MB |     79.0MB | 12,509 | 最新穩定版套件             |

`2026.5.12` 是變更日誌中可見的外掛提取里程碑：
Amazon Bedrock、Bedrock Mantle、Slack、OpenShell sandbox、Anthropic Vertex、
Matrix 和 WhatsApp 已移出核心相依性路徑，因此其相依性錐體會隨這些外掛安裝，
而非在每次核心安裝時都安裝。

## Kova 代理程式輪次摘要

四月穩定版線包含兩個不同的故事。四月初雖然緩慢
但仍可辨識。四月下旬則變成了回歸懸崖。`v2026.5.2` 是
mock-provider 軌道首次降至 3-5 秒範圍並開始在提供的掃描中
持續通過的地方。

先前發布的背景：

| 版本         | Kova |   冷輪次 |   暖輪次 | Agent 峰值 RSS |
| ------------ | ---- | -------: | -------: | -------------: |
| `v2026.4.10` | 失敗 | 11,031ms |  7,962ms |        679.0MB |
| `v2026.4.12` | 失敗 | 11,965ms |  8,289ms |        713.5MB |
| `v2026.4.14` | 失敗 |  9,819ms |  7,458ms |        686.2MB |
| `v2026.4.20` | 失敗 | 22,314ms | 18,811ms |        810.8MB |
| `v2026.4.22` | 失敗 |  9,630ms |  7,459ms |        743.0MB |

提供的單一樣本掃描：

| 版本                | Kova |   冷輪次 |   暖輪次 | Agent 峰值 RSS |
| ------------------- | ---- | -------: | -------: | -------------: |
| `v2026.4.23`        | 失敗 | 47,847ms |  8,010ms |      1,082.7MB |
| `v2026.4.24`        | 失敗 | 48,264ms | 25,483ms |        996.0MB |
| `v2026.4.25`        | 失敗 | 81,080ms | 59,172ms |      1,113.9MB |
| `v2026.4.26`        | 失敗 | 76,771ms | 54,941ms |      1,140.8MB |
| `v2026.4.27`        | 失敗 | 60,902ms | 33,699ms |      1,156.0MB |
| `v2026.4.29`        | 失敗 | 94,031ms | 57,334ms |      3,613.7MB |
| `v2026.5.2`         | 通過 |  3,897ms |  3,610ms |        613.7MB |
| `v2026.5.7`         | 通過 |  3,923ms |  3,693ms |        654.1MB |
| `v2026.5.12`        | 通過 |  7,248ms |  6,629ms |        834.8MB |
| `v2026.5.18`        | 通過 |  3,301ms |  2,913ms |        630.3MB |
| `v2026.5.20`        | 通過 |  3,413ms |  2,952ms |        643.2MB |
| `v2026.5.22`        | 通過 |  4,494ms |  4,093ms |        654.3MB |
| `v2026.5.26`        | 通過 |  2,626ms |  2,282ms |        660.4MB |
| `v2026.5.27-beta.1` | 通過 |  2,575ms |  2,217ms |        635.3MB |
| `v2026.5.27`        | 通過 |  3,378ms |  2,973ms |        635.5MB |

## Source probes

由於 17 個成功的較舊參照的來源樹尚無所需的探測入口點，因此跳過了這些來源探測。這些參照的 Agent 週轉指標仍然存在。

代表性來源探測點：

| 版本                | 預設 `readyz` p50 | 50 個外掛程式 `readyz` p50 | CLI 健康狀況 p50 | 外掛程式最大 RSS |
| ------------------- | ----------------: | -------------------------: | ---------------: | ---------------: |
| `v2026.4.29`        |           2,819ms |                    2,618ms |          1,679ms |          389.0MB |
| `v2026.5.2`         |           2,324ms |                    2,013ms |          1,384ms |          377.2MB |
| `v2026.5.7`         |           1,649ms |                    1,540ms |          1,175ms |          387.6MB |
| `v2026.5.18`        |           1,942ms |                    1,927ms |            607ms |          426.5MB |
| `v2026.5.20`        |           1,966ms |                    1,987ms |            621ms |          455.0MB |
| `v2026.5.22`        |           2,081ms |                    1,884ms |          5,095ms |          444.2MB |
| `v2026.5.26`        |           1,546ms |                    1,634ms |            656ms |          400.4MB |
| `v2026.5.27-beta.1` |           1,462ms |                    1,548ms |            548ms |          394.0MB |
| `v2026.5.27`        |           1,874ms |                    1,925ms |            660ms |          398.0MB |

即使 Agent 週轉通道仍然通過，`v2026.5.22` CLI 健康狀況激增在此表中仍清晰可見。在調查針對特定 CLI 或 Gateway 回歸時，請保留來源探測。

## 安裝足跡稽核

相依性樣本每月使用一個穩定版本，加上 `2026.5.22` shrinkwrap 引入事件、最新的 `2026.5.27`，以及目前的 `main`。

| 時間點           | 已安裝的相依項 |  全新安裝 | OpenClaw 套件 | 巢狀 `openclaw/node_modules` | 根層級 shrinkwrap | Canvas 安裝行為                         |
| ---------------- | -------------: | --------: | ------------: | ---------------------------: | ----------------- | --------------------------------------- |
| 1 月 `2026.1.30` |            605 |   438.4MB |        45.8MB |                        2.4MB | 否                | 頂層包裝函式 + `darwin-arm64`           |
| 2 月 `2026.2.26` |            645 |   575.7MB |       110.1MB |                        3.5MB | 否                | 頂層包裝函式 + `darwin-arm64`           |
| 3 月 `2026.3.31` |            438 |   584.1MB |       234.8MB |                          0MB | 否                | 頂層包裝函式 + `darwin-arm64`           |
| 4 月 `2026.4.29` |            392 |   335.0MB |        97.4MB |                          0MB | 否                | 未安裝                                  |
| `2026.5.22`      |            401 | 1,020.6MB |     1,020.4MB |                      911.8MB | 是                | 巢狀：全部 12 個 `@napi-rs/canvas` 套件 |
| 5月 `2026.5.26`  |            371 |   767.5MB |       767.4MB |                      656.4MB | 是                | 巢狀：全部 12 個 `@napi-rs/canvas` 套件 |
| 最新 `2026.5.27` |            371 |   786.9MB |       786.7MB |                      675.9MB | 是                | 巢狀：全部 12 個 `@napi-rs/canvas` 套件 |
| 目前 `main`      |            314 |   407.4MB |       101.0MB |                          0MB | 是                | 頂層包裝器 + `darwin-arm64`             |

### Shrinkwrap 邊界

<CardGroup cols={2}>
  <Card title="Shrinkwrap 之前" icon="unlock">
    `2026.5.20` 沒有根 shrinkwrap，也沒有巨大的巢狀 OpenClaw 相依性 樹。
  </Card>
  <Card title="已引入" icon="lock">
    `2026.5.22` 新增了根 shrinkwrap 並在巢狀 `openclaw/node_modules` 下安裝了 911.8MB。
  </Card>
  <Card title="最新穩定版" icon="tag">
    `2026.5.27` 保留 shrinkwrap，且仍在巢狀 `openclaw/node_modules` 下安裝了 675.9MB。
  </Card>
  <Card title="目前 main" icon="check">
    `main` 保留 shrinkwrap 並移除巢狀 OpenClaw 相依性樹。
  </Card>
</CardGroup>

已發佈 tarball 檢查驗證了邊界：

| 版本        | 已發佈穩定版？ | 根 `npm-shrinkwrap.json` | 備註                            |
| ----------- | -------------- | ------------------------ | ------------------------------- |
| `2026.5.20` | 是             | 否                       | shrinkwrap 之前的最後一個穩定版 |
| `2026.5.21` | 否             | 不適用                   | 無穩定版 npm 發佈               |
| `2026.5.22` | 是             | 是                       | 已引入 shrinkwrap               |
| `2026.5.23` | 否             | 不適用                   | 無穩定版 npm 發佈               |
| `2026.5.24` | 否             | 不適用                   | 無穩定版 npm 發佈               |
| `2026.5.25` | 否             | 不適用                   | 無穩定版 npm 發佈               |
| `2026.5.26` | 是             | 是                       | 巢狀相依性樹仍然存在            |
| `2026.5.27` | 是             | 是                       | 巢狀相依性樹仍然存在            |
| `main`      | n/a            | 是                       | 已移除嵌套依賴樹                |

重要區別：**shrinkwrap 本身並非問題所在**。目前的
`main` 仍會發佈根 shrinkwrap。問題在於套件形狀導致
npm 具體化了一個龐大的嵌套 OpenClaw 依賴樹以及所有 12 個
`@napi-rs/canvas` 平台套件。

關於 shrinkwrap 和維護者層級套件檢查的通俗英文解釋，請參閱 [npm shrinkwrap](/zh-Hant/gateway/security/shrinkwrap)。

## 供應鏈解讀

依賴計數是一種營運安全指標，而不僅僅是安裝大小指標。每個套件都擴展了維護者、壓縮檔、傳遞更新、選用原生二進位檔以及營運商必須信任的安裝時期行為的集合。

清理方向為：

- 將繁重和選用的功能保留在預設核心安裝之外
- 讓外掛程式套件擁有其執行時期依賴圖
- 避免在 Gateway 啟動期間進行執行時期套件管理程式修復
- 保持確定性安裝，而不會導致所有平台原生套件的具體化
- 在套件驗收和測量路徑中保持安裝指令碼停用
- 在發佈前攔截嵌套依賴樹和原生選用依賴激增

相關文件：

- [外掛程式依賴解析](/zh-Hant/plugins/dependency-resolution)
- [外掛程式清單](/zh-Hant/plugins/plugin-inventory)
- [完整發佈驗證](/zh-Hant/reference/full-release-validation)

## 無可用的效能執行

| 發佈                | 執行                                                                         | 結果   | 原因                                                                             |
| ------------------- | ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `v2026.5.3-1`       | [26561664645](https://github.com/openclaw/openclaw/actions/runs/26561664645) | 失敗   | mock-provider 工作失敗：CLI 啟動等待 qa-channel 就緒逾時；未回報 qa-channel 帳戶 |
| `v2026.5.3`         | [26561666722](https://github.com/openclaw/openclaw/actions/runs/26561666722) | 失敗   | mock-provider 工作失敗：CLI 啟動等待 qa-channel 就緒逾時；未回報 qa-channel 帳戶 |
| `v2026.4.29-beta.2` | [26561683635](https://github.com/openclaw/openclaw/actions/runs/26561683635) | 已取消 | 選用基準擷取在上傳成品前停滯                                                     |

## 後續檢查閘道

此清理掃描建議的發佈檢查：

1. 對發佈候選版本執行 mock-provider 效能冒煙測試並保留
   成品。
2. 追蹤冷轉、熱轉、代理 RSS、Gateway `readyz` 和 CLI 健康狀況。
3. 在停用腳本的情況下全新安裝打包的 tarball。
4. 記錄已安裝的相依性數量、安裝大小、套件大小、巢狀 `openclaw/node_modules` 大小，以及原生選用套件的形狀。
5. 當巢狀相依性樹或全平台原生套件意外出現時，失敗或暫停發佈審查。
