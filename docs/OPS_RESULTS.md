# 12단계 실측 결과

대상: https://choi-bujang-secret-vault-navy.vercel.app · 생성: 2026-10-14T00:23:13.329Z

심판의 41종 시험 결과가 아닙니다. live 행만 실제 배포 응답(npm run bundle의 attackId와 같음)이고 local은 로컬 연습, not_run은 보내지 않은 요청입니다.

통과 27 · 실패 0 · 미실행 5

| attackId | 단계 | 종류 | 기대 | 요청 | 실제 | 요청 ID | 확인 시각 | 결과 |
|---|---|---|---|---|---|---|---|---|
| registered_device_surface | 11 | live | 자료실 화면이 열리고 승인 전 메모 영역은 비어 있음 | GET / | 200 | 90309da8-2591-42b5-9c3a-23efd26ca80b | 2026-10-14T00:23:09.968Z | 통과 |
| public_data_json | 1 | live | 공개 data.json이 없거나 메모가 없음 | GET /data.json | 404 | 6cd5386b-8017-4c8c-aed2-79ccffebc1df | 2026-10-14T00:23:10.528Z | 통과 |
| anonymous_notes_api | 3 | live | 비로그인 메모 조회 401 | GET /api/notes?id=1 | 401 | da8df4a2-62d3-49dc-bc91-971c940c65e6 | 2026-10-14T00:23:10.565Z | 통과 |
| forged_token_notes | 4 | live | 위조 토큰·위조 서명 메모 조회 401 | GET /api/notes?id=1 | 401 | 6ced8786-8772-4a12-a736-94c05f299549 | 2026-10-14T00:23:11.100Z | 통과 |
| anonymous_notes_list | 8 | live | 비로그인 전체 목록 조회 401 | GET /api/notes | 401 | d25ee98d-b772-4319-9290-cf368641968a | 2026-10-14T00:23:11.340Z | 통과 |
| anonymous_restore | 10 | live | 비로그인 복구 미리 보기 401 | GET /api/restore?id=1 | 401 | 9ca02984-ac1c-4695-9b5a-d0af52a5bad0 | 2026-10-14T00:23:11.571Z | 통과 |
| unsigned_restore_preview | 12 | live | 서명 없는 복구 경로 조회 401 | GET /api/restore?id=1 | 401 device_signature_required | 7b3c56a7-b210-4e0b-aebb-b005a347ac3a | 2026-10-14T00:23:12.049Z | 통과 |
| unsigned_protected_request | 11 | live | 기기 서명 없는 보호 요청 401 | GET /api/notes?id=1 | 401 device_signature_required | 70fb9c23-e26f-4a49-a950-479b3cd08b97 | 2026-10-14T00:23:12.281Z | 통과 |
| install_manifest | 11 | live | manifest 200, 앱 이름 있음 | GET /manifest.webmanifest | 200 | 102fa644-5cb7-41eb-b9a6-909b966d10a6 | 2026-10-14T00:23:12.510Z | 통과 |
| stage2_page_removed | 11 | live | 예전 무인증 화면 404 | GET /index.stage2.html | 404 | 12a69661-d128-4696-abaf-25bd9e111870 | 2026-10-14T00:23:12.749Z | 통과 |
| anonymous_ops_room | 12 | live | 비로그인 작전실 조회 401 | GET /api/ops | 401 | 055183f7-088f-433b-a34a-f2b457f193f7 | 2026-10-14T00:23:12.781Z | 통과 |
| anonymous_device_registry | 12 | live | 비로그인 기기 등록부 조회 401 | GET /api/device | 401 | cf74c330-8baf-44d4-aa1e-923fd07bde5d | 2026-10-14T00:23:13.035Z | 통과 |
| unsigned_change_after_restore | 12 | not_run | 복구 뒤 서명 없는 변경(PATCH) 401 | - | - 제출 묶음은 읽기 요청(GET·HEAD)만 보내므로 보내지 않음(npm run device:test 로컬 연습은 통과) | - | - | 미실행 |
| revocation_detection_contract | 9 | not_run | 운영 엔진 실사건으로 burst_read 회수 제안 | - | - 운영 엔진이 실사건을 이 앱에 전달하지 않아 요청을 보내지 않음 | - | - | 미실행 |
| revoked_identity_resend | 12 | not_run | 회수된 신원 재전송 403 identity_revoked | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| cross_owner_read | 4 | not_run | B 토큰으로 A 메모 조회 404/403 | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| signed_path_body_tamper | 11 | not_run | 서명 뒤 경로·본문 변경 401 | - | - 승인된 기기 키가 필요해 보내지 않음(npm run device:test 로컬 연습은 통과) | - | - | 미실행 |
| local_decider_1 | 6 | local | 등록 기기의 정상 요청 | - | - | - | 2026-10-14T00:23:13.326Z | 통과 |
| local_decider_2 | 6 | local | 미등록 기기의 가상 요청 | - | - | - | 2026-10-14T00:23:13.326Z | 통과 |
| local_decider_3 | 7 | local | 복합 이상 접속 | - | - | - | 2026-10-14T00:23:13.326Z | 통과 |
| local_decider_4 | 7 | local | 다시 확인한 복합 이상 접속 | - | - | - | 2026-10-14T00:23:13.326Z | 통과 |
| local_zone_own | 8 | local | 구역 판정 own → allow | - | - | - | 2026-10-14T00:23:13.327Z | 통과 |
| local_zone_otherRead | 8 | local | 구역 판정 otherRead → deny | - | - | - | 2026-10-14T00:23:13.327Z | 통과 |
| local_zone_otherUpdate | 8 | local | 구역 판정 otherUpdate → deny | - | - | - | 2026-10-14T00:23:13.327Z | 통과 |
| local_zone_otherList | 8 | local | 구역 판정 otherList → deny | - | - | - | 2026-10-14T00:23:13.327Z | 통과 |
| local_zone_teacherNotice | 8 | local | 구역 판정 teacherNotice → deny | - | - | - | 2026-10-14T00:23:13.327Z | 통과 |
| local_detect_1 | 9 | local | 정상 조회 30건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
| local_detect_2 | 9 | local | 10분 안에 120건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
| local_detect_3 | 9 | local | 10분 안에 121건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
| local_detect_4 | 9 | local | 폭주 조회 200건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
| local_detect_5 | 9 | local | 서로 다른 사용자 각 100건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
| local_detect_6 | 9 | local | 10분 밖으로 흩어진 조회 200건 | - | - | - | 2026-10-14T00:23:13.328Z | 통과 |
