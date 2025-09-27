
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat } from '@/hooks/use-chat';
import type { ReactNode } from 'react';

// Mock the error handler hook
vi.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: () => 'mock-uuid-' + Math.random(),
} as any;

describe('useChat', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentConversationId).toBeUndefined();
  });

  it('loads conversation when topic is provided', async () => {
    const mockConversation = {
      id: 'conv-1',
      messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'Hello',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConversation),
    });

    const { result } = renderHook(() => useChat({ topic: 'self-awareness' }), { wrapper });

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockConversation.messages);
      expect(result.current.currentConversationId).toBe('conv-1');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('adds user message when sendMessage is called', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'AI response' }),
    });

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('Hello', 'self-awareness');
    });

    expect(result.current.messages).toHaveLength(2); // User message + AI response
    expect(result.current.messages[0].sender).toBe('user');
    expect(result.current.messages[0].text).toBe('Hello');
    expect(result.current.messages[1].sender).toBe('ai');
    expect(result.current.messages[1].text).toBe('AI response');
  });

  it('handles chat API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('Hello', 'self-awareness');
    });

    // Should have user message and error message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].text).toContain('having trouble processing');
  });

  it('clears messages when clearMessages is called', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    // Add a message first
    act(() => {
      result.current.sendMessage('Hello', 'self-awareness');
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.currentConversationId).toBeUndefined();
  });
});
