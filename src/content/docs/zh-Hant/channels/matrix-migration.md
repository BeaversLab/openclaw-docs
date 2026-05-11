---
summary: "OpenClaw 如何就地升級先前的 Matrix 外掛，包括加密狀態恢復限制和手動恢復步驟。"
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix 遷移"
---

從先前的公開 `matrix` 外掛升級至目前的實作。

對於大多數使用者而言，此升級為就地升級：

- 外掛保持 `@openclaw/matrix`
- 頻道保持 `matrix`
- 您的配置保持在 `channels.matrix` 之下
- 快取的憑證保持在 `~/.openclaw/credentials/matrix/` 之下
- 執行時狀態保持在 `~/.openclaw/matrix/` 之下

您不需要重新命名配置金鑰或以新名稱重新安裝外掛。

## 遷移自動執行的作業

當閘道啟動時，以及當您執行 [`openclaw doctor --fix`](/zh-Hant/gateway/doctor) 時，OpenClaw 會嘗試自動修復舊的 Matrix 狀態。
在任何可操作的 Matrix 遷移步驟變更磁碟狀態之前，OpenClaw 會建立或重用專屬的恢復快照。

當您使用 `openclaw update` 時，確切的觸發條件取決於 OpenClaw 的安裝方式：

- 原始碼安裝會在更新流程中執行 `openclaw doctor --fix`，然後預設重新啟動閘道
- 套件管理器安裝會更新套件，執行非互動式檢查程序，然後依賴預設的閘道重新啟動，以便啟動時完成 Matrix 遷移
- 如果您使用 `openclaw update --no-restart`，由啟動支援的 Matrix 遷移會延後，直到您稍後執行 `openclaw doctor --fix` 並重新啟動閘道

自動遷移包含：

- 在 `~/Backups/openclaw-migrations/` 下建立或重用遷移前快照
- 重用您快取的 Matrix 憑證
- 保持相同的帳號選擇和 `channels.matrix` 配置
- 將最舊的平面 Matrix 同步儲存移至目前的帳號範圍位置
- 當目標帳號可以安全解析時，將最舊的平面 Matrix 加密儲存移至目前的帳號範圍位置
- 從舊的 rust 加密儲存中擷取先前儲存的 Matrix 房間金鑰備份解密金鑰，當該金鑰存在於本機時
- 當存取權杖稍後變更時，針對相同的 Matrix 帳戶、主伺服器和使用者重複使用最完整的現有 token-hash 儲存根目錄
- 當 Matrix 存取權杖變更但帳戶/裝置身分保持不變時，掃描相鄰的 token-hash 儲存根目錄以尋找待處理的加密狀態還原中繼資料
- 在下一次 Matrix 啟動時將備份的房間金鑰還原到新的加密儲存中

快照詳情：

- OpenClaw 在成功的快照後於 `~/.openclaw/matrix/migration-snapshot.json` 寫入一個標記檔案，以便稍後的啟動和修復過程可以重複使用相同的存檔。
- 這些自動的 Matrix 遷移快照僅備份組態 + 狀態 (`includeWorkspace: false`)。
- 如果 Matrix 只有僅警告的遷移狀態，例如因為 `userId` 或 `accessToken` 仍然缺失，OpenClaw 尚不會建立快照，因為沒有 Matrix 變更是可執行的。
- 如果快照步驟失敗，OpenClaw 將跳過該次執行的 Matrix 遷移，而不是在沒有復原點的情況下變更狀態。

關於多帳戶升級：

- 最舊的平面 Matrix 儲存 (`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`) 來自單一儲存佈局，因此 OpenClaw 只能將其遷移到一個解析的 Matrix 帳戶目標
- 已經限定帳戶範圍的舊版 Matrix 儲存會根據設定的 Matrix 帳戶進行偵測和準備

## 遷移無法自動執行的操作

先前的公開 Matrix 外掛程式**並未**自動建立 Matrix 房間金鑰備份。它會保存本機加密狀態並請求裝置驗證，但並不保證您的房間金鑰已備份到主伺服器。

這表示某些加密安裝只能部分遷移。

OpenClaw 無法自動還原：

