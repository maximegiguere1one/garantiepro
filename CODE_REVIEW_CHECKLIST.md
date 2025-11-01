# Code Review Checklist

## Purpose
This checklist ensures consistent, high-quality code reviews that catch issues early and maintain code standards.

---

## Pre-Review (Author)

Before submitting for review, ensure:

- [ ] Code builds successfully (`npm run build`)
- [ ] All tests pass (`npm run test:run`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] No console.log statements remain (except intentional logging)
- [ ] Self-review completed
- [ ] Commit messages are clear and descriptive

---

## Business Logic Correctness

### Functionality
- [ ] Code implements the intended feature/fix correctly
- [ ] Edge cases are handled appropriately
- [ ] Business rules are correctly implemented
- [ ] Data validation is complete and accurate
- [ ] Calculations are mathematically correct
- [ ] Workflows follow the expected sequence

### Data Integrity
- [ ] Database operations maintain referential integrity
- [ ] Transactions are used where needed
- [ ] Race conditions are prevented
- [ ] Data migrations are backwards compatible
- [ ] No data loss scenarios exist

### User Experience
- [ ] User feedback is clear and helpful
- [ ] Loading states are shown appropriately
- [ ] Error messages are user-friendly
- [ ] Success confirmations are displayed
- [ ] Form validation is intuitive

---

## Error Handling Completeness

### Try-Catch Blocks
- [ ] All async operations have error handling
- [ ] Errors are caught at appropriate levels
- [ ] Error recovery strategies are implemented
- [ ] Fallback values are sensible

### Error Logging
- [ ] Errors are logged with sufficient context
- [ ] Sensitive data is not logged
- [ ] Error severity levels are appropriate
- [ ] Stack traces are preserved

### User-Facing Errors
- [ ] Error messages are clear and actionable
- [ ] Technical jargon is avoided
- [ ] Errors don't expose internal details
- [ ] Recovery instructions are provided

### Null Safety
- [ ] Null/undefined checks are present
- [ ] Optional chaining is used appropriately
- [ ] Nullish coalescing provides sensible defaults
- [ ] TypeScript strict null checks are satisfied

---

## Performance Implications

### React Performance
- [ ] Components are properly memoized (useMemo, useCallback, React.memo)
- [ ] Unnecessary re-renders are prevented
- [ ] Large lists use virtualization
- [ ] Expensive computations are memoized
- [ ] useEffect dependencies are minimal and correct

### Database Performance
- [ ] Queries use appropriate indexes
- [ ] N+1 queries are avoided
- [ ] Pagination is implemented for large datasets
- [ ] Unnecessary data fetching is eliminated
- [ ] Query complexity is reasonable

### Bundle Size
- [ ] Large libraries are code-split
- [ ] Tree-shaking is utilized
- [ ] Dynamic imports are used for heavy components
- [ ] Unused dependencies are removed

### Caching
- [ ] React Query caching is configured appropriately
- [ ] Cache invalidation is correct
- [ ] Stale-while-revalidate strategy is used where appropriate

---

## Security Considerations

### Authentication & Authorization
- [ ] Authentication is verified on all protected routes
- [ ] Authorization checks are present and correct
- [ ] Row Level Security policies are properly configured
- [ ] JWT tokens are validated
- [ ] Session management is secure

### Input Validation
- [ ] All user input is validated on the frontend
- [ ] Backend validation is present (RLS, database constraints)
- [ ] SQL injection prevention is in place
- [ ] XSS vulnerabilities are prevented
- [ ] CSRF protection is implemented where needed

### Data Protection
- [ ] Sensitive data is not logged
- [ ] API keys are not exposed in frontend code
- [ ] Environment variables are used for secrets
- [ ] Passwords are never stored in plain text
- [ ] PII is handled according to privacy policies

### Third-Party Dependencies
- [ ] New dependencies are from trusted sources
- [ ] Dependencies are kept up to date
- [ ] Known vulnerabilities are addressed
- [ ] License compatibility is verified

---

