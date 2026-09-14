-- Backfills chapters/sections for the 4 CIS courses already committed to the database
-- (20260913000007's chapter/section sub-inserts did not execute; the course rows already
-- exist under the IDs below, so this targets them directly rather than re-inserting courses).
-- Content is copied verbatim from 20260913000007_seed_faculty_curriculum.sql.

-- =====================================================================================
-- CIS 202W - Computer In Society (c202ba3b-0000-0000-0000-000000002022)
-- =====================================================================================
WITH ch1_202w AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c202ba3b-0000-0000-0000-000000002022', 'Chapter 1: Foundations of Digital Ethics', 1)
  RETURNING id
),
ch2_202w AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c202ba3b-0000-0000-0000-000000002022', 'Chapter 2: Technology''s Impact on Society', 2)
  RETURNING id
)
INSERT INTO public.sections (chapter_id, title, content_type, markdown_content, display_order)
SELECT id, '1.1 What Is Computer Ethics?', 'READING', $md$## Learning objectives
- Define computer ethics and distinguish it from general professional ethics
- Identify the major ethical frameworks applied to computing dilemmas
- Recognize why computing technology raises genuinely new ethical questions

## What is computer ethics?

Computer ethics is the branch of applied ethics that examines the moral responsibilities of individuals and organizations who create, deploy, and use computing technology. It is not simply "ethics for programmers" -- it spans questions of privacy, intellectual property, professional responsibility, and the broader social consequences of automated decision-making.

### Why computing is different

Earlier technologies (the printing press, the telephone) also raised ethical questions, but computing introduces three features that make the analysis distinct:

1. **Scale** -- a single decision encoded in software can affect millions of people simultaneously.
2. **Opacity** -- the logic behind a decision (a credit score, a content recommendation) may be invisible even to its designers.
3. **Malleability** -- software can be copied, modified, and repurposed far more cheaply than physical goods.

### Three ethical frameworks

| Framework | Core question | Example application |
|---|---|---|
| Consequentialism | Does this action produce the best overall outcome? | Weighing the benefits of a recommendation algorithm against its addictive design |
| Deontology | Does this action respect a moral rule or duty, regardless of outcome? | A duty not to deceive users, even if deception increases engagement |
| Virtue ethics | What would a person of good character do? | Asking what a conscientious engineer owes their users |

> **Discussion prompt:** A ride-sharing app's pricing algorithm raises fares during a medical emergency because demand has spiked. Which framework best explains why this feels wrong -- and does the framework actually forbid it?$md$, 1
FROM ch1_202w
UNION ALL
SELECT id, '1.2 Privacy, Surveillance, and Consent', 'READING', $md$## Learning objectives
- Distinguish between data privacy, data security, and data ownership
- Explain the difference between opt-in and opt-out consent models
- Evaluate a real data-collection practice against informed-consent standards

## What "privacy" actually means

"Privacy" is often used loosely, but in computing it usually refers to one of three distinct concerns:

- **Confidentiality** -- who is allowed to see the data (a security property).
- **Control** -- whether the individual the data describes can decide how it is used (an autonomy property).
- **Contextual integrity** -- whether data collected in one context (a fitness app) is being reused in an incompatible context (an insurance underwriting model).

### Consent models

| Model | How it works | Common example |
|---|---|---|
| Opt-in | No data is collected until the user actively agrees | GDPR-compliant cookie banners |
| Opt-out | Data is collected by default; the user must act to stop it | Many U.S. web analytics platforms |
| Implied | Consent is inferred from use of the service | Accepting a phone's location permission to use a maps app |

### Informed consent in practice

For consent to be meaningful, three conditions generally need to hold: the user must **understand** what is being collected, understand **why**, and be able to **refuse without losing access to the core service**. A 40-page terms-of-service document that must be accepted to use a free app satisfies none of these particularly well.

