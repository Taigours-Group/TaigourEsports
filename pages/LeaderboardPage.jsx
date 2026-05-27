
import React, { useState, useRef, useMemo } from 'react';
import { LeaderboardEntry } from '../types';

const LeaderboardPage = ({ leaderboard }) => {
  const [activeTab, setActiveTab] = useState('freefire');
  const [sortBy, setSortBy] = useState('points');
  const tabs = ['freefire', 'pubg', 'ludo'];
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const filtered = useMemo(() => {
    let base = leaderboard.filter(l => l.game === activeTab);
    if (sortBy === 'points') {
      base = base.sort((a, b) => b.points - a.points);
    } else if (sortBy === 'position') {
      base = base.sort((a, b) => {
        const rankA = a.rank && a.rank > 0 ? a.rank : 999999;
        const rankB = b.rank && b.rank > 0 ? b.rank : 999999;
        return rankA - rankB;
      });
    }
    return base; 
  }, [leaderboard, activeTab, sortBy]);

  const topThree = filtered.slice(0, 3);
  const remaining = filtered.slice(3);

  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.indexOf(activeTab);
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    touchStart.current = null;
    touchEnd.current = null;
  };

  return (
    <div 
      className="pt-32 pb-24 min-h-screen bg-bg-dark"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-7xl font-orbitron font-black text-white uppercase tracking-tighter">
            HALL OF <span className="text-primary">FAME</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="h-[1px] w-8 bg-primary/30"></div>
            <p className="text-gray-500 font-rajdhani font-bold uppercase tracking-[0.4em]">Elite Rank Standings</p>
            <div className="h-[1px] w-8 bg-primary/30"></div>
          </div>
        </header>

        {/* Tactical Filter Tabs */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 w-full md:w-auto justify-start md:justify-center">
            {tabs.map(game => (
              <button 
                key={game} 
                onClick={() => setActiveTab(game)} 
                className={`whitespace-nowrap px-6 py-2.5 font-orbitron font-black text-[10px] uppercase tracking-widest transition-all rounded-xl border ${activeTab === game ? 'bg-primary text-dark border-primary shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
              >
                {game}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
             <button 
                onClick={() => setSortBy('points')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-orbitron font-bold uppercase tracking-widest transition-all ${sortBy === 'points' ? 'bg-primary text-dark shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
             >
                By Points
             </button>
             <button 
                onClick={() => setSortBy('position')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-orbitron font-bold uppercase tracking-widest transition-all ${sortBy === 'position' ? 'bg-primary text-dark shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
             >
                By Position
             </button>
          </div>
        </div>

        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-6 items-end mb-12 px-2">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="flex flex-col items-center animate-fade-in order-1">
                <div className="relative mb-4">
                  <img src={topThree[1].avatar} className="w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 border-gray-400 object-cover shadow-lg" alt="" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center font-orbitron font-black text-dark text-xs border-2 border-bg-dark">2</div>
                </div>
                <h3 className="text-white font-orbitron font-bold text-[10px] md:text-xs text-center line-clamp-1 w-full">{topThree[1].teamname}</h3>
                <span className="text-gray-400 font-black text-[10px] md:text-sm">{topThree[1].points} pts</span>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="flex flex-col items-center animate-fade-in order-2 scale-110 mb-4 md:mb-8">
                <div className="relative mb-4">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-accent animate-bounce">
                    <i className="fa-solid fa-crown text-2xl"></i>
                  </div>
                  <img src={topThree[0].avatar} className="w-20 h-20 md:w-32 md:h-32 rounded-3xl border-2 border-accent object-cover shadow-[0_0_30px_rgba(255,204,0,0.3)]" alt="" />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center font-orbitron font-black text-dark text-sm border-2 border-bg-dark shadow-xl">1</div>
                </div>
                <h3 className="text-white font-orbitron font-black text-xs md:text-sm text-center line-clamp-1 w-full">{topThree[0].teamname}</h3>
                <span className="text-primary font-black text-xs md:text-base">{topThree[0].points} pts</span>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="flex flex-col items-center animate-fade-in order-3">
                <div className="relative mb-4">
                  <img src={topThree[2].avatar} className="w-16 h-16 md:w-24 md:h-24 rounded-2xl border-2 border-orange-700 object-cover shadow-lg" alt="" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-700 rounded-full flex items-center justify-center font-orbitron font-black text-white text-xs border-2 border-bg-dark">3</div>
                </div>
                <h3 className="text-white font-orbitron font-bold text-[10px] md:text-xs text-center line-clamp-1 w-full">{topThree[2].teamname}</h3>
                <span className="text-gray-400 font-black text-[10px] md:text-sm">{topThree[2].points} pts</span>
              </div>
            )}
          </div>
        )}

        {/* List for the rest */}
        <div className="space-y-3">
          {remaining.length > 0 ? (
            remaining.map((player, idx) => (
              <div 
                key={player.id} 
                className="glass group flex items-center justify-between p-3 md:p-5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all hover:bg-white/[0.03] animate-slide-up"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center font-orbitron font-black text-[10px] md:text-xs text-gray-500 border border-white/5">
                    {idx + 4}
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={player.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-white/10" alt="" />
                    <div className="flex flex-col">
                      <span className="text-white font-orbitron font-bold text-xs md:text-sm uppercase tracking-wide group-hover:text-primary transition-colors">{player.teamname}</span>
                      <div className="flex items-center gap-2 text-[8px] md:text-[10px] text-gray-600 font-black uppercase tracking-widest">
                        <span>KILLS: {player.kills}</span>
                        <span>•</span>
                        <span>WINS: {player.wins}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white font-orbitron font-black text-sm md:text-xl tracking-tighter leading-none">{player.points}</span>
                  <span className="text-[7px] md:text-[9px] text-gray-600 font-bold uppercase tracking-widest">XP POINTS</span>
                </div>
              </div>
            ))
          ) : (
            topThree.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center mx-auto mb-6 opacity-20">
                  <i className="fa-solid fa-ranking-star text-3xl"></i>
                </div>
                <p className="text-gray-600 font-orbitron text-[10px] uppercase tracking-[0.4em]">No ranking data in this sector</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
