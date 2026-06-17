import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor
} from '@dnd-kit/core';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';
import useWebSocket from '../hooks/useWebSocket.js';
import Column from './Column.jsx';
import TaskCard from './TaskCard.jsx';
import TaskModal from './TaskModal.jsx';
import ProgressDashboard from './ProgressDashboard.jsx';
import ConnectionBanner from './ConnectionBanner.jsx';

const priorityFilterOptions = [
  { value: 'all', label: '🔍 All Priorities' },
  { value: 'low', label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high', label: '🔴 High' }
];

const categoryFilterOptions = [
  { value: 'all', label: '🔍 All Categories' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'feature', label: '✨ Feature' },
  { value: 'enhancement', label: '🚀 Enhancement' }
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? 'var(--accent1)' : 'var(--border)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(124, 58, 237, 0.2)' : 'none',
    '&:hover': {
      borderColor: 'var(--accent1)'
    },
    borderRadius: '8px',
    fontFamily: 'Space Grotesk',
    minWidth: '160px',
    backgroundColor: '#FFFFFF'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'var(--accent1)'
      : state.isFocused
      ? 'var(--surface2)'
      : 'transparent',
    color: state.isSelected ? '#ffffff' : 'var(--text)',
    fontFamily: 'Space Grotesk'
  })
};

// Simple Animated Counter Component
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 800; // ms
    const incrementTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, incrementTime || 20);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

