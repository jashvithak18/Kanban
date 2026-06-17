import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const priorityOptions = [
  { value: 'low', label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high', label: '🔴 High' }
];

const categoryOptions = [
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
    padding: '2px',
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

export default function TaskModal({ task, onClose, createTask, updateTask, attachToTask }) {
  const isEditMode = !!task;

  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description : '');
  const [priority, setPriority] = useState(
    task ? priorityOptions.find((o) => o.value === task.priority) : priorityOptions[1]
  );
  const [category, setCategory] = useState(
    task ? categoryOptions.find((o) => o.value === task.category) : categoryOptions[1]
  );
  const [attachments, setAttachments] = useState(task ? task.attachments : []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sync attachments state if editing task changes
  useEffect(() => {
    if (task) {
      setAttachments(task.attachments || []);
    }
  }, [task]);

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      toast.error('Invalid file type or size. Only images and PDFs (max 5MB) are allowed.');
      return;
    }

    for (const file of acceptedFiles) {
      // Validate file type
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValidType) {
        toast.error('Invalid file type. Only images and PDFs are allowed.');
        continue;
      }

      try {
        setUploading(true);
        setUploadProgress(20);

        const formData = new FormData();
        formData.append('file', file);

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        setUploadProgress(80);
        const uploadedFile = await response.json();
        setUploadProgress(100);

        const newAttachment = {
          name: uploadedFile.name,
          url: uploadedFile.url,
          type: uploadedFile.type
        };

        // Update local attachments state in both modes so it displays the thumbnail preview immediately
        setAttachments((prev) => [...prev, newAttachment]);

        if (isEditMode) {
          // If in edit mode, attach straight to backend
          attachToTask(task.id, newAttachment);
        }
        toast.success(`Uploaded: ${file.name}`);
      } catch (err) {
        toast.error(`Upload failed for ${file.name}`);
        console.error(err);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 5 * 1024 * 1024,
    accept: {
      'image/*': [],
      'application/pdf': []
    }
  });

  const handleRemoveAttachment = (index) => {
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);

    if (isEditMode) {
      // Update on backend
      updateTask(task.id, { attachments: updated });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tempErrors = {};
    if (!title.trim()) {
      tempErrors.title = 'Title is required';
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority: priority.value,
      category: category.value,
      attachments
    };

    if (isEditMode) {
      updateTask(task.id, payload);
    } else {
      createTask(payload);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 27, 75, 0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <motion.div
        data-testid="task-modal"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface2)'
        }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text)' }}>
            {isEditMode ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
              }}
              placeholder="e.g., Fix WebSocket sync bug"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.title ? '1.5px solid var(--accent2)' : '1px solid var(--border)',
                fontFamily: 'Space Grotesk',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            {errors.title && (
              <span style={{ display: 'block', color: 'var(--accent2)', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.title}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
              Description
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the task..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontFamily: 'Space Grotesk',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                Priority
              </label>
              <div data-testid="priority-select">
                <Select
                  options={priorityOptions}
                  value={priority}
                  onChange={setPriority}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                Category
              </label>
              <div data-testid="category-select">
                <Select
                  options={categoryOptions}
                  value={category}
                  onChange={setCategory}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
              Attachments (Images or PDFs up to 5MB)
            </label>
            <div
              {...getRootProps()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'var(--surface2)' : 'var(--bg)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <input {...getInputProps()} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isDragActive ? 'Drop files here...' : 'Drag & drop or click to upload'}
              </span>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div style={{ marginTop: '8px', width: '100%', backgroundColor: 'var(--surface2)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--accent1)', height: '100%', transition: 'width 0.2s ease' }} />
              </div>
            )}

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div style={{
                marginTop: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '10px'
              }}>
                {attachments.map((file, idx) => {
                  const isImage = file.type && file.type.startsWith('image/');
                  return (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Click to view/download file"
                      className="attachment-thumbnail"
                      style={{
                        position: 'relative',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        height: '70px',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      {isImage ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', textAlign: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span style={{ fontSize: '0.65rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '90%' }}>
                            {file.name}
                          </span>
                        </div>
                      )}
                      {/* Delete Attachment Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveAttachment(idx);
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(30, 27, 75, 0.7)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          zIndex: 10
                        }}
                      >
                        ×
                      </button>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <style>{`
            .attachment-thumbnail {
              transition: all 0.2s ease;
            }
            .attachment-thumbnail:hover {
              border-color: var(--accent1) !important;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15) !important;
            }
          `}</style>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            borderTop: '1px solid var(--border)',
            paddingTop: '16px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                fontFamily: 'Space Grotesk',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-task"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent1)',
                color: '#FFFFFF',
                fontFamily: 'Space Grotesk',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)'
              }}
            >
              {isEditMode ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