- 從未備份過的僅限本機的房間金鑰
- 當目標 Matrix 帳戶尚無法解析時的加密狀態，因為 `homeserver`、`userId` 或 `accessToken` 仍然不可用
- 當設定了多個 Matrix 帳戶但未設定 `channels.matrix.defaultAccount` 時，自動遷移一個共用的平面 Matrix 儲存
- 固定到 repo 路徑而非標準 Matrix 套件的自訂外掛程式路徑安裝
- 當舊的儲存區有備份金鑰但未在本地保留解密金鑰時，遺失了復原金鑰

目前警告範圍：

- 自訂 Matrix 外掛路徑安裝會在閘道啟動和 `openclaw doctor` 時顯示

如果您舊的安裝中有從未備份過的僅限本地的加密歷史記錄，升級後部分較舊的加密訊息可能仍無法讀取。

## 建議的升級流程

1. 正常更新 OpenClaw 和 Matrix 外掛。
   最好使用不帶 `--no-restart` 的純 `openclaw update`，以便啟動時可以立即完成 Matrix 遷移。
2. 執行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可執行的遷移工作，doctor 會先建立或重複使用遷移前快照並列印封存路徑。

3. 啟動或重新啟動閘道。
4. 檢查目前的驗證和備份狀態：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 將您正在修復的 Matrix 帳戶的復原金鑰放入帳戶專屬的環境變數中。對於單個預設帳戶，`MATRIX_RECOVERY_KEY` 即可。對於多個帳戶，每個帳戶使用一個變數，例如 `MATRIX_RECOVERY_KEY_ASSISTANT`，並將 `--account assistant` 新增至指令中。

6. 如果 OpenClaw 提示您需要復原金鑰，請為相符的帳戶執行指令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. 如果此裝置仍未驗證，請為相符的帳戶執行指令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   如果復原金鑰已被接受且備份可用，但 `Cross-signing verified`
   仍為 `no`，請從另一個 Matrix 用戶端完成自我驗證：

   ```bash
   openclaw matrix verify self
   ```

   在另一個 Matrix 用戶端中接受請求，比較表情符號或小數，
   並僅在相符時輸入 `yes`。該指令僅在
   `Cross-signing verified` 變為 `yes` 後才會成功結束。

8. 如果您有意放棄無法復原的舊歷史記錄，並希望為未來的訊息建立一個新的備份基準，請執行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

9. 如果尚不存在伺服器端金鑰備份，請建立一個以供將來復原：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密遷移如何運作

加密遷移是一個兩階段過程：

1. 如果加密遷移是可執行的，啟動或 `openclaw doctor --fix` 會建立或重複使用遷移前快照。
2. 啟動或 `openclaw doctor --fix` 會透過作用中的 Matrix 外掛安裝檢查舊的 Matrix 加密儲存區。
3. 如果找到備份解密金鑰，OpenClaw 會將其寫入新的復原金鑰流程中，並將房間金鑰復原標記為待處理。
4. 在下次 Matrix 啟動時，OpenClaw 會自動將備份的房間金鑰復原到新的加密儲存中。

如果舊儲存報告了從未備份過的房間金鑰，OpenClaw 會發出警告，而不是假裝復原成功。

## 常見訊息及其含義

### 升級與偵測訊息

`Matrix plugin upgraded in place.`

