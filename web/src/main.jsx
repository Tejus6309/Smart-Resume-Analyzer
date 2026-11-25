import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { detectCandidateName, detectJobDetails } from './document-details.mjs';

async function request(path, body) {
  const options = body === undefined ? {} : {
    method: 'POST',
    headers: { 'X-Resume-Matcher': '1' },
    body,
  };
  const response = await fetch(path, options);
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') {
      window.dispatchEvent(new Event('session-ended'));
    }
    throw new Error(await response.text() || 'The request failed.');
  }
  return response.headers.get('Content-Type')?.startsWith('application/json')
    ? response.json() : response.text();
}

function Status({ notice, id }) {
  return <p id={id} className={notice?.error ? 'status error' : 'status'} aria-live="polite">
    {notice?.busy && <span className="spinner" aria-hidden="true" />}
    {notice?.message}
  </p>;
}

const pages = [
  ['workspace', 'Workspace'],
  ['jobs', 'Add Job'],
  ['history', 'Match History'],
];

function currentPage() {
  const name = window.location.hash.slice(1);
  return pages.some(([id]) => id === name) ? name : 'workspace';
}

// Small inline SVGs keep the interface clear without an icon dependency.
function Icon({ name, size = 20 }) {
  const paths = {
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12a24 24 0 0 0 18 0M10 13h4" /></>,
    workspace: <><rect x="3" y="3" width="7" height="18" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    jobs: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M8 6V3h8v3M12 10v7M8.5 13.5h7" /></>,
    history: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" /></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h6" /></>,
    compare: <><path d="M4 7h16M4 17h16M8 3 4 7l4 4M16 13l4 4-4 4" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5" /></>,
    logout: <><path d="M9 4H4v16h5M10 12h11M17 8l4 4-4 4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.document}</svg>;
}

function Brand({ href }) {
  return <a className="brand" href={href}>
    <span className="brand-mark"><Icon name="briefcase" size={21} /></span>
    <span>Resume Analyzer<small>&amp; Job Matcher</small></span>
  </a>;
}

function Header({ username, page, onLogout, signingOut }) {
  return <header className={username ? 'topbar signed-in' : 'topbar'}>
    <div className="bar">
      <Brand href={username ? '#workspace' : '/'} />
      {username && <>
        <nav className="page-nav" aria-label="Main navigation">
          {pages.map(([id, label]) => <a key={id} href={'#' + id}
            aria-current={page === id ? 'page' : undefined}>
            <Icon name={id} size={19} /><span>{label}</span>
          </a>)}
        </nav>
        <div className="account-controls">
          <span className="avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
          <div className="account-details"><span className="account-name">{username}</span>
            <button className="account-button" type="button" onClick={onLogout} disabled={signingOut}>
              <Icon name="logout" size={15} />{signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </>}
    </div>
  </header>;
}

function PanelHeading({ icon, title }) {
  return <div className="panel-heading">
    <span className="panel-icon"><Icon name={icon} size={18} /></span>
    <h2>{title}</h2>
  </div>;
}

function EmptyState({ icon, title, children, action }) {
  return <div className="empty">
    <span className="empty-icon"><Icon name={icon} size={26} /></span>
    <h3>{title}</h3>
    <p>{children}</p>
    {action}
  </div>;
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
      const session = await request(register ? '/register' : '/login', form);
      onSuccess(session.username);
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-layout" aria-labelledby="auth-heading">
      <div className="auth-intro">
        <h1>See where your<br className="wide-break" /> skills <em>fit.</em></h1>
        <p>Compare your resume with a job description to see what matches and where you can improve.</p>
        <div className="auth-features">
          <div><Icon name="document" /><p><strong>Bring your resume</strong><span>Upload a PDF or DOCX, or paste your text.</span></p></div>
          <div><Icon name="compare" /><p><strong>Compare the requirements</strong><span>See your score, matched skills and skill gaps.</span></p></div>
          <div><Icon name="history" /><p><strong>Keep track of your comparisons</strong><span>Review history and export readable reports.</span></p></div>
        </div>
      </div>
      <div className="auth-form-area">
        <form className="auth-panel" onSubmit={submit} key={register ? 'register' : 'login'}>
          <h2 id="auth-heading">{register ? 'Create an account' : 'Welcome back'}</h2>
          <p className="auth-description">{register ? 'Create a local account to start comparing resumes.' : 'Sign in to continue to your workspace.'}</p>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'} required />
          {register && <p className="status">Use at least 8 characters.</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            {!busy && <Icon name="arrow" size={17} />}
          </button>
          <Status notice={notice} />
          <button type="button" className="account-switch" disabled={busy} onClick={() => {
            setRegister(!register);
            setNotice(null);
          }}>{register ? 'Already registered? Sign in' : 'New here? Create an account'}</button>
        </form>
      </div>
    </section>
  </main>;
}

function PageHeading({ title, children, action }) {
  return <header className="page-heading">
    <div><h1>{title}</h1><p>{children}</p></div>
    {action}
  </header>;
}

function DocumentUpload({ id, loading, disabled, onLoading, onText }) {
  const [notice, setNotice] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  async function upload(file) {
    if (!file || loading || disabled) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(extension) || file.size > 5 * 1024 * 1024) {
      fileInput.current.value = '';
      setNotice({ message: 'Choose a PDF or DOCX file up to 5 MB.', error: true });
      return;
    }
    onLoading(true);
    setNotice({ message: 'Reading ' + file.name + '…', busy: true });
    try {
      onText(await request('/extract?' + extension, file));
      setNotice({ message: 'Imported ' + file.name + '. Review the fields before continuing.' });
    } catch (error) {
      if (fileInput.current) fileInput.current.value = '';
      setNotice({ message: error.message, error: true });
    } finally {
      onLoading(false);
    }
  }

  return <div className={dragging ? 'upload dragging' : 'upload'}
    onDragOver={event => { event.preventDefault(); setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDrop={event => {
      event.preventDefault();
      setDragging(false);
      if (!disabled && !loading) {
        fileInput.current.value = '';
        upload(event.dataTransfer.files[0]);
      }
    }}>
    <label htmlFor={id} className="upload-target">
      <span className="panel-icon"><Icon name="upload" size={18} /></span>
      <span><strong>Choose a file or drop it here</strong><small id={id + '-hint'}>PDF or DOCX · up to 5 MB</small></span>
    </label>
    <input id={id} ref={fileInput} type="file" accept=".pdf,.docx" disabled={loading || disabled}
      aria-describedby={id + '-hint ' + id + '-status'} onChange={event => upload(event.target.files[0])} />
    <Status id={id + '-status'} notice={notice} />
  </div>;
}

function AddJobPage({ jobs, onJobSaved }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [jobDetails, setJobDetails] = useState({});
  const [jobEdits, setJobEdits] = useState({});
  const [uploadKey, setUploadKey] = useState(0);
  const tooLong = description.length > 20000;

  function importJob(text) {
    setDescription(text);
    setJobDetails(detectJobDetails(text));
    setJobEdits(({ title, company }) => ({
      title: title?.trim() ? title : undefined,
      company: company?.trim() ? company : undefined,
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (uploading || saving || tooLong) return;
    const form = event.currentTarget;
    setSaving(true);
    try {
      await request('/jobs', new URLSearchParams(new FormData(form)));
      form.reset();
      setDescription('');
      setJobDetails({});
      setJobEdits({});
      setUploadKey(key => key + 1);
      setNotice({ message: 'Job saved.' });
      try {
        await onJobSaved();
      } catch {
        setNotice({ message: 'Job saved. Reload the page to refresh the job list.', error: true });
      }
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  return <section className="utility-page">
    <PageHeading title="Add a job">Save a job description or list the skills you want to compare.</PageHeading>
    <div className="jobs-layout">
      <form className="panel" onSubmit={save}>
        <PanelHeading icon="jobs" title="Job details" />
        <div className="job-fields">
          <div>
            <label htmlFor="job-title">Job title</label>
            <input id="job-title" name="title" maxLength={120} placeholder="e.g. Frontend Developer" required
              value={jobEdits.title ?? jobDetails.title ?? ''}
              onChange={event => setJobEdits({ ...jobEdits, title: event.target.value })} />
          </div>
          <div>
            <label htmlFor="company">Company</label>
            <input id="company" name="company" maxLength={120} placeholder="Company name" required
              value={jobEdits.company ?? jobDetails.company ?? ''}
              onChange={event => setJobEdits({ ...jobEdits, company: event.target.value })} />
          </div>
        </div>
        <DocumentUpload id="job-file" key={uploadKey} loading={uploading} disabled={saving}
          onLoading={setUploading} onText={importJob} />
        <label htmlFor="description">Job description or required skills</label>
        <textarea id="description" name="description" value={description} onChange={event => setDescription(event.target.value)}
          readOnly={saving || uploading} rows={7} maxLength={20000}
          placeholder="Paste the job description or enter the skills it requires." required />
        {tooLong && <Status notice={{ message: 'Shorten the job description to 20,000 characters before saving.', error: true }} />}
        <div className="job-actions">
          <button className="primary" type="submit" disabled={saving || uploading || tooLong}><Icon name="jobs" size={17} />{saving ? 'Saving…' : 'Save job'}</button>
          <a className="page-link" href="#workspace">Back to workspace</a>
        </div>
        <Status notice={notice} />
      </form>
      <aside className="panel saved-jobs" aria-label="Saved jobs">
        <PanelHeading icon="briefcase" title="Saved jobs" />
        {jobs.length ? <ul>{jobs.map(job => <li key={job.id}>
          <span className="job-icon"><Icon name="briefcase" /></span>
          <div><strong>{job.title}</strong><p>{job.company}</p></div>
        </li>)}</ul> : <EmptyState icon="briefcase" title="No saved jobs yet">Jobs you save appear here and in the comparison menu.</EmptyState>}
      </aside>
    </div>
  </section>;
}

function Tags({ skills, variant = '' }) {
  return skills.length
    ? <div className="tags">{skills.map(skill => <span className={'tag ' + variant} key={skill}>{skill}</span>)}</div>
    : <span className="muted">None</span>;
}

function MatchCard({ match, resumeId }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function saveReport() {
    setSaving(true);
    try {
      const message = await request('/report', new URLSearchParams({
        saved: resumeId,
        job: match.jobId,
        report: match.report,
      }));
      setNotice({ message });
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([match.report], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'match-report.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <article className="result-card">
    <div className="result-title">
      <div><h3>{match.title}</h3><p>{match.company}</p></div>
      <strong>{match.score}</strong>
    </div>
    {match.progress >= 0 && <progress max={100} value={match.progress} aria-label="Match percentage" />}
    <p className="calculation">{match.progress < 0 ? 'No recognizable required skills.'
      : match.matched.length + ' of ' + match.requiredCount + ' required skills matched'}</p>
    <p className="calculation"><strong>Application suggestion</strong> {match.recommendation}</p>
    <div className="skill-groups">
      <div><h4>Matched skills</h4><Tags skills={match.matched} variant="matched" /></div>
      <div><h4>Missing skills</h4><Tags skills={match.missing} variant="missing" /></div>
    </div>
    <div className="report-actions">
      <button type="button" className="download" onClick={saveReport} disabled={saving}>
        {resumeId ? 'Append to resume report' : 'Save report to folder'}
      </button>
      <button type="button" className="download" onClick={downloadReport}><Icon name="download" size={15} />Download a copy</button>
      <Status notice={notice} />
    </div>
  </article>;
}

function Results({ data, revision, resultRef }) {
  return <section className="panel results" aria-label="Match results" aria-live="polite" ref={resultRef}>
    <PanelHeading icon="compare" title="Match results" />
    {data ? <>
      <div className="results-head">
        <div><h3>{data.name}</h3>{data.resumeId > 0 && <p>Saved resume #{data.resumeId}</p>}</div>
        <span className="count-label">{data.matches.length} {data.matches.length === 1 ? 'match' : 'matches'}</span>
      </div>
      <div className="detected"><h3>Skills found in resume</h3><Tags skills={data.skills} /></div>
      {data.matches.map(match => <MatchCard key={revision + ':' + match.jobId} match={match} resumeId={data.resumeId} />)}
    </> : <EmptyState icon="compare" title="No comparison yet">
      Choose a resume and a job to see your score, matched skills, and skill gaps.
    </EmptyState>}
  </section>;
}

function MatchHistoryPage({ revision }) {
  const [entries, setEntries] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    request('/history').then(data => {
      if (active) {
        setEntries(data);
        setNotice(null);
      }
    }).catch(error => {
      if (active) setNotice({ message: error.message, error: true });
    });
    return () => { active = false; };
  }, [revision]);

  return <section>
    <PageHeading title="Match history">Review your recent comparisons and matching scores.</PageHeading>
    <div className="panel history-list" aria-live="polite">
      <PanelHeading icon="history" title="Recent comparisons" />
      {notice ? <Status notice={notice} /> : entries === null ? <Status notice={{ message: 'Loading history…', busy: true }} />
        : entries.length === 0 ? <EmptyState icon="history" title="No comparisons saved yet"
          action={<a className="secondary" href="#workspace">Compare a resume <Icon name="arrow" size={16} /></a>}>
          Your comparisons appear here after you run a match.
        </EmptyState>
          : entries.map(entry => <article className="history-entry" key={entry}>
            <span className="history-icon"><Icon name="history" /></span>
            <div><p className="history-summary">{entry.split('\n')[0]}</p>
              <p className="history-skills">{entry.split('\n').slice(1).join('\n')}</p></div>
          </article>)}
    </div>
  </section>;
}

function Workspace({ username, onLogout, signingOut }) {
  const [workspace, setWorkspace] = useState(null);
  const [saved, setSaved] = useState('');
  const [job, setJob] = useState('');
  const [text, setText] = useState('');
  const [detectedName, setDetectedName] = useState('');
  const [nameEdit, setNameEdit] = useState(null);
  const [saveResume, setSaveResume] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ message: 'Loading saved jobs and resumes…', busy: true });
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(currentPage);
  const resultRef = useRef(null);

  function importResume(resumeText) {
    setText(resumeText);
    setDetectedName(detectCandidateName(resumeText));
    setNameEdit(name => name?.trim() ? name : null);
  }

  async function refreshWorkspace() {
    const next = await request('/workspace');
    setWorkspace(next);
    setSaved(id => next.resumes.some(resume => String(resume.id) === id) ? id : '');
    setJob(id => next.jobs.some(item => String(item.id) === id) ? id : '');
  }

  useEffect(() => {
    refreshWorkspace().then(() => setNotice(null))
      .catch(error => setNotice({ message: error.message, error: true }));
  }, []);

  useEffect(() => {
    const navigate = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    if (revision && window.matchMedia('(max-width: 760px)').matches) {
      resultRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [revision]);

  async function compare(event) {
    event.preventDefault();
    if (!workspace || busy || uploading) return;
    if (workspace.jobs.length === 0) {
      setNotice({ message: 'Add a job before comparing your resume.', error: true });
      return;
    }
    const form = new URLSearchParams(new FormData(event.currentTarget));
    setBusy(true);
    setNotice({ message: 'Comparing skills…', busy: true });
    try {
      const result = await request('/match', form);
      setData(result);
      setRevision(previous => previous + 1);
      const count = result.matches.length;
      setNotice({ message: count === 1 ? '1 match added to history.' : count + ' matches added to history.' });
      if (form.get('save') && !form.get('saved')) {
        setSaveResume(false);
        try {
          await refreshWorkspace();
          setSaved(String(result.resumeId));
        } catch {
          setNotice({ message: 'Match and resume saved. Reload the page to refresh the saved list.', error: true });
        }
      }
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header username={username} page={page}
      onLogout={onLogout} signingOut={signingOut} />
    <main className="layout app-main">
      <div hidden={page !== 'workspace'}>
        <PageHeading title="Compare your resume"
          action={<a className="secondary" href="#jobs"><Icon name="jobs" size={17} /> Add a job</a>}>
          Upload your resume or paste its text to find matching jobs and discover missing skills.
        </PageHeading>
        <section aria-label="Matching workspace" className="workspace">
          <form className="panel" onSubmit={compare}>
            <PanelHeading icon="document" title="Comparison setup" />
            <div className="compare-fields">
              <div>
                <label htmlFor="saved">Resume to use</label>
                <select id="saved" name="saved" value={saved} disabled={busy || uploading}
                  onChange={event => setSaved(event.target.value)}>
                  <option value="">New resume</option>
                  {workspace?.resumes.map(resume =>
                    <option value={resume.id} key={resume.id}>{resume.name} · #{resume.id}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="job">Job to compare</label>
                <select id="job" name="job" value={job} onChange={event => setJob(event.target.value)} disabled={busy}>
                  <option value="">Rank all saved jobs</option>
                  {workspace?.jobs.map(item =>
                    <option value={item.id} key={item.id}>{item.title} · {item.company}</option>)}
                </select>
              </div>
            </div>
            {workspace?.jobs.length === 0 && <p className="inline-hint">
              <a href="#jobs">Add a job</a> to run your first comparison.
            </p>}
            <fieldset hidden={Boolean(saved)} disabled={Boolean(saved) || busy}>
              <label htmlFor="name">Candidate name</label>
              <input id="name" name="name" maxLength={120} placeholder="e.g. Ananya Rao" required
                value={nameEdit ?? detectedName} onChange={event => setNameEdit(event.target.value)} />
              <DocumentUpload id="resume-file" loading={uploading} disabled={Boolean(saved) || busy} onLoading={setUploading} onText={importResume} />
              <label htmlFor="resume">Resume text</label>
              <textarea id="resume" name="resume" rows={3} maxLength={100000}
                placeholder="Extracted text appears here. You can also paste it directly."
                value={text} onChange={event => setText(event.target.value)} required />
              <label className="check">
                <input type="checkbox" name="save" value="yes" checked={saveResume}
                  onChange={event => setSaveResume(event.target.checked)} /> Keep this resume for this run
              </label>
            </fieldset>
            <button className="primary" type="submit" disabled={!workspace || busy || uploading}
              formNoValidate={workspace?.jobs.length === 0}>
              <Icon name="compare" size={18} />Compare resume
            </button>
            <Status notice={notice} />
          </form>
          <Results data={data} revision={revision} resultRef={resultRef} />
        </section>
      </div>
      {page === 'jobs' && <AddJobPage jobs={workspace?.jobs ?? []} onJobSaved={async () => {
        await refreshWorkspace();
        if (workspace?.jobs.length === 0) setNotice(null);
      }} />}
      {page === 'history' && <MatchHistoryPage revision={revision} />}
    </main>
  </>;
}

function App() {
  const [username, setUsername] = useState(null);
  const [notice, setNotice] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function sessionEnded() {
      setUsername('');
      setNotice({ message: 'Your session ended. Sign in to continue.' });
    }
    window.addEventListener('session-ended', sessionEnded);
    request('/session').then(session => setUsername(session.username)).catch(error => {
      setNotice({ message: error.message, error: true });
      setUsername('');
    });
    return () => window.removeEventListener('session-ended', sessionEnded);
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await request('/logout', new URLSearchParams());
      setUsername('');
      setNotice(null);
    } catch (error) {
      setNotice({ message: error.message, error: true });
    } finally {
      setSigningOut(false);
    }
  }

  if (username) {
    return <>
      <Workspace username={username} onLogout={signOut} signingOut={signingOut} />
      {notice && <div className="layout"><Status notice={notice} /></div>}
    </>;
  }
  return <div className="auth-shell">
    <Header />
    {notice && <div className="layout"><Status notice={notice} /></div>}
    {username === null ? <div className="layout session-status"><Status notice={{ message: 'Checking your session…', busy: true }} /></div>
      : <SignIn onSuccess={name => { setNotice(null); setUsername(name); }} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
