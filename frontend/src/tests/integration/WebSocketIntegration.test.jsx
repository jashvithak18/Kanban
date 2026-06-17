import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import KanbanBoard from '../../components/KanbanBoard.jsx';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true
};

vi.mock('socket.io-client', () => {
  return {
    default: () => mockSocket,
    io: () => mockSocket
  };
});

// Mock react-select
vi.mock('react-select', () => {
  return {
    default: () => <div />
  };
});

describe('WebSocket Integration Tests', () => {
  let handlers = {};

  beforeEach(() => {
    handlers = {};
    mockSocket.on.mockImplementation((event, cb) => {
      handlers[event] = cb;
    });
    mockSocket.emit.mockClear();
    mockSocket.connected = true;
  });

  const renderAndInit = () => {
    render(<KanbanBoard />);
    
    // Simulate socket connect
    act(() => {
      if (handlers['connect']) {
        handlers['connect']();
      }
    });

    const initialTasks = [
      {
        id: 'task-1',
        title: 'Task 1 in Todo',
        description: 'Description 1',
        column: 'todo',
        priority: 'low',
        category: 'feature',
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Trigger initial tasks sync
    act(() => {
      if (handlers['sync:tasks']) {
        handlers['sync:tasks']({ tasks: initialTasks });
      }
    });
  };

  it('sync:tasks event populates the board with tasks', () => {
    renderAndInit();
    expect(screen.getByText('Task 1 in Todo')).toBeInTheDocument();
  });

  it('task:created event adds a new card to To Do column', () => {
    renderAndInit();
    
    const newTask = {
      id: 'task-2',
      title: 'Newly Created Task',
      description: 'Desc 2',
      column: 'todo',
      priority: 'medium',
      category: 'bug',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    act(() => {
      if (handlers['task:created']) {
        handlers['task:created'](newTask);
      }
    });

    expect(screen.getByText('Newly Created Task')).toBeInTheDocument();
    const todoCol = screen.getByTestId('column-todo');
    expect(todoCol).toHaveTextContent('Newly Created Task');
  });

  it('task:moved event moves card to correct column', () => {
    renderAndInit();

    const movedTask = {
      id: 'task-1',
      title: 'Task 1 in Todo',
      description: 'Description 1',
      column: 'inprogress', // Move from todo to inprogress
      priority: 'low',
      category: 'feature',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    act(() => {
      if (handlers['task:moved']) {
        handlers['task:moved'](movedTask);
      }
    });

    const todoCol = screen.getByTestId('column-todo');
    const inprogressCol = screen.getByTestId('column-inprogress');

    expect(todoCol).not.toHaveTextContent('Task 1 in Todo');
    expect(inprogressCol).toHaveTextContent('Task 1 in Todo');
  });

  it('task:deleted event removes card from board', () => {
    renderAndInit();
    expect(screen.getByText('Task 1 in Todo')).toBeInTheDocument();

    act(() => {
      if (handlers['task:deleted']) {
        handlers['task:deleted']({ id: 'task-1' });
      }
    });

    expect(screen.queryByText('Task 1 in Todo')).not.toBeInTheDocument();
  });

  it('task:updated event updates task title in place', () => {
    renderAndInit();
    expect(screen.getByText('Task 1 in Todo')).toBeInTheDocument();

    const updatedTask = {
      id: 'task-1',
      title: 'Updated Title Task 1',
      description: 'Description 1',
      column: 'todo',
      priority: 'low',
      category: 'feature',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    act(() => {
      if (handlers['task:updated']) {
        handlers['task:updated'](updatedTask);
      }
    });

    expect(screen.getByText('Updated Title Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 1 in Todo')).not.toBeInTheDocument();
  });

  it('disconnected socket shows ConnectionBanner and reconnected socket hides ConnectionBanner', () => {
    renderAndInit();

    // Trigger disconnect event on mock socket
    act(() => {
      if (handlers['disconnect']) {
        handlers['disconnect']();
      }
    });

    expect(screen.getByTestId('connection-banner')).toBeInTheDocument();

    // Trigger reconnect
    act(() => {
      if (handlers['connect']) {
        handlers['connect']();
      }
    });

    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });
});
