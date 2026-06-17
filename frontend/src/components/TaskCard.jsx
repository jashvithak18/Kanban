import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export default function TaskCard({ task, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab'
      }
    : {
        cursor: 'grab'
      };

  const priorityColors = {
    low: 'var(--accent4)',     // Emerald
    medium: 'var(--accent5)',  // Amber
    high: 'var(--accent2)'     // Hot Pink
  };

  // Category styling
  const categoryStyles = {
    bug: { bg: '#FEE2E2', color: '#991B1B', label: '🐛 Bug' },
    feature: { bg: '#EDE9FE', color: '#5B21B6', label: '✨ Feature' },
    enhancement: { bg: '#DBEAFE', color: '#1E40AF', label: '🚀 Enhancement' }
  };

  const catStyle = categoryStyles[task.category] || categoryStyles.feature;

  const formattedDate = new Date(task.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const handleCardClick = (e) => {
    // Open edit modal on card click
    onEdit(task);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleCardClick}
      data-testid="task-card"
      className="task-card-hover"
      style={{
        ...style,
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(124, 58, 237, 0.15)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isDragging
          ? '0 20px 25px -5px rgba(124, 58, 237, 0.15)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        animation: 'fadeInUp 0.4s ease-out',
        userSelect: 'none'
      }}
    >
      {/* Delete button (×) absolute top-right, visible on card hover */}
      <button
        data-testid={`delete-task-${task.id}`}
        onClick={handleDelete}
        className="delete-btn"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#FEE2E2',
          color: '#EF4444',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          opacity: 0 // Controlled by CSS hover
        }}
      >
        ×
      </button>

      {/* Title */}
      <h4 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text)',
        paddingRight: '20px',
        lineHeight: '1.3'
      }}>
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '1.4'
        }}>
          {task.description}
        </p>
      )}

      {/* Attachments list on card */}
      {task.attachments && task.attachments.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '2px'
          }}
        >
          {task.attachments.map((file, idx) => {
            const isImage = file.type && file.type.startsWith('image/');
            return (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Click to view ${file.name}`}
                className="card-attachment-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  backgroundColor: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  maxWidth: '120px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {isImage ? <span>🖼️</span> : <span>📄</span>}
                <span style={{
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>
                  {file.name}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Badges and Metadata */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4px',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Priority Badge */}
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            backgroundColor: priorityColors[task.priority] || 'var(--accent5)',
            padding: '2px 8px',
            borderRadius: '9999px',
            letterSpacing: '0.05em'
          }}>
            {task.priority}
          </span>

          {/* Category Badge */}
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '600',
            backgroundColor: catStyle.bg,
            color: catStyle.color,
            padding: '2px 8px',
            borderRadius: '9999px'
          }}>
            {catStyle.label}
          </span>
        </div>

        {/* Attachment & Date info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {task.attachments && task.attachments.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={`${task.attachments.length} attachments`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>{task.attachments.length}</span>
            </div>
          )}
          <span>{formattedDate}</span>
        </div>
      </div>

      <style>{`
        .task-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.15), 0 4px 6px -2px rgba(124, 58, 237, 0.05) !important;
          border-color: var(--accent1) !important;
        }
        .task-card-hover:hover .delete-btn {
          opacity: 1 !important;
        }
        .delete-btn:hover {
          background-color: #EF4444 !important;
          color: #FFFFFF !important;
          transform: scale(1.1);
        }
        .card-attachment-pill:hover {
          background-color: var(--accent1) !important;
          color: #FFFFFF !important;
          border-color: var(--accent1) !important;
        }
      `}</style>
    </div>
  );
}
