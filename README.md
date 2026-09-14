# Job Match API — Recommendation Engine

A rule-based, transparent, and explainable Job Recommendation API built with Node.js, Express, TypeScript, PostgreSQL, and Vitest.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20+ (tested on Node.js v22)
- **Docker & Docker Compose** (for running PostgreSQL or the full containerized stack)

### 1. Running via Docker (Full Stack)
To run both the PostgreSQL database and the API service in isolated containers:
```bash
docker compose up --build -d
```
The API will be available at `http://localhost:3000`.

### 2. Running Locally for Development
1. Start the PostgreSQL database:
   ```bash
   docker compose up postgres -d
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env  # or ensure .env has PGUSER, PGPASSWORD, PGDATABASE, PGPORT, PGHOST
   ```
4. Start the development server with live reload:
   ```bash
   npm run dev
   ```
5. Run tests:
   ```bash
   npm test
   ```
6. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## 🧠 Scoring Formula & Weight Rationale

The scoring engine calculates an overall score from **0 to 100** across four transparent dimensions, defaulting to:
$$\text{Total Score} = \text{Skills (50)} + \text{Experience (20)} + \text{Location (15)} + \text{Salary (15)}$$

### 1. Skills (50 Points) — Hard Filter & Proportional Boost
* **Must-Have Skills (Hard Filter)**: If a job requires one or more must-have skills that the candidate does not have (case-insensitive), the job is **completely excluded** from recommendations (overall score = 0 / omitted from results).
* **Rationale**: Must-have skills represent strict minimum job prerequisites (e.g., medical license, core programming language). Recommending a job where a candidate cannot perform baseline duties creates noise for both parties.
* **Nice-to-Have Skills (Score Booster)**:
  * When all must-haves are satisfied, must-haves are weighted at $2\times$ and nice-to-haves at $1\times$.
  * Formula:
    $$\text{Score} = \left( \frac{2 \times N_{\text{matched must-haves}} + 1 \times N_{\text{matched nice-to-haves}}}{2 \times N_{\text{total must-haves}} + 1 \times N_{\text{total nice-to-haves}}} \right) \times 50$$
  * *Example*: A candidate with all must-haves but 0 nice-to-haves gets a strong passing base score, with each nice-to-have skill boosting them toward 50/50.

### 2. Experience (20 Points) — Proportional Penalty vs. Exclusion
* **Formula**:
  * If $\text{candidateExp} \ge \text{minYearsExp}$: $\mathbf{20/20}$
  * If $\text{candidateExp} < \text{minYearsExp}$: $\left( \frac{\text{candidateExp}}{\text{minYearsExp}} \right) \times 20$
* **Why Penalize instead of Exclude?**: Years of experience are an imperfect proxy for competence. A developer with 3.5 years applying for a 4-year requirement may still be an excellent candidate due to fast learning or high project velocity. Disqualifying them outright creates false negatives, whereas a proportional penalty reflects the slight qualification gap without hiding the opportunity.

### 3. Location (15 Points) — Hybrid & Remote Tiering
* **Exact Match** (Same city/location or either party is marked "Remote"): $\mathbf{15/15}$
* **Remote Allowed** (Locations differ, but `remote_allowed = true` on the job): $\mathbf{10/15}$
* **Mismatch** (Locations differ and `remote_allowed = false`): $\mathbf{0/15}$
* **Rationale**: Local candidates require no relocation or timezone friction (15 pts). Remote flexibility is a great alternative for modern teams (10 pts). Strict on-site requirements in a different location represent a non-viable commute/relocation barrier (0 pts).

### 4. Salary (15 Points) — Overlap & Surplus
* **Job Minimum Meets/Exceeds Expectation** ($\text{expectedSalary} \le \text{salaryMin}$): $\mathbf{15/15}$
* **Expectation Within Range** ($\text{salaryMin} < \text{expectedSalary} \le \text{salaryMax}$):
  $$\text{Score} = 15 \times \left( 0.70 + 0.30 \times \frac{\text{salaryMax} - \text{expectedSalary}}{\text{salaryMax} - \text{salaryMin}} \right) \in [10.5, 15.0]$$