> **Case study:** A fitness-tracking app sells aggregated (not individually identified) location data to a data broker, who resells it to a firm that identifies patterns of visits to specific addresses. Walk through each consent model above and decide whether this practice would pass.$md$, 2
FROM ch1_202w
UNION ALL
SELECT id, '2.1 The Digital Divide', 'READING', $md$## Learning objectives
- Define the digital divide across its three commonly cited dimensions
- Explain how the digital divide compounds existing social inequality
- Identify at least two policy interventions aimed at closing access gaps

## Three dimensions of the divide

The "digital divide" is frequently treated as a single access/no-access gap, but researchers generally break it into three layers:

1. **Access divide** -- does a household have a physical internet connection and a capable device?
2. **Skills divide** -- can users effectively navigate, evaluate, and produce digital content once they have access?
3. **Outcomes divide** -- does internet access translate into measurable benefits (better jobs, healthcare, education)?

Closing the access divide does not automatically close the other two. A household with a smartphone-only connection can browse the web but may struggle to complete a job application requiring a resume upload and a scanned document -- a skills and infrastructure gap layered on top of an access gap.

### Compounding effects

The digital divide rarely acts alone. During emergency school closures, students without reliable home broadband were disproportionately from low-income and rural households -- the same populations already facing the largest gaps in educational resources. Technology access decisions made "neutrally" can therefore widen existing inequality rather than narrow it.

### Policy responses

- **Infrastructure subsidies** -- direct funding for last-mile broadband buildout in underserved areas.
- **Device and connectivity subsidies** -- programs that reduce the cost of hardware and monthly service for qualifying households.
- **Digital literacy programs** -- library- and school-based instruction aimed at the skills divide specifically.

> **Discussion prompt:** A city offers free public Wi-Fi in its downtown core. Which dimension(s) of the digital divide does this address -- and which does it leave untouched?$md$, 1
FROM ch2_202w
UNION ALL
SELECT id, '2.2 Algorithmic Bias and Fairness', 'READING', $md$## Learning objectives
- Explain how bias can enter a machine learning system despite a "neutral" algorithm
- Distinguish between individual fairness and group fairness
- Critique a real-world algorithmic decision-making system

## How bias enters "neutral" systems

A common misconception is that an algorithm is unbiased simply because it does not explicitly reference a protected attribute like race or gender. In practice, bias enters through several channels:

- **Historical bias** -- training data reflects past discriminatory decisions.
- **Representation bias** -- the training set under-samples certain populations, degrading accuracy specifically for them.
- **Proxy variables** -- features statistically correlated with a protected attribute (zip code correlating with race) reintroduce the same signal indirectly.
- **Measurement bias** -- the label being predicted is itself a flawed proxy for what we actually care about.

### Two notions of fairness

| Concept | Definition | Tension |
|---|---|---|
| Individual fairness | Similar individuals should receive similar outcomes | Requires a defensible similarity metric |
| Group fairness | Outcome rates should be comparable across protected groups | Can require treating similar individuals differently across groups to equalize rates |

These two notions can directly conflict -- satisfying one can require violating the other. There is no universally "correct" choice; it depends on the values and legal constraints of the specific application.

> **Case study:** A recidivism-risk-scoring tool used in bail hearings is equally accurate for Black and white defendants, but Black defendants who do *not* reoffend are more often scored high-risk than white defendants who do not reoffend. Which fairness definition does this violate, and which does it satisfy?$md$, 2
FROM ch2_202w;

-- =====================================================================================
-- CIS 350 - Information Security (c350ba3b-0000-0000-0000-000000000350)
-- =====================================================================================
WITH ch1_350 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c350ba3b-0000-0000-0000-000000000350', 'Chapter 1: Security Fundamentals', 1)
  RETURNING id
),
ch2_350 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c350ba3b-0000-0000-0000-000000000350', 'Chapter 2: Network and Application Security', 2)
  RETURNING id
)
INSERT INTO public.sections (chapter_id, title, content_type, markdown_content, display_order)
SELECT id, '1.1 The CIA Triad and Threat Modeling', 'READING', $md$## Learning objectives
- Define confidentiality, integrity, and availability and give an example failure of each
- Construct a basic threat model for a simple web application
- Distinguish a vulnerability from a threat and from a risk

