import { z } from 'zod';

export const createCandidateSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    skills: z.array(z.string().min(1)).min(1, 'At least one skill is required'),
    yearsOfExperience: z.number().min(0, 'Years of experience must be non-negative').optional(),
    years_of_experience: z.number().min(0, 'Years of experience must be non-negative').optional(),
    location: z.string().min(1, 'Location is required'),
    expectedSalary: z.number().int().positive('Expected salary must be a positive integer').optional(),
    expected_salary: z.number().int().positive('Expected salary must be a positive integer').optional(),
  })
  .refine(
    (data) => data.yearsOfExperience !== undefined || data.years_of_experience !== undefined,
    {
      message: 'yearsOfExperience (or years_of_experience) is required',
      path: ['yearsOfExperience'],
    }
  )
  .refine(
    (data) => data.expectedSalary !== undefined || data.expected_salary !== undefined,
    {
      message: 'expectedSalary (or expected_salary) is required',
      path: ['expectedSalary'],
    }
  )
  .transform((data) => ({
    name: data.name.trim(),
    skills: data.skills.map((s) => s.trim()),
    years_of_experience: (data.yearsOfExperience ?? data.years_of_experience)!,
    location: data.location.trim(),
    expected_salary: (data.expectedSalary ?? data.expected_salary)!,
  }));

export type ValidatedCandidateInput = z.infer<typeof createCandidateSchema>;
