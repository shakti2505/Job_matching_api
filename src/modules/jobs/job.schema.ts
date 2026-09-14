import { z } from 'zod';

export const requiredSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  mustHave: z.boolean(),
});

export const createJobSchema = z
  .object({
    title: z.string().min(1, 'Job title is required'),
    requiredSkills: z.array(requiredSkillSchema).min(1, 'At least one required skill must be specified').optional(),
    required_skills: z.array(requiredSkillSchema).min(1, 'At least one required skill must be specified').optional(),
    minYearsExperience: z.number().min(0, 'minYearsExperience must be non-negative').optional(),
    min_years_experience: z.number().min(0, 'min_years_experience must be non-negative').optional(),
    location: z.string().min(1, 'Location is required'),
    salaryRange: z
      .object({
        min: z.number().int().positive('Minimum salary must be positive'),
        max: z.number().int().positive('Maximum salary must be positive'),
      })
      .optional(),
    salaryMin: z.number().int().positive('Minimum salary must be positive').optional(),
    salary_min: z.number().int().positive('Minimum salary must be positive').optional(),
    salaryMax: z.number().int().positive('Maximum salary must be positive').optional(),
    salary_max: z.number().int().positive('Maximum salary must be positive').optional(),
    remoteAllowed: z.boolean().optional(),
    remote_allowed: z.boolean().optional(),
  })
  .refine(
    (data) => data.requiredSkills !== undefined || data.required_skills !== undefined,
    {
      message: 'requiredSkills (or required_skills) is required',
      path: ['requiredSkills'],
    }
  )
  .refine(
    (data) => data.minYearsExperience !== undefined || data.min_years_experience !== undefined,
    {
      message: 'minYearsExperience (or min_years_experience) is required',
      path: ['minYearsExperience'],
    }
  )
  .refine(
    (data) =>
      data.salaryRange !== undefined ||
      ((data.salaryMin !== undefined || data.salary_min !== undefined) &&
        (data.salaryMax !== undefined || data.salary_max !== undefined)),
    {
      message: 'Salary range (min and max) is required',
      path: ['salaryRange'],
    }
  )
  .transform((data) => {
    const minSalary = data.salaryRange?.min ?? data.salaryMin ?? data.salary_min!;
    const maxSalary = data.salaryRange?.max ?? data.salaryMax ?? data.salary_max!;

    return {
      title: data.title.trim(),
      required_skills: (data.requiredSkills ?? data.required_skills)!.map((s) => ({
        name: s.name.trim(),
        mustHave: s.mustHave,
      })),
      min_years_experience: (data.minYearsExperience ?? data.min_years_experience)!,
      location: data.location.trim(),
      salary_min: minSalary,
      salary_max: maxSalary,
      remote_allowed: data.remoteAllowed ?? data.remote_allowed ?? false,
    };
  })
  .refine((data) => data.salary_max >= data.salary_min, {
    message: 'salary_max cannot be less than salary_min',
    path: ['salary_max'],
  });

export type ValidatedJobInput = z.infer<typeof createJobSchema>;
