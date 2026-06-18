import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Image as ImageIcon, MessageSquare, Heart, Send, FileText, Info, Shield, MapPin, X, ArrowLeft, Check, Camera
} from 'lucide-react';

export const CommunityProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [community, setCommunity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'members' | 'about'>('posts');

  // Posts Feed State
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postPhotoUrl, setPostPhotoUrl] = useState('');
  const [postPhotoFile, setPostPhotoFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({});

  // Photos tab State
  const [photos, setPhotos] = useState<any[]>([]);

  // Members tab State
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/communities/${id}`);
      setCommunity(data.community);
    } catch (err) {
      console.error('Failed to load community details:', err);
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!id) return;
    try {
      const data = await apiRequest(`/communities/${id}/posts`);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load community posts:', err);
    }
  };

  const fetchPhotos = async () => {
    if (!id) return;
    try {
      const data = await apiRequest(`/communities/${id}/photos`);
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Failed to load community photos:', err);
    }
  };

  const fetchMembersAndRequests = async () => {
    if (!id) return;
    try {
      const memData = await apiRequest(`/communities/${id}/members`);
      setMembers(memData.members || []);

      // If user is Admin, fetch pending requests
      if (community?.user_role === 'admin') {
        const reqData = await apiRequest(`/communities/${id}/requests`);
        setJoinRequests(reqData.requests || []);
      }
    } catch (err) {
      console.error('Failed to load members or requests:', err);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [id]);

  useEffect(() => {
    if (community) {
      if (activeTab === 'posts' && community.membership_status === 'accepted') {
        fetchPosts();
      } else if (activeTab === 'photos') {
        fetchPhotos();
      } else if (activeTab === 'members') {
        fetchMembersAndRequests();
      }
    }
  }, [community, activeTab]);

  const handleJoinLeave = async () => {
    if (!community) return;
    const currentStatus = community.membership_status;
    
    try {
      if (currentStatus === 'accepted' || currentStatus === 'pending') {
        await apiRequest(`/communities/${community.id}/leave`, { method: 'POST' });
        setCommunity((prev: any) => ({
          ...prev,
          membership_status: null,
          member_count: currentStatus === 'accepted' ? Math.max(0, prev.member_count - 1) : prev.member_count
        }));
      } else {
        const res = await apiRequest(`/communities/${community.id}/join`, { method: 'POST' });
        setCommunity((prev: any) => ({
          ...prev,
          membership_status: res.status,
          member_count: res.status === 'accepted' ? prev.member_count + 1 : prev.member_count
        }));
      }
    } catch (err) {
      console.error('Failed to handle join/leave:', err);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', newPostContent);
      if (postPhotoFile) {
        formData.append('photo', postPhotoFile);
      } else if (postPhotoUrl) {
        formData.append('photo_url', postPhotoUrl);
      }

      const response = await fetch(`http://localhost:5000/api/communities/${id}/posts`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to publish post');
      }

      // Add new post to start of state feed
      setPosts(prev => [responseData.post, ...prev]);
      setNewPostContent('');
      setPostPhotoUrl('');
      setPostPhotoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error publishing community post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: number) => {
    try {
      const res = await apiRequest(`/communities/posts/${postId}/like`, { method: 'POST' });
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: res.liked ? 1 : 0,
            likes_count: res.liked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Toggle post like failed:', err);
    }
  };

  const handleCommentsToggle = async (postId: number) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    try {
      setOpenCommentsPostId(postId);
      const data = await apiRequest(`/communities/posts/${postId}/comments`);
      setCommentsMap(prev => ({
        ...prev,
        [postId]: data.comments || []
      }));
    } catch (err) {
      console.error('Failed to retrieve comments:', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    const text = newCommentText[postId];
    if (!text || !text.trim()) return;

    try {
      const data = await apiRequest(`/communities/posts/${postId}/comments`, {
        method: 'POST',
        body: { content: text }
      });

      // Update comments map
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment]
      }));

      // Update post comments counter
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments_count: p.comments_count + 1 };
        }
        return p;
      }));

      // Clear input
      setNewCommentText(prev => ({
        ...prev,
        [postId]: ''
      }));
    } catch (err) {
      console.error('Comment publication failed:', err);
    }
  };

  const handleRequestAction = async (userId: number, action: 'approve' | 'decline') => {
    try {
      await apiRequest(`/communities/${id}/requests`, {
        method: 'POST',
        body: { userId, action }
      });

      // Remove from pending list
      setJoinRequests(prev => prev.filter(r => r.user_id !== userId));

      // Refresh members list
      if (action === 'approve') {
        fetchMembersAndRequests();
        setCommunity((prev: any) => ({
          ...prev,
          member_count: prev.member_count + 1
        }));
      }
    } catch (err) {
      console.error('Failed to process request:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!community) return null;

  const isMember = community.membership_status === 'accepted';
  const isPending = community.membership_status === 'pending';
  const isAdmin = community.user_role === 'admin';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/communities')}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold mb-4 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Communities
      </button>

      {/* Community Cover Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 bg-slate-900 mb-6 aspect-21/9 md:h-60 bg-cover bg-center">
        <img 
          src={community.cover_image} 
          alt={community.name} 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        
        {/* Banner Details */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-block bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2 uppercase">
              {community.category}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif leading-tight">
              {community.name}
            </h1>
            <p className="text-xs text-slate-200 font-semibold mt-1">
              {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
            </p>
          </div>

          <button
            onClick={handleJoinLeave}
            disabled={isPending}
            className={`py-3 px-6 rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-md ${
              isMember
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-xs'
                : isPending
                ? 'bg-amber-500 text-white border border-amber-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {isMember ? 'Leave Community' : isPending ? 'Pending Approval' : 'Join Community'}
          </button>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 bg-white dark:bg-slate-900/40 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-450'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Posts Feed
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-450'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Photos ({photos.length || ''})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'members'
              ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-450'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'about'
              ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-450'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          About & Rules
        </button>
      </div>

      {/* Main Tab Panels Content */}
      <div className="space-y-6">

        {/* Tab: Posts */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {!isMember ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-450 max-w-md mx-auto">
                <Shield className="h-10 w-10 mx-auto text-slate-350 opacity-60 mb-3" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Community Feed is Private</h3>
                <p className="text-xs mt-1.5 leading-normal">
                  Only members of this community can view and contribute to the feed. Join to participate!
                </p>
              </div>
            ) : (
              <>
                {/* Create Feed Post Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Create Post</h3>
                  <form onSubmit={handlePostSubmit} className="space-y-3">
                    <textarea
                      placeholder="Share a travel tip, ask a question, or mention someone using @username..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />

                    {/* Photo Add Input fields */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Paste image URL (optional)..."
                          value={postPhotoUrl}
                          disabled={!!postPhotoFile}
                          onChange={(e) => setPostPhotoUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden text-xs"
                        />
                      </div>
                      
                      <div className="shrink-0 flex gap-2">
                        <label className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer text-xs font-bold">
                          <Camera className="h-4 w-4" />
                          <span>Attach File</span>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setPostPhotoFile(e.target.files[0]);
                                setPostPhotoUrl('');
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={isPosting || !newPostContent.trim()}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{isPosting ? 'Publishing...' : 'Post'}</span>
                        </button>
                      </div>
                    </div>

                    {postPhotoFile && (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-2 px-3 text-xs text-emerald-700 dark:text-emerald-400">
                        <span className="truncate font-semibold">{postPhotoFile.name}</span>
                        <button type="button" onClick={() => {
                          setPostPhotoFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }} className="text-slate-450 hover:text-rose-500">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Posts Feed List */}
                <div className="space-y-5">
                  {posts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto text-slate-350 opacity-50 mb-2.5" />
                      <p className="text-xs font-semibold">Feed is empty</p>
                      <p className="text-[10px] opacity-75">Be the first to share something in this community!</p>
                    </div>
                  ) : (
                    posts.map((post) => {
                      const commentsList = commentsMap[post.id] || [];
                      const areCommentsOpen = openCommentsPostId === post.id;

                      return (
                        <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                          
                          {/* Post Header Author details */}
                          <div className="flex items-center gap-2.5 mb-3">
                            <Link to={`/profile?username=${post.username}`} className="shrink-0">
                              <img
                                src={post.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                                alt={post.username}
                                className="h-8 w-8 rounded-full border border-slate-200 object-cover cursor-pointer"
                              />
                            </Link>
                            <div>
                              <Link to={`/profile?username=${post.username}`} className="hover:underline">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block leading-tight cursor-pointer">
                                  {post.username}
                                </span>
                              </Link>
                              <span className="text-[10px] text-slate-400">
                                {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Post Content */}
                          <div className="space-y-3 mb-4">
                            {post.title && <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-150 leading-tight">{post.title}</h4>}
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">
                              {post.content}
                            </p>

                            {/* Render attachment photo */}
                            {post.photo_url && (
                              <div className="rounded-xl overflow-hidden max-h-96 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                                <img src={post.photo_url} alt="Post Attachment" className="w-full object-contain mx-auto" />
                              </div>
                            )}
                          </div>

                          {/* Likes & Comments Counters */}
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 border-t border-slate-50 dark:border-slate-800/40 pt-3">
                            <button
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer ${
                                post.is_liked ? 'text-rose-500 font-bold' : ''
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span>{post.likes_count} Likes</span>
                            </button>

                            <button
                              onClick={() => handleCommentsToggle(post.id)}
                              className={`flex items-center gap-1 hover:text-emerald-500 transition-colors cursor-pointer ${
                                areCommentsOpen ? 'text-emerald-500' : ''
                              }`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>{post.comments_count} Comments</span>
                            </button>
                          </div>

                          {/* Comments Collapsed Box */}
                          {areCommentsOpen && (
                            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                              
                              {/* Comments List */}
                              <div className="space-y-2.5">
                                {commentsList.map((comm) => (
                                  <div key={comm.id} className="flex gap-2.5 items-start bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl">
                                    <Link to={`/profile?username=${comm.username}`} className="shrink-0">
                                      <img
                                        src={comm.profile_picture}
                                        alt={comm.username}
                                        className="h-6 w-6 rounded-full border border-slate-200 object-cover shrink-0 cursor-pointer"
                                      />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 justify-between">
                                        <Link to={`/profile?username=${comm.username}`} className="hover:underline pr-2 truncate">
                                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer">
                                            {comm.username}
                                          </span>
                                        </Link>
                                        <span className="text-[9px] text-slate-400">
                                          {new Date(comm.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed mt-0.5 break-words">
                                        {comm.content}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Comment Form input */}
                              <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={newCommentText[post.id] || ''}
                                  onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  type="submit"
                                  disabled={!newCommentText[post.id]?.trim()}
                                  className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </form>

                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Photos Gallery */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Community Photo Gallery</h3>
            {photos.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-sm mx-auto">
                <ImageIcon className="h-10 w-10 mx-auto text-slate-355 opacity-50 mb-2" />
                <p className="text-xs font-semibold">No photos shared yet</p>
                <p className="text-[10px] opacity-75">Upload photos in your feed posts to populate the gallery!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.post_id} className="group aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-900 relative shadow-xs">
                    <img 
                      src={photo.photo_url} 
                      alt={photo.caption || 'Community Photo'} 
                      className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-end">
                      <span className="text-[10px] text-white font-semibold">@{photo.username}</span>
                      {photo.caption && <p className="text-[9px] text-slate-200 line-clamp-1 truncate mt-0.5">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Members list & Request panel */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            
            {/* Join Requests panel (Admin Only) */}
            {isAdmin && joinRequests.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-amber-200/40 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-450 font-serif text-sm font-bold mb-3.5">
                  <Shield className="h-4.5 w-4.5" />
                  <span>Pending Join Requests ({joinRequests.length})</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {joinRequests.map((req) => (
                    <div key={req.user_id} className="py-3 flex items-center justify-between gap-3">
                      <Link to={`/profile?username=${req.username}`} className="flex items-center gap-2.5 hover:underline">
                        <img
                          src={req.profile_picture}
                          alt={req.username}
                          className="h-8 w-8 rounded-full border border-slate-200 object-cover bg-emerald-50 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                          {req.username}
                        </span>
                      </Link>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestAction(req.user_id, 'approve')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-1 px-3 rounded-lg text-[10px] cursor-pointer shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.user_id, 'decline')}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold p-1 px-3 rounded-lg text-[10px] cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Members List */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accepted Members</h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl divide-y divide-slate-50 dark:divide-slate-800/40 p-4">
                {members.map((mem) => (
                  <div key={mem.user_id} className="py-3 flex items-center justify-between gap-3">
                    
                    <Link to={`/profile?username=${mem.username}`} className="flex items-center gap-3 flex-1 min-w-0 hover:underline">
                      <img
                        src={mem.profile_picture}
                        alt={mem.username}
                        className="h-9 w-9 rounded-full border border-slate-200 object-cover bg-emerald-50 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block cursor-pointer truncate">
                          {mem.username}
                        </span>
                        {mem.bio && <span className="text-[10px] text-slate-400 dark:text-slate-455 line-clamp-1 truncate">{mem.bio}</span>}
                      </div>
                    </Link>

                    <div className="shrink-0">
                      {mem.role === 'admin' ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                          <Shield className="h-3 w-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 px-2 py-0.5 rounded-md">
                          Member
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab: About & Rules */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Col: Description & Rules */}
            <div className="md:col-span-2 space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">About Community</h3>
                <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-line">
                  {community.description || 'No description provided for this community.'}
                </p>
              </div>

              {community.rules && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Community Rules</h3>
                  <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-line">
                    {community.rules}
                  </p>
                </div>
              )}

            </div>

            {/* Right Col: Metadata Info details */}
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Community Info</h3>
                
                {community.destination && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 leading-none">Destination</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold block mt-1">{community.destination}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400 leading-none">Creator / Admin</span>
                    {community.creator_username ? (
                      <Link to={`/profile?username=${community.creator_username}`} className="text-slate-700 dark:text-slate-300 font-bold block mt-1 hover:text-emerald-500 dark:hover:text-emerald-400">
                        @{community.creator_username}
                      </Link>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300 font-bold block mt-1">Admin</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400 leading-none">Requires Approval</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold block mt-1">
                      {community.requires_approval ? 'Yes (Admin approval required)' : 'No (Public Community)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-slate-50 dark:border-slate-800/40 pt-4">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                      Created on {new Date(community.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
export default CommunityProfile;
