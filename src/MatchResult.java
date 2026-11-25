import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MatchResult implements Reportable {
    private final Job job;
    private final Resume resume;
    private final HashSet<String> matchedSkills;
    private final HashSet<String> missingSkills;
    private final Double matchPercentage;

    public MatchResult(Job job, Resume resume, Set<String> matched, Set<String> missing,
                       Double matchPercentage) {
        this.job = job;
        this.resume = resume;
        matchedSkills = new HashSet<>(matched);
        missingSkills = new HashSet<>(missing);
        this.matchPercentage = matchPercentage;
    }

    public Job getJob() { return job; }
    public Resume getResume() { return resume; }
    public HashSet<String> getMatchedSkills() { return new HashSet<>(matchedSkills); }
    public HashSet<String> getMissingSkills() { return new HashSet<>(missingSkills); }
    public Double getMatchPercentage() { return matchPercentage; }

    public String getRecommendation() {
        if (matchPercentage == null) {
            return "Review the job requirements manually because no required skills were recognized.";
        }
        if (matchPercentage >= 80) {
            return "Apply. Your resume matches most of the recognized required skills.";
        }
        if (matchPercentage >= 50) {
            return "Consider applying if you can show relevant experience for the missing skills.";
        }
        return "Address the missing skills before applying.";
    }

    public static String formatPercentage(Double percentage) {
        return percentage == null ? "N/A" : String.format(Locale.ROOT, "%.2f%%", percentage);
    }

    @Override
    public String generateSummary() {
        String calculation = matchPercentage == null
                ? "No recognizable required skills."
                : String.format(Locale.ROOT, "(%d / %d) x 100 = %s",
                    matchedSkills.size(), matchedSkills.size() + missingSkills.size(),
                    formatPercentage(matchPercentage));
        return String.format(
                "Candidate Name: %s%nJob Title: %s%nCompany: %s%n%n"
                + "Resume Skills: %s%nRequired Skills: %s%nMatched Skills: %s%nMissing Skills: %s%n%n"
                + "Match Score: %s%nCalculation: %s%nApplication Suggestion: %s%n",
                resume.getCandidateName(), job.getJobTitle(), job.getCompanyName(),
                SkillExtractor.formatSkills(resume.getSkills()),
                SkillExtractor.formatSkills(job.getRequiredSkills()),
                SkillExtractor.formatSkills(matchedSkills), SkillExtractor.formatSkills(missingSkills),
                formatPercentage(matchPercentage), calculation, getRecommendation());
    }
}
