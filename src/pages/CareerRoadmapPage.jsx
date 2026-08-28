import AppShell from '../components/layout/AppShell.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useCareer } from '../context/CareerContext.jsx';

// 대학 쪽 커리어로드맵 페이지가 "누구 화면인지" 알 수 있게 학번/사번(=이 학생이
// 원래 대학 홈페이지에서 쓰던 식별자, StudentUser.externalUserId)을 target_user_no
// 쿼리파라미터로 실어 보낸다. URL에 이미 다른 쿼리스트링이 있을 수도 있어
// '?'/'&' 여부를 직접 보고 붙인다.
function withTargetUserNo(url, userNo) {
  if (!userNo) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}target_user_no=250a5749d0af447fa83f7cc66b10bc7a`;
}

// 마이페이지 바로 아래 메뉴 — 이 앱의 화면이 아니라 이 위젯을 심은 대학 홈페이지
// 자체의 커리어로드맵 페이지를 그대로 끌고 와서 우리 사이드바/헤더 틀 안에서
// 보여준다. InterviewPage.jsx가 외부 모의면접 사이트를 iframe으로 감싸는 것과
// 똑같은 패턴("바깥은 우리 틀, 안쪽 내용은 남의 페이지") — .external-frame도 그대로 재사용.
//
// URL은 학교마다 달라서 하드코딩하지 않고 University 설정(AdminSettings.jsx →
// career_roadmap_url)에서 받아온다 — theme.careerRoadmapUrl이 비어 있으면(아직
// 등록 전) iframe 대신 안내 카드를 보여준다.
//
// 주의: 대상 사이트가 X-Frame-Options/CSP frame-ancestors로 프레이밍을 막아두면
// iframe이 빈 화면으로 보일 수 있다(브라우저가 그 사실을 JS로 알려주지 않아 여기서
// 감지할 방법이 없음) — 그럴 땐 아래 "새 창에서 열기" 링크로 우회하거나, 대학 쪽에
// 해당 페이지의 프레이밍 허용 여부를 확인해야 한다.
export default function CareerRoadmapPage({ navigate }) {
  const theme = useTheme();
  const { user } = useCareer();
  const url = theme.careerRoadmapUrl;
  const urlWithUserNo = url ? withTargetUserNo(url, user?.externalUserId) : url;

  return (
    <AppShell
      activePath="/career-roadmap"
      navigate={navigate}
      title="커리어로드맵"
      subtitle={`${theme.name}의 커리어로드맵 페이지입니다.`}
    >
      {url ? (
        <>
          <div className="roadmap-frame-toolbar">
            <a href={urlWithUserNo} target="_blank" rel="noreferrer">새 창에서 열기 ↗</a>
          </div>
          <div className="external-frame">
            <iframe src={urlWithUserNo} title="커리어로드맵" />
          </div>
        </>
      ) : (
        <article className="card roadmap-empty-card">
          <p>커리어로드맵 페이지가 아직 연결되지 않았습니다.</p>
          <small>관리자 설정에서 커리어로드맵 URL을 등록하면 이 화면에 표시됩니다.</small>
        </article>
      )}
    </AppShell>
  );
}
