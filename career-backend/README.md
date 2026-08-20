# career-backend

`ai_career_coach` (Career Avatar) Frontend의 REST API 백엔드. Spring Boot + MyBatis + MariaDB.
Frontend(`career-avatar`)는 이 API에 연결되어 있다 (`src/context/CareerContext.jsx` 참고) — Mock Data는
DB로 옮길 수 없는 순수 UI 상수(대학 Theme, 아이콘 라벨 등)만 남아있다.

## 기술 스택

Java 17, Spring Boot 3.3, MyBatis(XML Mapper), MariaDB(운영) / H2(로컬 실행용), Lombok, Docker.

## 실행 방법

### 옵션 A. Docker (백엔드만 컨테이너, 외부 MariaDB에 연결)

`docker-compose.yml`은 백엔드 컨테이너만 띄우고, 이미 로컬에 떠 있는 MariaDB에 연결한다
(DB 컨테이너를 따로 번들하지 않음 — DB는 직접 운영하는 걸 쓴다는 전제).

```bash
# 1. 로컬 MariaDB에 DB/유저 준비 (옵션 B와 동일)
mysql -u root -p -e "CREATE DATABASE career_db CHARACTER SET utf8mb4;"
mysql -u root -p -e "CREATE USER 'career_app'@'%' IDENTIFIED BY 'career_app'; GRANT ALL ON career_db.* TO 'career_app'@'%';"

# 2. 프로젝트 루트(ai_career_coach/)에서
docker compose up --build
```

기본값은 `host.docker.internal:3306`(Docker Desktop이 자동으로 호스트 머신을 가리키게 해주는 이름) +
`career_db`/`career_app`/`career_app`. 로컬 MariaDB의 DB명·계정·포트가 다르면 프로젝트 루트 `.env`에
`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`를 채워서 오버라이드 (`.env.example` 참고).
`8080` 포트가 이미 사용 중이면 같은 파일에 `BACKEND_PORT`도 지정.

연결이 안 되면 두 가지를 확인: (1) 로컬 MariaDB의 `bind-address`가 `127.0.0.1`로 막혀있지 않은지,
(2) `career_app` 계정이 `'@%'`(원격 접속) 권한으로 생성됐는지 — `'@localhost'`로만 만들면 컨테이너에서 접속 거부됨.

`schema.sql`/`data.sql`은 `INSERT IGNORE`를 쓰기 때문에 컨테이너를 재시작해도 안전하다 — 실제로 EXP 데이터가
백엔드 컨테이너 재시작 후에도 남아있는지(H2와 달리 진짜 영속되는지) 확인됨.

### 옵션 B. 로컬 MariaDB 직접 설치 (Docker 없이)

```bash
# 1. DB 생성
mysql -u root -p -e "CREATE DATABASE career_db CHARACTER SET utf8mb4;"
mysql -u root -p -e "CREATE USER 'career_app'@'%' IDENTIFIED BY 'career_app'; GRANT ALL ON career_db.* TO 'career_app'@'%';"

# 2. 실행 (schema.sql/data.sql이 기동 시 자동 실행됨 — 재실행해도 안전, INSERT IGNORE 사용)
mvn spring-boot:run
```

`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` 환경변수로 접속 정보를 바꿀 수 있다
(기본값은 `application.yml` 참고 — `localhost:3306/career_db`, `career_app`/`career_app`).

### 옵션 C. H2 (설치 없이 바로 실행, 데이터는 재시작하면 초기화)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

MariaDB 호환 모드 H2 인메모리 DB로 기동 — 설치 없이 API 동작을 바로 확인할 때 사용.
재시작하면 데이터 초기화됨 (의도된 동작, 개발 편의용 프로파일).

서버: `http://localhost:8080`

## 인증 — "로그인"이 아니라 "확인"

이 위젯은 로그인 폼이 없다. 대학 홈페이지(host page)가 이미 자기 학생을 로그인시켜놓은 상태에서
그 iframe 안에 이 서비스를 띄우는 구조이기 때문에, host page가 자기 university code + 자기
학번(`externalUserId`)을 건네주면 그걸 그대로 신뢰해서:

* `(universityCode, externalUserId)` 조합이 이미 있으면 → 기존 학생 데이터 로드
* 없으면 → Lv.1 / EXP 0 학생을 새로 생성

하고 JWT를 발급한다 (`POST /api/auth/identify`). 이후 요청은 전부 `Authorization: Bearer <token>`
헤더로 인증하고, `userId`는 더 이상 요청 파라미터로 안 받는다 (누구나 임의 userId를 넣어서 남의
데이터를 볼 수 있었던 문제 자체를 없앤 것).

**알려진 한계**: `externalUserId`는 서명되지 않은 평문 값이다. host page(대학 홈페이지)가
그 자체로 신뢰된 서버 사이드 로그인 뒤에 있다는 전제라 MVP 단계에선 괜찮지만, 실배포에서는
host page 서버가 서명한 토큰으로 바꿔야 한다 (지금은 `career-embed.js`가 그냥 클라이언트에서
값을 그대로 전달함 — `public/career-embed.js` 상단 주석 참고).

`/api/admin/quests/**`는 이번에도 인증 없이 열려있다 (관리자 인증은 아직 안 함 — 별도 스코프).

## Endpoint 목록

