
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import Chat from '@/pages/chat';
import { Toaster } from '@/components/ui/toaster';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Chat Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderChatPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <Chat />
          <Toaster />
        </Router>
      </QueryClientProvider>
    );
  };

  it('allows user to send message and receive response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Hello! How can I help you with your leadership development today?',
      }),
    });

    renderChatPage();

    const textarea = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(textarea, { target: { value: 'Hello, I need help with team communication' } });
    fireEvent.click(sendButton);

    // Check user message appears
    expect(screen.getByText('Hello, I need help with team communication')).toBeInTheDocument();

    // Check typing indicator appears
    expect(screen.getByText(/typing/i)).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText(/Hello! How can I help you with your leadership development today?/)).toBeInTheDocument();
    });

    // Check typing indicator disappears
    expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server error'));

    renderChatPage();

    const textarea = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/having trouble processing/i)).toBeInTheDocument();
    });
  });
});
