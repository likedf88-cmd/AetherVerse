/**
 * AetherVerse Social Feed & 24h Disappearing Stories
 * Social feed with photo & video sharing, hashtags, interactive comments, and Snapchat-style stories.
 */

import React, { useEffect, useState } from 'react';
import { Post, Story, UserProfile } from '../types/index';
import { api } from '../services/api';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Plus,
  Image as ImageIcon,
  Video,
  MapPin,
  Send,
  Flag,
  Sparkles,
  Check,
  Eye,
  Clock
} from 'lucide-react';

interface FeedViewProps {
  currentUser: UserProfile;
}

export const FeedView: React.FC<FeedViewProps> = ({ currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [category, setCategory] = useState<'foryou' | 'following' | 'trending' | 'latest'>('foryou');
  const [isLoading, setIsLoading] = useState(true);

  // Create Post Modal
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [postLocation, setPostLocation] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Active Story Viewer Modal
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Create Story Modal
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyCaption, setStoryCaption] = useState('');

  // Comments Sheet / Drawer
  const [activePostForComments, setActivePostForComments] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Report Modal
  const [reportTarget, setReportTarget] = useState<{ id: string; type: string } | null>(null);
  const [reportReason, setReportReason] = useState('Spam or misleading content');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    loadFeed();
    loadStories();
  }, [category]);

  const loadFeed = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPosts(category);
      setPosts(res.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStories = async () => {
    try {
      const res = await api.getStories();
      setStories(res.stories);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await api.toggleLikePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmarkPost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p));
  };

  const handleOpenComments = async (post: Post) => {
    setActivePostForComments(post);
    try {
      const res = await api.getComments(post.id);
      setComments(res.comments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activePostForComments) return;

    try {
      const res = await api.addComment(activePostForComments.id, commentInput.trim());
      setComments(prev => [...prev, res.comment]);
      setCommentInput('');
      setPosts(prev => prev.map(p => p.id === activePostForComments.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postMediaUrl && !postCaption) return;

    setIsPosting(true);
    try {
      const res = await api.createPost({
        caption: postCaption,
        mediaUrl: postMediaUrl,
        mediaType: postMediaType,
        location: postLocation
      });
      setPosts([res.post, ...posts]);
      setShowCreatePost(false);
      setPostCaption('');
      setPostMediaUrl('');
      setPostLocation('');
    } catch (err: any) {
      alert(err.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyMediaUrl) return;

    try {
      const res = await api.createStory({
        mediaUrl: storyMediaUrl,
        caption: storyCaption
      });
      setStories([res.story, ...stories]);
      setShowCreateStory(false);
      setStoryMediaUrl('');
      setStoryCaption('');
    } catch (err: any) {
      alert(err.message || 'Failed to create story');
    }
  };

  const handleViewStory = (story: Story) => {
    setActiveStory(story);
    setStoryProgress(0);
    api.viewStory(story.id);
  };

  // Story auto-advance timer
  useEffect(() => {
    if (!activeStory) return;
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          setActiveStory(null);
          return 0;
        }
        return prev + 5;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [activeStory]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    try {
      await api.submitReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
        details: reportDetails
      });
      alert('Report submitted for moderation review.');
      setReportTarget(null);
      setReportDetails('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 24-Hour Disappearing Stories Tray */}
      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1">
          {/* Add Story Button */}
          <div
            onClick={() => setShowCreateStory(true)}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
          >
            <div className="relative w-16 h-16 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 group-hover:border-purple-500 flex items-center justify-center transition-colors">
              <img
                src={currentUser.avatarUrl}
                alt="My Story"
                className="w-full h-full rounded-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs shadow-md">
                  <Plus size={14} />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-neutral-300">Your Story</span>
          </div>

          {/* Active Stories with Glowing Gradient Rings */}
          {stories.map(story => (
            <div
              key={story.id}
              onClick={() => handleViewStory(story)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
            >
              <div className="relative w-16 h-16 p-0.5 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 group-hover:scale-105 transition-transform shadow-md">
                <img
                  src={story.userAvatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                />
              </div>
              <span className="text-[11px] font-medium text-neutral-300 truncate max-w-[68px]">
                {story.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed Category Tabs & Create Post Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex gap-2">
          {(['foryou', 'following', 'trending', 'latest'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCategory(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                category === tab
                  ? 'bg-white text-black shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {tab === 'foryou' ? 'For You' : tab}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreatePost(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          <Plus size={14} /> Create Post
        </button>
      </div>

      {/* Feed Posts Stream */}
      <div className="space-y-6">
        {posts.map(post => (
          <article
            key={post.id}
            className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-xl"
          >
            {/* Post Author Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={post.userAvatar}
                  alt={post.username}
                  className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">
                      {post.displayName}
                    </span>
                    {post.isVerified && (
                      <span className="bg-purple-600 text-[9px] text-white px-1.5 py-0.2 rounded-full font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    @{post.username} {post.location && `• ${post.location}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReportTarget({ id: post.id, type: 'post' })}
                className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                title="Report Post"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Post Media (Photo or Video) */}
            {post.mediaUrl && (
              <div className="relative w-full aspect-square sm:aspect-4/3 bg-black overflow-hidden">
                {post.mediaType === 'video' ? (
                  <video
                    src={post.mediaUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Post Engagement Bar */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      post.isLiked ? 'text-pink-500' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Heart size={20} className={post.isLiked ? 'fill-current' : ''} />
                    <span>{post.likesCount.toLocaleString()}</span>
                  </button>

                  <button
                    onClick={() => handleOpenComments(post)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                  >
                    <MessageCircle size={20} />
                    <span>{post.commentsCount.toLocaleString()}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors">
                    <Share2 size={20} />
                  </button>
                </div>

                <button
                  onClick={() => handleBookmarkPost(post.id)}
                  className={`text-neutral-300 hover:text-white transition-colors ${
                    post.isBookmarked ? 'text-purple-400' : ''
                  }`}
                >
                  <Bookmark size={20} className={post.isBookmarked ? 'fill-current' : ''} />
                </button>
              </div>

              {/* Caption & Hashtags */}
              <p className="text-xs text-neutral-200">
                <strong className="text-white mr-1.5">@{post.username}</strong>
                {post.caption}
              </p>

              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {post.hashtags.map((tag, i) => (
                    <span key={i} className="text-xs text-cyan-400 hover:underline cursor-pointer">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 text-[10px] text-neutral-500 uppercase tracking-wider">
                {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h3 className="font-extrabold text-white text-lg">Create New Post</h3>
              <button
                onClick={() => setShowCreatePost(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Media URL (Photo or Video)</label>
                <input
                  type="url"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://...mp4"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={postMediaType === 'image'}
                    onChange={() => setPostMediaType('image')}
                    className="accent-purple-600"
                  />
                  <span>Photo</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={postMediaType === 'video'}
                    onChange={() => setPostMediaType('video')}
                    className="accent-purple-600"
                  />
                  <span>Video</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Caption</label>
                <textarea
                  rows={3}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Write a caption... Tag #metaverse or @users"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Metaverse Location Tag</label>
                <input
                  type="text"
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="e.g. Aether Central Plaza, Sub-Bass Club"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  {isPosting ? 'Publishing...' : 'Share Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <Clock size={18} className="text-pink-400" /> 24h Disappearing Story
              </h3>
              <button
                onClick={() => setShowCreateStory(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Media URL (Photo or Clip)</label>
                <input
                  type="url"
                  required
                  value={storyMediaUrl}
                  onChange={(e) => setStoryMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Caption (Optional)</label>
                <input
                  type="text"
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  placeholder="What's happening right now?"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStory(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  Post Story (Expires in 24h)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm h-[75vh] bg-neutral-950 rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col justify-between">
            {/* Progress Bar */}
            <div className="absolute top-3 left-3 right-3 z-30">
              <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>
            </div>

            {/* Story Header */}
            <div className="relative z-30 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStory.userAvatar}
                  alt={activeStory.username}
                  className="w-8 h-8 rounded-full border border-purple-500 object-cover"
                />
                <span className="text-xs font-bold text-white">@{activeStory.username}</span>
              </div>
              <button
                onClick={() => setActiveStory(null)}
                className="text-white bg-black/40 hover:bg-black/60 p-1.5 rounded-full backdrop-blur-md"
              >
                ✕
              </button>
            </div>

            {/* Media Content */}
            <div className="absolute inset-0">
              <img
                src={activeStory.mediaUrl}
                alt="Story"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Story Caption & Viewers count */}
            <div className="relative z-30 p-4 bg-gradient-to-t from-black/90 to-transparent text-left">
              {activeStory.caption && (
                <p className="text-sm font-medium text-white mb-2">{activeStory.caption}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Eye size={14} className="text-cyan-400" />
                <span>{activeStory.viewers?.length || 1} Viewers</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Drawer */}
      {activePostForComments && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <h3 className="font-bold text-white text-base">
                  Comments ({comments.length})
                </h3>
                <button
                  onClick={() => setActivePostForComments(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center text-neutral-500 py-10 text-xs">
                    No comments yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold">
                        {c.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">@{c.username}</span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-300 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-3 border-t border-neutral-800">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Flag size={18} className="text-red-400" /> Report Content
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Help keep AetherVerse safe. Reports are forwarded to the Super Admin Moderation Center.
            </p>

            <form onSubmit={handleSubmitReport} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-neutral-900 text-white text-xs px-3 py-2 rounded-xl border border-neutral-700 focus:outline-none"
                >
                  <option value="Spam or misleading content">Spam or misleading content</option>
                  <option value="Harassment or abuse">Harassment or abuse</option>
                  <option value="Inappropriate 3D or visual assets">Inappropriate 3D or visual assets</option>
                  <option value="Scam or unauthorized transaction">Scam or unauthorized transaction</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Additional Details</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context for moderation..."
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2 rounded-xl border border-neutral-700 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