- 含義：偵測到舊的磁碟上 Matrix 狀態，並已將其遷移至目前的佈局。
- 處理方式：除非相同的輸出也包含警告，否則無需採取任何行動。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含義：OpenClaw 在修改 Matrix 狀態之前建立了一個復原存檔。
- 處理方式：在確認遷移成功之前，請保留列印出來的存檔路徑。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含義：OpenClaw 發現了現有的 Matrix 遷移快照標記，並重用了該存檔，而不是建立重複的備份。
- 處理方式：在確認遷移成功之前，請保留列印出來的存檔路徑。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含義：舊的 Matrix 狀態存在，但 OpenClaw 無法將其對應到目前的 Matrix 帳號，因為尚未設定 Matrix。
- 處理方式：設定 `channels.matrix`，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含義：OpenClaw 找到了舊狀態，但仍然無法確定確切的目前帳號/裝置根目錄。
- 處理方式：使用有效的 Matrix 登入啟動一次閘道，或在快取的憑證存在後重新執行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含義：OpenClaw 找到了一個共享的扁平 Matrix 儲存，但它拒絕猜測哪個命名的 Matrix 帳號應該接收它。
- 處理方式：將 `channels.matrix.defaultAccount` 設定為預期的帳號，然後重新執行 `openclaw doctor --fix` 或重新啟動閘道。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含義：新的帳號範圍位置已經具有同步或加密儲存，因此 OpenClaw 沒有自動覆寫它。
- 處理方式：在手動移除或移動衝突的目標之前，請驗證目前的帳號是否正確。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- Meaning: OpenClaw tried to move old Matrix state but the filesystem operation failed.
- What to do: inspect filesystem permissions and disk state, then rerun `openclaw doctor --fix`.

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- Meaning: OpenClaw found an old encrypted Matrix store, but there is no current Matrix config to attach it to.
- What to do: configure `channels.matrix`, then rerun `openclaw doctor --fix` or restart the gateway.

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Meaning: the encrypted store exists, but OpenClaw cannot safely decide which current account/device it belongs to.
- What to do: start the gateway once with a working Matrix login, or rerun `openclaw doctor --fix` after cached credentials are available.

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Meaning: OpenClaw found one shared flat legacy crypto store, but it refuses to guess which named Matrix account should receive it.
- What to do: set `channels.matrix.defaultAccount` to the intended account, then rerun `openclaw doctor --fix` or restart the gateway.

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- Meaning: OpenClaw detected old Matrix state, but the migration is still blocked on missing identity or credential data.
- What to do: finish Matrix login or config setup, then rerun `openclaw doctor --fix` or restart the gateway.

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- Meaning: OpenClaw found old encrypted Matrix state, but it could not load the helper entrypoint from the Matrix plugin that normally inspects that store.
- What to do: reinstall or repair the Matrix plugin (`openclaw plugins install @openclaw/matrix`, or `openclaw plugins install ./path/to/local/matrix-plugin` for a repo checkout), then rerun `openclaw doctor --fix` or restart the gateway.

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- Meaning: OpenClaw found a helper file path that escapes the plugin root or fails plugin boundary checks, so it refused to import it.
- What to do: reinstall the Matrix plugin from a trusted path, then rerun `openclaw doctor --fix` or restart the gateway.

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- Meaning: OpenClaw refused to mutate Matrix state because it could not create the recovery snapshot first.
- 處理方式：解決備份錯誤，然後重新執行 `openclaw doctor --fix` 或重新啟動 gateway。

`Failed migrating legacy Matrix client storage: ...`

- 含義：Matrix 用戶端回退機制發現了舊的平面儲存，但移動失敗。OpenClaw 現在會中止該回退過程，而不是靜默地以全新的儲存重新開始。
- 處理方式：檢查檔案系統權限或衝突，保持舊狀態完好，並在修正錯誤後重試。

`Matrix is installed from a custom path: ...`

- 含義：Matrix 被固定為路徑安裝，因此主流更新不會自動將其替換為倉庫中的標準 Matrix 套件。
- 處理方式：當您想回到預設的 Matrix 外掛程式時，請使用 `openclaw plugins install @openclaw/matrix` 重新安裝。

### 加密狀態復原訊息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含義：備份的房間金鑰已成功復原至新的加密儲存中。
- 處理方式：通常不需要做任何事。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含義：部分舊房間金鑰僅存在於舊的本機儲存中，且從未上傳至 Matrix 備份。
- 處理方式：除非您能從其他已驗證的用戶端手動復原這些金鑰，否則預期部分舊的加密歷史記錄將無法使用。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key-stdin" after upgrade if they have the recovery key.`

- 含義：備份存在，但 OpenClaw 無法自動復原復原金鑰。
- 處理方式：執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含義：OpenClaw 找到了舊的加密儲存，但無法安全地檢查它以準備復原。
- 處理方式：重新執行 `openclaw doctor --fix`。如果重複出現，請保持舊的狀態目錄完好，並使用其他已驗證的 Matrix 用戶端加上 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 進行復原。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含義：OpenClaw 偵測到備份金鑰衝突，並拒絕自動覆寫目前的復原金鑰檔案。
- 處理方式：在重試任何復原指令之前，請驗證哪個復原金鑰是正確的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含義：這是舊儲存格式的硬性限制。
- 處理方式：已備份的金鑰仍可復原，但僅限本機的加密歷史記錄可能仍無法使用。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含義：新外掛程式嘗試復原，但 Matrix 傳回錯誤。
- 處理方式：執行 `openclaw matrix verify backup status`，然後如有需要使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 重試。