## The CIA Triad

Information security is conventionally organized around three properties:

- **Confidentiality** -- information is disclosed only to authorized parties. *Failure example:* a misconfigured storage bucket exposes customer records to the public internet.
- **Integrity** -- information is modified only in authorized, expected ways. *Failure example:* an attacker tampers with a firmware update package in transit.
- **Availability** -- authorized parties can access information and systems when needed. *Failure example:* a denial-of-service attack takes a hospital's patient portal offline.

Most security controls can be understood as protecting one or more of these three properties. Encryption at rest primarily protects confidentiality; cryptographic signatures primarily protect integrity; redundant infrastructure primarily protects availability.

### Vulnerability, threat, and risk

| Term | Definition |
|---|---|
| Vulnerability | A weakness that could be exploited (e.g., unpatched software) |
| Threat | A potential cause of an incident (e.g., an attacker who might exploit the weakness) |
| Risk | The likelihood and impact of a threat successfully exploiting a vulnerability |

### A minimal threat modeling process

1. **Identify assets** -- what are we protecting? (customer data, credentials, uptime)
2. **Identify entry points** -- how could an attacker interact with the system? (login form, file upload, API)
3. **Identify threats per entry point** -- a structured framework like **STRIDE** (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege) helps ensure coverage.
4. **Rank and mitigate** -- prioritize by (likelihood x impact), not by which is easiest to fix.

> **Discussion prompt:** A login form is vulnerable to unlimited password guessing attempts. Map this to a STRIDE category and propose one mitigation.$md$, 1
FROM ch1_350
UNION ALL
SELECT id, '1.2 Lab: Password Hashing and Cracking', 'LAB', $md$## Introduction

Storing passwords safely is one of the most consequential decisions an application makes -- a breach of a plaintext password database compromises every user who reused that password elsewhere. In this lab you will inspect how password hashes are constructed, why naive hashing is insufficient, and how a cracking tool exploits weak hashing choices.

## Learning objectives
- Explain why a fast general-purpose hash (e.g., SHA-256) is unsuitable for password storage
- Describe the role of a salt in defeating precomputed rainbow-table attacks
- Use a hash-cracking utility against a deliberately weak hash to observe attack speed

## Devices
- BalootLabs sandbox container (Debian-based, pre-installed with hashcat and a small wordlist)

## Tasks
1. Connect to the sandbox using the panel on the right.
2. Run `hashcat --example-hashes` to inspect example hash formats and note the difference between md5crypt, bcrypt, and raw sha256 output.
3. Crack the provided unsalted MD5 hash (5f4dcc3b5aa765d61d8327deb882cf99) against the supplied wordlist and record the time taken.
4. Repeat the attempt against the provided bcrypt hash of the same password and compare the elapsed time.
5. In the submission box, explain in 3-4 sentences why the time difference in step 4 is a deliberate design property of bcrypt, not an accident.$md$, 2
FROM ch1_350
UNION ALL
SELECT id, '2.1 Common Web Vulnerabilities (OWASP Top 10)', 'READING', $md$## Learning objectives
- Describe injection, broken access control, and cryptographic failures as distinct vulnerability classes
- Explain why input validation alone does not fully mitigate injection attacks
- Map a described attack scenario to its corresponding OWASP Top 10 category

## Why a "top 10" list?

The OWASP Top 10 is a periodically updated ranking of the most critical web application security risks, based on real-world prevalence and impact data contributed by security organizations worldwide. It is not exhaustive, but it is the most widely referenced baseline for what a web application security review should cover.

### Three categories worth close attention

**Injection.** Occurs when untrusted input is interpreted as code or a command rather than as inert data -- the canonical example is SQL injection, where a string like `' OR '1'='1` alters the structure of a query rather than supplying a value to it. Input *validation* helps, but the durable fix is **parameterization** -- ensuring user input is always passed as a bound parameter, never concatenated into a query string.

