---
summary: "安全更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 為最新狀態。

## 建議：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），取得最新版本，執行 `openclaw doctor`，然後重新啟動閘道。

```bash
openclaw update
```

若要切換頻道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --dry-run   # preview without applying
```

`openclaw update` 不接受 `--verbose`。若要進行更新診斷，請使用
`--dry-run` 預覽計劃的操作，使用 `--json` 取得結構化結果，或
使用 `openclaw update status --json` 檢查頻道和可用性狀態。安裝程式有自己的
`--verbose` 標誌，但該標誌不是 `openclaw update` 的一部分。

`--channel beta` 偏好 beta，但當 beta 標籤缺失或舊於最新的穩定版本時，執行時會
回退到 stable/latest。如果您想要單次套件更新的原始 npm beta dist-tag，請使用 `--tag beta`。

使用 `--channel dev` 來獲取持續更新的 GitHub `main` 檢出。對於套件
更新，`--tag main` 會對應到 `github:openclaw/openclaw#main` 以執行單次操作，且
GitHub/git 來源規格會在暫存的 npm install 之前被打包成暫存壓縮檔。

對於受管理的插件，測試版通道回退會是一個警告：核心更新仍可成功，即使插件使用其記錄的預設/最新發行版，因為沒有可用的插件測試版。

請參閱 [Development channels](/zh-Hant/install/development-channels) 以了解通道語義。

## 在 npm 和 git 安裝之間切換

當您想要變更安裝類型時，請使用通道。更新程式會將您的狀態、設定、憑證和工作區保留在 `~/.openclaw` 中；它僅會變更 CLI 和閘道所使用的 OpenClaw 程式碼安裝。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

請先使用 `--dry-run` 執行以預覽確切的安裝模式切換：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 通道會確保進行 git 檢出、建置它，並從該檢出安裝全域 CLI。`stable` 和 `beta` 通道則使用套件安裝。如果閘道
已安裝，`openclaw update` 會重新整理服務中繼資料並重新啟動它，除非您傳遞 `--no-restart`。

