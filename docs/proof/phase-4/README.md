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

## Soak (`node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json`): [soak.json](../../../soak.json)
```json
{
  "nights": 10,
  "crashes": 0,
  "results": [
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost"
  ],
  "mem_start_mb": 51.2,
  "mem_end_mb": 57.2,
  "duration_s": 0.3
}
```
crashes = 0 ✅ · mem_end / mem_start = 1.117 ≤ 1.2 ✅. RSS dao động 52–63 MB qua từng Đêm, không tăng dần (đã kiểm bằng `SOAK_TRACE=1`).

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
