import './App.css';
import { useState, useEffect } from 'react'

function App() {
  // --- EXISTING STATE ---
  const [contacts, setContacts] = useState({});
  const [selectedContact, setSelectedContact] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [message, setMessage] = useState('');

  // --- NEW STATE: CALENDAR BOUNDS & FETCHING ---
  const [chatId, setChatId] = useState(null);
  const [bounds, setBounds] = useState({ min: '', max: '' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- NEW STATE: MESSAGE FETCHING & RENDERING ---
  const [messages, setMessages] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [sortOrder, setSortOrder] = useState('DESC');
  const [msgCount, setMsgCount] = useState(15);
  const [displayAll, setDisplayAll] = useState(false);

  // --- NEW STATE: APP SHELL NAVIGATION ---
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'analytics'

  // --- NEW STATE: LOCAL SEARCH ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMsg, setHighlightedMsg] = useState(null);

  // 1. Fetch contacts on load
  useEffect(() => {
    fetch('http://localhost:3001/api/contacts')
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => console.error("Error fetching contacts:", err));
  }, []);

  // 2. Real-time Phone Formatting
  // 2. Real-time Phone Formatting (with Backspace Fix)
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    
    // Check if the user is actively deleting characters
    const isDeleting = val.length < newNumber.length;
    
    let digits = val.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.substring(1);
    }
    
    digits = digits.substring(0, 10);
    
    let formatted = digits;
    if (digits.length >= 7) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length >= 4) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    } else if (digits.length === 3 && !isDeleting) {
      // ONLY auto-append the closing parenthesis if they are typing forward
      formatted = `(${digits}) `;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    setNewNumber(formatted);
  };

  // 3. Submit New Contact
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:3001/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, number: newNumber })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error}`);
      } else {
        setMessage(`✅ ${data.message}`);
        setContacts({ ...contacts, ...data.contact });
        setNewName('');
        setNewNumber('');
      }
    } catch (err) {
      setMessage('❌ Server connection error.');
    }
  };

  const handleFetchMessages = async () => {
    if (!chatId || !startDate || !endDate) return;
    
    setIsLoading(true);
    setMessages([]);
    setMetrics(null);

    try {
      const queryParams = new URLSearchParams({
        chatId,
        startDate: `${startDate} 00:00:00`,
        endDate: `${endDate} 23:59:59`,
        sortOrder,
        limit: msgCount,
        displayAll
      });

      const res = await fetch(`http://localhost:3001/api/messages?${queryParams}`);
      const data = await res.json();

      if (res.ok) {
        setMetrics(data.metrics);
        setMessages(data.messages);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Network error fetching messages.");
    }
    setIsLoading(false);
  };

  const handleJumpToContext = (msgId) => {
    // 1. Clear the search bar so all messages render again
    setSearchTerm('');
    
    // 2. Wait for the Virtual DOM to paint the full list, then scroll
    setTimeout(() => {
      const target = document.getElementById(`msg-${msgId}`);
      if (target) {
        // Smoothly scroll the message into the center of the viewport
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Trigger the yellow highlight animation
        setHighlightedMsg(msgId);
        
        // Remove the highlight class after 2 seconds
        setTimeout(() => setHighlightedMsg(null), 2000);
      }
    }, 100);
  };

  // 4. NEW: Fetch Bounds when Contact is Selected
  useEffect(() => {
    setMessages([]);
    setMetrics(null);
    setSearchTerm('');      // <-- Add this: Clears the search text
    setIsSearchOpen(false); // <-- Add this: Closes the search bar

    setDisplayAll(false);
    setMsgCount(15);

    if (!selectedContact) {
      setChatId(null);
      setBounds({ min: '', max: '' });
      return;
    }

    const fetchBounds = async () => {
      try {
        // We pass the formatted number; the backend strips it down to raw digits
        const res = await fetch(`http://localhost:3001/api/chat-bounds?contact=${encodeURIComponent(selectedContact)}`);
        const data = await res.json();
        
        if (res.ok) {
          setChatId(data.chatId);
          // Split the ISO string to just get the YYYY-MM-DD date for standard HTML inputs
          const minDate = data.startDate.split('T')[0];
          const maxDate = data.endDate.split('T')[0];
          
          setBounds({ min: minDate, max: maxDate });
          setStartDate(minDate);
          setEndDate(maxDate);
        } else {
          console.error("Error fetching bounds:", data.error);
        }
      } catch (err) {
        console.error("Network error fetching bounds.");
      }
    };

    fetchBounds();
  }, [selectedContact]);

  // Dynamically filter messages before rendering
  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-shell">
      
      {/* GLOBAL TOP NAVIGATION */}
      <header className="top-nav">
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>💬 iMessage Archive</h1>
        <nav className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat Explorer
          </button>
          <button 
            className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Global Analytics
          </button>
        </nav>
      </header>

      {/* WORKSPACE ROUTING */}
      {activeTab === 'chat' ? (
        <div className="app-container">
          
          {/* LEFT PANE: All Controls */}
          <aside className="sidebar">
            
            <div className="control-group">
              <h3>📖 Add Contact</h3>
              <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <input type="text" placeholder="(555) 123-4567" value={newNumber} onChange={handlePhoneChange} required />
                <button type="submit" className="btn-primary">Save Contact</button>
              </form>
              {message && <p style={{ fontSize: '0.85rem', color: message.includes('❌') ? '#ff453a' : '#32d74b' }}>{message}</p>}
            </div>

            <div className="control-group">
              <h3>🔍 Select Contact</h3>
              <select value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                <option value="">Select a contact...</option>
                {Object.keys(contacts)
                  .sort((a, b) => a.localeCompare(b))
                  .map(name => (
                    <option key={name} value={contacts[name]}>{name}</option>
                ))}
              </select>
            </div>

            {chatId && (
              <>
                <div className="control-group">
                  <h3>📅 Date Range</h3>
                  <input type="date" value={startDate} min={bounds.min} max={bounds.max} onChange={(e) => setStartDate(e.target.value)} />
                  <input type="date" value={endDate} min={bounds.min} max={bounds.max} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                <div className="control-group">
                  <h3>⚙️ Fetch Settings</h3>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="ASC">Oldest First</option>
                    <option value="DESC">Newest First</option>
                  </select>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="number" value={msgCount} onChange={(e) => setMsgCount(e.target.value)} disabled={displayAll} style={{ width: '80px' }} />
                    <label style={{ fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={displayAll} onChange={(e) => setDisplayAll(e.target.checked)} style={{ width: 'auto', marginRight: '8px' }} />
                      Display ALL
                    </label>
                  </div>
                  <button onClick={handleFetchMessages} disabled={isLoading} className="btn-primary">
                    {isLoading ? '⏳ Fetching...' : `Fetch Messages`}
                  </button>
                </div>
              </>
            )}
          </aside>

          {/* RIGHT PANE: Chat Renderer */}
          <main className="main-window">
            {metrics ? (
              <>
                <header className="metrics-header" style={{ flexDirection: 'column', gap: isSearchOpen ? '1rem' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <h4 style={{ margin: 0, color: '#e5e5ea' }}>Total: {metrics.total}</h4>
                      <h4 style={{ margin: 0, color: '#0a84ff' }}>You: {metrics.youCount}</h4>
                      <h4 style={{ margin: 0, color: '#8e8e93' }}>Them: {metrics.themCount}</h4>
                    </div>
                    <button 
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: isSearchOpen ? '#0a84ff' : '#8e8e93' }}
                      title="Toggle Search"
                    >
                      🔍
                    </button>
                  </div>
                  
                  {/* TOGGLEABLE SEARCH BAR */}
                  {isSearchOpen && (
                    <input 
                      type="text" 
                      placeholder="Search within these messages..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#000', border: '1px solid #3a3a3c' }}
                      autoFocus
                    />
                  )}
                </header>
                
                <div className="chat-feed">
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg) => {
                      const isYou = msg.sender === 'You';
                      return (
                        <div 
                          key={msg.id} 
                          id={`msg-${msg.id}`} 
                          className={`message-wrapper ${isYou ? 'wrapper-you' : 'wrapper-them'} ${highlightedMsg === msg.id ? 'highlight-pulse' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="timestamp">{msg.time}</span>
                            
                            {/* NEW: Jump Button (Only visible during a search) */}
                            {searchTerm && (
                              <button 
                                onClick={() => handleJumpToContext(msg.id)}
                                style={{ background: 'none', border: 'none', color: '#0a84ff', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                                title="Jump to this message in full context"
                              >
                                📍 Jump
                              </button>
                            )}
                          </div>
                          
                          <div className={`bubble ${isYou ? 'bubble-you' : 'bubble-them'}`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: '#8e8e93', marginTop: '2rem' }}>
                      No messages match "{searchTerm}"
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93' }}>
                <h2>{!selectedContact 
                    ? "Select a contact to view history" 
                    : `Click "Fetch Messages" to load history`}</h2>
              </div>
            )}
          </main>

        </div>
      ) : (
        /* ANALYTICS PLACEHOLDER */
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
           <h2 style={{ color: '#8e8e93' }}>Global Analytics Dashboard coming soon...</h2>
        </div>
      )}
    </div>
  );
}

export default App