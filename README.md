# Career Avatar — Frontend

취업 준비 게이미피케이션 플랫폼(퀘스트 → EXP → 레벨업 → 아바타 성장 → AI 추천)의 프론트엔드.
학생 데이터(유저/EXP/퀘스트/배지)와 AI 상담, 관리자 Quest CRUD는 이제 **career-backend** REST API로
동작한다 — 더 이상 mock 배열이 아니다. 대학 Theme·아바타 이미지·정적 카피(카테고리 라벨 등)처럼
DB가 필요 없는 값들만 여전히 클라이언트 쪽 config로 남아있다.

## 실행 전 필수: career-backend 먼저 띄우기

이 프론트는 `career-backend`가 떠 있어야 정상 동작한다.

```bash
cd ../career-backend
mvn spring-boot:run -Dspring-boot.run.profiles=h2   # 설치 없이 바로 (자세한 내용은 career-backend/README.md)
```

로그인 폼은 없다 — `?externalUserId=20231234&studentName=김미래`가 URL에 있으면 그 학번으로
자동 확인(없으면 새로 생성)하고, 없으면 화면에 학번 입력 폼이 뜬다 (실제 대학 홈페이지 임베드에서는
`career-embed.js`가 이 값을 자동으로 넘겨주기 때문에 이 폼을 볼 일이 없다 — 아래 "인증" 참고).

## Install

```bash
npm install
```

`.env` (`.env.example` 참고)에 `VITE_API_BASE`로 백엔드 주소를 지정한다 — 기본값 `http://localhost:8080`.
백엔드를 다른 포트로 띄웠다면 `.env`를 그 값으로 바꾼다.

## Development

```bash
npm run dev
```

백엔드가 안 떠 있으면 화면에 "다시 시도" 버튼과 함께 연결 실패 메시지가 뜬다 (에러를 삼키지 않음).

## Build

```bash
npm run build
npm run preview   # dist/ 를 로컬에서 정적 서빙하며 최종 확인
```

`node_modules/`, `dist/`, `.env*` 는 `.gitignore`에 포함되어 있어 저장소/배포 ZIP에 들어가지 않는다.

## 일반 실행

```
http://localhost:5173/
```

## iframe Mode

iframe에 넣는 URL은 별도 라우트(`/embed`)가 아니라 **쿼리 파라미터** 방식이다. 이유는 아래 "Static Server / Nginx" 참고.

```
http://localhost:5173/?mode=embed&university=SAMPLE&externalUserId=20231234&studentName=김미래
```

### 다른 대학

```
http://localhost:5173/?mode=embed&university=UNIVERSITY_B&externalUserId=b-20240001&studentName=이미래
```

`SAMPLE` = 샘플대학교 / Purple, `UNIVERSITY_B` = 미래대학교 / Blue. 대학명·로고·Primary Color가 URL 하나로 전부 바뀐다.
`externalUserId`가 이미 있는 학번이면 그 학생 기존 데이터를 불러오고, 처음 보는 학번이면 그 자리에서
Lv.1 학생을 새로 만든다 (`studentName`은 신규 생성 시에만 사용).

## Host Demo (iframe Embed Demo)

일반 대학 홈페이지처럼 보이는 더미 페이지 두 개를 `public/`에 두었다 (Vite가 그대로 정적 서빙).

```
http://localhost:5173/host-demo.html      # 샘플대학교
http://localhost:5173/host-demo-b.html    # 미래대학교
```

우측 하단 "AI 커리어 코치" Floating Button → Modal 오픈 → 내부 iframe에 `/?mode=embed&university=...` 로드.
Desktop에서는 `min(1500px, 100vw-60px) × min(900px, 100vh-60px)` 크기의 큰 Modal, Mobile(≤767px)에서는 Full Screen(`100dvh`)으로 전환된다.

## 다른 대학 홈페이지에 심는 법 (career-embed.js)

```html
<script src="/career-embed.js"></script>
<script>
  CareerMate.init({
    university: 'SAMPLE',
    label: 'AI 커리어 코치',
    externalUserId: '20231234',  // 이 대학 홈페이지의 로그인 세션에 있는 학번
    studentName: '김미래',        // 선택 — 처음 방문한 학생일 때만 사용
  });
</script>
```

`init()`을 실수로 두 번 호출해도 버튼/모달이 중복 생성되지 않는다 (`window.__CAREER_MATE_INITIALIZED__` 가드).

