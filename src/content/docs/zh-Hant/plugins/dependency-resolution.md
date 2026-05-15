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

- 執行階段相依性位於外掛程式套件 `dependencies` 或
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

`openclaw plugins install npm-pack:<path.tgz>` 使用相同的受管理 npm 根目錄
來處理本機 npm-pack tarball。OpenClaw 讀取 tarball 的 npm 元資料，將其
作為複製的 `file:` 相依性加入受管理的根目錄，執行一般 npm 安裝，
然後在信任外掛程式之前驗證已安裝的鎖定檔元資料。
這旨在用於套件驗收和發行候選版本證明，其中
本機打包成品應該與其模擬的註冊表成品行為一致。

npm 可能會將傳遞相依性提升至外掛程式旁邊的 `~/.openclaw/npm/node_modules`。
OpenClaw 在信任安裝之前會掃描受管理的 npm 根目錄，並在解除安裝期間使用 npm 移除 npm 管理的套件，因此提升的
執行階段相依性會保留在受管理的清理範圍內。

導入 `openclaw/plugin-sdk/*` 的外掛程式會將 `openclaw` 宣告為對等相依性。OpenClaw 不允許 npm 將主機套件的獨立註冊表副本安裝到受管理根目錄中，因為過時的主機套件可能會在後續外掛程式安裝期間影響 npm 的對等相依性解析。受管理的 npm 安裝會跳過共用根目錄的 npm 對等相依性解析/具象化，且 OpenClaw 會在安裝、更新或解除安裝後，為宣告主機對等相依性的已安裝套件重新斷言外掛程式本地的 `node_modules/openclaw` 連結。

git 安裝會複製或重新整理儲存庫，然後執行：

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

已安裝的外掛程式接著會從該套件目錄載入，因此套件本地和父級 `node_modules` 解析的運作方式與一般的 Node 套件相同。

## 本地外掛程式

本地外掛程式被視為開發人員控制的目錄。OpenClaw 不會對它們執行 `npm install`、`pnpm install` 或相依性修復。如果本地外掛程式具有相依性，請在載入該外掛程式之前先將其安裝在該外掛程式中。

第三方 TypeScript 本地外掛程式可以使用緊急 Jiti 路徑。打包的 JavaScript 外掛程式和捆綁的內部外掛程式會透過原生的 import/require 而非 Jiti 載入。

## 啟動與重新載入

Gateway 啟動和設定重新載入絕不會安裝外掛程式相依性。它們會讀取外掛程式安裝記錄，計算進入點，並載入它。

如果執行時缺少相依性，外掛程式將無法載入，且錯誤應指向操作員採取明確的修正方法：

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` 可以清除舊版 OpenClaw 產生的相依性狀態，並在設定參照可下載外掛程式時，復原本地安裝記錄中遺失的這些外掛程式。Doctor 不會為已安裝的本地外掛程式修復相依性。

## 捆綁外掛程式

輕量級和核心關鍵的捆綁外掛程式會隨 OpenClaw 一起出貨。它們應該沒有繁重的執行時相依性樹，或者應移至 ClawHub/npm 上的可下載套件。

如需隨核心套件出貨、外部安裝或保持僅為原始碼的外掛程式目前產生清單，請參閱[外掛程式庫存](/zh-Hant/plugins/plugin-inventory)。

隨附外掛程式清單不得要求相依性暫存。大型或選用外掛程式功能應封裝為一般外掛程式，並透過與第三方外掛程式相同的 npm/git/ClawHub 路徑進行安裝。

在原始碼簽出中，OpenClaw 會將儲存庫視為 pnpm monorepo。在 `pnpm install` 之後，隨附外掛程式會從 `extensions/<id>` 載入，因此套件本機的 workspace 相依性可供使用，並且會直接採用編輯內容。原始碼簽出開發僅支援 pnpm；在儲存庫根目錄直接執行純 `npm install` 並非準備隨附外掛程式相依性的支援方式。

| 安裝形狀                       | 隨附外掛程式位置                        | 相依性擁有者                                     |
| ------------------------------ | --------------------------------------- | ------------------------------------------------ |
| `npm install -g openclaw`      | 套件內建構的執行時期樹狀結構            | OpenClaw 套件與明確的外掛程式安裝/更新/修復流程  |
| Git 簽出加上 `pnpm install`    | `extensions/<id>` workspace 套件        | pnpm workspace，包括每個外掛程式套件自己的相依性 |
| `openclaw plugins install ...` | 受管理的 npm/git/ClawHub 外掛程式根目錄 | 外掛程式安裝/更新流程                            |

## 舊版清理

較舊的 OpenClaw 版本會在啟動時或修復期間產生隨附外掛程式的相依性根目錄。目前的修復程式會在使用 `--fix` 時移除這些過時的目錄和符號連結，包括舊的 `plugin-runtime-deps` 根目錄、指向已修剪 `plugin-runtime-deps` 目標的全域 Node-prefix 套件符號連結、`.openclaw-runtime-deps*` 清單、產生的外掛程式 `node_modules`、安裝暫存目錄以及套件本機的 pnpm 儲存庫。封裝的 postinstall 也會在修剪舊版目標根目錄之前移除這些全域符號連結，以免升級後留下懸空的 ESM 套件匯入。

這些路徑僅屬舊版殘留物。新安裝作業不應建立這些路徑。
