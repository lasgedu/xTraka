const THRESHOLDS = {
  AUTO_APPROVE: 70,
  REVIEW: 40,
}

const DEFAULTS = {
  JWT_EXPIRES_IN: '1d',
  BADGE: 'Beginner',
  LANGUAGE: 'igbo',
}

const BADGES = [
  { name: 'Beginner', minApproved: 0 },
  { name: 'Intermediate', minApproved: 101 },
  { name: 'Expert', minApproved: 201 },
]

module.exports = { THRESHOLDS, DEFAULTS, BADGES }
