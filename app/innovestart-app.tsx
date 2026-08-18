"use client";

/* eslint-disable jsx-a11y/media-has-caption */

import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Compass,
  Heart,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  LineChart,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Rocket,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { initialPosts, investors, Post, startups, type CommentItem, type Startup } from "./synthetic-data";
import { authenticatedFetch, getSupabaseAccessToken, supabase } from "./supabase-client";

type View = "home" | "discover" | "messages" | "network";
type Role = "investor" | "founder";
type Viewer = {
  id: string;
  email: string;
  name: string;
  initials: string;
  title: string;
  role: Role;
  headline: string;
  company: string;
  bio: string;
  onboardingComplete: boolean;
};
type ProfilePayload = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  headline: string;
  company: string;
  bio: string;
  onboardingComplete: boolean;
};
type UploadedAsset = { id: string; url: string; fileName: string; contentType: string; mediaType: "video" | "image"; sizeBytes: number };
type PostDraft = { headline: string; body: string; tags: string; media?: UploadedAsset };
type ProfileDraft = { displayName: string; role: Role; headline: string; company: string; bio: string };
type AuthMode = "signin" | "signup" | "forgot" | "reset";

function viewerFromProfile(profile: ProfilePayload): Viewer {
  const initials = profile.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";
  const fallback = profile.role === "founder" ? (profile.company ? `Founder · ${profile.company}` : "Startup founder") : (profile.company ? `Investor · ${profile.company}` : "Startup investor");
  return { id: profile.id, email: profile.email, name: profile.displayName, initials, title: profile.headline || fallback, role: profile.role, headline: profile.headline, company: profile.company, bio: profile.bio, onboardingComplete: profile.onboardingComplete };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark">I</span>
      {!compact && <span>Innove<span className="brand-accent">start</span></span>}
    </span>
  );
}

function Avatar({ initials, color, size = "normal" }: { initials: string; color?: string; size?: "small" | "normal" | "large" }) {
  return <span className={`avatar avatar-${size}`} style={color ? { background: color } : undefined}>{initials}</span>;
}

function StartupLogo({ startup, size = "normal" }: { startup: Pick<Startup, "initials" | "color">; size?: "small" | "normal" | "large" }) {
  return <span className={`startup-logo logo-${size}`} style={{ background: startup.color }}>{startup.initials}</span>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
        <button className="modal-close" aria-label="Close" onClick={onClose}><X size={19} /></button>
        {children}
      </div>
    </div>
  );
}

