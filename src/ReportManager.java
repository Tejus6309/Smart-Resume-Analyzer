import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class ReportManager {
    // IDs restart at 1 each run. A unique run ID prevents mixing different candidates' reports.
    private final String runId = java.util.UUID.randomUUID().toString();
    public Path export(Reportable result, int resumeId) throws IOException {
        Path directory = Path.of("reports");
        Files.createDirectories(directory);
        Path file = directory.resolve("run_" + runId + "_resume_" + resumeId + "_match_report.txt");
        String report = formatReport(result.generateSummary());
        try (var writer = Files.newBufferedWriter(file, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND)) {
            writer.write(report);
        }
        return file;
    }

    public Path exportStandalone(String summary) throws IOException {
        Path directory = Path.of("reports");
        Files.createDirectories(directory);
        Path file = Files.createTempFile(directory, "match_report_", ".txt");
        try (var writer = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            writer.write(formatReport(summary));
        } catch (IOException error) {
            try {
                Files.deleteIfExists(file);
            } catch (IOException cleanupError) {
                error.addSuppressed(cleanupError);
            }
            throw error;
        }
        return file;
    }

    private String formatReport(String summary) {
        String header = "========================================";
        return String.format("%s%n          RESUME MATCH REPORT%n%s%n%n%s%n%n%s%n%n",
                header, header, summary.stripTrailing(), header);
    }
}
