# CHECKPOINT P3 — 외부 공휴일 자동 동기화

- 작성일시: 2026-06-19
- 기준 문서:
  - `docs/DTL/DTL_P3_public_holiday_sync_plan_260619.md`

---

## 0. 확정 정책

- [ ] `법정공휴일`은 자동 동기화 대상
- [ ] `회사휴무`는 수동 관리 대상
- [ ] FastAPI 내부 상시 스케줄러는 사용하지 않음
- [ ] 별도 CLI + 작업 스케줄러 방식 사용

---

## 1. 모델 / 마이그레이션

- [ ] `HolidaySourceKind` enum 추가
- [ ] `Holiday` 모델에 source 메타데이터 필드 추가
- [ ] Alembic revision 추가
- [ ] 기존 DB row backfill 규칙 구현
- [ ] migration `upgrade head` 성공

검증 포인트:
- [ ] 기존 `holidays` row가 손실되지 않음
- [ ] 새 컬럼 nullable/default 정책이 현재 DB와 충돌하지 않음

---

## 2. 동기화 도메인

- [ ] 외부 API adapter 추가
- [ ] canonical holiday payload 변환 로직 추가
- [ ] 동기화 service 추가
- [ ] `public` upsert 규칙 구현
- [ ] 외부 제공 대체공휴일 날짜를 법정공휴일(`public`)로 통합 저장하는 규칙 구현
- [ ] `company` row 제외 규칙 구현

검증 포인트:
- [ ] 동일 동기화를 두 번 실행해도 중복 row가 생기지 않음
- [ ] 수동 `company` row는 절대 수정/비활성화되지 않음
- [ ] 대체공휴일 날짜가 반영되어도 별도 하위 타입 없이 `public`으로 유지됨

---

## 3. CRUD / 검증 규칙

- [ ] 수동 생성 row는 `source_kind=manual`
- [ ] seed row는 `source_kind=seed`
- [ ] 외부 동기화 row는 `source_kind=external_api`
- [ ] source-aware validation 추가
- [ ] 수동 CRUD와 동기화 row 충돌 정책 반영

검증 포인트:
- [ ] 기존 공휴일 관리 화면 CRUD가 계속 동작
- [ ] `company` 수동 등록이 막히지 않음
- [ ] 외부 row가 회사휴무로 바뀌는 경로가 없음

---

## 4. CLI / 운영 실행

- [ ] `sync_public_holidays.py` CLI 추가
- [ ] `--year` 옵션 추가
- [ ] `--from-year`, `--to-year` 옵션 추가
- [ ] `--dry-run` 옵션 추가
- [ ] 결과 요약 출력 형식 고정

검증 포인트:
- [ ] dry-run 시 DB 미변경
- [ ] normal run 시 요약 로그 출력
- [ ] 실패 시 non-zero exit code 반환

---

## 5. 테스트

- [ ] migration test 확장
- [ ] holiday sync service test 추가
- [ ] holiday sync CLI smoke test 추가
- [ ] 기존 holiday CRUD 회귀 테스트 유지

검증 포인트:
- [ ] `pytest` 전체 대상 holiday 관련 테스트 통과
- [ ] 기존 `test_p1_api.py` 회귀 없음

---

## 6. 프론트 영향 점검

- [ ] 필요 시 holiday read model 변경 반영
- [ ] 관리자 화면에서 source 표시 필요 여부 점검
- [ ] 자동 동기화 row UX 정책 확인

검증 포인트:
- [ ] `apps/web` typecheck 통과
- [ ] holiday 화면 기존 조회/등록/수정 동작 유지

---

## 7. 운영 전 최종 확인

- [ ] 대상 외부 API 공급자 확정
- [ ] 운영 실행 시간 확정
- [ ] 실패 시 재실행 절차 문서화
- [ ] 작업 스케줄러 등록 명령 문서화
- [ ] 운영자 확인 포인트 정리
