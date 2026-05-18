---
summary: "安裝、設定和管理 OpenClaw 外掛程式"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
sidebarTitle: "開始使用"
doc-schema-version: 1
---

外掛程式透過管道、模型提供者、代理程式框架、工具、技能、語音、即時轉錄、聲音、媒體理解、生成、網頁擷取、網頁搜尋及其他執行階段功能來擴充 OpenClaw。

當您想要安裝外掛程式、重新啟動 Gateway、驗證執行階段是否已載入它，以及排除常見的設定失敗問題時，請使用此頁面。若要查看僅包含指令的範例，請參閱[管理外掛程式](/zh-Hant/plugins/manage-plugins)。若要查看隨附的官方外部及僅限原始碼之外掛程式的完整產生清單，請參閱[外掛程式清單](/zh-Hant/plugins/plugin-inventory)。

## 需求

在安裝外掛程式之前，請確保您具備：

- OpenClaw 檢出或安裝版本，且 `openclaw` CLI 可用
- 對所選來源的網路存取權，例如 ClawHub、npm 或 git 主機
- 該外掛程式設定文件中指明的任何外掛程式專屬認證、設定金鑰或作業系統工具
- 為服務您管道的 Gateway 重新載入或重新啟動的權限

## 快速入門

<Steps>
  <Step title="尋找外掛程式">
    在 [ClawHub](/zh-Hant/clawhub) 上搜尋公開的外掛程式套件：

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub 是社群外掛程式的主要探索介面。在啟動轉換期間，一般的裸套件規格仍會從 npm 安裝。當您需要特定來源時，請使用明確的前綴。

  </Step>

  <Step title="安裝外掛程式">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    將外掛程式安裝視為執行程式碼。當您需要可再現的生產環境安裝時，請優先使用鎖定版本。

  </Step>

  <Step title="Configure and enable it">
    在 `plugins.entries.<id>.config` 下配置外掛程式特定設定。
    當外掛程式尚未啟用時啟用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果您的組態使用限制性的 `plugins.allow` 清單，則已安裝的外掛程式
    ID 必須存在於該清單中，外掛程式才能載入。
    `openclaw plugins install` 會將已安裝的 ID 新增至現有的
    `plugins.allow` 清單，並從 `plugins.deny` 中移除相同的 ID，以便
    重新啟動後可以載入明確安裝的外掛程式。

  </Step>

  <Step title="Let the Gateway reload">
    安裝、更新或解除安裝外掛程式碼需要重新啟動 Gateway。
    當受控 Gateway 已在啟用組態重新載入的情況下執行時，OpenClaw 會偵測到
    變更的外掛程式安裝記錄並自動重新啟動 Gateway。如果 Gateway 不受控或
    重新載入已停用，請自行重新啟動它：

    ```bash
    openclaw gateway restart
    ```

    啟用和停用作業會更新組態並重新整理冷暫存器。
    對於執行時期介面，執行時期檢查仍然是最清楚的驗證路徑。

  </Step>

  <Step title="Verify runtime registration">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    當您需要證明已註冊的工具、掛鉤、服務、
    Gateway 方法或外掛程式擁有的 CLI 指令時，請使用 `--runtime`。
    純粹的 `inspect` 是冷清單和暫存器檢查。

  </Step>
</Steps>

## Configuration

### Choose an install source

| Source      | Use when                                                                       | Example                                                        |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| ClawHub     | You want OpenClaw-native discovery, scans, version metadata, and install hints | `openclaw plugins install clawhub:<package>`                   |
| npm         | You need direct npm registry or dist-tag workflows                             | `openclaw plugins install npm:<package>`                       |
| git         | You need a branch, tag, or commit from a repository                            | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| local path  | You are developing or testing a plugin on the same machine                     | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | You are installing a Claude-compatible marketplace plugin                      | `openclaw plugins install <plugin> --marketplace <source>`     |

