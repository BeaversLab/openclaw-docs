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

當您想要安裝外掛程式、重新啟動 Gateway、驗證執行階段是否已載入它，以及排除常見的設定失敗時，請使用此頁面。若只需查看指令範例，請參閱[管理外掛程式](/zh-Hant/plugins/manage-plugins)。若要查看套件、官方外部與僅原始碼外掛程式的完整產生清單，請參閱[外掛程式清單](/zh-Hant/plugins/plugin-inventory)。

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

    ClawHub 是社群外掛程式的主要發現介面。在啟動切換期間，一般的純套件規格仍會從 npm 安裝，除非它們符合官方外掛程式 ID。符合套件外掛程式的原始 `@openclaw/*` 套件規格會使用目前 OpenClaw 建置中的套件副本。當您需要特定來源時，請使用明確的前綴。

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

  <Step title="設定並啟用它">
    在 `plugins.entries.<id>.config` 下設定外掛程式專屬設定。
    當外掛程式尚未啟用時啟用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果您的設定使用受限的 `plugins.allow` 清單，則安裝的外掛程式 ID 必須存在於該清單中，外掛程式才能載入。
    `openclaw plugins install` 會將已安裝的 ID 新增至現有的
    `plugins.allow` 清單中，並從 `plugins.deny` 中移除相同的 ID，以便明確安裝的外掛程式在重新啟動後能夠載入。

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

  <Step title="驗證執行時間註冊">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    當您需要證明已註冊的工具、掛勾、服務、Gateway 方法或外掛程式擁有的 CLI 指令時，請使用 `--runtime`。單純的 `inspect` 是冷清單與登錄檢查。

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

