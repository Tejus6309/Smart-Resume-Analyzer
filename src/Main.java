import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.NoSuchElementException;
import java.util.Scanner;

public class Main {
    private final Scanner input;
    private final SkillExtractor extractor = new SkillExtractor();
    private final Matcher matcher = new Matcher();
    private final MemoryStore store = new MemoryStore();
    private final ReportManager reports = new ReportManager();

    private Resume resume;
    private MatchResult lastMatch;

    public Main(Scanner input) {
        this.input = input;
    }

    public static void main(String[] args) {
        try (Scanner input = new Scanner(System.in, StandardCharsets.UTF_8)) {
            new Main(input).run();
        } catch (NoSuchElementException endOfInput) {
            System.out.println("Input closed. Exiting.");
        }
    }

    private void run() {
        System.out.println("Temporary mode: data clears when this program stops. Reports remain on disk.");

        while (true) {
            printMenu();
            String choice = readLine("Enter your choice: ");
            try {
                switch (choice) {
                    case "1" -> updateResume();
                    case "2" -> viewResume();
                    case "3" -> addJob();
                    case "4" -> viewJobs();
                    case "5" -> matchJob();
                    case "6" -> rankJobs();
                    case "7" -> viewHistory();
                    case "8" -> exportReport();
                    case "9" -> {
                        System.out.println("Goodbye!");
                        return;
                    }
                    case "10" -> loadResume();
                    default -> System.out.println("Invalid choice. Enter a number from 1 to 10.");
                }
            } catch (IOException error) {
                System.out.println("File error: " + error.getMessage());
                System.out.println("Check that the project folders are writable, then try again.");
            }
        }
    }

    private void printMenu() {
        System.out.println("""
                =====================================
                    RESUME AND JOB MATCHING SYSTEM
                =====================================
                1. Enter and Save Resume
                2. View Extracted Resume Skills
                3. Add New Job
                4. View Available Jobs
                5. Match Resume With a Job
                6. Rank All Jobs by Match Percentage
                7. View Match History
                8. Export Match Report
                9. Exit
                10. Load Saved Resume
                """);
    }

    private void updateResume() throws IOException {
        String name = readLine("Candidate name: ");
        if (name.isBlank()) {
            System.out.println("Candidate name cannot be empty.");
            return;
        }
        String text = readText("Paste resume text or skills");
        if (text.isBlank()) {
            System.out.println("Resume text cannot be empty.");
            return;
        }

        Resume newResume = new Resume(0, name, text, extractor.extractSkills(text));
        store.saveResume(newResume);
        selectResume(newResume);
        System.out.printf("Resume saved as ID %d. Use option 10 to load it during this run.%n",
                newResume.getResumeId());
    }

    private void loadResume() throws IOException {
        ArrayList<Resume> savedResumes = store.getResumes();
        if (savedResumes.isEmpty()) {
            System.out.println("No saved resumes. Enter one using option 1.");
            return;
        }
        System.out.println("SAVED RESUMES");
        for (Resume saved : savedResumes) {
            System.out.printf("[%d] %s%n", saved.getResumeId(), saved.getCandidateName());
        }
        int id;
        try {
            id = Integer.parseInt(readLine("Resume ID: "));
        } catch (NumberFormatException error) {
            System.out.println("Invalid resume ID. Enter a listed number.");
            return;
        }
        Resume saved = store.findResume(id);
        if (saved == null) {
            System.out.println("Invalid resume ID. Enter a listed number.");
            return;
        }
        selectResume(saved);
        System.out.printf("Loaded resume #%d for %s.%n", id, saved.getCandidateName());
    }

    private void selectResume(Resume selected) {
        resume = selected;
        lastMatch = null;
    }

    private void viewResume() {
        if (hasResume()) {
            resume.displayDetails();
        }
    }

