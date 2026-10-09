The application itself is plain HTML, CSS and JavaScript and runs offline without installed packages.

## Features

- Searchable hardware catalogue spanning NVIDIA, AMD and Apple configurations, plus custom GPU memory, bandwidth, RAM and multi-GPU counts.
- Multiple Mac mini, MacBook Pro and Mac Studio variants with differentiated memory sizes, GPU-core configurations and unified-memory bandwidth where applicable.
- Single-screen visualisation workspace with a compact configuration rail, live context controls, KV precision and memory-fit metrics. No switching between tabs is required. Hardware, model, agent workload, costs, advanced settings and detailed analysis open as on-demand side drawers.
- GPU-memory tiles always use **8 rows** and capacity-dependent columns. Up to 40 columns (320 tiles) fit inside a bounded memory panel; each tile displays only one allocation category, using midpoint rounding when allocations do not align to tile boundaries. The GiB ruler underneath runs from zero to the exact calculated usable GPU/Metal memory capacity.
- Hovering a tile shows its memory interval and single represented category. Tile size, count and ruler update with GPU selection, GPU count and the Apple Metal budget; the legend retains exact allocation totals.
- Context donut and token allocation, plus a clickable visual hardware fit comparison.
- Searchable profiles for widely used open-weight model families (Qwen, Llama, Gemma, DeepSeek, Mistral, Phi and gpt-oss), with editable GGUF size, FP16 KV footprint, native context and optional weights.
- FP16, Q8_0 and Q4_0 KV cache compression with block-format storage overhead.
- Configurable reserves, runtimes, CPU layer offloading, KV cache offloading, automatic RAM spill and Apple unified memory budget.
- Live GPU memory allocation, GPU-only context ceiling and context-runway graph.
- Agent prompt + tool output + generation token budget, with user-adjustable prefill assumptions.
- **Context modes:** Simulation displays manually configured illustrative token allocations. Measured imports JSON/JSONL from Ollama or llama.cpp completion responses and displays runtime-reported prompt/output counts, cached tokens (where supplied) and measured throughput. Runtime context size is shown only if present in the import; otherwise utilisation remains unknown.
- Optional Ollama `/api/ps` snapshots (matched by model) provide reported model VRAM residency and runtime context length. Model residency is **not** total GPU utilisation, and runtime responses cannot reliably split input into system, tool and file tokens.
- A/B comparison mode shows the current configuration and a selected alternative side by side, each with independent GPU and model options, rulers and memory allocations. The B scenario can override context, KV cache, memory, model sizes, RAM offloading and optional weights without changing A. Both selectors are searchable.
- Scenario-only bandwidth-based token-rate ceiling, speculative-decoding multiplier and optional local-vs-hosted cost model.
- Prominent **Custom GPU** and **Custom model** actions automatically reveal full settings drawers, including high-range numeric inputs. Custom GPU settings support discrete or unified memory, multiple GPUs, RAM, bandwidth and Metal memory budgets. Exported JSON includes the selected configuration and, when enabled, the alternative comparison scenario.

## How the calculations work

GPU hardware typically reports VRAM in **GiB**, although cards are marketed in GB. GGUF file sizes here are entered as **decimal GB**. Conversion: `weightsGiB = weightsGB * 1e9 / 2^30`. GPU capacity for discrete GPUs is configured memory x GPU count. For Apple it is nominal unified memory x an editable working-set percentage, not a guaranteed Apple or Metal limit.

`kvGiB = contextTokens * fp16KiBPerToken * cacheStorageRatio / 1048576`

Cache ratio: FP16 = 1, GGML Q8_0 = 34/64 (32 values + scale per block), Q4_0 = 18/64.

`gpuDemandGiB = gpuWeightsGiB + gpuKVGiB + optionalFilesGiB + (reservedGiB + runtimeOverheadGiB) * gpuCount`

The maximum GPU-only context is the native model context limit capped by remaining GPU memory divided by the selected KV-cache footprint. It is not proof a model can reach that length with acceptable quality or speed.

For the decode upper-bound proxy, the calculator uses an illustrative bandwidth heuristic, **not a benchmark**. Memory demand and GPU-only context remain estimates even when observed runtime usage is imported.

## Memory bandwidth, decoding, and token throughput

During autoregressive **decode**, a simple single-stream inference traffic model estimates three transfers per generated token:

- **Weight reads:** approximately the model weight-file size, in decimal GB, assuming the full model is streamed once per token. Real runtimes may cache, fuse, batch or partition weights.
- **KV-cache reads:** the number of previously active context tokens multiplied by the selected per-token KV footprint and a configurable **KV scan factor** (default 100%). Switch between **average active workload** and **entire allocated context**. This controls estimated memory traffic, not memory *allocation*.
- **KV-cache writes:** roughly one new token's quantised KV footprint per generated token. This is usually smaller than reads but is not zero.

The **ideal bandwidth ceiling** is a scenario-only bound:

    ideal decode tok/s = shared memory bandwidth (GB/s) / (weight read GB + KV read GB + KV write GB)