對於具有受管理閘道服務的套件安裝，`openclaw update` 會以該服務使用的套件根目錄為目標。如果 shell `openclaw` 指令來自
不同的安裝，更新程式會列印出這兩個根目錄以及受管理服務的 Node 路徑。套件更新會使用擁有服務根目錄的套件管理器，並在替換套件之前，檢查受管理服務的 Node 是否與目標發行版引擎相容。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以跳過入門導覽。若要透過安裝程式強制使用特定的安裝類型，請傳遞 `--install-method git --no-onboard` 或
`--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 套件安裝階段之後失敗，請重新執行
安裝程式。安裝程式不會呼叫舊的更新程式；它會直接執行全域
套件安裝，並可恢復部分更新的 npm 安裝。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

若要將修復鎖定至特定版本或發行標籤，請新增 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 替代方案：手動 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

對於受監管的安裝，建議優先使用 `openclaw update`，因為它可以協調與執行中的 Gateway 服務進行套件交換。如果您在受監管的安裝中手動更新，請在套件管理器啟動之前停止受管理的 Gateway。套件管理器會就地替換檔案，否則執行中的 Gateway 可能會嘗試在套件樹狀結構暫時處於半交換狀態時載入核心或外掛檔案。在套件管理器完成後重新啟動 Gateway，以便服務識別新的安裝。

對於 root 擁有的 Linux 系統全域安裝，如果 `openclaw update` 失敗並出現 `EACCES`，且您使用系統 npm 進行修復，請在整個手動套件替換過程中保持 Gateway 停止狀態。使用您通常為該 Gateway 使用的相同 `openclaw` 設定檔旗標或環境。將 `/usr/bin/npm` 替換為擁有您主機上 root 擁有的全域前置字元的系統 npm：

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

然後驗證服務：

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

當 `openclaw update` 管理全域 npm 安裝時，它會先將目標安裝到臨時 npm 前置字元中，驗證打包的 `dist` 清單，然後將乾淨的套件樹狀結構交換到實際的全域前置字元中。這避免了 npm 將新套件覆蓋到舊套件的過時檔案上。如果安裝命令失敗，OpenClaw 會使用 `--omit=optional` 重試一次。該重試有助於原生可選相依性無法編譯的主機，同時如果備用方案也失敗，則會保持原始失敗可見。

OpenClaw 管理的 npm update 和 plugin-update 指令也會清除子 npm 程序的 npm `min-release-age` 隔離政策。npm 可能會將該政策報告為衍生的 `before` 截止；這兩者對於一般的供應鏈隔離政策都很有用，但明確的 OpenClaw 更新意味著「立即安裝選定的 OpenClaw 版本」。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 進階 npm 安裝主題

<AccordionGroup>
  <Accordion title="唯讀套件樹">
    OpenClaw 在執行時將打包的全域安裝視為唯讀，即使當前使用者對全域套件目錄擁有寫入權限。外掛套件安裝位於使用者設定目錄下 OpenClaw 擁有的 npm/git 根目錄中，且 Gateway 啟動不會變更 OpenClaw 套件樹。

    某些 Linux npm 設定會將全域套件安裝在 root 擁有的目錄下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支援該配置，因為外掛安裝/更新指令會在該全域套件目錄之外進行寫入。

  </Accordion>
  <Accordion title="加固的 systemd 單元">
    賦予 OpenClaw 對其設定/狀態根目錄的寫入權限，以便明確的外掛安裝、外掛更新和 doctor 清理能夠保存其變更：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="磁碟空間預檢">
    在套件更新和明確的外掛安裝之前，OpenClaw 會嘗試對目標磁碟區進行盡力的磁碟空間檢查。空間不足會產生包含已檢查路徑的警告，但不會阻擋更新，因為檔案系統配額、快照和網路磁碟區在檢查後可能會發生變化。實際的套件管理員安裝和安裝後驗證仍具有最終決定權。
  </Accordion>
</AccordionGroup>

## 自動更新程式

自動更新程式預設為關閉。請在 `~/.openclaw/openclaw.json` 中啟用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 頻道     | 行為                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用確定性抖動（分散推出）。 |
| `beta`   | 每 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                   |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                         |

閘道也會在啟動時記錄更新提示（可使用 `update.checkOnStart: false` 停用）。
若要降級或進行事故復原，請在閘道環境中設定 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻擋自動套用，即使已設定 `update.auto.enabled`。除非同時停用 `update.checkOnStart`，否則啟動時的更新提示仍可執行。

透過即時閘道控制平面處理程式請求的套件管理器更新，不會取代正在執行的閘道程序內的套件樹。在受管理服務的安裝中，閘道會啟動分離的交接程序並退出，然後讓一般的 `openclaw update --yes --json` CLI 路徑停止服務、取代套件、重新整理服務中繼資料、重新啟動、驗證閘道版本與連線能力，並在可能時復原已安裝但未載入的 macOS LaunchAgent。如果閘道無法安全進行該交接，`update.run` 會回報一個安全的 shell 指令，而不是在程序中執行套件管理器。

## 更新之後

<Steps>

### 執行 Doctor

```bash
openclaw doctor
```

遷移設定、稽核 DM 原則，並檢查閘道健全狀態。詳情：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動閘道

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 還原

### 鎖定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` 會顯示目前發布的版本。</Tip>

### 鎖定提交 (source)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要回到最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 請再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼結帳上的 `openclaw update --channel dev`，更新程式會在需要時自動啟動引導 `pnpm`。如果您看到 pnpm/corepack 啟動引導錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中詢問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概觀](/zh-Hant/install)：所有安裝方法。
- [Doctor](/zh-Hant/gateway/doctor)：更新後的健全狀態檢查。
- [遷移](/zh-Hant/install/migrating)：主要版本遷移指南。
