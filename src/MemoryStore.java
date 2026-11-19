import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Temporary backend storage. Nothing in this class reads or writes a data file. */
public class MemoryStore {
    private final Map<String, PasswordRecord> users = new HashMap<>();
    private final ArrayList<Resume> resumes = new ArrayList<>();
    private final ArrayList<Job> jobs = new ArrayList<>();
    private final ArrayList<String> history = new ArrayList<>();
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss");

    public boolean insertUser(String username, byte[] salt, byte[] hash) {
        if (users.containsKey(username)) return false;
        users.put(username, new PasswordRecord(salt.clone(), hash.clone()));
        return true;
    }

    public PasswordRecord findPassword(String username) {
        return users.get(username);
    }

    public record PasswordRecord(byte[] salt, byte[] hash) {}

    public void saveResume(Resume resume) {
        resume.setResumeId(resumes.size() + 1);
        resumes.add(copyResume(resume));
    }

    public ArrayList<Resume> getResumes(SkillExtractor extractor) {
        ArrayList<Resume> copies = new ArrayList<>();
        for (Resume resume : resumes) copies.add(copyResume(resume));
        return copies;
    }

    public void insertJob(Job job) {
        job.setJobId(jobs.size() + 1);
        jobs.add(copyJob(job));
    }

    public ArrayList<Job> getJobs() {
        ArrayList<Job> copies = new ArrayList<>();
        for (Job job : jobs) copies.add(copyJob(job));
        return copies;
    }

    public void saveMatch(MatchResult result) {
        saveMatches(List.of(result));
    }

    public void saveMatches(List<MatchResult> results) {
        String time = ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).format(TIME);
        for (MatchResult result : results) {
            Job job = result.getJob();
            history.add(String.format("#%d | %s IST | %s | %s (%s) | %s%nMatched: %s | Missing: %s",
                    history.size() + 1, time, result.getResume().getCandidateName(),
                    job.getJobTitle(), job.getCompanyName(),
                    MatchResult.formatPercentage(result.getMatchPercentage()),
                    SkillExtractor.formatSkills(result.getMatchedSkills()),
                    SkillExtractor.formatSkills(result.getMissingSkills())));
        }
    }

    public ArrayList<String> getMatchHistory() {
        ArrayList<String> newestFirst = new ArrayList<>();
        for (int i = history.size() - 1; i >= 0; i--) newestFirst.add(history.get(i));
        return newestFirst;
    }

    private Resume copyResume(Resume resume) {
        return new Resume(resume.getResumeId(), resume.getCandidateName(),
                resume.getResumeText(), resume.getSkills());
    }

    private Job copyJob(Job job) {
        return new Job(job.getJobId(), job.getJobTitle(), job.getCompanyName(),
                job.getJobDescription(), job.getRequiredSkills());
    }
}
