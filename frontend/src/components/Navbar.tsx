import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications, ParsedNotification } from '../context/NotificationContext';
import { 
  Compass, Map, Sparkles, Award, 
  Menu, X, LogOut, User as UserIcon, Settings, Calendar,
  Bell, Trash2, Check, Heart, MessageSquare, Users
} from 'lucide-react';
import { apiRequest } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications, 
    respondToGroupInvite 
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const data = await apiRequest<{ count: number }>('/chat/unread-count');
        setUnreadChatCount(data.count);
      } catch (err) {
        console.error('Failed to fetch unread chat count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Just now';
    
    let date = new Date(dateString);
    // SQLite returns "YYYY-MM-DD HH:MM:SS" which does not contain 'T' or 'Z'.
    // If we parse this string in the browser, it will interpret it as local time.
    // Since the database stores times in UTC, we must convert it to ISO format with Z suffix.
    if (typeof dateString === 'string' && !dateString.includes('T') && !dateString.endsWith('Z')) {
      const formatted = dateString.replace(' ', 'T') + 'Z';
      const parsedDate = new Date(formatted);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Prevent negative time differences due to minor clock offsets
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
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case 'group_invite':
        return <UserIcon className="h-4 w-4 text-purple-500" />;
      case 'group_accept':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'group_decline':
        return <X className="h-4 w-4 text-rose-500" />;
      case 'collab':
        return <Compass className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const handleGroupInviteResponse = async (e: React.MouseEvent, groupId: number, accept: boolean, notifId: number) => {
    e.stopPropagation();
    try {
      await respondToGroupInvite(groupId, accept);
      await deleteNotification(notifId);
    } catch (err) {
      console.error('Failed to handle group invite response:', err);
    }
  };

  const handleCommunityJoinResponse = async (e: React.MouseEvent, communityId: number, userId: number, action: 'approve' | 'decline', notifId: number) => {
    e.stopPropagation();
    try {
      await apiRequest(`/communities/${communityId}/requests`, {
        method: 'POST',
        body: { userId, action }
      });
      await deleteNotification(notifId);
    } catch (err) {
      console.error('Failed to handle community join response:', err);
    }
  };

  const handleNotificationClick = (notif: ParsedNotification) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setNotifDropdownOpen(false);

    const type = notif.notification_type || notif.type;
    const targetId = notif.target_id;
    const targetUserId = notif.target_user_id;
    const targetPostId = notif.target_post_id;
    const targetCommunityId = notif.target_community_id;
    const targetChatId = notif.target_chat_id;

    if (type === 'follow') {
      const username = notif.sender_username || notif.username;
      if (username) {
        navigate(`/profile?username=${username}`);
      }
    } else if (type === 'comment' || type === 'like') {
      const recId = targetPostId || notif.recommendation_id;
      const tripId = notif.trip_id;
      if (recId) {
        navigate(`/recommendations?id=${recId}`);
      } else if (tripId) {
        navigate(`/trips/${tripId}`);
      }
    } else if (type === 'community' || type === 'community_invite') {
      const communityId = targetCommunityId || notif.community_id || targetId;
      if (communityId) {
        navigate(`/communities/${communityId}`);
      }
    } else if (type === 'mention') {
      const communityId = targetCommunityId || notif.community_id;
      if (communityId) {
        navigate(`/communities/${communityId}`);
      }
    } else if (type === 'group_invite' || type === 'group_accept' || type === 'group_decline' || type === 'collab') {
      const groupId = targetId || notif.group_id;
      if (groupId) {
        navigate(`/groups?groupId=${groupId}`);
      }
    } else if (type === 'direct_message' || type === 'message') {
      const convId = targetChatId || notif.conversation_id || targetId;
      if (convId) {
        navigate(`/groups?conversationId=${convId}`);
      }
    } else if (type === 'group_message') {
      const groupId = targetChatId || notif.group_id || targetId;
      if (groupId) {
        navigate(`/groups?groupId=${groupId}`);
      }
    } else if (type === 'travel_log') {
      const tripId = targetPostId || notif.trip_id || targetId;
      if (tripId) {
        navigate(`/trips/${tripId}`);
      }
    }
  };

  const renderNotificationsDropdown = (alignClass: string) => {
    return (
      <div className={`absolute ${alignClass} mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-xl py-3 z-50 animate-fade-in focus:outline-none glass`}>
        {/* Dropdown Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-serif">Notifications</span>
          <div className="flex gap-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-350 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Mark all read"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Read All</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllNotifications();
              }}
              className="text-xs text-slate-450 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-450 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Dropdown Content */}
        <div className="max-h-80 overflow-y-auto mt-2">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <Bell className="h-8 w-8 mx-auto text-slate-350 dark:text-slate-650 mb-2 opacity-50" />
              <p className="text-xs font-semibold">All caught up!</p>
              <p className="text-[10px] opacity-75">No new notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
              {notifications.map((notif) => {
                const isUnread = !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative p-3.5 flex gap-3 text-xs transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group ${
                      isUnread
                        ? 'bg-emerald-50/15 dark:bg-emerald-950/5 border-l-2 border-emerald-500 font-medium'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {/* Icon or Avatar */}
                    <div className="shrink-0" onClick={(e) => { if (notif.sender_username) e.stopPropagation(); }}>
                      {notif.sender_profile_picture && notif.sender_username ? (
                        <Link to={`/profile?username=${notif.sender_username}`}>
                          <img
                            src={notif.sender_profile_picture}
                            alt={notif.sender_username}
                            className="h-8 w-8 rounded-full object-cover border border-slate-150 dark:border-slate-700 bg-emerald-50/20 cursor-pointer"
                          />
                        </Link>
                      ) : notif.sender_profile_picture ? (
                        <img
                          src={notif.sender_profile_picture}
                          alt={notif.sender_username || 'avatar'}
                          className="h-8 w-8 rounded-full object-cover border border-slate-150 dark:border-slate-700 bg-emerald-50/20"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-250/20">
                          {getNotificationIcon(notif.type)}
                        </div>
                      )}
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="leading-normal break-words text-slate-850 dark:text-slate-300">
                        {notif.message}
                      </p>
                      {/* Profile link when no avatar is present */}
                      {notif.sender_username && !notif.sender_profile_picture && (
                        <Link
                          to={`/profile?username=${notif.sender_username}`}
                          onClick={() => setNotifDropdownOpen(false)}
                          className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
                        >
                          @{notif.sender_username}
                        </Link>
                      )}
                      
                      {/* Action buttons for group invitations */}
                      {notif.type === 'group_invite' && notif.group_id && (
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleGroupInviteResponse(e, notif.group_id!, true, notif.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] shadow-xs cursor-pointer transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => handleGroupInviteResponse(e, notif.group_id!, false, notif.id)}
                            className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Action buttons for community join requests */}
                      {notif.type === 'community' && notif.action_required && notif.community_id && notif.sender_id && (
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleCommunityJoinResponse(e, notif.community_id!, notif.sender_id!, 'approve', notif.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] shadow-xs cursor-pointer transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => handleCommunityJoinResponse(e, notif.community_id!, notif.sender_id!, 'decline', notif.id)}
                            className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1.5 font-normal">
                        {formatTimeAgo(notif.created_at || notif.createdAt)}
                      </span>
                    </div>

                    {/* Actions: delete & unread indicator */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {isUnread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 group-hover:hidden" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Compass },
    { name: 'Trips', path: '/trips', icon: Map },
    { name: 'Recommendations', path: '/recommendations', icon: Award },
    { name: 'Communities', path: '/communities', icon: Users },
    { name: 'Planner', path: '/planner', icon: Calendar },
    { name: 'Chats', path: '/groups', icon: MessageSquare },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
  ];

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 glass shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <Compass className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin-slow group-hover:rotate-45 transition-transform duration-300" />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-serif tracking-tight">
                TravelVerse
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-4.5 w-4.5" />
                    {link.name === 'Chats' && unreadChatCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                        {unreadChatCount}
                      </span>
                    )}
                  </div>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right actions: User Dropdown */}
          <div className="hidden md:flex items-center gap-4">

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                onBlur={() => setTimeout(() => setNotifDropdownOpen(false), 200)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200 focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && renderNotificationsDropdown("right-0")}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                className="flex items-center gap-2 p-1.5 rounded-full border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 transition-all duration-200 focus:outline-none"
              >
                <img
                  src={user.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                  alt={user.username}
                  className="h-8 w-8 rounded-full object-cover bg-emerald-50 border border-emerald-200 dark:border-emerald-800"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 pr-1">{user.username}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-lg py-1 animate-fade-in focus:outline-none">
                  <Link
                    to={`/profile?username=${user.username}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <UserIcon className="h-4.5 w-4.5 text-slate-400" />
                    My Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4.5 w-4.5 text-slate-400" />
                    Settings
                  </Link>
                  <hr className="border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 text-left"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden gap-2">

            {/* Mobile Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                onBlur={() => setTimeout(() => setNotifDropdownOpen(false), 200)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && renderNotificationsDropdown("right-0 translate-x-[40px] xs:translate-x-0")}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200">
          <div className="px-2 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium ${
                    isActive(link.path)
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {link.name === 'Chats' && unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                        {unreadChatCount}
                      </span>
                    )}
                  </div>
                  {link.name}
                </Link>
              );
            })}
            <hr className="border-slate-100 dark:border-slate-800 my-2 mx-4" />
            <Link
              to={`/profile?username=${user.username}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <UserIcon className="h-5 w-5 text-slate-400" />
              My Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5 text-slate-400" />
              Settings
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 text-left"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
