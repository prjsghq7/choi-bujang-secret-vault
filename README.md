# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.
## 2단계: 자료를 코드 밖으로 옮김
- Supabase의 public.notes에 실습용 가상 메모 네 건을 저장했습니다. owner_id uuid를 두고 RLS를 켰으며 anon·authenticated 읽기 권한은 없습니다.
- 화면은 Vercel의 /api/notes 서버 함수를 통해 자료를 읽습니다. SUPABASE_URL과 서버 전용 SUPABASE_SECRET_KEY는 Vercel 환경변수로만 관리합니다.
- 최신 GitHub의 루트·public/data.json에는 메모 문장을 남기지 않았습니다.
- API 주소는 3단계 전까지 공개되어 있을 수 있습니다. 이전 공개 커밋과 배포 이력은 삭제되지 않습니다.
- 확인 파일: supabase-notes.sql, stage2-history.txt.
검증 시 시크릿 창에서 /, /data.json, /api/notes를 확인하고, 서버 키가 브라우저 응답·로그에 나타나지 않는지 확인하세요.

## 4단계: 로그인해도 내 자료만 보이게 함
- 서버가 검증한 토큰의 사용자 ID를 모든 notes 조회·추가·수정·삭제 요청의 `owner_id` 조건에 묶습니다.
- 다른 사용자의 숫자 ID를 요청해도 조회·수정·삭제 대상이 되지 않으며, 화면에는 현재 로그인 사용자의 자료만 표시됩니다.
- Supabase `authenticated` 역할에 CRUD 권한을 부여하고 `auth.uid()`와 `owner_id`를 비교하는 RLS 정책을 적용합니다. `anon`은 계속 거부합니다.
- 심판 토큰과 Supabase 사용자 토큰 모두 서버에서 검증하며, 서버 전용 키는 응답·브라우저·로그에 넣지 않습니다.
- 이전 공개 커밋과 배포 이력은 남아 있으므로 과거 노출이 삭제됐다고 보지 않습니다.

## 5단계: 자료 요청을 서버 한곳으로 모음
- 브라우저는 `/api/auth`와 `/api/notes`만 호출하고 Supabase URL·공개 키·서버 전용 키를 포함하지 않습니다.
- Supabase `anon` 직접 접근 권한은 회수되어 원본 Data API로 메모를 읽거나 수정할 수 없습니다.
- `aleph.json`의 `allowedRoutes`에는 서버 함수 경로를 기록하고, 서버 함수의 로그인·소유자 검사는 유지합니다.

## 6단계: 등록한 기기만 자료실에 들어옴
- `src/decider.mjs`는 판정 요청 계약의 `deviceRegistered`가 `true`인 경우에만 `allow`와 `approved`를 반환합니다.
- `deviceRegistered`가 `false`이거나 없으면 `deny`와 `device_not_registered`로 거부합니다.
- 판정기는 계약에 없는 사용자·기기·위치 필드를 만들지 않으며, 인증서·CA·개인키를 생성하거나 저장하지 않습니다.
- 로컬 확인은 `npm run decider:test`로 실행합니다. 출력에서 `등록 기기의 정상 요청`과 `미등록 기기의 가상 요청`이 모두 `통과`인지 확인합니다.
- `npm run bundle`은 배포 주소의 기존 화면과 비로그인 `/api/notes` 응답을 실제로 요청해 확인합니다. 기기 판정 자체는 `npm run decider:test`의 가상 요청 연습으로 확인합니다.
- 이 명령은 가상 요청 연습이며 실제 심판 판정이나 운영 접속 증거가 아닙니다.

## 7단계: 평소와 다른 접속은 다시 확인함
- `deviceRegistered`가 true인 요청만 다음 규칙으로 진행하고, 기존 미등록 기기 거부를 유지합니다.
- 엔진 출처가 `judge_fixture`로 확인된 가상 사건에서만 낯선 지역·네트워크·시간과 대량 최근 행동의 조합을 `step_up_required`로 보냅니다.
- 출처가 없거나 불명확한 지역·시각·네트워크 값은 임의의 정상값으로 채우지 않으며, 브라우저 위치·헤더를 신뢰하지 않습니다.
- `stepUp.verified`가 true이고 `authAgeSeconds`가 0~900초인 재로그인 후 요청만 복합 이상 사건을 허용합니다.
- `npm run fixture:7`에서 정상 사건은 `allow`, 복합 이상 사건은 `step_up`인지 확인하고, `npm run decider:test`에서 등록·미등록·재확인 흐름을 확인합니다. 두 명령은 가상 요청 연습이며 실제 심판 판정이나 운영 접속 증거가 아닙니다.

