---
summary: "使用安裝時流程測試打包的外掛覆寫"
read_when:
  - Testing onboarding or setup flows against a locally packed plugin
  - Verifying a plugin package before publishing it
  - Replacing an automatic plugin install with a test artifact
title: "外掛安裝覆寫"
sidebarTitle: "安裝覆寫"
---

外掛安裝覆寫讓維護者能針對特定的 npm 套件或本機 npm-pack tarball 來測試安裝時的外掛安裝。這些功能僅用於端對端 (E2E) 和套件驗證。一般使用者應該使用 [`openclaw plugins install`](/zh-Hant/cli/plugins) 來安裝外掛。

<Warning>覆寫功能會執行您提供來源中的外掛程式碼。請僅在獨立的狀態目錄或可拋棄的測試機器中使用它們。</Warning>

## 環境

除非同時設定了這兩個變數，否則覆寫功能會停用：

```bash
export OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1
export OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{
  "codex": "npm-pack:/tmp/openclaw-codex-2026.5.8.tgz",
  "openclaw-web-search": "npm:@openclaw/web-search@2026.5.8"
}'
```

覆寫對應是以外掛 ID 為鍵的 JSON。值支援：

- `npm:<registry-spec>` 用於登錄檔套件以及確切版本或標籤
- `npm-pack:<path.tgz>` 用於由 `npm pack` 產生的本機 tarball

相對 `npm-pack:` 路徑會從目前的工作目錄解析。

## 行為

當安裝時流程要求安裝其 ID 出現在對應中的外掛時，OpenClaw 會使用覆寫來源，而不是目錄、捆綁或預設的 npm 來源。這適用於入門和其他使用共用安裝時外掛安裝程式的流程。

覆寫仍然會強制執行預期的外掛 ID。對應到 `codex` 的 tarball 必須安裝一個資訊清單 ID 為 `codex` 的外掛。

覆寫不會繼承官方信任來源狀態。即使目錄項目通常代表 OpenClaw 擁有的套件，覆寫仍會被視為操作員提供的測試輸入。

工作區 `.env` 檔案無法啟用安裝覆寫。請在啟動 OpenClaw 的信任 shell、CI 工作或遠端測試指令中設定這些變數。

## 套件 E2E

使用獨立的狀態目錄，以便套件安裝和安裝記錄不會接觸到您正常的 OpenClaw 狀態：

```bash
npm pack extensions/codex --pack-destination /tmp

OPENCLAW_STATE_DIR="$(mktemp -d)" \
OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1 \
OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{"codex":"npm-pack:/tmp/openclaw-codex-2026.5.8.tgz"}' \
pnpm openclaw onboard --mode local
```

驗證狀態目錄下已安裝的套件：

```bash
find "$OPENCLAW_STATE_DIR/npm/projects" -path '*/node_modules/@openclaw/codex/package.json' -print
grep -R '"@openclaw/codex"' "$OPENCLAW_STATE_DIR/npm/projects"/*/package-lock.json
```

針對即時供應商 E2E，請在啟動測試指令之前，從受信任的 shell 或 CI secret 引入真實的 API 金鑰。不要列印金鑰；僅回報來源以及金鑰是否存在。