**Broken access control.** Occurs when a system fails to enforce that a user can only perform actions and access data they are authorized for. This is frequently a logic bug rather than a missing technical control -- for example, an API endpoint `/orders/{id}` that returns any order by ID without checking that the requesting user actually owns that order.

**Cryptographic failures.** Occurs when sensitive data is transmitted or stored without adequate protection -- using outdated algorithms, hardcoding encryption keys in source code, or transmitting credentials over unencrypted HTTP.

### Defense in depth

No single control fully closes any of these categories. A robust application combines parameterized queries **and** least-privilege database accounts **and** centralized authorization middleware, so that a single missed check does not become a full compromise.

> **Discussion prompt:** An e-commerce site's checkout API accepts a `price` field from the client to calculate the order total. Which OWASP category does this fall under, and what is the correct architectural fix?$md$, 1
FROM ch2_350
UNION ALL
SELECT id, '2.2 Lab: SQL Injection and Input Validation', 'LAB', $md$## Introduction

This lab puts the previous section's concepts into practice against a deliberately vulnerable login form running inside your sandbox. You will demonstrate a classic authentication-bypass SQL injection, then patch the endpoint using parameterized queries and confirm the exploit no longer works.

## Learning objectives
- Execute an authentication-bypass SQL injection against a vulnerable login endpoint
- Rewrite a raw SQL query to use bound parameters
- Verify a fix by re-attempting the original exploit and confirming it fails

## Devices
- BalootLabs sandbox container (pre-installed Flask app on port 5000, backed by SQLite)

## Tasks
1. Connect to the sandbox and browse to the running login form.
2. Attempt to authenticate with the username `admin' --` and any password. Confirm you are logged in without knowing the real password, and explain in your own words why the trailing `--` matters.
3. Open `app.py` in the sandbox's editor and locate the raw string-concatenated SQL query used by the login route.
4. Rewrite the query to use a parameterized statement rather than string formatting.
5. Restart the app and repeat step 2. Confirm the same input now correctly fails to authenticate.
6. Submit your modified `app.py` snippet along with a two-sentence explanation of why parameterization closes this specific attack.$md$, 2
FROM ch2_350;

-- =====================================================================================
-- CIS 631 - Machine Learning (c631ba3b-0000-0000-0000-000000000631)
-- =====================================================================================
WITH ch1_631 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c631ba3b-0000-0000-0000-000000000631', 'Chapter 1: Foundations of Supervised Learning', 1)
  RETURNING id
),
ch2_631 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c631ba3b-0000-0000-0000-000000000631', 'Chapter 2: Classification and Model Evaluation', 2)
  RETURNING id
)
INSERT INTO public.sections (chapter_id, title, content_type, markdown_content, display_order)
SELECT id, '1.1 Linear Regression and Gradient Descent', 'READING', $md$## Learning objectives
- Formulate simple linear regression as an optimization problem
- Explain the role of the loss function and the learning rate in gradient descent
- Identify when gradient descent fails to converge and why

## The regression problem

Given a dataset of input-output pairs (x_i, y_i), linear regression seeks parameters w (weight) and b (bias) that minimize the difference between predicted values y_hat_i = w*x_i + b and true values y_i. The most common measure of "difference" is **mean squared error**:

```
MSE(w, b) = (1/n) * sum((y_i - (w*x_i + b))^2)
```

### Why gradient descent?

For simple linear regression, a closed-form solution (ordinary least squares) exists. But most models used in practice -- logistic regression, neural networks -- have no closed-form solution, so we need a general-purpose optimization procedure. **Gradient descent** is that procedure: it iteratively adjusts the parameters in the direction that most steeply decreases the loss.

At each step:

```
w := w - alpha * dMSE/dw
b := b - alpha * dMSE/db
```

where **alpha (the learning rate)** controls how large each step is.

### Choosing a learning rate

