export const testUsers = {
  validUser1: {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
  },
  validUser2: {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'AnotherPass456@',
  },
  validUser3: {
    username: 'test_user',
    email: 'test@example.com',
    password: 'TestPassword789#',
  },
};

export const testPosts = {
  validPost1: {
    content: 'Hello world! This is my first post.',
  },
  validPost2: {
    content: 'Another great day for coding! @john_doe what do you think?',
  },
  validPost3: {
    content: 'Just finished a great project. Feeling accomplished!',
  },
  postWithMentions: {
    content: 'Hey @jane_smith and @test_user, check out this cool feature!',
  },
};

export const testComments = {
  validComment1: {
    content: 'Great post!',
  },
  validComment2: {
    content: 'I totally agree with this perspective.',
  },
  validComment3: {
    content: 'Thanks for sharing this insight!',
  },
};

export const createTestUser = (overrides: Partial<typeof testUsers.validUser1> = {}) => ({
  ...testUsers.validUser1,
  ...overrides,
});

export const createTestPost = (overrides: Partial<typeof testPosts.validPost1> = {}) => ({
  ...testPosts.validPost1,
  ...overrides,
});

export const createTestComment = (overrides: Partial<typeof testComments.validComment1> = {}) => ({
  ...testComments.validComment1,
  ...overrides,
});
