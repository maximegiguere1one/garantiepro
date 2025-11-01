# Code Quality Enforcement Guide

## Overview
This document outlines the enterprise-grade code quality standards implemented in this project.

---

## 🎯 Quick Start

### Run All Quality Checks
```bash
npm run validate
```

This runs:
1. TypeScript type checking
2. ESLint
3. Prettier format checking
4. All unit tests

### Fix Issues Automatically
```bash
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
```

---

## 📋 Installed Tools

### 1. ESLint
**Purpose**: Identify and fix code problems

**Configuration**: `eslint.config.js`

**Rules Enforced**:
- TypeScript best practices
- React hooks rules
- Security patterns
- Code complexity limits
- No console.log in production
- Consistent imports
- Promise handling

**Run manually**:
```bash
npm run lint         # Check for issues
npm run lint:fix     # Fix automatically
```

### 2. Prettier
**Purpose**: Consistent code formatting

**Configuration**: `.prettierrc`

**Settings**:
- Single quotes
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)
- Semicolons required

**Run manually**:
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### 3. Husky
**Purpose**: Git hooks for quality gates

**Location**: `.husky/` directory

**Hooks Configured**:
- pre-commit: Run linting and formatting on staged files
- pre-push: Run full validation suite

**Setup** (when git is initialized):
```bash
npx husky init
```

### 4. lint-staged
**Purpose**: Run linters on staged git files only

**Configuration**: `package.json` → `lint-staged`

**Actions**:
- TypeScript files: ESLint + Prettier
- JSON/CSS/MD files: Prettier only

---

## 📚 Documentation

### Architecture & Patterns
- **File**: `ARCHITECTURE.md`
- **Contents**: SOLID principles, Clean Architecture, Design Patterns
- **Read this to**: Understand project structure and design decisions

### Custom Rules
- **File**: `.eslintrc.custom-rules.md`
- **Contents**: Project-specific coding patterns and rules
- **Read this to**: Learn project conventions and best practices

### Code Review Checklist
- **File**: `CODE_REVIEW_CHECKLIST.md`
- **Contents**: Comprehensive checklist for code reviews
- **Use this to**: Ensure thorough, consistent code reviews

---

## 🛠 Development Workflow

### Before Committing
```bash
# 1. Check your changes
npm run lint

# 2. Fix any issues
npm run lint:fix

# 3. Format code
npm run format

# 4. Verify types
npm run typecheck

# 5. Run tests
npm run test:run

# 6. Or run everything at once
npm run validate
```

### During Code Review
1. Run automated checks: `npm run validate`
2. Use `CODE_REVIEW_CHECKLIST.md`
3. Focus on business logic and architecture
4. Verify tests cover critical paths
5. Check for security issues
6. Ensure documentation is updated

### When Adding Features
1. Follow patterns in `ARCHITECTURE.md`
2. Adhere to rules in `.eslintrc.custom-rules.md`
3. Write tests for new functionality
4. Update documentation
5. Run full validation suite

---

## 🎨 Code Style Guidelines

### Naming Conventions
```typescript
// Components: PascalCase
function UserDashboard() {}

// Variables/functions: camelCase
const userName = 'John';
function getUserName() {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// Types/Interfaces: PascalCase
interface UserData {}
type UserId = string;

// Private properties: _camelCase
class User {
  private _password: string;
}

// Boolean variables: is/has/should prefix
const isActive = true;
const hasPermission = false;
const shouldUpdate = true;
```

### File Organization
```typescript
// 1. Imports - grouped and sorted
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/common/Button';
import type { User } from '@/types';

// 2. Types and Interfaces
interface ComponentProps {
  user: User;
  onSave: () => void;
}

// 3. Constants
const MAX_ITEMS = 100;

// 4. Component/Function
export function Component({ user, onSave }: ComponentProps) {
  // 4a. Hooks
  const [state, setState] = useState();

  // 4b. Effects
  useEffect(() => {}, []);

  // 4c. Event handlers
  const handleClick = () => {};

  // 4d. Render
  return <div />;
}

// 5. Helper functions (if small and specific to this file)
function helperFunction() {}
```

