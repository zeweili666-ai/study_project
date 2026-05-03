import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class StudyPlannerServer {
    private static final int PORT = 5177;
    private static final String DEFAULT_STATE = "{\"courses\":[],\"tasks\":[],\"research\":[],\"exams\":[],\"lessons\":[],\"notes\":[],\"progress\":{},\"rescheduleBoosts\":{}}";
    private static final Path ROOT = Path.of("").toAbsolutePath().normalize();
    private static final String DB_URL = "jdbc:sqlite:" + ROOT.resolve("study_planner.db");
    private static final String OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
    private static final String OLLAMA_MODEL = System.getenv().getOrDefault("OLLAMA_MODEL", "qwen2.5:7b");

    public static void main(String[] args) throws Exception {
        Class.forName("org.sqlite.JDBC");
        initDatabase();

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", PORT), 0);
        server.createContext("/api/state", StudyPlannerServer::handleState);
        server.createContext("/api/extract-pdf", StudyPlannerServer::handleExtractPdf);
        server.createContext("/api/extract-docx", StudyPlannerServer::handleExtractDocx);
        server.createContext("/api/ai/analyze", StudyPlannerServer::handleAiAnalyze);
        server.createContext("/", StudyPlannerServer::handleStatic);
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();

        System.out.println("SQLite backend is running.");
        System.out.println("Open in browser: http://127.0.0.1:" + PORT + "/");
        System.out.println("Database file: " + ROOT.resolve("study_planner.db"));
        System.out.println("Stop server: close this window or press Ctrl + C.");
    }

    private static void initDatabase() throws SQLException {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS app_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    json TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            stmt.executeUpdate("""
                INSERT OR IGNORE INTO app_state (id, json)
                VALUES (1, '{"courses":[],"tasks":[],"research":[],"exams":[],"lessons":[],"notes":[],"progress":{},"rescheduleBoosts":{}}')
                """);
        }
    }

    private static void handleState(HttpExchange exchange) throws IOException {
        try {
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendText(exchange, 200, "application/json; charset=utf-8", readState());
                return;
            }

            if ("PUT".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                if (!looksLikePlannerState(body)) {
                    sendText(exchange, 400, "application/json; charset=utf-8", "{\"error\":\"invalid state\"}");
                    return;
                }
                writeState(body);
                sendText(exchange, 200, "application/json; charset=utf-8", "{\"ok\":true}");
                return;
            }

            sendText(exchange, 405, "text/plain; charset=utf-8", "Method not allowed");
        } catch (SQLException error) {
            sendText(exchange, 500, "text/plain; charset=utf-8", "Database error: " + error.getMessage());
        }
    }

    private static void handleExtractPdf(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "text/plain; charset=utf-8", "Method not allowed");
            return;
        }

        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        if (contentType == null || !contentType.contains("multipart/form-data")) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "Expected multipart/form-data");
            return;
        }

        String boundary = extractBoundary(contentType);
        if (boundary == null || boundary.isBlank()) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "Missing multipart boundary");
            return;
        }

        byte[] requestBytes = exchange.getRequestBody().readAllBytes();
        byte[] pdfBytes = extractMultipartFile(requestBytes, boundary);
        if (pdfBytes.length == 0) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "No PDF file found");
            return;
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document).trim();
            sendText(exchange, 200, "application/json; charset=utf-8", "{\"text\":\"" + jsonEscape(text) + "\"}");
        } catch (Exception error) {
            sendText(exchange, 500, "text/plain; charset=utf-8", "PDF extract failed: " + error.getMessage());
        }
    }

    private static void handleExtractDocx(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "text/plain; charset=utf-8", "Method not allowed");
            return;
        }

        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        if (contentType == null || !contentType.contains("multipart/form-data")) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "Expected multipart/form-data");
            return;
        }

        String boundary = extractBoundary(contentType);
        if (boundary == null || boundary.isBlank()) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "Missing multipart boundary");
            return;
        }

        byte[] requestBytes = exchange.getRequestBody().readAllBytes();
        byte[] docxBytes = extractMultipartFile(requestBytes, boundary);
        if (docxBytes.length == 0) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "No DOCX file found");
            return;
        }

        try {
            String text = extractDocxText(docxBytes).trim();
            sendText(exchange, 200, "application/json; charset=utf-8", "{\"text\":\"" + jsonEscape(text) + "\"}");
        } catch (Exception error) {
            sendText(exchange, 500, "text/plain; charset=utf-8", "DOCX extract failed: " + error.getMessage());
        }
    }

    private static void handleAiAnalyze(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "text/plain; charset=utf-8", "Method not allowed");
            return;
        }

        String action = queryParam(exchange.getRequestURI(), "action");
        String sourceText = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8).trim();
        if (sourceText.isBlank()) {
            sendText(exchange, 400, "text/plain; charset=utf-8", "Missing input text");
            return;
        }

        String prompt = buildAiPrompt(action, sourceText);
        String requestJson = "{\"model\":\"" + jsonEscape(OLLAMA_MODEL) + "\",\"stream\":false,\"prompt\":\"" + jsonEscape(prompt) + "\"}";

        try {
            HttpClient client = HttpClient.newBuilder().build();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OLLAMA_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                sendText(exchange, 502, "text/plain; charset=utf-8", "Ollama error: " + response.body());
                return;
            }
            String aiText = extractJsonString(response.body(), "response");
            sendText(exchange, 200, "application/json; charset=utf-8", "{\"model\":\"" + jsonEscape(OLLAMA_MODEL) + "\",\"text\":\"" + jsonEscape(aiText) + "\"}");
        } catch (Exception error) {
            sendText(exchange, 503, "text/plain; charset=utf-8",
                "Local AI is not available. Install Ollama, run `ollama pull " + OLLAMA_MODEL + "`, then start Ollama. Details: " + error.getMessage());
        }
    }

    private static String readState() throws SQLException {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement stmt = conn.prepareStatement("SELECT json FROM app_state WHERE id = 1");
             ResultSet rs = stmt.executeQuery()) {
            return rs.next() ? rs.getString(1) : DEFAULT_STATE;
        }
    }

    private static void writeState(String json) throws SQLException {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement stmt = conn.prepareStatement("""
                 UPDATE app_state
                 SET json = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1
                 """)) {
            stmt.setString(1, json);
            stmt.executeUpdate();
        }
    }

    private static boolean looksLikePlannerState(String body) {
        String compact = body == null ? "" : body.trim();
        return compact.startsWith("{")
            && compact.endsWith("}")
            && compact.contains("\"courses\"")
            && compact.contains("\"tasks\"")
            && compact.contains("\"exams\"");
    }

    private static String extractBoundary(String contentType) {
        for (String part : contentType.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("boundary=")) {
                return trimmed.substring("boundary=".length()).replace("\"", "");
            }
        }
        return null;
    }

    private static String buildAiPrompt(String action, String sourceText) {
        String task = switch (action == null ? "" : action) {
            case "classify" -> "判断这段资料属于课程内容、课堂笔记、作业/CW、科研任务、论文/组会、考试范围还是其他资料，并说明依据。";
            case "extract" -> "从资料中提取任务、日期、DDL、考试时间、知识点、评分要求和需要学生确认的信息。不要编造没有出现的日期。";
            case "advice" -> "根据资料生成可执行的复习建议，包括今天该做什么、后续几天怎么安排、哪些内容要优先复习。";
            case "import" -> """
                请把资料整理成 JSON，字段必须包括：
                type: lesson/task/research/exam/note/unknown
                title: 字符串
                courseName: 字符串，无法判断就写空字符串
                date: YYYY-MM-DD，无法判断就写空字符串
                hours: 数字，无法判断就写 3
                level: 1/2/3，低中高
                summary: 字符串
                keyPoints: 字符串数组
                suggestedTasks: 字符串数组
                content: 字符串，保留适合保存进系统的正文
                uncertain: 字符串数组，列出需要用户确认的信息
                只输出 JSON，不要输出 Markdown。
                不要编造没有出现的日期。
                """;
            default -> "总结这段学习资料的核心重点、难点和需要复习的知识点。";
        };

        return """
            你是一个大学生学习规划助手。请只基于用户提供的资料分析，不要编造不存在的信息。
            如果资料里没有明确日期、DDL、考试时间，请写“未提供，需要用户确认”。
            输出请使用清晰的中文小标题和项目符号。

            任务：
            %s

            用户资料：
            %s
            """.formatted(task, sourceText);
    }

    private static String queryParam(URI uri, String name) {
        String query = uri.getRawQuery();
        if (query == null || query.isBlank()) return "";
        for (String part : query.split("&")) {
            String[] pieces = part.split("=", 2);
            String key = URLDecoder.decode(pieces[0], StandardCharsets.UTF_8);
            if (!name.equals(key)) continue;
            return pieces.length > 1 ? URLDecoder.decode(pieces[1], StandardCharsets.UTF_8) : "";
        }
        return "";
    }

    private static String extractJsonString(String json, String key) {
        String marker = "\"" + key + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) return "";
        start += marker.length();
        StringBuilder result = new StringBuilder();
        boolean escaping = false;
        for (int i = start; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (escaping) {
                switch (ch) {
                    case 'n' -> result.append('\n');
                    case 'r' -> result.append('\r');
                    case 't' -> result.append('\t');
                    case '"' -> result.append('"');
                    case '\\' -> result.append('\\');
                    default -> result.append(ch);
                }
                escaping = false;
            } else if (ch == '\\') {
                escaping = true;
            } else if (ch == '"') {
                break;
            } else {
                result.append(ch);
            }
        }
        return result.toString();
    }

    private static byte[] extractMultipartFile(byte[] requestBytes, String boundary) {
        String marker = "--" + boundary;
        byte[] markerBytes = marker.getBytes(StandardCharsets.ISO_8859_1);
        int first = indexOf(requestBytes, markerBytes, 0);
        while (first >= 0) {
            int headerStart = first + markerBytes.length;
            int headerEnd = indexOf(requestBytes, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1), headerStart);
            if (headerEnd < 0) break;

            String headers = new String(requestBytes, headerStart, headerEnd - headerStart, StandardCharsets.ISO_8859_1);
            int bodyStart = headerEnd + 4;
            int next = indexOf(requestBytes, ("\r\n" + marker).getBytes(StandardCharsets.ISO_8859_1), bodyStart);
            if (next < 0) break;

            if (headers.contains("name=\"file\"")) {
                byte[] fileBytes = new byte[next - bodyStart];
                System.arraycopy(requestBytes, bodyStart, fileBytes, 0, fileBytes.length);
                return fileBytes;
            }

            first = indexOf(requestBytes, markerBytes, next + markerBytes.length);
        }
        return new byte[0];
    }

    private static int indexOf(byte[] source, byte[] target, int fromIndex) {
        outer:
        for (int i = Math.max(0, fromIndex); i <= source.length - target.length; i++) {
            for (int j = 0; j < target.length; j++) {
                if (source[i + j] != target[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private static String extractDocxText(byte[] docxBytes) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(new java.io.ByteArrayInputStream(docxBytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!"word/document.xml".equals(entry.getName())) continue;
                String xml = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                return xml
                    .replaceAll("</w:p>", "\n")
                    .replaceAll("</w:tr>", "\n")
                    .replaceAll("</w:tc>", "\t")
                    .replaceAll("<[^>]+>", "")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .replace("&amp;", "&")
                    .replace("&quot;", "\"")
                    .replace("&apos;", "'")
                    .replaceAll("[ \\t]+", " ")
                    .replaceAll("\\n{3,}", "\n\n");
            }
        }
        return "";
    }

    private static String jsonEscape(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\r", "\\r")
            .replace("\n", "\\n")
            .replace("\t", "\\t");
    }

    private static void handleStatic(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "text/plain; charset=utf-8", "Method not allowed");
            return;
        }

        URI uri = exchange.getRequestURI();
        String rawPath = URLDecoder.decode(uri.getPath(), StandardCharsets.UTF_8);
        Path file = "/".equals(rawPath)
            ? ROOT.resolve("index.html")
            : ROOT.resolve(rawPath.substring(1)).normalize();

        if (!file.startsWith(ROOT) || !Files.isRegularFile(file)) {
            sendText(exchange, 404, "text/plain; charset=utf-8", "Not found");
            return;
        }

        byte[] body = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType(file));
        exchange.sendResponseHeaders(200, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".css")) return "text/css; charset=utf-8";
        if (name.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (name.endsWith(".json")) return "application/json; charset=utf-8";
        if (name.endsWith(".md")) return "text/markdown; charset=utf-8";
        return "application/octet-stream";
    }

    private static void sendText(HttpExchange exchange, int statusCode, String contentType, String text) throws IOException {
        byte[] body = text.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(statusCode, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }
}
