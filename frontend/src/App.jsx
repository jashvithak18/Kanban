import React from 'react';
import KanbanBoard from './components/KanbanBoard.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  return (
    <>
      <KanbanBoard />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}

export default App;