## 8단계: 자료마다 갈 수 있는 구역을 나눔
- `src/decider.mjs`는 계약에 있는 `service`, `method`, `path`, `route`만 사용해 notes의 허용된 자원 경로와 동작을 확인합니다.
- 다른 구역 표식, 공지·강사 구역, 허용되지 않은 경로·동작은 `resource_not_allowed`로 거부하고 `resource_zone`, `resource_owner` 규칙을 남깁니다.
- `/api/notes`는 자료 ID가 없는 전체 목록 요청을 거부하고, 인증한 사용자의 검증된 `owner_id`를 단건 조회·추가·수정·삭제 조건에 계속 묶습니다. 브라우저 화면의 구역 표시만으로 접근을 허용하지 않습니다.
- `npm run fixture:8`에서 본인 notes 요청은 `allow`, 다른 구역 조회·수정·목록과 공지 수정은 `deny`인지 확인합니다. 이 명령은 가상 요청 연습이며 실제 심판 판정이나 운영 접속 증거가 아닙니다.

## 9단계: 도플갱어를 찾고 권한 회수를 제안함
- `src/detect.mjs`는 운영 엔진이 검증한 사건에서 가명 주체와 GET 동작·시각만 읽고, 메모 본문·토큰·실명은 저장하거나 출력하지 않습니다.
- 같은 가명 주체의 GET 조회가 어느 10분 구간에서든 120건을 초과할 때만 `propose_revocation`과 `burst_read` 이유 코드를 제안합니다. 정상 조회와 여러 주체의 합산은 `observe`로 유지합니다.
- 이 단계는 회수 제안만 만들며 실제 기기 권한 변경이나 회수 API를 임의로 실행하지 않습니다. `npm run detect:test`는 가상 사건 연습입니다.

## 10단계: 검증된 사본에서 메모 한 건과 정책을 복구함

### 복구 서비스와 경로
- 서비스: Vercel 서버 함수 `api/restore.js` · 경로 `GET /api/restore`, `POST /api/restore` (`aleph.config.json`과 배포된 `/aleph.json`의 `restoreRoute`).
- 인증: `/api/notes`와 같은 로그인 검증기(심판 토큰 또는 학생 Supabase 토큰). 토큰이 없거나 틀리면 `401`.
- 사본 저장소: Supabase Storage의 **비공개** 버킷 `note-backups`. 서버 전용 키로만 읽고 쓰며 브라우저·공개 저장소에는 메모 사본이 없습니다.

### 0. 저장소 사본을 다시 읽어 무결성 기록과 대조
- `backups/manifest.json`은 침해 전에 검증한 `backups/notes.json`, `backups/verified-policy.json`의 SHA-256(줄바꿈 LF 기준)과 버전 `stage-9-savepoint`를 기록한 무결성 기록입니다.
- `/api/restore`는 모든 요청에서 먼저 `src/restore.mjs`의 `verifyBackupFiles`로 두 사본을 **디스크에서 다시 읽어** 해시·버전을 대조하고, 실제 복원 직전에 한 번 더 같은 검증을 합니다. 파일이 없거나 해시·버전이 다르면 `412`와 실패 파일 목록을 돌려주고 **복구를 멈춥니다**.
- 이 저장소 사본(시험 계정 B `owner_key: judge:b`의 가상 메모)은 비공개 저장소에 그 메모의 사본이 없을 때만 검증된 대체 사본으로 씁니다.
- 로컬 확인: `npm run restore:test` — 정상 사본은 통과, 변조된 사본·무결성 기록이 없는 사본은 중단되는지 확인합니다.
### 침해 전 사본과 검증 기준
- 메모가 `/api/notes`로 **처음 만들어질 때 한 번만** 사본 `notes/<owner_id>/<id>.json`(버전 시각·ID·소유자·제목·본문·본문 SHA-256)을 저장합니다. 이후 수정·삭제·조회는 사본을 만들거나 바꾸지 않습니다.
- 같은 때에 별도 무결성 기록 `manifests/<owner_id>/<id>.json`에 **사본 파일 바이트의 SHA-256**, 본문 SHA-256, 버전, ID, 소유자를 저장합니다.
- 두 파일 모두 덮어쓰기 금지(`x-upsert: false`)로 저장해 변조·삭제 뒤에도 침해 전 내용과 기준값이 남습니다.

