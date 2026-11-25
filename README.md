# Smart Resume Analyzer

Smart Resume Analyzer compares a resume with one or more job descriptions and shows which required skills match and which are missing. It runs locally as a React web app with a Java backend.

## Features

- Paste resume text or import a text-based PDF or DOCX file in the web app.
- Add job descriptions or required skills, save resumes for reuse, and compare against one job or rank all saved jobs.
- See matched and missing skills, a match percentage, and a timestamped match history. The score is `matched skills ÷ recognized required skills × 100`, or `N/A` when no required skills are recognized.
- Register and sign in to the local web workspace, then download a `.txt` report or save it to `reports/`.

## Architecture

| Component | Responsibility |
| --- | --- |
| React frontend (`web/`) | Provides the resume upload, job entry, comparison, and history screens. esbuild bundles the frontend. |
| Java entry point (`src/WebMain.java`) | `WebMain` uses the JDK HTTP server to serve the frontend and handle API requests. |
| Analysis (`ResumeFileReader`, `SkillExtractor`, `Matcher`) | Extracts PDF text with Apache PDFBox and reads DOCX text from its Word XML. Finds skills using a predefined keyword list, then scores and ranks matches. |
| Data and reports (`LoginService`, `MemoryStore`, `ReportManager`) | Handles web sign-in and stores accounts, sessions, resumes, jobs, and history in memory. Restarting clears this data. Exported reports remain on disk. |

## Run locally

Requires **JDK 17 or later** and **Node.js 18 or later** with npm.

```sh
git clone https://github.com/Tejus6309/Smart-Resume-Analyzer.git
cd Smart-Resume-Analyzer
npm ci
npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080), register, and add a job before comparing a resume. Run `npm test` to build the frontend and run the verification suite.
