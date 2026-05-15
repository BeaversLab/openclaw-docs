---
summary: "使用设置时安装流程测试打包的插件覆盖"
read_when:
  - Testing onboarding or setup flows against a locally packed plugin
  - Verifying a plugin package before publishing it
  - Replacing an automatic plugin install with a test artifact
title: "插件安装覆盖"
sidebarTitle: "安装覆盖"
---

插件安装覆盖允许维护者针对特定的 npm 包或本地 npm-pack tarball 测试设置时的插件安装。它们仅用于 E2E 和包验证。普通用户应使用 [`openclaw plugins install`](/zh/cli/plugins) 安装插件。

<Warning>覆盖会执行您提供的来源中的插件代码。请仅在隔离的状态目录或一次性测试机器中使用它们。</Warning>

## 环境

除非设置了这两个变量，否则覆盖功能将被禁用：

```bash
export OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1
export OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{
  "codex": "npm-pack:/tmp/openclaw-codex-2026.5.8.tgz",
  "openclaw-web-search": "npm:@openclaw/web-search@2026.5.8"
}'
```

覆盖映射是以插件 id 为键的 JSON。值支持：

- `npm:<registry-spec>` 用于注册表包以及精确版本或标签
- `npm-pack:<path.tgz>` 用于由 `npm pack` 生成的本地 tarball

相对 `npm-pack:` 路径从当前工作目录解析。

## 行为

当设置时流程请求安装其 id 出现在映射中的插件时，OpenClaw 将使用覆盖源，而不是目录、捆绑或默认的 npm 源。这适用于新手引导（新手引导）以及其他使用共享设置时插件安装程序的流程。

覆盖仍然强制执行预期的插件 id。映射到 `codex` 的 tarball 必须安装清单 id 为 `codex` 的插件。

覆盖不继承官方受信任源状态。即使目录条目通常表示 OpenClaw 拥有的包，覆盖也会被视为操作员提供的测试输入。

工作区 `.env` 文件无法启用安装覆盖。请在启动 OpenClaw 的受信任 shell、CI 作业或远程测试命令中设置这些变量。

## 包 E2E

使用隔离的状态目录，以便包安装和安装记录不会影响您的正常 OpenClaw 状态：

```bash
npm pack extensions/codex --pack-destination /tmp

OPENCLAW_STATE_DIR="$(mktemp -d)" \
OPENCLAW_ALLOW_PLUGIN_INSTALL_OVERRIDES=1 \
OPENCLAW_PLUGIN_INSTALL_OVERRIDES='{"codex":"npm-pack:/tmp/openclaw-codex-2026.5.8.tgz"}' \
pnpm openclaw onboard --mode local
```

在状态目录下验证已安装的包：

```bash
find "$OPENCLAW_STATE_DIR/npm/node_modules" -maxdepth 3 -name package.json -print
grep -R '"@openclaw/codex"' "$OPENCLAW_STATE_DIR/npm/package-lock.json"
```

对于实时提供商 E2E，在启动测试命令之前，请从受信任的 shell 或 CI 密钥中获取真实的 API 密钥。不要打印密钥；仅报告来源以及密钥是否存在。
