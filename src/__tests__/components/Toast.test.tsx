import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ToastItem } from '../../components/Toast';

describe('ToastItem Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render success toast', () => {
    const toast = {
      id: '1',
      type: 'success' as const,
      title: 'Success!',
      message: 'Operation completed',
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should render error toast', () => {
    const toast = {
      id: '2',
      type: 'error' as const,
      title: 'Error!',
      message: 'Something went wrong',
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render warning toast', () => {
    const toast = {
      id: '3',
      type: 'warning' as const,
      title: 'Warning!',
      message: 'Please be careful',
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Warning!')).toBeInTheDocument();
    expect(screen.getByText('Please be careful')).toBeInTheDocument();
  });

  it('should render info toast', () => {
    const toast = {
      id: '4',
      type: 'info' as const,
      title: 'Info',
      message: 'For your information',
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('For your information')).toBeInTheDocument();
  });

  it('should auto-dismiss after duration', async () => {
    const toast = {
      id: '5',
      type: 'success' as const,
      title: 'Quick message',
      duration: 100,
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    await waitFor(() => expect(mockOnClose).toHaveBeenCalledWith('5'), {
      timeout: 200,
    });
  });

  it('should render without message', () => {
    const toast = {
      id: '6',
      type: 'success' as const,
      title: 'Only title',
    };

    render(<ToastItem toast={toast} onClose={mockOnClose} />);

    expect(screen.getByText('Only title')).toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
