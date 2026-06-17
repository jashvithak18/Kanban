import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function useWebSocket() {
  const [tasks, setTasks] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const socket = io(backendUrl);
    socketRef.current = socket;

    if (typeof window !== 'undefined') {
      window.socket = socket;
    }

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('sync:tasks', ({ tasks: initialTasks }) => {
      setTasks(initialTasks);
      setLoading(false);
    });

    socket.on('task:created', (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
      toast.success(`Task "${newTask.title}" created successfully!`);
    });

    socket.on('task:updated', (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      toast.success(`Task "${updatedTask.title}" updated!`);
    });

    socket.on('task:moved', (movedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === movedTask.id ? movedTask : t)));
      toast.success(`Task "${movedTask.title}" moved to ${movedTask.column}!`);
    });

    socket.on('task:deleted', ({ id }) => {
      setTasks((prev) => {
        const deletedTask = prev.find((t) => t.id === id);
        if (deletedTask) {
          toast.success(`Task "${deletedTask.title}" deleted.`);
        }
        return prev.filter((t) => t.id !== id);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitWithCheck = (event, data) => {
    if (!connected || !socketRef.current) {
      toast.error('Unable to send. Socket disconnected!');
      return;
    }
    socketRef.current.emit(event, data);
  };

  const createTask = (data) => {
    emitWithCheck('task:create', data);
  };

  const updateTask = (id, fields) => {
    emitWithCheck('task:update', { id, ...fields });
  };

  const moveTask = (id, column) => {
    emitWithCheck('task:move', { id, column });
  };

  const deleteTask = (id) => {
    emitWithCheck('task:delete', { id });
  };

  const attachToTask = (id, attachment) => {
    emitWithCheck('task:attach', { id, attachment });
  };

  return {
    tasks,
    connected,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    attachToTask,
    socket: socketRef.current,
  };
}