### 手動復原訊息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含義：OpenClaw 知道您應該有備份金鑰，但該金鑰尚未在此裝置上啟用。
- 處理方式：執行 `openclaw matrix verify backup restore`，或設定 `MATRIX_RECOVERY_KEY` 並於需要時執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Store a recovery key with 'openclaw matrix verify device --recovery-key-stdin', then run 'openclaw matrix verify backup restore'.`

- 含義：此裝置目前未儲存復原金鑰。
- 處理方式：設定 `MATRIX_RECOVERY_KEY`，執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`，然後還原備份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin' with the matching recovery key.`

- 含義：儲存的金鑰與現有的 Matrix 備份不符。
- 處理方式：將 `MATRIX_RECOVERY_KEY` 設為正確的金鑰並執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

如果您接受無法復原的舊加密歷史紀錄將會遺失，您可以改用 `openclaw matrix verify backup reset --yes` 重設目前的備份基準。當儲存的備份密鑰損壞時，此重設也可能會重新建立密鑰儲存空間，以便新備份金鑰在重新啟動後能正確載入。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin'.`

- 含義：備份存在，但此裝置尚未充分信任交叉簽署鏈。
- 處理方式：設定 `MATRIX_RECOVERY_KEY` 並執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Matrix recovery key is required`

- 含義：您在需要提供復原金鑰時，嘗試執行復原步驟卻未提供金鑰。
- 處理方式：使用 `--recovery-key-stdin` 重新執行指令，例如 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Invalid Matrix recovery key: ...`

- 含義：提供的金鑰無法解析或與預期的格式不符。
- 處理方式：使用來自您的 Matrix 用戶端或 recovery-key 檔案中的確切復原金鑰重試。

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- 含義：OpenClaw 可以套用復原金鑰，但 Matrix 尚未為此裝置建立完整的交叉簽署身分信任。請檢查指令輸出中的 `Recovery key accepted`、`Backup usable`、`Cross-signing verified` 和 `Device verified by owner`。
- 處理方式：執行 `openclaw matrix verify self`，在另一個 Matrix 用戶端中接受請求，比較 SAS，並僅在相符時輸入 `yes`。該指令會等待完整的 Matrix 身份信任後才回報成功。僅在您刻意想要取代目前的跨簽署身分時，才使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing`。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含義：秘密儲存未在此裝置上產生有效的備份工作階段。
- 處理方式：先驗證裝置，然後使用 `openclaw matrix verify backup status` 重新檢查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device --recovery-key-stdin' first.`

- 含義：此裝置在裝置驗證完成前無法從秘密儲存還原。
- 處理方式：先執行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

### 自訂外掛程式安裝訊息

`Matrix is installed from a custom path that no longer exists: ...`

- 含義：您的外掛程式安裝記錄指向一個已不存在的本機路徑。
- 處理方式：使用 `openclaw plugins install @openclaw/matrix` 重新安裝，或者如果您是從程式庫副本 執行，則使用 `openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密歷史記錄仍未回來

依序執行這些檢查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

如果備份還原成功，但某些舊房間仍然缺少歷史記錄，這些遺失的金鑰可能從未被先前的外掛程式備份。

## 如果您想針對未來的訊息重新開始

如果您接受失去無法還原的舊加密歷史記錄，並且只想要往後有一個乾淨的備份基準，請依序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之後裝置仍未驗證，請透過比較 SAS 表情符號或十進位代碼並確認相符，從您的 Matrix 用戶端完成驗證。

## 相關

- [Matrix](/zh-Hant/channels/matrix)：頻道設定與配置。
- [Matrix 推送規則](/zh-Hant/channels/matrix-push-rules)：通知路由。
- [Doctor](/zh-Hant/gateway/doctor)：健康檢查與自動遷移觸發程序。
- [遷移指南](/zh-Hant/install/migrating)：所有遷移路徑（機器搬遷、跨系統匯入）。
- [外掛程式](/zh-Hant/tools/plugin)：外掛程式安裝與註冊。