## Testing Coverage

### Unit Tests
- [ ] Core business logic is tested
- [ ] Utility functions have tests
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Test names are descriptive

### Integration Tests
- [ ] Component interactions are tested
- [ ] API integrations are tested
- [ ] Database operations are tested
- [ ] End-to-end workflows are covered

### Test Quality
- [ ] Tests are deterministic (no flakiness)
- [ ] Tests are fast
- [ ] Mocks are used appropriately
- [ ] Test data is representative
- [ ] Assertions are meaningful

### Coverage Metrics
- [ ] Critical paths have > 80% coverage
- [ ] New code maintains or improves coverage
- [ ] Untested code is documented with reason

---

## Documentation Quality

### Code Comments
- [ ] Complex logic is explained
- [ ] Non-obvious decisions are documented
- [ ] TODOs have context and owner
- [ ] Comments are up to date with code
- [ ] Comments explain "why", not "what"

### Function Documentation
- [ ] Public APIs are documented
- [ ] Parameters are described
- [ ] Return values are documented
- [ ] Exceptions are documented
- [ ] Examples are provided for complex functions

### Type Definitions
- [ ] Types are explicit and accurate
- [ ] Interfaces are well-named
- [ ] Generic types are used appropriately
- [ ] Type aliases improve readability
- [ ] Types are exported when needed

### README Updates
- [ ] New features are documented
- [ ] Setup instructions are current
- [ ] Environment variables are listed
- [ ] Breaking changes are highlighted

---

## Code Quality Standards

### Naming Conventions
- [ ] Variables have clear, descriptive names
- [ ] Functions describe what they do
- [ ] Boolean variables are prefixed (is, has, should)
- [ ] Constants are UPPER_SNAKE_CASE
- [ ] TypeScript interfaces are PascalCase

### Code Organization
- [ ] Single Responsibility Principle is followed
- [ ] Functions are small and focused (< 50 lines)
- [ ] Files are appropriately sized (< 500 lines)
- [ ] Related code is grouped together
- [ ] Imports are organized

### Code Duplication
- [ ] No copy-pasted code
- [ ] Common logic is extracted to utilities
- [ ] Similar components are refactored
- [ ] Configuration is centralized

### SOLID Principles
- [ ] Single Responsibility: Each module has one purpose
- [ ] Open/Closed: Code is extensible without modification
- [ ] Liskov Substitution: Subtypes are substitutable
- [ ] Interface Segregation: Interfaces are specific
- [ ] Dependency Inversion: Depend on abstractions

---

## Accessibility

### Semantic HTML
- [ ] Proper HTML5 elements are used
- [ ] Headings follow logical hierarchy
- [ ] Lists use ul/ol elements
- [ ] Forms use label elements

### ARIA
- [ ] ARIA labels are present where needed
- [ ] ARIA roles are appropriate
- [ ] ARIA states are updated correctly
- [ ] Landmarks are used for navigation

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Focus states are visible
- [ ] Tab order is logical
- [ ] Escape key closes modals/dialogs
- [ ] Enter/Space activate buttons

### Screen Reader Support
- [ ] Images have alt text
- [ ] Icons have labels
- [ ] Status messages are announced
- [ ] Loading states are communicated

### Color & Contrast
- [ ] Text has sufficient contrast (WCAG AA)
- [ ] Color is not the only indicator
- [ ] Focus indicators are visible
- [ ] Error states are accessible

---

## Style & Formatting

### Consistency
- [ ] Code follows project style guide
- [ ] Prettier formatting is applied
- [ ] ESLint rules are satisfied
- [ ] TypeScript strict mode is used

### Readability
- [ ] Indentation is consistent
- [ ] Line length is reasonable (< 100 chars)
- [ ] Spacing improves readability
- [ ] Complex expressions are broken up

---

## Database & Migrations

### Schema Changes
- [ ] Migrations are idempotent
- [ ] Migrations have descriptive names
- [ ] Rollback strategy exists
- [ ] Data migrations preserve existing data
- [ ] Indexes are added for new queries

