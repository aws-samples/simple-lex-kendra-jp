import React from 'react';
import ItemList from './components/ItemList';
import './App.css';

function App() {
  return (
    <div className="overflow-hidden">
      <div
        id="main"
        className="h-screen w-screen overflow-hidden overflow-y-auto scroll-mx-0"
      >
        <ItemList />
      </div>
    </div>
  );
}

export default App;
