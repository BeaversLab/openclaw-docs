---
summary: "npmOpenClawOpenClaw 版本中 npm shrinkwrap 的通俗解释和技术详解"
read_when:
  - You want to know what npm shrinkwrap means in an OpenClaw release
  - You are reviewing package lockfiles, dependency changes, or supply-chain risk
  - You are validating root or plugin npm packages before publishing
title: "npmnpm shrinkwrap"
---

OpenClaw 源码检出使用 OpenClaw`pnpm-lock.yaml`OpenClawnpm。已发布的 OpenClaw npm
包使用 `npm-shrinkwrap.json`npm，即 npm 可发布的依赖锁定文件，因此
包安装过程使用的是发布期间审核过的依赖图。

## 简易版

Shrinkwrap 是随 npm 包一起发布的依赖树的收据。
它告诉 npm 要安装哪些确切的可传递依赖版本。

对于 OpenClaw 版本，这意味着：

- 已发布的包不会要求 npm 在安装时发明一个新的依赖图；
- 依赖变更更容易审核，因为它们会出现在锁定文件中；
- 发布验证可以测试用户将要安装的同一个图；
- 更容易在发布前发现包大小或原生依赖的意外情况。

Shrinkwrap 不是沙箱。它本身并不能使依赖变得安全，也不
能替代主机隔离、`openclaw security audit`、包
来源或安装冒烟测试。

简化的心智模型：

| 文件                  | 作用范围          | 含义                 |
| --------------------- | ----------------- | -------------------- |
| `pnpm-lock.yaml`      | OpenClaw 源码检出 | 维护者的依赖图       |
| `npm-shrinkwrap.json` | 已发布的 npm 包   | 用户的 npm 安装图    |
| `package-lock.json`   | 本地 npm 应用     | 非 OpenClaw 发布约定 |

## OpenClaw 使用它的原因

OpenClaw 是一个网关、插件主机、模型路由器和代理运行时。默认
安装可能会影响启动时间、磁盘使用、原生包下载以及
供应链暴露。

Shrinkwrap 为发布审核提供了一个稳定的边界：

- 审核者可以看到可传递依赖的变动；
- 包验证器可以拒绝意外的锁定文件偏移；
- 包验收可以使用将要发布的图进行安装测试；
- 插件包可以携带自己的锁定依赖图，而不是
  依赖根包来拥有仅插件的依赖项。

目标不是“更多的锁文件”。目标是具有明确所有权的
可重现的发布安装。

## 技术细节

根 `openclaw` npm 包和 OpenClaw 拥有的 npm 插件包在发布时包含
`npm-shrinkwrap.json`。合适的 OpenClaw 拥有的插件
包也可以使用显式的 `bundledDependencies` 发布，以便将其运行时
依赖文件包含在插件 tarball 中，而不是仅依赖于
安装时的解析。

像这样维护边界：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

生成器解析 npm 的可发布锁定格式，但拒绝生成的
尚未存在于 `pnpm-lock.yaml` 中的包版本。这保持了
pnpm 依赖项年龄、覆盖和补丁审查边界的完整性。

仅当有意刷新根包而不触及
插件包时，才使用仅限根目录的命令：

```bash
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check
```

将这些文件作为安全敏感文件进行审查：

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- 捆绑的插件依赖负载
- 任何 `package-lock.json` 差异

OpenClaw 包验证器要求新的根包 tarball 中包含 shrinkwrap。
插件 npm 发布路径会检查插件本地的 shrinkwrap，安装
包本地的捆绑依赖项，然后打包或发布。包
验证器拒绝已发布的 OpenClaw 包中的 `package-lock.json`。

要检查已发布的根包：

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

要检查 OpenClaw 拥有的插件包：

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

背景：[npm-shrinkwrap.](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json)。
