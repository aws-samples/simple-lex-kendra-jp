import React from 'react';
import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import Page1 from './components/Page1';
import Page2 from './components/Page2';

function App() {
  return (
    <div className="Sample">
      <h3>これは Kendra からクロールされるサンプルページです</h3>

      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/page1">福利厚生</Link></li>
        <li><Link to="/page2">連絡先の登録</Link></li>
      </ul>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/page1" element={<Page1 />} />
        <Route path="/page2" element={<Page2 />} />
      </Routes>
    </div>
  );
}

export default App;
