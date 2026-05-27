---
summary: "OpenClaw 如何安裝外掛程式套件並解析外掛程式相依性"
read_when:
  - You are debugging plugin package installs
  - You are changing plugin startup, doctor, or package-manager install behavior
  - You are maintaining packaged OpenClaw installs or bundled plugin manifests
title: "外掛程式相依性解析"
sidebarTitle: "相依性"
---

OpenClaw 將外掛程式相依性工作保持在安裝/更新時。執行階段載入
不會執行套件管理程式、修復相依性樹狀結構，或變更 OpenClaw
套件目錄。

## 職責分工

外掛程式套件擁有其相依性圖表：

- 執行時期相依性位於外掛程式套件 `dependencies` 或
  `optionalDependencies` 中
- SDK/核心匯入是同等或提供的 OpenClaw 匯入
- 本機開發外掛程式會攜帶其自身已安裝的相依性
- npm 和 git 外掛程式會安裝到 OpenClaw 擁有的套件根目錄

OpenClaw 僅擁有外掛程式生命週期：

- 探索外掛程式來源
- 在明確要求時安裝或更新套件
- 記錄安裝元資料
- 載入外掛程式進入點
- 當相依性遺失時，以可採取行動的錯誤失敗

## 安裝根目錄

OpenClaw 使用穩定的各來源根目錄：

- npm 套件安裝在 `~/.openclaw/npm` 下
- git 套件複製在 `~/.openclaw/git` 下
- 本機/路徑/封存安裝會被複製或參照，而不進行相依性修復

npm 安裝在 npm 根目錄中執行，並使用：

```bash
cd ~/.openclaw/npm
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` 使用相同的管理式 npm 根目錄
來處理本機 npm-pack tarball。OpenClaw 讀取 tarball 的 npm 元數據，將其以複製的 `file:` 相依性形式新增至
管理式根目錄，執行標準的 npm 安裝，
然後在信任外掛程式之前驗證已安裝的鎖定檔元數據。
這是針對套件驗收和候選版本驗證而設計的，在這種情況下，
本機打包構件應該與其模擬的登錄檔構件表現一致。

npm 可能會將傳遞相依性提升至外掛程式套件旁邊的 `~/.openclaw/npm/node_modules`。OpenClaw 在信任
安裝之前會掃描管理式 npm 根目錄，並在解除安裝期間使用 npm 移除 npm 管理的套件，因此被提升的
執行時期相依性會保留在管理式清理邊界內。

已發布的 npm 外掛程式套件可以隨附 `npm-shrinkwrap.json`。npm 在安裝期間會使用該
可發布鎖定檔，且 OpenClaw 的管理式 npm 根目錄透過標準的 npm 安裝路徑支援它。
OpenClaw 擁有的可發布外掛程式套件
必須包含從該外掛程式套件的已發布相依性圖表產生的
套件本機 shrinkwrap：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

產生器會移除外掛程式 `devDependencies`，套用工作區覆寫
原則，並為每個
`publishToNpm` 外掛程式寫入 `extensions/<id>/npm-shrinkwrap.json`。第三方外掛程式套件也可能隨附 shrinkwrap；
OpenClaw 不要求社群套件必須包含它，但如果存在，npm 會尊重它。

OpenClaw 擁有的 npm 插件套件也可以使用明確的 `bundledDependencies` 進行發布。npm 發布路徑會覆蓋執行時相依性名稱列表，從已發布的套件清單中移除僅供開發使用的工作區元數據，針對套件本地的執行時相依性執行不執行腳本的 npm install，然後將包含這些相依性文件的插件 tarball 進行打包或發布。包含大量原生模組的套件，包括 Codex 和 ACP 執行時，會透過 `openclaw.release.bundleRuntimeDependencies: false` 選擇不加入；這些套件仍然會發布其 shrinkwrap，但 npm 會在安裝期間解析執行時相依性，而不是將每個平台的二進位文件都嵌入插件 tarball 中。根 `openclaw` 套件不會打包其完整的相依性樹。

