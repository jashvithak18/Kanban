import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Column({ id, title, tasks, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({
    id: id
  });

  const columnConfig = {
    todo: {
      bg: 'var(--todo-col)',
      accent: 'var(--todo-accent)',
      icon: '✦'
    },
    inprogress: {
      bg: 'var(--inprogress-col)',
      accent: 'var(--inprogress-accent)',
      icon: '⟳'
    },
    done: {
      bg: 'var(--done-col)',
      accent: 'var(--done-accent)',
      icon: '✓'
    }
  };

  const config = columnConfig[id] || columnConfig.todo;

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: config.bg,
        borderRadius: '16px',
        padding: '20px',
        minHeight: '400px',
        flex: 1,
        border: '2px solid transparent',
        transition: 'all 0.3s ease',
        animation: isOver ? 'columnGlow 1.5s infinite ease-in-out' : 'none',
        borderColor: isOver ? config.accent : 'transparent'
      }}
    >
      {/* Column Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: `2px solid ${config.accent}`,
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '1.2rem',
            color: config.accent,
            fontWeight: 'bold',
            display: 'inline-block',
            animation: id === 'inprogress' ? 'spin 3s linear infinite' : 'none'
          }}>
            {config.icon}
          </span>
          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            color: 'var(--text)'
          }}>
            {title}
          </h3>
        </div>

        {/* Task count badge */}
        <motion.div
          key={tasks.length}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          style={{
            backgroundColor: config.accent,
            color: '#FFFFFF',
            borderRadius: '9999px',
            padding: '2px 10px',
            fontSize: '0.8rem',
            fontWeight: '700',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
        >
          {tasks.length}
        </motion.div>
      </div>

      {/* Task List container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flexGrow: 1,
        overflowY: 'auto',
        maxHeight: '600px',
        paddingRight: '4px'
      }}>
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <TaskCard
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state placeholder */}
        {tasks.length === 0 && (
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: '12px',
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <span style={{ fontSize: '1.5rem', color: config.accent }}>✦</span>
            <span>Drop tasks here</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
