import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeSet;

public class WebMain {
    private final MemoryStore store = new MemoryStore();
    private final LoginService login = new LoginService(store);
    private final SkillExtractor extractor = new SkillExtractor();
    private final Matcher matcher = new Matcher();
    private final ReportManager reports = new ReportManager();
    private final ResumeFileReader files = new ResumeFileReader();
    private final Path webDirectory;
    private final String page;

    public WebMain(Path webDirectory) throws IOException {
        this.webDirectory = webDirectory;
        page = Files.readString(webDirectory.resolve("index.html"));
    }

    public static void main(String[] args) throws IOException {
        int port = args.length == 0 ? 8080 : Integer.parseInt(args[0]);
        Path webDirectory = args.length > 1 ? Path.of(args[1]) : Path.of("web");
        WebMain app = new WebMain(webDirectory);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", app::handle);
        server.start();
        System.out.println("Open http://127.0.0.1:" + server.getAddress().getPort());
    }

    private void handle(HttpExchange exchange) throws IOException {
        try (exchange) {
            int port = exchange.getLocalAddress().getPort();
            String host = exchange.getRequestHeaders().getFirst("Host");
            if (!("127.0.0.1:" + port).equals(host) && !("localhost:" + port).equals(host)) {
                send(exchange, 403, "text/plain", "Open the app at its local address.");
                return;
            }
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            try {
                if (method.equals("GET") && path.equals("/session")) {
                    sendUser(exchange, login.currentUser(exchange));
                    return;
                }
                boolean post = method.equals("POST")
                        && "1".equals(exchange.getRequestHeaders().getFirst("X-Resume-Matcher"));
                if (post && (path.equals("/login") || path.equals("/register"))) {
                    Map<String, String> form = readForm(exchange);
                    String username = login.authenticate(form.getOrDefault("username", ""),
                            form.getOrDefault("password", ""), path.equals("/register"));
                    if (username.isEmpty()) {
                        send(exchange, 401, "text/plain", "Username or password is incorrect.");
                    } else {
                        login.signIn(exchange, username);
                        sendUser(exchange, username);
                    }
                    return;
                }
                if (post && path.equals("/logout")) {
                    login.signOut(exchange);
                    sendUser(exchange, "");
                    return;
                }
                boolean asset = method.equals("GET")
                        && List.of("/", "/style.css", "/app.js", "/react-runtime.js").contains(path);
                if (!asset && login.currentUser(exchange).isEmpty()) {
                    send(exchange, 401, "text/plain", "Sign in to use the workspace.");
                    return;
                }
                if (method.equals("GET")) {
                    switch (path) {
                        case "/" -> send(exchange, 200, "text/html", page);
                        case "/style.css" -> send(exchange, 200, "text/css",
                                Files.readString(webDirectory.resolve("style.css")));
                        case "/app.js", "/react-runtime.js" -> send(exchange, 200, "text/javascript",
                                Files.readString(webDirectory.resolve(path.substring(1))));
                        case "/workspace" -> send(exchange, 200, "application/json", workspace());
                        case "/history" -> send(exchange, 200, "application/json", json(store.getMatchHistory()));
                        default -> send(exchange, 404, "text/plain", "Page not found.");
                    }
                } else if (post) {
                    switch (path) {
                        case "/extract" -> extract(exchange);
                        case "/match" -> send(exchange, 200, "application/json", match(readForm(exchange)));
                        case "/report" -> send(exchange, 200, "text/plain", saveReport(readForm(exchange)));
                        case "/jobs" -> {
                            addJob(readForm(exchange));
                            send(exchange, 200, "text/plain", "Job saved.");
                        }
                        default -> send(exchange, 404, "text/plain", "Page not found.");
                    }
                } else {
                    send(exchange, 405, "text/plain", "Use the local app to submit this request.");
                }
            } catch (IllegalArgumentException error) {
                send(exchange, 400, "text/plain", error.getMessage());
            } catch (IOException error) {
                System.err.println(error.getMessage());
                send(exchange, 500, "text/plain", "Could not read or write a local file. Check the project folder.");
            }
        }
    }

    private void sendUser(HttpExchange exchange, String username) throws IOException {
        send(exchange, 200, "application/json", json(Map.of("username", username)));
    }

    private String workspace() {
        var resumes = new ArrayList<Map<String, Object>>();
        for (Resume resume : store.getResumes()) {
            resumes.add(Map.of("id", resume.getResumeId(), "name", resume.getCandidateName()));
        }
        var jobs = new ArrayList<Map<String, Object>>();
        for (Job job : store.getJobs()) {
            jobs.add(Map.of("id", job.getJobId(), "title", job.getJobTitle(), "company", job.getCompanyName()));
        }
        return json(Map.of("resumes", resumes, "jobs", jobs));
    }

    private void extract(HttpExchange exchange) throws IOException {
        byte[] bytes = readBody(exchange, ResumeFileReader.MAX_BYTES);
        String format = exchange.getRequestURI().getRawQuery();
        if (!"pdf".equals(format) && !"docx".equals(format)) {
            throw new IllegalArgumentException("Choose a PDF or DOCX file.");
        }
        String extracted;
        try {
            extracted = files.read(bytes, format);
        } catch (IOException | RuntimeException error) {
            String message = error.getMessage();
            String readable = message != null && (message.startsWith("No ")
                    || message.startsWith("Choose ") || message.startsWith("Use ")
                    || message.startsWith("The Word") || message.startsWith("The extracted"))
                    ? message : "Could not read this file. Try another PDF or DOCX, or paste the text.";
            send(exchange, 422, "text/plain", readable);
            return;
        }
        send(exchange, 200, "text/plain", extracted);
    }

