/**
 * AetherVerse TikTok-Inspired Short-Form Video Feed
 * Vertical scroll player, audio disc animation, likes, comments, and video upload creator.
 */

import React, { useEffect, useState, useRef } from 'react';
import { ShortVideo, UserProfile } from '../types/index';
import { api } from '../services/api';
import {
  Heart,
  MessageCircle,
  Share2,
  Music,
  Plus,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Upload,
  Check,
  Send
} from 'lucide-react';

interface VideosViewProps {
  currentUser: UserProfile;
}

export const VideosView: React.FC<VideosViewProps> = ({ currentUser }) => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<{ id: string; user: string; text: string; time: string }[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form
  const [uploadVideoUrl, setUploadVideoUrl] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadMusicTitle, setUploadMusicTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const res = await api.getVideos();
      setVideos(res.videos);
      if (res.videos.length > 0) {
        api.recordVideoView(res.videos[0].id);
      }
    } catch (err) {
      console.error('Failed to load videos', err);
    }
  };

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    if (currentVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
      api.recordVideoView(currentVideo.id);
    }
  }, [currentIndex]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLike = async () => {
    if (!currentVideo) return;
    try {
      const res = await api.toggleLikeVideo(currentVideo.id);
      setVideos(prev => prev.map(v => v.id === currentVideo.id ? res.video : v));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setCommentsList(prev => [
      ...prev,
      {
        id: String(Date.now()),
        user: currentUser.username,
        text: commentInput.trim(),
        time: 'Just now'
      }
    ]);
    setCommentInput('');

    if (currentVideo) {
      currentVideo.commentsCount += 1;
      setVideos([...videos]);
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVideoUrl) return;

    setIsUploading(true);
    try {
      const res = await api.createVideo({
        videoUrl: uploadVideoUrl,
        description: uploadDescription,
        musicTrackTitle: uploadMusicTitle || 'Original Creator Sound',
        musicArtist: currentUser.displayName
      });
      setVideos([res.video, ...videos]);
      setShowUploadModal(false);
      setUploadVideoUrl('');
      setUploadDescription('');
      setUploadMusicTitle('');
      setCurrentIndex(0);
    } catch (err: any) {
      alert(err.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentVideo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] text-neutral-400">
        Loading vertical videos...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Video Container (Adapts cleanly to desktop & mobile) */}
      <div className="relative w-full max-w-[420px] h-full bg-neutral-950 flex items-center justify-center overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          src={currentVideo.videoUrl}
          poster={currentVideo.posterUrl}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          muted={isMuted}
          autoPlay
          onClick={togglePlay}
        />

        {/* Play/Pause Overlay indicator */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          >
            <div className="p-4 bg-black/60 rounded-full backdrop-blur-md text-white">
              <Play size={36} />
            </div>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800">
              ⚡ Reels / For You
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 border border-neutral-800 transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 rounded-full text-white shadow-lg transition-colors"
              title="Upload Short Video"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Right Action Sidebar */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-20">
          {/* Creator Avatar with Follow button */}
          <div className="relative mb-2">
            <img
              src={currentVideo.userAvatar}
              alt={currentVideo.username}
              className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover shadow-lg"
            />
            <button className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-500 hover:bg-pink-400 text-white rounded-full flex items-center justify-center text-xs shadow-md">
              +
            </button>
          </div>

          {/* Like Button */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full backdrop-blur-md transition-transform group-active:scale-125 ${
              currentVideo.isLiked ? 'bg-pink-600/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'
            }`}>
              <Heart size={22} className={currentVideo.isLiked ? 'fill-current' : ''} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {currentVideo.likesCount.toLocaleString()}
            </span>
          </button>

          {/* Comments Button */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md text-white transition-colors">
              <MessageCircle size={22} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {currentVideo.commentsCount.toLocaleString()}
            </span>
          </button>

          {/* Share Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md text-white transition-colors">
              <Share2 size={22} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {currentVideo.sharesCount.toLocaleString()}
            </span>
          </button>

          {/* Spinning Music Vinyl Disc */}
          <div className="mt-2 animate-spin-slow">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-cyan-500 p-0.5 shadow-xl">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-cyan-400">
                <Music size={15} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Video Meta Information */}
        <div className="absolute bottom-5 left-4 right-16 z-20 pointer-events-none text-left">
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-bold text-white text-base drop-shadow-md">
                @{currentVideo.username}
              </span>
              {currentVideo.isVerified && (
                <span className="bg-purple-600 text-[10px] text-white px-1.5 py-0.2 rounded-full font-bold">
                  ✓
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-200 line-clamp-2 drop-shadow-sm mb-2.5">
              {currentVideo.description}
            </p>

            <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
              <Music size={13} className="shrink-0 animate-pulse" />
              <span className="truncate max-w-[200px]">
                {currentVideo.musicTrackTitle} • {currentVideo.musicArtist}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Quick Next / Prev Arrows */}
        <div className="absolute right-[-65px] top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3">
          <button
            onClick={handlePrevVideo}
            disabled={currentIndex === 0}
            className="p-3 bg-neutral-900/80 hover:bg-neutral-800 disabled:opacity-30 text-white rounded-full border border-neutral-700 transition-colors shadow-lg"
          >
            <ChevronUp size={20} />
          </button>
          <button
            onClick={handleNextVideo}
            disabled={currentIndex === videos.length - 1}
            className="p-3 bg-neutral-900/80 hover:bg-neutral-800 disabled:opacity-30 text-white rounded-full border border-neutral-700 transition-colors shadow-lg"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {/* Comments Sheet Modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <h3 className="font-bold text-white text-base">
                  Comments ({currentVideo.commentsCount})
                </h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {commentsList.length === 0 ? (
                  <div className="text-center text-neutral-500 py-10 text-xs">
                    Be the first to comment on this video!
                  </div>
                ) : (
                  commentsList.map(c => (
                    <div key={c.id} className="flex items-start gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center font-bold">
                        {c.user[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">@{c.user}</span>
                          <span className="text-[10px] text-neutral-500">{c.time}</span>
                        </div>
                        <p className="text-neutral-300 mt-0.5">{c.text}</p>
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
                placeholder="Add a comment..."
                className="flex-1 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <Upload size={18} className="text-purple-400" /> Upload Short Video
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadVideo} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Video URL (MP4 / WebM)</label>
                <input
                  type="url"
                  required
                  value={uploadVideoUrl}
                  onChange={(e) => setUploadVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Description & Hashtags</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Tell your viewers what this video is about... #cyber #metaverse"
                  rows={3}
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Sound / Music Attribution</label>
                <input
                  type="text"
                  value={uploadMusicTitle}
                  onChange={(e) => setUploadMusicTitle(e.target.value)}
                  placeholder="Original Audio or Track Title"
                  className="w-full bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Publishing...' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