| Learning rate | Behavior |
|---|---|
| Too small | Converges, but extremely slowly -- may appear "stuck" |
| Well-tuned | Converges smoothly to a minimum in a reasonable number of steps |
| Too large | Overshoots the minimum; loss oscillates or diverges entirely |

A common practical strategy is to start with a moderate learning rate and monitor the loss curve -- a loss that decreases smoothly indicates a reasonable choice, while a loss that oscillates or increases indicates the rate is too high.

> **Discussion prompt:** You train a linear regression model and the loss decreases for the first 5 iterations, then begins increasing without bound. What is the most likely cause, and what single hyperparameter would you change first?$md$, 1
FROM ch1_631
UNION ALL
SELECT id, '1.2 Lab: Implementing Linear Regression from Scratch', 'LAB', $md$## Introduction

Before relying on library implementations, it's essential to understand what they're doing internally. In this lab you will implement gradient descent for simple linear regression using only NumPy -- no scikit-learn -- and fit it to a small synthetic dataset.

## Learning objectives
- Implement the mean squared error loss and its gradient in NumPy
- Implement an iterative gradient descent training loop
- Diagnose divergence caused by a poorly chosen learning rate

## Devices
- BalootLabs sandbox container (Python 3.11, NumPy and Matplotlib pre-installed)

## Tasks
1. Connect to the sandbox and open `regression.py`, which contains a synthetic dataset (X, y) and stub functions `predict`, `compute_loss`, and `gradient_step`.
2. Implement `predict(X, w, b)` to return `w * X + b`.
3. Implement `compute_loss(y_true, y_pred)` to return the mean squared error.
4. Implement `gradient_step(X, y, w, b, lr)` to compute the gradients of the loss with respect to w and b, and return updated (w, b).
5. Run `python regression.py` to train for 200 iterations at lr=0.01 and confirm the printed loss decreases each iteration.
6. Re-run with lr=1.5 and observe the loss diverge. In the submission box, explain what you observed and why.$md$, 2
FROM ch1_631
UNION ALL
SELECT id, '2.1 Logistic Regression and Decision Boundaries', 'READING', $md$## Learning objectives
- Explain why linear regression is unsuitable for binary classification
- Describe the role of the sigmoid function in logistic regression
- Interpret a decision boundary geometrically for a two-feature classifier

## From regression to classification

Linear regression predicts an unbounded real number, but a classification task (spam / not spam) needs a prediction that behaves like a probability -- bounded between 0 and 1. **Logistic regression** achieves this by passing the linear combination of inputs through the **sigmoid function**:

```
sigmoid(z) = 1 / (1 + e^(-z))     where z = w.x + b
```

The sigmoid squashes any real-valued input into the range (0, 1), which can be interpreted as P(y = 1 | x).

### The decision boundary

A prediction is typically classified as positive when sigmoid(z) >= 0.5, which is equivalent to z >= 0. Because z = w.x + b is linear in the input features, the **decision boundary** -- the set of points where the model is exactly 50/50 -- is a straight line (in two dimensions) or a hyperplane (in higher dimensions). This is why logistic regression is called a *linear* classifier, even though the sigmoid function itself is nonlinear.

### Loss function: why not MSE?

Logistic regression is trained with **binary cross-entropy loss**, not mean squared error. Cross-entropy penalizes confident wrong predictions much more heavily than MSE does, and -- critically -- it keeps the optimization problem convex when combined with the sigmoid, which MSE does not.

```
Loss = -(1/n) * sum(y_i*log(yhat_i) + (1 - y_i)*log(1 - yhat_i))
```

> **Discussion prompt:** A logistic regression model achieves 95% accuracy on a dataset where 95% of examples belong to the negative class. Is this model actually useful? What metric would better expose the problem?$md$, 1
FROM ch2_631
UNION ALL
SELECT id, '2.2 Lab: Building a Classifier with Scikit-Learn', 'LAB', $md$## Introduction

With the theory of logistic regression established, this lab moves to a production-grade tooling workflow: loading a real dataset, splitting it correctly, training a scikit-learn classifier, and evaluating it with more than raw accuracy.

