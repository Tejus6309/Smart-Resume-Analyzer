// Uploads already return plain text. Use only the opening lines for name and job hints.
const jobSection = /^(?:about (?:us|the company|the job|the role)|the role|overview|job summary|(?:key )?responsibilities|(?:required |preferred )?(?:skills|qualifications|requirements)|what (?:you.ll do|we offer)|benefits)\b/i;
const resumeSection = /^(?:about me|profile|(?:professional |career )?summary|(?:work |professional )?experience|employment|education|skills|objective|projects|certifications)\b/i;
const roleEnding = /\b(?:developer|engineer|analyst|designer|manager|director|specialist|coordinator|associate|consultant|assistant|architect|administrator|technician|intern|lead|officer|scientist|accountant|recruiter|writer|teacher|nurse|representative|product owner|scrum master)(?:\s+(?:[IVX]{1,3}|\d+|\([^()]{1,35}\)))?$/i;
const companyEnding = /\b(?:inc|corp|corporation|company|co|llc|llp|ltd|limited|pvt|plc|group|technologies|solutions|software|systems|labs|studio|studios)\.?$/i;
const jobMetadata = /\b(?:remote|hybrid|on[- ]site|part[- ]time|full[- ]time|contract(?:or)?|permanent|engineering|department|product team)\b/i;
const contact = /[\w.+-]+@[\w.-]+\.\p{L}{2,}|https?:\/\/|(?:linkedin|github)\.com|(?:\+?\d[\d ().-]{7,}\d)/iu;

function openingLines(text, heading, section) {
  const lines = [];
  for (const rawLine of text.split(/\r\n?|\n/)) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (!line || heading.test(line)) continue;
    if (section.test(line) || lines.length === 8) break;
    lines.push(line);
  }
  return lines;
}

function labeledValue(lines, label) {
  for (const line of lines) {
    const value = line.match(label)?.[1].trim();
    if (value && value.length <= 120 && /\p{L}/u.test(value)) return value;
  }
  return '';
}

function looksLikeRole(value) {
  return value.length <= 120 && value.split(' ').length <= 10
    && /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .&+/#()'-]*$/u.test(value) && roleEnding.test(value);
}

function looksLikeCompany(value) {
  return value.length <= 120 && value.split(' ').length <= 8
    && /^\p{L}[\p{L}\p{M}\p{N} .&+''()-]*$/u.test(value)
    && !looksLikeRole(value) && !jobMetadata.test(value) && !jobSection.test(value);
}

export function detectJobDetails(text) {
  const lines = openingLines(text, /^(?:job description|job posting|job opening|vacancy)\s*:?$/i, jobSection);
  let title = labeledValue(lines, /^(?:job title|position(?: title)?|role|title)\s*:\s*(.+)$/i);
  let company = labeledValue(lines, /^(?:company(?: name)?|employer|organi[sz]ation(?: name)?)\s*:\s*(.+)$/i);

  for (const [index, line] of lines.slice(0, 4).entries()) {
    const atCompany = line.match(/^(.+?)\s+at\s+(.+)$/i);
    const [role, employer, ...inlineMetadata] = line.split(/\s+[\/|�---]\s+/);
    const roleValue = atCompany?.[1] ?? role;
    if (!looksLikeRole(roleValue)) continue;
    title ||= roleValue;

    const nextLine = lines[index + 1] || '';
    const previousLine = lines[index - 1] || '';
    const [nextEmployer, ...metadata] = nextLine.split(/\s+[\/|�---]\s+/);
    const inlineCompany = atCompany?.[2].split(/\s+[\/|�---]\s+/)[0] ?? employer;
    if (!company && inlineCompany && looksLikeCompany(inlineCompany)
      && (atCompany || companyEnding.test(inlineCompany) || inlineMetadata.some(part => jobMetadata.test(part)))) {
      company = inlineCompany;
    } else if (!company && looksLikeCompany(nextEmployer)
      && (companyEnding.test(nextEmployer) || metadata.some(part => jobMetadata.test(part)))) {
      company = nextEmployer;
    } else if (!company && looksLikeCompany(previousLine) && companyEnding.test(previousLine)) {
      company = previousLine;
    }
    break;
  }

  return { title, company };
}

function looksLikeName(value) {
  return value.length <= 120 && value.split(' ').length <= 6
    && /^\p{L}[\p{L}\p{M}''.-]*(?: \p{L}[\p{L}\p{M}''.-]*)*$/u.test(value)
    && !resumeSection.test(value) && !looksLikeRole(value) && !companyEnding.test(value);
}

export function detectCandidateName(text) {
  const lines = openingLines(text, /^(?:r[e�]sum[e�]|cv|curriculum vitae)\s*:?$/i, resumeSection);
  const labeled = labeledValue(lines, /^(?:(?:candidate|full|applicant) )?name\s*:\s*(.+)$/i);
  if (labeled && looksLikeName(labeled)) return labeled;

  const [first = '', ...following] = lines;
  const [name, ...inlineDetails] = first.split(/\s+[\/|�]\s+/);
  const hasContact = [...inlineDetails, ...following.slice(0, 3)].some(line => contact.test(line));
  if (looksLikeName(name) && (hasContact || (!inlineDetails.length && looksLikeRole(following[0] || '')))) {
    return name;
  }
  return '';
}
