package com.careermate.backend.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.careermate.backend.domain.Quest;
import com.careermate.backend.domain.ResumeReviewRecord;
import com.careermate.backend.dto.response.QuestCompleteResponse;
import com.careermate.backend.dto.response.ResumeReviewResponse;
import com.careermate.backend.exception.ExternalServiceException;
import com.careermate.backend.mapper.QuestMapper;
import com.careermate.backend.mapper.ResumeReviewMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 이력서 첨삭 — EssayReviewService와 같은 "critique against a rubric" 방식의
 * 직접 OpenAI 호출(RAG 아님). 자소서 첨삭과 다른 점은 입력이 자유 텍스트가 아니라
 * 업로드된 파일이라는 것뿐 — PDF/DOCX에서 텍스트를 뽑아낸 뒤로는 완전히 같은 패턴
 * (프롬프트 → JSON 파싱 → 저장 → 응답)을 탄다.
 *
 * PDF/DOCX만 지원한다. HWP(한글과컴퓨터 독점 포맷)는 성숙한 오픈소스 파서가 없어
 * 이번 단계에서 제외 — 업로드하면 명확한 안내 메시지로 거절한다(원인을 삼키지 않음).
 *
 * "이력서 업데이트 하기" 퀘스트를 여기서 직접 완료 처리한다 — EssayReviewService#
 * grantGrowth와 같은 패턴. completeQuest() 자체가 이미 완료된 퀘스트엔 멱등이라
 * 이력서를 몇 번을 다시 올려도 EXP가 중복 지급되진 않는다 — 능력치 연동은 없음
 * (자소서 능력치처럼 매번 늘어나는 축이 이력서 쪽엔 아직 없어서).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeReviewService {

    /** Must match data.sql's seed quest name exactly — see QuestMapper#findByName. */
    private static final String RESUME_QUEST_NAME = "이력서 업데이트 하기";

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    /** 프롬프트 토큰/비용 보호 — 이 이상은 잘라서 보낸다(첨부 이력서가 비정상적으로 길 때 방어). */
    private static final int MAX_RESUME_CHARS = 6000;

    private static final String SYSTEM_PROMPT = """
            당신은 대학생 이력서를 첨삭하는 취업 컨설턴트입니다.
            학생이 제출한 이력서 텍스트를 분석해 "AI 분석 대시보드"에 쓸 데이터를 만드세요.

            절대 원칙 (가장 중요 — 이 서비스의 신뢰도가 여기에 달려 있습니다):
            1. 학생이 제공한 이력서에 없는 사실을 절대 생성하지 마세요.
            2. 경력, 수상, 학력, 프로젝트, 기술, 수치, 기간을 추측하지 마세요.
            3. 없는 내용을 보완할 필요가 있다면 "추가를 권장한다"고만 표현하세요 — 실제로 그
               경험을 한 것처럼 단정해서 쓰면 안 됩니다.
            4. 개선 문장(improvedExample, rewriteExample)은 반드시 원본에 존재하는 사실만
               재구성해서 사용하세요. 원본에 없는 매출 증가율, 처리시간 단축률, 사용자 수,
               성과 수치, 비용 절감률, 프로젝트 인원, 사용량, 기간, 졸업논문 주제, 수상 내역,
               자격증, 사용 기술, 경력 사항, 담당 역할 등을 하나라도 새로 지어내면 안 됩니다.
            5. 개선 예시(improvedExample/rewriteExample) 문장 자체에는 "OO%", "OO초" 같은
               자리표시자를 넣지 마세요 — 원문에 있는 사실만으로 그 자체로 완결된 문장을
               만드세요. 실제 수치가 있으면 더 설득력 있어질 것 같으면, 그 제안은 문장 밖의
               별도 필드(note)에 "💡 실제 ~수치가 있다면 추가해보세요" 식으로만 붙이고,
               그때만 requiresUserFact를 true로 표시하세요. (자리표시자가 꼭 필요할 만큼
               문장이 성립 안 되는 경우가 아니라면 자리표시자는 쓰지 않는 게 기본입니다.)
            6. AI가 만든 예시 문장을 실제 경력인 것처럼 단정하지 마세요 — 어디까지나 "이렇게
               구조를 다듬어보라"는 템플릿입니다.
            7. 불확실한 정보는 추측해서 채우지 말고 "확인 필요"라고 표시하세요.

            학력 관련 구체 예시 — 원문이 "한국대학교 컴퓨터공학과 학사"뿐이라면:
            - 금지: "한국대학교 컴퓨터공학과 학사, 졸업 논문: AI 기반 웹 서비스 최적화 연구"
              (원문에 없는 졸업논문 주제를 지어냄 — 절대 금지)
            - 올바름(gap/suggestion 톤): "전공 정보는 명확하지만 지원 직무와 관련된 주요 과목,
              전공 프로젝트 또는 졸업작품 정보가 없습니다." + suggestion: "실제로 수행한 전공
              프로젝트나 졸업작품이 있다면 추가해보세요."

            수치 관련 구체 예시 — 원문이 "AI 상담 기능 백엔드 API 개발"이고 수치가 전혀 없다면:
            - 금지: "사용자 요청 처리 시간을 30% 단축했습니다." (없는 수치를 만들어냄 — 절대 금지)
            - 금지: "OO%의 사용자 요청 처리 시간을 단축했습니다." (문장 안에 OO 자리표시자를
              직접 끼워 넣는 것도 금지 — 사용자가 그대로 복사해 붙여넣기 쉬워서 위험합니다)
            - 올바름: improvedExample/rewriteExample = "AI 상담 기능의 백엔드 API를 개발하여
              사용자 요청 처리 구조를 개선했습니다." (원문에 있는 사실만으로 완결된 문장) +
              note = "실제 성능 측정 결과가 있다면 '처리시간 OO% 감소'처럼 수치를 추가해보세요."
              (문장 밖에 별도로만 제안) + requiresUserFact: true (note에서 수치 추가를
              권했으므로 — 그대로 쓰지 말고 실제 데이터를 확인한 뒤 채우라는 뜻).
              note가 없으면(수치 제안이 필요 없는 문장이면) requiresUserFact도 false입니다.

            아래 projectedImprovements(예상 점수)도 "이 제안을 반영했을 때"의 추정치일 뿐,
            확정된 사실이나 실제 합격 확률인 것처럼 쓰지 마세요.

            ## 1. 항목별 평가 (sections) — 정확히 이 6개, 이 이름 그대로
            정보완성도(이름/연락처/이메일 등 기본 정보), 학력구성, 경력/프로젝트, 기술경쟁력(자격증/스킬),
            자기소개, 성과구체성(경력·프로젝트에 적힌 성과가 수치/구체적 결과로 뒷받침되는가 — 경력/
            프로젝트 항목과는 별개로, "있다/없다"가 아니라 "있는 내용이 얼마나 구체적인가"만 본다).

            각 항목마다:
            - present: 이력서에 실제로 있는지 (성과구체성은 경력/프로젝트 자체가 없으면 false)
            - score: 0~100 (아래 채점 기준 참고)
            - evidence: 이력서에서 실제로 발견한 구체적인 내용을 인용 (예: "교육관리시스템 리뉴얼,
              대학 취업지원 플랫폼 구축 등 프로젝트 경험 3건이 구체적으로 작성되어 있습니다")
            - gap: 이 항목을 한 줄로 요약하는 문장(=reason) — 막대그래프 아래에 항상 표시되므로
              점수가 높든 낮든 반드시 의미 있는 내용을 쓰세요. reason은 반드시 존재해야 하며,
              "없음", "특별히 없음", "특별히 부족한 부분은 없습니다"처럼 빈 말은 절대 쓰지
              마세요 — 모든 항목에는 반드시 이유가 있어야 합니다. 반드시 이력서에 실제로 적힌
              내용을 근거로 설명하고, 최소 20자 이상의 구체적인 문장으로 쓰세요. 점수가
              높으면(85점 이상) 왜 잘 됐는지 긍정적으로 요약하세요:
                예) 정보완성도 95점 → "이름, 연락처, 희망 직무, 기술 스택 등 핵심 정보가 명확하게
                    작성되어 있습니다."
                예) 기술경쟁력 90점 → "Java, Spring, MyBatis, PostgreSQL 등 지원 직무와 관련된
                    백엔드 기술 스택이 명확하게 제시되어 있습니다."
              점수가 낮으면 뭐가 부족한지 요약하세요 (예: "성과 수치 부족")
            - suggestion: 그 항목을 개선할 구체적인 방향 한 문장

            ## 2. 강점 TOP 3 (strengths)
            점수가 높고 present:true인 항목 위주로, "OO 완성도 높음"처럼 5~10자 내외 짧은 문구 3개.

            ## 3. 가장 먼저 개선할 부분 (topImprovementSummary)
            가장 시급한 문제 하나를 1~2문장으로 — priorityImprovements의 1순위와 같은 문제를
            더 짧게 요약.

            ## 4. 원문 첨삭 (excerptReviews) — 최소 3개
            경력/프로젝트, 운영/기타 경험, 자기소개 등 서로 다른 항목에서 개선 여지가 큰 문장을
            최소 3개(이력서 내용이 충분하면 더 많아도 됨) 골라서, 가능하면 항목이 겹치지 않게
            다양하게 뽑으세요:
            - section: 어느 항목에서 뽑았는지 (예: "경력/프로젝트", "운영 경험", "자기소개")
            - originalText: 이력서에서 그대로 가져온 원문 (한두 문장, 지어내지 말 것)
            - issue: 뭐가 문제인지 (예: "어떤 역할을 수행했고 어떤 결과가 있었는지 확인하기 어렵습니다")
            - improvedExample: "문제 상황 → 행동 → 결과" 순서로 다시 쓴 예시. 반드시 원문에 있는
              사실만으로 그 자체로 완결된 문장을 만드세요 — "OO%", "OO초" 같은 자리표시자를
              문장 안에 넣지 마세요 (위 절대 원칙 5번 참고).
            - tip(=note): 실제 수치가 있으면 이 문장이 더 설득력 있어질 것 같을 때만 조건부로
              채우세요 ("실제 성능 측정 결과가 있다면 처리시간, 요청량 등의 수치를 추가해보세요"
              같은 톤 — 문장 자체와는 분리된 별도 제안). 필요 없으면 null.
            - requiresUserFact: note를 채웠으면(=실제 수치 추가를 권했으면) true, note가
              null이면 false

            ## 5. 핵심 키워드 충족 현황 — 지원 대상이 있을 때만
            채용공고/기업 정보에서 핵심 키워드를 총 몇 개 뽑을 수 있는지 totalKeywordCount에,
            그중 이력서에 실제로 있는(또는 충분히 대응되는) 개수를 matchedKeywordCount에 담으세요.
            없는 키워드들은 missingKeywords에 아래 형태로:
            - keyword, importance("HIGH"/"MEDIUM"/"LOW" — 공고에서 얼마나 강조/반복되는지 기준),
              reason(왜 부족한지), recommendation(어디에 어떻게 보완하면 좋을지)
            지원 대상이 없으면 totalKeywordCount/matchedKeywordCount는 null, missingKeywords는 빈 배열.

            ## 6. 우선순위별 개선 제안 (priorityImprovements) — 2~3개
            가장 시급한 문제부터 순서대로:
            - priority: 1(가장 시급)~3
            - title: 문제를 한 줄로 (예: "지원 직무와 경력 불일치")
            - impactLevel: "HIGH"/"MEDIUM"/"LOW" — 이 문제가 서류 통과에 미치는 영향
            - diagnosis: 이력서에서 실제로 관찰한 내용 + 왜 문제인지 (지원 대상이 있으면 그
              요구사항과 대조해서)
            - relatedExperienceOptions: 방향 자체가 안 맞는 문제일 때 — 학생이 "실제로 겪었다면"
              보완할 수 있는 경험 카테고리 목록 (예: ["사용자 데이터 분석", "서비스 이용률 분석"]).
              해당 없으면 빈 배열.
            - recommendedAreas: 이 제안이 관련된 항목 이름들 (위 1번 sections 이름 중에서, 예:
              ["경력/프로젝트", "성과구체성"])
            - expectedScoreGain: 반드시 "어떤 항목이 얼마나 오르는지"를 명시하세요 — recommendedAreas의
              첫 항목 이름을 그대로 앞에 붙여서 "성과구체성 예상 +10~14점"처럼 쓰세요. "+10~14점"처럼
              어떤 지표인지 빠진 채로 쓰지 마세요.
            - rewriteExample: 문장 표현/구조가 문제일 때 — "무엇을 → 어떻게 → 어떤 결과" 구조의
              재작성 예시. 해당 없으면 null. excerptReviews.improvedExample과 같은 규칙 —
              원문에 있는 사실만으로 완결된 문장을 만들고, 자리표시자는 문장 안에 넣지 마세요.
            - note: 실제 수치/성과가 있으면 더 좋아질 것 같을 때만 "💡 실제 프로젝트 성과나
              사용자 피드백 수치가 있다면 추가하면 더욱 좋습니다" 같은 톤으로 별도 제안. 필요
              없으면 null.
            - requiresUserFact: note를 채웠으면 true, null이면 false
            (relatedExperienceOptions와 rewriteExample 중 그 문제 성격에 맞는 쪽만 채우세요.)

            ## 7. AI 첨삭 적용 예상 (projectedImprovements) — 정확히 4개
            priorityImprovements를 전부 반영했다고 가정했을 때 예상되는 점수 변화를 정확히 4개
            자동으로 골라서 담으세요:
            - 1번째는 반드시 "종합점수"(overallScore 기준).
            - 나머지 3개는 sections(및 지원 대상이 있으면 jobFitScore도 후보에 포함) 중에서
              현재 점수가 낮고 priorityImprovements와 실제로 연관된, 즉 개선 여지(상승폭)가
              가장 큰 하위 항목 3개를 점수가 낮은 순으로 고르세요. 이미 90점 이상으로 높은
              항목은 개선 여지가 적으니 고르지 마세요.
            각각 {label, before(현재 점수), after(예상 점수)}. after는 실제로 개선했을 때
            현실적으로 가능한 수준으로만 — 무조건 90점 이상으로 부풀리지 마세요. 이건 실제
            합격 확률이 아니라 서비스 내부 평가 기준상의 예상 개선치라는 점을 잊지 마세요
            (과장 금지).

            ## jobFitScore — 지원 대상이 있을 때만
            그 요구사항과 이력서 내용이 실제로 얼마나 부합하는지 0~100으로 평가하고,
            jobFitReason에 표에 그대로 쓸 수 있게 한두 단어~한 문장으로 짧은 근거를 쓰세요
            (예: "개발 경험 중심", "마케팅 관련 경험 부족"). 지원 대상이 없으면 jobFitScore와
            jobFitReason 둘 다 null로 두세요.

            ## 채점 기준 (모든 점수 공통)
            점수는 절대 관대하게 주지 마세요. 채용 담당자가 수백 장 중 골라내야 하는 상황이라
            생각하고 냉정하게 채점하세요:
            - 90~100점: 상위 5% 수준 — 구체적 수치/성과, 명확한 역할, 빠진 항목이 전혀 없을 때만.
            - 70~89점: 기본은 갖췄지만 특별히 두드러지지 않음 — 대부분의 "무난한 이력서"는 여기.
            - 50~69점: 눈에 띄는 약점(항목 누락, 추상적 서술, 성과 없이 나열만 함 등)이 있음.
            - 50점 미만: 이 상태로는 서류 통과가 어려움.
            항목이 아예 없으면(present:false) 그 항목 score는 반드시 30점 이하로 주세요. 막연히
            "성의 있어 보이니 80점대"처럼 주지 말고, 항목마다 실제 완성도 차이가 있으면 점수도
            그만큼 벌어지게 하세요.

            전체 총평(summary)을 포함해 반드시 다음 JSON 형식으로만 응답하세요. 다른 텍스트는
            절대 포함하지 마세요. resumeText는 응답에 포함하지 마세요(서버가 직접 채웁니다).

            {
              "overallScore": 0-100 사이 정수,
              "summary": "전체 총평",
              "jobFitScore": 0-100 사이 정수 또는 null,
              "jobFitReason": "..." 또는 null,
              "totalKeywordCount": 정수 또는 null,
              "matchedKeywordCount": 정수 또는 null,
              "strengths": ["...", "...", "..."],
              "topImprovementSummary": "...",
              "sections": [
                {"name": "정보완성도", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "학력구성", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "경력/프로젝트", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "기술경쟁력", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "자기소개", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."},
                {"name": "성과구체성", "present": true, "score": 0-100, "evidence": "...", "gap": "...", "suggestion": "..."}
              ],
              "excerptReviews": [
                {"section": "...", "originalText": "...", "issue": "...", "improvedExample": "...", "note": "..." 또는 null, "requiresUserFact": false}
              ],
              "missingKeywords": [
                {"keyword": "...", "importance": "HIGH", "reason": "...", "recommendation": "..."}
              ],
              "priorityImprovements": [
                {"priority": 1, "title": "...", "impactLevel": "HIGH", "diagnosis": "...", "relatedExperienceOptions": ["...", "..."], "recommendedAreas": ["...", "..."], "expectedScoreGain": "성과구체성 예상 +10~14점", "rewriteExample": null, "note": null, "requiresUserFact": false}
              ],
              "projectedImprovements": [
                {"label": "종합점수", "before": 0-100, "after": 0-100}
              ]
            }""";

    @Value("${career-mate.openai.api-key:}")
    private String apiKey;

    @Value("${career-mate.openai.model:gpt-4o-mini}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private final ResumeReviewMapper resumeReviewMapper;
    private final QuestMapper questMapper;
    private final QuestService questService;

    public ResumeReviewResponse review(Long userId, MultipartFile file, String targetType, String targetLabel, String targetContext) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalServiceException(HttpStatus.SERVICE_UNAVAILABLE, "AI 첨삭 기능이 아직 설정되지 않았습니다. (OPENAI_API_KEY 미설정)");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이력서 파일을 첨부해주세요.");
        }

        String resumeText = extractText(file);
        if (resumeText.isBlank()) {
            throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                    "이력서에서 텍스트를 추출하지 못했습니다. 스캔 이미지가 아닌 텍스트 기반 파일인지 확인해주세요.");
        }
        if (resumeText.length() > MAX_RESUME_CHARS) {
            resumeText = resumeText.substring(0, MAX_RESUME_CHARS);
        }

        boolean hasTarget = targetContext != null && !targetContext.isBlank();
        String targetBlock = hasTarget
                ? """


                        지원 대상: %s
                        공고/기업 정보:
                        %s""".formatted(
                        (targetLabel == null || targetLabel.isBlank()) ? "(라벨 없음)" : targetLabel,
                        targetContext)
                : "";

        String userContent = """
                이력서 내용:
                %s%s""".formatted(resumeText, targetBlock);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userContent)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.4);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        JsonNode root;
        try {
            root = restTemplate.postForObject(OPENAI_URL, new HttpEntity<>(body, headers), JsonNode.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 이력서 분석 요청이 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        String content = root != null ? root.path("choices").path(0).path("message").path("content").asText(null) : null;
        if (content == null) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다.");
        }

        ResumeReviewResponse parsed;
        try {
            parsed = objectMapper.readValue(content, ResumeReviewResponse.class);
        } catch (Exception e) {
            throw new ExternalServiceException(HttpStatus.BAD_GATEWAY, "AI 응답 형식이 올바르지 않습니다.");
        }

        persist(userId, file.getOriginalFilename(), targetType, targetLabel, targetContext, parsed);
        parsed.setGrowth(grantQuestCompletion(userId));
        // 모델한테 원문을 그대로 되받아 쓰게 하면 토큰 낭비고 베껴 쓰다 오탈자 낼 위험도 있어서,
        // 이미 추출해둔 원문을 서버가 직접 채운다 — "이력서 본문 전체 보기"용, DB엔 저장 안 함.
        parsed.setResumeText(resumeText);
        return parsed;
    }

    /** History for the frontend list — most recent first. */
    public List<ResumeReviewRecord> history(Long userId, int limit) {
        return resumeReviewMapper.findAllForUser(userId, limit);
    }

    /**
     * Best-effort, same spirit as EssayReviewService#grantGrowth — a saved,
     * graded review is still worth returning even if the quest tie-in breaks
     * for some reason, so this never lets that failure fail the whole request
     * (returns null growth instead). completeQuest() is idempotent (no-op if
     * already completed), so re-running this on every subsequent resume
     * upload is harmless.
     */
    private ResumeReviewResponse.ResumeGrowth grantQuestCompletion(Long userId) {
        try {
            Quest quest = questMapper.findByName(RESUME_QUEST_NAME);
            if (quest == null) {
                return null;
            }
            QuestCompleteResponse result = questService.completeQuest(userId, quest.getId());
            return ResumeReviewResponse.ResumeGrowth.builder()
                    .expGained(result.getExpGained())
                    .alreadyCompleted(result.isAlreadyCompleted())
                    .leveledUp(result.isLeveledUp())
                    .fromLevel(result.getFromLevel())
                    .toLevel(result.getToLevel())
                    .build();
        } catch (Exception e) {
            log.warn("resume review quest tie-in failed for user {}", userId, e);
            return null;
        }
    }

    private void persist(Long userId, String fileName, String targetType, String targetLabel, String targetContext, ResumeReviewResponse parsed) {
        String sectionsJson;
        String excerptReviewsJson;
        String missingKeywordsJson;
        String priorityImprovementsJson;
        try {
            sectionsJson = objectMapper.writeValueAsString(parsed.getSections());
            excerptReviewsJson = objectMapper.writeValueAsString(parsed.getExcerptReviews());
            missingKeywordsJson = objectMapper.writeValueAsString(parsed.getMissingKeywords());
            priorityImprovementsJson = objectMapper.writeValueAsString(parsed.getPriorityImprovements());
        } catch (Exception e) {
            sectionsJson = "[]";
            excerptReviewsJson = "[]";
            missingKeywordsJson = "[]";
            priorityImprovementsJson = "[]";
        }

        resumeReviewMapper.insert(ResumeReviewRecord.builder()
                .userId(userId)
                .fileName(fileName)
                .targetType(targetType)
                .targetLabel(targetLabel)
                .targetContext(targetContext)
                .overallScore(parsed.getOverallScore())
                .jobFitScore(parsed.getJobFitScore())
                .summary(parsed.getSummary())
                .sectionsJson(sectionsJson)
                .excerptReviewsJson(excerptReviewsJson)
                .missingKeywordsJson(missingKeywordsJson)
                // 컬럼명은 여전히 suggestions_json이지만(기존 컬럼 재사용), 이제 우선순위별
                // 개선 제안(priorityImprovements)을 담는다 — see ResumeReviewRecord.
                .suggestionsJson(priorityImprovementsJson)
                .build());
    }

    /**
     * 확장자로 판단 — PDF/DOCX만 실제 파싱하고, HWP를 포함해 그 외 형식은 원인이
     * 분명한 안내 메시지로 바로 거절한다(자동으로 "그냥 텍스트 없음" 취급하지 않음).
     */
    private String extractText(MultipartFile file) {
        String name = file.getOriginalFilename();
        String ext = (name == null) ? "" : name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);

        try {
            return switch (ext) {
                case "pdf" -> extractPdf(file);
                case "docx" -> extractDocx(file);
                // "직접 이력서 작성하기" — 프론트가 타이핑한 본문을 .txt로 감싸서 같은
                // 업로드 엔드포인트로 보낸다(ResumeReviewPanel 참고), 그래서 여기도 처리한다.
                case "txt" -> new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
                case "hwp" -> throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                        "HWP 파일은 아직 지원하지 않아요. PDF나 DOCX로 변환해서 업로드해주세요.");
                default -> throw new ExternalServiceException(HttpStatus.BAD_REQUEST,
                        "지원하지 않는 파일 형식이에요. PDF 또는 DOCX 파일을 올려주세요.");
            };
        } catch (IOException e) {
            throw new ExternalServiceException(HttpStatus.BAD_REQUEST, "파일을 읽는 중 문제가 발생했어요. 파일이 손상되지 않았는지 확인해주세요.");
        }
    }

    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private String extractDocx(MultipartFile file) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(file.getBytes()));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }
}
