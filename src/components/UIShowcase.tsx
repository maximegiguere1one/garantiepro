import { useState } from 'react';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardFooter, StatCard } from './common/Card';
import { FormField, Input, Select, Checkbox } from './common/FormField';
import { Modal, ConfirmModal } from './common/Modal';
import { Accordion, AccordionItem } from './common/Accordion';
import { Tooltip } from './common/Tooltip';
import { ProgressBar, CircularProgress, Stepper } from './common/ProgressBar';
import { BarChart, MetricCard, DonutChart, Timeline } from './common/DataViz';
import { CardSkeleton } from './common/SkeletonLoader';
import {
  Save,
  Trash2,
  Edit,
  Download,
  Upload,
  Mail,
  Lock,
  User,
  DollarSign,
  TrendingUp,
  Shield,
  Settings,
  Bell,
  HelpCircle,
} from 'lucide-react';

export function UIShowcase() {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            UI Component Showcase
          </h1>
          <p className="text-slate-600">
            Comprehensive demonstration of all available UI components
          </p>
        </div>

        {/* Buttons Section */}
        <section className="animate-slide-in-up">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Buttons</h2>
          <Card>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                    With Icon
                  </Button>
                  <Button variant="primary" loading={loading} onClick={handleAction}>
                    Loading State
                  </Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-animation">
            <StatCard
              label="Total Revenue"
              value="$45,231"
              icon={<DollarSign className="w-6 h-6" />}
              color="emerald"
              trend={{ value: 12.5, isPositive: true }}
              subtitle="Last 30 days"
            />
            <StatCard
              label="Active Warranties"
              value="1,234"
              icon={<Shield className="w-6 h-6" />}
              color="blue"
              subtitle="89% of total"
            />
            <StatCard
              label="Growth Rate"
              value="+23%"
              icon={<TrendingUp className="w-6 h-6" />}
              color="orange"
              trend={{ value: 8.2, isPositive: true }}
            />
          </div>
        </section>

        {/* Forms Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Form Elements</h2>
          <Card>
            <CardContent>
              <form className="space-y-6">
                <FormField
                  label="Email"
                  required
                  helpText="We'll never share your email"
                  hint="user@example.com"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    leftIcon={<Mail className="w-5 h-5" />}
                  />
                </FormField>

                <FormField
                  label="Password"
                  required
                  error="Password must be at least 8 characters"
                >
                  <Input
                    type="password"
                    placeholder="Enter password"
                    leftIcon={<Lock className="w-5 h-5" />}
                    error
                  />
                </FormField>

                <FormField label="Country" required>
                  <Select>
                    <option>Select a country</option>
                    <option>Canada</option>
                    <option>United States</option>
                    <option>Mexico</option>
                  </Select>
                </FormField>

                <Checkbox label="I agree to the terms and conditions" />

                <div className="flex gap-3">
                  <Button variant="primary" type="submit">
                    Submit
                  </Button>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Progress Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Progress Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Linear Progress" />
              <CardContent>
                <div className="space-y-6">
                  <ProgressBar value={45} showLabel />
                  <ProgressBar value={75} variant="success" showLabel animated />
                  <ProgressBar value={30} variant="warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Circular Progress" />
              <CardContent>
                <div className="flex justify-center">
                  <CircularProgress value={65} variant="primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stepper Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Stepper</h2>
          <Card>
            <CardContent>
              <Stepper
                steps={[
                  { label: 'Account', description: 'Basic information' },
                  { label: 'Profile', description: 'Personal details' },
                  { label: 'Preferences', description: 'Customize settings' },
                  { label: 'Complete', description: 'Review and finish' },
                ]}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </CardContent>
          </Card>
        </section>

        {/* Data Visualization Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Data Visualization</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Monthly Sales" />
              <CardContent>
                <BarChart
                  data={[
                    { label: 'Jan', value: 120, color: 'bg-primary-500' },
                    { label: 'Feb', value: 150, color: 'bg-primary-500' },
                    { label: 'Mar', value: 180, color: 'bg-primary-500' },
                    { label: 'Apr', value: 160, color: 'bg-primary-500' },
                    { label: 'May', value: 200, color: 'bg-primary-500' },
                  ]}
                  height={200}
                  showValues
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Status Distribution" />
              <CardContent>
                <div className="flex justify-center">
                  <DonutChart
                    data={[
                      { label: 'Active', value: 45, color: '#10b981' },
                      { label: 'Pending', value: 30, color: '#f59e0b' },
                      { label: 'Expired', value: 25, color: '#ef4444' },
                    ]}
                    centerLabel="Total"
                    centerValue="100"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Timeline</h2>
          <Card>
            <CardContent>
              <Timeline
                items={[
                  {
                    label: 'Order Placed',
                    date: '2024-01-15 10:30',
                    description: 'Order received and confirmed',
                    status: 'completed',
                  },
                  {
                    label: 'Processing',
                    date: '2024-01-16 09:00',
                    description: 'Order is being prepared',
                    status: 'completed',
                  },
                  {
                    label: 'Shipped',
                    date: '2024-01-17 14:20',
                    description: 'Package has been shipped',
                    status: 'current',
                  },
                  {
                    label: 'Delivered',
                    date: 'Expected: 2024-01-20',
                    description: 'Package will be delivered',
                    status: 'upcoming',
                  },
                ]}
              />
            </CardContent>
          </Card>
        </section>

        {/* Accordion Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Accordion</h2>
          <Accordion>
            <AccordionItem
              id="general"
              title="General Settings"
              icon={<Settings className="w-5 h-5" />}
              defaultOpen
            >
              <p className="text-slate-600">
                Configure general application settings, language preferences, and default behaviors.
              </p>
            </AccordionItem>
            <AccordionItem
              id="notifications"
              title="Notifications"
              icon={<Bell className="w-5 h-5" />}
            >
              <p className="text-slate-600">
                Manage email, push, and in-app notification preferences.
              </p>
            </AccordionItem>
            <AccordionItem
              id="security"
              title="Security"
              icon={<Lock className="w-5 h-5" />}
            >
              <p className="text-slate-600">
                Configure security settings, two-factor authentication, and session management.
              </p>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Loading States Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </section>

        {/* Interactive Section */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Interactive Components</h2>
          <Card>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  Open Modal
                </Button>
                <Button variant="danger" onClick={() => setShowConfirm(true)}>
                  Delete with Confirmation
                </Button>
                <Tooltip content="This is a helpful tooltip" position="top">
                  <Button variant="outline" leftIcon={<HelpCircle className="w-4 h-4" />}>
                    Hover for Tooltip
                  </Button>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Modals */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Example Modal"
          size="md"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setShowModal(false)}>
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              This is an example modal dialog with proper focus management, keyboard navigation,
              and accessibility features.
            </p>
            <FormField label="Example Input">
              <Input placeholder="Type something..." />
            </FormField>
          </div>
        </Modal>

        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            console.log('Confirmed!');
          }}
          title="Confirm Deletion"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </div>
  );
}
