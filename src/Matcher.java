import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.stream.Collectors;

public class Matcher {
    public MatchResult match(Resume resume, Job job) {
        HashSet<String> required = job.getRequiredSkills();
        HashSet<String> matched = new HashSet<>(required);
        matched.retainAll(resume.getSkills());
        HashSet<String> missing = new HashSet<>(required);
        missing.removeAll(matched);

        Double percentage = null;
        if (!required.isEmpty()) {
            percentage = 100.0 * matched.size() / required.size();
        }
        return new MatchResult(job, resume, matched, missing, percentage);
    }

    public ArrayList<MatchResult> rank(Resume resume, ArrayList<Job> jobs) {
        Comparator<MatchResult> byScore = Comparator.comparing(
                MatchResult::getMatchPercentage,
                Comparator.nullsLast(Comparator.reverseOrder()));
        return jobs.stream()
                .map(job -> match(resume, job))
                .sorted(byScore)
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
