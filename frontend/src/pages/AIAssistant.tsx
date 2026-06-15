import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { 
  Sparkles, Compass, HelpCircle, Send, Plus, 
  DollarSign, Check, Info, Clock, Bookmark
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

// Places catalog for interactive wishlist suggestions
const PLACE_CATALOG = [
  // Rome
  { name: 'Colosseum', type: 'attraction', country: 'Italy' },
  { name: 'Trevi Fountain', type: 'attraction', country: 'Italy' },
  { name: 'Pantheon', type: 'attraction', country: 'Italy' },
  { name: 'Vatican Museums', type: 'attraction', country: 'Italy' },
  { name: 'Spanish Steps', type: 'attraction', country: 'Italy' },
  { name: 'Rome', type: 'city', country: 'Italy' },
  // Tokyo
  { name: 'Shibuya Crossing', type: 'attraction', country: 'Japan' },
  { name: 'Senso-ji Temple', type: 'attraction', country: 'Japan' },
  { name: 'Meiji Jingu Shrine', type: 'attraction', country: 'Japan' },
  { name: 'TeamLab Planets', type: 'attraction', country: 'Japan' },
  { name: 'Mount Fuji', type: 'attraction', country: 'Japan' },
  { name: 'Ichiran Ramen Shibuya', type: 'attraction', country: 'Japan' },
  { name: 'Tokyo', type: 'city', country: 'Japan' },
  // Paris
  { name: 'Eiffel Tower', type: 'attraction', country: 'France' },
  { name: 'Louvre Museum', type: 'attraction', country: 'France' },
  { name: 'Montmartre', type: 'attraction', country: 'France' },
  { name: 'Palace of Versailles', type: 'attraction', country: 'France' },
  { name: 'Seine River Cruise', type: 'attraction', country: 'France' },
  { name: 'Paris', type: 'city', country: 'France' },
  // London
  { name: 'British Museum', type: 'attraction', country: 'United Kingdom' },
  { name: 'Tower of London', type: 'attraction', country: 'United Kingdom' },
  { name: 'London Eye', type: 'attraction', country: 'United Kingdom' },
  { name: 'Westminster Abbey', type: 'attraction', country: 'United Kingdom' },
  { name: 'Borough Market', type: 'attraction', country: 'United Kingdom' },
  { name: 'London', type: 'city', country: 'United Kingdom' }
];

const detectPlaces = (text: string) => {
  const detected: typeof PLACE_CATALOG = [];
  const lowerText = text.toLowerCase();
  
  PLACE_CATALOG.forEach(place => {
    if (lowerText.includes(place.name.toLowerCase())) {
      // Check if place is already added to avoid duplicates
      if (!detected.some(p => p.name === place.name)) {
        detected.push(place);
      }
    }
  });
  
  return detected.slice(0, 3);
};

// Custom Markdown parser rendering styled HTML elements
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInlineMarkdown = (lineText: string) => {
    const parts = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;
    let lastIndex = 0;
    
    while ((match = regex.exec(lineText)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(lineText.substring(lastIndex, matchIndex));
      }
      
      const matchedStr = match[0];
      if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
        parts.push(<strong key={matchIndex} className="font-extrabold text-slate-900 dark:text-white">{matchedStr.slice(2, -2)}</strong>);
      } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
        parts.push(<code key={matchIndex} className="px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 rounded font-mono text-emerald-600 dark:text-emerald-400 text-xs">{matchedStr.slice(1, -1)}</code>);
      }
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < lineText.length) {
      parts.push(lineText.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : lineText;
  };

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 my-2 space-y-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-4 mb-2 first:mt-1 font-serif">
          {parseInlineMarkdown(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-4 mb-2 first:mt-1 font-serif">
          {parseInlineMarkdown(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-4 mb-2 first:mt-1 font-serif">
          {parseInlineMarkdown(trimmed.substring(2))}
        </h2>
      );
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(
        <li key={idx} className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
          {parseInlineMarkdown(trimmed.substring(2))}
        </li>
      );
    } else {
      if (inList) {
        flushList(idx);
        inList = false;
      }
      
      if (trimmed === '') {
        elements.push(<div key={idx} className="h-2" />);
      } else {
        elements.push(
          <p key={idx} className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed mb-1.5 last:mb-0">
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);

  return <div className="space-y-1.5">{elements}</div>;
};

interface Activity {
  time: string;
  title: string;
  description: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  activities: Activity[];
}

interface EstimatedCost {
  total: number;
  breakdown: Record<string, number>;
}

interface ItineraryResult {
  destination: string;
  days: number;
  budget: string;
  interests: string[];
  estimatedCost: EstimatedCost;
  itinerary: ItineraryDay[];
  isMock?: boolean;
  tips?: string[];
}

export const AIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState<'planner' | 'chat'>('planner');

  // ITINERARY PLANNER STATE
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('3');
  const [budget, setBudget] = useState('medium');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [itineraryResult, setItineraryResult] = useState<ItineraryResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // TRAVEL ASSISTANT CHAT STATE
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'assistant', text: "Hello! I am your TravelVerse AI Assistant. Ask me anything about your upcoming journeys—local customs, safety tips, best travel seasons, or transit choices!" }
  ]);
  const [sendingChat, setSendingChat] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when history changes
  useEffect(() => {
    if (activeTool === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, sendingChat, activeTool]);

  const interestOptions = ['Nature', 'Beaches', 'Adventure', 'Food', 'Shopping', 'Historical', 'Art', 'Nightlife'];

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  // Generate Itinerary
  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !days) return;
    setGenerating(true);
    setItineraryResult(null);
    setSaveStatus('idle');

    try {
      const data = await apiRequest('/ai/itinerary', {
        method: 'POST',
        body: {
          destination,
          days: parseInt(days),
          budget,
          interests: selectedInterests
        }
      });
      setItineraryResult(data);
    } catch (err) {
      console.error('Itinerary generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Convert AI generation to actual saved Trip log in DB!
  const handleSaveToTrips = async () => {
    if (!itineraryResult || saveStatus !== 'idle') return;
    setSaveStatus('saving');

    try {
      // Create trip entry
      const budgetTotal = itineraryResult.estimatedCost?.total || 1500;
      
      const tripRes = await apiRequest('/trips', {
        method: 'POST',
        body: {
          title: `AI Plan: ${itineraryResult.days} days in ${itineraryResult.destination}`,
          country: itineraryResult.destination,
          cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
          status: 'planned',
          budget: budgetTotal,
          description: `Generated by TravelVerse AI. Key interests: ${selectedInterests.join(', ') || 'sightseeing'}`
        }
      });

      if (tripRes.trip) {
        // Now save the day notes for each generated day in the database
        const savedTrip = tripRes.trip;
        
        for (const item of (itineraryResult.itinerary || [])) {
          const notesText = item.activities?.map((a: Activity) => `* **${a.time || ''} - ${a.title}**: ${a.description}`).join('\n\n') || '';
          
          await apiRequest('/trips/itinerary', {
            method: 'POST',
            body: {
              trip_id: savedTrip.id,
              day_number: item.day,
              notes: `### ${item.title}\n\n${notesText}`
            }
          });
        }

        // Save expense breakdown estimates
        const costItems = itineraryResult.estimatedCost?.breakdown || {};
        for (const cat of Object.keys(costItems)) {
          const amount = costItems[cat];
          if (amount > 0) {
            // Category mapping helper
            const catMap: { [key: string]: string } = {
              accommodation: 'Lodging',
              food: 'Food',
              transport: 'Transport',
              activities: 'Activities'
            };
            
            await apiRequest('/expenses', {
              method: 'POST',
              body: {
                trip_id: savedTrip.id,
                amount,
                description: `Est. ${cat} share`,
                category: catMap[cat] || 'Other'
              }
            });
          }
        }

        setSaveStatus('saved');
        setTimeout(() => {
          navigate(`/trips/${savedTrip.id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to convert AI plan to trip log:', err);
      setSaveStatus('idle');
    }
  };

  // Conversational Travel Q&A
  const submitChatQuestion = async (userMsg: string) => {
    if (!userMsg.trim() || sendingChat) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setSendingChat(true);

    try {
      const data = await apiRequest('/ai/assistant', {
        method: 'POST',
        body: { 
          question: userMsg,
          history: [...chatHistory, { sender: 'user', text: userMsg }]
        }
      });
      if (data.answer) {
        setChatHistory(prev => [...prev, { sender: 'assistant', text: data.answer }]);
      }
    } catch (err) {
      console.error('Chat failed:', err);
      setChatHistory(prev => [...prev, { sender: 'assistant', text: 'Sorry, I lost connection to my AI nodes. Please check environment variables or try again later.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    submitChatQuestion(chatInput.trim());
    setChatInput('');
  };

  const handleAddToWishlist = async (place: { name: string; type: string; country: string }) => {
    try {
      setSavedPlaces(prev => ({ ...prev, [place.name]: true }));
      await apiRequest('/social/wishlist', {
        method: 'POST',
        body: { type: place.type, name: place.name, country: place.country }
      });
    } catch (err) {
      console.error('Failed to add to wishlist:', err);
      setSavedPlaces(prev => ({ ...prev, [place.name]: false }));
    }
  };

  const suggestedPrompts = [
    { label: '🌸 Tokyo Season Guide', text: 'What is the best season to visit Tokyo?' },
    { label: '🚇 Rome Airport Transit', text: 'How do I get to Termini from Fiumicino Airport in Rome?' },
    { label: '🍝 Roman Dishes Checklist', text: 'What are the main local food specialties I must eat in Rome?' },
    { label: '🔒 Solo Safety Tips', text: 'Give me important safety guidelines for solo travelers.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-emerald-500 animate-pulse" />
          AI Travel Concierge
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Leverage Gemini intelligence to construct day-by-day plans or query local travel advice.</p>
      </div>

      {/* Tool Toggle tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTool('planner')}
          className={`pb-4 px-4 border-b-2 transition-all cursor-pointer ${
            activeTool === 'planner'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          AI Trip Planner
        </button>
        <button
          onClick={() => setActiveTool('chat')}
          className={`pb-4 px-4 border-b-2 transition-all cursor-pointer ${
            activeTool === 'chat'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Travel Q&A Assistant
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL A: ITINERARY PLANNER */}
        {activeTool === 'planner' && (
          <>
            {/* Input wizard */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs h-fit space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Itinerary Wizard</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Define your destination and interests</p>
              </div>

              <form onSubmit={handleGenerateItinerary} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Destination</label>
                  <input
                    type="text"
                    required
                    placeholder="Tokyo, Japan"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Duration (Days)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={14}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Budget Level</label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                    >
                      <option value="low">Budget (Low)</option>
                      <option value="medium">Moderate (Medium)</option>
                      <option value="high">Luxury (High)</option>
                    </select>
                  </div>
                </div>

                {/* Interests Checklist */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {interestOptions.map((interest) => {
                      const selected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleToggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                            selected
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-900'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  {generating ? 'Drafting Plans...' : 'Draft Itinerary'}
                </button>
              </form>
            </div>

            {/* Results display */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs">
              {generating ? (
                <div className="flex flex-col justify-center items-center py-24 text-slate-450 space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
                  <span className="font-bold text-sm">Gemini AI is crafting your dream schedule...</span>
                  <p className="text-[10px] text-slate-400">Consulting regional transport grids and sightseeing spots.</p>
                </div>
              ) : itineraryResult ? (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Top results header */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">
                        {itineraryResult.days} Days in {itineraryResult.destination}
                      </h3>
                      {itineraryResult.isMock && (
                        <div className="mt-1 bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full inline-block dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
                          Demo Mode Active (No Gemini Key)
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveToTrips}
                      disabled={saveStatus !== 'idle'}
                      className="px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      {saveStatus === 'saving' ? 'Saving Logs...' : (saveStatus === 'saved' ? 'Saved! Redirecting...' : 'Save as Trip Log')}
                    </button>
                  </div>

                  {/* Cost estimation banner */}
                  <div className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-3 flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      Cost Estimation: ${itineraryResult.estimatedCost?.total} USD
                    </h4>
                    
                    {/* Category breakdowns */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                      {Object.keys(itineraryResult.estimatedCost?.breakdown || {}).map((cat) => (
                        <div key={cat} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{cat}</span>
                          <span className="block font-bold text-slate-800 dark:text-slate-100 mt-0.5">${itineraryResult.estimatedCost.breakdown[cat]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Day-by-day Itinerary tree */}
                  <div className="space-y-6">
                    {(itineraryResult.itinerary || []).map((day) => (
                      <div key={day.day} className="border-l-2 border-emerald-500 pl-4 py-1 space-y-3 font-sans">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{day.title}</h4>
                        
                        <div className="space-y-3">
                          {(day.activities || []).map((act, idx: number) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-850/40 p-3.5 rounded-xl border border-slate-100/30 text-xs">
                              <div className="flex items-center gap-1.5 mb-1.5 font-bold text-slate-700 dark:text-slate-300">
                                <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>{act.time}</span>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{act.title}</span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 leading-normal">{act.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tips box */}
                  {itineraryResult.tips && itineraryResult.tips.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-2xl dark:bg-emerald-950/20 dark:border-emerald-900/30 text-xs text-slate-650 dark:text-slate-400">
                      <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <Info className="h-4.5 w-4.5" />
                        AI Travel Recommendations
                      </h4>
                      <ul className="list-disc pl-4 space-y-1.5">
                        {itineraryResult.tips.map((tip: string, idx: number) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-28 text-slate-400">
                  <Compass className="h-14 w-12 mx-auto text-slate-350 mb-3" />
                  <p className="text-sm font-semibold">Ready to draft your travel plan</p>
                  <p className="text-xs text-slate-450 mt-1">Specify destination details in the wizard tray to let AI generate schedules.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* PANEL B: TRAVEL Q&A CHAT */}
        {activeTool === 'chat' && (
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-xs h-[65vh] flex flex-col overflow-hidden">
            
            {/* Chat message logs */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 font-sans text-xs sm:text-sm">
              {chatHistory.map((msg, idx) => {
                const isAssistant = msg.sender === 'assistant';
                const detectedPlaces = isAssistant ? detectPlaces(msg.text) : [];

                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2.5 max-w-[85%] ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* Avatar icon */}
                    <div className={`p-2 rounded-xl shrink-0 ${isAssistant ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300'}`}>
                      {isAssistant ? <Sparkles className="h-4.5 w-4.5" /> : <HelpCircle className="h-4.5 w-4.5" />}
                    </div>

                    <div className="flex flex-col gap-1.5 w-full">
                      {/* Chat Text */}
                      <div className={`p-3.5 rounded-2xl leading-relaxed ${
                        isAssistant 
                          ? 'bg-slate-50 border border-slate-100 dark:bg-slate-850/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300' 
                          : 'bg-emerald-500 text-white font-semibold'
                      }`}>
                        {isAssistant ? (
                          <MarkdownRenderer text={msg.text} />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        )}
                      </div>

                      {/* Detected Places Actions */}
                      {isAssistant && detectedPlaces.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-2 mt-1">
                          {detectedPlaces.map((place) => {
                            const isSaved = savedPlaces[place.name];
                            return (
                              <button
                                key={place.name}
                                onClick={() => handleAddToWishlist(place)}
                                disabled={isSaved}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                  isSaved
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-850 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isSaved ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Added {place.name}!</span>
                                  </>
                                ) : (
                                  <>
                                    <Bookmark className="h-3.5 w-3.5 text-slate-450 group-hover:text-emerald-500" />
                                    <span>Add {place.name} to Wishlist</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sendingChat && (
                <div className="flex items-center gap-2.5 text-xs text-slate-400 animate-pulse">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <span>Gemini is drafting an answer...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts Pills */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/10 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 select-none">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => submitChatQuestion(prompt.text)}
                  disabled={sendingChat}
                  className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 dark:bg-slate-900 dark:border-slate-850 dark:hover:border-emerald-500 dark:text-slate-350 text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50 dark:bg-slate-950/20 flex gap-2">
              <input
                type="text"
                placeholder="Ask travel questions (e.g. What is the best season to visit Rome?)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white p-3 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
};
export default AIAssistant;
