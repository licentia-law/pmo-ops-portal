# PMO Seed CSV Bundle

구성 원칙
- original 엑셀 + [use] 변환본을 기반으로 프로젝트 스키마에 맞게 정규화한 seed CSV입니다.
- source_type 컬럼으로 original_based / scenario 데이터를 구분합니다.
- scenario 데이터는 권한, 상태 전환, 발표완료 이후 담당자 수정, 업무지원 종료, 페이지네이션 등 테스트용 케이스입니다.

주요 파일
- organizations_seed.csv
- teams_seed.csv
- personnel_seed.csv
- users_seed.csv
- project_codes_seed.csv
- projects_seed.csv
- project_assignments_seed.csv
- project_logs_seed.csv
- holidays_seed.csv

권장 적재 순서
1. organizations
2. teams
3. personnel
4. users
5. project_codes
6. projects
7. project_assignments
8. project_logs
9. holidays

주의
- 일부 original 값은 비정형이므로 seed에서는 정규화/보수적으로 변환했습니다.
- project_codes와 projects는 일부 이름 기반 매칭을 사용했습니다.
- 정확한 운영 이관 전에는 review_needed/TODO 기준으로 재검증이 필요합니다.
