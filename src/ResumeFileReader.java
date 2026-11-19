import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

public class ResumeFileReader {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_TEXT = 100_000;
    private static final String WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static final String STRICT_WORD = "http://purl.oclc.org/ooxml/wordprocessingml/main";

    public String read(byte[] bytes, String format) throws IOException {
        String text = switch (format) {
            case "pdf" -> readPdf(bytes);
            case "docx" -> readDocx(bytes);
            default -> throw new IOException("Choose a PDF or DOCX file.");
        };
        text = text.strip();
        if (text.isBlank()) {
            throw new IOException("No selectable text found. Try a text-based file or paste the resume.");
        }
        if (text.length() > MAX_TEXT) {
            throw new IOException("The extracted text is too long. Paste the relevant section instead.");
        }
        return text;
    }

    private String readPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            if (document.isEncrypted() || !document.getCurrentAccessPermission().canExtractContent()) {
                throw new IOException("Use an unlocked PDF or paste the resume text.");
            }
            if (document.getNumberOfPages() > 50) {
                throw new IOException("Choose a PDF with at most 50 pages.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        } catch (InvalidPasswordException error) {
            throw new IOException("Use an unlocked PDF or paste the resume text.", error);
        }
    }

    private String readDocx(byte[] bytes) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            int remaining = 16 * 1024 * 1024;
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    byte[] xml = zip.readNBytes(Math.min(remaining, 2 * 1024 * 1024) + 1);
                    if (xml.length > Math.min(remaining, 2 * 1024 * 1024)) {
                        throw new IOException("The Word document is too large to read.");
                    }
                    return readWordXml(xml);
                }
                // Bound inflated data before the document entry as well.
                byte[] buffer = new byte[8192];
                int read;
                while ((read = zip.read(buffer)) != -1) {
                    remaining -= read;
                    if (remaining < 0) {
                        throw new IOException("The Word document is too large to read.");
                    }
                }
            }
        }
        throw new IOException("No document text was found in this DOCX.");
    }

    private String readWordXml(byte[] xml) throws IOException {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            var builder = factory.newDocumentBuilder();
            builder.setErrorHandler(new DefaultHandler());
            Node document = builder.parse(new ByteArrayInputStream(xml)).getDocumentElement();
            StringBuilder text = new StringBuilder();
            appendText(document, text, 0);
            return text.toString();
        } catch (ParserConfigurationException | SAXException error) {
            throw new IOException("Could not read the Word document.", error);
        }
    }

    private void appendText(Node node, StringBuilder text, int depth) throws IOException {
        if (depth > 100) {
            throw new IOException("The Word document structure is too deeply nested.");
        }
        boolean word = WORD.equals(node.getNamespaceURI()) || STRICT_WORD.equals(node.getNamespaceURI());
        String name = node.getLocalName();
        if (word && "t".equals(name)) {
            text.append(node.getTextContent());
            return;
        }
        if (word && ("tab".equals(name) || "br".equals(name))) {
            text.append(' ');
        }
        for (Node child = node.getFirstChild(); child != null; child = child.getNextSibling()) {
            appendText(child, text, depth + 1);
        }
        if (word && "p".equals(name)) {
            text.append('\n');
        }
    }
}
