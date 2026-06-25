
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChatMessage, StreamVideo, ChatReaction } from '../types.js';
import { MOCK_CHAT_USERS, MOCK_MESSAGES } from '../constants.js';
import FadeContent from '../components/ReactBits/FadeContent';
import BlurText from '../components/ReactBits/BlurText';
import ShinyText from '../components/ReactBits/ShinyText';

const StreamsPage = ({ streams }) => {
  const [activeStream, setActiveStream] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dynamic Stats State
  const [viewers, setViewers] = useState(1204);
  const [likes, setLikes] = useState(4820);
  const [hasLiked, setHasLiked] = useState(false);
  
  const chatContainerRef = useRef(null);
  const MY_USERNAME = 'Guest_Pro';
 
  // Check admin status
  useEffect(() => {
    const loginTime = localStorage.getItem('admin_login_time');
    if (loginTime) {
      const now = new Date().getTime();
      const SESSION_TIMEOUT = 30 * 60 * 1000;
      if (now - parseInt(loginTime) < SESSION_TIMEOUT) {
        setIsAdmin(true);
      }
    }
  }, []);

  // Initialize active stream
  useEffect(() => {
    if (streams.length > 0 && !activeStream) {
      setActiveStream(streams[0]);
    }
  }, [streams, activeStream]);

  // Reset local user engagement when stream changes
  useEffect(() => {
    if (activeStream) {
      setViewers(activeStream.islive ? 1000 + Math.floor(Math.random() * 500) : 0);
      setLikes(2000 + Math.floor(Math.random() * 3000));
      setHasLiked(false);
    }
  }, [activeStream]);

  // Initial chat setup
  useEffect(() => {
    const initial = [
      { id: 'sys-1', username: 'SYSTEM', text: 'Secured channel established. Enforced protocol active.', timestamp: Date.now() - 10000, isSystem: true },
      { id: '1', username: 'Tai_Moderator', text: "Welcome to the elite broadcast. @Guest_Pro ready for action? 🔥", timestamp: Date.now() - 5000, reactions: [{ emoji: '🔥', count: 12 }] },
    ];
    setChatMessages(initial);
  }, []);

  // Simulate live audience behavior
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeStream?.islive) {
        setViewers(prev => {
          const change = Math.floor(Math.random() * 15) - 6;
          return Math.max(1, prev + change);
        });

        if (Math.random() > 0.6) {
          setLikes(prev => prev + Math.floor(Math.random() * 3) + 1);
        }
      }

      const randomUser = MOCK_CHAT_USERS[Math.floor(Math.random() * MOCK_CHAT_USERS.length)];
      const randomMsgTemplate = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      
      const text = Math.random() > 0.85 
        ? `@${MY_USERNAME} ${randomMsgTemplate}` 
        : randomMsgTemplate;

      const newMessage = {
        id: Math.random().toString(36).substr(2, 9),
        username: randomUser,
        text: text,
        timestamp: Date.now(),
        reactions: Math.random() > 0.7 ? [{ emoji: '🔥', count: Math.floor(Math.random() * 5) + 1 }] : []
      };

      setChatMessages(prev => {
        const updated = [...prev, newMessage];
        return updated.length > 50 ? updated.slice(-50) : updated;
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [activeStream]);

  // INTERNAL CHAT SCROLLING LOGIC
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // Check if user is already near the bottom before auto-scrolling
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      if (isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [chatMessages]);

  const handleLikeClick = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
      
      const likeMsg = {
        id: `like-${Date.now()}`,
        username: 'SYSTEM',
        text: 'Tactical appreciation acknowledged. Deployment morale increased.',
        timestamp: Date.now(),
        isSystem: true
      };
      setChatMessages(prev => [...prev, likeMsg]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      username: MY_USERNAME,
      text: inputText,
      timestamp: Date.now(),
      reactions: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Force scroll to bottom for user's own message
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleReaction = (msgId, emoji) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        const existingReactions = msg.reactions || [];
        const rIndex = existingReactions.findIndex(r => r.emoji === emoji);
        
        if (rIndex > -1) {
          const newReactions = [...existingReactions];
          newReactions[rIndex] = { ...newReactions[rIndex], count: newReactions[rIndex].count + 1 };
          return { ...msg, reactions: newReactions };
        } else {
          return { ...msg, reactions: [...existingReactions, { emoji, count: 1 }] };
        }
      }
      return msg;
    }));
  };

  const deleteMessage = (msgId) => {
    setChatMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const clearChat = () => {
    setChatMessages([{ id: 'sys-clear', username: 'SYSTEM', text: 'Matrix cleared by administrator.', timestamp: Date.now(), isSystem: true }]);
  };

  const renderMessageText = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const isMe = part === `@${MY_USERNAME}`;
        return (
          <span 
            key={i} 
            className={`font-black rounded px-1.5 py-0.5 mx-0.5 text-[10px] ${isMe ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_rgba(0,212,255,0.4)] animate-pulse' : 'bg-accent/10 text-accent'}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="pt-20 md:pt-28 pb-20 md:pb-24 bg-bg-dark min-h-screen relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="container mx-auto px-3 md:px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">

          <div className="lg:col-span-8 space-y-4 md:space-y-6">
            {/* Video Player */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-pink/20 to-primary/20 rounded-2xl md:rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative aspect-video bg-black rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {activeStream ? (
                  <>
                    {activeStream.islive && (
                        <div className="absolute top-2 md:top-6 left-2 md:left-6 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                            <div className="bg-red-600/90 backdrop-blur-xl text-white px-2 md:px-4 py-1 md:py-1.5 rounded-full flex items-center gap-1.5 md:gap-2 border border-white/20 shadow-lg pointer-events-none text-[8px] md:text-[10px]">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                <span className="font-orbitron font-black uppercase tracking-widest">LIVE</span>
                            </div>
                            <div className="bg-black/60 backdrop-blur-xl text-white/70 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 text-[8px] md:text-[10px] font-orbitron font-bold uppercase tracking-widest">
                                <i className="fa-solid fa-eye mr-1 md:mr-2 text-primary"></i> {viewers.toLocaleString()}
                            </div>
                        </div>
                    )}
                    <iframe
                      key={activeStream.id}
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${activeStream.youtubeid}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&enablejsapi=1`}
                      title={activeStream.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="w-full h-full"
                    ></iframe>
                  </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-3 md:space-y-4 bg-bg-card">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                            <i className="fa-solid fa-satellite-dish text-2xl md:text-4xl text-gray-700"></i>
                        </div>
                        <p className="font-orbitron text-[9px] md:text-xs text-gray-600 uppercase tracking-widest text-center px-4">Signal Lost in this Sector</p>
                    </div>
                )}
              </div>
            </div>

            {/* Stream Info */}
            <div className="glass p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 relative overflow-hidden">
               <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-8">
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 md:px-3 py-1 bg-primary/10 border border-primary/30 rounded text-primary font-orbitron font-black text-[8px] md:text-[9px] uppercase tracking-widest">COMPETITIVE</span>
                        <span className="text-gray-500 font-rajdhani font-bold text-[8px] md:text-xs uppercase tracking-widest">• Janakpur Server</span>
                     </div>
                     <h1 className="text-xl sm:text-2xl md:text-4xl font-orbitron font-black text-white uppercase tracking-tight leading-tight break-words">{activeStream?.title || 'BROADCAST OFFLINE'}</h1>
                  </div>
                  <div className="flex gap-2 md:gap-4 flex-wrap">
                     <button
                        onClick={handleLikeClick}
                        className={`flex flex-col items-center justify-center border rounded-xl md:rounded-2xl w-14 h-14 md:w-20 md:h-20 transition-all group ${hasLiked ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        <i className={`fa-solid fa-thumbs-up mb-1 md:mb-2 text-base md:text-xl group-hover:scale-110 transition-transform ${hasLiked ? 'text-primary' : 'text-gray-500'}`}></i>
                        <span className={`text-[8px] md:text-[10px] font-orbitron font-black ${hasLiked ? 'text-primary' : 'text-white'}`}>{likes.toLocaleString()}</span>
                     </button>
                     <button className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl md:rounded-2xl w-14 h-14 md:w-20 md:h-20 transition-all group">
                        <i className="fa-solid fa-share-nodes text-accent mb-1 md:mb-2 text-base md:text-xl group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] md:text-[10px] font-orbitron font-black text-white">SHARE</span>
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pt-4 md:pt-8 border-t border-white/5">
                  <div className="flex items-center gap-2 md:gap-4">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-primary/20 flex-shrink-0">
                        <i className="fa-solid fa-crown text-primary text-sm md:text-base"></i>
                     </div>
                     <div className="min-w-0">
                        <div className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-widest">TOP DONOR</div>
                        <div className="text-white font-orbitron font-bold text-[9px] md:text-xs truncate">@Nitro_Blast</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-pink/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-pink/20 flex-shrink-0">
                        <i className="fa-solid fa-fire text-pink text-sm md:text-base"></i>
                     </div>
                     <div className="min-w-0">
                        <div className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-widest">MATCH GOAL</div>
                        <div className="text-white font-orbitron font-bold text-[9px] md:text-xs truncate">100 Kills Total</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-tertiary/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-tertiary/20 flex-shrink-0">
                        <i className="fa-solid fa-trophy text-tertiary text-sm md:text-base"></i>
                     </div>
                     <div className="min-w-0">
                        <div className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-widest">CURRENT BOOYAH</div>
                        <div className="text-white font-orbitron font-bold text-[9px] md:text-xs truncate">Shadow Knights</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Archived Streams */}
            <div className="space-y-3 md:space-y-6">
               <div className="flex justify-between items-center px-2">
                  <h4 className="font-orbitron font-black text-white text-[9px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-3">
                     <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#00d4ff]"></span> ARCHIVED SECTORS
                  </h4>
                  <Link to="/tournaments" className="text-gray-500 hover:text-primary font-orbitron font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-colors">SEE ALL</Link>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                  {streams.filter(s => s.id !== activeStream?.id).map(stream => (
                      <div key={stream.id} className="group cursor-pointer" onClick={() => { setActiveStream(stream); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                          <div className="relative aspect-video rounded-lg md:rounded-xl overflow-hidden border border-white/5 mb-1.5 md:mb-3">
                              <img src={`https://img.youtube.com/vi/${stream.youtubeid}/hqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={stream.title} />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                 <div className="w-6 h-6 md:w-10 md:h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all">
                                    <i className="fa-solid fa-play text-white text-[8px] md:text-sm"></i>
                                 </div>
                              </div>
                              {stream.islive && (
                                 <span className="absolute top-1 left-1 bg-red-600 text-white text-[6px] md:text-[8px] font-black px-1 md:px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-white/10">LIVE</span>
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-white text-[6px] md:text-[8px] font-black px-1 md:px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/10">10:45</span>
                          </div>
                          <h4 className="text-white font-orbitron font-bold text-[8px] md:text-[11px] line-clamp-1 group-hover:text-primary transition-colors leading-snug">{stream.title}</h4>
                      </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 h-[400px] sm:h-[500px] md:h-[600px] lg:h-[calc(100vh-180px)]">
            <div className="glass rounded-2xl md:rounded-3xl border border-white/5 flex flex-col shadow-2xl relative overflow-hidden h-full">
              <div className="p-3 md:p-5 border-b border-white/5 flex items-center justify-between bg-white/2 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#00d4ff]"></div>
                    <h3 className="text-primary font-orbitron font-black uppercase tracking-widest text-[8px] md:text-[10px] truncate">Neural Feed</h3>
                </div>
                {isAdmin && (
                  <button onClick={clearChat} className="text-[7px] md:text-[8px] font-orbitron font-black text-pink hover:text-white transition-all flex items-center gap-1.5 md:gap-2 uppercase tracking-widest border border-pink/30 px-2 md:px-3 py-1 rounded-full hover:bg-pink/10 flex-shrink-0">
                    <i className="fa-solid fa-eraser"></i> <span className="hidden sm:inline">WIPE</span>
                  </button>
                )}
              </div>

              <div
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-5 custom-scrollbar overscroll-contain relative"
                style={{ overscrollBehaviorY: 'contain' }}
              >
                <div className="sticky top-0 left-0 w-full h-8 bg-gradient-to-b from-bg-dark/20 to-transparent pointer-events-none z-10 -mt-5"></div>

                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col group animate-slide-up ${msg.isSystem ? 'items-center text-center' : ''}`}>
                    {!msg.isSystem && (
                      <div className="flex items-center justify-between mb-1 md:mb-1.5">
                        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                            <span className={`font-orbitron font-black text-[8px] md:text-[9px] uppercase tracking-widest truncate ${msg.username === MY_USERNAME ? 'text-primary' : 'text-gray-500'}`}>
                                {msg.username}
                            </span>
                            <span className="text-[6px] md:text-[7px] text-gray-700 font-mono italic flex-shrink-0">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => deleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-pink hover:scale-125 transition-all p-1 flex-shrink-0">
                             <i className="fa-solid fa-trash-can text-[8px]"></i>
                          </button>
                        )}
                      </div>
                    )}

                    <div className={`relative ${msg.isSystem ? 'w-full' : ''}`}>
                       <div className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-2xl font-rajdhani text-xs md:text-sm break-words transition-all ${
                          msg.isSystem
                            ? 'bg-primary/5 border border-primary/10 text-primary/60 italic text-[8px] md:text-[10px] uppercase tracking-widest'
                            : msg.username === MY_USERNAME
                                ? 'bg-primary/10 border border-primary/20 text-white rounded-tr-none shadow-[0_4px_15px_rgba(0,212,255,0.1)]'
                                : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'
                        }`}>
                          {renderMessageText(msg.text)}
                       </div>

                       {!msg.isSystem && (
                         <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1.5 md:mt-2">
                            {msg.reactions?.map((r, i) => (
                              <button
                                key={i}
                                onClick={() => handleReaction(msg.id, r.emoji)}
                                className="bg-white/5 border border-white/10 rounded-full px-1.5 md:px-2 py-0.5 text-[7px] md:text-[9px] flex items-center gap-1 hover:bg-primary/10 hover:border-primary/20 transition-all"
                              >
                                <span>{r.emoji}</span>
                                <span className="font-bold text-gray-500 group-hover:text-primary">{r.count}</span>
                              </button>
                            ))}
                         </div>
                       )}
                    </div>
                  </div>
                ))}

                <div className="sticky bottom-0 left-0 w-full h-8 bg-gradient-to-t from-bg-dark/20 to-transparent pointer-events-none z-10 -mb-5"></div>
              </div>

              <div className="p-3 md:p-5 bg-white/2 border-t border-white/5 backdrop-blur-xl shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-2 md:space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Input Sector Intel..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-3 md:px-5 py-2.5 md:py-4 text-white font-rajdhani text-xs md:text-sm focus:border-primary focus:bg-primary/5 outline-none transition-all placeholder:text-gray-700 shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-full bg-primary text-dark font-orbitron font-black py-2.5 md:py-4 rounded-xl md:rounded-2xl hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-30 disabled:hover:shadow-none transition-all uppercase tracking-[0.2em] text-[8px] md:text-[10px] cyber-button flex items-center justify-center gap-2"
                  >
                    TRANSMIT <i className="fa-solid fa-paper-plane text-xs hidden sm:inline"></i>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamsPage;