### Function Size Guidelines
- **Small**: < 20 lines (ideal)
- **Medium**: 20-50 lines (acceptable)
- **Large**: > 50 lines (consider refactoring)

### File Size Guidelines
- **Small**: < 200 lines (ideal)
- **Medium**: 200-500 lines (acceptable)
- **Large**: > 500 lines (refactor required)

---

## 🔒 Security Best Practices

### 1. Never Expose Secrets
```typescript
// ❌ BAD
const apiKey = 'sk_live_abc123';
console.log('API Key:', process.env.API_KEY);

// ✅ GOOD
const apiKey = process.env.VITE_API_KEY;
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
console.log('API Key configured:', !!apiKey);
```

### 2. Validate All Input
```typescript
// ❌ BAD
function updateUser(data: any) {
  return supabase.from('users').update(data);
}

// ✅ GOOD
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().positive().max(150),
});

function updateUser(data: unknown) {
  const validated = updateUserSchema.parse(data);
  return supabase.from('users').update(validated);
}
```

### 3. Use RLS Always
```sql
-- Every table must have RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies must check authentication
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

---

## ⚡ Performance Guidelines

### React Performance
```typescript
// 1. Memoize expensive computations
const expensiveValue = useMemo(() =>
  computeExpensiveValue(data),
  [data]
);

// 2. Memoize callbacks
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// 3. Memoize components
const MemoizedComponent = React.memo(Component);

// 4. Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

### Database Performance
```typescript
// ❌ BAD - N+1 query
const users = await supabase.from('users').select('*');
for (const user of users) {
  const posts = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id);
}

// ✅ GOOD - Single query with join
const { data } = await supabase
  .from('users')
  .select('*, posts(*)');
```

---

## ✅ Testing Standards

### Test Structure
```typescript
describe('ComponentName', () => {
  // Group related tests
  describe('when user is authenticated', () => {
    it('should render dashboard', () => {
      // Arrange
      const user = createMockUser();

      // Act
      render(<Dashboard user={user} />);

      // Assert
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('should redirect to login', () => {
      // Test implementation
    });
  });
});
```

### Coverage Goals
- **Critical paths**: 80%+ coverage
- **Business logic**: 90%+ coverage
- **UI components**: 60%+ coverage

---

## 📊 Metrics & Monitoring

### Code Quality Metrics
- **Complexity**: Max cyclomatic complexity of 20
- **File size**: Max 500 lines per file
- **Function size**: Max 50 lines per function
- **Nesting depth**: Max 4 levels

### Build Metrics
- **Build time**: < 1 minute
- **Bundle size**: Monitor with warnings at 500KB
- **Type checking**: Must pass with no errors

---

## 🚀 CI/CD Integration

### GitHub Actions (example)
```yaml
name: Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run validate
```

---

## 🔧 Troubleshooting

### ESLint Issues
```bash
# Clear ESLint cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Prettier Conflicts
```bash
# Check which files have formatting issues
npm run format:check

# Auto-fix all files
npm run format
```

### TypeScript Errors
```bash
# Clean build
npm run typecheck

# Check specific file
npx tsc --noEmit src/path/to/file.ts
```

---

## 📖 Additional Resources

- [ESLint Rules Documentation](https://eslint.org/docs/rules/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 🎓 Training Resources

### For New Team Members
1. Read `ARCHITECTURE.md` - Understand design principles
2. Review `.eslintrc.custom-rules.md` - Learn project conventions
3. Study `CODE_REVIEW_CHECKLIST.md` - Know review standards
4. Practice with `npm run validate` - Get feedback early

### For Code Reviewers
1. Use `CODE_REVIEW_CHECKLIST.md` for every review
2. Focus on architecture and business logic
3. Automated checks handle style issues
4. Provide constructive, specific feedback

---

## 📞 Support

For questions or suggestions about code quality:
1. Check documentation files first
2. Ask in team chat
3. Create an issue for new rules/patterns
4. Propose changes via pull request

---

**Remember**: Code quality is everyone's responsibility. Write code that your future self will thank you for!

---

*Last updated: [Date]*
*Maintained by: Development Team*