* **Expectation Above Job Max** ($\text{expectedSalary} > \text{salaryMax}$):
  * Gap ratio $G = \frac{\text{expectedSalary} - \text{salaryMax}}{\text{expectedSalary}}$
  * If $G \ge 0.30$ ($30\%+$ excess): $\mathbf{0/15}$
  * If $0 < G < 0.30$: Rapid quadratic decay towards zero.
* **Rationale**: Candidates expect competitive compensation. If the job easily pays above expectation, fit is optimal (15 pts). Within range, fit remains strong. When a candidate expects significantly more than a company's budget, offer acceptance rates drop dramatically, justifying a steep score drop.

---

## ⚙️ Configurable Weights (Bonus Feature)

The scoring weights are customizable via query parameters:
```http
GET /candidates/:id/recommendations?skillWeight=40&expWeight=30&locWeight=15&salWeight=15
```
Custom weights are automatically normalized so total points scale consistently to 100.

---

## 📡 API Endpoints Reference

### 1. Health Check
```http
GET /health
```
**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-15T00:30:00.000Z"
}
```

---

### 2. Create Candidate Profile
```http
POST /candidates
Content-Type: application/json

{
  "name": "Alex Johnson",
  "skills": ["TypeScript", "Node.js", "PostgreSQL", "Docker"],
  "yearsOfExperience": 4.5,
  "location": "San Francisco, CA",
  "expectedSalary": 140000
}
```
*(Accepts both `yearsOfExperience` / `years_of_experience` and `expectedSalary` / `expected_salary`)*

**Response (201 Created):**
```json
{
  "id": "e4b52bb2-0a1f-4b06-9eb6-042bb652b047",
  "name": "Alex Johnson",
  "skills": ["TypeScript", "Node.js", "PostgreSQL", "Docker"],
  "years_of_experience": 4.5,
  "location": "San Francisco, CA",
  "expected_salary": 140000,
  "created_at": "2026-09-15T00:30:00.000Z"
}
```

---

### 3. Create Job Posting
```http
POST /jobs
Content-Type: application/json

