import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDefaultSuperAdminEmail,
  isSuperAdmin,
  isAdmin,
  canModifyUserRole,
  validateUsername,
  UserSession
} from './security';

test('isDefaultSuperAdminEmail correctly identifies hardcoded super admin emails', () => {
  assert.equal(isDefaultSuperAdminEmail('likedf88@gmail.com'), true);
  assert.equal(isDefaultSuperAdminEmail('cmoney20262626@gmail.com'), true);
  assert.equal(isDefaultSuperAdminEmail('LIKEDF88@GMAIL.COM'), true);
  assert.equal(isDefaultSuperAdminEmail('otheruser@example.com'), false);
});

test('isSuperAdmin verifies role and default admin session', () => {
  const superAdminSession: UserSession = {
    id: '1',
    email: 'likedf88@gmail.com',
    username: 'likedf88',
    role: 'SUPER_ADMIN'
  };
  const regularSession: UserSession = {
    id: '2',
    email: 'normal@test.com',
    username: 'normal',
    role: 'USER'
  };
  assert.equal(isSuperAdmin(superAdminSession), true);
  assert.equal(isSuperAdmin(regularSession), false);
  assert.equal(isAdmin(regularSession), false);
});

test('canModifyUserRole prevents revoking privileges of default super admins', () => {
  const superAdminSession: UserSession = {
    id: '1',
    email: 'likedf88@gmail.com',
    username: 'likedf88',
    role: 'SUPER_ADMIN'
  };
  const regularSession: UserSession = {
    id: '2',
    email: 'normal@test.com',
    username: 'normal',
    role: 'USER'
  };

  // Regular user cannot modify roles
  const res1 = canModifyUserRole(regularSession, 'someone@test.com', 'ADMIN');
  assert.equal(res1.allowed, false);

  // Super admin cannot demote default super admin
  const res2 = canModifyUserRole(superAdminSession, 'cmoney20262626@gmail.com', 'USER');
  assert.equal(res2.allowed, false);

  // Super admin CAN promote standard user
  const res3 = canModifyUserRole(superAdminSession, 'someone@test.com', 'ADMIN');
  assert.equal(res3.allowed, true);
});

test('validateUsername enforces constraints', () => {
  assert.equal(validateUsername('cy').valid, false);
  assert.equal(validateUsername('valid_user_99').valid, true);
  assert.equal(validateUsername('bad user!').valid, false);
});