### 복구 전에 사본을 다시 읽어 검증
`src/note-backup.mjs`의 `readVerifiedBackup`이 복구 직전에 저장소에서 사본과 무결성 기록을 **다시 읽고** 다음을 모두 확인합니다.
`manifestSchema`, `backupSchema`, `backupFileHash`(사본 바이트 SHA-256 = 기록값), `version`, `id`, `owner`, `contentHash`(본문 SHA-256 = 사본값 = 기록값).
- 사본이나 기록이 없으면 `404`, 하나라도 맞지 않으면 `412`와 실패 항목(`failed`)을 돌려주고 **복구를 멈춥니다**. 이때 메모에는 아무것도 쓰지 않습니다.

### 메모 한 건 복구: 미리 보기 → 확인 → 재검증 → 복원
1. `GET /api/restore?id=<메모 ID>` 또는 확인 없는 `POST /api/restore {"id": "<메모 ID>"}`: 사본을 검증한 뒤 `preview`(사본 버전 `backupVersion`, 현재 상태 `tampered`/`deleted`/`intact`, 바뀔 항목 `changes`, 검증 결과 `backupChecks`)와 `planToken`만 돌려줍니다(`200`/`428`). **아무것도 바꾸지 않습니다.**
2. `POST /api/restore {"id": "<메모 ID>", "confirmed": true, "planToken": "<1에서 받은 값>"}`: 사본을 **한 번 더 다시 읽어 검증**하고, 미리 본 뒤 사본이나 메모가 바뀌었으면 `409`로 멈춥니다.
3. 검증이 통과하면 그 한 건만 되돌립니다. 변조된 메모는 사본 제목·본문으로, 삭제된 메모는 같은 ID·소유자로 다시 만듭니다. 다른 메모, 다른 소유자의 자료(`403`/`404`), 감사 기록은 건드리지 않습니다.
4. 복원 뒤 저장소를 다시 읽어 `idMatch`, `ownerMatch`, `contentHashMatch`를 확인합니다. 하나라도 틀리면 `502`.
- 성공 응답(`200`): `restored`(`id`, `owner_key`, `owner_id`, `title`, `content`, `content_sha256`), `changes`, `verification`, `auditPreserved`(본문 없는 감사 기록을 `audit/`에 새 파일로 덧붙였는지), `retest`(복구 직후 같은 요청에서 실제 실행한 6~9단계 판정 재시험 결과).

### 정책 복구: 미리 보기 → 확인
- `GET /api/restore`는 검증된 정책 사본 `backups/verified-policy.json`(`stage-9-savepoint`)과 현재 판정 규칙의 차이(`plan.changes`), `planToken`, 호출자 메모 사본의 상태를 보여 줍니다. 아무것도 바꾸지 않습니다.
- 정책 사본 형식·버전·범위 검증이 실패하면 `412`로 멈춥니다.
- `POST /api/restore {"target": "policy", "confirmed": true, "planToken": "..."}`일 때만 진행하며 확인이 없으면 `428`. 실제 운영 정책은 바꾸지 않습니다.

### 복구 뒤 1~9단계 재시험 순서
복구 응답의 `retest`는 서버가 그 자리에서 실행한 결과입니다. 나머지는 사람이 직접 다시 보내야 하는 요청이며, 직접 실행하지 않은 항목은 **미실행**으로 둡니다.

| 순서 | 단계 | 요청 | 기대 결과 | 상태 |
|---|---|---|---|---|
| 1 | 1·2 | 비로그인 `GET /data.json`, GitHub 최신 `data.json` | 메모 문장 없음 | 미실행 |
| 2 | 3·5 | 비로그인 `GET /api/notes`, 원본 Supabase REST 직접 조회 | `401` / 거부 | 미실행 |
| 3 | 4 | B 토큰으로 복구한 메모 `GET /api/notes?id=` | `200`, 사본과 같은 해시 | 미실행 |
| 4 | 4·8 | A 토큰으로 B 메모 ID 조회·수정·복구 | `404`/`403` 거부 | 미실행 |
| 5 | 8 | `GET /api/notes`(ID 없는 목록) | `403` 거부 | 미실행 |
| 6 | 6 | 등록 기기 / 미등록 기기 판정 | `allow` / `deny` | 복구 응답 `retest`에서 자동 실행 |
| 7 | 7 | 복합 이상 접속 / 재확인 후 접속 | `step_up` / `allow` | 복구 응답 `retest`에서 자동 실행 |
| 8 | 8 | 본인 메모 / 다른 구역·목록·공지 수정 판정 | `allow` / `deny` | 복구 응답 `retest`에서 자동 실행 |
| 9 | 9 | 정상 조회 / 10분 내 121건 이상 GET | `observe` / `propose_revocation` | 복구 응답 `retest`에서 자동 실행 |

로컬 연습: `npm run restore:test`, `npm run decider:test`, `npm run fixture:8`, `npm run detect:test`. 로컬 연습 결과는 심판 판정이 아닙니다.
