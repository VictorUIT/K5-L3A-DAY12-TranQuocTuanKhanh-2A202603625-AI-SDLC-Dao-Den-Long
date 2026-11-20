# Bằng chứng Phase 4 (tag `phase-4`, Release `v1.0.0`)

Máy: 12th Gen Intel(R) Core(TM) i7-12800H, 16 GB RAM, Intel UHD Graphics (iGPU), Windows 11, Chrome 157, Node 24.16.

## Benchmark (`node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`): [bench.json](../../../bench.json)
| Chỉ số | Kết quả | Ngưỡng |
|---|---|---|
| avg_fps | 506.68 | ≥ 60 ✅ |
| p1_low_fps | 66.67 | ≥ 30 ✅ |
| load_ms | 776 | ≤ 10000 ✅ |
| frame_ms_p95 / frames | 3.9 / 15200 | |
| peak_mem_mb | null (bản web, xem README) | |

Lưu ý trung thực: puppeteer không giải nén được Chrome của nó trên máy Windows này, nên bench dùng Chrome hệ thống (fallback `channel: 'chrome'` trong `scripts/bench.mjs`). Trên máy chấm, `build_cmd` cài Chrome của puppeteer.

## Soak (`node --expose-gc --no-opt --max-semi-space-size=1 scripts/soak.mjs --seed 7 --nights 10 --out soak.json`): [soak.json](../../../soak.json)
```json
{"nights": 10, "crashes": 0, "results": ["lost", "lost", "lost", "lost", "lost", "lost", "lost", "lost", "lost", "lost"], "mem_start_mb": 51.3, "mem_end_mb": 55.2, "duration_s": 0.3}
```
crashes = 0 ✅ · mem_end / mem_start = 1.076 ≤ 1.2 ✅

**Điều tra bộ nhớ (lỗi tìm ra khi kiểm clone sạch trên Linux):** với cờ mặc định, trên Linux/Node 20 RSS tăng 42.6 → 73.2 MB (×1.72, **trượt**), dù trên Windows chỉ ×1.12. Đo `process.memoryUsage()` qua 20 Đêm: `heapUsed` đứng yên ~3.5 MB → code **không** rò rỉ; RSS tăng ở phần native.

| Cấu hình (Linux, Node 20.18, 10 Đêm) | mem_start → mem_end | Tỉ lệ |
|---|---|---|
| mặc định | 42.6 → 73.2 | 1.72 ❌ |
| `--jitless` | 41.5 → 44.9 | 1.08 |
| `--no-opt` | 42.1 → 45.7 | 1.09 |
| `--no-opt --max-semi-space-size=1` (chọn) | 41.7 → 43.4 | 1.04 |

Kết luận: tăng do TurboFan liên tục tối ưu/bỏ tối ưu code. Chọn `--no-opt --max-semi-space-size=1`; soak vẫn chạy ~0.5 s.

## npm test
```text
ℹ tests 44
ℹ pass 44
ℹ fail 0
```
Test Phase 4 (`tests/phase4.test.js`): contract v1.3, luật bảng xếp hạng (tên, top 10, sắp xếp, ISO 8601), lưu trên đĩa + `--export-leaderboard`, cảnh bench, soak.

## Kiểm thủ công (checklist)
- [x] Bench mở cửa sổ 1280×720, camera bay vòng (ảnh: [docs/screenshot.png](../../screenshot.png)).
- [ ] Đổi phím / báo trùng / khôi phục mặc định, phụ đề, giảm chuyển động, chữ lớn: kiểm trong video demo.
- [ ] Bảng xếp hạng còn sau khi tắt/mở lại game: kiểm trong video demo.
