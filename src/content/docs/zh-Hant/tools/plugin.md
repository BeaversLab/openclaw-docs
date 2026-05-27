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

當您想要安裝外掛程式、重新啟動 Gateway、驗證執行階段是否已載入它，以及排除常見的設定失敗時，請使用此頁面。若只要查看指令範例，請參閱[管理外掛程式](/zh-Hant/plugins/manage-plugins)。若要查看內建、官方外部和僅原始碼外掛程式的完整產生清單，請參閱[外掛程式清單](/zh-Hant/plugins/plugin-inventory)。

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

    ClawHub 是社群外掛程式的主要探索介面。在啟動切換期間，一般的純裸套件規格仍會從 npm 安裝。當您需要特定來源時，請使用明確的前綴。

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

裸套件規格具有特殊的相容性行為。如果裸名稱符合內建外掛程式 ID，OpenClaw 會使用該內建來源。如果它符合官方外部外掛程式 ID，OpenClaw 會使用官方套件目錄。其他一般的裸套件規格會在啟動切換期間透過 npm 安裝。當您需要確定性的來源選擇時，請使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:`。請參閱 [`openclaw plugins`](/zh-Hant/cli/plugins#install) 以了解完整的指令合約。

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

這兩種格式都出現在 `openclaw plugins list`、`openclaw plugins inspect`、
`openclaw plugins enable` 和 `openclaw plugins disable` 中。請參閱
[外掛程式套件組合](/zh-Hant/plugins/bundles) 以了解套件組合相容性邊界，並參閱[建置外掛程式](/zh-Hant/plugins/building-plugins) 以了解原生外掛程式撰寫。

## 外掛程式鉤子

外掛程式可以在執行階段註冊鉤子，但有兩個不同的 API 具有不同的工作。

- 透過 `api.on(...)` 使用型別鉤子來處理執行階段生命週期鉤子。這是中介軟體、原則、訊息重寫、提示成形和工具控制的慣用介面。
- 僅當您想要參與 [鉤子](/zh-Hant/automation/hooks) 中描述的內部鉤子系統時，才使用 `api.registerHook(...)`。這主要用於粗略的指令/生命週期副作用，以及與現有 HOOK 樣式自動化的相容性。

快速規則：

- 如果處理器需要優先級、合併語義，或封鎖/取消行為，請使用類型化插件掛鉤。
- 如果處理器只是對 `command:new`、`command:reset`、`message:sent` 或類似的粗略事件做出反應，`api.registerHook(...)` 就足夠了。

外掛程式管理的內部掛鉤會以 `plugin:<id>` 顯示在 `openclaw hooks list` 中。您無法透過 `openclaw hooks` 啟用或停用它們；請改為啟用或停用外掛程式。

## 驗證作用中的 Gateway

`openclaw plugins list` 和純 `openclaw plugins inspect` 會讀取冷配置、資訊清單和註冊表狀態。它們無法證明正在執行的 Gateway 已匯入相同的外掛程式碼。

當外掛程式顯示已安裝但即時聊天流量未使用它時：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

受管理的 Gateway 會在變更外掛程式來源的安裝、更新和解除安裝後自動重新啟動。在 VPS 或容器安裝上，請確保任何手動重新啟動都是針對服務您頻道的實際 `openclaw gateway run` 子行程，而不僅僅是包裝程式或監督程式。

## 疑難排解

| 症狀                                               | 檢查                                                                                                                    | 修正                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 外掛程式顯示在 `plugins list` 中但執行時掛鉤未執行 | 使用 `openclaw plugins inspect <id> --runtime --json` 並以 `gateway status --deep --require-rpc` 確認作用中的 Gateway   | 在安裝、更新、設定或來源變更後重新啟動即時 Gateway                            |
| 出現重複的頻道或工具擁有權診斷                     | 執行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 檢查每個可疑的外掛程式，並比較頻道/工具擁有權 | 停用其中一個擁有者，移除過時的安裝，或使用資訊清單 `preferOver` 進行刻意替換  |
| 設定指出外掛程式遺失                               | 檢查 [外掛程式清單](/zh-Hant/plugins/plugin-inventory) 以判斷它是隨附、官方外部，還是僅限來源                                | 安裝外部套件、啟用隨附的外掛程式，或移除過時的設定                            |
| 安裝期間設定無效                                   | 閱讀驗證訊息，並在它指出過時的外掛程式狀態時執行 `openclaw doctor --fix`                                                | Doctor 可以透過停用條目並移除無效的負載來隔離無效的外掛程式設定               |
| 外掛路徑因可疑的所有權或權限而被封鎖               | 檢查設定錯誤之前的診斷訊息                                                                                              | 修復檔案系統所有權/權限，然後執行 `openclaw plugins registry --refresh`       |
| `OPENCLAW_NIX_MODE=1` 封鎖生命週期指令             | 確認安裝是由 Nix 管理                                                                                                   | 請變更 Nix 來源中的外掛選擇，而不是使用外掛變異器指令                         |
| 相依性匯入在執行階段失敗                           | 檢查外掛是透過 npm/git/ClawHub 安裝，還是從本地路徑載入                                                                 | 執行 `openclaw plugins update <id>`、重新安裝來源，或是自行安裝本地外掛相依性 |

當過期的外掛設定仍命名一個無法再被探索的通道外掛時，
Gateway 啟動會跳過該外掛支援的通道，而不是封鎖
所有其他通道。執行 `openclaw doctor --fix` 以移除過期的外掛和通道
項目。沒有過期外掛證據的未知通道金鑰仍會
驗證失敗，以便讓拼寫錯誤保持可見。

若要刻意替換通道，偏好的外掛應使用舊版或較低優先級的
外掛 id 宣告 `channelConfigs.<channel-id>.preferOver`。如果兩個外掛都明確啟用，OpenClaw
會保留該請求並回報重複的通道或工具診斷，而不是靜默地選擇
一個擁有者。

如果已安裝的套件回報它「requires compiled runtime output for
TypeScript entry ...」（需要 TypeScript 入口的編譯執行階段輸出...），
表示該套件發佈時未包含 OpenClaw 在執行階段所需的 JavaScript 檔案。
在發佈者提供編譯後的 JavaScript 後更新或重新安裝，或者在此之前停用/移除外掛。

### 外掛路徑所有權被封鎖

如果外掛診斷顯示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
且隨後的設定驗證顯示 `plugin present but blocked`，表示 OpenClaw 發現
外掛檔案的所有者 Unix 使用者與載入它們的處理程序不同。
請保留外掛設定；修復檔案系統所有權，或以擁有狀態目錄的
相同使用者身分執行 OpenClaw。

對於 Docker 安裝，官方映像檔以 `node` (uid `1000`) 執行，因此
主機掛載綁定的 OpenClaw 設定和工作區目錄通常應
由 uid `1000` 擁有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您刻意以 root 身分執行 OpenClaw，請改將受管理的外掛根目錄修復
為 root 所有權：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修復所有權後，請重新執行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件註冊表與
修復後的檔案相符。

### 插件工具設定緩慢

如果在準備工具時代理輪次似乎停滯，請啟用追蹤記錄並
檢查插件工具工廠計時行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

尋找：

```text
[trace:plugin-tools] factory timings ...
```

摘要會列出總工廠時間和最慢的插件工具工廠，
包括插件 ID、宣告的工具名稱、結果形狀，以及該工具是否
為可選。當單一工廠耗時至少 1 秒或總插件工具工廠準備耗時至少 5 秒時，
緩慢的行會升級為警告。

OpenClaw 會快取成功的插件工具工廠結果，以便在相同的
有效請求上下文中重複解析。快取鍵包括有效的
執行時配置、工作區、代理/工作階段 ID、沙箱原則、瀏覽器設定、
傳送上下文、請求者身分和所有權狀態，因此依賴這些受信任欄位的
工廠會在上下文變更時重新執行。如果計時持續偏高，
插件可能是在傳回工具定義之前執行了耗時的工作。

如果某個插件佔據了大部分時間，請檢查其執行時註冊：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然後更新、重新安裝或停用該插件。插件作者應將
耗時的相依性載入移至工具執行路徑後方，而不是在
工具工廠內部執行。

如需瞭解相依性根目錄、套件元資料驗證、註冊表記錄、啟動
重新載入行為和舊版清理，請參閱
[Plugin dependency resolution](/zh-Hant/plugins/dependency-resolution)。

## 相關

- [Manage plugins](/zh-Hant/plugins/manage-plugins) - 列出、安裝、更新、解除安裝和發佈的指令範例
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 完整的 CLI 參考
- [Plugin inventory](/zh-Hant/plugins/plugin-inventory) - 生成的內建和外部插件清單
- [Plugin reference](/zh-Hant/plugins/reference) - 生成的個別插件參考頁面
- [Community plugins](/zh-Hant/plugins/community) - ClawHub 探索和文件 PR 原則
- [Plugin dependency resolution](/zh-Hant/plugins/dependency-resolution) - 安裝根目錄、註冊表記錄和執行時邊界
- [Building plugins](/zh-Hant/plugins/building-plugins) - 原生插件撰寫指南
- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview) - 執行時期註冊、掛鉤與 API 欄位
- [Plugin 資訊清單](/zh-Hant/plugins/manifest) - 資訊清單與套件元資料
