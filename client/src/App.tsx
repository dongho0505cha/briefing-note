import { useState } from 'react';
import { useTheme } from './contexts/ThemeContext';
import BriefingNote from './components/BriefingNote';
import './styles/App.css';

function App() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleTogglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  return (
    <div className="app-container">
      {/* 다크모드 토글 버튼 */}
      <button className="theme-toggle" onClick={toggleTheme} title={isDark ? '라이트 모드' : '다크 모드'}>
        {isDark ? '☀️' : '🌙'}
      </button>

      <main className="main-content">
        <h1>실시간 AI 요약 서비스</h1>
        <p>브리핑 노트 버튼을 클릭하여 실시간 회의 요약을 확인하세요.</p>
      </main>

      <button className="briefing-button" onClick={handleTogglePopup} title="브리핑 노트">
        📝
      </button>

      {isPopupOpen && <BriefingNote onClose={() => setIsPopupOpen(false)} />}
    </div>
  );
}

export default App;
