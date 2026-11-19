import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

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

function Briefcase() {
  return <span className="briefcase" aria-hidden="true" />;
}

function Header({ username, page, onLogout, signingOut }) {
  return (
    <header className="topbar">
      <div className="layout bar">
        <a className="brand" href={username ? '#workspace' : '/'}><span className="brand-mark"><Briefcase /></span>
          <span>Resume Analyzer &amp; Job Matcher</span>
        </a>
        {username && <>
          <nav className="page-nav" aria-label="Main navigation">
            {pages.map(([id, label]) => <a key={id} href={'#' + id}
              aria-current={page === id ? 'page' : undefined}>{label}</a>)}
          </nav>
          <div className="account-controls">
            <span className="account-name">{username}</span>
            <button className="account-button" type="button" onClick={onLogout} disabled={signingOut}>Sign out</button>
          </div>
        </>}
      </div>
    </header>
  );
}

function SignIn({ onSuccess }) {
  const [register, setRegister] = useState(false);
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
        <DocumentArt />
        <h1>Resume Analyzer <em>&amp; Job Matcher</em></h1>
        <p>Upload a PDF or DOCX to compare your skills with job requirements and see what’s missing.</p>
      </div>
      <div className="auth-form-area">
        <form className="auth-panel" onSubmit={submit} key={register ? 'register' : 'login'}>
          <h2 id="auth-heading">{register ? 'Create an account' : 'Sign in'}</h2>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'} required />
          {register && <p className="status">Use at least 8 characters. Accounts share this temporary workspace.</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
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

function DocumentArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="paper back"></div>
    <div className="paper front"><span></span><span></span><span></span><span></span></div>
    <div className="seal">✓</div>
  </div>;
}

function PageHeading({ title, children }) {
  return <header className="page-heading">
    <h1>{title}</h1>
    <p>{children}</p>
  </header>;
}

function ResumeUpload({ loading, disabled, onLoading, onText }) {
  const [notice, setNotice] = useState({ message: 'Drop a file here or browse · up to 5 MB' });
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
    setNotice({ message: 'Reading ' + file.name + '…' });
    try {
      onText(await request('/extract?' + extension, file));
      setNotice({ message: 'Text extracted from ' + file.name + '. Review it below.' });
    } catch (error) {
      fileInput.current.value = '';
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
    <label htmlFor="resume-file">Upload PDF or DOCX</label>
    <input id="resume-file" ref={fileInput} type="file" accept=".pdf,.docx" disabled={loading}
      aria-describedby="upload-status" onChange={event => upload(event.target.files[0])} />
    <Status id="upload-status" notice={notice} />
  </div>;
}

function AddJobPage({ jobs, onJobSaved }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    try {
      await request('/jobs', new URLSearchParams(new FormData(form)));
      form.reset();
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
        <div className="job-fields">
          <div>
            <label htmlFor="job-title">Job title</label>
            <input id="job-title" name="title" maxLength={120} required />
          </div>
          <div>
            <label htmlFor="company">Company</label>
            <input id="company" name="company" maxLength={120} required />
          </div>
        </div>
        <label htmlFor="description">Job description or required skills</label>
        <textarea id="description" name="description" rows={6} maxLength={20000} required />
        <div className="job-actions">
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save job'}</button>
          <a className="page-link" href="#workspace">Back to workspace</a>
        </div>
        <Status notice={notice} />
      </form>
      <aside className="panel saved-jobs" aria-label="Saved jobs">
        <h2>Saved jobs</h2>
        {jobs.length ? <ul>{jobs.map(job => <li key={job.id}>
          <span className="job-icon"><Briefcase /></span>
          <div><strong>{job.title}</strong><p>{job.company}</p></div>
        </li>)}</ul> : <p className="muted">Your saved jobs will appear here.</p>}
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
    <div className="skill-groups">
      <div><h4>Matched skills</h4><Tags skills={match.matched} variant="matched" /></div>
      <div><h4>Missing skills</h4><Tags skills={match.missing} variant="missing" /></div>
    </div>
    <div className="report-actions">
      <button type="button" className="download" onClick={saveReport} disabled={saving}>
        {resumeId ? 'Append to resume report' : 'Save report to folder'}
      </button>
      <button type="button" className="download" onClick={downloadReport}>Download a copy</button>
      <Status notice={notice} />
    </div>
  </article>;
}

function Results({ data, revision, resultRef }) {
  return <section className="panel results" aria-label="Match results" aria-live="polite" ref={resultRef}>
    <h2>Match results</h2>
    {data ? <>
      <div className="results-head">
        <p>{data.name}{data.resumeId > 0 && ' · Saved resume #' + data.resumeId}</p>
      </div>
      <div className="detected"><h3>Skills found in resume</h3><Tags skills={data.skills} /></div>
      {data.matches.map(match => <MatchCard key={revision + ':' + match.jobId} match={match} resumeId={data.resumeId} />)}
    </> : <div className="empty">
      <span className="empty-icon"><Briefcase /></span><p>Your scores and skill gaps will appear here.</p>
    </div>}
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
    <PageHeading title="Match history">Comparisons from this backend run, newest first. Times are in IST.</PageHeading>
    <div className="panel history-list" aria-live="polite">
      {notice ? <Status notice={notice} /> : entries === null ? <p className="muted">Loading history…</p>
        : entries.length === 0 ? <p className="muted">No matches saved yet.</p>
          : entries.map(entry => <p className="history-entry" key={entry}>{entry}</p>)}
    </div>
  </section>;
}

function Workspace({ username, onLogout, signingOut }) {
  const [workspace, setWorkspace] = useState(null);
  const [saved, setSaved] = useState('');
  const [job, setJob] = useState('');
  const [text, setText] = useState('');
  const [saveResume, setSaveResume] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ message: 'Loading saved jobs and resumes…' });
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(currentPage);
  const resultRef = useRef(null);

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

  async function compare(event) {
    event.preventDefault();
    if (!workspace || busy || uploading) return;
    const form = new URLSearchParams(new FormData(event.currentTarget));
    setBusy(true);
    setNotice({ message: 'Comparing skills…' });
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
      if (window.matchMedia('(max-width: 760px)').matches) {
        resultRef.current?.scrollIntoView({ block: 'start' });
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
        <PageHeading title="Compare your resume">
          Upload your resume or paste its text to find matching jobs and discover missing skills.
        </PageHeading>
        <section aria-label="Matching workspace" className="workspace">
          <form className="panel" onSubmit={compare}>
            <h2>Resume</h2>
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
            <fieldset hidden={Boolean(saved)} disabled={Boolean(saved) || busy}>
              <div className="compare-fields resume-inputs">
                <div>
                  <label htmlFor="name">Candidate name</label>
                  <input id="name" name="name" maxLength={120} placeholder="e.g. Ananya Rao" required />
                </div>
                <ResumeUpload loading={uploading} disabled={Boolean(saved) || busy} onLoading={setUploading} onText={setText} />
              </div>
              <label htmlFor="resume">Resume text</label>
              <textarea id="resume" name="resume" rows={3} maxLength={100000}
                placeholder="Extracted text appears here. You can also paste it directly."
                value={text} onChange={event => setText(event.target.value)} required />
              <label className="check">
                <input type="checkbox" name="save" value="yes" checked={saveResume}
                  onChange={event => setSaveResume(event.target.checked)} /> Keep this resume for this run
              </label>
            </fieldset>
            <button className="primary" type="submit" disabled={!workspace || busy || uploading}>
              Compare resume <span aria-hidden="true">→</span>
            </button>
            <Status notice={notice} />
          </form>
          <Results data={data} revision={revision} resultRef={resultRef} />
        </section>
      </div>
      {page === 'jobs' && <AddJobPage jobs={workspace?.jobs ?? []} onJobSaved={refreshWorkspace} />}
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
      setNotice({ message: 'Signed out.' });
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
  return <>
    <Header />
    {notice && <div className="layout"><Status notice={notice} /></div>}
    {username === null ? <div className="layout"><Status notice={{ message: 'Checking your session…' }} /></div>
      : <SignIn onSuccess={name => { setNotice(null); setUsername(name); }} />}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);