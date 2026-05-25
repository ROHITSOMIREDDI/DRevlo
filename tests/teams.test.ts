import { describe, it, expect } from 'vitest';
import { createTeamSchema } from '../app/api/teams/route';

describe('Team Creation Validation Schema', () => {
  it('should pass on valid name and slug', () => {
    const validData = {
      name: 'Acme Dev Team',
      slug: 'acme-dev-team',
    };
    const result = createTeamSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if name is too short', () => {
    const invalidData = {
      name: 'A',
      slug: 'acme-dev-team',
    };
    const result = createTeamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it('should fail if slug contains uppercase letters', () => {
    const invalidData = {
      name: 'Acme Dev Team',
      slug: 'Acme-Dev-Team',
    };
    const result = createTeamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if slug contains spaces or special characters', () => {
    const invalidData = {
      name: 'Acme Dev Team',
      slug: 'acme dev team!',
    };
    const result = createTeamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should pass if slug contains numbers and hyphens', () => {
    const validData = {
      name: 'Acme Team 2',
      slug: 'acme-team-2',
    };
    const result = createTeamSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
