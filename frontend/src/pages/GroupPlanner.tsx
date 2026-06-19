import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Check, X, Vote, Trash2, Plus, MessageSquare, Send, Search, Settings as SettingsIcon,
  ChevronLeft, Image, DollarSign, Calendar, Shield, UserMinus, ShieldCheck, CheckSquare, ListTodo,
  Compass
} from 'lucide-react';

interface Group {
  id: number;
  name: string;
  description?: string;
  cover_image?: string;
  created_at: string;
}

interface Invitation {
  id: number;
  name: string;
  description?: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  username: string;
  status: 'pending' | 'accepted' | 'declined';
  profile_picture?: string;
  role?: string;
  is_online?: boolean;
  last_seen?: string;
}

interface GroupItinerary {
  id: number;
  group_id: number;
  day_number: number;
  notes?: string;
}

interface GroupActivity {
  id: number;
  group_id: number;
  title: string;
  description?: string;
  cost: number;
  votes_count: number;
}

interface GroupExpense {
  id: number;
  group_id: number;
  paid_by_user_id: number;
  paid_by_username: string;
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

interface GroupDetails {
  id: number;
  name: string;
  description?: string;
  cover_image?: string;
  created_at: string;
  members: GroupMember[];
  itineraries: GroupItinerary[];
  activities: GroupActivity[];
  expenses: GroupExpense[];
}

interface DMConversation {
  id: number;
  user1_id: number;
  user2_id: number;
  recipient: {
    id: number;
    username: string;
    profile_picture: string;
    is_online?: boolean;
    last_seen?: string;
  };
  lastMessage?: {
    message_text: string;
    created_at: string;
    sender_id: number;
  };
  unreadCount: number;
  created_at: string;
}

interface Message {
  id: number;
  conversation_id?: number;
  group_id?: number;
  sender_id: number;
  sender_username?: string;
  sender_profile_picture?: string;
  message_text: string;
  message_type: string;
  attachment_url?: string;
  created_at: string;
}

export const GroupPlanner: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'dms'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'info' | 'planning' | 'finance' | 'members'>('info');

  // Lists
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [dms, setDms] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active chat selection
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Chat Input
  const [inputMessage, setInputMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Group creation form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCover, setNewGroupCover] = useState<File | null>(null);
  const [newGroupCoverPreview, setNewGroupCoverPreview] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState<any[]>([]);

  // Invite member form in settings
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Add Group Expense form in settings
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [addingExpense, setAddingExpense] = useState(false);

