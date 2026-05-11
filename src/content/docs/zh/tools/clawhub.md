---
summary: "ClawHub：用于 OpenClaw skills 和 plugins 的公共注册表、本机安装流程以及 clawhub OpenClaw"
read_when:
  - Searching for, installing, or updating skills or plugins
  - Publishing skills or plugins to the registry
  - Configuring the clawhub CLI or its environment overrides
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub 是 **OpenClaw Skills 和插件** 的公共注册表。

- 使用本机 `openclaw` 命令搜索、安装和更新 skills，并从 ClawHub 安装 plugins。
- 使用单独的 `clawhub` CLI 进行注册表身份验证、发布、删除/取消删除和同步工作流。

站点：[clawhub.ai](https://clawhub.ai)

## 快速开始

<Steps>
  <Step title="搜索">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="安装">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="使用">
    启动一个新的 OpenClaw 会话 — 它将获取新的 skill。
  </Step>
  <Step title="发布（可选）">
    对于需要注册表身份验证的工作流（发布、同步、管理），请安装
    单独的 `clawhub` CLI：

    ```bash
    npm i -g clawhub
    # or
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## 原生 OpenClaw 流程

<Tabs>
  <Tab title="Skills">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生 `openclaw` 命令会安装到您当前的活动工作区中，并
    保留源元数据，以便后续的 `update` 调用可以继续停留在 ClawHub 上。

  </Tab>
  <Tab title="Plugins">
    ```bash
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    也会在 npm 之前尝试针对 ClawHub 解析裸 npm 安全 plugin 规范：

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    当您想要仅通过 npm 解析而不进行
    ClawHub 查找时，请使用 `npm:<package>`：

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    Plugin 安装会在运行存档安装之前验证声明的 `pluginApi` 和
    `minGatewayVersion` 兼容性，因此
    不兼容的主机会提前封闭失败，而不是部分安装
    该软件包。

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` 仅接受可安装的插件
系列。如果 ClawHub 包实际上是 skill，OpenClaw 会停止并
指向 `openclaw skills install <slug>`。

匿名 ClawHub 插件安装对于私有包也会失败关闭。
社区或其他非官方渠道仍可安装，但 OpenClaw
会发出警告，以便操作员在启用之前审查来源和验证信息。

</Note>

## 什么是 ClawHub

- OpenClaw Skills 和插件的公共注册表。
- Skill 包和元数据的版本化存储。
- 用于搜索、标签和使用信号发现的界面。

典型的 Skill 是包含以下内容的版本化文件包：

- 包含主要描述和用法的 `SKILL.md` 文件。
- Skill 使用的可选配置、脚本或支持文件。
- 元数据，如标签、摘要和安装要求。

ClawHub 利用元数据来驱动发现并安全地暴露 Skill
功能。注册表跟踪使用信号（星标、下载量）以
提高排名和可见性。每次发布都会创建一个新的 semver
版本，注册表保留版本历史记录以便用户审计
更改。

## 工作区和 Skill 加载

独立的 `clawhub` CLI 还会将 Skills 安装到当前工作目录下的
`./skills` 中。如果配置了 OpenClaw 工作区，
除非你覆盖 `--workdir`
（或 `CLAWHUB_WORKDIR`），否则 `clawhub` 将回退到该工作区。OpenClaw 从
`<workspace>/skills` 加载工作区 Skills，并
在**下一次**会话中获取它们。

如果你已经使用 `~/.openclaw/skills` 或捆绑的 Skills，工作区
Skills 优先。有关如何加载、共享和
限制 Skills 的更多详细信息，请参阅 [Skills](/zh/tools/skills)。

## 服务功能

| 功能           | 说明                                      |
| -------------- | ----------------------------------------- |
| 公共浏览       | Skills 及其 `SKILL.md` 内容是公开可见的。 |
| 搜索           | 基于嵌入（向量搜索），而不仅仅是关键字。  |
| 版本控制       | Semver、变更日志和标签（包括 `latest`）。 |
| 下载           | 每个版本的 Zip 包。                       |
| 星标和评论     | 社区反馈。                                |
| 审核           | 批准和审计。                              |
| CLI 友好的 API | 适用于自动化和脚本编写。                  |

## 安全和审核

ClawHub 默认是开放的 —— 任何人都可以上传技能，但 GitHub
账号必须**注册至少一周**才能发布。这可以在不阻碍合法贡献者的情况下减缓滥用行为。

<AccordionGroup>
  <Accordion title="Reporting">- 任何登录用户都可以举报一个技能。 - 必须提供并记录举报原因。 - 每个用户同时最多可以拥有 20 个活跃的举报。 - 超过 3 个独立举报的技能默认会被自动隐藏。</Accordion>
  <Accordion title="Moderation">- 审核员可以查看隐藏的技能、取消隐藏、删除它们或封禁用户。 - 滥用举报功能可能导致账号被封禁。 - 有兴趣成为审核员？请在 OpenClaw Discord 中询问，并联系审核员或维护者。</Accordion>
</AccordionGroup>

## ClawHub CLI

仅在需要注册表身份验证的工作流程（如发布/同步）时才需要此功能。

### 全局选项

<ParamField path="--workdir <dir>" type="string">
  工作目录。默认：当前目录；回退到 OpenClaw 工作区。
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  技能目录，相对于工作目录。
</ParamField>
<ParamField path="--site <url>" type="string">
  站点基础 URL（浏览器登录）。
</ParamField>
<ParamField path="--registry <url>" type="string">
  注册表 API 基础 URL。
</ParamField>
<ParamField path="--no-input" type="boolean">
  禁用提示（非交互式）。
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  打印 CLI 版本。
</ParamField>

### 命令

<AccordionGroup>
  <Accordion title="Auth (login / logout / whoami)">
    ```bash
    clawhub login              # browser flow
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    登录选项：

    - `--token <token>` — 粘贴 API 令牌。
    - `--label <label>` — 为浏览器登录令牌存储的标签（默认：`CLI token`）。
    - `--no-browser` — 不打开浏览器（需要 `--token`）。

  </Accordion>
  <Accordion title="搜索">
    ```bash
    clawhub search "query"
    ```

    - `--limit <n>` — 最大结果数。

  </Accordion>
  <Accordion title="安装 / 更新 / 列表">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    选项：

    - `--version <version>` — 安装或更新到特定版本（在 `update` 上仅支持单个 slug）。
    - `--force` — 如果文件夹已存在，或者本地文件与任何已发布的版本不匹配时，则覆盖。
    - `clawhub list` 读取 `.clawhub/lock.json`。

  </Accordion>
  <Accordion title="发布技能">
    ```bash
    clawhub skill publish <path>
    ```

    选项：

    - `--slug <slug>` — 技能 slug。
    - `--name <name>` — 显示名称。
    - `--version <version>` — semver 版本。
    - `--changelog <text>` — 更新日志文本（可以为空）。
    - `--tags <tags>` — 逗号分隔的标签（默认：`latest`）。

  </Accordion>
  <Accordion title="发布插件">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref` 或
    GitHub URL。

    选项：

    - `--dry-run` — 构建确切的发布计划而不上传任何内容。
    - `--json` — 输出可供 CI 读取的机器可读输出。
    - `--source-repo`、`--source-commit`、`--source-ref` — 当自动检测不够时的可选覆盖项。

  </Accordion>
  <Accordion title="删除 / 恢复（所有者或管理员）">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="Sync (scan local + publish new or updated)">
    ```bash
    clawhub sync
    ```

    Options:

    - `--root <dir...>` — 额外的扫描根目录。
    - `--all` — 无提示上传所有内容。
    - `--dry-run` — 显示将要上传的内容。
    - `--bump <type>` — 更新的 `patch|minor|major`（默认：`patch`）。
    - `--changelog <text>` — 非交互式更新的变更日志。
    - `--tags <tags>` — 逗号分隔的标签（默认：`latest`）。
    - `--concurrency <n>` — 注册表检查（默认：`4`）。

  </Accordion>
</AccordionGroup>

## 常见工作流

<Tabs>
  <Tab title="Search">```bash clawhub search "postgres backups" ```</Tab>
  <Tab title="Install">```bash clawhub install my-skill-pack ```</Tab>
  <Tab title="Update all">```bash clawhub update --all ```</Tab>
  <Tab title="Publish a single skill">```bash clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest ```</Tab>
  <Tab title="Sync many skills">```bash clawhub sync --all ```</Tab>
  <Tab title="从 GitHub 发布插件">```bash clawhub package publish your-org/your-plugin --dry-run clawhub package publish your-org/your-plugin clawhub package publish your-org/your-plugin@v1.0.0 clawhub package publish https://github.com/your-org/your-plugin ```</Tab>
</Tabs>

### 插件包元数据

代码插件必须在
`package.json` 中包含必需的 OpenClaw 元数据：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

发布的包应附带 **已构建的 JavaScript** 并将
`runtimeExtensions` 指向该输出。当没有已构建的文件时，Git 检出安装仍然可以回退到 TypeScript 源代码，但在启动、诊断和
插件加载路径中，构建的运行时条目可以避免运行时 TypeScript 编译。

## 版本控制、锁定文件和遥测

<AccordionGroup>
  <Accordion title="版本控制和标签">
    - 每次发布都会创建一个新的 **semver** `SkillVersion`。
    - 标签（例如 `latest`）指向某个版本；移动标签可以让你回滚。
    - 变更日志按版本附加，在同步或发布更新时可以为空。
  </Accordion>
  <Accordion title="本地更改与注册表版本">
    更新会使用内容哈希将本地技能内容与注册表版本进行比较。
    如果本地文件与任何已发布的版本不匹配，
    CLI 会在覆盖之前询问（或在非交互式运行中要求 `--force`）。
  </Accordion>
  <Accordion title="同步扫描和备用根目录">
    `clawhub sync` 首先扫描你当前的工作目录。如果没有找到
    技能，它会回退到已知的旧版位置（例如
    `~/openclaw/skills` 和 `~/.openclaw/skills`）。这是为了在不使用额外标志的情况下
    找到较旧的技能安装而设计的。
  </Accordion>
  <Accordion title="存储和锁定文件">
    - 已安装的技能记录在 `.clawhub/lock.json` 下的你工作目录中。
    - 认证令牌存储在 ClawHub CLI 配置文件中（可通过 `CLAWHUB_CONFIG_PATH` 覆盖）。
  </Accordion>
  <Accordion title="遥测（安装计数）">
    当你在登录状态下运行 `clawhub sync` 时，CLI 会发送一个最小化的
    快照以计算安装计数。你可以完全禁用此功能：

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

| 变量                          | 作用                           |
| ----------------------------- | ------------------------------ |
| `CLAWHUB_SITE`                | 覆盖站点 URL。                 |
| `CLAWHUB_REGISTRY`            | 覆盖注册表 API URL。           |
| `CLAWHUB_CONFIG_PATH`         | 覆盖 CLI 存储令牌/配置的位置。 |
| `CLAWHUB_WORKDIR`             | 覆盖默认工作目录。             |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 在 `sync` 上禁用遥测。         |

## 相关

- [社区插件](/zh/plugins/community)
- [插件](/zh/tools/plugin)
- [Skills](/zh/tools/skills)
