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
| `F3` | Hiện/ẩn bộ đếm FPS |

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

## Giả định chính
Chi tiết đầy đủ và lý do: [docs/notes/assumptions.md](docs/notes/assumptions.md). Trả lời của trợ giảng: [CP1](docs/notes/ta-cp1-answers.md), [CP2](docs/notes/ta-qa.md).

- **Nhặt đom đóm** tự động khi khoảng cách XZ ≤ 1.0 m. Khi đã mang đủ 10 thì đi qua cũng không nhặt.
- **Nạp đèn** (`E`): nạp `min(đang mang, còn thiếu)` vào đèn chưa sáng gần nhất, phần dư giữ lại.
- **Tỏa Sáng** trừ 3 đom đóm đang mang. Không đủ hoặc đang hồi chiêu thì không kích hoạt và không ghi event.
- **Bị chạm**: rơi `floor(đang mang / 2)` đom đóm. Số rơi thành đom đóm trên đất (tồn tại 8 s), được tính trong `motes_active`.
- **Thứ tự trong một tick**: event ghi trước snapshot, dòng `end` luôn ở cuối. Thưởng thắng được cộng ngay ở tick có `game_over`; thua thì không có thưởng.
- **Vùng an toàn** chỉ có quanh đèn đã thắp. Bóng Mực đang ở trong vùng khi đèn vừa thắp bị đẩy ra mép trong ≤ 30 tick.
- **Bóng Mực**: con do scenario dựng sẵn bắt đầu ở `wander`, con mới sinh ở `spawning` trong 60 tick. `night_start` ghi ở tick 1.
- **Điểm xuất phát** Đêm 1 và 2 là (0,0,0); Đêm 3 là (0,0,−30) vì tâm đảo là tháp chuông. Tất cả quay mặt về +Z.

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
