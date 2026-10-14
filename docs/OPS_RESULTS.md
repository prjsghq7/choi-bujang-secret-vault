# 12단계 실측 결과

대상: https://choi-bujang-secret-vault-navy.vercel.app · 생성: 2026-10-14T00:16:12.304Z

심판의 41종 시험 결과가 아닙니다. live 행만 실제 배포 응답(npm run bundle의 attackId와 같음)이고 local은 로컬 연습, not_run은 보내지 않은 요청입니다.

통과 27 · 실패 0 · 미실행 4

| attackId | 단계 | 종류 | 기대 | 요청 | 실제 | 요청 ID | 확인 시각 | 결과 |
|---|---|---|---|---|---|---|---|---|
| registered_device_surface | 11 | live | 자료실 화면이 열리고 승인 전 메모 영역은 비어 있음 | GET / | 200 | 1ae69f74-e506-4f35-b61c-e92526ea7fc5 | 2026-10-14T00:16:09.117Z | 통과 |
| public_data_json | 1 | live | 공개 data.json이 없거나 메모가 없음 | GET /data.json | 404 | e9b5ec26-8f3b-4b66-bd62-ed32077ee352 | 2026-10-14T00:16:09.710Z | 통과 |
| anonymous_notes_api | 3 | live | 비로그인 메모 조회 401 | GET /api/notes?id=1 | 401 | 4a90608f-1c70-4881-ab4c-943607831014 | 2026-10-14T00:16:09.725Z | 통과 |
| forged_token_notes | 4 | live | 위조 토큰·위조 서명 메모 조회 401 | GET /api/notes?id=1 | 401 | 8afcdc7d-98cd-4542-b407-5aab7af148b9 | 2026-10-14T00:16:10.220Z | 통과 |
| anonymous_notes_list | 8 | live | 비로그인 전체 목록 조회 401 | GET /api/notes | 401 | 55834d46-892d-4715-8f0d-a4ddc268c9b6 | 2026-10-14T00:16:10.680Z | 통과 |
| anonymous_restore | 10 | live | 비로그인 복구 요청 401 | POST /api/restore | 401 | 9197b863-b868-4307-84ec-034039c0e311 | 2026-10-14T00:16:10.902Z | 통과 |
| unsigned_protected_request | 11 | live | 기기 서명 없는 보호 요청 401 | GET /api/notes?id=1 | 401 device_signature_required | 4bab9e24-8971-4407-b7f3-6a86339272b4 | 2026-10-14T00:16:11.126Z | 통과 |
| unsigned_change_after_restore | 12 | live | 서명 없는 변경 요청 401 | PATCH /api/notes | 401 device_signature_required | 8a3d8bcb-cbef-4c1e-be1f-793d3b4f6a6a | 2026-10-14T00:16:11.346Z | 통과 |
| install_manifest | 11 | live | manifest 200, 앱 이름 있음 | GET /manifest.webmanifest | 200 | eb8e7d21-c49a-4882-8c17-3f5f4d748a9d | 2026-10-14T00:16:11.566Z | 통과 |
| stage2_page_removed | 11 | live | 예전 무인증 화면 404 | GET /index.stage2.html | 404 | 06c1c697-42cf-435d-9516-f6edd9af16d9 | 2026-10-14T00:16:11.817Z | 통과 |
| anonymous_ops_room | 12 | live | 비로그인 작전실 조회 401 | GET /api/ops | 401 | 65756dc6-9b6e-4c5e-9c3a-6617d977091a | 2026-10-14T00:16:11.834Z | 통과 |
| anonymous_device_registry | 12 | live | 비로그인 기기 등록부 조회 401 | GET /api/device | 401 | 4c526135-cc6e-48cb-b3f1-b91f1881ee11 | 2026-10-14T00:16:12.070Z | 통과 |
| revocation_detection_contract | 9 | not_run | 운영 엔진 실사건으로 burst_read 회수 제안 | - | - 운영 엔진이 실사건을 이 앱에 전달하지 않아 요청을 보내지 않음 | - | - | 미실행 |
| revoked_identity_resend | 12 | not_run | 회수된 신원 재전송 403 identity_revoked | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| cross_owner_read | 4 | not_run | B 토큰으로 A 메모 조회 404/403 | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| signed_path_body_tamper | 11 | not_run | 서명 뒤 경로·본문 변경 401 | - | - 승인된 기기 키가 필요해 보내지 않음(npm run device:test 로컬 연습은 통과) | - | - | 미실행 |
| local_decider_1 | 6 | local | 등록 기기의 정상 요청 | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_decider_2 | 6 | local | 미등록 기기의 가상 요청 | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_decider_3 | 7 | local | 복합 이상 접속 | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_decider_4 | 7 | local | 다시 확인한 복합 이상 접속 | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_zone_own | 8 | local | 구역 판정 own → allow | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_zone_otherRead | 8 | local | 구역 판정 otherRead → deny | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_zone_otherUpdate | 8 | local | 구역 판정 otherUpdate → deny | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_zone_otherList | 8 | local | 구역 판정 otherList → deny | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_zone_teacherNotice | 8 | local | 구역 판정 teacherNotice → deny | - | - | - | 2026-10-14T00:16:12.302Z | 통과 |
| local_detect_1 | 9 | local | 정상 조회 30건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
| local_detect_2 | 9 | local | 10분 안에 120건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
| local_detect_3 | 9 | local | 10분 안에 121건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
| local_detect_4 | 9 | local | 폭주 조회 200건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
| local_detect_5 | 9 | local | 서로 다른 사용자 각 100건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
| local_detect_6 | 9 | local | 10분 밖으로 흩어진 조회 200건 | - | - | - | 2026-10-14T00:16:12.304Z | 통과 |
