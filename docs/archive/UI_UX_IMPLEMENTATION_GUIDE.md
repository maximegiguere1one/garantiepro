# UI/UX Implementation Guide

## Quick Start for Developers

This guide helps you integrate the new UI/UX components into your features.

---

## 1. New Components Available

### Import Paths

```typescript
// Buttons
import { Button } from './components/common/Button';

// Cards
import { Card, CardHeader, CardContent, CardFooter, StatCard } from './components/common/Card';

// Forms
import { FormField, Input, Select, Checkbox } from './components/common/FormField';

// Loading States
import { Skeleton, CardSkeleton, TableSkeleton, FormSkeleton } from './components/common/SkeletonLoader';

// Modals
import { Modal, ConfirmModal } from './components/common/Modal';

// Progressive Disclosure
import { Accordion, AccordionItem } from './components/common/Accordion';

// Tooltips
import { Tooltip } from './components/common/Tooltip';

// Progress
import { ProgressBar, CircularProgress, Stepper } from './components/common/ProgressBar';

// Data Visualization
import { BarChart, MetricCard, DonutChart, Timeline } from './components/common/DataViz';
```

---

## 2. Common Patterns

### Loading States

**Before:**
```tsx
{loading && <div className="spinner">Loading...</div>}
{!loading && <div>Content</div>}
```

**After:**
```tsx
{loading ? <CardSkeleton /> : <Card>Content</Card>}
```

### Buttons with Loading

**Before:**
```tsx
<button disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

**After:**
```tsx
<Button loading={loading}>Submit</Button>
```

### Form Fields

**Before:**
```tsx
<div>
  <label>Email</label>
  <input type="email" />
  {error && <span>{error}</span>}
</div>
```

**After:**
```tsx
<FormField label="Email" required error={error} helpText="We'll never share your email">
  <Input
    type="email"
    leftIcon={<Mail className="w-5 h-5" />}
    error={!!error}
  />
</FormField>
```

### Statistics Display

**Before:**
```tsx
<div className="stat-card">
  <h3>Total Revenue</h3>
  <p>$12,345</p>
</div>
```

**After:**
```tsx
<StatCard
  label="Total Revenue"
  value="$12,345"
  icon={<DollarSign className="w-6 h-6" />}
  color="emerald"
  trend={{ value: 12.5, isPositive: true }}
/>
```

---

## 3. Animation Best Practices

### Entry Animations

Add to container elements:
```tsx
<div className="animate-fade-in">
  {/* Content */}
</div>
```

For staggered lists:
```tsx
<div className="stagger-animation">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>
```

### Hover Effects

For cards that should lift on hover:
```tsx
<Card hoverable>
  {/* Content */}
</Card>
```

Or use utility class:
```tsx
<div className="hover-lift">
  {/* Content */}
</div>
```

---

## 4. Accessibility Checklist

### For All Interactive Elements

- ✅ Keyboard accessible (Tab, Enter, Space)
- ✅ Focus indicators visible
- ✅ ARIA labels where needed
- ✅ Proper heading hierarchy
- ✅ Error states announced

### For Forms

```tsx
<FormField
  label="Username"           // Accessible label
  required                   // Shows required indicator
  error={errors.username}    // Error announcement
  helpText="3-20 characters" // Helper text
>
  <Input
    aria-invalid={!!errors.username}
    aria-describedby="username-help"
  />
</FormField>
```

### For Modals

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Settings"           // Accessible title
  closeOnEscape             // Keyboard support
>
  {/* Content */}
</Modal>
```

---

## 5. Responsive Design

### Mobile-First Approach

Use Tailwind's responsive classes:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### Touch Targets

Ensure minimum 44x44px on mobile:
```tsx
<Button size="lg" className="min-h-[44px] min-w-[44px]">
  Action
</Button>
```

---

## 6. Color System

### Semantic Colors

```tsx
// Success
<Button variant="success">Save</Button>
<StatCard color="emerald" />

// Danger/Error
<Button variant="danger">Delete</Button>
<StatCard color="red" />

// Primary Actions
<Button variant="primary">Continue</Button>
<StatCard color="blue" />

// Secondary Actions
<Button variant="secondary">Cancel</Button>
<StatCard color="slate" />

// Warning
<StatCard color="orange" />
```

---

## 7. Data Visualization Examples

### Bar Chart

```tsx
<BarChart
  data={[
    { label: 'Jan', value: 120, color: 'bg-blue-500' },
    { label: 'Feb', value: 150, color: 'bg-blue-500' },
    { label: 'Mar', value: 180, color: 'bg-blue-500' }
  ]}
  height={200}
  showValues
/>
```

### Donut Chart

```tsx
<DonutChart
  data={[
    { label: 'Active', value: 45, color: '#10b981' },
    { label: 'Pending', value: 30, color: '#f59e0b' },
    { label: 'Expired', value: 25, color: '#ef4444' }
  ]}
  centerLabel="Total"
  centerValue="100"
/>
```

### Timeline