### Row Level Security
- [ ] RLS is enabled on new tables
- [ ] Policies are restrictive by default
- [ ] Policies check authentication
- [ ] Policies prevent unauthorized access

### Performance
- [ ] Queries are optimized
- [ ] Indexes support common queries
- [ ] Foreign keys have indexes
- [ ] EXPLAIN ANALYZE shows reasonable performance

---

## Configuration & Environment

### Environment Variables
- [ ] All required variables are documented
- [ ] .env.example is updated
- [ ] Sensitive values are not committed
- [ ] Default values are sensible
- [ ] Type validation is present

### Feature Flags
- [ ] New features can be toggled
- [ ] Flag names are descriptive
- [ ] Cleanup plan for old flags exists

---

## Git & Version Control

### Commits
- [ ] Commits are atomic and focused
- [ ] Commit messages follow convention
- [ ] Sensitive data is not committed
- [ ] Large files are not committed

### Branch Management
- [ ] Branch is up to date with main
- [ ] Conflicts are resolved correctly
- [ ] Branch name is descriptive

### Pull Request
- [ ] PR description is clear and complete
- [ ] Related issues are linked
- [ ] Breaking changes are highlighted
- [ ] Screenshots/videos for UI changes

---

## API Design (if applicable)

### REST Principles
- [ ] Endpoints follow RESTful conventions
- [ ] HTTP methods are appropriate
- [ ] Status codes are correct
- [ ] Response formats are consistent

### Validation
- [ ] Input validation is comprehensive
- [ ] Error responses are helpful
- [ ] Rate limiting is considered
- [ ] Request size limits are enforced

### Versioning
- [ ] API versioning strategy is followed
- [ ] Breaking changes bump version
- [ ] Deprecation warnings are provided

---

## Monitoring & Observability

### Logging
- [ ] Important events are logged
- [ ] Log levels are appropriate
- [ ] Log messages are searchable
- [ ] Correlation IDs are used

### Error Tracking
- [ ] Errors are reported to monitoring system
- [ ] Error context is included
- [ ] Error deduplication is configured
- [ ] Alerts are set for critical errors

### Performance Monitoring
- [ ] Key metrics are tracked
- [ ] Slow queries are identified
- [ ] Performance budgets are met

---

## Deployment Considerations

### Build Process
- [ ] Build succeeds in CI/CD
- [ ] No build warnings
- [ ] Assets are optimized
- [ ] Source maps are generated

### Rollback Plan
- [ ] Changes can be safely reverted
- [ ] Database migrations are reversible
- [ ] Feature flags enable quick disable

### Zero Downtime
- [ ] Changes don't break existing functionality
- [ ] Backward compatibility is maintained
- [ ] Graceful degradation is implemented

---

## Review Outcome

### Approval Criteria
- [ ] All required items are checked
- [ ] No blocking issues remain
- [ ] Minor issues have follow-up tasks
- [ ] Documentation is complete
- [ ] Tests are comprehensive

### Follow-up Actions
- [ ] Create tickets for technical debt
- [ ] Schedule refactoring if needed
- [ ] Update team documentation
- [ ] Share learnings with team

---

## Reviewer Notes

*Use this space for specific feedback, suggestions, or questions*

### Strengths
-

### Areas for Improvement
-

### Questions
-

### Action Items
-

---

## Sign-off

**Reviewer:** _______________
**Date:** _______________
**Status:** ⬜ Approved ⬜ Changes Requested ⬜ Rejected

---

## Quick Reference

### Priority Levels
- **🔴 Blocking**: Must be fixed before merge
- **🟡 Important**: Should be addressed soon
- **🟢 Nice to have**: Suggestion for improvement

### Common Issues
- Missing error handling
- No input validation
- Unused imports/variables
- Missing tests
- Poor naming
- Hardcoded values
- Console.log statements
- Missing types
- Security vulnerabilities
- Performance issues

---

*Last updated: [Date]*
*Version: 1.0*
