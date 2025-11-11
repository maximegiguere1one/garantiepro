# Component Quick Reference Card

## 🎯 Most Used Components

### Button
```tsx
<Button variant="primary|secondary|outline|ghost|danger|success"
        size="sm|md|lg"
        loading={boolean}
        leftIcon={<Icon />}>
  Text
</Button>
```

### Card
```tsx
<Card variant="default|bordered|elevated|glass" hoverable padding="sm|md|lg">
  <CardHeader title="Title" subtitle="Subtitle" action={<Button />} />
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### StatCard
```tsx
<StatCard
  label="Label"
  value="123"
  icon={<Icon />}
  color="blue|emerald|orange|slate|red"
  trend={{ value: 12, isPositive: true }}
  subtitle="Additional info"
/>
```

### Form Field
```tsx
<FormField label="Label" required error={error} helpText="Help" hint="hint">
  <Input
    leftIcon={<Icon />}
    rightIcon={<Icon />}
    error={!!error}
  />
</FormField>
```

### Modal
```tsx
<Modal isOpen={open} onClose={close} title="Title" size="sm|md|lg|xl">
  Content
</Modal>

<ConfirmModal
  isOpen={open}
  onClose={close}
  onConfirm={confirm}
  title="Title"
  message="Message"
  variant="danger|warning|info"
/>
```

### Loading States
```tsx
<Skeleton variant="text|circular|rectangular|rounded" />
<CardSkeleton />
<TableSkeleton rows={5} />
<FormSkeleton />
```

### Progress
```tsx
<ProgressBar value={75} variant="success" showLabel animated />
<CircularProgress value={65} size={120} />
<Stepper steps={[...]} currentStep={1} onStepClick={fn} />
```

### Accordion
```tsx
<Accordion>
  <AccordionItem id="1" title="Title" icon={<Icon />} defaultOpen>
    Content
  </AccordionItem>
</Accordion>
```

### Tooltip
```tsx
<Tooltip content="Tooltip text" position="top|bottom|left|right">
  <Button>Hover me</Button>
</Tooltip>
```

---

## 🎨 Animation Classes

```css
/* Entry Animations */
.animate-fade-in
.animate-slide-in-up
.animate-slide-in-left
.animate-slide-in-right
.animate-scale-in

/* Effects */
.hover-lift          /* Card elevation on hover */
.glass-effect        /* Glassmorphism */
.skeleton           /* Loading placeholder */
.button-ripple      /* Click ripple effect */

/* Staggered Lists */
.stagger-animation  /* Auto-delays children */
```

---

## 🎯 Color Props

```tsx
// Use these values:
color="blue"
color="emerald"  // Success/positive
color="orange"   // Warning
color="red"      // Danger/error
color="slate"    // Neutral
```

---

## ♿ Accessibility Checklist

```tsx
✅ <Button>                    // Keyboard accessible
✅ <FormField label="..." />   // Proper labels
✅ error={errors.field}        // Error announcements
✅ <Modal closeOnEscape />     // Keyboard support
✅ role="alert"                // Screen reader support
✅ aria-label="..."            // ARIA labels
```

---

## 📱 Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Auto-responsive */}
</div>
```

---

## 🚀 Performance

```tsx
// Lazy load heavy components
const Heavy = lazy(() => import('./Heavy'));
<Suspense fallback={<Skeleton />}>
  <Heavy />
</Suspense>

// Show skeleton while loading
{loading ? <CardSkeleton /> : <Card>Data</Card>}

// Memoize expensive calculations
const result = useMemo(() => expensive(data), [data]);
```

---

## 📊 Data Visualization

```tsx
<BarChart data={[{label, value, color}]} height={200} />
<DonutChart data={[{label, value, color}]} centerValue="100" />
<Timeline items={[{label, date, status}]} />
<MetricCard label="..." value="..." icon={<Icon />} />
```

---

## 🔥 Common Patterns

### Loading → Content
```tsx
{loading ? <CardSkeleton /> : <Card>{data}</Card>}
```

### Button with Loading
```tsx
<Button loading={submitting} onClick={submit}>
  Submit
</Button>
```

### Error State
```tsx
<FormField error={errors.email}>
  <Input error={!!errors.email} />
</FormField>
```

### Confirm Delete
```tsx
<ConfirmModal
  variant="danger"
  title="Delete Item"
  message="Are you sure?"
  onConfirm={handleDelete}
/>
```

---

## 💡 Pro Tips

1. Always add loading states
2. Use `<Tooltip>` for icon-only buttons
3. Prefer `<StatCard>` over custom stat layouts
4. Add `hoverable` to clickable cards
5. Use `stagger-animation` for lists
6. Test keyboard navigation
7. Check mobile on real devices
8. Use semantic color props

---

## 📁 Import Paths

```tsx
import { Button } from './components/common/Button';
import { Card, StatCard } from './components/common/Card';
import { FormField, Input } from './components/common/FormField';
import { Modal, ConfirmModal } from './components/common/Modal';
import { Skeleton, CardSkeleton } from './components/common/SkeletonLoader';
import { ProgressBar, Stepper } from './components/common/ProgressBar';
import { Accordion, AccordionItem } from './components/common/Accordion';
import { Tooltip } from './components/common/Tooltip';
import { BarChart, Timeline } from './components/common/DataViz';
```

---

## 🐛 Debugging

### Component Not Showing?
- Check if `isOpen` is true (modals)
- Verify data isn't empty
- Check z-index conflicts
- Inspect console for errors

### Animation Not Working?
- Check `prefers-reduced-motion` setting
- Verify class name spelling
- Check parent overflow: hidden

### Form Not Validating?
- Ensure error prop is passed
- Check error state logic
- Verify FormField structure

---

**Need More Help?**
- Read `UI_UX_IMPLEMENTATION_GUIDE.md`
- See `UI_UX_ENHANCEMENTS_SUMMARY.md`
- Check component JSDoc comments
