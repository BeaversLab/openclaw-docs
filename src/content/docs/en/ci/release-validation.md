---
summary: "Full Release Validation, Package Acceptance, install smoke, and Docker E2E"
title: "Release validation workflows"
read_when:
  - You are coordinating a release validation run or rerun
  - You need to validate a published package or plugin build
---

This page is an index. Release validation is documented on five pages, one
per reader job. Open the page that matches your task.

| Page                                                                                | Read it when                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Full Release Validation](/en/ci/release-validation/full-release-validation)           | The release umbrella: Validation/Tooling SHA binding, release publish, Docker Release, profiles, and recovery. |
| [Live and E2E shards](/en/ci/release-validation/live-and-e2e-shards)                   | The named live/E2E shards, their coverage, and the images they run in.                                         |
| [Package Acceptance](/en/ci/release-validation/package-acceptance)                     | Validating one installable tarball: jobs, candidate sources, suite profiles, and examples.                     |
| [Install smoke and Docker E2E](/en/ci/release-validation/install-smoke-and-docker-e2e) | Install Smoke coverage, the local Docker E2E aggregate and tunables, and release-path chunks.                  |
| [Plugin Prerelease](/en/ci/release-validation/plugin-prerelease)                       | The separate, more expensive plugin product/package suite and when it is dispatched.                           |

## Where each section moved

Every section heading from the previous single-page version keeps its anchor here, so an existing link such as `/ci/release-validation#suite-profiles` still resolves. Each entry points at the page that now holds the content.

- <a id="full-release-validation" />[Full Release Validation](/en/ci/release-validation/full-release-validation#full-release-validation)
- <a id="live-and-e2e-shards" />[Live and E2E shards](/en/ci/release-validation/live-and-e2e-shards#live-and-e2e-shards)
- <a id="package-acceptance" />[Package Acceptance](/en/ci/release-validation/package-acceptance#package-acceptance)
- <a id="jobs" />[Jobs](/en/ci/release-validation/package-acceptance#jobs)
- <a id="candidate-sources" />[Candidate sources](/en/ci/release-validation/package-acceptance#candidate-sources)
- <a id="suite-profiles" />[Suite profiles](/en/ci/release-validation/package-acceptance#suite-profiles)
- <a id="legacy-compatibility-windows" />[Legacy compatibility windows](/en/ci/release-validation/package-acceptance#legacy-compatibility-windows)
- <a id="examples" />[Examples](/en/ci/release-validation/package-acceptance#examples)
- <a id="install-smoke" />[Install smoke](/en/ci/release-validation/install-smoke-and-docker-e2e#install-smoke)
- <a id="local-docker-e2e" />[Local Docker E2E](/en/ci/release-validation/install-smoke-and-docker-e2e#local-docker-e2e)
- <a id="tunables" />[Tunables](/en/ci/release-validation/install-smoke-and-docker-e2e#tunables)
- <a id="reusable-live/e2e-workflow" /><a id="reusable-live%2Fe2e-workflow" />[Reusable live/E2E workflow](/en/ci/release-validation/install-smoke-and-docker-e2e#reusable-live%2Fe2e-workflow)
- <a id="release-path-chunks" />[Release-path chunks](/en/ci/release-validation/install-smoke-and-docker-e2e#release-path-chunks)
- <a id="plugin-prerelease" />[Plugin Prerelease](/en/ci/release-validation/plugin-prerelease#plugin-prerelease)

## Related

- [Install overview](/en/install)
- [Release channels](/en/install/development-channels)
