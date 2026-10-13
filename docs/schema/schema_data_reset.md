# 업무 데이터 초기화 감사 이력

기준: 2026-10-13, P3.2 0.4·6.8·22.1의 9번. 코드 모델은 `DataResetAudit`, 테이블은 `data_reset_audits`, migration은 `261013_0023`(이전 `261013_0022`)이다.

| 컬럼 | 타입/제약 | 의미 |
|---|---|---|
| id | String(36), PK, 서버 UUID | 감사 작업 식별자 |
| validation_id | String(36), 필수, 인덱스 | 실행한 확인 토큰 |
| status | String(10), 필수, CHECK success/failed | 커밋 결과 |
| actor_user_id | String(36), 필수 | 작업 당시 사용자 ID |
| actor_name / actor_email | String(100/255), 필수 | 작업자 정보 보존 |
| pre_backup_id | String(100), nullable | 복구용 자동 JSON 백업 ID; 백업 생성 전 실패하면 없음 |
| before_counts | JSON, 필수 | 업무 10개 테이블의 실행 전 건수 |
| memo | Text, nullable | 요청 메모(최대 1000자 API 검증) |
| message | Text, 필수 | 완료 또는 실패 원인 |
| created_at / updated_at | DateTime, 필수 | 기존 TimestampMixin UTC 기록 |

- 이 테이블은 업무 JSON 백업/복원/초기화 대상에 포함하지 않는다. 사용자/권한/역할/공휴일/잠금/백업 파일도 기존처럼 보존한다. 복원 후에도 성공 토큰 기록을 조회해 재실행을 막는다.
- 작업자 정보는 실행 당시 값의 사본이며 FK를 두지 않는다. 추후 사용자 변경/삭제가 과거 감사 기록을 지우거나 참조 오류를 만들지 않는다.
- 성공 기록과 업무 삭제는 같은 트랜잭션에서 저장한다. 실패하면 둘 다 롤백하고 실패 기록을 별도 저장한다. 감사 DB까지 저장 불가하면 파일 manifest에 실패를 기록한다. DB와 파일 모두 저장 불가한 경우 원래 오류를 반환하고 업무 삭제는 롤백한다.
- upgrade는 업무/기준 테이블을 변경하지 않는다. 반복 upgrade는 중복 테이블/행을 만들지 않는다. 감사 이력이 있는 downgrade는 기록 유실을 막기 위해 거절하며, 빈 테이블일 때만 제거한다.
- 실제 개발 DB에 신규 migration을 적용하지 않았다. 사본 신규 구성/기존 upgrade/롤백 검증 결과와 적용·복구 경계는 [9번 기록](../harness/data_reset_rollout_261013.md)을 따른다.
