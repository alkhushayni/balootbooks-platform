# 📐 BALOOTBOOKS ARCHITECTURAL BLUEPRINT
### Project Profile: Full-Scale Commercial zyBooks Alternative

---

## 🚫 1. Claude Code Optimization Layer (Token Prevention Shield)
To optimize local command-line agent billing and completely avoid rapid token context window depletion during automated engineering execution loops, the repository configures explicit directory exclusions before any backend structures are instantiated.
*   **Asset Ignorance Directives:** A strict `.gitignore` and `.claudecodeignore` configuration file must be stored in the root project directory upon initialization.
*   **The Blacklist Blueprint:** These files explicitly mandate that the AI terminal tools bypass mapping or reading heavy build footprints and local dependency nests:
    ```text
    node_modules/
    .next/
    dist/
    build/
    *.mp4
    *.png
    *.jpg
    package-lock.json
    poetry.lock
    ```

---

## 👥 2. The 5 User Roles & Permission Hierarchies
The database configuration enforces a strict security hierarchy across 5 distinct user profiles to segregate admin capabilities, professor analytics, and consumer billing tiers.
*   **Super Admin (The Founder's Master Key):** Sits at the absolute apex of the hierarchy. Holds absolute data sovereignty. This account manages a **Roles & Privileges Dashboard** featuring simple checkbox toggles to dynamically customize, grant, or revoke permission flags for any user group or individual. Receives global system notifications, including new course adoption logs.
*   **Platform Admin (Operations Support):** Operates under privileges assigned by the Super Admin. Accesses the hidden *Admin/Creator Portal* to prompt the AI Factory, reviews the global course catalog, and approves or denies instructor textbook adoption requests.
*   **Instructor (The Professor):** Can register via a specialized onboarding funnel or request an account upgrade. Upon admin authorization of their credential verification data, they gain an isolated workspace variant of the curriculum, manage a unique **Structured Class Join Code**, view class analytics, modify their custom course structure, configure graded assignments linked to custom due dates, apply student deadline exceptions, view hidden solution keys, and export localized grading records.
*   **Institutional Student:** Accesses the course by entering their professor's **Structured Class Join Code via a three-step enrollment funnel**. Enforces a zero-visibility policy on peer progress data. Their performance logs route directly into their specific instructor's gradebook grid.
*   **Independent Student (Direct B2C Consumer):** Bypasses the classroom setup entirely. Purchases a course directly via a credit card payment portal (Stripe), and views metrics on a private personal dashboard.

---

## 📦 3. Isolated Adaptive Inheritance Database Workflow
To accommodate customization without text duplication or cross-tenant leaks, the data architecture splits static master definitions from instructor modifications using structural lookup schemas.
*   **The Global Core Catalogue:** Base courses are saved in an immutable, system-owned set of tables (`courses`, `chapters`, `sections`). Instructors cannot mutate these master rows.
*   **Virtual Workspace Branching:** When an adoption request is finalized, the system records an entry inside an `instructor_courses` map table. Rather than copying megabytes of text data, it instantiates a customized layout list for that specific class ID:
    *   *Custom Reordering & Sorting:* Instructors can freely drag, drop, and rearrange chapters or sections. The system handles this via a local `display_order` weight mapping array inside their class workspace record without altering the global catalog template.
    *   *Syllabus Extension Capabilities:* Instructors can click a **"Create section"** utility button located directly underneath the chapter accordion blocks to introduce brand-new custom sections. These extensions are flagged in the database with an ownership link `created_by_instructor_id`. They remain completely isolated and invisible to Instructor B or new catalog adoptions, ensuring the base template remains clean.

---

## 🔒 4. Strict Core Isolation & Multi-Tenant Security Grid
To maintain bulletproof multi-tenant separation across all concurrent university networks, the database architecture enforces immutable boundaries between users and text layouts:
*   **Peer-to-Peer Perimeter Shield (Student A vs. Student B):** Supabase application layers invoke deep PostgreSQL Row-Level Security (RLS) conditions matching `USING (auth.uid() = user_id)`. Standard student logins are systematically blocked from intercepting, reading, or mapping score rows, profiles, identifiers, or activity inputs belonging to any other user session on the platform.
*   **Faculty Cross-Tenant Insulation (Instructor A vs. Instructor B):** Modification rows, appended sections, and custom assignment lists carry a strict multi-tenant conditional flag (`class_id`). Queries from Instructor B's workspace selectively parse records pointing exclusively to their authorized cohort identifier. This keeps all grading dashboards, customized syllabi, and appended blocks fully insulated between different faculty environments.
*   **Catalog Template Protection:** The core content records stored inside the global tables (`courses`, `chapters`, `sections`) are walled off via master database permission settings. Normal instructor accounts possess read-only rights to pull content blocks via inheritance arrays. They cannot perform `UPDATE`, `INSERT`, or `DELETE` string actions against catalog masters, ensuring the base materials remain completely pristine for new adoptions.

---

## 🎨 5. Manual / Semi-Automated Canvas Authoring Engine
When an administrator or an instructor manually adds a block of content to a section, the WYSIWYG editor framework makes building complex interactive steps clear, fast, and enhanced by smart automation.
*   **The Extended Toolkit Side-Panel:** Instructors can click an **"Add content"** menu to inject custom blocks of different element types into the active canvas stack. The system supports stacking: `text_block`, `table`, `code_editor`, `multiple_choice`, `short_answer`, `image`, `video`, `code_block`, and `animation_block`.
*   **The Semi-Automated Animation Wizard:** Creating an interactive animation manually is simplified through a modular frame builder layout: Base Asset Upload ➔ Automated Timeline Cloner ➔ Synchronized Captions.

---

## 🤖 6. Automated AI Generation Architecture (The Learning Loop Pipeline)
When an admin triggers the multi-agent pipeline to generate a section from a text prompt, the AI Content Engine follows a strict, non-negotiable sequential block generation order to assemble the page from A to Z: Text ➔ Animation ➔ Participation Quiz ➔ Repeated Loops ➔ Final Challenge Activity.
*   **The AI Content Script Constraint:** The AI orchestrator commands the underlying models to generate content iteratively down the canvas: The agent outputs a foundational `text_block`, feeds that written prose into the Animation model to build a matching `animation_block`, and constructs a `quiz_block` (Participation Activity) specifically testing the concepts presented in that animation. The loop compounds for deep topics.

---

## 🛢️ 7. Twin-Pane On-Demand Virtual Laboratory Engine (BalootLabs)
When a student triggers a section marked as a `LAB` component from their table of contents tree, the browser mounts an asynchronous dual-pane workspace splitting instructional constraints from active sandbox runtimes.
*   **The UI Splitting Component Grid:** Incorporates a resizable vertical split pane separator. Left Workspace Column renders structured layouts mapping out the `Introduction` overview text, explicit bulleted `Learning Objectives`, target machine `Devices`, and an ordered list of `Tasks`. Right Workspace Column mounts an adaptive iframe or terminal matrix element displaying a contextual top utility header and a execution button labeled **"Connect to VMs"**.
*   **The On-Demand Computing Architecture:** To maintain a completely free tier core footprint, the application bypasses running live, heavy virtual servers. Clicking the connect link calls a serverless web proxy layer. This triggers a temporary container shell session inside our network-restricted **AWS Lambda Layer**, mapping input inputs against hidden evaluation shell test files and checking grading metrics cleanly without infrastructure overhead.
*   **The "AIGrade" Structural Plagiarism Detector Guardrail:** The container runs an internal Abstract Syntax Tree (AST) parser and code string structure hashing algorithm. If a submission matches previous entries inside that class's database index, the system flags the student's entry as a suspected duplicate on the instructor's gradebook dashboard instantly.

---

## 🎬 8. Poly-Engine Animation Parsing Architecture
To seamlessly scale course creation across completely different academic domains while maintaining a strict **$0/month server hosting footprint**, the platform utilizes four explicit, data-driven execution templates inside a unified `animation_block` schema: `CODE_TRACE`, `VECTOR_MORPH`, `MATH_EQUATION`, and `STATE_BLOCKS`.
*   **The Unified Player Wrapper UI Component:** Regardless of which engine template is passed, the client wraps the block inside a standard player shell featuring a universal seeker-slider, frame counters (`1 / 4`), a collapsible **"Captions"** description drawer, and a localized **"2x speed"** checkbox tool.

Time-Travel Local Debugging Interface: To provide a superior learning mechanism over older tools, the media console embeds two bidirectional action triggers: "Next" (Forward Frame) and "Back" (Previous Frame). Because all animation timelines are parsed as standard local text arrays, clicking "Back" decrements the active frame index pointer locally, enabling students to instantly rewind animations without calling your backend database servers.

📱 9. Student Active Section Interface & Learning ViewWhen a user targets a chapter section node for study, the interface resolves into a clean vertical content ledger optimized for text readability and client-side interaction monitoring.

The Administrative Context Overlay Header: If an instructor session opens the reading page, an box registers at the top node. It explicitly outputs active assignment mappings (e.g., Section 1.1 is part of 2 assignments: assignment 20), exact closing deadlines (Due: 09/30/2026 11:59 PM CDT), and target grading category weights (Activities: Participation).

The Pedagogical Milestone Summary Box: Houses a dedicated high-contrast module wrapper titled "Learn to" preceding core concept strings, indexing learning objectives in clear bullet fragments to focus comprehension.

The Global Activity Completion Badges: Every standalone block item maps an active confirmation validation asset container on the right side of its header node. When the frontend logic registers completion rules have been successfully satisfied, the block box applies a green state transition and activates a checkmark layout block, validating score compilation metrics in the database.

🎬 10. Browser-Timed Step-Animation EngineThe platform visualizes conceptual models through a serverless, local playback frame component that processes step-by-step graphical changes completely client-side.

The Synchronized Caption Accordion Drawer: Renders a collapsible chevron details block labeled "Captions" directly underneath the vector image viewport stage. The component runs an active frame index pointer that matches the graphic frame state, automatically highlighting the precise text description caption string tracking that frame state while hiding inactive string rows.


## 🤖 11. Context-Aware Student AI Study Buddy Component
To provide real-time academic assistance directly on the reading page without creating uncapped operational cost liabilities, the UI mounts an isolated slide-out conversation assistant.
*   **The Retrieval-Augmented Security Perimeter (Bounded RAG):** When a student submits a text query, the frontend payload interceptor automatically couples the question to the `Markdown_content` schema payload of the active section row. The backend passes this combined payload to the Anthropic API, strictly forbidding the model from answering questions outside the bounding data frame.
*   **Token Protection & Quota Thresholds:** The database enforces a user schema tracker counter (`monthly_ai_queries`). If a student's session breaches their account tier limit (e.g., maximum 50 questions/month), the chat input box locks automatically, displays a custom quota notification, and blocks outbound API calls to secure your platform budget.

---

## 🏆 12. Adaptive Parameter-Swapping Challenge Activity Block
Positioned as the definitive final checkpoint of a textbook section, the Challenge Activity enforces rigorous criteria for student mastery before grading marks are issued.
*   **The Master Evaluation Layout:** Features specialized matching drop-down controls (`Pick` string nodes) or short numeric input blocks mapped directly across multi-part questions tracking sequence nodes (e.g., Step `1 / 2`).
*   **The Rules & State Interceptor:** Students receive **0 points unless they achieve a 100% correct score** across all steps. If any drop-down query evaluates to `Incorrect` upon clicking **"Check"**, the client-side state engine intercepts the failure event, logs the attempt counter, blocks point distribution, and **instantly swaps the text strings out for a brand-new randomized scenario variant** fetched from the database array pool, resetting the step sequence.
*   **The Secure Instructor Solution Gate:** Implements an inline hidden toggle drawer labeled **"View solution (Instructors only)"**. The component queries Supabase user metadata flags upon layout compilation. If a student session accesses the page, the component is systematically removed from the DOM layer to prevent inspection exploits.
*   **Instructor Evaluation Tools:** When a verified instructor session is validated, clicking the toggle drawer unlocks the absolute keys row (`Expected: Mesh, Hybrid, Bus`) and separate technical explanation sentence blocks.

---

## 🖥️ 13. Instructor "My Library" Dashboard Architecture
When a verified or pending instructor authenticates into the application, their dashboard rendering breaks down into a two-tier logical interface tracking active teaching instances from evaluation sandboxes.
*   **Tier 1: Active Class Dashboard Row:** Houses the textbooks currently being taught in the active academic term. Cards dynamically render identifying metadata pulled from the database relationships: `Instructor Full Name`, `University Course ID & Section Title` (e.g., *CIS 462: Web Application Development*), and the `Active Term Token` (e.g., *Summer 2026*). Injects prominent primary action buttons overlaid on the card design layout: **"Add a section"** or **"Begin Adoption"**.
*   **Tier 2: Evaluation & Archive Grid Matrix:** Displays a clean multi-column card system mapping books currently flagged for review alongside deactivated archived records from previous university semesters. This keeps their current semester clean while retaining lifetime grading records for legacy courses.

---

## 📖 14. Active Course Management Dashboard Layout
When an approved instructor opens an active textbook workspace instance from their dashboard, the interface renders a structured workspace hub tailored for swift classroom orchestration.
*   **The Main Curriculum Ledger (Left Column):** Renders the full structural outline of the textbook. Displays expandable accordion elements for chapters and subsections. Items appended or updated after the base generation sequence display high-visibility tags labeled **"New Content"**, notifying the teaching staff of curriculum expansions.
*   **The Floating Telemetry & Resources Card (Right Column):** A high-contrast control block tracking administrative workflows. Incorporates top-level click anchors routing directly to module utilities: **Welcome**, **My class**, **Reporting**, **Assignments**, and **Tests**. Mounts text information grids housing instant-access actions: **"View instructions"** and **"Browse resources"**.

---

## 🔀 15. LTI LMS Integration Gate & Clipboard Copy Engine
The platform manages institutional onboarding through a specialized interactive modal setup that handles external LMS connectivity.
*   **The Integration Checkpoint Dialog:** Activating "View instructions" overlays an animated decision window. It explicitly prompts the user to declare their learning management infrastructure: **"Yes, I'll link an LMS"** (Canvas, Blackboard, Moodle) or **"No, I'm not sure yet"**.
*   **The Text Template Generation Engine:** Based on the instructor's selection, the system evaluates class meta-parameters from Supabase (calculating pricing data like *"$97"* and exact registration lifespan deadlines) and generates a clean onboarding description block.
*   **The Async Clipboard Component:** Mounts a primary action button labeled **"Copy Instructions to clipboard"**. Activating this executes a secure JavaScript clipboard hook (`navigator.clipboard.writeText`) that instantly loads the instruction set into the user's desktop memory buffers and triggers a visual validation notification.

---

## 🛠️ 16. Classroom Management Console & Security Guardrails
Clicking the "My class" utility button opens an administrative dashboard layout allowing instructors to configure security perimeters, roster boundaries, and system time rules.
*   **The Restricted Domain Validator:** Features an onboarding row to add specific email filters (e.g., `university.edu`). The authentication backend uses this lookup index to block signups from external personal accounts like hotmail or gmail. It supports exact matching for university subdomains (e.g., `student.university.edu`).
*   **Roster & Status Control Framework:** Toggles a boolean database rule requiring students to supply an official institutional identification number during registration. A configuration switch locks students into their initial chosen classroom section, blocking them from jumping between different branches mid-term. Provides an interface tool to drop students to remove them from section grading averages.
*   **The Global Time Zone Anchor:** Features an interface dropdown menu setting a fixed time zone for the entire class instance (e.g., CDT). All assignment deadlines and analytics logging timestamps calculate against this chosen anchor rather than the student's local machine time.

---

## 📊 17. Cumulative Class Gradebook Telemetry & Local Export Engine
Clicking the "Reporting" navigation icon switches the layout grid to a multi-metric cohort analytics dashboard tracking L, C, and P completion percentages.
*   **The Tri-Metrics Completion Ledger (L, C, P Mapping):** Displays a master row-level breakdown for every textbook section, tracking cohort completion averages mapped across three distinct instructional telemetry values: L (Lab Performance Tracking), C (Challenge Activity Metrics), and P (Participation Interaction Levels).
*   **Asynchronous Date Range Boundary Filters:** The dashboard houses floating date input components (`From` / `Until`). Setting these parameters filters the grading records, calculating student scores up to a specific millisecond timestamp to give instructors a snapshot of student progress at any point in the semester.
*   **Local Data Compilation Engine (.CSV Export Utility):** To save massive server resources, the reporting console integrates a frontend spreadsheet compiler button. Clicking **"Download Gradebook"** triggers a localized browser script that reads the active Supabase data cache, converts the JSON matrices into an optimized Excel/Canvas-compatible CSV format, and triggers an instant browser download directly on the professor's computer at **$0/month system overhead compute costs**.

---

## 📅 18. Student Dashboard Layout & Deadlines Portal
When an institutional student opens their course book dashboard, a floating right-hand context module acts as a customized **Deadlines & Analytics Portal** reflecting active tasks scheduled by the instructor.
*   **The Assignments Ledger Widget:** Renders a clean vertical stack container categorized by time matrices: Upcoming assignments (e.g., `Assignment 20`) showing exact total point parameters and localized date string deadlines (`Due: 09/30/2026, 11:59 PM CDT`), and past historic tallies.
*   **The Test Notification Matrix:** Houses an expandable alert panel labeled **Tests**. When an instructor activates an exam configuration row, the system pushes the target test notification card straight to the student's view frame, showing testing windows, time frames, and active password inputs.
*   **The Grace Override Interceptor:** If the database `assignment_overrides` lookup index detects a personalized extension token for a specific `User_ID`, the user interface updates dynamically—hiding the default class due date and swapping in their custom individual extension deadline smoothly.

---

## 🎛️ 19. Admin & Super Admin System Control Center
When a platform administrator or super administrator logs in, the standard "My Library" view transitions into an operational command hub split into four distinct lifecycle tabs:

The AI Course Factory Engine Tab: Features a clean text prompt field (e.g., "Generate an advanced textbook on Operating Systems in Rust"). It includes a multi-step loading pipeline canvas that tracks the multi-agent orchestration status in real time: [Syllabus Architect: OK] ➔ [Content Writer: OK] ➔ [Quiz Creator: Generating...]. Clicking "Publish to Catalog" appends the compiled JSON template rows straight to the master global courses table.

The Global Course Catalog & Taxonomy Manager Tab: Houses the full curriculum master table. Administrators can edit text definitions globally, look up courses sorted by the Nested Multi-Tier Category Engine, or inject manual chapter alterations.

The Instructor Verification & Adoption Pipeline Tab: Displays a grid of pending verification profile rows gathered from the signup form.

The Super Admin Privilege Matrix Panel (Super Admin ONLY): Accessible exclusively by your master account. Renders a matrix list of all registered Platform Admins and Support staff. Every entry features row-level checkbox toggles allowing you to grant, adjust, or restrict administrative permissions on the fly without touching code.


📅 20. Granular Assignment Builder & Dual-Tier Deadline SchedulerThe platform houses a scheduling layout engine to bundle content sections into modular assignments with dynamic deadline overrides.

The Bulk Aggregation Selector: Instructors can title an assignment and click checkboxes to add chapters or subsections. It includes master action buttons to quickly select entire categories across a section (e.g., "Select all participation activities" or "Select all labs").

The Dual-Tier Due Date Scheduler: Tier 1 sets a master timestamp closing date applied to the entire class instance by default. Tier 2 integrates an expandable form row letting instructors input a specific student's identifier and assign a unique extended timestamp override.



📝 21. Modular Test & Exam Generation EngineClicking the "Tests" icon maps out an internal assessment layout canvas, allowing instructors to build exams directly from the pre-generated block curriculum.

The Content Pool Filter Matrix: Renders an expandable vertical accordion tree of chapters and modules. Instructors can check specific subsections to compile a custom exercise list.

The Assessment Preview Switch: Houses a persistent toggle button labeled "Show answers". Toggling this updates the layout grid to display the complete solution keys and code grader scripts instantly, helping professors evaluate test items quickly before deployment.

The Test Layout Grid Organizer: Features an interface panel labeled Organize test that allows instructors to drag, drop, reorder, or delete questions to structure the exam format cleanly before exporting.

## 📋 22. Multi-Stage Instructor Textbook Adoption Wizard
When an authorized professor triggers a "Begin Adoption" event from an evaluation textbook layout block, the interface mounts a multi-step modal form architecture backed by a tracking sidebar.
*   **The Milestone Navigation Sidebar (Left-Pane):** Renders dynamic indicator rows managing status tracking updates across five specific deployment steps.
*   **Step 1: Core Template Source Engine:** Provides the instructor with three tab targets to seed the workspace framework: choose from a list of active evaluation modules, clone an instance from a recent semester, or expand a collapsible historical accordion grid (`Older class zyBooks`) to replicate older legacy books.
*   **Step 2: Customization Inheritance Layer:** Features a standalone configuration toggle: **"Transfer assignments"**. Checking this triggers a relational query that copies the instructor's previous chapter sorting parameters and content layout flags straight to their new workspace entry row, bypassing manual reconstruction while wiping out historic student due dates.
*   **Step 3: Class Timeline Boundary Configuration:** Required input fields track metrics necessary for operational calculations (`term_start_date`, `term_end_date`, `expected_number_of_students`, and a syllabus integration weight dropdown focus selector).
*   **Step 4: Shared RLS Co-Instructor Grid:** Provides an expandable array component letting the master user append additional teachers or assistants (`first_name`, `last_name`, `email`) to the workspace roster, automatically extending Postgres RLS reading/grading keys to secondary staff sessions.

---

## 🔐 23. Authentication & Conditional Instructor Onboarding Funnel
The frontend authentication system uses an adaptive two-column layout that captures different user contexts cleanly on account creation.
*   **The Visual Grid Hero Column (Left-Side):** Displays a marketing copy panel outlining value models for student access and cost-free instructor evaluations. Overlays a responsive Tailwind grid that pulls active textbook covers dynamically from the database template library.
*   **The Conditional Registration Form (Right-Side):** Standard text input fields manage Name, Email double-confirmation, and Password rules. Integrates an explicit form toggle switch: **"I am an instructor"**.
    *   *Student Access Path:* If unchecked, the account defaults to a standard student state role and forwards the user to their fresh "My Library" dashboard interface.
    *   *Instructor Onboarding Route:* Checking the box triggers a sub-form block notification informing the user that credential parameters will follow. Submitting the form pipes user records to an intermediate role status (`unverified_instructor`) and immediately transitions the view state to the **Instructor Verification Console**.

---

## 📋 24. Instructor Identity Verification & Escape Hatch Architecture
To safeguard platform course assets and grades, unverified teacher sessions must process a structural authorization form coupled to an inline asset selection engine and safety fallback routes.
*   **The Institutional Credential Form:** Required input strings track necessary academic points: `office_phone`, `mobile_phone`, `institution_name`, `target_course_identifier`, `academic_homepage_url` (used for staff directory validation checks), `geographic_region`, and an open text area for user comments.
*   **The Evaluation Book Picker Modal:** Clicking the primary interface button triggers an animated overlay dialog box. This box runs a fast database fetch query against our **Nested Multi-Tier Category Engine** and displays a clean grid layout of custom colored textbook cards. Selecting a tile maps that `course_id` as the primary evaluation request, updates the pending adoption row database state, and fires our transactional email pipelines to notify administrators.
*   **The Role Diminution Escape Hatch Modal:** A secondary fallback action text button labeled **"Not an instructor?"** sits at the bottom of the verification console. Clicking this triggers a micro-dialog window providing clear options to down-convert their profile state string to a standard `student` user row cleanly.

---

## 🔀 25. Cross-Role Instructor Upgrade Pipeline
To accommodate legacy users or professors who completed an onboarding flow incorrectly, the user system allows account transitions without email re-registration.
*   **The Elevation Portal Entry:** Standard student accounts can navigate to their settings dashboard or user profile page and click an explicitly decoupled anchor button: **"Apply for Instructor Access"**.
*   **The State Transition Pipeline:** Activating this link flags their current database status as `pending_instructor` and renders the absolute **Instructor Verification Console** fields. This setup lets them submit their institution and website records smoothly, preventing any need to manage multiple corporate or university logins.

---

## 🏷  26. Nested Multi-Tier Category Engine (Major Classification)
To scale seamlessly across vast academic domains (Computer Science, Mechanical Engineering, Mathematics, Business) without messy data management, the catalog uses a recursive hierarchical classification scheme.
*   **The Structure Schema:** A dedicated `categories` table governs the taxonomy utilizing a parent-child adjacency relationship loop (`id`, `name`, `parent_id`).
*   **Course Junction Mapping:** A lean join table (`course_categories`) maps a specific `course_id` to its respective `category_id`. This dynamic indexing enables professors to drill down into their specific department major instantly in the global catalog, while letting your AI Agent Factory automatically tag generated assets into the correct academic taxonomy tier cleanly.

---

## 🏁 27. Three-Step Student Institutional Enrollment Onboarding
When an institutional student lands on the platform, their path to unlocking their material follows a strict three-step sequential user interface loop:
1.  **Authentication Step:** The student accesses the site interface and is prompted to **Sign in or create an account**.
2.  **Verification Step:** Once authenticated, the student arrives at their landing dashboard and must **Enter the unique code** inside the Left Column lookup search box. The system runs an instant lookup query against the database to match the structured code and display the exact course title, professor name, and college semester.
3.  **Monetization/Access Step:** The user clicks **Subscribe** to process their individual course seat license and fully activate their interactive content access stream.

---

## 🛡️ 28. Multi-Tenant Student Account Isolation
To ensure compliance and student security, data boundaries prevent students from intercepting peer profiles.
*   **Row-Level Security (RLS Guardrails):** PostgreSQL/Supabase access layers employ strict token queries (`auth.uid() = user_id`). A student account is blocked from performing read or write operations against any row in the `student_progress` or `quiz_attempts` tables that does not match their authentication key.
*   **Peer-to-Peer Perimeter Shield:** Student interfaces have no network controllers or dashboard panels linked to classmate progress, eliminating any risk of viewing other students' work.

---

## 📨 29. Automated Transactional Notification Loops
The adoption application route automatically executes asynchronous email triggers via transactional handlers to manage administrative state changes:

[Professor Clicks "Adopt Course"]│├──► 📧 Instantly Fires to Professor: "Adoption request received. Pending admin review."└──► 📧 Instantly Fires to Admins/Super Admin: "New adoption pending approval from Prof. X."
---

## 🔄 30. Sequential Block UI Architecture (The Core Learning Loop)
When a student opens a textbook section, the frontend parses a structured block configuration:
*   **Block 1:** Text definitions, media tables, or assets written in Markdown formats.
*   **Block 2:** Local browser-controlled animations step/rewind matrix with adjustable speeds.
*   **Block 3:** Minimum of 5 concept quizzes with targeted error hints and unlimited retries.
*   **Block 4:** Challenge Activities/Labs blocking grading points unless 100% correct, triggering an automated variant parameter-swap upon runtime execution failures.

---

## 🤖 31. The Multi-Agent AI Course Factory (The Content Engine)
The backend features an automated, asynchronous multi-agent orchestration pipeline that builds modules out from a simple text prompt:
*   **Agent 1 (Syllabus Architect):** Generates structural text layout indices.
*   **Agent 2 (Content & Animation Designer):** Compiles markdown prose and writes frame-by-frame coordinate timeline arrays for the UI to play locally.
*   **Agent 3 (Quiz Developer):** Compiles 5+ MCQs with specific, targeted incorrect option distractor feedback.
*   **Agent 4 (Lab Builder):** Authors stubs, hidden unit tests, and multiple challenge variants.

---

## 🛡️ 32. Zero-Cost Production Infrastructure Scaling Blueprint
The platform decouples data storage (Supabase Free Tier Postgres DB) from insecure, isolated code compilation layers (AWS Lambda Free Tier with a hard-coded 3-second runtime timeout).
