import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MessageSquare, MessageCircle, BarChart2, UserPlus, Settings2, CalendarDays, Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Parses dates to exact noon to eliminate UTC timezone shifting bugs
const parseSafeDate = (dateStr) => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-');
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12, 0, 0);
};

// --- THE NEW AESTHETIC DATE PICKER ---
const AestheticDatePicker = ({ label, dateStr, setDateStr, minDateStr, maxDateStr }) => {
  const minDate = minDateStr ? parseSafeDate(minDateStr) : parseSafeDate('2011-01-01');
  const maxDate = maxDateStr ? parseSafeDate(maxDateStr) : new Date();
  
  const selectedDate = dateStr ? parseSafeDate(dateStr) : undefined;
  const [viewDate, setViewDate] = useState(selectedDate || maxDate);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [dateStr]);

  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();
  
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase text-muted-foreground px-1">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 bg-background/50", !dateStr && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateStr ? format(selectedDate, "PPP") : <span>Select date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 border-border bg-popover" align="start">
          
          <div className="flex justify-between gap-2 mb-3">
            <Select 
              value={viewDate.getMonth().toString()} 
              onValueChange={(val) => {
                const newDate = new Date(viewDate);
                newDate.setMonth(parseInt(val));
                setViewDate(newDate);
              }}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue>{months[viewDate.getMonth()]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => {
                  const isDisabled = (viewDate.getFullYear() === minYear && i < minDate.getMonth()) || 
                                     (viewDate.getFullYear() === maxYear && i > maxDate.getMonth());
                  return (
                    <SelectItem 
                      key={i} 
                      value={i.toString()} 
                      disabled={isDisabled}
                      className={isDisabled ? "opacity-50 text-muted-foreground" : ""}
                    >
                      {m}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select 
              value={viewDate.getFullYear().toString()} 
              onValueChange={(val) => {
                const newDate = new Date(viewDate);
                newDate.setFullYear(parseInt(val));
                if (parseInt(val) === minYear && newDate.getMonth() < minDate.getMonth()) newDate.setMonth(minDate.getMonth());
                if (parseInt(val) === maxYear && newDate.getMonth() > maxDate.getMonth()) newDate.setMonth(maxDate.getMonth());
                setViewDate(newDate);
              }}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue>{viewDate.getFullYear()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Calendar
            mode="single"
            month={viewDate}
            onMonthChange={setViewDate}
            selected={selectedDate}
            onSelect={(d) => setDateStr(d ? format(d, 'yyyy-MM-dd') : '')}
            disabled={{ before: minDate, after: maxDate }}
            components={{ 
              Caption: () => null,
              MonthCaption: () => null, 
              Nav: () => null
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// --- MAIN APPLICATION ---
export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [contacts, setContacts] = useState({}); 
  const [selectedContact, setSelectedContact] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  
  const [chatId, setChatId] = useState(null);
  const [bounds, setBounds] = useState({ min: '', max: '' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [msgCount, setMsgCount] = useState(15);
  const [displayAll, setDisplayAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Core Chat State
  const [messages, setMessages] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMsg, setHighlightedMsg] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/contacts')
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => console.error("Error fetching contacts:", err));
  }, []);

  useEffect(() => {
    setChatId(null);
    setBounds({ min: '', max: '' });
    setDisplayAll(false);
    setMsgCount(15);
    setMessages([]);
    setMetrics(null);
    setSearchTerm('');
    setIsSearchOpen(false);

    if (!selectedContact) return;

    const fetchBounds = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/chat-bounds?contact=${encodeURIComponent(selectedContact)}`);
        const data = await res.json();
        
        if (res.ok) {
          setChatId(data.chatId);
          const minDate = data.startDate.split('T')[0];
          const maxDate = data.endDate.split('T')[0];
          
          setBounds({ min: minDate, max: maxDate });
          setStartDate(minDate);
          setEndDate(maxDate);
        }
      } catch (err) {
        console.error("Network error fetching bounds.");
      }
    };
    fetchBounds();
  }, [selectedContact]);

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const mergedValue = newNumber.substring(0, start) + pastedData + newNumber.substring(end);
    let digits = mergedValue.replace(/\D/g, '');
    
    if (digits.length >= 11 && digits.startsWith('1')) digits = digits.substring(1);
    digits = digits.substring(0, 10);
    
    let formatted = digits;
    if (digits.length >= 7) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length >= 4) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    setNewNumber(formatted);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    const isDeleting = val.length < newNumber.length;
    let digits = val.replace(/\D/g, '');
    
    if (digits.length >= 11 && digits.startsWith('1')) digits = digits.substring(1);
    digits = digits.substring(0, 10);
    
    let formatted = digits;
    if (digits.length >= 7) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length >= 4) {
      formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    } else if (digits.length === 3 && !isDeleting) {
      formatted = `(${digits}) `;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    setNewNumber(formatted);
  };

  const handleSaveContact = async () => {
    setSaveMessage('');
    if (!newName.trim() || newNumber.length < 14) {
      setSaveMessage("❌ Please enter a valid name and 10-digit number.");
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), number: newNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage(`❌ ${data.error}`);
      } else {
        setSaveMessage(`✅ ${data.message}`);
        setContacts(prev => ({ ...prev, ...data.contact }));
        setNewName('');
        setNewNumber('');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      setSaveMessage("❌ Server connection error.");
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
    setSearchTerm('');
    setTimeout(() => {
      const target = document.getElementById(`msg-${msgId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsg(msgId);
        setTimeout(() => setHighlightedMsg(null), 2000);
      }
    }, 100);
  };

  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight text-primary">iMessage Archive</h1>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant={activeTab === 'chat' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('chat')} className="text-xs transition-all duration-200 gap-2">
            <MessageCircle className="h-4 w-4" /> Chat Explorer
          </Button>
          <Button variant={activeTab === 'analytics' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('analytics')} className="text-xs transition-all duration-200 gap-2">
            <BarChart2 className="h-4 w-4" /> Global Analytics
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex h-full w-full">
            <aside className="flex w-80 flex-shrink-0 flex-col gap-8 overflow-y-auto border-r border-border bg-card/30 p-6 custom-scrollbar z-10">
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Add Contact</h3>
                </div>
                <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); handleSaveContact(); }}>
                  <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 text-sm" />
                  <Input 
                    placeholder="(555) 123-4567" 
                    value={newNumber} 
                    onChange={handlePhoneChange} 
                    onPaste={handlePhonePaste} 
                    maxLength={14} 
                    className="h-9 text-sm" 
                  />
                  <Button type="submit" size="sm" className="w-full text-xs">Save Contact</Button>
                </form>
                {saveMessage && (
                  <p className={cn("text-xs", saveMessage.includes('❌') ? "text-destructive" : "text-green-500")}>
                    {saveMessage}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Select Contact</h3>
                </div>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue>
                      {Object.keys(contacts).find(key => contacts[key] === selectedContact) || "Select a contact..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(contacts)
                      .sort((a, b) => a.localeCompare(b))
                      .map(name => (
                      <SelectItem key={name} value={contacts[name]}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {chatId && (
                <div className="flex flex-col gap-6 rounded-lg border border-border/50 bg-background/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <Label className="text-xs font-semibold uppercase tracking-wider">Date Range</Label>
                    </div>
                    
                    <AestheticDatePicker 
                      label="Start Date" 
                      dateStr={startDate} 
                      setDateStr={setStartDate} 
                      minDateStr={bounds.min} 
                      maxDateStr={endDate || bounds.max} 
                    />
                    
                    <AestheticDatePicker 
                      label="End Date" 
                      dateStr={endDate} 
                      setDateStr={setEndDate} 
                      minDateStr={startDate || bounds.min} 
                      maxDateStr={bounds.max} 
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Settings2 className="h-4 w-4" />
                      <Label className="text-xs font-semibold uppercase tracking-wider">Parameters</Label>
                    </div>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue>{sortOrder === "ASC" ? "Oldest First" : "Newest First"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASC">Oldest First</SelectItem>
                        <SelectItem value="DESC">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-4">
                      <Input type="number" value={msgCount} onChange={(e) => setMsgCount(e.target.value)} disabled={displayAll} className="h-9 w-20 text-sm" />
                      <div className="flex items-center space-x-2">
                        <Checkbox id="displayAll" checked={displayAll} onCheckedChange={setDisplayAll} />
                        <label htmlFor="displayAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Display ALL
                        </label>
                      </div>
                    </div>
                    <Button onClick={handleFetchMessages} disabled={isLoading} className="mt-2 w-full text-xs font-semibold">
                      {isLoading ? '⏳ Fetching...' : `Fetch Messages`}
                    </Button>
                  </div>
                </div>
              )}
            </aside>

            {/* NEW CHAT RENDERER PANE */}
            <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
              {metrics ? (
                <>
                  <header className="flex flex-col gap-4 border-b border-border bg-card/40 p-4 backdrop-blur-md shrink-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex gap-6 text-sm">
                        <span className="font-medium text-foreground">Total: {metrics.total}</span>
                        <span className="font-medium text-primary">You: {metrics.youCount}</span>
                        <span className="font-medium text-muted-foreground">Them: {metrics.themCount}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={cn("h-8 px-2", isSearchOpen ? "text-primary bg-primary/10" : "text-muted-foreground")}
                      >
                        {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {isSearchOpen && (
                      <Input 
                        type="text" 
                        placeholder="Search within these messages..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 text-sm bg-background"
                        autoFocus
                      />
                    )}
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                    {filteredMessages.length > 0 ? (
                      filteredMessages.map((msg) => {
                        const isYou = msg.sender === 'You';
                        return (
                          <div 
                            key={msg.id} 
                            id={`msg-${msg.id}`} 
                            className={cn("flex flex-col max-w-[75%]", isYou ? "self-end items-end" : "self-start items-start")}
                          >
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                              <span className="text-[10px] text-muted-foreground font-medium">{msg.time}</span>
                              {searchTerm && (
                                <button 
                                  onClick={() => handleJumpToContext(msg.id)}
                                  className="text-[10px] font-semibold text-primary hover:underline transition-colors"
                                  title="Jump to this message in full context"
                                >
                                  📍 Jump
                                </button>
                              )}
                            </div>
                            <div 
                              className={cn(
                                "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-all duration-500 shadow-sm", 
                                isYou ? "bg-[#0a84ff] text-white rounded-br-sm" : "bg-[#262628] text-[#e5e5ea] rounded-bl-sm border-none",
                                highlightedMsg === msg.id && "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                              )}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <Search className="h-8 w-8 opacity-20 mb-2" />
                        <p className="text-sm">No messages match "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-muted-foreground gap-4">
                  <MessageCircle className="h-12 w-12 opacity-10" />
                  <h2 className="text-sm font-medium">
                    {!selectedContact ? "Select a contact to view history" : 'Click "Fetch Messages" to load history'}
                  </h2>
                </div>
              )}
            </section>
            
          </div>
        ) : (
          <div className="flex flex-col flex-1 items-center justify-center gap-4">
            <BarChart2 className="h-12 w-12 text-muted-foreground opacity-10" />
            <h2 className="text-sm text-muted-foreground font-medium">Global Analytics Dashboard coming soon...</h2>
          </div>
        )}
      </main>
    </div>
  );
}