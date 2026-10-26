# 케셰브 최종 제출본 재현 기록 (22단계 · 학생 작성)

이 문서는 학생 진술입니다. 아래 "실제 실행"은 학생이 새 폴더에서 직접 실행하고 관찰한 결과이며, ALEPH 서버가 새 환경에서 실행해 확인했다는 뜻이 아닙니다. 공식 판정(서버 AI 의 원문 검토)은 코드·문서를 읽은 결과일 뿐 실행 성공 증명이 아닙니다.

## 1. 제출 정보와 버전

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/prjsghq7/choi-bujang-secret-vault (공개, 브랜치 `main`) |
| 재현한 커밋 | `d914d72329159abccfec4968b94c6fcdaf2f1beb` (2026-10-26 17:11 +0900) |
| 제출 커밋 | 위 커밋 뒤에 문서만 더한 커밋(ALEPH 22단계 폼에 적은 40자리 커밋). 추가·변경 파일: 이 문서, `docs/student-checks/mock-s18~20.mjs`(모의 점검 스크립트), `README.md` 「학생 작성 부분」 링크 한 줄. 서버·화면·학생 render 함수·설정 견본·실행 도구는 바뀌지 않음. 대조: `git diff d914d72 <제출 커밋> --stat` 에 이 파일들만 나와야 함 |
| 앱 버전 | 케셰브 학생 최종 제출본 · **검증 중 버전**(v1.0 아님). 시작 틀 `alekov-client-starter` 0.2.11, 서버 진단 `version` 0.1.0 |
| v1.0 이 아닌 이유 | 실제 SDP 원천 연결, 앱 안 AI 실제 설명(verified), 조치 실집행·결과 재조회, OSV 외부 조회가 미완료·미확인(7절) |

## 2. 재현 환경

| 항목 | 값 |
|---|---|
| OS | Windows 11 Home 10.0.26200 |
| Node.js / npm / Git | v24.11.0 / 11.6.1 / 2.49.0.windows.1 (수업 기준 Node 24.19.0 에서는 미확인) |
| 셸 | Git Bash 로 명령 실행, 브라우저는 Chrome |
| 폴더 | 원래 작업 폴더와 다른 **새 빈 폴더**(학생 PC 임시 폴더 `repro22`)에 clone. 원래 폴더의 `.env`·인증·설정 파일은 복사하지 않음 |

## 3. 재현 절차와 관찰 결과 (2026-10-26, 시각은 UTC)

| 순서 | 명령·조작(앱 폴더 `on-client` 기준) | 관찰 결과 | 구분 |
|---|---|---|---|
| 1 | `git clone https://github.com/prjsghq7/choi-bujang-secret-vault.git final` → `git checkout d914d72…` | clone 성공, `on-client/.env.example` 포함, 작업 트리 깨끗함 | 실제 실행 |
| 2 | `node --version`, `npm --version` | v24.11.0, 11.6.1 | 실제 실행 |
| 3 | 설치 | 외부 npm 의존성이 없어 `npm install` 불필요(`package.json` 에 dependencies 없음, lock 파일 없음) | 원문 확인 |
| 4 | `npm run check` | `node --check student/extension.mjs` 오류 없음(종료 코드 0) | 실제 실행 |
| 5 | `ON_PORT=5189 npm start` | 08:11:38 콘솔 `케셰브 연결 확인: http://127.0.0.1:5189`, `GET /` 200. SQLite ExperimentalWarning 함께 출력 | 실제 실행 |
| 6 | `ON_PORT=5190 npm run demo` | `케셰브 예제: http://127.0.0.1:5190`, `GET /` 200 | 실제 실행 |
| 7 | 기본 모드 API | `/api/me`·`/api/apps`·`/api/events` → `ENGINE_NOT_CONNECTED`, `mode=disconnected`. `/api/vulnerabilities` → `not_configured` | 실제 실행 |
| 8 | 다른 Host 헤더로 요청 | `HOST_REJECTED` | 실제 실행 |
| 9 | 브라우저 `http://127.0.0.1:5190/` | 08:12:12 학생 칸 8개 표시. 아래 4절 | 시연(demo 자료) |
| 10 | 종료 | 두 서버 프로세스 종료 후 `curl` 응답 `000`(연결 불가) | 실제 실행 |
| 11 | 재실행 `ON_PORT=5189 npm start` | 08:12:59 `GET /` 200, 같은 시작 문구. 종료 | 실제 실행 |
| 12 | `node docs/student-checks/mock-s18.mjs` / `mock-s19.mjs` / `mock-s20.mjs` | 같은 커밋의 `student/extension.mjs` 로 8·10·7가지 입력 모두 예상 분기(성공 속성은 대조를 통과한 입력에만) | 모의 점검 |
| 13 | 원래 작업 폴더 확인 | `git status` 깨끗함, 이전 작업이력 파일 유지 | 실제 실행 |
| — | `tools/start-alekov.ps1` | 이번 재현 환경에서 `-ExecutionPolicy Bypass` 실행이 막혀 **미실행**. 같은 `src/server.mjs` 를 npm 으로 실행 | 미확인 |

