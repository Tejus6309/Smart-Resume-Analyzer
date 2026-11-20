import com.sun.net.httpserver.HttpExchange;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class LoginService {
    private static final String COOKIE = "resume_matcher_session";
    private static final int SESSION_SECONDS = 8 * 60 * 60;
    private final MemoryStore store;
    private final SecureRandom random = new SecureRandom();
    // The local HTTP server processes requests on its default single worker.
    private final Map<String, Session> sessions = new HashMap<>();

    public LoginService(MemoryStore store) {
        this.store = store;
    }

    public String authenticate(String name, String password, boolean register) {
        String username = name.strip();
        if (!username.matches("[a-z0-9_.-]{3,32}")) {
            throw new IllegalArgumentException("Use 3 to 32 letters, numbers, dots, underscores or hyphens.");
        }
        if (password.length() < 8 || password.length() > 128 || password.isBlank()) {
            throw new IllegalArgumentException("Use a password with 8 to 128 characters.");
        }
        if (register) {
            byte[] salt = randomBytes(16);
            if (!store.insertUser(username, salt, hash(password, salt))) {
                throw new IllegalArgumentException("That username is already registered.");
            }
            return username;
        }

        MemoryStore.PasswordRecord record = store.findPassword(username);
        byte[] calculated = hash(password, record == null ? new byte[16] : record.salt());
        return record != null && MessageDigest.isEqual(calculated, record.hash()) ? username : "";
    }

    public String currentUser(HttpExchange exchange) {
        String token = token(exchange);
        Session session = sessions.get(token);
        if (session == null) return "";
        if (!session.expires().isAfter(Instant.now())) {
            sessions.remove(token);
            return "";
        }
        return session.username();
    }

    public void signIn(HttpExchange exchange, String username) {
        sessions.remove(token(exchange));
        Instant now = Instant.now();
        sessions.values().removeIf(session -> !session.expires().isAfter(now));
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
        sessions.put(token, new Session(username, now.plusSeconds(SESSION_SECONDS)));
        setCookie(exchange, token, SESSION_SECONDS);
    }

    public void signOut(HttpExchange exchange) {
        sessions.remove(token(exchange));
        setCookie(exchange, "", 0);
    }

    private void setCookie(HttpExchange exchange, String token, int age) {
        exchange.getResponseHeaders().set("Set-Cookie", COOKIE + "=" + token
                + "; Path=/; Max-Age=" + age + "; HttpOnly; SameSite=Strict");
    }

    private String token(HttpExchange exchange) {
        for (String header : exchange.getRequestHeaders().getOrDefault("Cookie", java.util.List.of())) {
            for (String cookie : header.split(";")) {
                String value = cookie.strip();
                if (value.startsWith(COOKIE + "=")) return value.substring(COOKIE.length() + 1);
            }
        }
        return "";
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }

    private byte[] hash(String password, byte[] salt) {
        PBEKeySpec input = new PBEKeySpec(password.toCharArray(), salt, 600_000, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(input).getEncoded();
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("Password hashing is unavailable.", error);
        } finally {
            input.clearPassword();
        }
    }

    private record Session(String username, Instant expires) {}
}
