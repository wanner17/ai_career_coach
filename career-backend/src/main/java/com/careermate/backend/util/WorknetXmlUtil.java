package com.careermate.backend.util;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Minimal server-side counterpart to src/utils/worknetXml.js — used only by
 * AiChatService's search_worknet tool call, where the model needs a short,
 * clean summary handed back as a tool result, not the full XML the frontend
 * renders from. Not a general-purpose Worknet parser, just enough fields to
 * let the model answer a chat question grounded in real data.
 */
public final class WorknetXmlUtil {

    private WorknetXmlUtil() {
    }

    /** One work24 list page holds at most 10 (WorknetService's fixed `display=10`) — no cap needed here. */
    public static List<Map<String, String>> parseNewsList(String xml) {
        return parseList(xml, "dhsOpenEmpInfo", item -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("title", text(item, "empWantedTitle"));
            m.put("company", text(item, "empBusiNm"));
            m.put("start", text(item, "empWantedStdt"));
            m.put("end", text(item, "empWantedEndt"));
            return m;
        });
    }

    public static List<Map<String, String>> parseCompanyList(String xml) {
        return parseList(xml, "dhsOpenEmpHireInfo", item -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("title", text(item, "coNm"));
            m.put("intro", text(item, "coIntroSummaryCont"));
            return m;
        });
    }

    /** work24's own reported total for a list call — used to decide how many pages a multi-page scan needs. */
    public static int parseTotal(String xml) {
        Document doc = parseDoc(xml);
        if (doc == null) {
            return 0;
        }
        NodeList totalNodes = doc.getElementsByTagName("total");
        if (totalNodes.getLength() == 0) {
            return 0;
        }
        try {
            return Integer.parseInt(totalNodes.item(0).getTextContent().trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private interface ItemMapper {
        Map<String, String> map(Element item);
    }

    private static List<Map<String, String>> parseList(String xml, String itemTag, ItemMapper mapper) {
        List<Map<String, String>> results = new ArrayList<>();
        Document doc = parseDoc(xml);
        if (doc == null) {
            return results;
        }
        NodeList items = doc.getElementsByTagName(itemTag);
        for (int i = 0; i < items.getLength(); i++) {
            results.add(mapper.map((Element) items.item(i)));
        }
        return results;
    }

    private static Document parseDoc(String xml) {
        if (xml == null || xml.isBlank() || xml.contains("<error>")) {
            return null;
        }
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            // best-effort — an empty result just tells the model "no data found"
            return null;
        }
    }

    private static String text(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return "";
        }
        String content = nodes.item(0).getTextContent();
        return content == null ? "" : content.trim();
    }
}
