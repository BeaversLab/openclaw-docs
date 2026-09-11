---
summary: "Index of the OpenClaw testing kit, one page per reader job"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Testing"
---

OpenClaw has three Vitest suites (unit/integration, e2e, live) plus Docker
runners. This page covers what each suite covers, which command to run for a
given workflow, how live tests discover credentials, and how to add
regressions for real-world provider/model bugs.

<Note>
**QA stack (qa-lab, qa-channel, live transport lanes)** is documented separately:

- [QA overview](/en/concepts/qa-e2e-automation) - architecture, command surface, scenario authoring, and the Matrix live lane.
- [Maturity scorecard](/en/maturity/scorecard) - how release QA evidence supports stability and LTS decisions.
- [QA channel](/en/channels/qa-channel) - the synthetic transport plugin used by repo-backed scenarios.

This page covers the regular test suites and Docker/Parallels runners. [QA-specific runners](#qa-specific-runners) below lists the concrete `qa` invocations and points back at the references above.
</Note>

This page is an index. The testing kit is documented on six pages, one per
reader job. Open the page that matches your task.

| Page                                                                | Read it when                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Test suites and commands](/en/help/testing/suites)                    | You need to pick a suite, a command, or the offline regression checks.              |
| [Live and Docker/Parallels workflows](/en/help/testing/live-workflows) | You are debugging a real provider or model through a live Docker or Parallels lane. |
| [Docker test runners](/en/help/testing/docker)                         | You want the Docker "works in Linux" lanes, their scheduler, and their env vars.    |
| [QA-specific runners](/en/help/testing/qa-runners)                     | You are running a QA Lab lane or need the shared Convex credential contract.        |
| [Contract tests](/en/help/testing/contracts)                           | You changed a channel, provider, or plugin-sdk surface.                             |
| [Writing and adding tests](/en/help/testing/writing-tests)             | You are writing a test, a regression, or a reliability eval.                        |

## Where each section moved

Every section heading from the previous single-page version keeps its anchor
here, so an existing link such as `/help/testing#qa-specific-runners` still
resolves. Each entry points at the page that now holds the content.

- <a id="quick-start" />[Quick start](/en/help/testing/suites#quick-start)
- <a id="test-temp-directories" />[Test Temp Directories](/en/help/testing/writing-tests#test-temp-directories)
- <a id="live-and-docker%2Fparallels-workflows" /><a id="live-and-docker/parallels-workflows" />[Live and Docker/Parallels workflows](/en/help/testing/live-workflows#live-and-docker/parallels-workflows)
- <a id="qa-specific-runners" />[QA-specific runners](/en/help/testing/qa-runners#qa-specific-runners)
- <a id="shared-telegram-credentials-via-convex-(v1)" /><a id="shared-telegram-credentials-via-convex-v1" />[Shared Telegram credentials via Convex (v1)](/en/help/testing/qa-runners#shared-telegram-credentials-via-convex-v1)
- <a id="adding-a-channel-to-qa" />[Adding a channel to QA](/en/help/testing/qa-runners#adding-a-channel-to-qa)
- <a id="test-suites-(what-runs-where)" /><a id="test-suites-what-runs-where" />[Test suites (what runs where)](/en/help/testing/suites#test-suites-what-runs-where)
- <a id="unit-%2F-integration-(default)" /><a id="unit-/-integration-default" />[Unit / integration (default)](/en/help/testing/suites#unit-/-integration-default)
- <a id="projects-shards-and-scoped-lanes" />[Projects, shards, and scoped lanes](/en/help/testing/suites#projects-shards-and-scoped-lanes)
- <a id="embedded-runner-coverage" />[Embedded runner coverage](/en/help/testing/suites#embedded-runner-coverage)
- <a id="vitest-pool-and-isolation-defaults" />[Vitest pool and isolation defaults](/en/help/testing/suites#vitest-pool-and-isolation-defaults)
- <a id="fast-local-iteration" />[Fast local iteration](/en/help/testing/suites#fast-local-iteration)
- <a id="perf-debugging" />[Perf debugging](/en/help/testing/suites#perf-debugging)
- <a id="stability-(gateway)" /><a id="stability-gateway" />[Stability (gateway)](/en/help/testing/suites#stability-gateway)
- <a id="e2e-(repo-aggregate)" /><a id="e2e-repo-aggregate" />[E2E (repo aggregate)](/en/help/testing/suites#e2e-repo-aggregate)
- <a id="e2e-(gateway-smoke)" /><a id="e2e-gateway-smoke" />[E2E (gateway smoke)](/en/help/testing/suites#e2e-gateway-smoke)
- <a id="e2e-(control-ui-mocked-browser)" /><a id="e2e-control-ui-mocked-browser" />[E2E (Control UI mocked browser)](/en/help/testing/suites#e2e-control-ui-mocked-browser)
- <a id="e2e%3A-openshell-backend-smoke" /><a id="e2e-openshell-backend-smoke" />[E2E: OpenShell backend smoke](/en/help/testing/suites#e2e-openshell-backend-smoke)
- <a id="live-(real-providers-%2B-real-models)" /><a id="live-real-providers-+-real-models" />[Live (real providers + real models)](/en/help/testing/suites#live-real-providers-+-real-models)
- <a id="which-suite-should-i-run%3F" /><a id="which-suite-should-i-run" />[Which suite should I run?](/en/help/testing/suites#which-suite-should-i-run)
- <a id="live-(network-touching)-tests" /><a id="live-network-touching-tests" />[Live (network-touching) tests](/en/help/testing/suites#live-network-touching-tests)
- <a id="docker-runners-(optional-%22works-in-linux%22-checks)" /><a id="docker-runners-optional-works-in-linux-checks" />[Docker runners (optional "works in Linux" checks)](/en/help/testing/docker#docker-runners-optional-works-in-linux-checks)
- <a id="docs-sanity" />[Docs sanity](/en/help/testing/suites#docs-sanity)
- <a id="offline-regression-(ci-safe)" /><a id="offline-regression-ci-safe" />[Offline regression (CI-safe)](/en/help/testing/suites#offline-regression-ci-safe)
- <a id="agent-reliability-evals-(skills)" /><a id="agent-reliability-evals-skills" />[Agent reliability evals (skills)](/en/help/testing/writing-tests#agent-reliability-evals-skills)
- <a id="contract-tests-(plugin-and-channel-shape)" /><a id="contract-tests-plugin-and-channel-shape" />[Contract tests (plugin and channel shape)](/en/help/testing/contracts#contract-tests-plugin-and-channel-shape)
- <a id="commands" />[Commands](/en/help/testing/contracts#commands)
- <a id="channel-contracts" />[Channel contracts](/en/help/testing/contracts#channel-contracts)
- <a id="provider-contracts" />[Provider contracts](/en/help/testing/contracts#provider-contracts)
- <a id="when-to-run" />[When to run](/en/help/testing/contracts#when-to-run)
- <a id="adding-regressions-(guidance)" /><a id="adding-regressions-guidance" />[Adding regressions (guidance)](/en/help/testing/writing-tests#adding-regressions-guidance)

## Related

- [Testing live](/en/help/testing-live)
- [Testing updates and plugins](/en/help/testing-updates-plugins)
- [CI](/en/ci)
- [OpenClaw agent runtime workflow](/en/openclaw-agent-runtime) - the build, test, and live-validation loop for agent runtime code in `src/agents/`