{
  "title": "Senior Backend Engineer",
  "requiredSkills": [
    { "name": "TypeScript", "mustHave": true },
    { "name": "Node.js", "mustHave": true },
    { "name": "PostgreSQL", "mustHave": false },
    { "name": "Kubernetes", "mustHave": false }
  ],
  "minYearsExperience": 4,
  "location": "San Francisco, CA",
  "salaryRange": {
    "min": 130000,
    "max": 160000
  },
  "remoteAllowed": true
}
```

**Response (201 Created):**
```json
{
  "id": "7b0a0491-6205-4f05-8e3b-9a742cebfdf6",
  "title": "Senior Backend Engineer",
  "required_skills": [
    { "name": "TypeScript", "mustHave": true },
    { "name": "Node.js", "mustHave": true },
    { "name": "PostgreSQL", "mustHave": false },
    { "name": "Kubernetes", "mustHave": false }
  ],
  "min_years_experience": 4,
  "location": "San Francisco, CA",
  "salary_min": 130000,
  "salary_max": 160000,
  "remote_allowed": true,
  "created_at": "2026-09-15T00:30:00.000Z"
}
```

---

### 4. Get Job Recommendations for Candidate
```http
GET /candidates/:id/recommendations?limit=5
```

**Response (200 OK):**
```json
{
  "candidateId": "e4b52bb2-0a1f-4b06-9eb6-042bb652b047",
  "count": 1,
  "recommendations": [
    {
      "job": {
        "id": "7b0a0491-6205-4f05-8e3b-9a742cebfdf6",
        "title": "Senior Backend Engineer",
        "required_skills": [
          { "name": "TypeScript", "mustHave": true },
          { "name": "Node.js", "mustHave": true },
          { "name": "PostgreSQL", "mustHave": false },
          { "name": "Kubernetes", "mustHave": false }
        ],
        "min_years_experience": 4,
        "location": "San Francisco, CA",
        "salary_min": 130000,
        "salary_max": 160000,
        "remote_allowed": true
      },
      "overallScore": 96.7,
      "breakdown": {
        "skills": "41.7/50",
        "experience": "20/20",
        "location": "15/15",
        "salary": "13.5/15"
      },
      "scoreBreakdown": {
        "skills": {
          "score": 41.7,
          "max": 50,
          "formatted": "41.7/50",
          "details": "Matched 2/2 must-haves, 1/2 nice-to-haves"
        },
        "experience": {
          "score": 20,
          "max": 20,
          "formatted": "20/20",
          "details": "4.5 years experience meets or exceeds minimum requirement of 4 years"
        },
        "location": {
          "score": 15,
          "max": 15,
          "formatted": "15/15",
          "details": "Location match (San Francisco, CA)"
        },
        "salary": {
          "score": 13.5,
          "max": 15,
          "formatted": "13.5/15",
          "details": "Expectation ($140,000) within range ($130,000 - $160,000)"
        }
      }
    }
  ]
}
```

---

### 5. Reverse Matching: Candidate Recommendations for a Job (Bonus)
```http
GET /jobs/:id/recommendations?limit=10
```
Returns a ranked list of best-fit candidates for a specific job posting.

---

## 🧪 Testing

The test suite is built with **Vitest** and covers unit and integration test scenarios:

```bash
npm test
```

### Key Test Coverage:
- **Must-have missing**: Verified that candidate missing a must-have is hard-filtered out (`null` match).
- **Skill boosts**: Tested that nice-to-have matches increase overall score.
- **Case-insensitivity**: Tested skill match normalization ("React" vs "react").
- **Experience penalty**: Tested that candidates under minimum experience receive proportional penalty without exclusion.
- **Location hierarchy**: Tested exact location (15/15) > remote allowed (10/15) > on-site mismatch (0/15).
- **Salary boundaries**: Tested expectation below min, inside range, and above max.
- **Custom weights & query options**: Tested dynamic weight normalization and top-$N$ limit slicing.

---

## 🔍 Assumptions & Future Improvements

### Assumptions
1. **In-Memory Scoring Scale**: All active jobs are pulled into memory for scoring. For small-to-medium job boards (< 50,000 active postings), in-memory evaluation takes < 15ms.
2. **Skill Matching**: Handled via normalized string matching (trimmed & lowercase).
3. **Location Granularity**: Treated as normalized string labels.

### What We'd Do Differently With More Time
1. **Database-Level Pre-Filtering**: Use PostgreSQL GIN indexes on `required_skills` and SQL `WHERE` clauses to prune non-matching records before loading into memory.
2. **Semantic Skill Graph & Synonyms**: Integrate a skill ontology (e.g. mapping "React.js", "ReactJS", and "React" as identical, or "PostgreSQL" and "SQL" as related).
3. **Geo-Distance Calculation**: Use PostGIS or Haversine distance for location matching (e.g., scoring candidates within a 30-mile radius higher than candidates 500 miles away).
4. **Pagination**: Implement cursor-based pagination for large recommendation sets.

---

## 🤖 AI Usage & Human Decisions

### How AI Was Used
- Writing initial boilerplate for Express routes and database setup.
- Generating Zod input validation schemas.
- Writing unit test cases for different scoring edge cases.

### Where Human Developer Overrides & Decisions Were Made
- **Folder Structure**: Kept a clean **Model-Service-Controller** structure to make the codebase simple and easy to navigate.
- **Strict Must-Have Skills**: Made sure missing a "must-have" skill immediately hides the job, while missing a "nice-to-have" skill only reduces the score without blocking the candidate.
- **Fair Experience Scoring**: Gave partial points for candidates with fewer years of experience (e.g., 3 years out of 4 required) instead of rejecting them completely.
- **Smooth Salary Logic**: Designed the salary score so candidates get full points when the job pays what they want, and points decrease fairly if their expectation is above the job's max budget.
- **Node & TypeScript Fixes**: Configured `tsx watch` for smooth local development and `tsc` for production builds to avoid module import issues.
