CREATE TABLE IF NOT EXISTS candidates(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(225) NOT NULL,
    skills TEXT[] NOT NULL DEFAULT '{}',
    years_of_experience NUMERIC(4,1) NOT NULL,
    location VARCHAR(225) NOT NULL,
    expected_salary INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    -- JSONB structure: [{"name": "React", "mustHave": true}, {"name": "Docker", "mustHave": false}]
    required_skills JSONB NOT NULL DEFAULT '[]',
    min_years_experience NUMERIC(4,1) NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary_min INTEGER NOT NULL,
    salary_max INTEGER NOT NULL,
    remote_allowed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);