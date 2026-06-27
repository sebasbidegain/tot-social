const { body, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

const schemas = {
  register: [
    body('username').trim().isAlphanumeric().isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 alphanumeric characters'),
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email required'),
    body('password').isLength({ min: 8, max: 128 })
      .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/\d/).withMessage('Must contain a digit'),
    body('display_name').optional().trim().isLength({ max: 100 }),
  ],

  login: [
    body('login').trim().notEmpty().withMessage('Email or username required'),
    body('password').notEmpty().withMessage('Password required'),
  ],

  createThought: [
    body('content').trim().isLength({ min: 1, max: 5000 })
      .customSanitizer(v => DOMPurify.sanitize(v, { ALLOWED_TAGS: [] }))
      .withMessage('Content must be 1-5000 characters'),
  ],

  createComment: [
    body('content').trim().isLength({ min: 1, max: 2000 })
      .customSanitizer(v => DOMPurify.sanitize(v, { ALLOWED_TAGS: [] }))
      .withMessage('Comment must be 1-2000 characters'),
  ],

  updateProfile: [
    body('display_name').optional().trim().isLength({ max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 })
      .customSanitizer(v => DOMPurify.sanitize(v, { ALLOWED_TAGS: [] })),
  ],

  changePassword: [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8, max: 128 })
      .matches(/[a-z]/).matches(/[A-Z]/).matches(/\d/),
  ],

  createReport: [
    body('type').isIn(['thought', 'comment', 'user']).withMessage('Invalid report type'),
    body('id').isInt({ min: 1 }).withMessage('Invalid ID'),
    body('reason').trim().isLength({ min: 5, max: 1000 }).withMessage('Reason must be 5-1000 characters'),
  ],

  sendMessage: [
    body('content').trim().isLength({ min: 1, max: 5000 })
      .customSanitizer(v => DOMPurify.sanitize(v, { ALLOWED_TAGS: [] }))
      .withMessage('Message must be 1-5000 characters'),
  ],

  updateTheme: [
    body('theme').isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  ],
};

function validate(schemaName) {
  const rules = schemas[schemaName];
  if (!rules) throw new Error(`Unknown validation schema: ${schemaName}`);

  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      next();
    },
  ];
}

module.exports = { validate };
