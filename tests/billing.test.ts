import { describe, it, expect } from 'vitest';

interface TeamLimits {
  ownerPlan: 'FREE' | 'PRO';
  memberCount: number;
  repoCount: number;
}

function checkCanInviteMember(limits: TeamLimits): boolean {
  if (limits.ownerPlan === 'FREE' && limits.memberCount >= 3) {
    return false;
  }
  return true;
}

function checkCanConnectRepository(limits: TeamLimits): boolean {
  if (limits.ownerPlan === 'FREE' && limits.repoCount >= 2) {
    return false;
  }
  return true;
}

describe('Free Tier Plan Limits Gating', () => {
  describe('Team Members Limit Checks', () => {
    it('should allow invitations if under the Free plan maximum capacity', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'FREE',
        memberCount: 2,
        repoCount: 1,
      };
      expect(checkCanInviteMember(workspace)).toBe(true);
    });

    it('should reject invitations if the Free plan limit of 3 members is reached', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'FREE',
        memberCount: 3,
        repoCount: 1,
      };
      expect(checkCanInviteMember(workspace)).toBe(false);
    });

    it('should ignore member count limits if the owner is on the Pro plan', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'PRO',
        memberCount: 15,
        repoCount: 5,
      };
      expect(checkCanInviteMember(workspace)).toBe(true);
    });
  });

  describe('Repositories Connection Limit Checks', () => {
    it('should allow connecting a repository if under the Free plan capacity of 2', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'FREE',
        memberCount: 2,
        repoCount: 1,
      };
      expect(checkCanConnectRepository(workspace)).toBe(true);
    });

    it('should reject connecting a repository if the Free plan capacity of 2 is reached', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'FREE',
        memberCount: 2,
        repoCount: 2,
      };
      expect(checkCanConnectRepository(workspace)).toBe(false);
    });

    it('should allow connecting unlimited repositories if the owner is on the Pro plan', () => {
      const workspace: TeamLimits = {
        ownerPlan: 'PRO',
        memberCount: 2,
        repoCount: 25,
      };
      expect(checkCanConnectRepository(workspace)).toBe(true);
    });
  });
});