```tsx
<Timeline
  items={[
    {
      label: 'Order Placed',
      date: '2024-01-15',
      description: 'Order received and confirmed',
      status: 'completed'
    },
    {
      label: 'Processing',
      date: '2024-01-16',
      status: 'current'
    },
    {
      label: 'Delivered',
      date: 'Expected: 2024-01-20',
      status: 'upcoming'
    }
  ]}
/>
```

---

## 8. Progressive Disclosure

### Accordion for Settings

```tsx
<Accordion>
  <AccordionItem
    id="general"
    title="General Settings"
    icon={<Settings />}
    defaultOpen
  >
    <div className="space-y-4">
      {/* Settings form */}
    </div>
  </AccordionItem>

  <AccordionItem
    id="notifications"
    title="Notifications"
    icon={<Bell />}
  >
    <div className="space-y-4">
      {/* Notification settings */}
    </div>
  </AccordionItem>
</Accordion>
```

---

## 9. Modal Workflows

### Simple Modal

```tsx
const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Open Settings</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
  size="lg"
  footer={
    <div className="flex gap-3 justify-end">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  }
>
  {/* Settings form */}
</Modal>
```

### Confirmation Dialog

```tsx
const [showConfirm, setShowConfirm] = useState(false);

<Button variant="danger" onClick={() => setShowConfirm(true)}>
  Delete
</Button>

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Confirm Deletion"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  variant="danger"
  loading={isDeleting}
/>
```

---

## 10. Progress Indicators

### Linear Progress

```tsx
// Simple progress
<ProgressBar value={progress} max={100} />

// With label and animation
<ProgressBar
  value={uploadProgress}
  variant="success"
  showLabel
  animated
/>
```

### Circular Progress

```tsx
<CircularProgress
  value={completionPercentage}
  size={120}
  variant="primary"
  showLabel
/>
```

### Multi-Step Process

```tsx
<Stepper
  steps={[
    { label: 'Account Info', description: 'Basic details' },
    { label: 'Verification', description: 'Verify email' },
    { label: 'Complete', description: 'Finish setup' }
  ]}
  currentStep={currentStep}
  onStepClick={(step) => setCurrentStep(step)}
/>
```

---

## 11. Performance Tips

### Lazy Load Heavy Components

```tsx
const HeavyChart = lazy(() => import('./HeavyChart'));

<Suspense fallback={<CardSkeleton />}>
  <HeavyChart data={chartData} />
</Suspense>
```

### Memoize Expensive Calculations

```tsx
const processedData = useMemo(
  () => processLargeDataset(data),
  [data]
);
```

### Debounce User Input

```tsx
const debouncedSearch = useMemo(
  () => debounce((value) => performSearch(value), 300),
  []
);
```

---

## 12. Testing Your Components

### Visual Testing

```tsx
// Test all states
<Button variant="primary">Default</Button>
<Button variant="primary" disabled>Disabled</Button>
<Button variant="primary" loading>Loading</Button>
```

### Accessibility Testing

```tsx
// Verify keyboard navigation
screen.getByRole('button', { name: 'Submit' });
userEvent.tab();
userEvent.type('{enter}');

// Check ARIA attributes
expect(screen.getByRole('alert')).toBeInTheDocument();
```

---

## 13. Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Missing loading state
{data && <Table data={data} />}

// Poor button styling
<button className="blue-button">Click</button>

// No error handling
<Input value={value} onChange={onChange} />

// Hardcoded colors
<div className="bg-blue-500">Content</div>
```

### ✅ Do This Instead

```tsx
// Proper loading state
{loading ? <TableSkeleton /> : <Table data={data} />}

// Use Button component
<Button variant="primary">Click</Button>

// Proper error handling
<FormField label="Email" error={errors.email}>
  <Input
    value={value}
    onChange={onChange}
    error={!!errors.email}
  />
</FormField>

// Use semantic colors
<StatCard color="blue">Content</StatCard>
```

---

## 14. Migration Checklist

When updating existing components:

- [ ] Replace native buttons with `<Button>` component
- [ ] Add loading states with skeletons
- [ ] Enhance forms with `<FormField>` wrapper
- [ ] Add proper error handling and feedback
- [ ] Implement keyboard navigation
- [ ] Add ARIA labels where needed
- [ ] Test with screen reader
- [ ] Verify mobile responsiveness
- [ ] Check color contrast ratios
- [ ] Add animation classes for polish

---

## 15. Getting Help

### Component Documentation
- All components have JSDoc comments
- TypeScript provides inline documentation
- Refer to `UI_UX_ENHANCEMENTS_SUMMARY.md` for details

### Common Questions

**Q: How do I customize colors?**
A: Use the `color` prop on components or Tailwind classes

**Q: Can I disable animations?**
A: Yes, animations respect `prefers-reduced-motion`

**Q: Are components mobile-friendly?**
A: Yes, all components are responsive by default

**Q: How do I add dark mode?**
A: This is planned for a future update

---

## Conclusion

These components provide a solid foundation for building accessible, performant, and beautiful user interfaces. Follow these patterns for consistency and maintainability across the application.

**Key Principles:**
1. Always provide loading states
2. Handle errors gracefully
3. Make it keyboard accessible
4. Test on mobile devices
5. Use semantic HTML
6. Follow the design system
7. Add meaningful animations
8. Optimize for performance

Happy coding! 🚀