  // Itinerary selection in settings
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
  const [dayNotes, setDayNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Add activity form in settings
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityCost, setActivityCost] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  // Group Info modification in settings
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupCoverFile, setEditGroupCoverFile] = useState<File | null>(null);
  const [editGroupCoverPreview, setEditGroupCoverPreview] = useState<string | null>(null);
  const [savingGroupInfo, setSavingGroupInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Read URL params
  useEffect(() => {
    const cid = searchParams.get('conversationId');
    const gid = searchParams.get('groupId');
    
    if (cid) {
      setSelectedConversationId(Number(cid));
      setSelectedGroupId(null);
      setShowMobileChat(true);
    } else if (gid) {
      setSelectedGroupId(Number(gid));
      setSelectedConversationId(null);
      setShowMobileChat(true);
    }
  }, [searchParams]);

  // Load lists on startup
  const fetchHubData = async () => {
    try {
      const groupData = await apiRequest('/groups');
      setGroups(groupData.groups || []);
      setInvitations(groupData.invitations || []);

      const dmData = await apiRequest('/chat/conversations');
      setDms(dmData.conversations || []);
    } catch (err) {
      console.error('Failed to load messaging lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
    // Load following list to support direct friend inviting during group creation
    const loadFriends = async () => {
      if (!user) return;
      try {
        const data = await apiRequest(`/social/following/list/${user.id}`);
        setFriendsList(data.following || []);
      } catch (err) {
        console.error('Failed to load friends list:', err);
      }
    };
    loadFriends();
  }, [user]);

  // Polling for messages & list updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      // Refresh conversation list to get last message & unread badge
      fetchHubData();
      
      // Refresh messages for active conversation
      if (selectedConversationId) {
        apiRequest(`/chat/conversations/${selectedConversationId}/messages`)
          .then(data => setMessages(data.messages || []))
          .catch(e => console.error(e));
      } else if (selectedGroupId) {
        apiRequest(`/groups/${selectedGroupId}/messages`)
          .then(data => setMessages(data.messages || []))
          .catch(e => console.error(e));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConversationId, selectedGroupId, user]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    
    let date = new Date(dateString);
    if (typeof dateString === 'string' && !dateString.includes('T') && !dateString.endsWith('Z')) {
      const formatted = dateString.replace(' ', 'T') + 'Z';
      const parsedDate = new Date(formatted);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) {
      return 'Just now';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return diffMins === 1 ? '1m ago' : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
    }
    return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
  };

  // Find and set selectedGroup once groups list loads
  useEffect(() => {
    if (selectedGroupId && groups.length > 0 && !selectedGroup) {
      const match = groups.find(g => g.id === selectedGroupId);
      if (match) {
        setSelectedGroup(match);
        setEditGroupName(match.name);
        setEditGroupDesc(match.description || '');
        setEditGroupCoverPreview(match.cover_image || null);
      }
    }
  }, [selectedGroupId, groups, selectedGroup]);

  // Immediate detail loading when selected IDs change
  useEffect(() => {
    if (!user) return;

    const loadActiveChatDetails = async () => {
      if (selectedConversationId) {
        setLoadingMessages(true);
        try {
          const data = await apiRequest(`/chat/conversations/${selectedConversationId}/messages`);
          setMessages(data.messages || []);
          // Clear local unread count
          setDms(prev => prev.map(item => item.id === selectedConversationId ? { ...item, unreadCount: 0 } : item));
        } catch (err) {
          console.error('Failed to load DM history immediately:', err);
        } finally {
          setLoadingMessages(false);
        }
      } else if (selectedGroupId) {
        setLoadingMessages(true);
        setLoadingDetails(true);
        try {
          // Load group details
          const details = await apiRequest(`/groups/${selectedGroupId}`);
          setGroupDetails(details);
          
          if (details.group) {
            setSelectedGroup(details.group);
            setEditGroupName(details.group.name);
            setEditGroupDesc(details.group.description || '');
            setEditGroupCoverPreview(details.group.cover_image || null);
          }

          // Load messages
          const msgData = await apiRequest(`/groups/${selectedGroupId}/messages`);
          setMessages(msgData.messages || []);

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
          console.error('Failed to load group details immediately:', err);
        } finally {
          setLoadingMessages(false);
          setLoadingDetails(false);
        }
      }
    };

    loadActiveChatDetails();
  }, [selectedConversationId, selectedGroupId, user]);

  // Handle DM select
  const handleSelectDM = (dm: DMConversation) => {
    setSelectedConversationId(dm.id);
    setSelectedGroupId(null);
    setSelectedGroup(null);
    setGroupDetails(null);
    setShowMobileChat(true);
    setSearchParams({ conversationId: String(dm.id) });
  };

  // Handle Group select
  const handleSelectGroup = (group: Group) => {
    setSelectedGroupId(group.id);
    setSelectedConversationId(null);
    setSelectedGroup(group);
    setShowMobileChat(true);
    setSearchParams({ groupId: String(group.id) });
  };

  const [leavingGroup, setLeavingGroup] = useState(false);

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'a long time ago';
    
    let date = new Date(dateString);
    if (typeof dateString === 'string' && !dateString.includes('T') && !dateString.endsWith('Z')) {
      const formatted = dateString.replace(' ', 'T') + 'Z';
      const parsedDate = new Date(formatted);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) {
      return 'just now';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'just now';
    }
    if (diffMins < 60) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    
    // Check if it was today
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `today at ${timeStr}`;
    }

    // Check if it was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    if (isYesterday) {
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `yesterday at ${timeStr}`;
    }

    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    if (!window.confirm('Are you sure you want to leave this travel group? You will no longer receive any messages or notifications from this group.')) return;

    setLeavingGroup(true);
    try {
      const res = await apiRequest(`/groups/${selectedGroupId}/leave`, {
        method: 'POST'
      });
      alert(res.message || 'Successfully left the group.');
      
      // Close settings modal, reset active group selections
      setShowSettingsModal(false);
      setSelectedGroupId(null);
      setSelectedGroup(null);
      setGroupDetails(null);
      setMessages([]);
      setSearchParams({});
      
      // Refresh list
      fetchHubData();
    } catch (err: any) {
      console.error('Failed to leave group:', err);
      alert(err.message || 'Could not leave the group. Please try again.');
    } finally {
      setLeavingGroup(false);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendingMessage) return;
    setSendingMessage(true);

    const text = inputMessage;
    setInputMessage('');

    try {
      if (selectedConversationId) {
        const data = await apiRequest(`/chat/conversations/${selectedConversationId}/messages`, {
          method: 'POST',
          body: { message_text: text }
        });
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
      } else if (selectedGroupId) {
        const data = await apiRequest(`/groups/${selectedGroupId}/messages`, {
          method: 'POST',
          body: { message_text: text }
        });
        if (data.message) {
          // Append username and pic local mockup
          const mockMsg = {
            ...data.message,
            sender_username: user?.username,
            sender_profile_picture: user?.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'
          };
          setMessages(prev => [...prev, mockMsg]);
        }
      }
      scrollToBottom();
      fetchHubData();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Unsend message
  const handleUnsendMessage = async (messageId: number) => {
    if (!window.confirm('Are you sure you want to unsend this message?')) return;
    try {
      const res = await apiRequest(`/chat/messages/${messageId}/unsend`, {
        method: 'POST'
      });
      if (res.message) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message_text: 'This message was unsent.', message_type: 'unsent' } : m));
        fetchHubData();
      }
    } catch (err) {
      console.error('Failed to unsend message:', err);
      alert('Could not unsend message. Please try again.');
    }
  };

  // Handle Invitation Response
  const handleInvitationResponse = async (groupId: number, accept: boolean) => {
    try {
      await apiRequest('/groups/respond', {
        method: 'POST',
        body: { groupId, accept }
      });
      fetchHubData();
    } catch (err) {
      console.error('Invitation response failed:', err);
    }
  };

  // Handle Cover file upload for Group Creation
  const handleCreateGroupCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewGroupCover(file);
    setNewGroupCoverPreview(URL.createObjectURL(file));
  };

  // Create Group Chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);

    try {
      let coverUrl = null;

      // Handle direct file upload if selected
      if (newGroupCover) {
        const formData = new FormData();
        formData.append('profilePicture', newGroupCover);
        const token = localStorage.getItem('token');
        const uploadRes = await fetch('http://localhost:5000/api/auth/profile/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          coverUrl = uploadData.url;
        }
      }

      const data = await apiRequest('/groups', {
        method: 'POST',
        body: { 
          name: newGroupName, 
          description: newGroupDesc,
          cover_image: coverUrl,
          members: selectedFriendsToInvite
        }
      });

      if (data.group) {
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupCover(null);
        setNewGroupCoverPreview(null);
        setSelectedFriendsToInvite([]);
        setShowCreateModal(false);
        fetchHubData();
        handleSelectGroup(data.group);
      }
    } catch (err) {
      console.error('Create group failed:', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Group settings: Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedGroupId) return;
    setInviting(true);
    setInviteMessage(null);

    try {
      await apiRequest('/groups/invite', {
        method: 'POST',
        body: { groupId: selectedGroupId, usernameToInvite: inviteUsername }
      });
      setInviteUsername('');
      setInviteMessage('Invitation sent successfully!');
      
      // Refresh details
      const details = await apiRequest(`/groups/${selectedGroupId}`);
      setGroupDetails(details);
    } catch (err: any) {
      setInviteMessage(err.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  // Group settings: Remove member (Admin only)
  const handleRemoveMember = async (memberUserId: number) => {
    if (!selectedGroupId || !window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiRequest(`/groups/${selectedGroupId}/members/${memberUserId}`, {
        method: 'DELETE'
      });
      // Refresh details
      const details = await apiRequest(`/groups/${selectedGroupId}`);
      setGroupDetails(details);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  // Group settings: Save Itinerary Notes
  const handleSaveItineraryNotes = async () => {
    if (!selectedGroupId) return;
    setSavingNotes(true);
    try {
      await apiRequest('/groups/itinerary', {
        method: 'POST',
        body: {
          groupId: selectedGroupId,
          day_number: selectedDayNum,
          notes: dayNotes
        }
      });
      if (groupDetails) {
        const updatedList = groupDetails.itineraries.map((it) => {
          if (it.day_number === selectedDayNum) return { ...it, notes: dayNotes };
          return it;
        });
        setGroupDetails({ ...groupDetails, itineraries: updatedList });
      }
    } catch (err) {
      console.error('Save group itinerary notes failed:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Group settings: Add Activity Proposal
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle || !selectedGroupId) return;
    setAddingActivity(true);

    try {
      await apiRequest('/groups/activity', {
        method: 'POST',
        body: {
          groupId: selectedGroupId,
          title: activityTitle,
          description: activityDesc,
          cost: activityCost ? parseFloat(activityCost) : 0
        }
      });
      setActivityTitle('');
      setActivityDesc('');
      setActivityCost('');
      
      // Refresh details
      const details = await apiRequest(`/groups/${selectedGroupId}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Failed to add group activity:', err);
    } finally {
      setAddingActivity(false);
    }
  };

  // Group settings: Vote on Activity
  const handleVoteActivity = async (activityId: number) => {
    try {
      const data = await apiRequest('/groups/vote', {
        method: 'POST',
        body: { activityId }
      });
      if (data.activity && groupDetails) {
        const updatedActivities = groupDetails.activities.map((a) => {
          if (a.id === activityId) return { ...a, votes_count: data.activity.votes_count };
          return a;
        });
        setGroupDetails({ ...groupDetails, activities: updatedActivities });
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  // Group settings: Add Shared Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expDesc || !selectedGroupId) return;
    setAddingExpense(true);

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: {
          group_id: selectedGroupId,
          amount: parseFloat(expAmount),
          description: expDesc,
          category: expCategory
        }
      });
      setExpAmount('');
      setExpDesc('');
      setExpCategory('Food');

      // Refresh details
      const details = await apiRequest(`/groups/${selectedGroupId}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setAddingExpense(false);
    }
  };

  // Group settings: Delete Shared Expense
  const handleDeleteExpense = async (expId: number) => {
    if (!window.confirm('Delete this expense?') || !selectedGroupId) return;
    try {
      await apiRequest(`/expenses/${expId}`, { method: 'DELETE' });
      // Refresh details
      const details = await apiRequest(`/groups/${selectedGroupId}`);
      setGroupDetails(details);
    } catch (err) {
      console.error('Delete expense failed:', err);
    }
  };

  // Group settings: Edit Cover selector
  const handleEditGroupCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditGroupCoverFile(file);
    setEditGroupCoverPreview(URL.createObjectURL(file));
  };

  // Group settings: Save Group Information Info tab
  const handleSaveGroupInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !editGroupName.trim() || savingGroupInfo) return;
    setSavingGroupInfo(true);

    try {
      let coverUrl = editGroupCoverPreview;

      // Handle direct file upload if updated
      if (editGroupCoverFile) {
        const formData = new FormData();
        formData.append('profilePicture', editGroupCoverFile);
        const token = localStorage.getItem('token');
        const uploadRes = await fetch('http://localhost:5000/api/auth/profile/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          coverUrl = uploadData.url;
        }
      }

      const res = await apiRequest(`/groups/${selectedGroupId}`, {
        method: 'PUT',
        body: {
          name: editGroupName,
          description: editGroupDesc,
          cover_image: coverUrl
        }
      });

      if (res.group) {
        setEditGroupCoverFile(null);
        fetchHubData();
        // Update local group selected state
        setSelectedGroup(res.group);
        setGroupDetails(prev => prev ? { ...prev, name: res.group.name, description: res.group.description, cover_image: res.group.cover_image } : null);
        alert('Group settings updated successfully!');
      }
    } catch (err: any) {
      console.error('Failed to update group information:', err);
      alert(err.message || 'Failed to update group settings.');
    } finally {
      setSavingGroupInfo(false);
    }
  };

  // Split details calculator based on balances from backend (Group Settings Expense section)
  const getExpensesSummary = () => {
    if (!groupDetails?.expenses) return { totalSpent: 0, balancesList: [] };
    
    let totalSpent = 0;
    groupDetails.expenses.forEach((e) => {
      totalSpent += parseFloat(String(e.amount) || '0');
    });

    const balances: { [username: string]: number } = {};
    const activeMembers = groupDetails?.members ? groupDetails.members.filter((m) => m.status === 'accepted') : [];
    
    activeMembers.forEach((m) => {
      balances[m.username] = 0;
    });

    const share = activeMembers.length > 0 ? totalSpent / activeMembers.length : 0;

    groupDetails.expenses.forEach((e) => {
      const amt = parseFloat(String(e.amount) || '0');
      const payer = e.paid_by_username;
      
      activeMembers.forEach((m) => {
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

  // Search filter matching
  const filteredDms = dms.filter(d => 
    d.recipient?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.lastMessage?.message_text && d.lastMessage.message_text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Combine direct messaging and group chats into a single recent conversations list
  const getRecentConversations = () => {
    const combined: Array<{
      type: 'dm' | 'group';
      id: number;
      name: string;
      image?: string;
      lastMessageText?: string;
      lastMessageTime?: string;
      unreadCount: number;
      raw: any;
    }> = [];

    // Add DMs
    dms.forEach(d => {
      if (d.recipient) {
        combined.push({
          type: 'dm',
          id: d.id,
          name: d.recipient.username || 'Traveler',
          image: d.recipient.profile_picture,
          lastMessageText: d.lastMessage?.message_text,
          lastMessageTime: d.lastMessage?.created_at || d.created_at,
          unreadCount: d.unreadCount,
          raw: d
        });
      }
    });

    // Add Groups
    groups.forEach(g => {
      combined.push({
        type: 'group',
        id: g.id,
        name: g.name,
        image: g.cover_image,
        lastMessageText: g.description, // fallback to desc
        lastMessageTime: g.created_at,
        unreadCount: 0,
        raw: g
      });
    });

    // Sort by message time desc
    combined.sort((a, b) => new Date(b.lastMessageTime || '').getTime() - new Date(a.lastMessageTime || '').getTime());

    // Search query filter
    return combined.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const recentChats = getRecentConversations();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans h-[calc(100vh-80px)] flex gap-6 overflow-hidden">
      
      {/* 1. LEFT PANEL: Sidebar Chat List */}
      <div className={`w-full lg:w-96 flex-col border border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden shrink-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Header section with tabs and search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Chats Hub</h1>
            <button
              onClick={() => {
                setFriendSearchQuery('');
                setSelectedFriendsToInvite([]);
                setShowCreateModal(true);
              }}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              title="Create new travel group"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-55 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
            />
          </div>

          {/* View Tab selectors */}
          <div className="flex bg-slate-100 dark:bg-slate-850/60 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${activeTab === 'groups' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${activeTab === 'dms' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-slate-500 dark:text-slate-400'}`}
            >
              DMs
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40 p-2">
          
          {/* Invitations Panel banner inside hub */}
          {invitations.length > 0 && activeTab !== 'dms' && (
            <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl mb-3 border border-emerald-100/40 dark:border-emerald-900/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-450 tracking-wider">Group Invitations ({invitations.length})</span>
              <div className="space-y-1.5">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150/40 p-2 rounded-xl text-[10px]">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{inv.name}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleInvitationResponse(inv.id, true)}
                        className="p-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleInvitationResponse(inv.id, false)}
                        className="p-1 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-555 dark:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render All/Recent tab */}
          {activeTab === 'all' && (
            recentChats.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-medium">No conversation history yet.</p>
            ) : (
              recentChats.map((c) => (
                <button
                  key={`${c.type}_${c.id}`}
                  onClick={() => c.type === 'dm' ? handleSelectDM(c.raw) : handleSelectGroup(c.raw)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all mb-1 border border-transparent text-left ${
                    (c.type === 'dm' && selectedConversationId === c.id) || (c.type === 'group' && selectedGroupId === c.id)
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.image || (c.type === 'group' ? 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=100' : `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.name}`)}
                      alt={c.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                    />
                    {c.type === 'dm' && c.raw?.recipient?.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{c.name}</h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8px] text-slate-450 uppercase font-semibold">{c.type}</span>
                        <span className="text-[8px] text-slate-400 font-semibold">•</span>
                        <span className="text-[8px] text-slate-400 font-semibold">{formatTimeAgo(c.lastMessageTime || '')}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 truncate mt-0.5">
                      {c.lastMessageText || (c.type === 'group' ? 'Open group planning board...' : 'Start direct conversation...')}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )
          )}

          {/* Render Groups tab */}
          {activeTab === 'groups' && (
            filteredGroups.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">No groups found.</p>
            ) : (
              filteredGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGroup(g)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all mb-1 border border-transparent text-left ${
                    selectedGroupId === g.id
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <img
                    src={g.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=100'}
                    alt={g.name}
                    className="h-10 w-10 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{g.name}</h4>
                    <p className="text-[10px] text-slate-450 truncate mt-0.5">{g.description || 'No group description.'}</p>
                  </div>
                </button>
              ))
            )
          )}

          {/* Render DMs tab */}
          {activeTab === 'dms' && (
            filteredDms.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">No direct conversations found.</p>
            ) : (
              filteredDms.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDM(d)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all mb-1 border border-transparent text-left ${
                    selectedConversationId === d.id
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={d.recipient?.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${d.recipient?.username}`}
                      alt={d.recipient?.username || 'avatar'}
                      className="h-10 w-10 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                    />
                    {d.recipient?.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{d.recipient?.username || 'Traveler'}</h4>
                    <p className="text-[10px] text-slate-450 truncate mt-0.5">{d.lastMessage?.message_text || 'Start messaging...'}</p>
                  </div>
                  {d.unreadCount > 0 && (
                    <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                      {d.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )
          )}

        </div>
      </div>

      {/* 2. MAIN PANEL: Active Chat Timeline / Workspace */}
      <div className={`flex-1 border border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col ${!showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Chat selected viewport */}
        {selectedConversationId || selectedGroupId ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Header portion */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/5 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setShowMobileChat(false);
                    setSelectedGroupId(null);
                    setSelectedConversationId(null);
                    setSearchParams({});
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg lg:hidden cursor-pointer shrink-0 text-slate-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Avatar / Icon */}
                {!selectedGroupId ? (
                  <Link to={`/profile?username=${dms.find(d => d.id === selectedConversationId)?.recipient?.username}`}>
                    <img
                      src={(() => {
                        const r = dms.find(d => d.id === selectedConversationId)?.recipient;
                        return r?.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${r?.username || 'avatar'}`;
                      })()}
                      alt="Avatar"
                      className="h-10 w-10 object-cover rounded-full border border-slate-150 dark:border-slate-800 shrink-0 cursor-pointer"
                    />
                  </Link>
                ) : (
                  <img
                    src={selectedGroup?.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=100'}
                    alt="Avatar"
                    className="h-10 w-10 object-cover rounded-xl border border-slate-150 dark:border-slate-800 shrink-0"
                  />
                )}

                {/* Details */}
                <div className="min-w-0">
                  {!selectedGroupId ? (
                    <Link to={`/profile?username=${dms.find(d => d.id === selectedConversationId)?.recipient?.username}`} className="hover:underline">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate cursor-pointer">
                        {dms.find(d => d.id === selectedConversationId)?.recipient?.username || 'Loading chat...'}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      {selectedGroup?.name}
                    </h3>
                  )}
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                    {selectedGroupId ? (
                      <span>{groupDetails?.members ? groupDetails.members.filter(m => m.status === 'accepted' && m.is_online).length : 0} of {groupDetails?.members ? groupDetails.members.filter(m => m.status === 'accepted').length : 0} online</span>
                    ) : (
                      (() => {
                        const r = dms.find(d => d.id === selectedConversationId)?.recipient;
                        if (!r) return null;
                        if (r.is_online) {
                          return (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>Online</span>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span>Last seen {formatLastSeen(r.last_seen)}</span>
                            </>
                          );
                        }
                      })()
                    )}
                  </div>
                </div>
              </div>

              {/* Settings Action (Groups only) */}
              {selectedGroupId && (
                <button
                  onClick={() => {
                    setSettingsSubTab('info');
                    setShowSettingsModal(true);
                  }}
                  className="p-2.5 hover:bg-slate-150/45 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800 cursor-pointer shadow-2xs bg-white dark:bg-slate-900"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>Group Board & Settings</span>
                </button>
              )}
            </div>

            {/* Message History Timeline scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 dark:bg-slate-950/10">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-35 mb-2" />
                  <p className="text-xs font-semibold">No messages yet</p>
                  <p className="text-[10px] opacity-75">Send a message to kick off the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const senderName = isMe ? 'You' : msg.sender_username || 'Traveler';
                  const senderPic = isMe
                    ? (user?.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username || 'avatar'}`)
                    : (msg.sender_profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender_username || 'avatar'}`);

                  return (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <Link to={`/profile?username=${msg.sender_username || user?.username}`}>
                        <img
                          src={senderPic}
                          alt={senderName}
                          className="h-8 w-8 rounded-full object-cover bg-emerald-50/10 border border-slate-100 dark:border-slate-850 shrink-0 mt-0.5 cursor-pointer"
                        />
                      </Link>

                      {/* Content bubble */}
                      <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Username (Groups only) */}
                        {selectedGroupId && !isMe && (
                          <Link to={`/profile?username=${msg.sender_username}`} className="hover:underline">
                            <span className="text-[10px] font-bold text-slate-450 block ml-1 cursor-pointer">{senderName}</span>
                          </Link>
                        )}
                        
                        <div className="flex items-center gap-2 group">
                          <div className={`p-3 rounded-2xl text-xs leading-normal break-words shadow-2xs ${
                            isMe
                              ? msg.message_type === 'unsent'
                                ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500 italic rounded-tr-xs'
                                : 'bg-emerald-500 text-white rounded-tr-xs'
                              : msg.message_type === 'unsent'
                                ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 italic border border-slate-100 dark:border-slate-800 rounded-tl-xs'
                                : 'bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                          }`}>
                            <p>{msg.message_text}</p>
                          </div>
                          {isMe && msg.message_type !== 'unsent' && (
                            <button
                              onClick={() => handleUnsendMessage(msg.id)}
                              className="text-[9px] text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                              title="Unsend message"
                            >
                              Unsend
                            </button>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <span className="text-[8px] text-slate-400 block px-1">
                          {formatTimeAgo(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Message Form Panel */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !inputMessage.trim()}
                  className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* Empty/No chat selected placeholder view */
          <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 font-sans">
            <Compass className="h-16 w-16 text-emerald-500/20 dark:text-emerald-400/20 animate-spin-slow mb-4" />
            <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-white mb-1">TravelVerse Chats Hub</h3>
            <p className="text-xs text-slate-500 max-w-sm text-center leading-normal">
              Select an active group travel planning room or a direct user-to-user conversation from the left pane to begin chatting.
            </p>
          </div>
        )}

      </div>

      {/* 3. FLOATING CREATE GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in font-sans flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">Create Travel Group</h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupCover(null);
                  setNewGroupCoverPreview(null);
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs font-semibold overflow-y-auto pr-1 flex-1">
              
              {/* Group Cover picture direct upload */}
              <div className="space-y-1.5 flex flex-col items-center">
                <label className="text-[10px] uppercase font-bold text-slate-450 self-start">Cover Image</label>
                {newGroupCoverPreview ? (
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50/50">
                    <img src={newGroupCoverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroupCover(null);
                        setNewGroupCoverPreview(null);
                      }}
                      className="absolute right-2 top-2 p-1.5 bg-black/60 hover:bg-rose-600/80 rounded-lg text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="h-28 w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center cursor-pointer text-slate-400 transition-all">
                    <Image className="h-8 w-8 opacity-40 mb-1" />
                    <span className="text-[10px]">Select Cover Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCreateGroupCoverSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Group Name */}
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

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Description (Optional)</label>
                <textarea
                  placeholder="Backpacking Europe with college friends. Cities: London, Paris, Rome, Barcelona."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-normal"
                />
              </div>

              {/* Add Friends list checklist selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Invite Friends</label>
                <input
                  type="text"
                  placeholder="Filter friends..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5 text-[10px] dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
                
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl max-h-[140px] overflow-y-auto p-2 space-y-1 bg-slate-50/30">
                  {friendsList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4 font-normal">You aren't following anyone yet.</p>
                  ) : (
                    friendsList
                      .filter(f => f.username.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                      .map((friend) => {
                        const isChecked = selectedFriendsToInvite.includes(friend.username);
                        return (
                          <label key={friend.id} className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer transition-colors text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedFriendsToInvite(prev => prev.filter(name => name !== friend.username));
                                } else {
                                  setSelectedFriendsToInvite(prev => [...prev, friend.username]);
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <img
                              src={friend.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                              alt={friend.username}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                            <span>{friend.username}</span>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGroupCover(null);
                    setNewGroupCoverPreview(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer shadow-md"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 4. GROUP SETTINGS MODAL: Houses all original collaborative modules */}
      {showSettingsModal && selectedGroupId && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full shadow-2xl animate-slide-in font-sans flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <SettingsIcon className="h-5 w-5 text-emerald-500 animate-spin-slow" />
                <h3 className="text-md font-bold font-serif">Group Planner Board</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Sub-tab navigation menu */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs shrink-0 bg-slate-50/50 dark:bg-slate-950/5">
              <button
                onClick={() => setSettingsSubTab('info')}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-colors ${settingsSubTab === 'info' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Info
              </button>
              <button
                onClick={() => setSettingsSubTab('planning')}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-colors ${settingsSubTab === 'planning' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Planning & Voting
              </button>
              <button
                onClick={() => setSettingsSubTab('finance')}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-colors ${settingsSubTab === 'finance' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Finance
              </button>
              <button
                onClick={() => setSettingsSubTab('members')}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-colors ${settingsSubTab === 'members' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Members ({groupDetails?.members.length})
              </button>
            </div>

            {/* Content viewport based on subtab */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: Group Info (Modify details + Cover picture) */}
              {settingsSubTab === 'info' && (
                <>
                  <form onSubmit={handleSaveGroupInfo} className="space-y-5 text-xs font-semibold">
                    <div className="space-y-1.5 flex flex-col items-center">
                      <label className="text-[10px] uppercase font-bold text-slate-450 self-start">Cover Image</label>
                      {editGroupCoverPreview ? (
                        <div className="relative h-40 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50/50">
                          <img src={editGroupCoverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                          <label className="absolute right-2 top-2 px-3 py-1.5 bg-black/60 hover:bg-black/75 rounded-lg text-white font-bold cursor-pointer text-[10px]">
                            Change Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditGroupCoverSelect}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="h-40 w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-slate-400 transition-all">
                          <Image className="h-8 w-8 opacity-45 mb-1" />
                          <span className="text-[10px]">Upload Group Cover</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditGroupCoverSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Group Name</label>
                      <input
                        type="text"
                        required
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Description</label>
                      <textarea
                        value={editGroupDesc}
                        onChange={(e) => setEditGroupDesc(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-normal"
                      />
                    </div>

                    <div className="bg-slate-55 bg-slate-50 dark:bg-slate-850/40 p-4 rounded-2xl text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-100/50">
                      <div className="flex justify-between items-center">
                        <span>Group ID:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">#{selectedGroupId}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span>Created On:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {new Date(selectedGroup.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingGroupInfo || !editGroupName.trim()}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                    >
                      {savingGroupInfo ? 'Saving Settings...' : 'Save Group Info'}
                    </button>
                  </form>

                  <div className="pt-4 mt-4 border-t border-slate-150 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLeaveGroup}
                      disabled={leavingGroup}
                      className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-100 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                    >
                      {leavingGroup ? 'Leaving Group...' : 'Leave Group'}
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: Travel Planning (Notes + Proposals Activity Voting) */}
              {settingsSubTab === 'planning' && (
                <div className="space-y-6">
                  
                  {/* Day Itinerary Notes */}
                  <div className="bg-slate-50 dark:bg-slate-850/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-850/40 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Itinerary / Trip Planner</h4>
                        <span className="text-[10px] text-slate-400">Share checklists and overall group notes</span>
                      </div>
                      <button
                        onClick={handleSaveItineraryNotes}
                        disabled={savingNotes}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
                      >
                        {savingNotes ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>

                    <textarea
                      placeholder="Write packing lists, hotels details, car rentals references, or schedules..."
                      value={dayNotes}
                      onChange={(e) => setDayNotes(e.target.value)}
                      rows={6}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-normal font-semibold"
                    />
                  </div>

                  {/* Activity Voting widgets */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Proposed Activities & Voting</h4>
                    
                    {/* Propose form */}
                    <form onSubmit={handleAddActivity} className="bg-slate-50 dark:bg-slate-850/30 p-4 rounded-xl border border-slate-100/50 space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="Activity title (e.g. Scuba Diving)"
                        value={activityTitle}
                        onChange={(e) => setActivityTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Description (Optional)"
                          value={activityDesc}
                          onChange={(e) => setActivityDesc(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="Cost ($)"
                          value={activityCost}
                          onChange={(e) => setActivityCost(e.target.value)}
                          className="w-[80px] bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={addingActivity}
                          className="bg-slate-800 hover:bg-slate-750 text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 cursor-pointer dark:bg-slate-750"
                        >
                          Propose
                        </button>
                      </div>
                    </form>

                    {/* Proposals timeline */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {groupDetails?.activities?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-normal">No activities proposed yet.</p>
                      ) : (
                        groupDetails?.activities.map((act) => (
                          <div key={act.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850/30 text-xs border border-slate-100/50">
                            <div>
                              <span className="font-bold text-slate-750 dark:text-slate-200 block">{act.title}</span>
                              {act.description && <span className="text-[10px] text-slate-400 block mt-0.5">{act.description}</span>}
                              {act.cost > 0 && <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Est. Cost: ${act.cost}</span>}
                            </div>
                            
                            <button
                              onClick={() => handleVoteActivity(act.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-650 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 transition-colors"
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
              )}

              {/* TAB 3: Finance (Shared bill log, ledger, split calculator) */}
              {settingsSubTab === 'finance' && (
                <div className="space-y-6">
                  
                  {/* Ledger balances card */}
                  <div className="bg-slate-50 dark:bg-slate-850/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-800/30 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Shared Expense Ledger</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Balances calculated on equal split of total: ${Math.round(totalSpent)}</p>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {balancesList.map((bal, idx: number) => {
                        const isPositive = bal.balance > 0;
                        const isZero = bal.balance === 0;

                        return (
                          <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100/50 text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-350">{bal.username}</span>
                            {isZero ? (
                              <span className="text-slate-400 font-normal">Settled Up</span>
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
                  <div className="bg-slate-50 dark:bg-slate-850/30 p-4 rounded-xl border border-slate-100/55 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Log New Expense</h4>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                      <input
                        type="text"
                        required
                        placeholder="Description (e.g. Train Tickets)"
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white font-semibold"
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
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-6 pr-3 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white font-semibold"
                          />
                        </div>
                        <select
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                          className="w-[110px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white font-semibold"
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
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-150 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer shrink-0 shadow-sm"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Ledger logs */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Expenses Ledger History</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {groupDetails?.expenses?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">No bills logged yet.</p>
                      ) : (
                        groupDetails?.expenses.map((exp) => (
                          <div key={exp.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/30 text-xs border border-slate-100/50">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight">{exp.description}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Paid by {exp.paid_by_username}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200">${exp.amount}</span>
                              {exp.paid_by_user_id === user?.id && (
                                <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-350 hover:text-rose-500 cursor-pointer">
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
              )}

              {/* TAB 4: Members (Active and pending, invites, removing member) */}
              {settingsSubTab === 'members' && (
                <div className="space-y-6">
                  
                  {/* Invite Member Form */}
                  <div className="bg-slate-50 dark:bg-slate-850/30 p-4 rounded-xl border border-slate-100/50 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Invite User</h4>
                    <form onSubmit={handleInviteMember} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Search username to invite..."
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={inviting || !inviteUsername.trim()}
                        className="bg-slate-850 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer dark:bg-slate-700"
                      >
                        Invite
                      </button>
                    </form>
                    {inviteMessage && (
                      <span className="text-[10px] font-bold text-emerald-600 block mt-1">{inviteMessage}</span>
                    )}
                  </div>

                  {/* Members list */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wide">Group Members List</h4>
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {groupDetails?.members?.map((member) => {
                        const isAdmin = member.role === 'admin';
                        const isCurrentUserAdmin = groupDetails?.members?.find(m => m.user_id === user?.id)?.role === 'admin';

                        return (
                          <div key={member.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850/30 border border-slate-100/40">
                            <Link to={`/profile?username=${member.username}`} className="flex items-center gap-3 flex-1 min-w-0 hover:underline">
                              <img
                                src={member.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.username}`}
                                alt={member.username}
                                className={`h-8 w-8 rounded-full object-cover border border-slate-100 dark:border-slate-800 ${member.status === 'pending' ? 'opacity-40 grayscale' : ''} cursor-pointer`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs cursor-pointer truncate">{member.username}</span>
                                  {member.status === 'accepted' && member.is_online && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Online" />
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-400 capitalize block truncate">
                                  {member.status === 'accepted' 
                                    ? `${member.role}${!member.is_online && member.last_seen ? ` • Last seen ${formatLastSeen(member.last_seen)}` : ''}` 
                                    : 'Invitation Pending'}
                                </span>
                              </div>
                            </Link>

                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <span className="flex items-center gap-1 text-[8px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2 py-1 rounded-full font-bold border border-emerald-150/40">
                                  <ShieldCheck className="h-3 w-3" />
                                  Admin
                                </span>
                              ) : (
                                isCurrentUserAdmin && member.user_id !== user?.id && (
                                  <button
                                    onClick={() => handleRemoveMember(member.user_id)}
                                    className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-955/20 text-slate-400 rounded-lg cursor-pointer transition-colors"
                                    title="Remove from group"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default GroupPlanner;