    private boolean hasResume() {
        if (resume == null) {
            System.out.println("Enter a resume first using option 1, or load one using option 10.");
            return false;
        }
        return true;
    }

    private void addJob() throws IOException {
        String title = readLine("Job title: ");
        if (title.isBlank()) {
            System.out.println("Job title cannot be empty.");
            return;
        }
        String company = readLine("Company name: ");
        if (company.isBlank()) {
            System.out.println("Company name cannot be empty.");
            return;
        }
        String description = readText("Paste the job description with required skills");
        if (description.isBlank()) {
            System.out.println("Job description cannot be empty.");
            return;
        }

        Job job = new Job(0, title, company, description, extractor.extractSkills(description));
        store.insertJob(job);
        System.out.println("Job saved. Use option 4 to see its ID.");
        if (job.getRequiredSkills().isEmpty()) {
            System.out.println("No recognizable required skills. The match score will be N/A.");
        }
    }

    private void viewJobs() throws IOException {
        for (Job job : availableJobs()) {
            job.displayInformation();
            System.out.println();
        }
    }

    private void matchJob() throws IOException {
        if (!hasResume()) {
            return;
        }
        ArrayList<Job> jobs = availableJobs();
        if (jobs.isEmpty()) {
            return;
        }
        for (Job job : jobs) {
            System.out.printf("[%d] %s | %s%n", job.getJobId(), job.getJobTitle(), job.getCompanyName());
        }
        String choice = readLine("Job ID: ");
        int jobId;
        try {
            jobId = Integer.parseInt(choice);
        } catch (NumberFormatException error) {
            System.out.println("Invalid job ID. Enter a listed number.");
            return;
        }
        Job job = store.findJob(jobId);
        if (job == null) {
            System.out.println("Invalid job ID. Enter a listed number.");
            return;
        }
        MatchResult result = matcher.match(resume, job);
        store.saveMatch(result);
        lastMatch = result;
        System.out.println(result.generateSummary());
        System.out.println("Match saved to history.");
    }

    private void rankJobs() throws IOException {
        if (!hasResume()) {
            return;
        }
        ArrayList<Job> jobs = availableJobs();
        if (jobs.isEmpty()) {
            return;
        }
        System.out.println("JOB MATCH RANKING");
        System.out.println("Rank | Job Title | Company | Match %");
        int rank = 1;
        ArrayList<MatchResult> results = matcher.rank(resume, jobs);
        store.saveMatches(results);
        for (MatchResult result : results) {
            Job job = result.getJob();
            System.out.printf("%d | %s | %s | %s%n", rank++, job.getJobTitle(),
                    job.getCompanyName(), MatchResult.formatPercentage(result.getMatchPercentage()));
        }
    }

    private void viewHistory() throws IOException {
        ArrayList<String> history = store.getMatchHistory();
        if (history.isEmpty()) {
            System.out.println("No matches saved yet.");
        }
        for (String entry : history) {
            System.out.println(entry);
        }
    }

    private void exportReport() throws IOException {
        if (lastMatch == null) {
            System.out.println("Match your current resume with a job first using option 5.");
            return;
        }
        System.out.println("Report saved to "
                + reports.export(lastMatch, lastMatch.getResume().getResumeId()).toAbsolutePath());
    }

    private ArrayList<Job> availableJobs() throws IOException {
        ArrayList<Job> jobs = store.getJobs();
        if (jobs.isEmpty()) {
            System.out.println("No jobs saved yet. Add a job using option 3.");
        }
        return jobs;
    }

    private String readLine(String prompt) {
        System.out.print(prompt);
        return input.nextLine().strip();
    }

    private String readText(String prompt) {
        System.out.println(prompt + ". Type END on its own line when finished:");
        StringBuilder text = new StringBuilder();
        String line = input.nextLine();
        while (!line.strip().equals("END")) {
            text.append(line).append(System.lineSeparator());
            line = input.nextLine();
        }
        return text.toString().strip();
    }
}
