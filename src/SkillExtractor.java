import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class SkillExtractor {
    private final HashMap<String, Pattern> dictionary = new HashMap<>();

    public SkillExtractor() {
        String[] skills = {
            "Java", "Python", "C", "C++", "C#", "SQL", "HTML", "CSS", "JavaScript",
            "React", "Node.js", "Git", "GitHub", "JDBC", "OOP", "Data Structures",
            "Algorithms", "Linux", "MySQL", "SQLite", "Communication", "Problem Solving"
        };
        for (String skill : skills) {
            String literal = Pattern.quote(skill.toLowerCase(Locale.ROOT));
            // A skill may touch punctuation, but not letters, digits, _, + or #.
            dictionary.put(skill, Pattern.compile("(?<![\\p{L}\\p{N}_+#])"
                    + literal + "(?![\\p{L}\\p{N}_+#])"));
        }
    }

    public HashSet<String> extractSkills(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return dictionary.entrySet().stream()
                .filter(entry -> entry.getValue().matcher(normalized).find())
                .map(Map.Entry::getKey)
                .collect(Collectors.toCollection(HashSet::new));
    }

    public static String formatSkills(Set<String> skills) {
        return skills.isEmpty() ? "(none)" : String.join(", ", new TreeSet<>(skills));
    }
}