// Skeleton Card component
function SkeletonCard() {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      border: '1px solid rgba(124, 58, 237, 0.1)'
    }}>
      <div className="skeleton" style={{ height: '18px', width: '70%', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <div className="skeleton" style={{ height: '16px', width: '50px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '16px', width: '60px', borderRadius: '8px' }} />
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const {
    tasks,
    connected,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    attachToTask
  } = useWebSocket();

  // Local filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState(priorityFilterOptions[0]);
  const [categoryFilter, setCategoryFilter] = useState(categoryFilterOptions[0]);

  // Modal controller
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // null means Create mode

  // Drag state
  const [activeTask, setActiveTask] = useState(null);

  // Configure pointer sensor with activation constraints to prevent blocking click events on card body
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const targetColumn = over.id; // "todo", "inprogress", "done"

    const currentTask = tasks.find((t) => t.id === taskId);
    if (currentTask && currentTask.column !== targetColumn) {
      moveTask(taskId, targetColumn);
    }
  };

  // Filter tasks locally
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter.value === 'all' || task.priority === priorityFilter.value;

    const matchesCategory =
      categoryFilter.value === 'all' || task.category === categoryFilter.value;

    return matchesSearch && matchesPriority && matchesCategory;
  });

  const todoTasks = filteredTasks.filter((t) => t.column === 'todo');
  const inprogressTasks = filteredTasks.filter((t) => t.column === 'inprogress');
  const doneTasks = filteredTasks.filter((t) => t.column === 'done');

  const openCreateModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleScrollToBoard = () => {
    const boardEl = document.getElementById('board-workspace');
    if (boardEl) {
      boardEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const doneCountTotal = tasks.filter((t) => t.column === 'done').length;
  const completionRateTotal = tasks.length > 0 ? Math.round((doneCountTotal / tasks.length) * 100) : 0;

  // Floating background shape SVGs
  const floatingShapes = (
    <div className="shape-bg">
      <svg width="100%" height="100%">
        <circle cx="10%" cy="20%" r="60" fill="var(--accent1)" opacity="0.06" style={{ animation: 'float-slow 8s infinite ease-in-out' }} />
        <circle cx="85%" cy="30%" r="90" fill="var(--accent2)" opacity="0.05" style={{ animation: 'float-medium 6s infinite ease-in-out' }} />
        <circle cx="45%" cy="75%" r="75" fill="var(--accent3)" opacity="0.06" style={{ animation: 'float-fast 7s infinite ease-in-out' }} />
      </svg>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-25px) scale(0.95); }
        }
      `}</style>
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner (Shows if server offline) */}
      <ConnectionBanner connected={connected} />

      {/* Floating Blobs Background */}
      {floatingShapes}

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 20px',
          position: 'relative'
        }}
      >
        <h1 style={{
          fontSize: 'clamp(2.2rem, 8vw, 3.5rem)',
          fontFamily: 'Syne',
          fontWeight: '800',
          backgroundImage: 'linear-gradient(135deg, var(--accent1), var(--accent2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1.1',
          marginBottom: '20px'
        }}>
          Your workflow, live.
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          marginBottom: '40px',
          fontWeight: 400
        }}>
          A real-time, high-fidelity WebSocket Kanban board. Drag, drop, upload attachments, and keep everyone in sync instantly.
        </p>

        {/* Counter Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '32px',
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(124, 58, 237, 0.15)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(124, 58, 237, 0.05)',
          marginBottom: '40px'
        }}>
          <div>
            <h3 style={{ fontSize: '2rem', fontFamily: 'Syne', color: 'var(--accent1)' }}>
              <AnimatedCounter value={tasks.length} />
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Tasks</span>
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontFamily: 'Syne', color: 'var(--accent2)' }}>
              <AnimatedCounter value={completionRateTotal} />%
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completion</span>
          </div>
          <div>
            <h3 style={{ fontSize: '2rem', fontFamily: 'Syne', color: 'var(--accent4)' }}>
              <AnimatedCounter value={1} />
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Members</span>
          </div>
        </div>

        {/* Enter workspace button */}
        <button
          onClick={handleScrollToBoard}
          style={{
            padding: '12px 28px',
            backgroundColor: 'var(--accent1)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '9999px',
            fontFamily: 'Space Grotesk',
            fontWeight: '600',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(124, 58, 237, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>Go to Board</span>
          <span>↓</span>
        </button>
      </motion.section>

      {/* Main Board Area */}
      <main
        id="board-workspace"
        style={{
          flexGrow: 1,
          padding: '40px 24px',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--text)', fontFamily: 'Syne' }}>FlowBoard</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Collaborative WebSocket workspace</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Live Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: connected ? 'var(--accent4)' : 'var(--accent2)',
                display: 'inline-block',
                boxShadow: connected ? '0 0 8px var(--accent4)' : '0 0 8px var(--accent2)',
                animation: connected ? 'pulse-ring 1.5s infinite' : 'none'
              }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                {connected ? 'Live Sync' : 'Offline'}
              </span>
            </div>

            {/* Create Button */}
            <button
              onClick={openCreateModal}
              data-testid="new-task-btn"
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--accent1)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'Space Grotesk',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              + New Task
            </button>
          </div>
        </header>

        {/* Filters and Controls */}
        <section style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Input */}
          <div style={{ flexGrow: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontFamily: 'Space Grotesk',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          {/* Priority filter */}
          <div data-testid="priority-select">
            <Select
              options={priorityFilterOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
              styles={customSelectStyles}
              isSearchable={false}
              placeholder="Priority"
            />
          </div>

          {/* Category filter */}
          <div data-testid="category-select">
            <Select
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              styles={customSelectStyles}
              isSearchable={false}
              placeholder="Category"
            />
          </div>
        </section>

        {/* Columns Grid */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'flex-start',
            marginTop: '12px'
          }}>
            {loading ? (
              // Loading skeletons
              <>
                <div style={{ backgroundColor: 'var(--todo-col)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '20px', width: '50%', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '8px' }} />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
                <div style={{ backgroundColor: 'var(--inprogress-col)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '20px', width: '50%', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '8px' }} />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
                <div style={{ backgroundColor: 'var(--done-col)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '20px', width: '50%', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '8px' }} />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </>
            ) : (
              <>
                <Column
                  id="todo"
                  title="To Do"
                  tasks={todoTasks}
                  onEdit={openEditModal}
                  onDelete={deleteTask}
                />
                <Column
                  id="inprogress"
                  title="In Progress"
                  tasks={inprogressTasks}
                  onEdit={openEditModal}
                  onDelete={deleteTask}
                />
                <Column
                  id="done"
                  title="Done"
                  tasks={doneTasks}
                  onEdit={openEditModal}
                  onDelete={deleteTask}
                />
              </>
            )}
          </div>

          {/* Drag Overlay with rotation */}
          <DragOverlay>
            {activeTask ? (
              <div style={{ transform: 'rotate(8deg)', boxShadow: '0 20px 25px -5px rgba(124, 58, 237, 0.25)', opacity: 0.9 }}>
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Progress & Breakdown Section */}
        {!loading && <ProgressDashboard tasks={tasks} />}
      </main>

      {/* Task Modal (Create & Edit) */}
      <AnimatePresence>
        {isModalOpen && (
          <TaskModal
            task={selectedTask ? tasks.find((t) => t.id === selectedTask.id) : null}
            onClose={() => setIsModalOpen(false)}
            createTask={createTask}
            updateTask={updateTask}
            attachToTask={attachToTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
