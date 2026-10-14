# 12단계 실측 결과

대상: https://choi-bujang-secret-vault-navy.vercel.app · 생성: 2026-10-14T00:27:59.022Z

심판의 41종 시험 결과가 아닙니다. live 행만 실제 배포 응답(npm run bundle의 attackId와 같음)이고 local은 로컬 연습, not_run은 보내지 않은 요청입니다.

통과 27 · 실패 0 · 미실행 5

| attackId | 단계 | 종류 | 기대 | 요청 | 실제 | 요청 ID | 확인 시각 | 결과 |
|---|---|---|---|---|---|---|---|---|
| registered_device_surface | 11 | live | 자료실 화면이 열리고 승인 전 메모 영역은 비어 있음 | GET / | 200 | 830221e3-847c-42a5-ac26-9960f62f1515 | 2026-10-14T00:27:55.534Z | 통과 |
| public_data_json | 1 | live | 공개 data.json이 없거나 메모가 없음 | GET /data.json | 404 | d9ed5fb7-a1a6-4494-9e3f-cac772baa1b0 | 2026-10-14T00:27:56.180Z | 통과 |
| anonymous_notes_api | 3 | live | 비로그인 메모 조회 401 | GET /api/notes?id=1 | 401 | 1b66e28c-7800-4032-ba58-039e7e30fde7 | 2026-10-14T00:27:56.204Z | 통과 |
| forged_token_notes | 4 | live | 위조 토큰·위조 서명 메모 조회 401 | GET /api/notes?id=1 | 401 | 252e4aab-506c-412f-946c-0d56c9aa5528 | 2026-10-14T00:27:56.689Z | 통과 |
| anonymous_notes_list | 8 | live | 비로그인 전체 목록 조회 401 | GET /api/notes | 401 | 120f5779-05e5-4078-a5fb-ab1d4bebefa8 | 2026-10-14T00:27:57.121Z | 통과 |
| anonymous_restore | 10 | live | 비로그인 복구 미리 보기 401 | GET /api/restore?id=1 | 401 | 0288aa74-df52-4077-b017-bcf99ef79f9b | 2026-10-14T00:27:57.549Z | 통과 |
| unsigned_restore_preview | 12 | live | 서명 없는 복구 경로 조회 401 | GET /api/restore?id=1 | 401 device_signature_required | cbd098da-a9d7-47f6-9bb0-bdbf663009ea | 2026-10-14T00:27:57.781Z | 통과 |
| unsigned_protected_request | 11 | live | 기기 서명 없는 보호 요청 401 | GET /api/notes?id=1 | 401 device_signature_required | 546cb88b-2fcb-43aa-8230-a8f627b3ccbe | 2026-10-14T00:27:58.049Z | 통과 |
| install_manifest | 11 | live | manifest 200, 앱 이름 있음 | GET /manifest.webmanifest | 200 | 22c03111-b199-4234-9a9a-da97cf8b3393 | 2026-10-14T00:27:58.298Z | 통과 |
| stage2_page_removed | 11 | live | 예전 무인증 화면 404 | GET /index.stage2.html | 404 | 30db5a41-61b6-4e86-a1ea-f5cf68c81fc7 | 2026-10-14T00:27:58.525Z | 통과 |
| anonymous_ops_room | 12 | live | 비로그인 작전실 조회 401 | GET /api/ops | 401 | 53385723-4ab3-4bd4-8adb-860909865716 | 2026-10-14T00:27:58.538Z | 통과 |
| anonymous_device_registry | 12 | live | 비로그인 기기 등록부 조회 401 | GET /api/device | 401 | 7d911090-bbe7-4665-a995-7c0e12922230 | 2026-10-14T00:27:58.768Z | 통과 |
| unsigned_change_after_restore | 12 | not_run | 복구 뒤 서명 없는 변경(PATCH) 401 | - | - 제출 묶음은 읽기 요청(GET·HEAD)만 보내므로 보내지 않음(npm run device:test 로컬 연습은 통과) | - | - | 미실행 |
| revocation_detection_contract | 9 | not_run | 운영 엔진 실사건으로 burst_read 회수 제안 | - | - 운영 엔진이 실사건을 이 앱에 전달하지 않아 요청을 보내지 않음 | - | - | 미실행 |
| revoked_identity_resend | 12 | not_run | 회수된 신원 재전송 403 identity_revoked | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| cross_owner_read | 4 | not_run | B 토큰으로 A 메모 조회 404/403 | - | - 실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음 | - | - | 미실행 |
| signed_path_body_tamper | 11 | not_run | 서명 뒤 경로·본문 변경 401 | - | - 승인된 기기 키가 필요해 보내지 않음(npm run device:test 로컬 연습은 통과) | - | - | 미실행 |
| local_decider_1 | 6 | local | 등록 기기의 정상 요청 | - | - | - | 2026-10-14T00:27:59.020Z | 통과 |
| local_decider_2 | 6 | local | 미등록 기기의 가상 요청 | - | - | - | 2026-10-14T00:27:59.020Z | 통과 |
| local_decider_3 | 7 | local | 복합 이상 접속 | - | - | - | 2026-10-14T00:27:59.020Z | 통과 |
| local_decider_4 | 7 | local | 다시 확인한 복합 이상 접속 | - | - | - | 2026-10-14T00:27:59.020Z | 통과 |
| local_zone_own | 8 | local | 구역 판정 own → allow | - | - | - | 2026-10-14T00:27:59.021Z | 통과 |
| local_zone_otherRead | 8 | local | 구역 판정 otherRead → deny | - | - | - | 2026-10-14T00:27:59.021Z | 통과 |
| local_zone_otherUpdate | 8 | local | 구역 판정 otherUpdate → deny | - | - | - | 2026-10-14T00:27:59.021Z | 통과 |
| local_zone_otherList | 8 | local | 구역 판정 otherList → deny | - | - | - | 2026-10-14T00:27:59.021Z | 통과 |
| local_zone_teacherNotice | 8 | local | 구역 판정 teacherNotice → deny | - | - | - | 2026-10-14T00:27:59.021Z | 통과 |
| local_detect_1 | 9 | local | 정상 조회 30건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
| local_detect_2 | 9 | local | 10분 안에 120건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
| local_detect_3 | 9 | local | 10분 안에 121건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
| local_detect_4 | 9 | local | 폭주 조회 200건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
| local_detect_5 | 9 | local | 서로 다른 사용자 각 100건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
| local_detect_6 | 9 | local | 10분 밖으로 흩어진 조회 200건 | - | - | - | 2026-10-14T00:27:59.022Z | 통과 |