export default function InnovestartApp() {
  const [view, setView] = useState<View>("home");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [role, setRole] = useState<Role>("investor");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [profileOpen, setProfileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [shared, setShared] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [extraComments, setExtraComments] = useState<Record<string, CommentItem[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [feedFilter, setFeedFilter] = useState<"For you" | "Following" | "Newest">("For you");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadViewer = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/profile");
      if (!response.ok) {
        if (response.status === 401) setViewer(null);
        return null;
      }
      const payload = await response.json() as { profile?: ProfilePayload };
      if (!payload.profile) return null;
      let nextViewer = viewerFromProfile(payload.profile);
      const pendingRole = window.localStorage.getItem("innovestart-pending-role");
      if (!nextViewer.onboardingComplete && (pendingRole === "founder" || pendingRole === "investor")) nextViewer = { ...nextViewer, role: pendingRole };
      setViewer(nextViewer);
      setRole(nextViewer.role);
      if (!nextViewer.onboardingComplete) setProfileOpen(true);
      return nextViewer;
    } catch {
      return null;
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/posts");
      if (!response.ok) return;
      const payload = await response.json() as { posts?: Post[] };
      if (!payload.posts?.length) return;
      setPosts((current) => {
        const serverIds = new Set(payload.posts!.map((post) => post.id));
        return [...payload.posts!, ...current.filter((post) => !serverIds.has(post.id))];
      });
    } catch { /* keep the synthetic feed available offline */ }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await loadViewer();
      else if (active) setViewer(null);
      await loadPosts();
      if (active) setAuthChecking(false);
    };
    initialize().catch(() => active && setAuthChecking(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
        setAuthOpen(true);
        return;
      }
      if (event === "SIGNED_OUT" || !session) {
        setViewer(null);
        setAuthChecking(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        window.setTimeout(() => {
          loadViewer();
          loadPosts();
        }, 0);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadPosts, loadViewer]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requireAuth = () => {
    if (viewer) return true;
    setAuthMode("signin");
    setAuthOpen(true);
    setToast("Sign in to join the conversation");
    return false;
  };

  const authenticated = async () => {
    setAuthChecking(true);
    await loadViewer();
    await loadPosts();
    setAuthChecking(false);
    setAuthOpen(false);
    setToast("Welcome to Innovestart");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setViewer(null);
    setAccountOpen(false);
    setToast("Signed out securely");
  };

  const recordAction = (postId: string, action: string, content?: string) => {
    authenticatedFetch("/api/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId, action, content }),
    }).catch(() => undefined);
  };

  const toggleLike = (postId: string) => {
    if (!requireAuth()) return;
    setLiked((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
    recordAction(postId, "like");
  };

  const toggleSave = (postId: string) => {
    if (!requireAuth()) return;
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(postId)) {
        next.delete(postId);
        setToast("Removed from saved startups");
      } else {
        next.add(postId);
        setToast("Saved to your deal flow");
      }
      return next;
    });
    recordAction(postId, "save");
  };

  const toggleFollow = (startupId: string, name: string) => {
    if (!requireAuth()) return;
    setFollowing((current) => {
      const next = new Set(current);
      if (next.has(startupId)) {
        next.delete(startupId);
        setToast(`Unfollowed ${name}`);
      } else {
        next.add(startupId);
        setToast(`You’re now following ${name}`);
      }
      return next;
    });
  };

  const sharePost = async (post: Post) => {
    const shareData = { title: `${post.startup} on Innovestart`, text: post.headline, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setToast("Post link copied");
      }
      setShared((current) => ({ ...current, [post.id]: (current[post.id] ?? 0) + 1 }));
      recordAction(post.id, "share");
    } catch { /* user cancelled native share */ }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  const addComment = (postId: string) => {
    if (!requireAuth()) return;
    const body = commentDrafts[postId]?.trim();
    if (!body || !viewer) return;
    const comment: CommentItem = { id: `local-${Date.now()}`, author: viewer.name, initials: viewer.initials, role: viewer.title, body, time: "now" };
    setExtraComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    recordAction(postId, "comment", body);
    setToast("Comment added");
  };

  const submitPost = async (draft: PostDraft) => {
    if (!viewer) return false;
    try {
      const response = await authenticatedFetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headline: draft.headline,
          body: draft.body,
          tags: draft.tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean),
          mediaAssetId: draft.media?.id,
          mediaTitle: draft.headline,
        }),
      });
      const payload = await response.json() as { post?: Post; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "Unable to publish this post.");
      setPosts((current) => [payload.post!, ...current]);
      setComposerOpen(false);
      setToast("Your post is live and visible to the community");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to publish this post");
      return false;
    }
  };

  const deletePost = async (post: Post) => {
    if (!post.ownedByViewer || !window.confirm("Delete this post and its uploaded media? This cannot be undone.")) return;
    const response = await authenticatedFetch(`/api/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setToast(payload.error || "Unable to delete this post");
      return;
    }
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setToast("Post deleted");
  };

  const saveProfile = async (draft: ProfileDraft) => {
    try {
      const response = await authenticatedFetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json() as { profile?: ProfilePayload; error?: string };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "Unable to save your profile.");
      const nextViewer = viewerFromProfile(payload.profile);
      setViewer(nextViewer);
      setRole(nextViewer.role);
      setProfileOpen(false);
      window.localStorage.removeItem("innovestart-pending-role");
      setToast("Profile saved");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save your profile");
      return false;
    }
  };

  const goTo = (next: View) => {
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return startups.slice(0, 3);
    return startups.filter((item) => `${item.name} ${item.sector} ${item.tags.join(" ")}`.toLowerCase().includes(query)).slice(0, 5);
  }, [search]);

  const displayPosts = useMemo(() => {
    if (feedFilter === "Following") return posts.filter((post) => following.has(post.startupId));
    if (feedFilter === "Newest") return [...posts].reverse();
    return posts;
  }, [feedFilter, following, posts]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu((current) => !current)}><Menu size={20} /></button>
        <button className="logo-button" onClick={() => goTo("home")} aria-label="Innovestart home"><Logo /></button>
        <nav className={`main-nav ${mobileMenu ? "mobile-open" : ""}`} aria-label="Primary navigation">
          <NavButton active={view === "home"} icon={<Home />} label="Home" onClick={() => goTo("home")} />
          <NavButton active={view === "discover"} icon={<Compass />} label="Discover" onClick={() => goTo("discover")} />
          <NavButton active={view === "messages"} icon={<MessageCircle />} label="Messages" onClick={() => goTo("messages")} />
          <NavButton active={view === "network"} icon={<Users />} label="Network" onClick={() => goTo("network")} />
        </nav>
        <div className="top-actions">
          <div className="global-search">
            <Search size={16} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Search startups, sectors..." aria-label="Search" />
            {searchOpen && (
              <div className="search-popover">
                <div className="popover-label">{search ? "Search results" : "Trending startups"}<button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={15} /></button></div>
                {searchResults.map((startup) => (
                  <button key={startup.id} className="search-result" onClick={() => { setSelectedStartup(startup); setSearchOpen(false); }}>
                    <StartupLogo startup={startup} size="small" /><span><strong>{startup.name}</strong><small>{startup.sector} · {startup.stage}</small></span><ArrowUpRight size={15} />
                  </button>
                ))}
                {!searchResults.length && <p className="empty-search">No startup matches that search.</p>}
              </div>
            )}
          </div>
          <div className="top-popover-wrap">
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => { setNotificationsOpen((current) => !current); setAccountOpen(false); }}><Bell size={18} /><span className="notify-dot" /></button>
            {notificationsOpen && <div className="notification-popover"><div><strong>What’s new</strong><button onClick={() => setNotificationsOpen(false)}><X size={14} /></button></div><button><span className="notice-icon coral"><Heart size={14} /></span><p><strong>Rhea Mehta</strong> liked EmberGrid’s founder story.<small>12 minutes ago</small></p></button><button><span className="notice-icon blue"><MessageCircle size={14} /></span><p><strong>Mira at EmberGrid</strong> replied to your message.<small>34 minutes ago</small></p></button><button><span className="notice-icon yellow"><Sparkles size={14} /></span><p><strong>3 new startups</strong> match your climate thesis.<small>Today</small></p></button></div>}
          </div>
          {viewer ? (
            <div className="account-wrap top-popover-wrap">
              <button className="profile-chip" onClick={() => { setAccountOpen((current) => !current); setNotificationsOpen(false); }}><Avatar initials={viewer.initials} size="small" /><span>{viewer.name.split(" ")[0]}</span><ChevronDown size={14} /></button>
              {accountOpen && <div className="account-popover"><div><Avatar initials={viewer.initials} /><span><strong>{viewer.name}</strong><small>{viewer.title}</small></span></div><button onClick={() => { setAccountOpen(false); setProfileOpen(true); }}><Sparkles size={15} /> Edit my profile</button><button onClick={() => { setAccountOpen(false); goTo("network"); }}><Users size={15} /> View my network</button><button onClick={() => { setAccountOpen(false); signOut(); }}><ArrowUpRight size={15} /> Sign out</button></div>}
            </div>
          ) : <button className="header-signin" disabled={authChecking} onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}>{authChecking ? "Checking…" : "Sign in"}</button>}
        </div>
      </header>

      {view === "home" && (
        <HomeView
          viewer={viewer}
          posts={displayPosts}
          liked={liked}
          saved={saved}
          following={following}
          shared={shared}
          openComments={openComments}
          extraComments={extraComments}
          commentDrafts={commentDrafts}
          feedFilter={feedFilter}
          onFilter={setFeedFilter}
          onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }}
          onCompose={() => requireAuth() && setComposerOpen(true)}
          onLike={toggleLike}
          onSave={toggleSave}
          onFollow={toggleFollow}
          onShare={sharePost}
          onComments={toggleComments}
          onCommentDraft={(id, value) => setCommentDrafts((current) => ({ ...current, [id]: value }))}
          onComment={addComment}
          onStartup={setSelectedStartup}
          onPlay={setSelectedVideo}
          onDelete={deletePost}
          onUtility={setToast}
          onNavigate={goTo}
        />
      )}
      {view === "discover" && <DiscoverView following={following} onFollow={toggleFollow} onStartup={setSelectedStartup} />}
      {view === "messages" && <MessagesView viewer={viewer} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} />}
      {view === "network" && <NetworkView viewer={viewer} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} />}

      {authOpen && <AuthModal key={authMode} role={role} setRole={setRole} initialMode={authMode} onClose={() => setAuthOpen(false)} onAuthenticated={authenticated} />}
      {profileOpen && viewer && <ProfileModal viewer={viewer} required={!viewer.onboardingComplete} onClose={() => viewer.onboardingComplete && setProfileOpen(false)} onSave={saveProfile} />}
      {composerOpen && viewer && <ComposerModal viewer={viewer} onClose={() => setComposerOpen(false)} onSubmit={submitPost} />}
      {selectedStartup && <StartupModal startup={selectedStartup} followed={following.has(selectedStartup.id)} onClose={() => setSelectedStartup(null)} onFollow={() => toggleFollow(selectedStartup.id, selectedStartup.name)} onMessage={() => { if (requireAuth()) { setSelectedStartup(null); goTo("messages"); setToast(`Conversation with ${selectedStartup.name} opened`); } }} />}
      {selectedVideo && <VideoModal post={selectedVideo} onClose={() => setSelectedVideo(null)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span>{label}</button>;
}

type HomeViewProps = {
  viewer: Viewer | null;
  posts: Post[];
  liked: Set<string>;
  saved: Set<string>;
  following: Set<string>;
  shared: Record<string, number>;
  openComments: Set<string>;
  extraComments: Record<string, CommentItem[]>;
  commentDrafts: Record<string, string>;
  feedFilter: "For you" | "Following" | "Newest";
  onFilter: (value: "For you" | "Following" | "Newest") => void;
  onAuth: () => void;
  onCompose: () => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onFollow: (id: string, name: string) => void;
  onShare: (post: Post) => void;
  onComments: (id: string) => void;
  onCommentDraft: (id: string, value: string) => void;
  onComment: (id: string) => void;
  onStartup: (startup: Startup) => void;
  onPlay: (post: Post) => void;
  onDelete: (post: Post) => void;
  onUtility: (message: string) => void;
  onNavigate: (view: View) => void;
};

function HomeView(props: HomeViewProps) {
  const [visibleCount, setVisibleCount] = useState(6);
  const visiblePosts = props.posts.slice(0, visibleCount);
  return (
    <div className="page-grid">
      <aside className="left-rail">
        {props.viewer ? <SignedInProfile viewer={props.viewer} onNavigate={props.onNavigate} /> : <JoinCard onAuth={props.onAuth} />}
        <section className="card menu-card">
          <button onClick={() => props.onUtility(`${props.saved.size || 14} saved startups are ready to review`)}><Bookmark size={17} /> Saved startups <b>{props.saved.size || 14}</b></button>
          <button onClick={() => props.onUtility("Your next event is Founder Office Hours on Thursday")}><CalendarDays size={17} /> Upcoming events <b>3</b></button>
          <button onClick={() => props.onUtility("Founder circles are opening in the next MVP release")}><LayoutGrid size={17} /> Founder circles</button>
        </section>
        <div className="mini-promo">
          <span><Sparkles size={14} /> INVESTOR OFFICE HOURS</span>
          <strong>Pitch feedback with Northstar</strong>
          <small>Thursday · 5:00 PM IST</small>
          <button onClick={() => props.onUtility("Seat reserved for Thursday’s office hours")}>Reserve a seat <ArrowUpRight size={13} /></button>
        </div>
      </aside>

      <section className="feed-column">
        <div className="feed-heading">
          <div><span className="eyebrow">TODAY ON INNOVESTART</span><h1>{props.viewer ? `Ideas worth following, ${props.viewer.name.split(" ")[0]}.` : "Meet the people building what’s next."}</h1></div>
          <label className="filter-select"><SlidersHorizontal size={13} /><select value={props.feedFilter} onChange={(event) => props.onFilter(event.target.value as HomeViewProps["feedFilter"])} aria-label="Filter feed"><option>For you</option><option>Following</option><option>Newest</option></select><ChevronDown size={13} /></label>
        </div>

        <section className="story-tray" aria-label="Fresh stories">
          <div className="story-tray-title"><span>Fresh from founders</span><small>Tap a company to explore</small></div>
          <div className="story-list">{startups.slice(0, 6).map((startup, index) => <button key={startup.id} onClick={() => props.onStartup(startup)}><span className={`story-ring story-${index % 4}`}><StartupLogo startup={startup} size="small" /></span><strong>{startup.name}</strong><small>{index % 3 === 0 ? "New pitch" : index % 3 === 1 ? "Milestone" : "Founder note"}</small></button>)}</div>
        </section>

        <section className="composer card">
          <div className="composer-top"><Avatar initials={props.viewer?.initials ?? "YOU"} /><button onClick={props.onCompose}>Share a milestone, question, or opportunity...</button></div>
          <div className="composer-actions">
            <button onClick={props.onCompose}><span className="action-symbol lilac"><Video size={14} /></span> Video pitch</button>
            <button onClick={props.onCompose}><span className="action-symbol mint"><ImageIcon size={14} /></span> Photo</button>
            <button onClick={props.onCompose}><span className="action-symbol amber"><Sparkles size={14} /></span> Milestone</button>
            <button className="primary-button" onClick={props.onCompose}>Post</button>
          </div>
        </section>

        {!props.posts.length && <div className="card empty-feed"><Compass size={30} /><h3>Your following feed is ready</h3><p>Follow startups from Discover to see their latest stories here.</p><button onClick={() => props.onNavigate("discover")}>Discover startups</button></div>}
        {visiblePosts.map((post) => {
          const startup = startups.find((item) => item.id === post.startupId);
          const comments = [...post.comments, ...(props.extraComments[post.id] ?? [])];
          const isOpen = props.openComments.has(post.id);
          return (
            <article className="post-card card" key={post.id}>
              <div className="post-header">
                <button className="logo-button" onClick={() => startup && props.onStartup(startup)}><span className="startup-logo logo-normal" style={{ background: post.logoColor }}>{post.logo}</span></button>
                <button className="post-author" onClick={() => startup && props.onStartup(startup)}><h3>{post.startup} <BadgeCheck size={15} />{post.ownedByViewer && <span className="owned-badge">Your post</span>}</h3><p>{post.meta}</p></button>
                {startup && <button className={`follow-button ${props.following.has(startup.id) ? "following" : ""}`} onClick={() => props.onFollow(startup.id, startup.name)}>{props.following.has(startup.id) ? <><Check size={13} /> Following</> : <><Plus size={13} /> Follow</>}</button>}
                <button className="more-button" aria-label={post.ownedByViewer ? "Delete your post" : "More options"} onClick={() => post.ownedByViewer ? props.onDelete(post) : props.onUtility("Post actions opened — reporting and sharing controls are available in the production menu")}><MoreHorizontal size={19} /></button>
              </div>
              <div className="post-copy">
                <h2>{post.headline}</h2>
                <p>{post.body}</p>
                <div className="tag-row">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </div>
              {post.mediaType === "video" && post.mediaUrl ? (
                <button className="media-wrap video-cover" onClick={() => props.onPlay(post)} aria-label={`Play ${post.startup} video: ${post.mediaTitle}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(17,29,51,.02), rgba(17,29,51,.7)), url(${post.poster})` }}>
                  <span className="large-play"><Play size={20} fill="currentColor" /></span>
                  <span className="media-copy"><span>{post.mediaLabel}</span><strong>{post.mediaTitle}</strong></span>
                  <span className="duration">{post.duration}</span>
                </button>
              ) : post.mediaType === "image" && (post.poster || post.mediaUrl) ? (
                <div className="media-wrap image-media" style={{ backgroundImage: `url(${post.poster || post.mediaUrl})` }} role="img" aria-label={post.mediaTitle}>
                  <div className="media-copy"><span>{post.mediaLabel}</span><strong>{post.mediaTitle}</strong></div>
                </div>
              ) : null}
              <div className="engagement-summary"><span><span className="reaction-stack"><Heart size={10} fill="currentColor" /><Sparkles size={10} /></span>{post.likes + (props.liked.has(post.id) ? 1 : 0)} people reacted</span><button onClick={() => props.onComments(post.id)}>{comments.length} comments</button><span>{post.shares + (props.shared[post.id] ?? 0)} shares</span></div>
              <div className="engagement-actions">
                <button className={props.liked.has(post.id) ? "engaged" : ""} onClick={() => props.onLike(post.id)}><Heart size={17} fill={props.liked.has(post.id) ? "currentColor" : "none"} /> Like</button>
                <button className={isOpen ? "engaged" : ""} onClick={() => props.onComments(post.id)}><MessageCircle size={17} /> Comment</button>
                <button onClick={() => props.onShare(post)}><Share2 size={17} /> Share</button>
                <button className={props.saved.has(post.id) ? "engaged" : ""} onClick={() => props.onSave(post.id)}><Bookmark size={17} fill={props.saved.has(post.id) ? "currentColor" : "none"} /> Save</button>
              </div>
              {isOpen && (
                <div className="comments-panel">
                  {comments.map((comment) => <div className="comment" key={comment.id}><Avatar initials={comment.initials} size="small" /><div><div className="comment-bubble"><strong>{comment.author}<small>{comment.role}</small></strong><p>{comment.body}</p></div><span>{comment.time} · Like · Reply</span></div></div>)}
                  <div className="comment-composer"><Avatar initials={props.viewer?.initials ?? "YOU"} size="small" /><input value={props.commentDrafts[post.id] ?? ""} onChange={(event) => props.onCommentDraft(post.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.onComment(post.id); }} placeholder="Add to the conversation..." /><button onClick={() => props.onComment(post.id)} aria-label="Send comment"><Send size={16} /></button></div>
                </div>
              )}
            </article>
          );
        })}
        {visibleCount < props.posts.length && <div className="load-more-wrap"><button className="load-more-button" onClick={() => setVisibleCount((current) => current + 4)}><Plus size={16} /> Show more from the community <span>{props.posts.length - visibleCount} new stories</span></button></div>}
      </section>

      <aside className="right-rail">
        <section className="card discover-card">
          <div className="section-title"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Startups to watch</h2></div><button onClick={() => props.onNavigate("discover")}>See all</button></div>
          <div className="startup-list">{startups.slice(1, 4).map((startup) => <CompactStartup key={startup.id} startup={startup} followed={props.following.has(startup.id)} onFollow={() => props.onFollow(startup.id, startup.name)} onOpen={() => props.onStartup(startup)} />)}</div>
        </section>
        <section className="card pulse-card">
          <div className="section-title"><div><span className="eyebrow">MARKET PULSE</span><h2>Trending now</h2></div></div>
          <ol>
            {[{ name: "Climate SaaS", count: "842 conversations", growth: "24%" }, { name: "Agentic AI", count: "719 conversations", growth: "18%" }, { name: "Rural commerce", count: "506 conversations", growth: "11%" }].map((trend, index) => <li key={trend.name}><span>0{index + 1}</span><div><strong>{trend.name}</strong><small>{trend.count}</small></div><b><TrendingUp size={11} /> {trend.growth}</b></li>)}
          </ol>
        </section>
        <p className="footer-links">About · Trust & safety · Help · Privacy<br />© 2026 Innovestart</p>
      </aside>
    </div>
  );
}

function SignedInProfile({ viewer, onNavigate }: { viewer: Viewer; onNavigate: (view: View) => void }) {
  return <section className="profile-card card"><div className="profile-cover" /><div className="profile-body"><Avatar initials={viewer.initials} size="large" /><h2>{viewer.name}</h2><p>{viewer.title}</p><div className="profile-stats"><div><strong>{viewer.role === "investor" ? "12" : "₹1.8Cr"}</strong><span>{viewer.role === "investor" ? "Investments" : "Annual revenue"}</span></div><div><strong>3.2k</strong><span>Followers</span></div></div><button className="secondary-button full-width" onClick={() => onNavigate("network")}>View profile</button></div></section>;
}

function JoinCard({ onAuth }: { onAuth: () => void }) {
  return <section className="join-card card"><div className="join-visual"><Logo compact /><span><Sparkles size={14} /> EARLY ACCESS</span></div><div><h2>Find the people who get it.</h2><p>Meet founders and investors who care about the problem—not just the pitch.</p><button className="primary-wide" onClick={onAuth}>Join the community <ArrowUpRight size={15} /></button><small>Free during early access</small></div></section>;
}

function CompactStartup({ startup, followed, onFollow, onOpen }: { startup: Startup; followed: boolean; onFollow: () => void; onOpen: () => void }) {
  return <div className="startup-row"><button className="logo-button" onClick={onOpen}><StartupLogo startup={startup} size="small" /></button><button className="startup-row-copy" onClick={onOpen}><strong>{startup.name}</strong><span>{startup.sector} · {startup.stage}</span><small><i className="growth-dot" /> {startup.signal}</small></button><button className={`round-follow ${followed ? "active" : ""}`} onClick={onFollow} aria-label={`${followed ? "Unfollow" : "Follow"} ${startup.name}`}>{followed ? <Check size={14} /> : <Plus size={15} />}</button></div>;
}

function DiscoverView({ following, onFollow, onStartup }: { following: Set<string>; onFollow: (id: string, name: string) => void; onStartup: (startup: Startup) => void }) {
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const [sortMode, setSortMode] = useState<"Recommended" | "Trending" | "Recently added">("Recommended");
  const filtered = startups
    .filter((startup) => (sector === "All sectors" || startup.sector === sector) && (stage === "All stages" || startup.stage === stage))
    .sort((a, b) => sortMode === "Trending" ? b.signal.localeCompare(a.signal) : sortMode === "Recently added" ? b.founded.localeCompare(a.founded) : a.name.localeCompare(b.name));
  return <div className="workspace-page"><section className="discover-hero"><div><span className="eyebrow">COMPANIES TO BELIEVE IN</span><h1>Discover builders<br />worth backing.</h1><p>Watch their stories, understand what they’ve proven, and start a thoughtful conversation when the fit feels right.</p></div><div className="hero-proof"><div><strong>126</strong><span>Startups raising</span></div><div><strong>34</strong><span>Communities</span></div><div><strong>8.7k</strong><span>Warm introductions</span></div></div></section><div className="discover-toolbar"><div>{(["Recommended", "Trending", "Recently added"] as const).map((mode) => <button key={mode} className={sortMode === mode ? "active" : ""} onClick={() => setSortMode(mode)}>{mode === "Recommended" ? <Sparkles size={15} /> : mode === "Trending" ? <TrendingUp size={15} /> : <Clock3 size={15} />}{mode}</button>)}</div><div className="filter-group"><label><select value={sector} onChange={(event) => setSector(event.target.value)}><option>All sectors</option>{Array.from(new Set(startups.map((item) => item.sector))).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label><select value={stage} onChange={(event) => setStage(event.target.value)}><option>All stages</option>{Array.from(new Set(startups.map((item) => item.stage))).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label></div></div><div className="startup-card-grid">{filtered.map((startup) => <article className="startup-card card" key={startup.id}><button className="startup-card-image" style={{ backgroundImage: `linear-gradient(180deg, rgba(27,37,64,.03), rgba(27,37,64,.7)), url(${startup.poster})` }} onClick={() => onStartup(startup)}><div><StartupLogo startup={startup} /><span>{startup.stage}</span></div><strong>{startup.tagline}</strong></button><div className="startup-card-body"><div className="startup-card-title"><button onClick={() => onStartup(startup)}><h2>{startup.name} <BadgeCheck size={16} /></h2><p><MapPin size={12} /> {startup.location} · Founded {startup.founded}</p></button><button className={`round-follow ${following.has(startup.id) ? "active" : ""}`} onClick={() => onFollow(startup.id, startup.name)}>{following.has(startup.id) ? <Check size={15} /> : <Plus size={16} />}</button></div><p>{startup.description}</p><div className="startup-metrics"><div><span>WHAT THEY’RE RAISING</span><strong>{startup.ask.replace("Raising ", "")}</strong></div><div><span>WHAT THEY’VE PROVEN</span><strong>{startup.growth}</strong></div><div><span>ONE MORE SIGNAL</span><strong>{startup.signal}</strong></div></div><div className="card-tag-row">{startup.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}</div></div>;
}

function MessagesView({ viewer, onAuth }: { viewer: Viewer | null; onAuth: () => void }) {
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const chats = [{ name: "Mira at EmberGrid", initials: "ME", preview: "Happy to share our pilot economics.", time: "12m", color: "#0f7657" }, { name: "Rhea Mehta", initials: "RM", preview: "I’ll send the intro shortly.", time: "2h", color: "#d97761" }, { name: "OrbitPay team", initials: "OP", preview: "Thursday afternoon works for us.", time: "1d", color: "#6571c7" }];
  if (!viewer) return <GatedView icon={<MessageCircle size={30} />} title="Turn interest into a conversation." body="Sign in to message founders, ask useful questions, and keep every promising connection in one place." onAuth={onAuth} />;
  const chat = chats[active];
  const send = () => { if (!draft.trim()) return; setSent((current) => [...current, draft.trim()]); setDraft(""); };
  return <div className="workspace-page"><div className="page-title-row"><div><span className="eyebrow">PRIVATE & FOCUSED</span><h1>Messages</h1><p>Founder conversations and warm introductions.</p></div><button className="primary-wide"><Plus size={15} /> New message</button></div><section className="messages-shell card"><aside className="chat-list"><div className="chat-list-head"><strong>Inbox</strong><button><Search size={16} /></button></div>{chats.map((item, index) => <button className={`chat-row ${active === index ? "active" : ""}`} key={item.name} onClick={() => setActive(index)}><Avatar initials={item.initials} color={item.color} /><span><strong>{item.name}</strong><small>{item.preview}</small></span><time>{item.time}</time></button>)}</aside><div className="conversation"><header><Avatar initials={chat.initials} color={chat.color} /><div><strong>{chat.name}</strong><span><i /> Active today</span></div><button><MoreHorizontal size={19} /></button></header><div className="message-thread"><div className="message-day">TODAY</div><div className="message incoming">Thanks for following our story. Which part of EmberGrid are you most curious about?<time>10:18 AM</time></div><div className="message outgoing">The seven paid pilots stood out. I&apos;d love to understand deployment economics and the typical payback period.<time>10:24 AM</time></div><div className="message incoming">Happy to share our pilot economics. I&apos;ve attached the sanitized cohort view for you.<div className="attachment"><LineChart size={19} /><span><strong>Pilot economics</strong><small>PDF · 2.4 MB</small></span></div><time>10:31 AM</time></div>{sent.map((item, index) => <div className="message outgoing" key={`${item}-${index}`}>{item}<time>now</time></div>)}</div><div className="message-composer"><button><Plus size={18} /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="Write a message..." /><button className="send-button" onClick={send}><Send size={17} /></button></div></div></section></div>;
}

function NetworkView({ viewer, onAuth }: { viewer: Viewer | null; onAuth: () => void }) {
  const [connected, setConnected] = useState<Set<string>>(new Set(["rhea"]));
  const [networkTab, setNetworkTab] = useState<"Suggested" | "Connections" | "Following">("Suggested");
  if (!viewer) return <GatedView icon={<Users size={30} />} title="Build a circle that opens doors." body="Sign in to follow investors, meet founders, and turn shared interests into warm introductions." onAuth={onAuth} />;
  const people = networkTab === "Connections" ? investors.filter((investor) => connected.has(investor.id)) : networkTab === "Following" ? investors.slice(0, 3) : investors;
  return <div className="workspace-page"><div className="page-title-row"><div><span className="eyebrow">PEOPLE WORTH KNOWING</span><h1>Build your circle.</h1><p>Meet people who share your curiosity, sector interests, and ambition.</p></div><div className="network-tabs">{(["Suggested", "Connections", "Following"] as const).map((tab) => <button key={tab} className={networkTab === tab ? "active" : ""} onClick={() => setNetworkTab(tab)}>{tab}{tab !== "Suggested" && <b>{tab === "Connections" ? connected.size : 3}</b>}</button>)}</div></div><div className="network-grid">{people.map((investor) => <article className="person-card card" key={investor.id}><div className="person-cover" style={{ background: `linear-gradient(135deg, ${investor.color}22, ${investor.color}66)` }} /><Avatar initials={investor.initials} color={investor.color} size="large" /><h2>{investor.name}</h2><p>{investor.role}</p><span className="thesis-label">CURIOUS ABOUT</span><strong className="thesis">{investor.thesis}</strong><div className="person-stat"><BriefcaseBusiness size={15} /><span><strong>{investor.portfolio}</strong> companies supported</span></div><button className={connected.has(investor.id) ? "connected-button" : "connect-button"} onClick={() => setConnected((current) => { const next = new Set(current); if (next.has(investor.id)) next.delete(investor.id); else next.add(investor.id); return next; })}>{connected.has(investor.id) ? <><Check size={15} /> Connected</> : <><UserPlus size={15} /> Connect</>}</button></article>)}</div>{!people.length && <div className="card empty-feed"><Users size={30} /><h3>Your next connection is one click away</h3><p>Explore suggested investors and founders to start building your circle.</p></div>}</div>;
}

function GatedView({ icon, title, body, onAuth }: { icon: React.ReactNode; title: string; body: string; onAuth: () => void }) {
  return <div className="gated-page"><div className="gated-glow" /><section className="gated-card card"><div className="gated-icon">{icon}</div><span className="eyebrow">MEMBERS ONLY</span><h1>{title}</h1><p>{body}</p><button className="google-button" onClick={onAuth}><Mail size={16} /> Sign in with email</button><small>Real member accounts are free during early access.</small></section></div>;
}

function AuthModal({ role, setRole, initialMode, onClose, onAuthenticated }: { role: Role; setRole: (role: Role) => void; initialMode: AuthMode; onClose: () => void; onAuthenticated: () => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "signup") {
        window.localStorage.setItem("innovestart-pending-role", role);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim(), role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) await onAuthenticated();
        else setMessage("Account created. Check your inbox and click the verification link, then sign in here.");
      } else if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        await onAuthenticated();
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?reset=1`,
        });
        if (resetError) throw resetError;
        setMessage("Password reset email sent. Open the link in that email to choose a new password.");
      } else {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("Your password has been updated securely.");
        window.history.replaceState({}, "", window.location.pathname);
        await onAuthenticated();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === "signup" ? "Create your account." : mode === "forgot" ? "Reset your password." : mode === "reset" ? "Choose a new password." : "Welcome back.";
  const intro = mode === "signup" ? "Join founders and investors building what comes next." : mode === "forgot" ? "We’ll email you a secure recovery link." : mode === "reset" ? "Use at least eight characters for your new password." : "Sign in to post, upload, comment, and connect.";

  return <Modal onClose={onClose} wide><div className="auth-layout"><section className="auth-story"><Logo /><span className="auth-kicker"><Sparkles size={14} /> FOUNDERS × INVESTORS</span><h2>The right idea<br />deserves the<br /><em>right room.</em></h2><p>Watch the story. Ask a better question. Meet the person who can help move it forward.</p><div className="auth-proof"><div className="proof-avatars"><Avatar initials="RM" color="#ff8064" size="small" /><Avatar initials="KS" color="#4f6ff3" size="small" /><Avatar initials="LI" color="#31b782" size="small" /></div><div><strong>Secure Supabase identity</strong><span>Your posts and uploads stay attached to you</span></div></div></section><section className="auth-form"><span className="auth-step">WELCOME TO INNOVESTART</span><h1>{heading}</h1><p>{intro}</p>{mode !== "forgot" && mode !== "reset" && <div className="auth-mode-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Sign in</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Create account</button></div>}{mode === "signup" && <div className="role-switch auth-role-switch"><button type="button" className={role === "investor" ? "active" : ""} onClick={() => setRole("investor")}><CircleDollarSign size={19} /><span><strong>I&apos;m an investor</strong><small>Discover & connect</small></span>{role === "investor" && <Check size={15} />}</button><button type="button" className={role === "founder" ? "active" : ""} onClick={() => setRole("founder")}><Rocket size={19} /><span><strong>I&apos;m a founder</strong><small>Share & grow</small></span>{role === "founder" && <Check size={15} />}</button></div>}<form className="auth-email-form" onSubmit={submit}>{mode === "signup" && <label className="auth-field"><span>Your name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder="Adyanta Dubey" required maxLength={80} /></label>}{mode !== "reset" && <label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" required /></label>}{mode !== "forgot" && <label className="auth-field"><span>{mode === "reset" ? "New password" : "Password"}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" required minLength={8} /></label>}{error && <p className="auth-alert auth-error" role="alert">{error}</p>}{message && <p className="auth-alert auth-message" role="status"><BadgeCheck size={15} />{message}</p>}<button className="primary-wide auth-submit" disabled={busy || (mode === "signup" && !displayName.trim())}>{busy ? "Please wait…" : mode === "signup" ? "Create my account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in securely"}</button></form>{mode === "signin" && <button className="auth-link-button" onClick={() => switchMode("forgot")}>Forgot your password?</button>}{(mode === "forgot" || mode === "reset") && <button className="auth-link-button" onClick={() => switchMode("signin")}>Back to sign in</button>}<div className="demo-note secure-note"><BadgeCheck size={14} /><span><strong>Protected by Supabase Auth</strong> Passwords are hashed and never stored by Innovestart.</span></div><p className="auth-terms">By continuing, you agree to our Terms and Privacy Policy.</p></section></div></Modal>;
}

function ProfileModal({ viewer, required, onClose, onSave }: { viewer: Viewer; required: boolean; onClose: () => void; onSave: (draft: ProfileDraft) => Promise<boolean> }) {
  const [displayName, setDisplayName] = useState(viewer.name);
  const [role, setRole] = useState<Role>(viewer.role);
  const [headline, setHeadline] = useState(viewer.headline);
  const [company, setCompany] = useState(viewer.company);
  const [bio, setBio] = useState(viewer.bio);
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); await onSave({ displayName, role, headline, company, bio }); setSaving(false); };
  return <Modal onClose={onClose}><div className="profile-editor"><span className="eyebrow">{required ? "ONE LAST STEP" : "YOUR MEMBER PROFILE"}</span><h2>{required ? "Tell the community who you are." : "Keep your profile current."}</h2><p>Your verified email is <strong>{viewer.email}</strong>. It stays private unless you choose to share it.</p><div className="role-switch compact"><button className={role === "founder" ? "active" : ""} onClick={() => setRole("founder")}><Rocket size={18} /><span><strong>Founder</strong><small>Share a startup</small></span>{role === "founder" && <Check size={15} />}</button><button className={role === "investor" ? "active" : ""} onClick={() => setRole("investor")}><CircleDollarSign size={18} /><span><strong>Investor</strong><small>Discover companies</small></span>{role === "investor" && <Check size={15} />}</button></div><label><span>Your name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} /></label><label><span>{role === "founder" ? "Startup or company" : "Fund or organization"}</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder={role === "founder" ? "e.g. EmberGrid" : "e.g. Northstar Ventures"} maxLength={100} /></label><label><span>Headline</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder={role === "founder" ? "Founder building cleaner industrial heat" : "Seed investor in climate and hard tech"} maxLength={120} /></label><label><span>About you</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What are you building, backing, or hoping to meet people around?" rows={4} maxLength={600} /></label><button className="primary-wide" disabled={saving || !displayName.trim()} onClick={save}>{saving ? "Saving…" : required ? "Create my profile" : "Save profile"}</button></div></Modal>;
}

