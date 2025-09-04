"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, MessageCircle, ChevronDown, Send, Mail, Sun, Moon } from "lucide-react";

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

export default function Home() {
  const [text, setText] = useState("");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Fetch wishes from Supabase
  useEffect(() => {
    fetchWishes();
  }, []);

  // Fetch comments when a wish is selected
  useEffect(() => {
    if (selectedWish) {
      fetchComments(selectedWish.id);
    }
  }, [selectedWish]);

  async function fetchWishes() {
    try {
      // First get all wishes
      let { data: wishesData, error: wishesError } = await supabase
        .from("wishes")
        .select("*")
        .order("created_at", { ascending: false });

      if (wishesError) throw wishesError;

      // Then get like counts for each wish
      const wishesWithStats = await Promise.all(
        (wishesData || []).map(async (wish) => {
          let likes = 0;
          let isLiked = false;

          try {
            // Get likes (using votes table with type='upvote' as likes)
            const { count: likesCount, error: likesError } = await supabase
              .from("votes")
              .select("*", { count: "exact", head: true })
              .eq("wish_id", wish.id)
              .eq("type", "upvote");

            if (!likesError) {
              likes = likesCount || 0;
            }

            // Check if this wish is liked
            const { data: existingLike, error: likeError } = await supabase
              .from("votes")
              .select("*")
              .eq("wish_id", wish.id)
              .eq("type", "upvote")
              .single();

            if (!likeError) {
              isLiked = !!existingLike;
            }
          } catch (error) {
            console.log("Votes table might not exist yet, using default values");
          }

          // Get comments
          let comments = 0;
          try {
            const { count: commentsCount, error: commentsError } = await supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("wish_id", wish.id);

            if (!commentsError) {
              comments = commentsCount || 0;
            }
          } catch (error) {
            console.log("Comments table might not exist yet, using default values");
          }

          return {
            ...wish,
            likes,
            comments,
            isLiked
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

  // Submit a new wish
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      const { error } = await supabase
        .from("wishes")
        .insert([{ text: text.trim() }]);
      
      if (error) throw error;
      
      setText("");
      fetchWishes(); // Refresh the list
    } catch (error) {
      console.error("Error submitting wish:", error);
      alert("Failed to submit wish. Please try again.");
    }
  }

  // Like/unlike a wish
  async function handleLike(wishId: number) {
    try {
      // Check if already liked (using votes table with type='upvote')
      const { data: existingLike, error: checkError } = await supabase
        .from("votes")
        .select("*")
        .eq("wish_id", wishId)
        .eq("type", "upvote")
        .single();

      // If there's an error checking (like table doesn't exist), just update locally
      if (checkError) {
        console.log("Votes table not found, updating locally only");
        // For now, just update locally without database
        setWishes(prev => prev.map(wish => {
          if (wish.id === wishId) {
            const isCurrentlyLiked = wish.isLiked;
            return {
              ...wish,
              likes: isCurrentlyLiked ? (wish.likes || 0) - 1 : (wish.likes || 0) + 1,
              isLiked: !isCurrentlyLiked
            };
          }
          return wish;
        }));
        return;
      }

      if (existingLike) {
        // Unlike - delete the like
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("wish_id", wishId)
          .eq("type", "upvote");
        
        if (error) {
          console.error("Error deleting like:", error);
          throw error;
        }
      } else {
        // Like - insert new like (as upvote)
        const { error } = await supabase
          .from("votes")
          .insert([{ wish_id: wishId, type: "upvote" }]);
        
        if (error) {
          console.error("Error inserting like:", error);
          throw error;
        }
      }
      
      // Update the local state immediately for better UX
      setWishes(prev => prev.map(wish => {
        if (wish.id === wishId) {
          const isCurrentlyLiked = wish.isLiked;
          return {
            ...wish,
            likes: isCurrentlyLiked ? (wish.likes || 0) - 1 : (wish.likes || 0) + 1,
            isLiked: !isCurrentlyLiked
          };
        }
        return wish;
      }));
      
      // Also refresh from database to ensure consistency
      fetchWishes();
    } catch (error) {
      console.error("Error liking/unliking:", error);
      // Revert the optimistic update on error
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
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-modern' : 'border-gray-200'} px-6 py-4 flex justify-between items-center`}>
        <h1 className="text-2xl font-semibold tracking-tight">Wish</h1>
        <div className="flex items-center gap-4">
          <a 
            href="https://t.me/IsruWill" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'text-modern-secondary hover:bg-modern-gray hover:text-modern-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Mail className="w-4 h-4" />
            Contact
          </a>
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-modern-secondary hover:bg-modern-gray hover:text-modern-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Column - Input */}
        <div className={`w-80 border-r ${isDarkMode ? 'border-modern' : 'border-gray-200'} p-6`}>
          <div className="space-y-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="write your wish here..."
              className={`w-full p-3 ${isDarkMode ? 'bg-modern-card border-modern text-modern-primary placeholder:text-modern-muted' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all`}
            />
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
            >
              Make a Wish
            </button>
          </div>
        </div>

        {/* Middle Column - Wishes List */}
        <div className={`flex-1 border-r ${isDarkMode ? 'border-modern' : 'border-gray-200'} overflow-y-auto`}>
          <div className="p-6 space-y-3">
            {wishes.map((wish) => (
              <div
                key={wish.id}
                className={`p-4 ${isDarkMode ? 'bg-modern-card' : 'bg-gray-50'} rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedWish?.id === wish.id ? 'ring-2 ring-blue-500' : isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedWish(wish)}
              >
                <div className="flex justify-between items-start">
                  <p className={`${isDarkMode ? 'text-modern-primary' : 'text-gray-900'} flex-1 pr-4 font-medium leading-relaxed`}>{wish.text}</p>
                  <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-modern-muted' : 'text-gray-500'}`} />
                </div>
                <div className={`flex items-center gap-4 mt-3 text-sm ${isDarkMode ? 'text-modern-secondary' : 'text-gray-500'}`}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(wish.id);
                    }}
                    className={`flex items-center gap-1 hover:scale-110 transition-all duration-200 ${
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

        {/* Right Column - Comments */}
        <div className="w-80 p-6">
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
                  className={`flex-1 p-2 ${isDarkMode ? 'bg-modern-card border-modern text-modern-primary placeholder:text-modern-muted' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'} border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all`}
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className={`text-center ${isDarkMode ? 'text-modern-muted' : 'text-gray-400'} mt-20`}>
              No selected Wish
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
