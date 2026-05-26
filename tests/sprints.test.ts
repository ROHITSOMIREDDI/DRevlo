import { describe, it, expect } from 'vitest';
import { sprintCreateSchema } from '../app/api/sprints/route';
import { sprintUpdateSchema } from '../app/api/sprints/[id]/route';

describe('Sprint Creation Schema Validation', () => {
  const validTeamId = '2c9f219d-fb16-493c-ab51-8dcd22a5c0c6';

  it('should pass on valid sprint details', () => {
    const validData = {
      teamId: validTeamId,
      name: 'Sprint 1 - Initial MVP',
      startDate: '2026-05-01T09:00:00.000Z',
      endDate: '2026-05-15T09:00:00.000Z',
      velocity: 15,
    };
    const result = sprintCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if name is empty', () => {
    const invalidData = {
      teamId: validTeamId,
      name: '',
      startDate: '2026-05-01T09:00:00.000Z',
      endDate: '2026-05-15T09:00:00.000Z',
      velocity: 15,
    };
    const result = sprintCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if start date is after end date', () => {
    const invalidData = {
      teamId: validTeamId,
      name: 'Sprint 2',
      startDate: '2026-05-20T09:00:00.000Z',
      endDate: '2026-05-15T09:00:00.000Z',
      velocity: 15,
    };
    const result = sprintCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if velocity is negative', () => {
    const invalidData = {
      teamId: validTeamId,
      name: 'Sprint 2',
      startDate: '2026-05-01T09:00:00.000Z',
      endDate: '2026-05-15T09:00:00.000Z',
      velocity: -5,
    };
    const result = sprintCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Sprint Update Schema Validation', () => {
  it('should pass on valid partial update details', () => {
    const validData = {
      name: 'Sprint 1 - Revamped',
      velocity: 20,
    };
    const result = sprintUpdateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if velocity is negative on update', () => {
    const invalidData = {
      velocity: -1,
    };
    const result = sprintUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
