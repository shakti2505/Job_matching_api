import 'dotenv/config';
import { pool, initializeDB } from '../src/config/db.js';
import * as candidateModel from '../src/modules/candidates/candidate.model.js';
import * as jobModel from '../src/modules/jobs/job.model.js';
import * as recommendationService from '../src/modules/recommendations/recommendation.service.js';

interface SeedCandidate {
  name: string;
  skills: string[];
  years_of_experience: number;
  location: string;
  expected_salary: number;
}

interface SeedJob {
  title: string;
  required_skills: { name: string; mustHave: boolean }[];
  min_years_experience: number;
  location: string;
  salary_min: number;
  salary_max: number;
  remote_allowed: boolean;
}

const sampleCandidates: SeedCandidate[] = [
  {
    name: 'Alice Johnson',
    skills: ['TypeScript', 'Node.js', 'React', 'Docker', 'PostgreSQL'],
    years_of_experience: 5.0,
    location: 'Denver, CO',
    expected_salary: 135000,
  },
  {
    name: 'Bob Chen',
    skills: ['JavaScript', 'React', 'HTML', 'CSS'],
    years_of_experience: 1.5,
    location: 'Remote',
    expected_salary: 80000,
  },
  {
    name: 'Carol Davis',
    skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Python'],
    years_of_experience: 6.0,
    location: 'San Francisco, CA',
    expected_salary: 160000,
  },
  {
    name: 'David Kim',
    skills: ['Python', 'Django', 'PostgreSQL', 'Redis'],
    years_of_experience: 3.0,
    location: 'New York, NY',
    expected_salary: 115000,
  },
];

const sampleJobs: SeedJob[] = [
  {
    title: 'Senior Fullstack Engineer (TS & React)',
    required_skills: [
      { name: 'TypeScript', mustHave: true },
      { name: 'Node.js', mustHave: true },
      { name: 'React', mustHave: false },
      { name: 'Docker', mustHave: false },
    ],
    min_years_experience: 4.0,
    location: 'Denver, CO',
    salary_min: 130000,
    salary_max: 155000,
    remote_allowed: true,
  },
  {
    title: 'Junior React Developer',
    required_skills: [
      { name: 'React', mustHave: true },
      { name: 'JavaScript', mustHave: true },
      { name: 'CSS', mustHave: false },
    ],
    min_years_experience: 1.0,
    location: 'Remote',
    salary_min: 75000,
    salary_max: 95000,
    remote_allowed: true,
  },
  {
    title: 'Senior DevOps / Cloud Engineer',
    required_skills: [
      { name: 'AWS', mustHave: true },
      { name: 'Kubernetes', mustHave: true },
      { name: 'Terraform', mustHave: false },
    ],
    min_years_experience: 5.0,
    location: 'San Francisco, CA',
    salary_min: 150000,
    salary_max: 180000,
    remote_allowed: false,
  },
  {
    title: 'Python Backend Engineer',
    required_skills: [
      { name: 'Python', mustHave: true },
      { name: 'PostgreSQL', mustHave: true },
      { name: 'Django', mustHave: false },
    ],
    min_years_experience: 2.5,
    location: 'New York, NY',
    salary_min: 110000,
    salary_max: 130000,
    remote_allowed: true,
  },
  {
    title: 'Lead Rust Systems Architect',
    required_skills: [
      { name: 'Rust', mustHave: true },
      { name: 'Distributed Systems', mustHave: true },
    ],
    min_years_experience: 7.0,
    location: 'New York, NY',
    salary_min: 180000,
    salary_max: 220000,
    remote_allowed: false,
  },
];

async function seedAndDemo(): Promise<void> {
  try {
    console.log('🔄 Initializing database schema...');
    await initializeDB();

    console.log('🧹 Clearing old sample data...');
    await pool.query('TRUNCATE TABLE candidates, jobs CASCADE;');

    console.log('📥 Inserting sample candidates...');
    const createdCandidates: candidateModel.Candidate[] = [];
    for (const c of sampleCandidates) {
      const candidate = await candidateModel.createCandidate(c);
      createdCandidates.push(candidate);
      console.log(`   ✅ Candidate added: ${candidate.name} (${candidate.id})`);
    }

    console.log('\n📥 Inserting sample jobs...');
    const createdJobs: jobModel.Job[] = [];
    for (const j of sampleJobs) {
      const job = await jobModel.createJob(j);
      createdJobs.push(job);
      console.log(`   ✅ Job added: ${job.title} (${job.id})`);
    }

    console.log('\n================================================================================');
    console.log('🎯 EVALUATION DEMO: JOB RECOMMENDATIONS FOR CANDIDATES');
    console.log('================================================================================\n');

    for (const candidate of createdCandidates) {
      console.log(`👤 CANDIDATE: ${candidate.name}`);
      console.log(`   Skills: [${candidate.skills.join(', ')}]`);
      console.log(`   Experience: ${candidate.years_of_experience} yrs | Location: ${candidate.location} | Expected Salary: $${candidate.expected_salary.toLocaleString()}`);

      const recommendations = await recommendationService.getJobRecommendationsForCandidate(candidate.id);

      if (!recommendations || recommendations.length === 0) {
        console.log('   ⚠️ No matching jobs found (all hard-filtered out).\n');
        continue;
      }

      console.log(`   📋 Ranked Recommendations (${recommendations.length} matching jobs):`);
      recommendations.forEach((rec, idx) => {
        console.log(`\n   #${idx + 1} | Score: ${rec.overallScore}/100 ➔ ${rec.job.title}`);
        console.log(`      Location: ${rec.job.location} (Remote Allowed: ${rec.job.remote_allowed})`);
        console.log(`      Salary Range: $${rec.job.salary_min.toLocaleString()} - $${rec.job.salary_max.toLocaleString()}`);
        console.log(`      Breakdown: Skills: ${rec.breakdown.skills} | Exp: ${rec.breakdown.experience} | Loc: ${rec.breakdown.location} | Salary: ${rec.breakdown.salary}`);
        console.log(`      Details: ${rec.scoreBreakdown.skills.details}`);
      });

      console.log('\n' + '-'.repeat(80) + '\n');
    }

    console.log('================================================================================');
    console.log('🔄 EVALUATION DEMO: REVERSE MATCHING (CANDIDATES FOR A JOB)');
    console.log('================================================================================\n');

    const demoJob = createdJobs[0]!;
    console.log(`💼 JOB: ${demoJob.title} (${demoJob.location}, Min Exp: ${demoJob.min_years_experience} yrs)`);
    const candidateMatches = await recommendationService.getCandidateRecommendationsForJob(demoJob.id);

    if (candidateMatches && candidateMatches.length > 0) {
      candidateMatches.forEach((match, idx) => {
        console.log(`\n   #${idx + 1} | Match Score: ${match.overallScore}/100 ➔ ${match.candidate.name}`);
        console.log(`      Skills: [${match.candidate.skills.join(', ')}] | Experience: ${match.candidate.years_of_experience} yrs`);
        console.log(`      Breakdown: Skills: ${match.breakdown.skills} | Exp: ${match.breakdown.experience} | Loc: ${match.breakdown.location} | Salary: ${match.breakdown.salary}`);
      });
    }

    console.log('\n================================================================================');
    console.log('✨ Seed and Evaluation completed successfully!');
    console.log('================================================================================');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedAndDemo();