`externalUserId`를 안 넘기면 위젯이 로그인 폼 대신 학번 직접 입력 화면을 띄운다 — 실제 대학
홈페이지라면 항상 넘겨줘야 그 화면이 안 뜬다. 서명 안 된 평문 값이라는 한계는
`career-backend/README.md` "인증" 절 참고.

## Static Server / Nginx (SPA Fallback)

Vite dev 서버는 알 수 없는 경로(`/quest`, `/admin/quest` 등 새로고침)를 자동으로 `index.html`에 폴백한다.
`npm run build` 결과물을 별도 정적 서버(Nginx 등)에 올릴 때는 동일한 폴백 규칙이 필요하다:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

iframe 임베드 자체는 `/?mode=embed&university=SAMPLE`처럼 **루트 경로 + 쿼리 파라미터**만 쓰므로, 이 규칙이 없는
가장 단순한 정적 호스팅(별도 rewrite 설정이 어려운 환경)에서도 임베드 자체는 그대로 동작한다.
Fallback 규칙은 사용자가 `/quest`, `/mypage` 같은 하위 경로를 새로고침하는 경우에만 필요하다.

## 화면 URL

| 화면 | URL |
|---|---|
| 학생 Dashboard | `/` |
| 오늘의 퀘스트 (전체) | `/quest` |
| AI 상담 | `/ai-chat` |
| 마이페이지 | `/mypage` |
| 관리자 Quest 관리 | `/admin/quest` |
| iframe Embed | `/?mode=embed&university=SAMPLE` |

## 대학 Theme 변경 방법

`src/config/universities.js` 에 대학 코드/이름/색상(`primaryColor`, `primaryColorHover`, `primaryColorLight`, `primaryColorSoft`, `primaryColor2`)/로고를 등록하고,
URL에 `?university=코드` 를 붙이면 로고·학교명·Primary Color가 바뀐다. 모든 색상은 `--career-primary*` CSS 변수를 통해서만
적용되므로 (`src/context/ThemeContext.jsx` 가 `:root`에 주입) 컴포넌트/CSS에 특정 대학 색상을 하드코딩하지 않는다.
로고 이미지가 없거나 깨지면 `BrandLogo` 컴포넌트가 자동으로 기본 아이콘(✦)으로 대체한다.

학생 데이터(`student_user.university_code`, career-backend)는 `universityCode`만 가지고, 화면에 실제로
표시되는 대학명은 항상 `ThemeContext`(=URL의 `university`)를 기준으로 조회한다 — 화면마다 다른 대학명이
나오는 문제를 원천 차단.

## Responsive 기준

Desktop `>=1024px` / Tablet `768~1023px` / Mobile `<768px`. Tablet 이하에서는 학생·관리자 Sidebar 모두
햄버거로 열고 닫을 수 있는 Drawer로 전환되고 (배경 클릭·ESC로도 닫힘), AI 패널은 전체화면 오프캔버스 + FAB로 전환된다.

## 기술 스택

React + Vite + JavaScript (Plain CSS, 기본 State/Context/useCallback/useMemo만 사용, 추가 UI 프레임워크·상태관리 라이브러리 없음).

## 폴더 구조

```
src/
  api/           client.js(fetch wrapper) · career.js(엔드포인트 함수 모음)
  components/    layout · avatar · quest · career · ai · common
  pages/         Dashboard, Quest, AiChat, MyPage, admin/AdminQuest
  context/       CareerContext(API 연동 — 유저·EXP·퀘스트·배지·토스트·레벨업, loading/error 게이트)
                 ThemeContext(대학 테마 — 클라이언트 config, 아래 설명 참고)
  utils/         careerLevel(레벨업 뱃지 판정용 avatarUnlock 체크), embedMode, postMessage
  data/          여전히 클라이언트에 남는 정적 콘텐츠 (skillMeta 아이콘, 카테고리 라벨, 예정된 프로그램 등 — DB 테이블이 아닌 것들)
  config/        universities(대학 Theme), avatars(레벨→아바타 배열)
  styles/        variables/common/dashboard/responsive/admin
public/
  career-embed.js   대학 홈페이지에 심는 Embed Script (CareerMate.init)
  host-demo.html    더미 대학 홈페이지 (샘플대학교)
  host-demo-b.html  더미 대학 홈페이지 (미래대학교)
```

