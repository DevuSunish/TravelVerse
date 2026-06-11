import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, Calendar, DollarSign, Plus, Check, X, 
  Vote, PlusCircle, CheckCircle, FileText, ArrowRight, Trash2, HelpCircle
} from 'lucide-react';

export const GroupPlanner: React.FC = () => {
  const { user } = useAuth();
  
  // Lists
  const [groups, setGroups] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Group creation form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Invite member form
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Add Group Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [addingExpense, setAddingExpense] = useState(false);

  // Itinerary selection
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
  const [dayNotes, setDayNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Add activity form
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityCost, setActivityCost] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  const fetchGroups = async () => {
    try {
      const data = await apiRequest('/groups');
      setGroups(data.groups || []);
      setInvitations(data.invitations || []);
      
      // Auto select first group if none selected
      if (data.groups?.length > 0 && !selectedGroup) {
        handleSelectGroup(data.groups[0]);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSelectGroup = async (group: any) => {
    setSelectedGroup(group);
    setLoadingDetails(true);
    setInviteMessage(null);
    try {
      const details = await apiRequest(`/groups/${group.id}`);
      setGroupDetails(details);
      
      // Setup default selected day notes
      if (details.itineraries?.length > 0) {
        const firstDay = details.itineraries[0];
        setSelectedDayNum(firstDay.day_number);
        setDayNotes(firstDay.notes || '');
      } else {
        setSelectedDayNum(1);
        setDayNotes('');
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const data = await apiRequest('/groups', {
        method: 'POST',
        body: { name: newGroupName, description: newGroupDesc }
      });
      if (data.group) {
        setNewGroupName('');
        setNewGroupDesc('');
        setShowCreateModal(false);
        fetchGroups();
      }
    } catch (err) {
      console.error('Create group failed:', err);
    }
  };

  const handleInvitationResponse = async (groupId: number, accept: boolean) => {
    try {
      await apiRequest('/groups/respond', {
        method: 'POST',
        body: { groupId, accept }
      });
      fetchGroups();
    } catch (err) {
      console.error('Invitation response failed:', err);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedGroup) return;
    setInviting(true);
    setInviteMessage(null);

    try {
      await apiRequest('/groups/invite', {
        method: 'POST',
        body: { groupId: selectedGroup.id, usernameToInvite: inviteUsername }
      });
      setInviteUsername('');
      setInviteMessage('Invitation sent successfully!');
      
      // Refresh details to show pending list
      const details = await apiRequest(`/groups/${selectedGroup.id}`);
      setGroupDetails(details);
    } catch (err: any) {
      setInviteMessage(err.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expDesc || !selectedGroup) return;
    setAddingExpense(true);

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: {
          group_id: selectedGroup.id,
          amount: parseFloat(expAmount),
          description: expDesc,
          category: expCategory
        }
      });
      setExpAmount('');
      setExpDesc('');
      setExpCategory('Food');

      // Refresh group details
      const details = await apiRequest(`/groups/${selectedGroup.id}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Failed to add group expense:', err);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleSaveItineraryNotes = async () => {
    if (!selectedGroup) return;
    setSavingNotes(true);
    try {
      await apiRequest('/groups/itinerary', {
        method: 'POST',
        body: {
          groupId: selectedGroup.id,
          day_number: selectedDayNum,
          notes: dayNotes
        }
      });
      // Refresh local data
      const updatedList = groupDetails.itineraries.map((it: any) => {
        if (it.day_number === selectedDayNum) return { ...it, notes: dayNotes };
        return it;
      });
      setGroupDetails({ ...groupDetails, itineraries: updatedList });
    } catch (err) {
      console.error('Save group itinerary notes failed:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle || !selectedGroup) return;
    setAddingActivity(true);

    try {
      await apiRequest('/groups/activity', {
        method: 'POST',
        body: {
          groupId: selectedGroup.id,
          title: activityTitle,
          description: activityDesc,
          cost: activityCost ? parseFloat(activityCost) : 0
        }
      });
      setActivityTitle('');
      setActivityDesc('');
      setActivityCost('');
      
      // Refresh group details
      const details = await apiRequest(`/groups/${selectedGroup.id}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Failed to add group activity:', err);
    } finally {
      setAddingActivity(false);
    }
  };

  const handleVoteActivity = async (activityId: number) => {
    try {
      const data = await apiRequest('/groups/vote', {
        method: 'POST',
        body: { activityId }
      });
      if (data.activity && groupDetails) {
        const updatedActivities = groupDetails.activities.map((a: any) => {
          if (a.id === activityId) return { ...a, votes_count: data.activity.votes_count };
          return a;
        });
        setGroupDetails({ ...groupDetails, activities: updatedActivities });
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const handleDeleteExpense = async (expId: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await apiRequest(`/expenses/${expId}`, { method: 'DELETE' });
      // Refresh group details
      const details = await apiRequest(`/groups/${selectedGroup.id}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Delete expense failed:', err);
    }
  };

  // Split details calculator based on balances from backend
  const getExpensesSummary = () => {
    if (!groupDetails?.expenses) return { totalSpent: 0, balancesList: [] };
    
    let totalSpent = 0;
    groupDetails.expenses.forEach((e: any) => {
      totalSpent += parseFloat(e.amount || '0');
    });

    // We can parse or display the backend-calculated balances.
    // Let's compute group member balances here for instant react responsiveness:
    const balances: { [username: string]: number } = {};
    const activeMembers = groupDetails.members.filter((m: any) => m.status === 'accepted');
    
    activeMembers.forEach((m: any) => {
      balances[m.username] = 0;
    });

    const share = activeMembers.length > 0 ? totalSpent / activeMembers.length : 0;

    groupDetails.expenses.forEach((e: any) => {
      const amt = parseFloat(e.amount || '0');
      const payer = e.paid_by_username;
      
      activeMembers.forEach((m: any) => {
        if (m.username === payer) {
          balances[payer] += (amt - share);
        } else if (balances[m.username] !== undefined) {
          balances[m.username] -= share;
        }
      });
    });

    const list = Object.keys(balances).map(username => ({
      username,
      balance: parseFloat(balances[username].toFixed(2))
    }));

    return { totalSpent, balancesList: list };
  };

  const { totalSpent, balancesList } = getExpensesSummary();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Group Travel Collaboration</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Plan itineraries, vote on attraction visits, and split bills in real-time travel groups.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Create Group
        </button>
      </div>

      {/* Invitations Alert Banner */}
      {invitations.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl mb-8 space-y-3 dark:bg-emerald-950/20 dark:border-emerald-900/30">
          <h4 className="font-bold text-xs uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Group Invitations ({invitations.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3 rounded-xl shadow-2xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{inv.name}</span>
                  <span className="text-[10px] text-slate-400">{inv.description || 'No description'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvitationResponse(inv.id, true)}
                    className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(inv.id, false)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-500 dark:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-16 rounded-3xl text-center text-slate-400 max-w-2xl mx-auto shadow-xs">
          <Users className="h-16 w-12 mx-auto text-slate-350 mb-3" />
          <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-white mb-2">No travel groups yet</h3>
          <p className="text-xs text-slate-500 mb-6">Create a travel group or check your invites to start voting on activities and dividing expenses!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar: Groups selector */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Your Groups</h3>
            <div className="space-y-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGroup(g)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedGroup?.id === g.id
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                      : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-850 hover:bg-slate-50 text-slate-650 dark:text-slate-300'
                  }`}
                >
                  <h4 className="font-bold text-sm block leading-snug">{g.name}</h4>
                  <span className="text-[10px] text-slate-400 mt-1 block line-clamp-1">{g.description || 'No description'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="lg:col-span-3">
            {selectedGroup && (
              <div className="space-y-8">
                
                {/* 1. Header & Invite Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs flex flex-col md:flex-row justify-between items-start gap-6">
                  
                  {/* Title & Desc */}
                  <div>
                    <h2 className="text-2xl font-bold font-serif text-slate-800 dark:text-slate-100">{selectedGroup.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">{selectedGroup.description || 'No description'}</p>
                    
                    {/* Active members avatars */}
                    {groupDetails && (
                      <div className="flex items-center gap-1.5 mt-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Members:</span>
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {groupDetails.members.map((m: any) => (
                            <img
                              key={m.id}
                              src={m.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                              alt={m.username}
                              title={`${m.username} (${m.role}) - ${m.status}`}
                              className={`inline-block h-7.5 w-7.5 rounded-full object-cover ring-2 ring-white bg-slate-150 ${m.status === 'pending' ? 'opacity-40 grayscale' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Invite Friend Form */}
                  <div className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 w-full md:w-auto md:min-w-[280px]">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">Invite Friend</h4>
                    <form onSubmit={handleInviteMember} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Search username..."
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={inviting}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shrink-0 cursor-pointer dark:bg-slate-700"
                      >
                        Invite
                      </button>
                    </form>
                    {inviteMessage && (
                      <span className="text-[10px] font-bold text-emerald-600 block mt-1.5">{inviteMessage}</span>
                    )}
                  </div>
                </div>

                {/* Subsections: Itinerary & Activity Voting, Expenses Splitter */}
                {loadingDetails ? (
                  <div className="flex justify-center items-center py-20 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                  </div>
                ) : groupDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* LEFT SUBCOLUMN: Collaborative Itinerary & Activity Voting */}
                    <div className="space-y-6">
                      
                      {/* Itinerary notes */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Group Notes</h3>
                          <button
                            onClick={handleSaveItineraryNotes}
                            disabled={savingNotes}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shrink-0"
                          >
                            {savingNotes ? 'Saving...' : 'Save Notes'}
                          </button>
                        </div>

                        <textarea
                          placeholder="Write group packing check-lists, travel schedule notes, or key details..."
                          value={dayNotes}
                          onChange={(e) => setDayNotes(e.target.value)}
                          rows={6}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-normal"
                        />
                      </div>

                      {/* Scheduled Activities with voting */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-5">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Activity Voting</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Vote on proposed activities to add to schedule</p>
                        </div>

                        {/* Add activity form */}
                        <form onSubmit={handleAddActivity} className="space-y-2 border-b border-slate-50 dark:border-slate-800/40 pb-4">
                          <input
                            type="text"
                            required
                            placeholder="Hiking to viewpoint"
                            value={activityTitle}
                            onChange={(e) => setActivityTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Notes (Optional)"
                              value={activityDesc}
                              onChange={(e) => setActivityDesc(e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                            />
                            <input
                              type="number"
                              placeholder="Cost ($)"
                              value={activityCost}
                              onChange={(e) => setActivityCost(e.target.value)}
                              className="w-[80px] bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                            />
                            <button
                              type="submit"
                              disabled={addingActivity}
                              className="bg-slate-800 hover:bg-slate-750 text-white font-bold px-3 py-1.5 rounded-xl text-xs shrink-0 cursor-pointer dark:bg-slate-700"
                            >
                              Propose
                            </button>
                          </div>
                        </form>

                        {/* Activity list with votes */}
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {groupDetails.activities?.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No proposed activities yet. Suggest one!</p>
                          ) : (
                            groupDetails.activities.map((act: any) => (
                              <div key={act.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                                <div>
                                  <span className="font-bold text-slate-750 dark:text-slate-200 block">{act.title}</span>
                                  {act.description && <span className="text-[10px] text-slate-400 block mt-0.5">{act.description}</span>}
                                  {act.cost > 0 && <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Est. Cost: ${act.cost}</span>}
                                </div>
                                
                                <button
                                  onClick={() => handleVoteActivity(act.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-650 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-350 transition-colors"
                                >
                                  <Vote className="h-4 w-4" />
                                  <span>{act.votes_count}</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                      </div>

                    </div>

                    {/* RIGHT SUBCOLUMN: Expenses & Debts Splitting */}
                    <div className="space-y-6">
                      
                      {/* Splitwise balances overview */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-4">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Expenses Balance</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Who owes what (based on equal shares of total: ${Math.round(totalSpent)})</p>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {balancesList.map((bal: any, idx: number) => {
                            const isPositive = bal.balance > 0;
                            const isZero = bal.balance === 0;

                            return (
                              <div key={idx} className="flex justify-between items-center p-2 rounded-xl text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300">{bal.username}</span>
                                {isZero ? (
                                  <span className="text-slate-400">Settled Up</span>
                                ) : (
                                  <span className={isPositive ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                                    {isPositive ? `Owed: $${bal.balance}` : `Owes: $${Math.abs(bal.balance)}`}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Group Expense Form */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Log Shared Expense</h3>
                        
                        <form onSubmit={handleAddExpense} className="space-y-3">
                          <input
                            type="text"
                            required
                            placeholder="Description (e.g. Taxi fare)"
                            value={expDesc}
                            onChange={(e) => setExpDesc(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                required
                                placeholder="Amount"
                                value={expAmount}
                                onChange={(e) => setExpAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-6 pr-3 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                              />
                            </div>
                            <select
                              value={expCategory}
                              onChange={(e) => setExpCategory(e.target.value)}
                              className="w-[110px] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                            >
                              <option value="Food">Dining</option>
                              <option value="Lodging">Lodging</option>
                              <option value="Transport">Transit</option>
                              <option value="Activities">Activities</option>
                              <option value="Shopping">Shopping</option>
                              <option value="Other">Other</option>
                            </select>
                            <button
                              type="submit"
                              disabled={addingExpense}
                              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Group Expense Ledger */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Expenses Ledger</h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                          {groupDetails.expenses?.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No expenses logged yet.</p>
                          ) : (
                            groupDetails.expenses.map((exp: any) => (
                              <div key={exp.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-transparent hover:border-slate-200/40 transition-all">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight">{exp.description}</span>
                                  <span className="text-[9px] text-slate-400 block mt-0.5">Paid by {exp.paid_by_username}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">${exp.amount}</span>
                                  {exp.paid_by_user_id === user?.id && (
                                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-300 hover:text-rose-500">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

      {/* Floating Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in font-sans">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">Create Travel Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="Graduation World Tour 2026"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Description (Optional)</label>
                <textarea
                  placeholder="Backpacking Europe with college friends. Cities: London, Paris, Rome, Barcelona."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-normal"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Create Group
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default GroupPlanner;