純套件規格具有特殊的相容性行為。如果純名稱符合隨附外掛程式 ID，OpenClaw 會使用該隨附來源。如果符合官方外部外掛程式 ID，OpenClaw 會使用官方套件目錄。其他一般的純套件規格會在啟動切換期間透過 npm 安裝。當您需要確定性來源選擇時，請使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:`。請參閱 [`openclaw plugins`](/zh-Hant/cli/plugins#install) 以了解完整的指令合約。

### 設定外掛程式原則

常見的外掛程式設定結構為：

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

主要原則規則：

- `plugins.enabled: false` 會停用所有外掛程式並跳過外掛程式探索/載入作業。當此功能啟用時，過時的外掛程式參考將失效；當您希望移除過時的 ID 時，請在執行醫生清理之前重新啟用外掛程式。
- `plugins.deny` 的優先順序高於允許清單和個別外掛程式的啟用設定。
- `plugins.allow` 是一個專用的允許清單。位於允許清單之外的外掛程式擁有之工具將保持無法使用狀態，即使 `tools.allow` 包含 `"*"` 也一樣。
- `plugins.entries.<id>.enabled: false` 會停用一個外掛程式，同時保留其設定。
- `plugins.load.paths` 會新增明確的本地外掛程式檔案或目錄。
- 來自工作區的外掛程式預設為停用狀態；在使用本地工作區程式碼之前，請明確啟用或將其加入允許清單。
- 隨附外掛程式會遵循其內建的預設啟用/預設停用中繼資料，除非設定明確覆寫它們。
- `plugins.slots.<slot>` 會為記憶體和內容引擎等獨佔類別選擇一個外掛程式。插槽選擇透過計算為明確啟用，來強制啟用該插槽的已選外掛程式；即使在外掛程式本來是選用的情況下，它也可以載入。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然會封鎖它。
- 隨附的選用外掛程式可以在設定指定其擁有的介面之一時自動啟用，例如提供者/模型參考、通道設定、CLI 後端或代理程式執行環境。
- OpenAI 系列 Codex 路由將提供者和運行時插件邊界分開：`openai-codex/*` 是舊版 OpenAI 提供者配置，而內建的 `codex` 插件擁有 Codex 應用伺服器運行時，用於標準 `openai/*` 代理程式引用、顯式 `agentRuntime.id: "codex"` 和舊版 `codex/*` 引用。

當配置驗證報告過時的插件 ID、允許清單/工具不匹配，或舊版內建插件路徑時，請執行 `openclaw doctor` 或 `openclaw doctor --fix`。

## 了解插件格式

OpenClaw 辨識兩種插件格式：

| 格式               | 載入方式                                                    | 使用時機                                           |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| 原生 OpenClaw 插件 | `openclaw.plugin.json` 加上在程序中載入的運行時模組         | 您正在安裝或建構 OpenClaw 專屬的運行時功能         |
| 相容套件           | 映射至 OpenClaw 插件清單的 Codex、Claude 或 Cursor 插件配置 | 您正在重複使用相容的技能、指令、勾點或套件中繼資料 |

這兩種格式都會出現在 `openclaw plugins list`、`openclaw plugins inspect`、`openclaw plugins enable` 和 `openclaw plugins disable` 中。請參閱 [Plugin bundles](/zh-Hant/plugins/bundles) 以了解套件相容性邊界，並參閱 [Building plugins](/zh-Hant/plugins/building-plugins) 以了解原生插件開發。

## 驗證作用中的 Gateway

`openclaw plugins list` 和單純的 `openclaw plugins inspect` 會讀取冷配置、清單和登錄狀態。它們無法證明正在執行的 Gateway 是否已匯入相同的插件程式碼。

當插件顯示已安裝，但即時聊天流量未使用它時：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

受管理的 Gateway 會在改變插件來源的安裝、更新和解除安裝變更後自動重新啟動。在 VPS 或容器安裝中，請確保任何手動重新啟動都以實際服務您頻道的 `openclaw gateway run` 子程序為目標，而不僅是包裝程式或監督程式。

## 疑難排解

| 徵狀                                             | 檢查                                                                                                                      | 修正                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 插件顯示於 `plugins list` 中，但運行時勾點未執行 | 使用 `openclaw plugins inspect <id> --runtime --json` 並使用 `gateway status --deep --require-rpc` 確認作用中的 Gateway   | 在安裝、更新、配置或來源變更後，重新啟動即時 Gateway                            |
| 出現重複的通道或工具擁有權診斷                   | 執行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 檢查每個可疑的外掛程式，並比較通道/工具的擁有權 | 停用其中一個擁有者、移除過時的安裝，或使用清單 `preferOver` 進行刻意替換        |
| 設定顯示外掛程式遺失                             | 檢查 [外掛程式清單](/zh-Hant/plugins/plugin-inventory) 以確認它是隨附、官方外部還是僅限原始碼                                  | 安裝外部套件、啟用隨附的外掛程式，或移除過時的設定                              |
| 安裝期間設定無效                                 | 閱讀驗證訊息，並在訊息指向過時的外掛程式狀態時執行 `openclaw doctor --fix`                                                | Doctor 可以透過停用項目並移除無效的內容，隔離無效的外掛程式設定                 |
| 外掛程式路徑因可疑的擁有權或權限而被封鎖         | 檢查設定錯誤之前的診斷                                                                                                    | 修復檔案系統的擁有權/權限，然後執行 `openclaw plugins registry --refresh`       |
| `OPENCLAW_NIX_MODE=1` 封鎖生命週期指令           | 確認安裝是由 Nix 管理                                                                                                     | 在 Nix 原始碼中變更外掛程式選擇，而非使用外掛程式變異指令                       |
| 相依性匯入在執行時失敗                           | 檢查外掛程式是透過 npm/git/ClawHub 安裝，還是從本機路徑載入                                                               | 執行 `openclaw plugins update <id>`、重新安裝來源，或自行安裝本機外掛程式相依性 |

當過時的外掛程式設定仍然指定一個不再可探索的通道外掛程式時，
Gateway 啟動會略過該外掛程式支援的通道，而不是封鎖所有
其他通道。執行 `openclaw doctor --fix` 以移除過時的外掛程式和通道
項目。如果沒有過時外掛程式證據的未知通道金鑰仍然會
無法通過驗證，因此錯別字會保持可見。

對於刻意的通道替換，偏好的外掛程式應該使用舊版或較低優先級
的外掛程式 ID 宣告 `channelConfigs.<channel-id>.preferOver`。如果兩個外掛程式都明確啟用，OpenClaw 會保留該請求
並回報重複的通道或工具診斷，而不是無聲地選擇
一個擁有者。

如果已安裝的套件回報它 `requires compiled runtime output for
TypeScript entry ...`，表示該套件發布時未包含 OpenClaw 在執行階段所需的 JavaScript 檔案。請在發布者提供編譯後的 JavaScript 後更新或重新安裝，或是在此期間停用/解除安裝該外掛。

### 外掛路徑所有權遭阻擋

如果外掛診斷顯示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
且組態驗證緊接著顯示 `plugin present but blocked`，表示 OpenClaw 發現外掛檔案是由與載入它們的行程不同的 Unix 使用者所擁有。請保留外掛組態不變；修正檔案系統所有權，或是以擁有狀態目錄的相同使用者身分執行 OpenClaw。

對於 Docker 安裝，官方映像檔是以 `node` (uid `1000`) 執行，因此主機 bind-mounted 的 OpenClaw 組態和工作區目錄通常應由 uid `1000` 所擁有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您刻意以 root 身分執行 OpenClaw，請將受管理的外掛根目錄修復為 root 所有權：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修正所有權後，請重新執行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持續化的外掛註冊表與已修復的檔案相符。

### 外掛工具設定緩慢

如果代理輪次在準備工具時似乎停滯，請啟用追蹤記錄並檢查外掛工具工廠的時序記錄：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

請尋找：

```text
[trace:plugin-tools] factory timings ...
```

摘要會列出總工廠時間和最慢的外掛工具工廠，包括外掛 ID、宣告的工具名稱、結果形狀，以及工具是否為選用。當單一工廠耗時至少 1 秒或總外掛工具工廠準備時間至少 5 秒時，緩慢的記錄會提升為警告。

OpenClaw 會針對使用相同有效請求內容的重複解析，快取成功的外掛工具工廠結果。快取金鑰包含有效執行時期組態、工作區、代理/工作階段 ID、沙箱原則、瀏覽器設定、傳遞內容、請求者身分和所有權狀態，因此依賴這些受信任欄位的工廠會在內容變更時重新執行。如果時間仍然很高，外掛可能會在傳回其工具定義之前執行耗時的工作。

如果某個外掛佔據了大部分時間，請檢查其執行時期註冊：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然後更新、重新安裝或停用該外掛程式。外掛程式作者應將昂貴的相依性載入移至工具執行路徑後方，而不是在工具工廠內部執行。

關於相依性根目錄、套件元資料驗證、登錄記錄、啟動時重新載入行為以及舊版清理，請參閱[外掛程式相依性解析](/zh-Hant/plugins/dependency-resolution)。

## 相關

- [管理外掛程式](/zh-Hant/plugins/manage-plugins) - 列出、安裝、更新、解除安裝和發佈的指令範例
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 完整的 CLI 參考資料
- [外掛程式清單](/zh-Hant/plugins/plugin-inventory) - 已產生的套件和外部外掛程式清單
- [外掛程式參考資料](/zh-Hant/plugins/reference) - 已產生的個別外掛程式參考頁面
- [社群外掛程式](/zh-Hant/plugins/community) - ClawHub 探索和文件 PR 政策
- [外掛程式相依性解析](/zh-Hant/plugins/dependency-resolution) - 安裝根目錄、登錄記錄和執行時期邊界
- [建置外掛程式](/zh-Hant/plugins/building-plugins) - 原生外掛程式撰寫指南
- [外掛程式 SDK 概覽](/zh-Hant/plugins/sdk-overview) - 執行時期註冊、掛鉤和 API 欄位
- [外掛程式清單資訊](/zh-Hant/plugins/manifest) - 清單資訊和套件元資料
