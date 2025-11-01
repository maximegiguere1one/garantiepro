# Architecture & Design Principles

## Table of Contents
1. [SOLID Principles](#solid-principles)
2. [Clean Architecture Layers](#clean-architecture-layers)
3. [Design Patterns](#design-patterns)
4. [Project Structure](#project-structure)
5. [Data Flow](#data-flow)
6. [State Management](#state-management)

---

## SOLID Principles

### S - Single Responsibility Principle (SRP)

**Principle**: A class/module should have one, and only one, reason to change.

#### Examples in this project:

```typescript
// ❌ BAD - Component doing too much
function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetching data
  const fetchUsers = async () => {
    const response = await fetch('/api/users');
    setUsers(await response.json());
  };

  // Formatting data
  const formatUser = (user) => `${user.firstName} ${user.lastName}`;

  // Rendering UI
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{formatUser(user)}</div>
      ))}
    </div>
  );
}

// ✅ GOOD - Separated concerns
// Data fetching service
export const userService = {
  fetchAll: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  }
};

// Formatting utility
export const formatUserName = (user: User): string =>
  `${user.firstName} ${user.lastName}`;

// UI Component
function UserDashboard() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.fetchAll
  });

  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### O - Open/Closed Principle (OCP)

**Principle**: Software entities should be open for extension but closed for modification.

```typescript
// ❌ BAD - Need to modify function for new payment methods
function processPayment(method: string, amount: number) {
  if (method === 'credit_card') {
    return processCreditCard(amount);
  } else if (method === 'paypal') {
    return processPayPal(amount);
  }
  // Have to modify this function to add new methods
}

// ✅ GOOD - Extensible through interfaces
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class CreditCardProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> {
    // Credit card processing logic
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> {
    // PayPal processing logic
  }
}

class PaymentService {
  constructor(private processor: PaymentProcessor) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    return this.processor.process(amount);
  }
}

// Easy to add new processors without modifying existing code
class StripeProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> {
    // Stripe processing logic
  }
}
```

### L - Liskov Substitution Principle (LSP)

**Principle**: Derived classes must be substitutable for their base classes.

```typescript
// ❌ BAD - Violates LSP
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(width: number) {
    this.width = width;
  }

  setHeight(height: number) {
    this.height = height;
  }

  getArea(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  setWidth(width: number) {
    this.width = width;
    this.height = width; // Breaks substitutability
  }

  setHeight(height: number) {
    this.width = height;
    this.height = height; // Breaks substitutability
  }
}

// ✅ GOOD - Proper abstraction
interface Shape {
  getArea(): number;
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}

  getArea(): number {
    return this.width * this.height;
  }
}

class Square implements Shape {
  constructor(private size: number) {}

  getArea(): number {
    return this.size * this.size;
  }
}
```

### I - Interface Segregation Principle (ISP)

**Principle**: Clients should not be forced to depend on interfaces they don't use.

```typescript
// ❌ BAD - Fat interface
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  code(): void;
}

class Human implements Worker {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
  code() { /* ... */ }
}

class Robot implements Worker {
  work() { /* ... */ }
  eat() { /* Not applicable */ }     // Forced to implement
  sleep() { /* Not applicable */ }   // Forced to implement
  code() { /* ... */ }
}

// ✅ GOOD - Segregated interfaces
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

interface Codeable {
  code(): void;
}

class Human implements Workable, Eatable, Sleepable, Codeable {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
  code() { /* ... */ }
}

class Robot implements Workable, Codeable {
  work() { /* ... */ }
  code() { /* ... */ }
}
```

### D - Dependency Inversion Principle (DIP)

**Principle**: High-level modules should not depend on low-level modules. Both should depend on abstractions.

```typescript
// ❌ BAD - High-level depends on low-level
class EmailService {
  send(to: string, message: string) {
    // Direct implementation
    console.log(`Sending email to ${to}: ${message}`);
  }
}

class UserService {
  private emailService = new EmailService(); // Direct dependency

  createUser(email: string) {
    // ...
    this.emailService.send(email, 'Welcome!');
  }
}

// ✅ GOOD - Both depend on abstraction
interface INotificationService {
  send(to: string, message: string): Promise<void>;
}

class EmailService implements INotificationService {
  async send(to: string, message: string): Promise<void> {
    // Email implementation
  }
}

class SMSService implements INotificationService {
  async send(to: string, message: string): Promise<void> {
    // SMS implementation
  }
}

class UserService {
  constructor(private notificationService: INotificationService) {}

  async createUser(contact: string) {
    // ...
    await this.notificationService.send(contact, 'Welcome!');
  }
}
```

---

## Clean Architecture Layers

### 1. Presentation Layer (UI Components)
- Location: `src/components/`
- Responsibility: User interface and interaction
- Dependencies: Only hooks and contexts

### 2. Application Layer (Business Logic)
- Location: `src/hooks/`, `src/contexts/`
- Responsibility: Application-specific business rules
- Dependencies: Services and utilities

### 3. Domain Layer (Core Business Logic)
- Location: `src/lib/`
- Responsibility: Pure business logic, no framework dependencies
- Dependencies: Only other domain modules

### 4. Infrastructure Layer (External Services)
- Location: `src/services/`
- Responsibility: Database, APIs, external integrations
- Dependencies: Supabase, third-party libraries

### Layer Dependencies:
```
Presentation → Application → Domain → Infrastructure
                    ↓
              (Abstractions)
```

---

## Design Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access logic

```typescript
// Repository interface
interface IWarrantyRepository {
  findAll(filters?: WarrantyFilters): Promise<Warranty[]>;
  findById(id: string): Promise<Warranty | null>;
  create(data: CreateWarrantyDto): Promise<Warranty>;
  update(id: string, data: UpdateWarrantyDto): Promise<Warranty>;
  delete(id: string): Promise<void>;
}

// Supabase implementation
class SupabaseWarrantyRepository implements IWarrantyRepository {
  async findAll(filters?: WarrantyFilters): Promise<Warranty[]> {
    let query = supabase.from('warranties').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // ... other methods
}
```

### 2. Factory Pattern

**Purpose**: Create objects without specifying exact class

```typescript
interface PDFGenerator {
  generate(data: InvoiceData): Promise<Blob>;
}

class PDFGeneratorFactory {
  static create(type: 'contract' | 'invoice' | 'merchant'): PDFGenerator {
    switch (type) {
      case 'contract':
        return new ContractPDFGenerator();
      case 'invoice':
        return new InvoicePDFGenerator();
      case 'merchant':
        return new MerchantPDFGenerator();
      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }
  }
}
```

### 3. Strategy Pattern

**Purpose**: Define family of algorithms, encapsulate each one

```typescript
interface PricingStrategy {
  calculate(basePrice: number, options: WarrantyOptions): number;
}

class StandardPricing implements PricingStrategy {
  calculate(basePrice: number, options: WarrantyOptions): number {
    return basePrice + options.additionalCoverage * 100;
  }
}

class PremiumPricing implements PricingStrategy {
  calculate(basePrice: number, options: WarrantyOptions): number {
    return basePrice * 1.2 + options.additionalCoverage * 150;
  }
}

class WarrantyPricingService {
  constructor(private strategy: PricingStrategy) {}

  calculatePrice(warranty: Warranty): number {
    return this.strategy.calculate(
      warranty.basePrice,
      warranty.options
    );
  }

  setStrategy(strategy: PricingStrategy) {
    this.strategy = strategy;
  }
}
```

### 4. Observer Pattern (Event System)

**Purpose**: Define one-to-many dependency between objects

```typescript
type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on<T>(event: string, callback: EventCallback<T>) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit<T>(event: string, data: T) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off<T>(event: string, callback: EventCallback<T>) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// Usage
const eventBus = new EventBus();

// Subscribe
eventBus.on('warranty:created', (warranty: Warranty) => {
  console.log('New warranty created:', warranty.id);
  sendNotificationEmail(warranty);
});

// Publish
eventBus.emit('warranty:created', newWarranty);
```

### 5. Command Pattern (CQRS)

**Purpose**: Separate read and write operations

```typescript
// Commands (Write operations)
interface Command<T> {
  execute(): Promise<T>;
}

class CreateWarrantyCommand implements Command<Warranty> {
  constructor(private data: CreateWarrantyDto) {}

  async execute(): Promise<Warranty> {
    // Validation
    this.validate();

    // Business logic
    const warranty = await warrantyRepository.create(this.data);

    // Side effects
    await eventBus.emit('warranty:created', warranty);

    return warranty;
  }

  private validate() {
    if (!this.data.customerId) {
      throw new Error('Customer ID is required');
    }
  }
}

// Queries (Read operations)
interface Query<T> {
  execute(): Promise<T>;
}

class GetWarrantyQuery implements Query<Warranty | null> {
  constructor(private id: string) {}

  async execute(): Promise<Warranty | null> {
    return warrantyRepository.findById(this.id);
  }
}

// Usage
const createCommand = new CreateWarrantyCommand(warrantyData);
const warranty = await createCommand.execute();

const getQuery = new GetWarrantyQuery(warrantyId);
const foundWarranty = await getQuery.execute();
```

---

## Project Structure

```
src/
├── components/          # Presentation Layer
│   ├── common/         # Reusable UI components
│   ├── forms/          # Form components
│   ├── dashboard/      # Dashboard-specific components
│   └── settings/       # Settings components
│
├── contexts/           # Application Layer - State Management
│   ├── AuthContext.tsx
│   ├── ToastContext.tsx
│   └── OrganizationContext.tsx
│
├── hooks/              # Application Layer - Custom Hooks
│   ├── useWarranties.ts
│   ├── useAuth.ts
│   └── useSettings.ts
│
├── lib/                # Domain Layer - Business Logic
│   ├── validation/     # Validation schemas
│   ├── utils/          # Pure utilities
│   └── constants.ts    # Constants
│
├── services/           # Infrastructure Layer
│   ├── WarrantyService.ts
│   ├── PDFService.ts
│   └── EmailService.ts
│
└── types/              # Shared Types
    └── database.types.ts
```

---

## Data Flow

### Read Flow (Query)
```
User Action → Component → Hook → Query → Repository → Database
                                    ↓
                                 Cache
                                    ↓
                              Component Update
```

### Write Flow (Command)
```
User Action → Component → Hook → Command → Validation
                                      ↓
                                  Repository
                                      ↓
                                  Database
                                      ↓
                                Event Bus
                                      ↓
                              Side Effects (Email, Logs)
                                      ↓
                               Cache Invalidation
                                      ↓
                               Component Update
```

---

## State Management

### 1. Local Component State
Use `useState` for UI-only state that doesn't need to be shared.

### 2. Context API
Use Context for application-wide state (Auth, Theme, Organization).

### 3. React Query
Use for server state management (caching, synchronization).

### 4. Form State
Use controlled components with validation.

### State Hierarchy:
```
Server State (React Query)
    ↓
Application State (Context)
    ↓
Component State (useState)
```

---

## Best Practices Summary

1. **Separation of Concerns**: Keep business logic separate from UI
2. **Dependency Injection**: Pass dependencies explicitly
3. **Error Boundaries**: Wrap components in error boundaries
4. **Type Safety**: Use TypeScript strictly
5. **Testing**: Write tests for business logic
6. **Documentation**: Document complex logic
7. **Performance**: Memoize expensive computations
8. **Security**: Validate all inputs, use RLS
9. **Accessibility**: Support keyboard navigation, screen readers
10. **Monitoring**: Log errors and important events

---

## Continuous Evolution

This architecture should evolve as the project grows. Regular reviews and refactoring keep the codebase maintainable.
