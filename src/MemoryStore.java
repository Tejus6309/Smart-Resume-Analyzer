import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Temporary backend storage. Nothing in this class reads or writes a data file. */
public class MemoryStore {
    private final Map<String, PasswordRecord> users = new HashMap<>();
    private final Map<Integer, Resume> resumes = new LinkedHashMap<>();
    private final Map<Integer, Job> jobs = new LinkedHashMap<>();
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
        resumes.put(resume.getResumeId(), copyResume(resume));
    }

    public ArrayList<Resume> getResumes() {
        return resumes.values().stream()
                .map(this::copyResume)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public Resume findResume(int id) {
        Resume resume = resumes.get(id);
        return resume == null ? null : copyResume(resume);
    }

    public void insertJob(Job job) {
        job.setJobId(jobs.size() + 1);
        jobs.put(job.getJobId(), copyJob(job));
    }

    public ArrayList<Job> getJobs() {
        return jobs.values().stream()
                .map(this::copyJob)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public Job findJob(int id) {
        Job job = jobs.get(id);
        return job == null ? null : copyJob(job);
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
        ArrayList<String> newestFirst = new ArrayList<>(history);
        Collections.reverse(newestFirst);
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