The configured GPU bandwidth is the **aggregate theoretical memory traffic budget for both reads and writes**, not separate simultaneous read and write ratings. Actual speed also depends on compute kernels, batching, cache locality, GPU/CPU transfers and runtime. The **scenario speed** applies manually selected bandwidth utilisation and optional multi-token prediction gains; these are not measured speed guarantees, and GPU offloaded cases have no credible scenario estimate.

**Prefill versus decode:** processing a prompt uses highly parallel operations and is influenced by compute throughput and software, so do not infer prompt-processing tokens/second directly from memory bandwidth. The time-to-first-token field requires a user-entered measured prefill rate. Decode time is only estimated from selected output tokens and hypothetical decode throughput. These phases must not be combined without a measured prefill rate.

The main workspace's bandwidth card shows model weight reads, KV reads, new-token KV writes, bandwidth and tokens/second. Change **KV read size** and **KV scan factor** to explore long-context pressure; use **Tune speed** for efficiency, MTP, and prefill controls. **Compare devices** returns to the original hardware-fit grid. Measured Ollama or llama.cpp decode TPS from an imported response is separately labelled, and need not describe the selected simulated model or GPU.

### Interpretation

- Memory **capacity** determines whether weights + KV context + overhead fit, while **memory bandwidth** constrains a hypothetical decoding ceiling.
- Compressing model weights mainly reduces weight reads; quantising KV cache reduces KV reads and writes, but quantisation quality and backend support must be evaluated.
- A faster advertised bandwidth number cannot guarantee faster inference, especially during prompt prefill or when memory is offloaded.
- On Apple silicon, the memory is unified and some capacity remains occupied by the OS; the Metal working-set percentage is an assumption rather than a fixed VRAM entitlement.
- Multi-GPU tensor splitting is idealised and ignores PCIe/interconnect overhead; layer splitting and offloading can have different performance.

## Import measured runtime data

Choose **Measured → Import data** in the context panel. Paste a final Ollama /api/generate or /api/chat JSON response, or a llama.cpp /completion or /v1/chat/completions result. JSONL imports use the last record with complete counters.

Measured mode shows reported prompt/output token counts, cached prompt tokens and throughput when present. Context utilisation is only calculated when the imported runtime reports its window size. The **Simulation vs observed** panel keeps manually configured workload and estimated GPU demand separately labelled.

Optionally combine the Ollama response with GET /api/ps: a JSON object with keys **response** (final completion) and **ps** (running-model snapshot). Matching model names attach size_vram and context_length where available. size_vram is model residency, **not** the full GPU memory footprint. /api/ps alone is insufficient to show per-request token counts.

Inputs are processed locally in the browser and are not sent to a server. Remove sensitive prompts and replies before importing. Maximum import size is 2 MB.

Documentation: [Ollama usage](https://github.com/ollama/ollama/blob/main/docs/api/usage.mdx), [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md), [llama.cpp server response timings](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).

Run npm test for simulator, parser and UI tests. The app has no runtime dependencies.

## Default startup configuration

The startup and **Reset defaults** preset uses **NVIDIA RTX 5090 (32 GiB VRAM, 1,792 GB/s memory bandwidth)** and the illustrative **Qwen3.8-27B compact-quantisation model** (11.8 decimal GB weight-file estimate). The initial context is 65,536 tokens. These are capacity-planning assumptions, not inference benchmarks. **Optimise 16 GB** explicitly changes to the RTX 5060 Ti and uses a reduced KV cache footprint.

## Publish on GitHub Pages

The app is static and needs no API keys or application server. Repository: [BashirTowdiee/ModelHardwareCalculator](https://github.com/BashirTowdiee/ModelHardwareCalculator).

1. Open the repository's **Settings → Pages → Build and deployment**, and select **GitHub Actions** as the source (if it has not already been selected).
2. The workflow at .github/workflows/pages.yml runs automatically on pushes to main; it can also be started from the **Actions** tab using **Run workflow**.
3. The workflow installs Node 22 dependencies with npm ci, runs all regression tests, builds the static site with npm run build, and deploys **only** the dist/ output via GitHub's Pages actions.
4. After a successful **Publish Pages site** job, open the deployment URL from the workflow's github-pages environment. For this repository, the expected project-site URL is [https://bashirtowdiee.github.io/ModelHardwareCalculator/](https://bashirtowdiee.github.io/ModelHardwareCalculator/). A URL is not proof the deployment has completed; verify the GitHub Actions status first.

Local commands:

- npm ci — install dependencies for tests.
- npm test — run calculation, runtime-measurement, interface and static publishing tests.
- npm run build — create dist/ with index.html, referenced CSS/JS, and .nojekyll.
- python3 -m http.server 8000 --directory dist — preview locally at http://localhost:8000/ (outside sandboxes that block TCP listeners).

Pages project URLs include the repository path. All CSS and JavaScript are referenced with ./ URLs, so they resolve from both localhost and the GitHub Pages project subdirectory. Only referenced runtime assets are published. dist/ is ignored by Git; tests, README, development scripts, node_modules, and any unreferenced files are excluded from the published artifact. **GitHub Pages serves the app publicly**; do not commit private logs or measurements to the repository.
