import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  MessageSquare, MessageCircle, BarChart2, UserPlus, Settings2, 
  CalendarDays, Search, CalendarIcon, X, Edit2, Trash2, Check, 
  AlertCircle, CheckCircle2, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

// Exact Apple UI replicas for Tapbacks
const TapbackIcon = ({ type, customEmoji }) => {
  if (customEmoji) {
    return <span className="text-[15px] leading-none">{customEmoji}</span>;
  }
  
  switch(type) {
    case 2000: // Love (Solid Soft Pink Heart)
      return <svg viewBox="0 0 24 24" fill="#FF529A" className="w-[15px] h-[15px] drop-shadow-sm"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
    case 2001: // Like (Solid White Thumb Up)
      return <svg viewBox="0 0 24 24" fill="#FFFFFF" className="w-[13px] h-[13px] drop-shadow-sm"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0 1.1-.9-2-2-2h-5.98l1.09-5.32V3.36c0-.41-.17-.79-.44-1.06L13.62 1l-6.53 6.64c-.45.47-.73 1.1-.73 1.78v8.42c0 1.29 1.05 2.34 2.34 2.34h7.52c1.23 0 2.25-.97 2.38-2.18l1.23-8.84c.03-.1.05-.2.05-.3l-.05-.98z"/></svg>;
    case 2002: // Dislike (Solid White Thumb Down)
      return <svg viewBox="0 0 24 24" fill="#FFFFFF" className="w-[13px] h-[13px] drop-shadow-sm"><path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8V13c0 1.1.9 2 2 2h5.98L8.89 20.32v.32c0 .41.17.79.44 1.06L10.38 23l6.53-6.64c.45-.47.73-1.1.73-1.78V6.16C17.64 4.87 16.59 3.82 15.3 3.82H7.78c-1.23 0-2.25.97-2.38 2.18L4.17 14.84c-.03.1-.05.2-.05.3l.05.98z"/></svg>;
    case 2003: // Laugh (Stacked HA HA)
      return <span className="text-[#FFFFFF] font-black tracking-tighter text-[7px] leading-[7.5px] drop-shadow-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>HA<br/>HA</span>;
    case 2004: // Emphasize (Apple Pink !!)
      return <span className="text-[#FFFFFF] font-black text-[15px] leading-none tracking-tighter drop-shadow-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>!!</span>;
    case 2005: // Question (White ?)
      return <span className="text-[#FFFFFF] font-black text-[14px] leading-none drop-shadow-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>?</span>;
    default:
      return <span className="text-[#FFFFFF] font-black text-[10px]">...</span>;
  }
};

