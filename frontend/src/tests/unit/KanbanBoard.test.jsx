import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock react-select to render as a normal HTML select so that tests can interact with it easily
vi.mock('react-select', () => {
  return {
    default: ({ options, value, onChange }) => {
      return (
        <select
          value={value ? value.value : ''}
          onChange={(e) => {
            const selected = options.find((o) => o.value === e.target.value);
            onChange(selected);
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
  };
});

describe('KanbanBoard Unit Tests', () => {
  let handlers = {};

  beforeEach(() => {
    handlers = {};
    mockSocket.on.mockImplementation((event, cb) => {
      handlers[event] = cb;
    });
    mockSocket.emit.mockClear();
    mockSocket.connected = true;
  });

  const renderBoardWithTasks = async () => {
    render(<KanbanBoard />);
    
    // Simulate socket connect event first so that connected state is true
    act(() => {
      if (handlers['connect']) {
        handlers['connect']();
      }
    });

    const sampleTasks = [
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
      },
      {
        id: 'task-2',
        title: 'Task 2 in Done',
        description: 'Description 2',
        column: 'done',
        priority: 'high',
        category: 'bug',
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Trigger initial synchronization of tasks
    act(() => {
      if (handlers['sync:tasks']) {
        handlers['sync:tasks']({ tasks: sampleTasks });
      }
    });
  };

  it('renders Kanban board title — FlowBoard', async () => {
    await renderBoardWithTasks();
    expect(screen.getAllByText('FlowBoard')[0]).toBeInTheDocument();
  });

  it('renders three columns: To Do, In Progress, Done', async () => {
    await renderBoardWithTasks();
    expect(screen.getByTestId('column-todo')).toBeInTheDocument();
    expect(screen.getByTestId('column-inprogress')).toBeInTheDocument();
    expect(screen.getByTestId('column-done')).toBeInTheDocument();
  });

  it('shows loading skeleton when not yet connected', () => {
    render(<KanbanBoard />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('+ New Task button opens modal', async () => {
    await renderBoardWithTasks();
    const newBtn = screen.getByTestId('new-task-btn');
    await userEvent.click(newBtn);
    expect(screen.getByTestId('task-modal')).toBeInTheDocument();
  });

  it('can type into task title input', async () => {
    await renderBoardWithTasks();
    await userEvent.click(screen.getByTestId('new-task-btn'));

    const titleInput = screen.getByPlaceholderText('e.g., Fix WebSocket sync bug');
    await userEvent.type(titleInput, 'E2E test creation');
    expect(titleInput.value).toBe('E2E test creation');
  });

  it('can select priority from dropdown', async () => {
    await renderBoardWithTasks();
    await userEvent.click(screen.getByTestId('new-task-btn'));

    const modal = screen.getByTestId('task-modal');
    const prioritySelect = within(modal).getByTestId('priority-select').querySelector('select');
    await userEvent.selectOptions(prioritySelect, 'high');
    expect(prioritySelect.value).toBe('high');
  });

  it('submit creates task via socket emit', async () => {
    await renderBoardWithTasks();
    await userEvent.click(screen.getByTestId('new-task-btn'));

    const titleInput = screen.getByPlaceholderText('e.g., Fix WebSocket sync bug');
    await userEvent.type(titleInput, 'Socket emitted task');

    const submitBtn = screen.getByTestId('submit-task');
    await userEvent.click(submitBtn);

    expect(mockSocket.emit).toHaveBeenCalledWith('task:create', {
      title: 'Socket emitted task',
      description: '',
      priority: 'medium', // Default
      category: 'feature', // Default
      attachments: []
    });
  });

  it('delete button calls deleteTask', async () => {
    await renderBoardWithTasks();
    const deleteBtn = screen.getByTestId('delete-task-task-1');
    await userEvent.click(deleteBtn);

    expect(mockSocket.emit).toHaveBeenCalledWith('task:delete', { id: 'task-1' });
  });

  it('search input filters displayed tasks', async () => {
    await renderBoardWithTasks();
    expect(screen.getByText('Task 1 in Todo')).toBeInTheDocument();
    expect(screen.getByText('Task 2 in Done')).toBeInTheDocument();

    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'Task 1');

    expect(screen.getByText('Task 1 in Todo')).toBeInTheDocument();
    expect(screen.queryByText('Task 2 in Done')).not.toBeInTheDocument();
  });

  it('renders ProgressDashboard section', async () => {
    await renderBoardWithTasks();
    expect(screen.getByText('Task Distribution')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
  });
});
