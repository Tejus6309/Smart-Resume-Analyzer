// web/src/main.jsx
import { useEffect, useRef, useState } from "./react-runtime.js";
import { createRoot } from "./react-runtime.js";
import { Fragment, jsx, jsxs } from "./react-runtime.js";
async function request(path, body) {
  const options = body === void 0 ? {} : {
    method: "POST",
    headers: { "X-Resume-Matcher": "1" },
    body
  };
  const response = await fetch(path, options);
  if (!response.ok) {
    if (response.status === 401 && path !== "/login") {
      window.dispatchEvent(new Event("session-ended"));
    }
    throw new Error(await response.text() || "The request failed.");
  }
  return response.headers.get("Content-Type")?.startsWith("application/json") ? response.json() : response.text();
}
function Status({ notice, id }) {
  return /* @__PURE__ */ jsxs("p", { id, className: notice?.error ? "status error" : "status", "aria-live": "polite", children: [
    notice?.busy && /* @__PURE__ */ jsx("span", { className: "spinner", "aria-hidden": "true" }),
    notice?.message
  ] });
}
var pages = [
  ["workspace", "Workspace"],
  ["jobs", "Add Job"],
  ["history", "Match History"]
];
function currentPage() {
  const name = window.location.hash.slice(1);
  return pages.some(([id]) => id === name) ? name : "workspace";
}
function Icon({ name, size = 20 }) {
  const paths = {
    briefcase: /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "7", width: "18", height: "14", rx: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M8 7V4h8v3M3 12a24 24 0 0 0 18 0M10 13h4" })
    ] }),
    workspace: /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "7", height: "18", rx: "1.5" }),
      /* @__PURE__ */ jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }),
      /* @__PURE__ */ jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" })
    ] }),
    jobs: /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "6", width: "18", height: "15", rx: "2" }),
      /* @__PURE__ */ jsx("path", { d: "M8 6V3h8v3M12 10v7M8.5 13.5h7" })
    ] }),
    history: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" }) }),
    document: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h6" }) }),
    compare: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M4 7h16M4 17h16M8 3 4 7l4 4M16 13l4 4-4 4" }) }),
    download: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5" }) }),
    logout: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M9 4H4v16h5M10 12h11M17 8l4 4-4 4" }) }),
    check: /* @__PURE__ */ jsx("path", { d: "m5 12 4 4L19 6" }),
    arrow: /* @__PURE__ */ jsx("path", { d: "M4 12h15m-6-6 6 6-6 6" }),
    upload: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" }) })
  };
  return /* @__PURE__ */ jsx(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: paths[name] || paths.document
    }
  );
}
function Brand({ href }) {
  return /* @__PURE__ */ jsxs("a", { className: "brand", href, children: [
    /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx(Icon, { name: "briefcase", size: 21 }) }),
    /* @__PURE__ */ jsxs("span", { children: [
      "Resume Analyzer",
      /* @__PURE__ */ jsx("small", { children: "& Job Matcher" })
    ] })
  ] });
}
function Header({ username, page, onLogout, signingOut }) {
  return /* @__PURE__ */ jsx("header", { className: username ? "topbar signed-in" : "topbar", children: /* @__PURE__ */ jsxs("div", { className: "bar", children: [
    /* @__PURE__ */ jsx(Brand, { href: username ? "#workspace" : "/" }),
    username && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("nav", { className: "page-nav", "aria-label": "Main navigation", children: pages.map(([id, label]) => /* @__PURE__ */ jsxs(
        "a",
        {
          href: "#" + id,
          "aria-current": page === id ? "page" : void 0,
          children: [
            /* @__PURE__ */ jsx(Icon, { name: id, size: 19 }),
            /* @__PURE__ */ jsx("span", { children: label })
          ]
        },
        id
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "account-controls", children: [
        /* @__PURE__ */ jsx("span", { className: "avatar", "aria-hidden": "true", children: username.slice(0, 1).toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "account-details", children: [
          /* @__PURE__ */ jsx("span", { className: "account-name", children: username }),
          /* @__PURE__ */ jsxs("button", { className: "account-button", type: "button", onClick: onLogout, disabled: signingOut, children: [
            /* @__PURE__ */ jsx(Icon, { name: "logout", size: 15 }),
            signingOut ? "Signing out\u2026" : "Sign out"
          ] })
        ] })
      ] })
    ] })
  ] }) });
}
function PanelHeading({ icon, title }) {
  return /* @__PURE__ */ jsxs("div", { className: "panel-heading", children: [
    /* @__PURE__ */ jsx("span", { className: "panel-icon", children: /* @__PURE__ */ jsx(Icon, { name: icon, size: 18 }) }),
    /* @__PURE__ */ jsx("h2", { children: title })
  ] });
}
function EmptyState({ icon, title, children, action }) {
  return /* @__PURE__ */ jsxs("div", { className: "empty", children: [
    /* @__PURE__ */ jsx("span", { className: "empty-icon", children: /* @__PURE__ */ jsx(Icon, { name: icon, size: 26 }) }),
    /* @__PURE__ */ jsx("h3", { children: title }),
    /* @__PURE__ */ jsx("p", { children }),
    action
  ] });
}
function SignIn({ onSuccess }) {
  const [register, setRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  async function submit(event) {
    event.preventDefault();
    const form = new URLSearchParams(new FormData(event.currentTarget));
    setBusy(true);
    setNotice(null);
    try {
      const session = await request(register ? "/register" : "/login", form);
      onSuccess(session.username);
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsx("main", { className: "auth-page", children: /* @__PURE__ */ jsxs("section", { className: "auth-layout", "aria-labelledby": "auth-heading", children: [
    /* @__PURE__ */ jsxs("div", { className: "auth-intro", children: [
      /* @__PURE__ */ jsxs("h1", { children: [
        "See where your",
        /* @__PURE__ */ jsx("br", { className: "wide-break" }),
        " skills ",
        /* @__PURE__ */ jsx("em", { children: "fit." })
      ] }),
      /* @__PURE__ */ jsx("p", { children: "Compare your resume with a job description to see what matches and where you can improve." }),
      /* @__PURE__ */ jsxs("div", { className: "auth-features", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Icon, { name: "document" }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Bring your resume" }),
            /* @__PURE__ */ jsx("span", { children: "Upload a PDF or DOCX, or paste your text." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Icon, { name: "compare" }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Compare the requirements" }),
            /* @__PURE__ */ jsx("span", { children: "See your score, matched skills and skill gaps." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Icon, { name: "history" }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Keep track of your comparisons" }),
            /* @__PURE__ */ jsx("span", { children: "Review history and export readable reports." })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "auth-form-area", children: /* @__PURE__ */ jsxs("form", { className: "auth-panel", onSubmit: submit, children: [
      /* @__PURE__ */ jsx("h2", { id: "auth-heading", children: register ? "Create an account" : "Welcome back" }),
      /* @__PURE__ */ jsx("p", { className: "auth-description", children: register ? "Create a local account to start comparing resumes." : "Sign in to continue to your workspace." }),
      /* @__PURE__ */ jsx("label", { htmlFor: "username", children: "Username" }),
      /* @__PURE__ */ jsx("input", { id: "username", name: "username", autoComplete: "username", minLength: 3, maxLength: 32, required: true }),
      /* @__PURE__ */ jsx("label", { htmlFor: "password", children: "Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "password",
          name: "password",
          type: "password",
          minLength: 8,
          maxLength: 128,
          autoComplete: register ? "new-password" : "current-password",
          required: true
        }
      ),
      register && /* @__PURE__ */ jsx("p", { className: "status", children: "Use at least 8 characters." }),
      /* @__PURE__ */ jsxs("button", { className: "primary", type: "submit", disabled: busy, children: [
        busy ? "Please wait\u2026" : register ? "Create account" : "Sign in",
        !busy && /* @__PURE__ */ jsx(Icon, { name: "arrow", size: 17 })
      ] }),
      /* @__PURE__ */ jsx(Status, { notice }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "account-switch", disabled: busy, onClick: () => {
        setRegister(!register);
        setNotice(null);
      }, children: register ? "Already registered? Sign in" : "New here? Create an account" })
    ] }, register ? "register" : "login") })
  ] }) });
}
function PageHeading({ title, children, action }) {
  return /* @__PURE__ */ jsxs("header", { className: "page-heading", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { children: title }),
      /* @__PURE__ */ jsx("p", { children })
    ] }),
    action
  ] });
}
function DocumentUpload({ id, loading, disabled, onLoading, onText }) {
  const [notice, setNotice] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  async function upload(file) {
    if (!file || loading || disabled) return;
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(extension) || file.size > 5 * 1024 * 1024) {
      fileInput.current.value = "";
      setNotice({ message: "Choose a PDF or DOCX file up to 5 MB.", error: true });
      return;
    }
    onLoading(true);
    setNotice({ message: "Reading " + file.name + "\u2026", busy: true });
    try {
      onText(await request("/extract?" + extension, file));
      setNotice({ message: "Text extracted from " + file.name + ". Review it below." });
    } catch (error) {
      if (fileInput.current) fileInput.current.value = "";
      setNotice({ message: error.message, error: true });
    } finally {
      onLoading(false);
    }
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: dragging ? "upload dragging" : "upload",
      onDragOver: (event) => {
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: (event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled && !loading) {
          fileInput.current.value = "";
          upload(event.dataTransfer.files[0]);
        }
      },
      children: [
        /* @__PURE__ */ jsxs("label", { htmlFor: id, className: "upload-target", children: [
          /* @__PURE__ */ jsx("span", { className: "panel-icon", children: /* @__PURE__ */ jsx(Icon, { name: "upload", size: 18 }) }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Choose a file or drop it here" }),
            /* @__PURE__ */ jsx("small", { id: id + "-hint", children: "PDF or DOCX \xB7 up to 5 MB" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id,
            ref: fileInput,
            type: "file",
            accept: ".pdf,.docx",
            disabled: loading || disabled,
            "aria-describedby": id + "-hint " + id + "-status",
            onChange: (event) => upload(event.target.files[0])
          }
        ),
        /* @__PURE__ */ jsx(Status, { id: id + "-status", notice })
      ]
    }
  );
}
function AddJobPage({ jobs, onJobSaved }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const tooLong = description.length > 2e4;
  async function save(event) {
    event.preventDefault();
    if (uploading || saving || tooLong) return;
    const form = event.currentTarget;
    setSaving(true);
    try {
      await request("/jobs", new URLSearchParams(new FormData(form)));
      form.reset();
      setDescription("");
      setUploadKey((key) => key + 1);
      setNotice({ message: "Job saved." });
      try {
        await onJobSaved();
      } catch {
        setNotice({ message: "Job saved. Reload the page to refresh the job list.", error: true });
      }
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("section", { className: "utility-page", children: [
    /* @__PURE__ */ jsx(PageHeading, { title: "Add a job", children: "Save a job description or list the skills you want to compare." }),
    /* @__PURE__ */ jsxs("div", { className: "jobs-layout", children: [
      /* @__PURE__ */ jsxs("form", { className: "panel", onSubmit: save, children: [
        /* @__PURE__ */ jsx(PanelHeading, { icon: "jobs", title: "Job details" }),
        /* @__PURE__ */ jsxs("div", { className: "job-fields", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "job-title", children: "Job title" }),
            /* @__PURE__ */ jsx("input", { id: "job-title", name: "title", maxLength: 120, placeholder: "e.g. Frontend Developer", required: true })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "company", children: "Company" }),
            /* @__PURE__ */ jsx("input", { id: "company", name: "company", maxLength: 120, placeholder: "Company name", required: true })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          DocumentUpload,
          {
            id: "job-file",
            loading: uploading,
            disabled: saving,
            onLoading: setUploading,
            onText: setDescription
          },
          uploadKey
        ),
        /* @__PURE__ */ jsx("label", { htmlFor: "description", children: "Job description or required skills" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            id: "description",
            name: "description",
            value: description,
            onChange: (event) => setDescription(event.target.value),
            readOnly: saving || uploading,
            rows: 7,
            maxLength: 2e4,
            placeholder: "Paste the job description or enter the skills it requires.",
            required: true
          }
        ),
        tooLong && /* @__PURE__ */ jsx(Status, { notice: { message: "Shorten the job description to 20,000 characters before saving.", error: true } }),
        /* @__PURE__ */ jsxs("div", { className: "job-actions", children: [
          /* @__PURE__ */ jsxs("button", { className: "primary", type: "submit", disabled: saving || uploading || tooLong, children: [
            /* @__PURE__ */ jsx(Icon, { name: "jobs", size: 17 }),
            saving ? "Saving\u2026" : "Save job"
          ] }),
          /* @__PURE__ */ jsx("a", { className: "page-link", href: "#workspace", children: "Back to workspace" })
        ] }),
        /* @__PURE__ */ jsx(Status, { notice })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "panel saved-jobs", "aria-label": "Saved jobs", children: [
        /* @__PURE__ */ jsx(PanelHeading, { icon: "briefcase", title: "Saved jobs" }),
        jobs.length ? /* @__PURE__ */ jsx("ul", { children: jobs.map((job) => /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "job-icon", children: /* @__PURE__ */ jsx(Icon, { name: "briefcase" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("strong", { children: job.title }),
            /* @__PURE__ */ jsx("p", { children: job.company })
          ] })
        ] }, job.id)) }) : /* @__PURE__ */ jsx(EmptyState, { icon: "briefcase", title: "No saved jobs yet", children: "Jobs you save appear here and in the comparison menu." })
      ] })
    ] })
  ] });
}
function Tags({ skills, variant = "" }) {
  return skills.length ? /* @__PURE__ */ jsx("div", { className: "tags", children: skills.map((skill) => /* @__PURE__ */ jsx("span", { className: "tag " + variant, children: skill }, skill)) }) : /* @__PURE__ */ jsx("span", { className: "muted", children: "None" });
}
function MatchCard({ match, resumeId }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  async function saveReport() {
    setSaving(true);
    try {
      const message = await request("/report", new URLSearchParams({
        saved: resumeId,
        job: match.jobId,
        report: match.report
      }));
      setNotice({ message });
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSaving(false);
    }
  }
  function downloadReport() {
    const url = URL.createObjectURL(new Blob([match.report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "match-report.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  return /* @__PURE__ */ jsxs("article", { className: "result-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "result-title", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { children: match.title }),
        /* @__PURE__ */ jsx("p", { children: match.company })
      ] }),
      /* @__PURE__ */ jsx("strong", { children: match.score })
    ] }),
    match.progress >= 0 && /* @__PURE__ */ jsx("progress", { max: 100, value: match.progress, "aria-label": "Match percentage" }),
    /* @__PURE__ */ jsx("p", { className: "calculation", children: match.progress < 0 ? "No recognizable required skills." : match.matched.length + " of " + match.requiredCount + " required skills matched" }),
    /* @__PURE__ */ jsxs("div", { className: "skill-groups", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h4", { children: "Matched skills" }),
        /* @__PURE__ */ jsx(Tags, { skills: match.matched, variant: "matched" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h4", { children: "Missing skills" }),
        /* @__PURE__ */ jsx(Tags, { skills: match.missing, variant: "missing" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "report-actions", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "download", onClick: saveReport, disabled: saving, children: resumeId ? "Append to resume report" : "Save report to folder" }),
      /* @__PURE__ */ jsxs("button", { type: "button", className: "download", onClick: downloadReport, children: [
        /* @__PURE__ */ jsx(Icon, { name: "download", size: 15 }),
        "Download a copy"
      ] }),
      /* @__PURE__ */ jsx(Status, { notice })
    ] })
  ] });
}
function Results({ data, revision, resultRef }) {
  return /* @__PURE__ */ jsxs("section", { className: "panel results", "aria-label": "Match results", "aria-live": "polite", ref: resultRef, children: [
    /* @__PURE__ */ jsx(PanelHeading, { icon: "compare", title: "Match results" }),
    data ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "results-head", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { children: data.name }),
          data.resumeId > 0 && /* @__PURE__ */ jsxs("p", { children: [
            "Saved resume #",
            data.resumeId
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "count-label", children: [
          data.matches.length,
          " ",
          data.matches.length === 1 ? "match" : "matches"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "detected", children: [
        /* @__PURE__ */ jsx("h3", { children: "Skills found in resume" }),
        /* @__PURE__ */ jsx(Tags, { skills: data.skills })
      ] }),
      data.matches.map((match) => /* @__PURE__ */ jsx(MatchCard, { match, resumeId: data.resumeId }, revision + ":" + match.jobId))
    ] }) : /* @__PURE__ */ jsx(EmptyState, { icon: "compare", title: "No comparison yet", children: "Choose a resume and a job to see your score, matched skills, and skill gaps." })
  ] });
}
function MatchHistoryPage({ revision }) {
  const [entries, setEntries] = useState(null);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    let active = true;
    request("/history").then((data) => {
      if (active) {
        setEntries(data);
        setNotice(null);
      }
    }).catch((error) => {
      if (active) setNotice({ message: error.message, error: true });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx(PageHeading, { title: "Match history", children: "Review your recent comparisons and matching scores." }),
    /* @__PURE__ */ jsxs("div", { className: "panel history-list", "aria-live": "polite", children: [
      /* @__PURE__ */ jsx(PanelHeading, { icon: "history", title: "Recent comparisons" }),
      notice ? /* @__PURE__ */ jsx(Status, { notice }) : entries === null ? /* @__PURE__ */ jsx(Status, { notice: { message: "Loading history\u2026", busy: true } }) : entries.length === 0 ? /* @__PURE__ */ jsx(
        EmptyState,
        {
          icon: "history",
          title: "No comparisons saved yet",
          action: /* @__PURE__ */ jsxs("a", { className: "secondary", href: "#workspace", children: [
            "Compare a resume ",
            /* @__PURE__ */ jsx(Icon, { name: "arrow", size: 16 })
          ] }),
          children: "Your comparisons appear here after you run a match."
        }
      ) : entries.map((entry) => /* @__PURE__ */ jsxs("article", { className: "history-entry", children: [
        /* @__PURE__ */ jsx("span", { className: "history-icon", children: /* @__PURE__ */ jsx(Icon, { name: "history" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "history-summary", children: entry.split("\n")[0] }),
          /* @__PURE__ */ jsx("p", { className: "history-skills", children: entry.split("\n").slice(1).join("\n") })
        ] })
      ] }, entry))
    ] })
  ] });
}
function Workspace({ username, onLogout, signingOut }) {
  const [workspace, setWorkspace] = useState(null);
  const [saved, setSaved] = useState("");
  const [job, setJob] = useState("");
  const [text, setText] = useState("");
  const [saveResume, setSaveResume] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ message: "Loading saved jobs and resumes\u2026", busy: true });
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(currentPage);
  const resultRef = useRef(null);
  async function refreshWorkspace() {
    const next = await request("/workspace");
    setWorkspace(next);
    setSaved((id) => next.resumes.some((resume) => String(resume.id) === id) ? id : "");
    setJob((id) => next.jobs.some((item) => String(item.id) === id) ? id : "");
  }
  useEffect(() => {
    refreshWorkspace().then(() => setNotice(null)).catch((error) => setNotice({ message: error.message, error: true }));
  }, []);
  useEffect(() => {
    const navigate = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    if (revision && window.matchMedia("(max-width: 760px)").matches) {
      resultRef.current?.scrollIntoView({ block: "start" });
    }
  }, [revision]);
  async function compare(event) {
    event.preventDefault();
    if (!workspace || busy || uploading) return;
    const form = new URLSearchParams(new FormData(event.currentTarget));
    setBusy(true);
    setNotice({ message: "Comparing skills\u2026", busy: true });
    try {
      const result = await request("/match", form);
      setData(result);
      setRevision((previous) => previous + 1);
      const count = result.matches.length;
      setNotice({ message: count === 1 ? "1 match added to history." : count + " matches added to history." });
      if (form.get("save") && !form.get("saved")) {
        setSaveResume(false);
        try {
          await refreshWorkspace();
          setSaved(String(result.resumeId));
        } catch {
          setNotice({ message: "Match and resume saved. Reload the page to refresh the saved list.", error: true });
        }
      }
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      Header,
      {
        username,
        page,
        onLogout,
        signingOut
      }
    ),
    /* @__PURE__ */ jsxs("main", { className: "layout app-main", children: [
      /* @__PURE__ */ jsxs("div", { hidden: page !== "workspace", children: [
        /* @__PURE__ */ jsx(
          PageHeading,
          {
            title: "Compare your resume",
            action: /* @__PURE__ */ jsxs("a", { className: "secondary", href: "#jobs", children: [
              /* @__PURE__ */ jsx(Icon, { name: "jobs", size: 17 }),
              " Add a job"
            ] }),
            children: "Upload your resume or paste its text to find matching jobs and discover missing skills."
          }
        ),
        /* @__PURE__ */ jsxs("section", { "aria-label": "Matching workspace", className: "workspace", children: [
          /* @__PURE__ */ jsxs("form", { className: "panel", onSubmit: compare, children: [
            /* @__PURE__ */ jsx(PanelHeading, { icon: "document", title: "Comparison setup" }),
            /* @__PURE__ */ jsxs("div", { className: "compare-fields", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "saved", children: "Resume to use" }),
                /* @__PURE__ */ jsxs(
                  "select",
                  {
                    id: "saved",
                    name: "saved",
                    value: saved,
                    disabled: busy || uploading,
                    onChange: (event) => setSaved(event.target.value),
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "", children: "New resume" }),
                      workspace?.resumes.map((resume) => /* @__PURE__ */ jsxs("option", { value: resume.id, children: [
                        resume.name,
                        " \xB7 #",
                        resume.id
                      ] }, resume.id))
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "job", children: "Job to compare" }),
                /* @__PURE__ */ jsxs("select", { id: "job", name: "job", value: job, onChange: (event) => setJob(event.target.value), disabled: busy, children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Rank all saved jobs" }),
                  workspace?.jobs.map((item) => /* @__PURE__ */ jsxs("option", { value: item.id, children: [
                    item.title,
                    " \xB7 ",
                    item.company
                  ] }, item.id))
                ] })
              ] })
            ] }),
            workspace?.jobs.length === 0 && /* @__PURE__ */ jsx("p", { className: "inline-hint", children: "Add a job to run your first comparison." }),
            /* @__PURE__ */ jsxs("fieldset", { hidden: Boolean(saved), disabled: Boolean(saved) || busy, children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "name", children: "Candidate name" }),
              /* @__PURE__ */ jsx("input", { id: "name", name: "name", maxLength: 120, placeholder: "e.g. Ananya Rao", required: true }),
              /* @__PURE__ */ jsx(DocumentUpload, { id: "resume-file", loading: uploading, disabled: Boolean(saved) || busy, onLoading: setUploading, onText: setText }),
              /* @__PURE__ */ jsx("label", { htmlFor: "resume", children: "Resume text" }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: "resume",
                  name: "resume",
                  rows: 3,
                  maxLength: 1e5,
                  placeholder: "Extracted text appears here. You can also paste it directly.",
                  value: text,
                  onChange: (event) => setText(event.target.value),
                  required: true
                }
              ),
              /* @__PURE__ */ jsxs("label", { className: "check", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    name: "save",
                    value: "yes",
                    checked: saveResume,
                    onChange: (event) => setSaveResume(event.target.checked)
                  }
                ),
                " Keep this resume for this run"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("button", { className: "primary", type: "submit", disabled: !workspace?.jobs.length || busy || uploading, children: [
              /* @__PURE__ */ jsx(Icon, { name: "compare", size: 18 }),
              "Compare resume"
            ] }),
            /* @__PURE__ */ jsx(Status, { notice })
          ] }),
          /* @__PURE__ */ jsx(Results, { data, revision, resultRef })
        ] })
      ] }),
      page === "jobs" && /* @__PURE__ */ jsx(AddJobPage, { jobs: workspace?.jobs ?? [], onJobSaved: refreshWorkspace }),
      page === "history" && /* @__PURE__ */ jsx(MatchHistoryPage, { revision })
    ] })
  ] });
}
function App() {
  const [username, setUsername] = useState(null);
  const [notice, setNotice] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    function sessionEnded() {
      setUsername("");
      setNotice({ message: "Your session ended. Sign in to continue." });
    }
    window.addEventListener("session-ended", sessionEnded);
    request("/session").then((session) => setUsername(session.username)).catch((error) => {
      setNotice({ message: error.message, error: true });
      setUsername("");
    });
    return () => window.removeEventListener("session-ended", sessionEnded);
  }, []);
  async function signOut() {
    setSigningOut(true);
    try {
      await request("/logout", new URLSearchParams());
      setUsername("");
      setNotice(null);
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSigningOut(false);
    }
  }
  if (username) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Workspace, { username, onLogout: signOut, signingOut }),
      notice && /* @__PURE__ */ jsx("div", { className: "layout", children: /* @__PURE__ */ jsx(Status, { notice }) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "auth-shell", children: [
    /* @__PURE__ */ jsx(Header, {}),
    notice && /* @__PURE__ */ jsx("div", { className: "layout", children: /* @__PURE__ */ jsx(Status, { notice }) }),
    username === null ? /* @__PURE__ */ jsx("div", { className: "layout session-status", children: /* @__PURE__ */ jsx(Status, { notice: { message: "Checking your session\u2026", busy: true } }) }) : /* @__PURE__ */ jsx(SignIn, { onSuccess: (name) => {
      setNotice(null);
      setUsername(name);
    } })
  ] });
}
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx(App, {}));
