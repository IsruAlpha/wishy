"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, MessageCircle, ChevronDown, Send, Mail, Sun, Moon, Sparkles } from "lucide-react";

type Wish = {
  id: number;
  text: string;
  created_at: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
};

type Comment = {
  id: number;
  wish_id: number;
  text: string;
  created_at: string;
};

// Sprinkle effect component
const SprinkleEffect = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sprinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  const [text, setText] = useState("");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'wishes' | 'comments'>('wishes');
  const [showSprinkles, setShowSprinkles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate a stable per-device ID (no login needed)
const [clientId] = useState(() => {
  if (typeof window !== "undefined") {
    let id = localStorage.getItem("wishy_client_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("wishy_client_id", id);
    }
    return id;
  }
  return ""; // SSR safety
});
  
useEffect(() => {
  if (!clientId) return; // wait for clientId to exist
  fetchWishes();
}, [clientId]);


  // Fetch comments when a wish is selected
  useEffect(() => {
    if (selectedWish) {
      fetchComments(selectedWish.id);
    }
  }, [selectedWish]);

  async function fetchWishes() {
    try {
      if (!clientId) return;
  
      const { data: wishesData, error: wishesError } = await supabase
        .from("wishes")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (wishesError) throw wishesError;
  
      const wishesWithStats = await Promise.all(
        (wishesData || []).map(async (wish) => {
          let likes = 0;
          let isLiked = false;
          let comments = 0;
  
          try {
            // Check if THIS device has liked this wish
            const { data: existingLike } = await supabase
              .from("votes")
              .select("id")
              .eq("wish_id", wish.id)
              .eq("type", "upvote")
              .eq("client_id", clientId)
              .maybeSingle();

            // Only show red heart if THIS device liked it
            isLiked = !!existingLike;
  
            const { count: likesCount } = await supabase
              .from("votes")
              .select("*", { count: "exact", head: true })
              .eq("wish_id", wish.id)
              .eq("type", "upvote");
  
            likes = likesCount || 0;
  
            const { count: commentsCount } = await supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("wish_id", wish.id);
  
            comments = commentsCount || 0;
          } catch (innerError) {
            console.error("Error fetching wish stats:", innerError);
          }
  
          return {
            ...wish,
            likes,
            comments,
            isLiked,
          };
        })
      );
  
      setWishes(wishesWithStats);
    } catch (error) {
      console.error("Error fetching wishes:", error);
      setWishes([]);
    }
  }
    
  async function fetchComments(wishId: number) {
    try {
      let { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("wish_id", wishId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  }

  // Submit a new wish with sprinkle effect
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setShowSprinkles(true);

    try {
      const { error } = await supabase
        .from("wishes")
        .insert([{ text: text.trim() }]);
      
      if (error) throw error;
      
      setText("");
      fetchWishes(); // Refresh the list
      
      // Hide sprinkles after animation
      setTimeout(() => {
        setShowSprinkles(false);
        setIsSubmitting(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting wish:", error);
      alert("Failed to submit wish. Please try again.");
      setShowSprinkles(false);
      setIsSubmitting(false);
    }
  }

  // Like/unlike a wish
  async function handleLike(wishId: number) {
    try {
      // Check if this wish is liked by this device
      const { data: existingLike, error: likeError } = await supabase
        .from("votes")
        .select("id")
        .eq("wish_id", wishId)
        .eq("type", "upvote")
        .eq("client_id", clientId)
        .maybeSingle();
  
      if (!likeError && existingLike) {
        // Unlike
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("id", existingLike.id);
  
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("votes")
          .insert([{ wish_id: wishId, type: "upvote", client_id: clientId }]);
  
        if (error) throw error;
      }
  
      // Update local state immediately
      setWishes(prev =>
        prev.map(wish => {
          if (wish.id === wishId) {
            const isCurrentlyLiked = wish.isLiked;
            const likesCount = wish.likes || 0;
            return {
              ...wish,
              likes: isCurrentlyLiked ? likesCount - 1 : likesCount + 1,
              isLiked: !isCurrentlyLiked,
            };
          }
          return wish;
        })
      );
  
      // Refresh from database to ensure consistency
      fetchWishes();
    } catch (error) {
      console.error("Error liking/unliking:", error);
      fetchWishes();
    }
  }

  // Submit a comment
  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !selectedWish) return;

    try {
      const { error } = await supabase
        .from("comments")
        .insert([{ 
          wish_id: selectedWish.id, 
          text: commentText.trim() 
        }]);
      
      if (error) throw error;
      
      setCommentText("");
      fetchComments(selectedWish.id); // Refresh comments
      fetchWishes(); // Update comment count in wishes list
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("Failed to submit comment. Please try again.");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit' 
    });
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-modern-black text-modern-primary' : 'bg-white text-gray-900'}`}>
      {/* Sprinkle Effect */}
      <SprinkleEffect isActive={showSprinkles} />
      
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-modern' : 'border-gray-200'} px-4 sm:px-6 py-4 flex justify-between items-center`}>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Wish</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <a 
            href="https://t.me/IsruWill" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${isDarkMode ? 'text-modern-secondary hover:bg-modern-gray hover:text-modern-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Contact</span>
          </a>
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-modern-secondary hover:bg-modern-gray hover:text-modern-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden border-b border-modern">
        <div className="flex">
          <button
            onClick={() => setActiveTab('wishes')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'wishes'
                ? isDarkMode 
                  ? 'text-modern-primary border-b-2 border-blue-500 bg-modern-gray' 
                  : 'text-gray-900 border-b-2 border-blue-500 bg-gray-100'
                : isDarkMode
                  ? 'text-modern-secondary hover:text-modern-primary'
                  : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Wishes
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? isDarkMode 
                  ? 'text-modern-primary border-b-2 border-blue-500 bg-modern-gray' 
                  : 'text-gray-900 border-b-2 border-blue-500 bg-gray-100'
                : isDarkMode
                  ? 'text-modern-secondary hover:text-modern-primary'
                  : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Comments
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)]">
        {/* Desktop: Left Column - Input | Mobile: Always visible */}
        <div className={`${activeTab === 'wishes' ? 'block' : 'hidden'} sm:block lg:w-80 border-r ${isDarkMode ? 'border-modern' : 'border-gray-200'} p-4 sm:p-6`}>
          <div className="space-y-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="write your wish here..."
              className={`w-full p-3 ${isDarkMode ? 'bg-modern-card border-modern text-modern-primary placeholder:text-modern-muted' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-base`}
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-200 text-base flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-105'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Making Wish...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Make a Wish
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop: Middle Column - Wishes List | Mobile: Tab content */}
        <div className={`${activeTab === 'wishes' ? 'block' : 'hidden'} sm:block lg:flex-1 border-r ${isDarkMode ? 'border-modern' : 'border-gray-200'} overflow-y-auto`}>
          <div className="p-4 sm:p-6 space-y-3">
            {wishes.map((wish) => (
              <div
                key={wish.id}
                className={`p-4 ${isDarkMode ? 'bg-modern-card' : 'bg-gray-50'} rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedWish?.id === wish.id ? 'ring-2 ring-blue-500' : isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedWish(wish);
                  if (window.innerWidth < 640) {
                    setActiveTab('comments');
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <p className={`${isDarkMode ? 'text-modern-primary' : 'text-gray-900'} flex-1 pr-4 font-medium leading-relaxed text-sm sm:text-base`}>{wish.text}</p>
                  <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-modern-muted' : 'text-gray-500'} flex-shrink-0`} />
                </div>
                <div className={`flex items-center gap-3 sm:gap-4 mt-3 text-sm ${isDarkMode ? 'text-modern-secondary' : 'text-gray-500'}`}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(wish.id);
                    }}
                    className={`flex items-center gap-1 hover:scale-110 transition-all duration-200 touch-manipulation ${
                      wish.isLiked 
                        ? 'text-red-500' 
                        : isDarkMode 
                          ? 'text-modern-muted hover:text-red-400' 
                          : 'text-gray-500 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wish.isLiked ? 'fill-current' : ''} transition-all duration-200`} />
                    <span className="font-medium">{wish.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{wish.comments || 0}</span>
                  </div>
                  <span className="ml-auto text-xs text-modern-muted">{formatDate(wish.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Right Column - Comments | Mobile: Tab content */}
        <div className={`${activeTab === 'comments' ? 'block' : 'hidden'} sm:block lg:w-80 p-4 sm:p-6`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-modern-primary' : 'text-gray-900'}`}>Comments</h2>
          {selectedWish ? (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className={`p-3 ${isDarkMode ? 'bg-modern-card' : 'bg-gray-50'} rounded-lg`}>
                    <p className={`text-sm ${isDarkMode ? 'text-modern-primary' : 'text-gray-700'} leading-relaxed`}>{comment.text}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-modern-muted' : 'text-gray-400'} mt-2`}>{formatDate(comment.created_at)}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Select a wish to comment"
                  className={`flex-1 p-2 ${isDarkMode ? 'bg-modern-card border-modern text-modern-primary placeholder:text-modern-muted' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-base`}
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 hover:shadow-lg touch-manipulation"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className={`text-center ${isDarkMode ? 'text-modern-muted' : 'text-gray-400'} mt-20`}>
              <p className="text-sm">Select a wish to view comments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
