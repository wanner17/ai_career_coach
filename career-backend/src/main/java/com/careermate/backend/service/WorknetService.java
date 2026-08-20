package com.careermate.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import lombok.RequiredArgsConstructor;

/**
 * Thin proxy in front of work24.go.kr's Open API (채용행사/공채속보/공채기업정보).
 * Ported from an existing 전자정부프레임워크 controller (WorknetController,
 * cms.worknet.web) that did the same job as a JSP-rendered page — the URL/
 * param shape here is unchanged from that original, just re-hosted as a
 * Spring Boot service.
 *
 * Deliberately returns the upstream XML as-is rather than parsing it into a
 * DTO: the existing frontend rendering logic (item cards, detail view,
 * pagination) already knows how to walk this exact XML shape, so the port
 * only has to move that logic from JSP+jQuery into React — see
 * src/utils/worknetXml.js. The one thing this layer exists to do server-side
 * is keep `authKey` out of the browser.
 */
@Service
@RequiredArgsConstructor
public class WorknetService {

    // https://www.work24.go.kr/cm/openApi — 채용행사(EVENT) / 공채속보(NEWS) / 공채기업정보(COMPANY),
    // each with a L(ist)/D(etail) call type, per the four callOpenApiSvcInfo210* endpoints below.
    private static final String EVENT_LIST = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L11.do";
    private static final String EVENT_DETAIL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D11.do";
    private static final String NEWS_LIST = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do";
    private static final String NEWS_DETAIL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D21.do";
    private static final String COMPANY_LIST = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L31.do";
    private static final String COMPANY_DETAIL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D31.do";

    @Value("${career-mate.worknet.auth-key}")
    private String authKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String fetchXml(String type, String callTp, String keyword, String startPage, String sortOrderBy,
            String areaCd, String eventNo, String empSeqno, String empCoNo) {
        boolean isList = "L".equals(callTp);
        String apiUrl = resolveUrl(type, isList);
        if (apiUrl == null) {
            return "<error>UNKNOWN_TYPE</error>";
        }

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(apiUrl)
                .queryParam("authKey", authKey)
                .queryParam("returnType", "XML")
                .queryParam("callTp", callTp);

        if (isList) {
            builder.queryParam("startPage", startPage).queryParam("display", "10");
            if ("NEWS".equals(type)) {
                builder.queryParam("sortField", "regDt").queryParam("sortOrderBy", sortOrderBy);
            }
            if (keyword != null && !keyword.isBlank()) {
                if ("NEWS".equals(type)) {
                    builder.queryParam("empWantedTitle", keyword); // 공채속보는 keyword 대신 이 필드
                } else if ("COMPANY".equals(type)) {
                    builder.queryParam("coNm", keyword);
                } else {
                    builder.queryParam("keyword", keyword);
                }
            }
        } else if ("EVENT".equals(type)) {
            builder.queryParam("areaCd", areaCd).queryParam("eventNo", eventNo);
        } else if ("NEWS".equals(type)) {
            builder.queryParam("empSeqno", empSeqno);
        } else if ("COMPANY".equals(type)) {
            builder.queryParam("empCoNo", empCoNo);
        }

        try {
            return restTemplate.getForObject(builder.build().encode().toUri(), String.class);
        } catch (Exception e) {
            return "<error>API_CALL_FAILED</error>";
        }
    }

    private String resolveUrl(String type, boolean isList) {
        return switch (type) {
            case "EVENT" -> isList ? EVENT_LIST : EVENT_DETAIL;
            case "NEWS" -> isList ? NEWS_LIST : NEWS_DETAIL;
            case "COMPANY" -> isList ? COMPANY_LIST : COMPANY_DETAIL;
            default -> null;
        };
    }
}