## Learning objectives
- Split a dataset into training and test sets without leaking information
- Train a LogisticRegression classifier using scikit-learn
- Evaluate a classifier using precision, recall, and a confusion matrix rather than accuracy alone

## Devices
- BalootLabs sandbox container (Python 3.11, scikit-learn and pandas pre-installed)

## Tasks
1. Connect to the sandbox and open `classify.py`, which loads the provided `patients.csv` dataset (a synthetic diagnostic dataset with class imbalance).
2. Split the data using `train_test_split` with `stratify=y` and explain in a code comment why stratification matters here.
3. Fit a LogisticRegression model on the training split.
4. Generate predictions on the test split and print a `classification_report` (precision, recall, F1 per class).
5. Identify which class has the lower recall and propose one concrete technique (e.g., class weighting, resampling) to address it -- you do not need to implement it, just justify your choice in the submission box.$md$, 2
FROM ch2_631;

-- =====================================================================================
-- CIS 483 - Web application design and development (c483ba3b-0000-0000-0000-000000000483)
-- =====================================================================================
WITH ch1_483 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c483ba3b-0000-0000-0000-000000000483', 'Chapter 1: Front-End Fundamentals', 1)
  RETURNING id
),
ch2_483 AS (
  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES ('c483ba3b-0000-0000-0000-000000000483', 'Chapter 2: Back-End Fundamentals and APIs', 2)
  RETURNING id
)
INSERT INTO public.sections (chapter_id, title, content_type, markdown_content, display_order)
SELECT id, '1.1 The Document Object Model and Component Architecture', 'READING', $md$## Learning objectives
- Explain the relationship between HTML, the DOM, and the rendered page
- Distinguish imperative DOM manipulation from declarative, component-based rendering
- Identify the benefits of breaking a UI into reusable components

## HTML, the DOM, and rendering

A browser does not render HTML text directly -- it first parses the HTML into the **Document Object Model (DOM)**, a tree of node objects that JavaScript can inspect and modify. Every tag becomes a node; every attribute becomes a property on that node. When JavaScript changes the DOM, the browser re-renders the affected region of the page.

### Imperative vs. declarative UI

Early web development manipulated the DOM **imperatively** -- code explicitly described the *steps* to reach a desired state:

```js
const el = document.createElement("li");
el.textContent = "New item";
list.appendChild(el);
```

Modern frameworks (React, Vue) favor a **declarative** model: the developer describes *what* the UI should look like for a given state, and the framework computes the minimal set of DOM changes needed to get there:

```jsx
function ItemList({ items }) {
  return (
    <ul>
      {items.map((item) => <li key={item.id}>{item.label}</li>)}
    </ul>
  );
}
```

Declarative rendering eliminates an entire category of bugs caused by DOM state drifting out of sync with application state.

### Why components?

A **component** bundles markup, styling, and behavior for one piece of UI into a single reusable unit. This mirrors the same motivation as functions in general programming: components let a team avoid duplicating the same button or form field markup across dozens of pages, and let a change to that one definition propagate everywhere it's used.

> **Discussion prompt:** A page has five buttons that all look identical but were each hand-coded separately. Six months later, the design team wants to change the corner radius on all buttons. What does this scenario illustrate about the cost of skipping componentization?$md$, 1
FROM ch1_483
UNION ALL
SELECT id, '1.2 Lab: Building a Responsive Component with Tailwind CSS', 'LAB', $md$## Introduction

This lab moves from the theory of component architecture to a hands-on build: a single reusable "pricing card" component, styled with Tailwind CSS utility classes, that adapts cleanly from a mobile viewport to a desktop one.

## Learning objectives
- Compose a UI component from Tailwind's utility classes rather than hand-written CSS
- Apply Tailwind's responsive breakpoint prefixes (sm:, md:, lg:) to change layout at different widths
- Use flexbox utilities to align content within a card