## API 연동 현황

| 화면/기능 | 데이터 출처 |
|---|---|
| 학생 확인/신규 생성 | `career-backend` `POST /api/auth/identify` — 로그인 폼 없음, 아래 "인증" 참고 |
| Dashboard/Quest/MyPage (유저, EXP, 레벨, 퀘스트, 배지) | `GET /api/career/dashboard/me` 등, JWT로 인증 |
| Quest 완료 | `POST /api/career/quests/{id}/complete` — EXP/레벨업 응답을 그대로 반영. 일부 퀘스트(기업분석/모의면접/자소서)는 실사용 로그가 없으면 서버가 거부함 — `QuestService#requireVerified` 참고 |
| 순위 | `GET /api/career/ranking` — 같은 대학 학생끼리 Level 기준, 이름은 서버에서 마스킹 |
| 이력서 첨삭 | `POST /api/career/resume/review` (multipart, PDF/DOCX만 — HWP는 거절) + `GET /api/career/resume/history` — `ResumeReviewService` 참고, EXP/능력치 연동 없음 |
| AI 상담 | `POST /api/career/ai/chat` (백엔드도 아직 키워드 Mock — 실제 LLM은 2차) |
| 관리자 Quest CRUD | `/api/admin/quests` (등록/수정/삭제마다 목록 재조회, 인증 없음 — 알려진 갭) |
| 대학 Theme (색상/이름/로고) | 여전히 `config/universities.js` (클라이언트) — 아래 이유 참고 |
| 아바타 레벨→이미지, 스킬 아이콘/라벨, 카테고리 목록, 예정된 프로그램 | 여전히 클라이언트 config/data — DB로 옮길 실익이 없는 순수 UI 상수 |

## 인증

로그인 폼이 없다 — 대학 홈페이지가 이미 로그인시켜놓은 학생의 학번(`externalUserId`)을
`career-embed.js`를 통해 그대로 건네받아 확인하거나 새로 만든다. 토큰은 `localStorage`
(`careermate_token`)에 저장되고 (`src/utils/authStorage.js`), 모든 API 요청에 자동으로 붙는다
(`src/api/client.js`). 401을 받으면 토큰을 지우고 다음 접속 때 다시 확인 절차를 밟는다.

직접/개발 접속(`externalUserId` 파라미터도 저장된 토큰도 없을 때)에는 `CareerContext.jsx`의
`IdentifyForm`이 학번을 직접 입력받는 임시 화면을 보여준다 — 실제 서비스에서 로그인 폼처럼
보이는 건 이것뿐이다.

**대학 Theme를 API로 옮기지 않은 이유**: `career-backend`에 `GET /api/career/university/{code}`가 이미
있지만(백엔드 README 참고) 붙이지 않았다 — `career-embed.js`(대학 홈페이지에 박히는 별도 vanilla 스크립트)의
Floating Button은 iframe이 뜨기도 전에 즉시 올바른 색으로 칠해져야 해서, 백엔드 fetch를 기다리면 초기
렌더에 원치 않는 색 → 실제 색으로 바뀌는 깜빡임이 생긴다. 대학 Theme는 "디자인 토큰"에 가까워서 클라이언트에
동기적으로 두는 게 맞다고 판단했다 — 필요해지면 (관리자가 Theme를 직접 편집하는 화면 등) 이 엔드포인트를
그때 붙이면 된다.

`src/utils/postMessage.js` 에 `notifyParent(type, payload, allowedOrigin)` 구조만 준비되어 있다
(`{ source: 'CAREER_MATE', type, payload }`). 실제로 host 페이지에 이벤트를 쏘는 배선은 아직 안 되어 있고,
그때 `allowedOrigin`을 `'*'`가 아닌 실제 대학 도메인으로 지정한다.

## 이번 단계에서 하지 않을 것

실제 LLM/RAG, STT/TTS, 3D 아바타, 진짜 대학 SSO/OAuth(지금은 host page를 신뢰하는 방식 — 위 "인증"
참고), 관리자 인증 — 2차 개발 단계에서 진행. 관리자 Quest는 이제 실제 DB에 저장되므로 새로고침해도
유지된다 (H2 프로파일로 백엔드를 띄운 경우는 백엔드 재시작 시에만 초기화 — MariaDB로 띄우면 그마저도
유지됨).
