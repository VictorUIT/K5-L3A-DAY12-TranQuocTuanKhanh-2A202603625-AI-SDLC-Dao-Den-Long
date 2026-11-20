# Đảo Đèn Lồng

> Video demo: _(sẽ cập nhật ở CP5)_

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.
Bài lab AI in Action, Day 12 (tài liệu đề bài ở [docs/lab/](docs/lab/README.md)).

## Cài đặt và chạy (Node >= 20, macOS/Linux/Windows)

```bash
npm install
npm run dev        # mở URL được in ra (vd. http://localhost:5173)
```

Bản web tĩnh: `npm run build` rồi phục vụ thư mục `dist/`.

## Điều khiển
| Phím | Hành động |
|---|---|
| `W A S D` | Đi (theo hướng camera) |
| Kéo chuột / `←` `→` | Xoay camera |
| `Space` | Nhảy |
| `Shift` | Lướt |
| `E` | Nạp đom đóm vào đèn gần nhất |
| `F` | Tỏa Sáng (tốn 3 đom đóm, làm choáng Bóng Mực, xua Gió Lạc) |
| `Esc` / `P` | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

Ba Đêm: Đảo Bến → Đảo Cau → Đảo Chuông. Đom đóm được nhặt tự động. Thắp hết đèn để thắng; hết Ngọn Lửa hoặc trời sáng thì thua và được chơi lại Đêm đó.

## Cách tính điểm (chuẩn TICKET-02)
| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng | +5 |
| Khi thắng: mỗi giây còn lại | +2 |
| Khi thắng: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm là tổng điểm các Đêm đã thắng.

## Headless (Test Contract v1.1) và test

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 3600 --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
npm test
```

`--night` nhận 1, 2, 3. Khai báo số liệu: [game.contract.json](game.contract.json). Spec và acceptance criteria: [docs/spec/](docs/spec/phase-2.md). Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md). Bằng chứng: [docs/proof/](docs/proof/).

## Cấu trúc
- `src/core/`: logic game thuần, tất định, dùng chung cho bản chơi và headless
- `src/headless/`: CLI theo Test Contract
- `src/web/`: hiển thị Three.js
- `tests/`: test (`node:test`)
- `docs/notes/`: giả định, nhật ký AI, retro · `docs/proof/`: bằng chứng
- `AGENTS.md` / `CLAUDE.md`: harness cho AI agent

## Sáng tạo của tôi
- Âm thanh tự tổng hợp bằng WebAudio (không dùng file ngoài).
- Mây có khăn đỏ và đèn lồng nhỏ treo trên nón lá; đèn quanh Mây sáng hơn khi mang nhiều đom đóm.
- Phần thêm chỉ nằm trong `src/web/` nên không ảnh hưởng đầu ra headless (toàn bộ test contract vẫn đạt).