## Devices
- BalootLabs sandbox container (Node.js 20, a pre-configured Vite + Tailwind project)

## Tasks
1. Connect to the sandbox and open `src/PricingCard.jsx`, which contains an unstyled component skeleton.
2. Style the outer container as a card: rounded corners, a subtle border, padding, and a drop shadow on hover.
3. Lay out the price and "per month" label using flexbox so they sit on the same baseline.
4. Make the card full-width on mobile and constrain it to a fixed max-width starting at the md: breakpoint.
5. Run the dev server (`npm run dev`) and resize the preview to confirm the layout adapts correctly at the md: breakpoint.
6. Submit the final class list you used on the outer container and a one-sentence explanation of what each responsive prefix does.$md$, 2
FROM ch1_483
UNION ALL
SELECT id, '2.1 RESTful API Design Principles', 'READING', $md$## Learning objectives
- Explain what makes an API "RESTful" beyond simply using HTTP
- Map CRUD operations to the correct HTTP methods and status codes
- Identify a common REST anti-pattern and its correct alternative

## What "REST" actually requires

Many APIs described as "RESTful" are really just "HTTP APIs" -- using HTTP as a transport without following REST's actual constraints. Two constraints matter most in practice:

- **Resource orientation.** URLs should identify *nouns* (resources), not *verbs* (actions). `/orders/42` is resource-oriented; `/getOrderById?id=42` is not.
- **Statelessness.** Each request must contain all the information the server needs to process it -- the server should not rely on server-side session state to interpret a request.

### Mapping CRUD to HTTP

| Operation | HTTP method | Example | Success status |
|---|---|---|---|
| Create | POST | POST /orders | 201 Created |
| Read (one) | GET | GET /orders/42 | 200 OK |
| Read (many) | GET | GET /orders | 200 OK |
| Update (full) | PUT | PUT /orders/42 | 200 OK |
| Update (partial) | PATCH | PATCH /orders/42 | 200 OK |
| Delete | DELETE | DELETE /orders/42 | 204 No Content |

### A common anti-pattern: verbs in URLs

An endpoint like `POST /orders/42/cancel` is a pragmatic and widely used exception to strict resource orientation -- canceling isn't naturally a CRUD operation on the order resource itself. The stricter REST-purist alternative models the cancellation as its own resource: `POST /orders/42/cancellations`. Both are defensible; the anti-pattern to actually avoid is inconsistency -- mixing verb-style and noun-style endpoints arbitrarily across the same API.

> **Discussion prompt:** An API exposes `GET /deleteUser?id=7` -- a GET request that deletes a user as a side effect. Beyond violating resource orientation, what practical problem does this design create with browsers, proxies, and caches?$md$, 1
FROM ch2_483
UNION ALL
SELECT id, '2.2 Lab: Building a CRUD API Endpoint', 'LAB', $md$## Introduction

This lab applies REST design principles to a working implementation: a minimal Express.js API for a tasks resource, backed by an in-memory store. You will implement the missing CRUD routes and verify each one with curl.

## Learning objectives
- Implement GET, POST, PUT, and DELETE routes for a single resource
- Return correct HTTP status codes for success and not-found cases
- Verify an API's behavior from the command line using curl

## Devices
- BalootLabs sandbox container (Node.js 20, Express pre-installed, server on port 3001)

## Tasks
1. Connect to the sandbox and open `server.js`, which already implements GET /tasks and GET /tasks/:id.
2. Implement `POST /tasks` to create a new task from the JSON request body and respond 201 with the created resource.
3. Implement `PUT /tasks/:id` to replace an existing task, responding 200 on success and 404 if the ID does not exist.
4. Implement `DELETE /tasks/:id` to remove a task, responding 204 on success and 404 if the ID does not exist.
5. Start the server (`node server.js`) and verify each route using curl, e.g. `curl -X POST localhost:3001/tasks -H "Content-Type: application/json" -d '{"title":"Test"}'`.
6. Submit the four curl commands you used and their observed status codes.$md$, 2
FROM ch2_483;