    private void addJob(Map<String, String> form) {
        String title = required(form, "title", "Job title", 120);
        String company = required(form, "company", "Company", 120);
        String description = required(form, "description", "Job description", 20_000);
        store.insertJob(new Job(0, title, company, description, extractor.extractSkills(description)));
    }

    private String match(Map<String, String> form) {
        ArrayList<Job> jobs = store.getJobs();
        if (jobs.isEmpty()) {
            throw new IllegalArgumentException("Add a job before running a match.");
        }
        String jobId = form.getOrDefault("job", "");
        Job selectedJob = null;
        if (!jobId.isEmpty()) {
            selectedJob = store.findJob(savedId(jobId));
            if (selectedJob == null) {
                throw new IllegalArgumentException("Choose a saved job.");
            }
        }

        Resume resume = selectResume(form);
        List<MatchResult> results = selectedJob == null
                ? matcher.rank(resume, jobs) : List.of(matcher.match(resume, selectedJob));
        store.saveMatches(results);
        return json(Map.of("resumeId", resume.getResumeId(), "name", resume.getCandidateName(),
                "skills", new TreeSet<>(resume.getSkills()),
                "matches", results.stream().map(this::matchData).toList()));
    }

    private Resume selectResume(Map<String, String> form) {
        String saved = form.getOrDefault("saved", "");
        if (!saved.isEmpty()) {
            Resume resume = store.findResume(savedId(saved));
            if (resume == null) {
                throw new IllegalArgumentException("Choose a saved resume.");
            }
            return resume;
        }
        String name = required(form, "name", "Candidate name", 120);
        String text = required(form, "resume", "Resume text", 100_000);
        Resume resume = new Resume(0, name, text, extractor.extractSkills(text));
        if ("yes".equals(form.get("save"))) {
            store.saveResume(resume);
        }
        return resume;
    }

    private String saveReport(Map<String, String> form) throws IOException {
        if (form.getOrDefault("saved", "").equals("0")) {
            return "Saved to " + reports.exportStandalone(required(form, "report", "Report", 16_000));
        }
        required(form, "saved", "Saved resume ID", 12);
        String id = required(form, "job", "Job ID", 12);
        Resume resume = selectResume(form);
        Job job = store.findJob(savedId(id));
        if (job == null) {
            throw new IllegalArgumentException("Choose a saved job.");
        }
        return "Added to " + reports.export(matcher.match(resume, job), resume.getResumeId());
    }

    private int savedId(String value) {
        try {
            int id = Integer.parseInt(value);
            // Web requests use the exact decimal IDs shown in the saved lists.
            return Integer.toString(id).equals(value) ? id : 0;
        } catch (NumberFormatException error) {
            return 0;
        }
    }

    private Map<String, Object> matchData(MatchResult result) {
        Job job = result.getJob();
        Double score = result.getMatchPercentage();
        return Map.of("jobId", job.getJobId(), "title", job.getJobTitle(), "company", job.getCompanyName(),
                "score", MatchResult.formatPercentage(score), "progress", score == null ? -1 : score,
                "requiredCount", job.getRequiredSkills().size(),
                "matched", new TreeSet<>(result.getMatchedSkills()),
                "missing", new TreeSet<>(result.getMissingSkills()), "report", result.generateSummary());
    }

    private Map<String, String> readForm(HttpExchange exchange) throws IOException {
        String body = new String(readBody(exchange, 1_500_000), StandardCharsets.UTF_8);
        Map<String, String> form = new HashMap<>();
        for (String field : body.split("&")) {
            String[] pair = field.split("=", 2);
            if (pair.length == 2) {
                form.put(URLDecoder.decode(pair[0], StandardCharsets.UTF_8),
                         URLDecoder.decode(pair[1], StandardCharsets.UTF_8));
            }
        }
        return form;
    }

    private byte[] readBody(HttpExchange exchange, int maximum) throws IOException {
        byte[] bytes = exchange.getRequestBody().readNBytes(maximum + 1);
        if (bytes.length > maximum) {
            throw new IllegalArgumentException("This upload or form is too large.");
        }
        return bytes;
    }

    private String required(Map<String, String> form, String field, String label, int max) {
        String value = form.getOrDefault(field, "").strip();
        if (value.isEmpty() || value.length() > max) {
            throw new IllegalArgumentException(label + " must contain 1 to " + max + " characters.");
        }
        return value;
    }

    // These response shapes use strings, numbers, lists and objects only.
    private static String json(Object value) {
        if (value instanceof Number number) {
            return number.toString();
        }
        if (value instanceof Map<?, ?> map) {
            StringJoiner object = new StringJoiner(",", "{", "}");
            map.forEach((key, item) -> object.add(json(key) + ":" + json(item)));
            return object.toString();
        }
        if (value instanceof Iterable<?> list) {
            StringJoiner array = new StringJoiner(",", "[", "]");
            list.forEach(item -> array.add(json(item)));
            return array.toString();
        }
        StringBuilder quoted = new StringBuilder("\"");
        for (char ch : value.toString().toCharArray()) {
            if (ch == '"' || ch == '\\') {
                quoted.append('\\').append(ch);
            } else if (ch < 32) {
                quoted.append(String.format("\\u%04x", (int) ch));
            } else {
                quoted.append(ch);
            }
        }
        return quoted.append('"').toString();
    }

    private void send(HttpExchange exchange, int status, String type, String content) throws IOException {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.getResponseHeaders().set("Content-Security-Policy",
                "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }
}