참고: 주소에 쿼리 문자열을 붙이면(`/?r=1`) 서버가 화면을 주지 않음(`QUERY_REJECTED`). `http://127.0.0.1:5190/` 그대로 연다.

## 4. 13~21단계 누적 기능 (모두 같은 재현 커밋 d914d72 기준)

| 단계 | 기능(학생 함수) | 최종 커밋 재현에서 관찰한 것 | 근거 | 실제 연결 | 미확인과 원인 |
|---|---|---|---|---|---|
| 13 | 현재 로그인(`renderIdentity`) | 연습 사용자, 기기 확인 불가(unknown) ⚠ 주의, 세션 활성(active), "자료 출처: 예제 자료" | 3절 9 | 아니오(demo) | 실제 SDP 사용자·기기: 담당자 설정 없음 |
| 14 | 접근 판정(`renderDecision`) | 학습 자료실 → 접근 허용(allow), 확인할 업무 앱 → 추가 인증 또는 확인 필요(challenge), 개발 저장소 → 접근 거부(deny) | 3절 9 | 아니오(demo) | 실제 정책 판정 |
| 15 | 보안 기록(`renderEvents`) | 기록 1건, 필터 3개, 「event-01 상세」에 근거 e-01·규칙 rule-01·상태 | 3절 9 | 아니오(demo) | 실제 접속·XDR 기록 |
| 16 | 알림·기기·세션·도움정보(`renderStatus`) | 알림 2건(기기 unknown, events access), 기기·세션 칸 | 3절 9 | 아니오(demo) | 실제 기기·세션 목록 |
| 17 | AI 연결 점검(`renderAiConnection`) | 「현재 API 연결 점검」 → 실패, 코드 `ON_AI_PROVISIONING_PENDING`, 유형 "권한 준비 중" | 3절 9 | 연결 안 됨 | 학생 앱 이용 권한 미발급 |
| 18 | AI 사건 설명(`renderExplanation`) | 「AI 설명 요청」 → "AI 설명 실패 … ON_AI_PROVISIONING_PENDING … 기록은 그대로입니다". 성공 경로는 모의 점검만 | 3절 9·12 | 연결 안 됨 | 실제 AI 설명 성공: 권한 없음, 유료 요청 반복 금지 |
| 19 | 조치 상태(`renderAction`) | "아직 미실행(idle)", 지원 조치가 없어 「조치 준비」가 없는 것이 정상이라는 안내. 나머지 상태는 모의 점검만 | 3절 9·12 | 아니오 | 실집행 연결이 아직 준비되지 않음(과제 안내), supportedActions 비어 있음 |
| 20 | 패키지 취약점(`renderVulnerabilities`) | 「설치 패키지 조회」 → 조회 준비 미완료(not_configured), "취약점 없음이 아닙니다". 「다시 불러오기」 뒤 "조회 전"으로 바뀜 | 3절 9·12 | 아니오 | OSV 외부 조회: `ON_PROJECT_DIRECTORY`·`ON_APPROVED_PUBLIC_PACKAGES` 미설정 |
| 21 | 실행 설명서·구성도(`docs/STUDENT_RUNBOOK.md`) | 설명서의 npm 명령·주소·시작 문구·종료·재실행이 3절 관찰과 일치 | 3절 4~11 | 해당 없음 | 실행 도구 `.ps1` 미실행 |

「다시 불러오기」 뒤 AI 설명 칸은 "보안 기록에서 기록을 먼저 고르세요"로 돌아가 이전 설명이 남지 않았습니다.
공식 판정 기록(참고, 단계마다 다른 커밋 기준이며 위 재현을 대신하지 않음): 13 fefc440 · 14 ec241b5 · 15 d20bc4a · 16 30a4d52 · 17 237a571 · 18 c9d2df8 · 19 3fb4c36 · 20 77d1e6b · 21 7977a59. 이 통과 결과들을 합쳐 최종 버전 전체 성공으로 보지 않습니다.

## 5. 누적 원문 일관성 점검

| 대상 | 현재 제출본 | 일치 |
|---|---|---|
| 실행 진입점 | `package.json` scripts: `start`=`node src/server.mjs`, `demo`=`node src/server.mjs --demo`, `check`=`node --check student/extension.mjs` | README·STUDENT_RUNBOOK 명령과 같음(3절에서 실행) |
| 학생 함수 | `student/extension.mjs` 의 render 함수 8개 | `public/app.js` `STUDENT_SLOTS` 의 이름 8개와 같음 |
| 의존성 | Node 내장 모듈만(`node:http`, `node:sqlite` 등), npm 의존성 없음 | 설치 단계 불필요와 일치 |
| 설정 견본 | `on-client/.env.example`(ON_PORT=5189, ON_ENGINE_ADAPTER, ON_AI_MODEL, ON_PROJECT_DIRECTORY, ON_APPROVED_PUBLIC_PACKAGES) | 비밀값 없음. 21단계 커밋부터 저장소에 포함 |
| 문서 | README 「학생 작성 부분」 → STUDENT_RUNBOOK → 이 문서 | 서로 같은 버전·명령 |

