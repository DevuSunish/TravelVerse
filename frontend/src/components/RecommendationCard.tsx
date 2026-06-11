import React, { useState, useEffect } from 'react';
import { Star, MapPin, Heart, MessageCircle, Navigation, Clock, DollarSign, Send } from 'lucide-react';
import { apiRequest } from '../services/api';

export interface Recommendation {
  id: number;
  user_id: number;
  username: string;
  profile_picture?: string;
  place_name: string;
  country: string;
  category: string;
  rating: number;
  review: string;
  tips?: string;
  estimated_cost?: number;
  how_to_reach?: string;
  best_time_to_visit?: string;
  photos?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
}

interface RecommendationCardProps {
  rec: Recommendation;
  onLikeToggle?: (id: number, nowLiked: boolean) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ rec, onLikeToggle }) => {
  const [liked, setLiked] = useState(rec.is_liked);
  const [likesCount, setLikesCount] = useState(Number(rec.likes_count));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Sync state with props
  useEffect(() => {
    setLiked(rec.is_liked);
    setLikesCount(Number(rec.likes_count));
  }, [rec]);

  const handleLike = async () => {
    try {
      const originalLiked = liked;
      const targetState = !originalLiked;
      setLiked(targetState);
      setLikesCount(prev => targetState ? prev + 1 : Math.max(0, prev - 1));

      const res = await apiRequest('/social/like', {
        method: 'POST',
        body: { recommendation_id: rec.id }
      });
      
      if (onLikeToggle) {
        onLikeToggle(rec.id, res.liked);
      }
    } catch (err) {
      // Revert on error
      setLiked(rec.is_liked);
      setLikesCount(Number(rec.likes_count));
    }
  };

  const fetchComments = async () => {
    if (comments.length > 0 && !showComments) {
      setShowComments(true);
      return;
    }
    setLoadingComments(true);
    try {
      const data = await apiRequest(`/social/comment?recommendation_id=${rec.id}`);
      setComments(data.comments || []);
      setShowComments(true);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const data = await apiRequest('/social/comment', {
        method: 'POST',
        body: { recommendation_id: rec.id, content: newComment }
      });
      if (data.comment) {
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        // Increment comment counter in local view
        rec.comments_count = Number(rec.comments_count) + 1;
      }
    } catch (err) {
      console.error('Post comment failed:', err);
    }
  };

  // Star Renderer
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'
        }`}
      />
    ));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover-card flex flex-col">
      {/* Header (Author) */}
      <div className="flex items-center gap-3 p-4">
        <img
          src={rec.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
          alt={rec.username}
          className="h-10 w-10 rounded-full object-cover bg-emerald-50 border border-emerald-100 dark:border-emerald-800"
        />
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{rec.username}</h4>
          <span className="text-[10px] text-slate-400">
            {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/30">
          {rec.category}
        </span>
      </div>

      {/* Cover Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={rec.photos || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600'}
          alt={rec.place_name}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-slate-900/60 text-white backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span>{rec.country}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
          {rec.place_name}
        </h3>
        
        <div className="flex items-center gap-1 mb-3">
          {renderStars(rec.rating)}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-line">
          {rec.review}
        </p>

        {/* Travel Tips alert box */}
        {rec.tips && (
          <div className="bg-amber-50/50 dark:bg-amber-950/15 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs text-slate-600 dark:text-slate-400 mb-4 font-sans">
            <span className="font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Traveler Tip:</span>
            {rec.tips}
          </div>
        )}

        {/* Dynamic details drawer */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 mt-auto">
          {rec.estimated_cost && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Est. Cost</span>
              <span className="flex items-center font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                <DollarSign className="h-3.5 w-3.5" />
                {Math.round(rec.estimated_cost)}
              </span>
            </div>
          )}
          {rec.how_to_reach && (
            <div className="flex flex-col col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">How to reach</span>
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                <Navigation className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {rec.how_to_reach}
              </span>
            </div>
          )}
          {rec.best_time_to_visit && !rec.how_to_reach && (
            <div className="flex flex-col col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Best season</span>
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                {rec.best_time_to_visit}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${
              liked ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={fetchComments}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{rec.comments_count}</span>
          </button>
        </div>
      </div>

      {/* Expandable comments Tray */}
      {showComments && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 p-4 font-sans">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Comments</span>
            <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 mb-3">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No comments yet. Be the first!</p>
            ) : (
              comments.map((comm) => (
                <div key={comm.id} className="flex items-start gap-2 text-xs">
                  <img
                    src={comm.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                    alt={comm.username}
                    className="h-6 w-6 rounded-full object-cover bg-emerald-50 shrink-0"
                  />
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl flex-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">{comm.username}</span>
                    <p className="text-slate-600 dark:text-slate-300 leading-normal">{comm.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input form */}
          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 dark:text-white"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default RecommendationCard;