純套件規格具有特殊的相容性行為。如果純名稱符合套件外掛程式 ID，OpenClaw 會使用該套件來源。如果它符合官方外部外掛程式 ID，OpenClaw 會使用官方套件目錄。其他一般的純套件規格會在啟動切換期間透過 npm 安裝。符合套件外掛程式的原始 `@openclaw/*` 套件規格也會在 npm 回退之前解析為套件副本。當您刻意想要外部 npm 套件而非映像檔擁有的套件副本時，請使用 `npm:@openclaw/<plugin>@<version>`。當您需要確定性來源選擇時，請使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:`。請參閱 [`openclaw plugins`](/zh-Hant/cli/plugins#install) 以了解完整的指令合約。

對於 npm 安裝，未釘選的套件規格和 `@latest` 會選擇宣佈與此 OpenClaw 組建相容的最新穩定套件。如果 npm 目前的最新發行版宣佈了較新的 `openclaw.compat.pluginApi` 或 `openclaw.install.minHostVersion`，OpenClaw 會掃描較舊的穩定套件版本，並安裝符合條件且最新的一個。確切版本和明確通道標籤（例如 `@beta`）會保持釘選至選定的套件，並在不相容時失敗。

### 設定外掛程式原則

常見的外掛程式設定結構如下：

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

- `plugins.enabled: false` 會停用所有外掛程式並跳過外掛程式探索/載入工作。當此項啟用時，陳舊的外掛程式參考將處於非作用狀態；當您想要移除陳舊的 ID 時，請在執行 doctor 清理作業之前重新啟用外掛程式。
- `plugins.deny` 的優先順序高於允許和個別外掛程式的啟用設定。
- `plugins.allow` 是一個專屬的允許清單。允許清單之外的外掛程式擁有工具將保持無法使用，即使 `tools.allow` 包含 `"*"`。
- `plugins.entries.<id>.enabled: false` 會停用一個外掛程式，同時保留其設定。
- `plugins.load.paths` 會新增明確的本機外掛程式檔案或目錄。
- 預設會停用源自工作區的外掛程式；在使用本機工作區程式碼之前，請明確啟用或將其加入允許清單。
- Bundled plugins 遵循其內建的預設開啟/預設關閉元數據，除非配置明確覆蓋了它們。
- `plugins.slots.<slot>` 為記憶體和上下文引擎等獨佔類別選擇一個外掛程式。插槽選擇透過計為明確啟動，強制啟用該插槽的所選外掛程式；即使它本來是選用的，也可以載入。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然會封鎖它。
- 當配置命名其中一個擁有的介面時，例如提供者/模型參照、通道配置、CLI 後端或代理程式控制項執行階段，選用的 Bundled 外掛程式可以自動啟動。
- OpenAI 系列的 Codex 路由將提供者和執行階段外掛程式邊界分開：傳統的 Codex 模型參照是由 doctor 修復的傳統設定，而套件的 `codex` 外掛程式則擁有 Canonical `openai/*` 代理程式參照、明確的 `agentRuntime.id: "codex"` 以及傳統 `codex/*` 參照的 Codex 應用程式伺服器執行階段。

當設定驗證報告過期的外掛程式 ID、允許清單/工具不相符或舊版打包外掛程式路徑時，請執行 `openclaw doctor` 或 `openclaw doctor --fix`。

## 瞭解外掛程式格式

OpenClaw 辨識兩種外掛程式格式：

| 格式                   | 載入方式                                                            | 使用時機                                         |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| 原生 OpenClaw 外掛程式 | `openclaw.plugin.json` 加上在程序中載入的執行階段模組               | 您正在安裝或建置 OpenClaw 專屬的執行階段功能     |
| 相容套件               | 對應至 OpenClaw 外掛程式庫存的 Codex、Claude 或 Cursor 外掛程式佈局 | 您正在重複使用相容的技能、指令、掛鉤或套件元數據 |

這兩種格式都會出現在 `openclaw plugins list`、`openclaw plugins inspect`、`openclaw plugins enable` 和 `openclaw plugins disable` 中。請參閱 [Plugin bundles](/zh-Hant/plugins/bundles) 以了解套件相容性界限，並參閱 [Building plugins](/zh-Hant/plugins/building-plugins) 以取得原生外掛程式撰寫資訊。

## 外掛程式掛鉤

外掛程式可以在執行階段註冊掛鉤，但有兩個具有不同作業的不同 API。

- 透過 `api.on(...)` 使用型別化 Hook 作為執行階段生命週期 Hook。這是中介軟體、原則、訊息重寫、提示詞塑形和工具控制的首選介面。
- 僅當您想要參與 [Hooks](/zh-Hant/automation/hooks) 中描述的內部 Hook 系統時，才使用 `api.registerHook(...)`。這主要用於粗略的指令/生命週期副作用，以及與現有 HOOK 樣式自動化的相容性。

快速規則：

- 如果處理程式需要優先順序、合併語意，或封鎖/取消行為，請使用類型化外掛程式鉤子。
- 如果處理程序僅對 `command:new`、`command:reset`、`message:sent` 或類似的粗略事件做出反應，則 `api.registerHook(...)` 即可。

外掛程式管理的內部 Hook 會顯示在 `openclaw hooks list` 中，並帶有 `plugin:<id>`。您無法透過 `openclaw hooks` 啟用或停用它們；請改為啟用或停用外掛程式。

## 驗證使用中的 Gateway

`openclaw plugins list` 和一般的 `openclaw plugins inspect` 會讀取冷設定、資訊清單和登錄狀態。它們無法證明正在執行的 Gateway 已匯入相同的外掛程式碼。

當外掛程式顯示已安裝，但即時聊天流量未使用它時：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

受管理的 Gateway 在外掛程式安裝、更新和解除安裝變更變更外掛程式來源後會自動重新啟動。在 VPS 或容器安裝上，請確保任何手動重新啟動都是針對實際服務您頻道的 `openclaw gateway run` 子程序，而不僅僅是包裝程式或監督程式。

## 疑難排解

| 徵狀                                                     | 檢查                                                                                                                    | 修復                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 外掛程式顯示在 `plugins list` 中，但執行階段 Hook 未執行 | 使用 `openclaw plugins inspect <id> --runtime --json` 並使用 `gateway status --deep --require-rpc` 確認使用中的 Gateway | 在安裝、更新、設定或來源變更後，重新啟動即時 Gateway                              |
| 出現重複的頻道或工具擁有權診斷                           | 執行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 檢查每個可疑的外掛，並比較通道/工具的所有權   | 停用其中一個所有者，移除過時的安裝，或使用 manifest `preferOver` 進行有意義的替換 |
| 配置表示外掛程式遺失                                     | 檢查 [Plugin inventory](/zh-Hant/plugins/plugin-inventory) 以確認其為內建、官方外部還是僅限原始碼                            | 安裝外部套件、啟用內建外掛程式，或移除過時的設定                                  |
| 安裝期間設定無效                                         | 閱讀驗證訊息，並在它指向過時的外掛狀態時執行 `openclaw doctor --fix`                                                    | Doctor 可以透過停用項目並移除無效的載荷來隔離無效的外掛程式設定                   |
| 外掛程式路徑因可疑的擁有權或權限而被封鎖                 | 檢查設定錯誤之前的診斷資訊                                                                                              | 修復檔案系統的所有權/權限，然後執行 `openclaw plugins registry --refresh`         |
| `OPENCLAW_NIX_MODE=1` 會阻擋生命週期指令                 | 確認安裝是否由 Nix 管理                                                                                                 | 請在 Nix 原始碼中變更外掛程式選擇，而不是使用外掛程式修改指令                     |
| 相依性匯入在執行時期失敗                                 | 檢查外掛程式是透過 npm/git/ClawHub 安裝，還是從本機路徑載入                                                             | 執行 `openclaw plugins update <id>`、重新安裝來源，或自行安裝本地外掛相依項       |

當過時的外掛配置仍然命名一個不再可發現的通道外掛時，Gateway 啟動會跳過該外掛支援的通道，而不是阻擋每個其他通道。執行 `openclaw doctor --fix` 以移除過時的外掛和通道條目。沒有過時外掛證據的未知通道金鑰仍然會驗證失敗，以便拼寫錯誤保持可見。

對於有意義的通道替換，首選的外掛應該使用舊版或較低優先級的外掛 id 來宣告 `channelConfigs.<channel-id>.preferOver`。如果兩個外掛都被明確啟用，OpenClaw 會保留該請求並回報重複的通道或工具診斷，而不是無聲地選擇一個所有者。

如果已安裝的套件回報它「需要 TypeScript 項目的編譯執行時期輸出
...」，表示該套件在發布時未包含 OpenClaw 在執行時期
所需的 JavaScript 檔案。請在發行者提供編譯後的 JavaScript 後更新或重新安裝，
或者在該時間點之前停用/解除安裝該外掛程式。

### 被封鎖的外掛程式路徑擁有權

如果外掛診斷顯示 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)` 並且隨後的配置驗證顯示 `plugin present but blocked`，表示 OpenClaw 發現外掛檔案的所有者與載入它們的程序是不同的 Unix 使用者。請保留外掛配置不變；修復檔案系統所有權或以擁有狀態目錄的相同使用者身分執行 OpenClaw。

對於 Docker 安裝，官方映像檔以 `node` (uid `1000`) 身分執行，因此主機 bind 掛載的 OpenClaw 配置和工作區目錄通常應由 uid `1000` 擁有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您故意以 root 身分執行 OpenClaw，請改為將受管理的
插件根目錄修復為 root 所有權：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修復所有權後，重新執行 `openclaw doctor --fix` 或 `openclaw plugins registry --refresh`，使持久化的外掛註冊表與修復後的檔案相符。

### 插件工具設定緩慢

如果 Agent 輪次在準備工具時似乎停頓，請啟用追蹤日誌並
檢查插件工具工廠的計時行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

尋找：

```text
[trace:plugin-tools] factory timings ...
```

摘要會列出總工廠時間和最慢的插件工具工廠，
包括插件 ID、宣告的工具名稱、結果形狀，以及工具是否
為可選。當單一工廠耗時至少 1 秒或總插件工具工廠準備
耗時至少 5 秒時，緩慢的行會被提升為警告。

OpenClaw 會快取成功的插件工具工廠結果，以供使用相同有效請求
內容的重複解析使用。快取鍵包括有效執行時配置、工作區、
Agent/工作階段 ID、沙箱原則、瀏覽器設定、傳遞內容、
請求者身分和所有權狀態，因此依賴這些受信任欄位的
工廠會在內容變更時重新執行。如果計時維持高位，
插件可能是在傳回工具定義之前執行耗時的工作。

如果某個插件佔據了大部分時間，請檢查其執行時註冊：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然後更新、重新安裝或停用該插件。插件作者應將
昂貴的相依性載入移至工具執行路徑之後，而不是
在工具工廠內執行。

關於相依性根目錄、套件中繼資料驗證、登錄檔記錄、啟動重新載入行為與舊版清除，請參閱[Plugin dependency resolution](/zh-Hant/plugins/dependency-resolution)。

## 相關

- [Manage plugins](/zh-Hant/plugins/manage-plugins) - 列出、安裝、更新、解除安裝與發佈的指令範例
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 完整 CLI 參考資料
- [Plugin inventory](/zh-Hant/plugins/plugin-inventory) - 產生的隨附與外部外掛清單
- [Plugin reference](/zh-Hant/plugins/reference) - 產生的各外掛參考頁面
- [Community plugins](/zh-Hant/plugins/community) - ClawHub 探索與文件 PR 政策
- [Plugin dependency resolution](/zh-Hant/plugins/dependency-resolution) - 安裝根目錄、登錄檔記錄與執行時間邊界
- [Building plugins](/zh-Hant/plugins/building-plugins) - 原生外掛撰寫指南
- [Plugin SDK overview](/zh-Hant/plugins/sdk-overview) - 執行時間註冊、掛勾與 API 欄位
- [Plugin manifest](/zh-Hant/plugins/manifest) - 資訊清單與套件中繼資料