const parseSafeDate = (dateStr) => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-');
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12, 0, 0);
};

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

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [contacts, setContacts] = useState({}); 
  const [selectedContact, setSelectedContact] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  
  // Refactored Message States (Objects instead of strings to support dynamic icons)
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  
  // Contact Management State
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editContactName, setEditContactName] = useState('');
  const [contactManageMessage, setContactManageMessage] = useState({ type: '', text: '' });

  const [chatId, setChatId] = useState(null);
  const [bounds, setBounds] = useState({ min: '', max: '' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [msgCount, setMsgCount] = useState(15);
  const [displayAll, setDisplayAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    
    // Reset management state when switching contacts
    setIsEditingContact(false);
    setIsConfirmingDelete(false);
    setContactManageMessage({ type: '', text: '' });

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
    setSaveMessage({ type: '', text: '' });
    if (!newName.trim() || newNumber.length < 14) {
      setSaveMessage({ type: 'error', text: "Please enter a valid name and 10-digit number." });
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
        setSaveMessage({ type: 'error', text: data.error });
      } else {
        setSaveMessage({ type: 'success', text: data.message });
        setContacts(prev => ({ ...prev, ...data.contact }));
        setNewName('');
        setNewNumber('');
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: "Server connection error." });
    }
  };

  const handleRenameContact = async () => {
    setContactManageMessage({ type: '', text: '' });
    if (!editContactName.trim()) return;

    const oldName = Object.keys(contacts).find(key => contacts[key] === selectedContact);
    
    try {
      const res = await fetch(`http://localhost:3001/api/contacts/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: editContactName.trim() })
      });
      const data = await res.json();
      
      if (res.ok) {
        setContacts(data.contacts);
        setIsEditingContact(false);
      } else {
        setContactManageMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setContactManageMessage({ type: 'error', text: "Network error." });
    }
  };

  const handleDeleteContact = async () => {
    const oldName = Object.keys(contacts).find(key => contacts[key] === selectedContact);
    
    try {
      const res = await fetch(`http://localhost:3001/api/contacts/${encodeURIComponent(oldName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        setContacts(data.contacts);
        setSelectedContact(''); 
        setIsConfirmingDelete(false);
      } else {
        setContactManageMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setContactManageMessage({ type: 'error', text: "Network error deleting contact." });
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
                {/* DYNAMIC ICON MESSAGING */}
                {saveMessage.text && (
                  <p className={cn("text-[11px] font-medium flex items-center gap-1.5", saveMessage.type === 'error' ? "text-destructive" : "text-green-500")}>
                    {saveMessage.type === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    {saveMessage.text}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Select Contact</h3>
                </div>
                
                <div className="flex flex-col gap-2">
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

                  {/* INLINE EDIT & THEMED DELETE CONFIRMATION */}
                  {selectedContact && (
                    <div className="flex flex-col gap-2 mt-1">
                      {!isEditingContact && !isConfirmingDelete ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditContactName(Object.keys(contacts).find(key => contacts[key] === selectedContact) || '');
                              setIsEditingContact(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1.5" /> Rename
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-destructive opacity-70 hover:opacity-100 hover:bg-destructive/10"
                            onClick={() => setIsConfirmingDelete(true)}
                          >
                            <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                          </Button>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="flex items-center gap-2 bg-destructive/10 p-1.5 rounded-md border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                          <span className="text-[11px] font-medium text-destructive ml-1">Delete contact?</span>
                          <div className="ml-auto flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] hover:bg-background/50" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
                            <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]" onClick={handleDeleteContact}>Confirm</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                          <Input 
                            value={editContactName} 
                            onChange={(e) => setEditContactName(e.target.value)} 
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button size="sm" className="h-7 px-2" onClick={handleRenameContact}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsEditingContact(false)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {contactManageMessage.text && (
                        <p className={cn("text-[11px] font-medium flex items-center gap-1.5", contactManageMessage.type === 'error' ? "text-destructive" : "text-green-500")}>
                          {contactManageMessage.type === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                          {contactManageMessage.text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
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
                      <Input 
                        type="number" 
                        value={msgCount} 
                        onChange={(e) => setMsgCount(e.target.value)} 
                        disabled={displayAll} 
                        className="h-9 w-20 text-sm" 
                      />
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

            <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
              {metrics ? (
                <>
                  <header className="flex flex-col gap-4 border-b border-border bg-card/40 p-4 backdrop-blur-md shrink-0">
                    {/* ADDED gap-4 to keep button spacing */}
                    <div className="flex items-center justify-between w-full gap-4"> 
                      
                      {/* ADDED flex-1 min-w-0 TO FORCE BOUNDARIES */}
                      <div className="flex flex-col gap-3 flex-1 min-w-0"> 
                        
                        {/* MAIN TEXT METRICS */}
                        <div className="flex gap-6 text-sm shrink-0">
                          <span className="font-medium text-foreground">Texts: {metrics.total}</span>
                          <span className="font-medium text-primary">You: {metrics.youCount}</span>
                          <span className="font-medium text-muted-foreground">Them: {metrics.themCount}</span>
                        </div>
                        
                        {/* TAPBACK METRICS & VISUAL BREAKDOWN */}
                        {(metrics.youTapbacks > 0 || metrics.themTapbacks > 0) && (
                          <div className="flex flex-col gap-2 min-w-0">
                            <div className="flex gap-6 text-xs text-muted-foreground shrink-0">
                              <span className="font-medium">Total Tapbacks: {metrics.youTapbacks + metrics.themTapbacks}</span>
                              <span className="font-medium text-primary/80">You: {metrics.youTapbacks}</span>
                              <span className="font-medium text-muted-foreground/80">Them: {metrics.themTapbacks}</span>
                            </div>
                            
                            {/* Individual Icon Counts (CHANGED max-w-full to w-full) */}
                            <div className="flex items-center gap-6 text-[11px] text-muted-foreground font-medium bg-background/50 border border-border/50 rounded-md px-2.5 py-2 w-full overflow-x-auto custom-scrollbar">
                              
                              <div className="flex items-center gap-2 border-r border-border/50 pr-4 shrink-0">
                                <span className="opacity-60 mr-1 whitespace-nowrap">You used:</span>
                                {metrics.tapbackBreakdown.filter(t => t.sender === 'You').length === 0 ? <span className="opacity-40">-</span> : null}
                                {metrics.tapbackBreakdown.filter(t => t.sender === 'You').map((t, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center justify-center bg-[#262628] rounded-full w-5 h-5 shadow-sm border border-border">
                                      <TapbackIcon type={t.type} customEmoji={t.customEmoji} />
                                    </div>
                                    <span className="text-foreground/80">{t.count}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="opacity-60 mr-1 whitespace-nowrap">They used:</span>
                                {metrics.tapbackBreakdown.filter(t => t.sender === 'Them').length === 0 ? <span className="opacity-40">-</span> : null}
                                {metrics.tapbackBreakdown.filter(t => t.sender === 'Them').map((t, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center justify-center bg-[#262628] rounded-full w-5 h-5 shadow-sm border border-border">
                                      <TapbackIcon type={t.type} customEmoji={t.customEmoji} />
                                    </div>
                                    <span className="text-foreground/80">{t.count}</span>
                                  </div>
                                ))}
                              </div>
                              
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={cn("h-8 px-2 self-start shrink-0", isSearchOpen ? "text-primary bg-primary/10" : "text-muted-foreground")}
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
                        className="h-9 text-sm bg-background shrink-0"
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
                                  className="flex items-center text-[10px] font-semibold text-primary hover:underline transition-colors"
                                  title="Jump to this message in full context"
                                >
                                  <MapPin className="h-3 w-3 mr-1" /> Jump
                                </button>
                              )}
                            </div>
                            
                            {/* BUBBLE WRAPPER (Allows absolute positioning for the Apple Tapback badge) */}
                            <div className="relative">
                              <div 
                                className={cn(
                                  "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-all duration-500 shadow-sm", 
                                  isYou ? "bg-[#0a84ff] text-white rounded-br-sm" : "bg-[#262628] text-[#e5e5ea] rounded-bl-sm border-none",
                                  highlightedMsg === msg.id && "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                )}
                              >
                                {msg.text}
                              </div>

                              {/* OVERLAPPING APPLE TAPBACK BADGE */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div 
                                  className={cn(
                                    "absolute -top-3.5 flex -space-x-1.5 z-10",
                                    isYou ? "-left-3" : "-right-3"
                                  )}
                                >
                                  {msg.reactions.map((reaction, idx) => {
                                    const isMyReaction = reaction.sender === 'You';
                                    const bgColor = isMyReaction ? "bg-[#0a84ff]" : "bg-[#262628]";
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        className={cn(
                                          "border-[2.5px] border-background rounded-full flex items-center justify-center w-8 h-8 shadow-sm",
                                          bgColor
                                        )}
                                        title={`Reacted by ${reaction.sender}`}
                                      >
                                        <TapbackIcon type={reaction.type} customEmoji={reaction.customEmoji} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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