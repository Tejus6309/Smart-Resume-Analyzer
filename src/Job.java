import java.util.HashSet;

public class Job {
    private int jobId;
    private String jobTitle;
    private String companyName;
    private String jobDescription;
    private HashSet<String> requiredSkills;

    public Job(int jobId, String jobTitle, String companyName, String jobDescription,
               HashSet<String> requiredSkills) {
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.companyName = companyName;
        this.jobDescription = jobDescription;
        this.requiredSkills = new HashSet<>(requiredSkills);
    }

    public int getJobId() { return jobId; }
    public void setJobId(int jobId) { this.jobId = jobId; }
    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getJobDescription() { return jobDescription; }
    public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }
    public HashSet<String> getRequiredSkills() { return new HashSet<>(requiredSkills); }
    public void setRequiredSkills(HashSet<String> requiredSkills) {
        this.requiredSkills = new HashSet<>(requiredSkills);
    }

    public void displayInformation() {
        System.out.printf("[%d] %s | %s%n", jobId, jobTitle, companyName);
        System.out.println("Description: " + jobDescription);
        System.out.println("Required skills: " + SkillExtractor.formatSkills(requiredSkills));
    }
}