function ComposerModal({ viewer, onClose, onSubmit }: { viewer: Viewer; onClose: () => void; onSubmit: (draft: PostDraft) => Promise<boolean> }) {
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [media, setMedia] = useState<UploadedAsset | undefined>();
  const [preview, setPreview] = useState("");
  const [previewType, setPreviewType] = useState<"video" | "image">("image");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [publishing, setPublishing] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPreviewType(file.type.startsWith("video/") ? "video" : "image");
    setUploadError("");
    setUploading(true);
    setUploadProgress(0);
    let uploadId = "";
    try {
      const startResponse = await authenticatedFetch("/api/uploads?action=start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }) });
      const startPayload = await startResponse.json() as { upload?: { id: string; chunkSize: number }; error?: string };
      if (!startResponse.ok || !startPayload.upload) throw new Error(startPayload.error || "Unable to start the upload.");
      uploadId = startPayload.upload.id;
      const chunkSize = startPayload.upload.chunkSize;
      const accessToken = await getSupabaseAccessToken();
      for (let offset = 0, part = 0; offset < file.size; offset += chunkSize, part += 1) {
        const chunk = file.slice(offset, Math.min(file.size, offset + chunkSize));
        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("PUT", `/api/uploads?id=${encodeURIComponent(uploadId)}&part=${part}`);
          request.setRequestHeader("content-type", "application/octet-stream");
          if (accessToken) request.setRequestHeader("authorization", `Bearer ${accessToken}`);
          request.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.min(99, Math.round(((offset + event.loaded) / file.size) * 100))); };
          request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("A file part could not be uploaded."));
          request.onerror = () => reject(new Error("The upload was interrupted. Please try again."));
          request.send(chunk);
        });
      }
      const completeResponse = await authenticatedFetch(`/api/uploads?action=complete&id=${encodeURIComponent(uploadId)}`, { method: "POST" });
      const completePayload = await completeResponse.json() as { asset?: UploadedAsset; error?: string };
      if (!completeResponse.ok || !completePayload.asset) throw new Error(completePayload.error || "Unable to finish the upload.");
      setMedia(completePayload.asset);
      setUploadProgress(100);
    } catch (error) {
      if (uploadId) authenticatedFetch(`/api/uploads?id=${encodeURIComponent(uploadId)}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const discardMedia = () => {
    if (media) authenticatedFetch(`/api/uploads?id=${encodeURIComponent(media.id)}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
    if (preview) URL.revokeObjectURL(preview);
    setMedia(undefined); setPreview(""); setPreviewType("image"); setUploadProgress(0); setUploadError("");
  };
  const close = () => { discardMedia(); onClose(); };
  const publish = async () => { setPublishing(true); const done = await onSubmit({ headline: headline.trim(), body: body.trim(), tags, media }); if (!done) setPublishing(false); };
  return <Modal onClose={close}><div className="compose-modal"><div className="compose-title"><Avatar initials={viewer.initials} /><div><h2>Create a post</h2><p>Posting as {viewer.company || viewer.name} · owned by your account</p></div></div><label><span>Headline</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="What should the network know?" /></label><label><span>Your update</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share the story, the milestone, or the question behind it..." rows={6} maxLength={1500} /></label><label><span>Topics</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="AI, SeedRound, Product" /></label>{preview && <div className="upload-preview">{previewType === "video" ? <video src={preview} controls muted /> : <img src={preview} alt="Upload preview" />}<button onClick={discardMedia} aria-label="Remove uploaded media"><X size={15} /></button>{uploading && <div className="upload-overlay"><strong>{uploadProgress}%</strong><span>Uploading securely…</span></div>}</div>}{uploadError && <p className="upload-error">{uploadError}</p>}<div className="compose-tools"><label><Video size={16} /> Add video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => upload(event.target.files?.[0])} /></label><label><ImageIcon size={16} /> Add image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])} /></label>{media && <span className="upload-ready"><Check size={14} /> {media.fileName}</span>}</div>{uploading && <div className="upload-progress" aria-label={`Upload ${uploadProgress}% complete`}><span style={{ width: `${uploadProgress}%` }} /></div>}<div className="compose-footer"><span>{body.length}/1,500</span><button className="primary-wide" disabled={uploading || publishing || !headline.trim() || !body.trim()} onClick={publish}>{publishing ? "Publishing…" : uploading ? `Uploading ${uploadProgress}%` : <>Publish post <Send size={15} /></>}</button></div></div></Modal>;
}

function VideoModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return <Modal onClose={onClose} wide><div className="video-modal"><div className="video-modal-player"><video key={post.mediaUrl} controls autoPlay playsInline preload="auto" poster={post.poster} aria-label={`${post.startup}: ${post.mediaTitle}`}><source src={post.mediaUrl} type="video/mp4" />Your browser does not support MP4 video playback.</video></div><div className="video-modal-copy"><span className="video-now"><i /> NOW PLAYING · {post.duration}</span><h2>{post.mediaTitle}</h2><p>{post.headline}</p><div><span className="startup-logo logo-small" style={{ background: post.logoColor }}>{post.logo}</span><span><strong>{post.startup}</strong><small>{post.meta.split(" · ").slice(0, 2).join(" · ")}</small></span></div></div></div></Modal>;
}

function StartupModal({ startup, followed, onClose, onFollow, onMessage }: { startup: Startup; followed: boolean; onClose: () => void; onFollow: () => void; onMessage: () => void }) {
  return <Modal onClose={onClose} wide><div className="startup-detail"><div className="startup-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(6,30,21,.92), rgba(6,30,21,.3)), url(${startup.poster})` }}><StartupLogo startup={startup} size="large" /><span>{startup.sector} · {startup.stage}</span><h1>{startup.name}</h1><p>{startup.tagline}</p></div><div className="startup-detail-body"><div className="detail-main"><div className="detail-tags">{startup.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h2>Why now</h2><p>{startup.description}</p><div className="founder-note"><span className="quote-mark">“</span><p>We spent eighteen months inside customer operations before writing the first line of product. The problem is urgent, measurable, and ready for a different approach.</p><div><Avatar initials={startup.initials + "F"} color={startup.color} size="small" /><span><strong>{startup.name} founding team</strong><small>Verified founder profile</small></span></div></div></div><aside className="detail-sidebar"><div className="detail-metrics"><div><Target size={17} /><span>Current round</span><strong>{startup.ask}</strong></div><div><LineChart size={17} /><span>Traction</span><strong>{startup.growth}</strong></div><div><Users size={17} /><span>Team</span><strong>{startup.team}</strong></div><div><CalendarDays size={17} /><span>Founded</span><strong>{startup.founded}</strong></div></div><button className="primary-wide" onClick={onMessage}><Mail size={15} /> Request introduction</button><button className="secondary-button full-width" onClick={onFollow}>{followed ? <><Check size={15} /> Following</> : <><Plus size={15} /> Follow startup</>}</button><small className="verified-note"><BadgeCheck size={14} /> Identity and traction verified by Innovestart</small></aside></div></div></Modal>;
}
