import java.util.ArrayList;
import java.util.HashSet;

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
        ArrayList<MatchResult> results = new ArrayList<>();
        for (Job job : jobs) {
            results.add(match(resume, job));
        }
        // Scores are non-negative. A sort key of -1 puts unavailable scores last.
        results.sort((first, second) -> Double.compare(sortScore(second), sortScore(first)));
        return results;
    }

    private double sortScore(MatchResult result) {
        Double score = result.getMatchPercentage();
        return score == null ? -1.0 : score;
    }
}
