import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

export interface ParsedNotification {
  id: number;
  user_id: number;
  type: string;
  is_read: boolean;
  created_at: string;
  createdAt?: string;
  message: string;
  sender_id?: number;
  sender_username?: string;
  sender_profile_picture?: string;
  group_id?: number;
  group_name?: string;
  recommendation_id?: number;
  recommendation_title?: string;
  trip_id?: number;
  trip_title?: string;
  comment_content?: string;
  [key: string]: any;
}

interface NotificationContextType {
  notifications: ParsedNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  respondToGroupInvite: (groupId: number, accept: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ParsedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest('/social/notifications');
      const rawNotifications = data.notifications || [];
      const parsed = rawNotifications.map((notif: any) => {
        let parsedContent: any = {};
        try {
          parsedContent = JSON.parse(notif.content);
        } catch {
          parsedContent = { message: notif.content };
        }
        return {
          id: notif.id,
          user_id: notif.user_id,
          type: notif.type,
          is_read: Boolean(notif.is_read === 1 || notif.is_read === true),
          created_at: notif.created_at,
          createdAt: notif.created_at || notif.createdAt,
          message: parsedContent.message || 'New notification',
          ...parsedContent
        };
      });

      setNotifications(parsed);
      const unread = parsed.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Fetch notifications failed:', err);
    }
  }, [user]);

  // Load and set interval
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 10000); // 10 seconds polling
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await apiRequest(`/social/notifications/${id}`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark notification read failed:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/social/notifications/read-all', { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all notifications read failed:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await apiRequest(`/social/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => {
        const notif = prev.find(n => n.id === id);
        const next = prev.filter(n => n.id !== id);
        if (notif && !notif.is_read) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        return next;
      });
    } catch (err) {
      console.error('Delete notification failed:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await apiRequest('/social/notifications', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Clear all notifications failed:', err);
    }
  };

  const respondToGroupInvite = async (groupId: number, accept: boolean) => {
    try {
      await apiRequest('/groups/respond', {
        method: 'POST',
        body: { groupId, accept }
      });
      // After responding, refresh notifications immediately
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to respond to group invitation:', err);
      throw err;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        respondToGroupInvite
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
