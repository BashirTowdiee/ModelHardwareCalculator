/* Local Inference Lab: deterministic capacity maths, not a benchmark. */
(function (root) {
  'use strict';
  const GIB = 1024 ** 3;
  const GB_TO_GIB = 1e9 / GIB;
  const HARDWARE = {
    '5060ti': { name: 'RTX 5060 Ti', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 448, ram: 32, power: 180, prefill: 0, price: 0 },
    '5070ti': { name: 'RTX 5070 Ti', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 896, ram: 32, power: 300, prefill: 0, price: 0 },
    '5090': { name: 'RTX 5090', detail: 'NVIDIA · 32 GB', vendor: 'NVIDIA', vram: 32, bandwidth: 1792, ram: 64, power: 575, prefill: 0, price: 0 },
    '9060xt': { name: 'RX 9060 XT', detail: 'AMD · 16 GB', vendor: 'AMD', vram: 16, bandwidth: 320, ram: 32, power: 160, prefill: 0, price: 0 },
    '9070xt': { name: 'RX 9070 XT', detail: 'AMD · 16 GB', vendor: 'AMD', vram: 16, bandwidth: 640, ram: 32, power: 304, prefill: 0, price: 0 },
    'm4': { name: 'MacBook Pro M4', detail: 'Apple · 16 GB unified', vendor: 'Apple', vram: 16, bandwidth: 120, ram: 16, power: 30, prefill: 0, price: 0 },
    'm4pro': { name: 'Mac M4 Pro', detail: 'Apple · 24 GB unified', vendor: 'Apple', vram: 24, bandwidth: 273, ram: 24, power: 45, prefill: 0, price: 0 },
    'm4max': { name: 'Mac M4 Max', detail: 'Apple · 48 GB unified', vendor: 'Apple', vram: 48, bandwidth: 546, ram: 48, power: 90, prefill: 0, price: 0 },
    'custom': { name: 'Custom setup', detail: 'Edit hardware parameters', vendor: 'Custom', vram: 24, bandwidth: 800, ram: 64, power: 250, prefill: 0, price: 0 },
    '4060ti8': { name: 'RTX 4060 Ti 8GB', detail: 'NVIDIA · 8 GB', vendor: 'NVIDIA', vram: 8, bandwidth: 288, ram: 32, power: 160, prefill: 0, price: 0 },
    '5060ti8': { name: 'RTX 5060 Ti 8GB', detail: 'NVIDIA · 8 GB', vendor: 'NVIDIA', vram: 8, bandwidth: 448, ram: 32, power: 180, prefill: 0, price: 0 },
    '9060xt8': { name: 'RX 9060 XT 8GB', detail: 'AMD · 8 GB', vendor: 'AMD', vram: 8, bandwidth: 320, ram: 32, power: 150, prefill: 0, price: 0, source: 'https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9060xt-8gb.html' },
    '4070s': { name: 'RTX 4070 SUPER', detail: 'NVIDIA · 12 GB', vendor: 'NVIDIA', vram: 12, bandwidth: 504, ram: 32, power: 220, prefill: 0, price: 0 },
    '6800xt': { name: 'RX 6800 XT', detail: 'AMD · 16 GB', vendor: 'AMD', vram: 16, bandwidth: 512, ram: 32, power: 300, prefill: 0, price: 0 },
    '3060': { name: 'RTX 3060 12GB', detail: 'NVIDIA · 12 GB', vendor: 'NVIDIA', vram: 12, bandwidth: 360, ram: 32, power: 170, prefill: 0, price: 0 },
    '4060ti16': { name: 'RTX 4060 Ti 16GB', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 288, ram: 32, power: 165, prefill: 0, price: 0 },
    '4070tis': { name: 'RTX 4070 Ti SUPER', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 672, ram: 32, power: 285, prefill: 0, price: 0 },
    '4080s': { name: 'RTX 4080 SUPER', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 736, ram: 32, power: 320, prefill: 0, price: 0 },
    '4090': { name: 'RTX 4090', detail: 'NVIDIA · 24 GB', vendor: 'NVIDIA', vram: 24, bandwidth: 1008, ram: 48, power: 450, prefill: 0, price: 0 },
    '3090': { name: 'RTX 3090', detail: 'NVIDIA · 24 GB', vendor: 'NVIDIA', vram: 24, bandwidth: 936, ram: 48, power: 350, prefill: 0, price: 0 },
    '5080': { name: 'RTX 5080', detail: 'NVIDIA · 16 GB', vendor: 'NVIDIA', vram: 16, bandwidth: 960, ram: 32, power: 360, prefill: 0, price: 0 },
    '5070': { name: 'RTX 5070', detail: 'NVIDIA · 12 GB', vendor: 'NVIDIA', vram: 12, bandwidth: 672, ram: 32, power: 250, prefill: 0, price: 0 },
    '5060': { name: 'RTX 5060', detail: 'NVIDIA · 8 GB', vendor: 'NVIDIA', vram: 8, bandwidth: 448, ram: 32, power: 145, prefill: 0, price: 0 },
    '7900xtx': { name: 'RX 7900 XTX', detail: 'AMD · 24 GB', vendor: 'AMD', vram: 24, bandwidth: 960, ram: 48, power: 355, prefill: 0, price: 0 },
    '7900xt': { name: 'RX 7900 XT', detail: 'AMD · 20 GB', vendor: 'AMD', vram: 20, bandwidth: 800, ram: 40, power: 315, prefill: 0, price: 0 },
    '7800xt': { name: 'RX 7800 XT', detail: 'AMD · 16 GB', vendor: 'AMD', vram: 16, bandwidth: 624, ram: 32, power: 263, prefill: 0, price: 0 },
    '9070': { name: 'RX 9070', detail: 'AMD · 16 GB', vendor: 'AMD', vram: 16, bandwidth: 640, ram: 32, power: 220, prefill: 0, price: 0 },
    'a100': { name: 'A100 SXM 80GB', detail: 'NVIDIA · 80 GB', vendor: 'NVIDIA', vram: 80, bandwidth: 2039, ram: 160, power: 400, prefill: 0, price: 0 },
    'h100': { name: 'H100 SXM 80GB', detail: 'NVIDIA · 80 GB', vendor: 'NVIDIA', vram: 80, bandwidth: 3350, ram: 160, power: 700, prefill: 0, price: 0 },
    'h200': { name: 'H200 SXM 141GB', detail: 'NVIDIA · 141 GB', vendor: 'NVIDIA', vram: 141, bandwidth: 4800, ram: 282, power: 700, prefill: 0, price: 0 },
    'mi300x': { name: 'Instinct MI300X', detail: 'AMD · 192 GB', vendor: 'AMD', vram: 192, bandwidth: 5300, ram: 384, power: 750, prefill: 0, price: 0 },
    'm3ultra': { name: 'Mac Studio M3 Ultra', detail: 'Apple · 96 GB unified', vendor: 'Apple', vram: 96, bandwidth: 819, ram: 96, power: 180, prefill: 0, price: 0 },
    'm4max64': { name: 'Mac M4 Max 64GB', detail: 'Apple · 64 GB unified', vendor: 'Apple', vram: 64, bandwidth: 546, ram: 64, power: 90, prefill: 0, price: 0 },
    'mini-m2-16': { name: 'Mac mini M2 · 16 GB', detail: 'Apple · 10-core GPU · 100 GB/s unified · Mac mini', vendor: 'Apple', vram: 16, bandwidth: 100, ram: 16, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111837' },
    'mini-m2pro-32': { name: 'Mac mini M2 Pro · 32 GB', detail: 'Apple · 19-core GPU · 200 GB/s unified · Mac mini', vendor: 'Apple', vram: 32, bandwidth: 200, ram: 32, power: 40, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111837' },
    'mini-m4-16': { name: 'Mac mini M4 · 16 GB', detail: 'Apple · 10-core GPU · 120 GB/s unified · Mac mini', vendor: 'Apple', vram: 16, bandwidth: 120, ram: 16, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mini-m4-24': { name: 'Mac mini M4 · 24 GB', detail: 'Apple · 10-core GPU · 120 GB/s unified · Mac mini', vendor: 'Apple', vram: 24, bandwidth: 120, ram: 24, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mini-m4-32': { name: 'Mac mini M4 · 32 GB', detail: 'Apple · 10-core GPU · 120 GB/s unified · Mac mini', vendor: 'Apple', vram: 32, bandwidth: 120, ram: 32, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mini-m4pro-24': { name: 'Mac mini M4 Pro · 24 GB', detail: 'Apple · 16-core GPU · 273 GB/s unified · Mac mini', vendor: 'Apple', vram: 24, bandwidth: 273, ram: 24, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mini-m4pro-48': { name: 'Mac mini M4 Pro · 48 GB', detail: 'Apple · 20-core GPU · 273 GB/s unified · Mac mini', vendor: 'Apple', vram: 48, bandwidth: 273, ram: 48, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mini-m4pro-64': { name: 'Mac mini M4 Pro · 64 GB', detail: 'Apple · 20-core GPU · 273 GB/s unified · Mac mini', vendor: 'Apple', vram: 64, bandwidth: 273, ram: 64, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121555' },
    'mbp-m3-16': { name: 'MacBook Pro 14-inch M3 · 16 GB', detail: 'Apple · 10-core GPU · 100 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 16, bandwidth: 100, ram: 16, power: 25, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117735' },
    'mbp-m3pro-18': { name: 'MacBook Pro 14-inch M3 Pro · 18 GB', detail: 'Apple · 14-core GPU · 150 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 18, bandwidth: 150, ram: 18, power: 35, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117736' },
    'mbp-m3pro-36': { name: 'MacBook Pro 16-inch M3 Pro · 36 GB', detail: 'Apple · 18-core GPU · 150 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 36, bandwidth: 150, ram: 36, power: 35, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117737' },
    'mbp-m3max30-36': { name: 'MacBook Pro 14-inch M3 Max · 36 GB', detail: 'Apple · 30-core GPU · 300 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 36, bandwidth: 300, ram: 36, power: 60, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117736' },
    'mbp-m3max40-64': { name: 'MacBook Pro 16-inch M3 Max · 64 GB', detail: 'Apple · 40-core GPU · 400 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 64, bandwidth: 400, ram: 64, power: 75, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117737' },
    'mbp-m3max40-128': { name: 'MacBook Pro 16-inch M3 Max · 128 GB', detail: 'Apple · 40-core GPU · 400 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 128, bandwidth: 400, ram: 128, power: 75, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/117737' },
    'mbp-m4-16': { name: 'MacBook Pro 14-inch M4 · 16 GB', detail: 'Apple · 10-core GPU · 120 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 16, bandwidth: 120, ram: 16, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121552' },
    'mbp-m4-32': { name: 'MacBook Pro 14-inch M4 · 32 GB', detail: 'Apple · 10-core GPU · 120 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 32, bandwidth: 120, ram: 32, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121552' },
    'mbp-m4pro-24': { name: 'MacBook Pro 14-inch M4 Pro · 24 GB', detail: 'Apple · 16-core GPU · 273 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 24, bandwidth: 273, ram: 24, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121553' },
    'mbp-m4pro-48': { name: 'MacBook Pro 16-inch M4 Pro · 48 GB', detail: 'Apple · 20-core GPU · 273 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 48, bandwidth: 273, ram: 48, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121554' },
    'mbp-m4max32-36': { name: 'MacBook Pro 14-inch M4 Max · 36 GB', detail: 'Apple · 32-core GPU · 410 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 36, bandwidth: 410, ram: 36, power: 70, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121553' },
    'mbp-m4max40-48': { name: 'MacBook Pro 16-inch M4 Max · 48 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 48, bandwidth: 546, ram: 48, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121554' },
    'mbp-m4max40-64': { name: 'MacBook Pro 16-inch M4 Max · 64 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 64, bandwidth: 546, ram: 64, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121554' },
    'mbp-m4max40-128': { name: 'MacBook Pro 16-inch M4 Max · 128 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 128, bandwidth: 546, ram: 128, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/121554' },
    'mbp-m5-16': { name: 'MacBook Pro 14-inch M5 · 16 GB', detail: 'Apple · 10-core GPU · 153 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 16, bandwidth: 153, ram: 16, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/125405' },
    'mbp-m5-24': { name: 'MacBook Pro 14-inch M5 · 24 GB', detail: 'Apple · 10-core GPU · 153 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 24, bandwidth: 153, ram: 24, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/125405' },
    'mbp-m5-32': { name: 'MacBook Pro 14-inch M5 · 32 GB', detail: 'Apple · 10-core GPU · 153 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 32, bandwidth: 153, ram: 32, power: 30, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/125405' },
    'mbp-m5pro-24': { name: 'MacBook Pro 14-inch M5 Pro · 24 GB', detail: 'Apple · 16-core GPU · 307 GB/s unified · MacBook Pro 14-inch', vendor: 'Apple', vram: 24, bandwidth: 307, ram: 24, power: 45, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126318' },
    'mbp-m5pro-48': { name: 'MacBook Pro 16-inch M5 Pro · 48 GB', detail: 'Apple · 20-core GPU · 307 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 48, bandwidth: 307, ram: 48, power: 50, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'mbp-m5pro-64': { name: 'MacBook Pro 16-inch M5 Pro · 64 GB', detail: 'Apple · 20-core GPU · 307 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 64, bandwidth: 307, ram: 64, power: 50, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'mbp-m5max32-36': { name: 'MacBook Pro 16-inch M5 Max · 36 GB', detail: 'Apple · 32-core GPU · 460 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 36, bandwidth: 460, ram: 36, power: 70, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'mbp-m5max40-48': { name: 'MacBook Pro 16-inch M5 Max · 48 GB', detail: 'Apple · 40-core GPU · 614 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 48, bandwidth: 614, ram: 48, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'mbp-m5max40-64': { name: 'MacBook Pro 16-inch M5 Max · 64 GB', detail: 'Apple · 40-core GPU · 614 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 64, bandwidth: 614, ram: 64, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'mbp-m5max40-128': { name: 'MacBook Pro 16-inch M5 Max · 128 GB', detail: 'Apple · 40-core GPU · 614 GB/s unified · MacBook Pro 16-inch', vendor: 'Apple', vram: 128, bandwidth: 614, ram: 128, power: 80, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/126319' },
    'studio-m2max-32': { name: 'Mac Studio M2 Max · 32 GB', detail: 'Apple · 30-core GPU · 400 GB/s unified · Mac Studio', vendor: 'Apple', vram: 32, bandwidth: 400, ram: 32, power: 75, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111835' },
    'studio-m2max-64': { name: 'Mac Studio M2 Max · 64 GB', detail: 'Apple · 38-core GPU · 400 GB/s unified · Mac Studio', vendor: 'Apple', vram: 64, bandwidth: 400, ram: 64, power: 85, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111835' },
    'studio-m2ultra-64': { name: 'Mac Studio M2 Ultra · 64 GB', detail: 'Apple · 60-core GPU · 800 GB/s unified · Mac Studio', vendor: 'Apple', vram: 64, bandwidth: 800, ram: 64, power: 150, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111835' },
    'studio-m2ultra-192': { name: 'Mac Studio M2 Ultra · 192 GB', detail: 'Apple · 76-core GPU · 800 GB/s unified · Mac Studio', vendor: 'Apple', vram: 192, bandwidth: 800, ram: 192, power: 170, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/111835' },
    'studio-m4max32-36': { name: 'Mac Studio M4 Max · 36 GB', detail: 'Apple · 32-core GPU · 410 GB/s unified · Mac Studio', vendor: 'Apple', vram: 36, bandwidth: 410, ram: 36, power: 70, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
    'studio-m4max40-48': { name: 'Mac Studio M4 Max · 48 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · Mac Studio', vendor: 'Apple', vram: 48, bandwidth: 546, ram: 48, power: 90, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
    'studio-m4max40-64': { name: 'Mac Studio M4 Max · 64 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · Mac Studio', vendor: 'Apple', vram: 64, bandwidth: 546, ram: 64, power: 90, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
    'studio-m4max40-128': { name: 'Mac Studio M4 Max · 128 GB', detail: 'Apple · 40-core GPU · 546 GB/s unified · Mac Studio', vendor: 'Apple', vram: 128, bandwidth: 546, ram: 128, power: 90, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
    'studio-m3ultra60-96': { name: 'Mac Studio M3 Ultra · 96 GB', detail: 'Apple · 60-core GPU · 819 GB/s unified · Mac Studio', vendor: 'Apple', vram: 96, bandwidth: 819, ram: 96, power: 180, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
    'studio-m3ultra80-256': { name: 'Mac Studio M3 Ultra · 256 GB', detail: 'Apple · 80-core GPU · 819 GB/s unified · Mac Studio', vendor: 'Apple', vram: 256, bandwidth: 819, ram: 256, power: 200, prefill: 0, price: 0, source: 'https://support.apple.com/en-au/122211' },
  };
  const MODELS = {
    'qwen38-gsr': { name: 'Qwen3.8-27B', detail: 'Compact quant · illustrative configuration', gb: 11.8, kvKiB: 64, limit: 262144, visionGB: 0.93, mtpGB: 0.35 },
    'qwen38-q4': { name: 'Qwen3.8-27B', detail: 'Q4 · illustrative configuration', gb: 17.44, kvKiB: 64, limit: 262144, visionGB: 0.93, mtpGB: 0.35 },
    'devstral': { name: 'Devstral Small 2', detail: 'Illustrative KV-cache footprint', gb: 14.0, kvKiB: 160, limit: 262144, visionGB: 0, mtpGB: 0.0 },
    'small': { name: 'Representative 8B', detail: 'Illustrative model, not a specific GGUF', gb: 5, kvKiB: 32, limit: 131072, visionGB: 0, mtpGB: 0 },
    'custom': { name: 'Custom model', detail: 'Set exact GGUF and KV footprint', gb: 8, kvKiB: 64, limit: 262144, visionGB: 0, mtpGB: 0 },
    'qwen3-0.6': { name: 'Qwen3 0.6B', detail: 'Qwen · illustrative Q4 size & KV', gb: 0.5, kvKiB: 24, limit: 32768, visionGB: 0, mtpGB: 0 },
    'qwen3-1.7': { name: 'Qwen3 1.7B', detail: 'Qwen · illustrative Q4 size & KV', gb: 1.3, kvKiB: 32, limit: 32768, visionGB: 0, mtpGB: 0 },
    'qwen3-4': { name: 'Qwen3 4B', detail: 'Qwen · illustrative Q4 size & KV', gb: 2.8, kvKiB: 32, limit: 131072, visionGB: 0, mtpGB: 0 },
    'qwen3-8': { name: 'Qwen3 8B', detail: 'Qwen · illustrative Q4 size & KV', gb: 5.2, kvKiB: 40, limit: 131072, visionGB: 0, mtpGB: 0 },
    'qwen3-14': { name: 'Qwen3 14B', detail: 'Qwen · illustrative Q4 size & KV', gb: 9, kvKiB: 48, limit: 131072, visionGB: 0, mtpGB: 0 },
    'qwen3-32': { name: 'Qwen3 32B', detail: 'Qwen · illustrative Q4 size & KV', gb: 20, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'qwen3-moe': { name: 'Qwen3 30B-A3B (MoE)', detail: 'Qwen · illustrative Q4 size & KV', gb: 18.6, kvKiB: 48, limit: 131072, visionGB: 0, mtpGB: 0 },
    'qwen3-235': { name: 'Qwen3 235B-A22B (MoE)', detail: 'Qwen · illustrative Q4 size & KV', gb: 145, kvKiB: 128, limit: 131072, visionGB: 0, mtpGB: 0 },
    'llama31-8': { name: 'Llama 3.1 8B', detail: 'Meta · illustrative Q4 size & KV', gb: 5, kvKiB: 128, limit: 131072, visionGB: 0, mtpGB: 0 },
    'llama33-70': { name: 'Llama 3.3 70B', detail: 'Meta · illustrative Q4 size & KV', gb: 43, kvKiB: 160, limit: 131072, visionGB: 0, mtpGB: 0 },
    'llama4-scout': { name: 'Llama 4 Scout (MoE)', detail: 'Meta · illustrative Q4 size & KV', gb: 68, kvKiB: 96, limit: 262144, visionGB: 0, mtpGB: 0 },
    'gemma3-1': { name: 'Gemma 3 1B', detail: 'Google · illustrative Q4 size & KV', gb: 0.9, kvKiB: 32, limit: 32768, visionGB: 0, mtpGB: 0 },
    'gemma3-4': { name: 'Gemma 3 4B', detail: 'Google · illustrative Q4 size & KV', gb: 2.9, kvKiB: 48, limit: 131072, visionGB: 0, mtpGB: 0 },
    'gemma3-12': { name: 'Gemma 3 12B', detail: 'Google · illustrative Q4 size & KV', gb: 7.8, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'gemma3-27': { name: 'Gemma 3 27B', detail: 'Google · illustrative Q4 size & KV', gb: 17, kvKiB: 96, limit: 131072, visionGB: 0, mtpGB: 0 },
    'deepseek-r1-7': { name: 'DeepSeek R1 Distill 7B', detail: 'DeepSeek · illustrative Q4 size & KV', gb: 4.7, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'deepseek-r1-14': { name: 'DeepSeek R1 Distill 14B', detail: 'DeepSeek · illustrative Q4 size & KV', gb: 9.1, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'deepseek-r1-32': { name: 'DeepSeek R1 Distill 32B', detail: 'DeepSeek · illustrative Q4 size & KV', gb: 20, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'mistral31': { name: 'Mistral Small 3.1 24B', detail: 'Mistral · illustrative Q4 size & KV', gb: 15, kvKiB: 96, limit: 131072, visionGB: 0, mtpGB: 0 },
    'phi4': { name: 'Phi-4 14B', detail: 'Microsoft · illustrative Q4 size & KV', gb: 9, kvKiB: 80, limit: 16384, visionGB: 0, mtpGB: 0 },
    'gptoss20': { name: 'gpt-oss 20B (MXFP4)', detail: 'OpenAI · illustrative MXFP4 size & KV', gb: 13.75, kvKiB: 64, limit: 131072, visionGB: 0, mtpGB: 0 },
    'gptoss120': { name: 'gpt-oss 120B (MXFP4)', detail: 'OpenAI · illustrative MXFP4 size & KV', gb: 65.3, kvKiB: 128, limit: 131072, visionGB: 0, mtpGB: 0 },
  };
  const DEFAULTS = {
    hardware: '5090', model: 'qwen38-gsr', gpuCount: 1, split: 'tensor', memoryType: 'discrete',
    vram: 32, bandwidth: 1792, ram: 64, power: 575, prefill: 0, price: 0,
    modelGB: 11.8, kvKiB: 64, modelLimit: 262144, visionGB: 0.93, mtpGB: 0.35,
    context: 65536, cache: 'fp16', vision: true, mtp: true, reserve: 0.9, overhead: 0.1,
    metalPct: 79, cpuWeights: 0, kvOffload: false, autoSpill: false,
    agentBase: 30000, agentTools: 18000, agentOutput: 8000,
    efficiency: 70, mtpGain: 1.35, kvReadMode: 'active', kvReadPct: 100,
    hours: 4, duty: 50, tariff: 0.17, apiPrice: 2.95, currency: 'USD',
  };
  const QUANTS = {fp16: 1, q8: 34/64, q4: 18/64};
  const round = (n, p = 1) => Number(n.toFixed(p));
  function hardwareState(id, existing) {
    const h = HARDWARE[id];
    const isMultiApple = h.vendor === 'Apple';
    return { ...existing, hardware: id, vram: h.vram, bandwidth: h.bandwidth, ram: h.ram, power: h.power, prefill: h.prefill, price: h.price, memoryType: h.vendor === 'Apple' ? 'unified' : 'discrete', gpuCount: isMultiApple ? 1 : existing.gpuCount, cpuWeights: isMultiApple ? 0 : existing.cpuWeights, kvOffload: isMultiApple ? false : existing.kvOffload };
  }
  function modelState(id, existing) {
    const m = MODELS[id];
    return { ...existing, model: id, modelGB: m.gb, kvKiB: m.kvKiB, modelLimit: m.limit, visionGB: m.visionGB, mtpGB: m.mtpGB, prefill: 0, context: Math.min(existing.context, m.limit), vision: m.visionGB > 0 && existing.vision, mtp: m.mtpGB > 0 && existing.mtp };
  }
  function calculate(s) {
    const apple = HARDWARE[s.hardware]?.vendor === 'Apple' || (s.hardware === 'custom' && s.memoryType === 'unified');
    const count = apple ? 1 : Math.max(1, Number(s.gpuCount));
    const cap = Math.max(0, Number(s.vram) * count * (apple ? Number(s.metalPct) / 100 : 1));
    const weightsGiB = Number(s.modelGB) * GB_TO_GIB;
    const gpuWeightsGiB = weightsGiB * (apple ? 1 : 1 - Number(s.cpuWeights) / 100);
    const hostWeightsGiB = weightsGiB - gpuWeightsGiB;
    const cacheRatio = QUANTS[s.cache] || 1;
    const kvPerTokenGiB = Number(s.kvKiB) * cacheRatio / (1024 * 1024);
    const kvGiB = s.context * kvPerTokenGiB;
    const gpuKvGiB = s.kvOffload && !apple ? 0 : kvGiB;
    const hostKvGiB = s.kvOffload && !apple ? kvGiB : 0;
    const extrasGiB = ((s.vision ? Number(s.visionGB) : 0) + (s.mtp ? Number(s.mtpGB) : 0)) * GB_TO_GIB;
    const guardGiB = count * (Number(s.reserve) + Number(s.overhead));
    const fixedGiB = gpuWeightsGiB + extrasGiB + guardGiB;
    const gpuDemand = fixedGiB + gpuKvGiB;
    const excess = Math.max(0, gpuDemand - cap);
    const spillGiB = s.autoSpill && !apple ? excess : 0;
    const hostDemand = hostWeightsGiB + hostKvGiB + spillGiB;
    const availableHostGiB = Math.max(0, Number(s.ram) - (apple ? cap : 4));
    const hostHeadroom = availableHostGiB - hostDemand;
    const left = cap - gpuDemand;
    const maxGpuContext = Math.max(0, Math.min(Number(s.modelLimit), Math.floor((cap - fixedGiB) / kvPerTokenGiB)));
    const hardwareLimitExceeded = Number(s.context) > Number(s.modelLimit);
    let status = 'fit';
    if (hardwareLimitExceeded) status = 'limit';
    else if (hostHeadroom < -1e-7) status = 'host';
    else if (excess > 0.00001 && !s.autoSpill) status = 'overflow';
    else if (hostDemand > 0.00001 || excess > 0) status = 'offload';
    // Decode traffic proxy, not a runtime memory trace. A token typically streams
    // weight tensors, reads attention KV history, then writes the new KV entry.
    // Hardware bandwidth figures are a *shared* read/write envelope, not two
    // independently available read and write channels.
    const promptTokensForTraffic = Math.max(0, Number(s.agentBase) + Number(s.agentTools));
    const activeKvTokens = Math.max(0, Math.min(Number(s.context), promptTokensForTraffic + Number(s.agentOutput) / 2));
    const scannedKvTokens = s.kvReadMode === 'allocated' ? Math.max(0, Number(s.context)) : activeKvTokens;
    const kvScanFactor = Math.max(0, Math.min(1, Number(s.kvReadPct ?? 100) / 100));
    const weightReadBytes = Math.max(0, weightsGiB * GIB);
    const kvReadBytes = Math.max(0, scannedKvTokens * kvPerTokenGiB * GIB * kvScanFactor);
    const kvWriteBytes = Math.max(0, kvPerTokenGiB * GIB);
    const totalTrafficBytes = Math.max(1, weightReadBytes + kvReadBytes + kvWriteBytes);
    const bandwidthGBs = Math.max(0, Number(s.bandwidth) * (count > 1 && s.split === 'tensor' ? count : 1));
    const theoreticalTPS = bandwidthGBs * 1e9 / totalTrafficBytes;
    const estimatedTPS = theoreticalTPS * (Number(s.efficiency) / 100) * (s.mtp ? Number(s.mtpGain) : 1);
    const gpuOnly = status === 'fit' && Number(s.cpuWeights) === 0 && !s.kvOffload;
    const promptTokens = Number(s.agentBase) + Number(s.agentTools);
    const totalAgentTokens = promptTokens + Number(s.agentOutput);
    const prefillSeconds = Number(s.prefill) > 0 ? promptTokens / Number(s.prefill) : null;
    const decodeSeconds = status === 'fit' && Number(s.cpuWeights) === 0 && !s.kvOffload && estimatedTPS > 0 ?
      Number(s.agentOutput) / estimatedTPS : null;
    const workloadSeconds = prefillSeconds != null && decodeSeconds != null ? prefillSeconds + decodeSeconds : null;
    const usedFraction = Number(s.context) > 0 ? totalAgentTokens / Number(s.context) : 0;
    const monthlyTokens = gpuOnly ? estimatedTPS * 3600 * Number(s.hours) * (Number(s.duty) / 100) * 30 : null;
    const monthlyElectricity = (Number(s.power) * count / 1000) * Number(s.hours) * (Number(s.duty)/100) * 30 * Number(s.tariff);
    const monthlyCloud = monthlyTokens == null ? null : monthlyTokens / 1e6 * Number(s.apiPrice);
    const monthlySavings = monthlyCloud == null ? null : monthlyCloud - monthlyElectricity;
    const breakEvenMonths = monthlySavings && monthlySavings > 0 && Number(s.price) > 0 ? Number(s.price) * count / monthlySavings : null;
    return { activeKvTokens, scannedKvTokens, kvScanFactor, bandwidthGBs, weightReadGB: weightReadBytes / 1e9, kvReadGB: kvReadBytes / 1e9, kvWriteGB: kvWriteBytes / 1e9, trafficGBPerToken: totalTrafficBytes / 1e9, decodeSeconds, workloadSeconds, apple, count, cap, weightsGiB, gpuWeightsGiB, hostWeightsGiB, kvGiB, gpuKvGiB, hostKvGiB, extrasGiB, guardGiB, fixedGiB, gpuDemand, excess, spillGiB, hostDemand, availableHostGiB, hostHeadroom, left, maxGpuContext, status, theoreticalTPS, estimatedTPS, gpuOnly, promptTokens, totalAgentTokens, prefillSeconds, usedFraction, monthlyTokens, monthlyElectricity, monthlyCloud, monthlySavings, breakEvenMonths };
  }
  function fitHardware(s, hardwareId) {
    const h = HARDWARE[hardwareId];
    const overrides = hardwareState(hardwareId, s);
    overrides.gpuCount = hardwareId === '5060ti' && s.gpuCount > 1 ? s.gpuCount : 1;
    return calculate(overrides);
  }
  root.LLMLab = { GIB, GB_TO_GIB, HARDWARE, MODELS, DEFAULTS, QUANTS, calculate, hardwareState, modelState, fitHardware, round };
})(typeof globalThis !== 'undefined' ? globalThis : this);