匯入 `openclaw/plugin-sdk/*` 的插件會將 `openclaw` 宣告為 peer 相依性。OpenClaw 不允許 npm 將主機套件的獨立註冊表副本安裝到受管理的根目錄中，因為過時的主機套件可能會影響後續插件安裝期間的 npm peer 解析。受管理的 npm 安裝會跳過共享根目錄的 npm peer 解析/具體化，並且 OpenClaw 會在安裝、更新或解除安裝後，為宣告主機 peer 的已安裝套件重新斷言插件本地的 `node_modules/openclaw` 連結。

git 安裝會複製或刷新儲存庫，然後執行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

已安裝的插件隨後會從該套件目錄載入，因此套件本地和父層 `node_modules` 解析的運作方式與一般 Node 套件相同。

## 本地插件

本地插件被視為由開發者控制的目錄。OpenClaw 不會為它們執行 `npm install`、`pnpm install` 或相依性修復。如果本地插件具有相依性，請在載入它之前在該插件中安裝這些相依性。

第三方 TypeScript 本地插件可以使用緊急 Jiti 路徑。打包的 JavaScript 插件和捆綁的內部插件透過原生 import/require 而非 Jiti 載入。

## 啟動和重新載入

Gateway 啟動和設定重新載入絕不會安裝插件相依性。它們會讀取插件安裝記錄，計算入口點，並載入它。

如果在執行時缺少相依性，插件將無法載入，且錯誤應指向操作員進行明確的修復：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 可以清理舊版 OpenClaw 生成的依賴狀態，並在設定參照到它們時，恢復本機安裝記錄中缺失的可下載外掛程式。Doctor 不會修復已安裝之本機外掛程式的依賴。

## 隨附外掛程式

輕量級且核心關鍵的隨附外掛程式會隨 OpenClaw 一起發佈。它們應該沒有繁重的執行時依賴樹，或者是被移至 ClawHub/npm 上的可下載套件。

如需目前在核心套件中發佈、外部安裝或僅保留原始碼的外掛程式產生清單，請參閱 [Plugin inventory](/zh-Hant/plugins/plugin-inventory)。

隨附外掛程式清單不得請求依賴暫存。大型或選用的外掛程式功能應打包為一般外掛程式，並透過與第三方外掛程式相同的 npm/git/ClawHub 路徑進行安裝。

在原始碼結帳中，OpenClaw 會將儲存庫視為 pnpm monorepo。在 `pnpm install` 之後，隨附外掛程式會從 `extensions/<id>` 載入，因此套件本機的工作區依賴項可用，並且會直接採用編輯內容。原始碼結帳開發僅支援 pnpm；在儲存庫根目錄直接使用一般 `npm install` 並非準備隨附外掛程式依賴項的支援方式。

| 安裝形態                       | 隨附外掛程式位置                        | 依賴項擁有者                                       |
| ------------------------------ | --------------------------------------- | -------------------------------------------------- |
| `npm install -g openclaw`      | 套件內建的執行時樹                      | OpenClaw 套件與明確的外掛程式安裝/更新/doctor 流程 |
| Git 結帳加上 `pnpm install`    | `extensions/<id>` 工作區套件            | pnpm 工作區，包括每個外掛程式套件自身的依賴項      |
| `openclaw plugins install ...` | 受管理的 npm/git/ClawHub 外掛程式根目錄 | 外掛程式安裝/更新流程                              |

## 舊版清理

較舊的 OpenClaw 版本在啟動時或醫生修復期間會生成捆綁插件依賴根。當使用 `--fix` 時，目前的醫生清理會移除這些過時的目錄和符號連結，包括舊的 `plugin-runtime-deps` 根、指向已修剪 `plugin-runtime-deps` 目標的全域 Node-prefix 套件符號連結、`.openclaw-runtime-deps*` 清單、生成的插件 `node_modules`、安裝階段目錄以及套件本機 pnpm 存儲庫。打包的 postinstall 也會在修剪舊版目標根之前移除這些全域符號連結，以免升級後留下懸空的 ESM 套件匯入。

這些路徑僅是舊版殘留物。新安裝不應建立它們。
