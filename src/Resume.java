import java.util.HashSet;

public class Resume {
    private int resumeId;
    private String candidateName;
    private String resumeText;
    private HashSet<String> skills;

    public Resume(int resumeId, String candidateName, String resumeText, HashSet<String> skills) {
        this.resumeId = resumeId;
        this.candidateName = candidateName;
        this.resumeText = resumeText;
        this.skills = new HashSet<>(skills);
    }

    public int getResumeId() { return resumeId; }
    public void setResumeId(int resumeId) { this.resumeId = resumeId; }
    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
    public String getResumeText() { return resumeText; }
    public void setResumeText(String resumeText) { this.resumeText = resumeText; }
    public HashSet<String> getSkills() { return new HashSet<>(skills); }
    public void setSkills(HashSet<String> skills) { this.skills = new HashSet<>(skills); }

    public void displayDetails() {
        System.out.printf("Resume #%d | %s%n", resumeId, candidateName);
        System.out.println("Resume text: " + resumeText);
        System.out.println("Extracted skills: " + SkillExtractor.formatSkills(skills));
    }
}