프론트엔드 README(`career-avatar/README.md`)에 명시된 API 계획과 1:1 대응. `me`가 붙은 경로는 전부
JWT에서 userId를 꺼내 쓴다 — 요청자가 직접 지정할 수 없다.

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/identify` | - | `{universityCode, externalUserId, name?, major?, grade?, desiredJob?}` → `{token, user, newUser}` |
| GET | `/api/career/university/{code}` | - | 대학 Theme 설정 (이름/색상/로고) |
| GET | `/api/career/user/me` | 필요 | 학생 기본 정보 |
| GET | `/api/career/dashboard/me` | 필요 | Dashboard 1회 호출용 통합 응답 (user+skills+quests+badges) |
| GET | `/api/career/quests` | 필요 | 학생 퀘스트 목록 (완료 상태 포함) |
| POST | `/api/career/quests/{id}/complete` | 필요 | 퀘스트 완료 처리 (EXP/레벨업 반영) |
| GET | `/api/career/badges` | 필요 | 배지 목록 (LEVEL 배지는 실시간 파생) |
| POST | `/api/career/ai/chat` | 필요 | AI 상담 Mock 응답 (`{message}` → `{reply}`) |
| GET | `/api/admin/quests` | - | 관리자 퀘스트 목록 |
| POST | `/api/admin/quests` | - | 퀘스트 등록 |
| PUT | `/api/admin/quests/{id}` | - | 퀘스트 수정 |
| DELETE | `/api/admin/quests/{id}` | - | 퀘스트 삭제 |

시드 데이터: `(SAMPLE, 20231234)` = 김미래 (Lv.7, 1250/1750 EXP, 7개 퀘스트 중 4개 완료) — 다른
`(university, externalUserId)` 조합으로 `/api/auth/identify`를 호출하면 그 자리에서 새 학생이
자동 생성된다 (예: `host-demo-b.html`이 `(UNIVERSITY_B, b-20240001)`로 이 흐름을 시연한다).

## 프론트엔드와의 대응 관계 (Mock → API 전환 시 참고)

| 프론트엔드 | 백엔드 |
|---|---|
| `src/utils/careerLevel.js` (`getRequiredExp`, `calculateLevel`) | `util/CareerLevelCalculator.java` — 동일 공식(`level*250`), 동일 롤오버 로직 |
| `src/context/CareerContext.jsx`의 `completeQuest` 가드(이미 완료된 퀘스트 재처리 방지) | `QuestService.completeQuest` — 동일하게 idempotent, `alreadyCompleted` 플래그로 표현 |
| `src/data/mockBadges.js`의 `unlockType`(`QUEST`/`LEVEL`) 구조, LEVEL 배지는 `user.level`에서 파생 | `BadgeService` — 동일 구조, `badge.unlock_type='LEVEL'`은 저장 대신 조회 시점에 계산 |
| `src/config/universities.js` | `university` 테이블 — 필드명 1:1 대응 |

프론트엔드를 이 API에 연결하려면 `career-avatar/src/data/*.js`를 호출하던 지점을 `fetch`로
바꾸면 된다 (`CareerContext.jsx` 안쪽만 손대면 되도록 이미 그렇게 분리되어 있음). CORS는
`application.yml`의 `career-mate.allowed-origins`에 프론트 dev 서버(`http://localhost:5173`)가
기본 허용되어 있다.

## 테이블 네이밍

모든 테이블에 `careermate_` 접두어가 붙어있다 (`careermate_university`, `careermate_student_user`,
`careermate_quest`, ...) — `career-embed.js`의 `CareerMate.init()`, 백엔드 패키지명
`com.careermate.backend`랑 같은 이름으로 맞춤. 이 백엔드가 다른 서비스와 DB 서버(또는 DB 자체)를
공유하는 걸 전제로 한 것 — `SHOW TABLES` 했을 때 이 프로젝트 소유 테이블이 한눈에 구분된다.

## 폴더 구조

```
src/main/java/com/careermate/backend/
  controller/   REST 엔드포인트
  service/      비즈니스 로직 (EXP/레벨 계산, 배지 파생, Admin CRUD)
  mapper/       MyBatis 인터페이스
  domain/       DB 로우 매핑 엔티티
  dto/
    request/    요청 Body
    response/   응답 Body
  util/         CareerLevelCalculator (순수 함수)
  exception/    NotFoundException + 전역 예외 처리
  config/       CORS 설정
src/main/resources/
  application.yml      기본(MariaDB) 설정
  application-h2.yml   로컬 실행용 H2 프로파일
  schema.sql           DDL
  data.sql             시드 데이터 (Mock Data와 동일)
  mapper/*.xml         MyBatis SQL
```

## 이번 단계에서 하지 않은 것

대학 SSO/OAuth 연동(위 "인증" 절 참고 — 지금은 host page를 신뢰하는 방식), 관리자 인증, 실제 LLM 연동
(AI 상담은 여전히 키워드 Mock), Flyway/Liquibase 같은 마이그레이션 도구(현재는 `schema.sql`/`data.sql`
재실행 방식 — 이미 만들어진 테이블에 컬럼을 추가해야 하면 `schema.sql`이 자동으로 못 하니 수동
`ALTER TABLE` 또는 테이블 재생성이 필요하다. 이번 인증 기능 추가로 `careermate_student_user`가 그 경우다).