## 6. 이동 가능한 구성

- 필요한 것: Git, Node.js 22~24(수업 기준 24.19.0), 이 저장소. 그 밖의 설치 없음.
- 절차: `git clone <저장소>` → `cd <프로젝트 폴더>\on-client` → `npm run check` → `npm start`(또는 `npm run demo`) → `http://127.0.0.1:5189/`.
- 문서·코드의 경로는 모두 `on-client` 기준 상대 경로. 특정 PC 절대 경로나 비밀값에 의존하지 않음(21단계 설명서의 로컬 절대 경로는 d914d72 에서 `<프로젝트 폴더>` 로 바꿈).
- 실제 연결 설정(`-SdpHostConfig`, `-NativeHostConfig`, `.env` 의 열쇠)은 담당자가 PC마다 따로 안내하는 파일이며 저장소에 없음. 다른 PC로 옮길 때 복사하지 않고 새로 발급받음.

## 7. 데이터 보존 계획

| 데이터 | 위치 | 보존·백업 | 복원 | 제한 |
|---|---|---|---|---|
| 학생 코드·문서 | Git 저장소(`student/extension.mjs`, `docs/STUDENT_*.md`, `docs/student-checks/`) | 단계마다 커밋 후 `git push origin main`(GitHub). 시작 틀 업데이트 전에 먼저 커밋 | 새 폴더에 `git clone` 후 `git checkout <커밋>`. 잘못 고친 경우 `git revert` 로 새 커밋(기록을 지우는 `git reset --hard` 는 쓰지 않음) | push 하지 않은 변경은 백업되지 않음 |
| 단계 작업 기록 | 저장소 밖 학생 폴더의 `N단계-작업이력.txt` | 학생이 따로 보관 | 파일 복사 | 저장소·제출물에 포함되지 않음 |
| 화면 상태(판정·설명·조치·패키지 결과) | 브라우저 메모리 | 보존하지 않음 | 「다시 불러오기」로 서버에서 새로 받음 | 새로고침·종료 시 사라짐(의도된 동작: 이전 결과를 현재처럼 남기지 않음) |
| 조치 기록(SQLite) | 담당자가 지정한 기존 SQLite 파일(`src/actions/store.mjs`, 테이블 `alekov_action_intents/state/audit` 추가) | 기본 실행에서는 만들지도 쓰지도 않음. 연결 시 담당자가 그 DB 파일을 백업 | 담당자가 DB 파일 복원 | 학생 저장소에 없음. 이번 재현에서는 미사용(미확인) |
| AI 앱 자격 | 담당자 설정 시 Windows DPAPI(현재 사용자 범위)로 암호화(`tools/app-credentials.ps1`) | 백업하지 않음 | 새로 발급 | 같은 Windows 사용자에서만 복호화 가능 → 다른 PC로 옮길 수 없음 |

기본 실행(`npm start`/`npm run demo`)은 디스크에 데이터를 쓰지 않습니다(`src` 에서 파일 쓰기는 조치 SQLite 저장소뿐이며 담당자 설정이 있을 때만 열림).

## 8. 증거 종류 구분

| 종류 | 이 문서에서의 뜻 | 해당 항목 |
|---|---|---|
| 실제 실행 검증 | 학생이 새 폴더에서 명령을 실행하고 출력·응답을 관찰 | 3절 1~2, 4~8, 10, 11, 13 |
| 시연(demo) | 예제 자료(`--demo`)로 화면 동작을 봄. 실제 시스템 연결 아님 | 3절 9, 4절 13~16 |
| 모의 점검 | 가짜 입력으로 학생 함수만 실행 | 3절 12 |
| 원문 확인 | 코드·문서를 읽어 확인(실행 안 함) | 3절 3, 5절, 7절 일부 |
| 학생 진술 | 이 문서 전체는 학생이 적은 기록 | — |
| 공식 판정 | ALEPH 서버 AI 가 커밋 원문을 읽은 결과. 실행 증명 아님 | 4절 참고 줄 |

## 9. 지원 범위와 미해결 사항

- 지원(확인함): Windows 11, Node v24.11.0, 기본 모드(disconnected)와 예제 모드(demo)의 실행·종료·재실행, 학생 칸 8개 표시와 실패·미연결 안내.
- 미확인: Node 24.19.0, `tools/start-alekov.ps1`, macOS·Linux.
- 미완료(운영 연결 필요): 실제 SDP 사용자·기기·기록, 앱 안 AI 실제 설명 성공, 조치 실집행·결과 재조회, OSV 외부 조회 결과(complete/partial).
- 따라서 이 제출본은 **검증 중 버전**입니다. 22단계 통과는 원문 검토 기준의 수료이며 실제 운영 인증이나 v1.0 인증이 아닙니다.
