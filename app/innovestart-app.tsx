"use client";

/* eslint-disable jsx-a11y/media-has-caption */

import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CalendarCheck,
  Camera,
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
  Mic,
  MicOff,
  MoreHorizontal,
  Play,
  Phone,
  PhoneOff,
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
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { freshStartups, initialPosts, investors, Post, startups, videoPosts, type CommentItem, type Investor, type Startup } from "./synthetic-data";
import { authenticatedFetch, getSupabaseAccessToken, supabase } from "./supabase-client";

type View = "home" | "reels" | "discover" | "messages" | "network";
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
  avatarColor: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  portfolioStartupIds: string[];
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
  avatarColor: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  portfolioStartupIds: string[];
  onboardingComplete: boolean;
};
type UploadedAsset = { id: string; url: string; fileName: string; contentType: string; mediaType: "video" | "image"; sizeBytes: number };
type PostDraft = { headline: string; body: string; tags: string; media?: UploadedAsset };
type ProfileDraft = { displayName: string; role: Role; headline: string; company: string; bio: string; sectors: string[]; stages: string[]; locations: string[] };
type AuthMode = "signin" | "signup" | "forgot" | "reset";
type CallPayload = { id: string; callerProfileId: string; calleeProfileId: string; callerName?: string; callerColor?: string; conversationId?: string; mode: "voice" | "video"; status: "ringing" | "active" | "declined" | "ended"; offer?: RTCSessionDescriptionInit | null; answer?: RTCSessionDescriptionInit | null };

function viewerFromProfile(profile: ProfilePayload): Viewer {
  const initials = profile.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";
  const fallback = profile.role === "founder" ? (profile.company ? `Founder · ${profile.company}` : "Startup founder") : (profile.company ? `Investor · ${profile.company}` : "Startup investor");
  return { id: profile.id, email: profile.email, name: profile.displayName, initials, title: profile.headline || fallback, role: profile.role, headline: profile.headline, company: profile.company, bio: profile.bio, avatarColor: profile.avatarColor, sectors: profile.sectors, stages: profile.stages, locations: profile.locations, portfolioStartupIds: profile.portfolioStartupIds, onboardingComplete: profile.onboardingComplete };
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

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";
const relativeTimeLabel = (timestamp: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1_440)}d`;
};

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
    if (feedFilter === "Newest") return [...posts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return posts;
  }, [feedFilter, following, posts]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu((current) => !current)}><Menu size={20} /></button>
        <button className="logo-button" onClick={() => goTo("home")} aria-label="Innovestart home"><Logo /></button>
        <nav className={`main-nav ${mobileMenu ? "mobile-open" : ""}`} aria-label="Primary navigation">
          <NavButton active={view === "home"} icon={<Home />} label="Home" onClick={() => goTo("home")} />
          <NavButton active={view === "reels"} icon={<Play />} label="Reels" onClick={() => goTo("reels")} />
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
          onDelete={deletePost}
          onUtility={setToast}
          onNavigate={goTo}
        />
      )}
      {view === "reels" && <ReelsView posts={videoPosts} liked={liked} saved={saved} onLike={toggleLike} onSave={toggleSave} onShare={sharePost} onStartup={setSelectedStartup} />}
      {view === "discover" && <DiscoverView following={following} onFollow={toggleFollow} onStartup={setSelectedStartup} />}
      {view === "messages" && <MessagesView viewer={viewer} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} />}
      {view === "network" && <NetworkView viewer={viewer} onAuth={() => { setAuthMode("signin"); setAuthOpen(true); }} onMessage={(profileId) => { window.localStorage.setItem("innovestart-message-recipient", profileId); goTo("messages"); }} />}

      {authOpen && <AuthModal key={authMode} role={role} setRole={setRole} initialMode={authMode} onClose={() => setAuthOpen(false)} onAuthenticated={authenticated} />}
      {profileOpen && viewer && <ProfileModal viewer={viewer} required={!viewer.onboardingComplete} onClose={() => viewer.onboardingComplete && setProfileOpen(false)} onSave={saveProfile} />}
      {composerOpen && viewer && <ComposerModal viewer={viewer} onClose={() => setComposerOpen(false)} onSubmit={submitPost} />}
      {selectedStartup && <StartupModal startup={selectedStartup} followed={following.has(selectedStartup.id)} onClose={() => setSelectedStartup(null)} onFollow={() => toggleFollow(selectedStartup.id, selectedStartup.name)} onMessage={() => { if (requireAuth()) { setSelectedStartup(null); goTo("messages"); setToast(`Conversation with ${selectedStartup.name} opened`); } }} />}
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
          <div className="story-list">{freshStartups.slice(0, 10).map((startup, index) => <button key={startup.id} onClick={() => props.onStartup(startup)}><span className={`story-ring story-${index % 4}`}><StartupLogo startup={startup} size="small" /></span><strong>{startup.name}</strong><small>{index % 3 === 0 ? "New pitch" : index % 3 === 1 ? "Milestone" : "Founder note"}</small></button>)}</div>
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
                <div className="media-wrap inline-video">
                  <video controls playsInline preload="metadata" poster={post.poster} aria-label={`${post.startup}: ${post.mediaTitle}`}><source src={post.mediaUrl} type="video/mp4" /></video>
                  <span className="media-copy"><span>{post.mediaLabel}</span><strong>{post.mediaTitle}</strong></span>
                  <span className="duration">{post.duration}</span>
                </div>
              ) : post.mediaType === "image" && (post.poster || post.mediaUrl) ? (
                <div className="media-wrap image-media" style={{ backgroundImage: `url(${post.poster || post.mediaUrl})` }} role="img" aria-label={post.mediaTitle}>
                  <div className="media-copy"><span>{post.mediaLabel}</span><strong>{post.mediaTitle}</strong></div>
                </div>
              ) : null}
              {post.sourceLabel && <div className="media-provenance">{post.sourceUrl ? <a href={post.sourceUrl} target="_blank" rel="noreferrer">{post.sourceLabel}</a> : post.sourceLabel}</div>}
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

function ReelsView({ posts, liked, saved, onLike, onSave, onShare, onStartup }: { posts: Post[]; liked: Set<string>; saved: Set<string>; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (post: Post) => void; onStartup: (startup: Startup) => void }) {
  return <div className="reels-page"><header className="reels-header"><div><span className="eyebrow">30 FOUNDER STORIES</span><h1>Watch the story,<br />not just the pitch.</h1></div><p>Scroll vertically through startup introductions. Videos play in place, with the company context kept close.</p></header><section className="reels-stream" aria-label="Startup reels">{posts.map((post, index) => { const startup = startups.find((item) => item.id === post.startupId); return <article className="reel-card" key={post.id}><video controls playsInline preload={index < 2 ? "metadata" : "none"} poster={post.poster} aria-label={`${post.startup}: ${post.mediaTitle}`}><source src={post.mediaUrl} type="video/mp4" /></video><div className="reel-shade" /><div className="reel-copy"><button onClick={() => startup && onStartup(startup)}><span className="startup-logo logo-small" style={{ background: post.logoColor }}>{post.logo}</span><span><strong>{post.startup} <BadgeCheck size={14} /></strong><small>{post.meta.split(" · ").slice(0, 2).join(" · ")}</small></span></button><h2>{post.mediaTitle}</h2><p>{post.body}</p><div>{post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><small>{post.sourceLabel}</small></div><aside className="reel-actions"><button className={liked.has(post.id) ? "active" : ""} onClick={() => onLike(post.id)}><Heart size={21} fill={liked.has(post.id) ? "currentColor" : "none"} /><span>{post.likes + (liked.has(post.id) ? 1 : 0)}</span></button><button onClick={() => onShare(post)}><Share2 size={21} /><span>Share</span></button><button className={saved.has(post.id) ? "active" : ""} onClick={() => onSave(post.id)}><Bookmark size={21} fill={saved.has(post.id) ? "currentColor" : "none"} /><span>Save</span></button></aside><span className="reel-count">{String(index + 1).padStart(2, "0")} / 30</span></article>; })}</section></div>;
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
  type Contact = { id: string; name: string; role: Role; headline: string; company: string; color: string; sectors?: string[]; stages?: string[]; locations?: string[] };
  type Conversation = { id: string; inboxTier: "primary" | "secondary" | "request"; lastMessageAt: number; other: Contact; preview: string; unreadCount: number };
  type MessageItem = { id: string; senderProfileId: string; recipientProfileId: string; senderName: string; body: string; createdAt: number };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [target, setTarget] = useState<Contact | null>(null);
  const [tier, setTier] = useState<"primary" | "secondary" | "request">("primary");
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading conversations…");
  const [meetingInvestor, setMeetingInvestor] = useState<Investor | null>(null);
  const [call, setCall] = useState<{ target: Contact; mode: "voice" | "video"; incomingCall?: CallPayload } | null>(null);
  const loadInbox = useCallback(async () => {
    const response = await authenticatedFetch("/api/messages");
    if (!response.ok) return;
    const payload = await response.json() as { conversations?: Conversation[]; contacts?: Contact[] };
    setConversations(payload.conversations ?? []); setContacts(payload.contacts ?? []); setStatus(payload.conversations?.length ? "" : "Start a focused founder–investor conversation.");
  }, []);
  const loadThread = useCallback(async (id: string) => {
    const response = await authenticatedFetch(`/api/messages?conversationId=${encodeURIComponent(id)}`);
    if (!response.ok) return;
    const payload = await response.json() as { messages?: MessageItem[] };
    setMessages(payload.messages ?? []);
  }, []);
  useEffect(() => {
    if (!viewer) return;
    const kickoff = window.setTimeout(loadInbox, 0);
    const timer = window.setInterval(loadInbox, 10_000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(timer); };
  }, [loadInbox, viewer]);
  useEffect(() => { if (!activeId) return; const kickoff = window.setTimeout(() => loadThread(activeId), 0); return () => window.clearTimeout(kickoff); }, [activeId, loadThread]);
  useEffect(() => {
    if (!viewer || !contacts.length) return;
    const pending = window.localStorage.getItem("innovestart-message-recipient");
    const contact = contacts.find((item) => item.id === pending);
    if (!contact) return;
    const kickoff = window.setTimeout(() => { setTarget(contact); setComposing(false); setMessages([]); window.localStorage.removeItem("innovestart-message-recipient"); const existing = conversations.find((item) => item.other.id === contact.id); setActiveId(existing?.id ?? ""); }, 0);
    return () => window.clearTimeout(kickoff);
  }, [contacts, conversations, viewer]);
  useEffect(() => {
    if (!viewer) return;
    const poll = async () => {
      const response = await authenticatedFetch("/api/calls"); if (!response.ok) return;
      const payload = await response.json() as { incoming?: CallPayload | null };
      if (payload.incoming && !call) {
        const caller = contacts.find((item) => item.id === payload.incoming?.callerProfileId);
        if (caller) setCall({ target: caller, mode: payload.incoming.mode, incomingCall: payload.incoming });
      }
    };
    poll(); const timer = window.setInterval(poll, 5_000); return () => window.clearInterval(timer);
  }, [call, contacts, viewer]);
  if (!viewer) return <GatedView icon={<MessageCircle size={30} />} title="Turn interest into a conversation." body="Sign in to message founders, ask useful questions, and keep every promising connection in one place." onAuth={onAuth} />;
  const filteredConversations = conversations.filter((item) => item.inboxTier === tier);
  const activeConversation = conversations.find((item) => item.id === activeId);
  const activeContact = target ?? activeConversation?.other ?? null;
  const send = async () => {
    if (!draft.trim() || !activeContact) return;
    const body = draft.trim(); setDraft("");
    const response = await authenticatedFetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: activeId || undefined, recipientProfileId: activeContact.id, body }) });
    const payload = await response.json() as { message?: MessageItem & { conversationId: string }; error?: string; inboxTier?: string };
    if (!response.ok || !payload.message) { setStatus(payload.error || "Unable to send the message."); setDraft(body); return; }
    setMessages((current) => [...current, payload.message!]); setActiveId(payload.message.conversationId); setTarget(activeContact); setStatus(`Delivered to ${payload.inboxTier ?? "primary"} inbox`); await loadInbox();
  };
  const availableContacts = contacts.filter((item) => item.role !== viewer.role && `${item.name} ${item.company} ${item.headline}`.toLowerCase().includes(query.toLowerCase()));
  const investorFor = activeContact?.role === "investor" ? investors.find((item) => item.profileId === activeContact.id) ?? null : null;
  return <div className="workspace-page"><div className="page-title-row"><div><span className="eyebrow">PRIVATE & FOCUSED</span><h1>Messages</h1><p>Real two-way conversations, protected by relevance-aware routing.</p></div><button className="primary-wide" onClick={() => setComposing(true)}><Plus size={15} /> New message</button></div><section className="messages-shell card"><aside className="chat-list"><div className="inbox-tier-tabs">{(["primary", "secondary", "request"] as const).map((item) => <button key={item} className={tier === item ? "active" : ""} onClick={() => setTier(item)}>{item === "request" ? "Requests" : `${item[0].toUpperCase()}${item.slice(1)}`}<b>{conversations.filter((chat) => chat.inboxTier === item).length}</b></button>)}</div><div className="chat-list-head"><strong>Inbox</strong><button onClick={() => setComposing(true)}><Search size={16} /></button></div>{filteredConversations.map((item) => <button className={`chat-row ${activeId === item.id ? "active" : ""}`} key={item.id} onClick={() => { setActiveId(item.id); setTarget(item.other); }}><Avatar initials={initials(item.other.name)} color={item.other.color} /><span><strong>{item.other.name}</strong><small>{item.preview}</small></span><time>{relativeTimeLabel(item.lastMessageAt)}{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</time></button>)}{!filteredConversations.length && <p className="empty-inbox">No {tier} conversations yet.</p>}</aside><div className="conversation">{activeContact ? <><header><Avatar initials={initials(activeContact.name)} color={activeContact.color} /><div><strong>{activeContact.name}</strong><span><i /> {activeContact.headline || activeContact.company}</span></div><div className="call-actions"><button aria-label="Start voice call" onClick={() => setCall({ target: activeContact, mode: "voice" })}><Phone size={17} /></button><button aria-label="Start video call" onClick={() => setCall({ target: activeContact, mode: "video" })}><Camera size={18} /></button>{investorFor && <button aria-label="Schedule meeting" onClick={() => setMeetingInvestor(investorFor)}><CalendarDays size={18} /></button>}</div></header><div className="message-thread">{messages.length > 0 && <div className="message-day">PRIVATE THREAD</div>}{messages.map((item) => <div className={`message ${item.senderProfileId === viewer.id ? "outgoing" : "incoming"}`} key={item.id}>{item.body}<time>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(item.createdAt)}</time></div>)}{!messages.length && <div className="conversation-empty"><MessageCircle size={30} /><h3>Start with context.</h3><p>Explain why the company or thesis is relevant. The inbox router will place the first message automatically.</p></div>}</div><div className="message-delivery-note">{status}</div><div className="message-composer"><button><Plus size={18} /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder={`Message ${activeContact.name}…`} /><button className="send-button" onClick={send}><Send size={17} /></button></div></> : <div className="conversation-empty full"><MessageCircle size={34} /><h3>Select a conversation</h3><p>Or start a new founder–investor introduction.</p></div>}</div></section>{composing && <div className="new-message-popover card"><div><strong>New conversation</strong><button onClick={() => setComposing(false)}><X size={16} /></button></div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${viewer.role === "founder" ? "investors" : "startups"}…`} /></label><div>{availableContacts.slice(0, 30).map((contact) => <button key={contact.id} onClick={() => { setTarget(contact); setMessages([]); setActiveId(conversations.find((item) => item.other.id === contact.id)?.id ?? ""); setComposing(false); }}><Avatar initials={initials(contact.name)} color={contact.color} /><span><strong>{contact.name}</strong><small>{contact.headline || contact.company}</small></span><ArrowUpRight size={15} /></button>)}</div></div>}{meetingInvestor && <ScheduleMeetingModal investor={meetingInvestor} conversationId={activeId} onClose={() => setMeetingInvestor(null)} />}{call && <CallModal target={call.target} mode={call.mode} incomingCall={call.incomingCall} conversationId={activeId} onClose={() => setCall(null)} />}</div>;
}

function CallModal({ target, mode, incomingCall, conversationId, onClose }: { target: { id: string; name: string; color: string }; mode: "voice" | "video"; incomingCall?: CallPayload; conversationId?: string; onClose: () => void }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const callId = useRef(incomingCall?.id ?? "");
  const processedCandidates = useRef(new Set<string>());
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const [state, setState] = useState(incomingCall ? `${target.name} is calling…` : `Ready to call ${target.name}`);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(mode === "voice");

  const postSignal = useCallback(async (payload: Record<string, unknown>) => {
    return authenticatedFetch("/api/calls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  }, []);

  const begin = async () => {
    try {
      setState("Requesting camera and microphone…");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      stream.current = media;
      if (localVideo.current) localVideo.current.srcObject = media;
      const connection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peer.current = connection;
      media.getTracks().forEach((track) => connection.addTrack(track, media));
      connection.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; setState(`Connected with ${target.name}`); };
      connection.onconnectionstatechange = () => { if (connection.connectionState === "connected") setState(`Connected with ${target.name}`); if (["failed", "disconnected"].includes(connection.connectionState)) setState("Connection interrupted"); };
      connection.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidate = event.candidate.toJSON();
        if (callId.current) postSignal({ action: "candidate", callId: callId.current, candidate }); else pendingCandidates.current.push(candidate);
      };

      if (incomingCall?.offer) {
        await connection.setRemoteDescription(incomingCall.offer);
        const answer = await connection.createAnswer(); await connection.setLocalDescription(answer);
        await postSignal({ action: "answer", callId: incomingCall.id, description: answer });
        setState(`Connecting with ${target.name}…`);
      } else {
        const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
        const response = await postSignal({ action: "start", calleeProfileId: target.id, conversationId, mode, description: offer });
        const payload = await response.json() as { callId?: string; error?: string };
        if (!response.ok || !payload.callId) throw new Error(payload.error || "Unable to start the call.");
        callId.current = payload.callId;
        await Promise.all(pendingCandidates.current.map((candidate) => postSignal({ action: "candidate", callId: callId.current, candidate })));
        pendingCandidates.current = [];
        setState(`Calling ${target.name}…`);
      }
      setStarted(true);
    } catch (error) {
      setState(error instanceof Error ? error.message : "Camera or microphone access was not available.");
    }
  };

  useEffect(() => {
    if (!started || !callId.current) return;
    const poll = window.setInterval(async () => {
      const response = await authenticatedFetch(`/api/calls?callId=${encodeURIComponent(callId.current)}`);
      if (!response.ok || !peer.current) return;
      const payload = await response.json() as { call?: CallPayload; candidates?: Array<{ id: string; candidate: RTCIceCandidateInit }> };
      if (payload.call?.status === "declined") setState(`${target.name} declined the call`);
      if (payload.call?.status === "ended") setState("Call ended");
      if (payload.call?.answer && !peer.current.remoteDescription) await peer.current.setRemoteDescription(payload.call.answer);
      for (const item of payload.candidates ?? []) if (!processedCandidates.current.has(item.id)) { processedCandidates.current.add(item.id); await peer.current.addIceCandidate(item.candidate).catch(() => undefined); }
    }, 1_500);
    return () => window.clearInterval(poll);
  }, [started, target.name]);

  const finish = async (status: "declined" | "ended" = "ended") => {
    if (callId.current) await postSignal({ action: "status", callId: callId.current, status }).catch(() => undefined);
    stream.current?.getTracks().forEach((track) => track.stop()); peer.current?.close(); onClose();
  };
  const toggleMute = () => { stream.current?.getAudioTracks().forEach((track) => { track.enabled = muted; }); setMuted((current) => !current); };
  const toggleCamera = () => { stream.current?.getVideoTracks().forEach((track) => { track.enabled = cameraOff; }); setCameraOff((current) => !current); };
  return <div className="call-overlay"><section className={`call-panel ${mode}`}><div className="call-remote"><video ref={remoteVideo} autoPlay playsInline /><div className="call-identity"><Avatar initials={initials(target.name)} color={target.color} size="large" /><h2>{target.name}</h2><p>{state}</p></div></div><video className="call-local" ref={localVideo} autoPlay playsInline muted /><div className="call-controls">{!started ? <>{incomingCall && <button className="decline" onClick={() => finish("declined")}><PhoneOff size={20} /></button>}<button className="accept" onClick={begin}>{incomingCall ? <Phone size={20} /> : mode === "video" ? <Camera size={20} /> : <Phone size={20} />}<span>{incomingCall ? "Accept" : "Start"}</span></button></> : <><button className={muted ? "off" : ""} onClick={toggleMute}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>{mode === "video" && <button className={cameraOff ? "off" : ""} onClick={toggleCamera}>{cameraOff ? <VideoOff size={20} /> : <Video size={20} />}</button>}<button className="decline" onClick={() => finish()}><PhoneOff size={21} /></button></>}</div><small>Beta peer-to-peer call · camera and microphone stay in your browser</small></section></div>;
}

function NetworkView({ viewer, onAuth, onMessage }: { viewer: Viewer | null; onAuth: () => void; onMessage: (profileId: string) => void }) {
  const [connected, setConnected] = useState<Set<string>>(new Set(["rhea"]));
  const [networkTab, setNetworkTab] = useState<"Suggested" | "Connections" | "Following">("Suggested");
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All rounds");
  const [location, setLocation] = useState("All locations");
  const [selected, setSelected] = useState<Investor | null>(null);
  if (!viewer) return <GatedView icon={<Users size={30} />} title="Build a circle that opens doors." body="Sign in to follow investors, meet founders, and turn shared interests into warm introductions." onAuth={onAuth} />;
  const base = networkTab === "Connections" ? investors.filter((investor) => connected.has(investor.id)) : networkTab === "Following" ? investors.slice(0, 6) : investors;
  const people = base.filter((investor) => (sector === "All sectors" || investor.sectors.includes(sector)) && (stage === "All rounds" || investor.stages.includes(stage)) && (location === "All locations" || investor.locations.includes(location)));
  const toggleConnection = (id: string) => setConnected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <div className="workspace-page"><div className="page-title-row"><div><span className="eyebrow">PEOPLE WORTH KNOWING</span><h1>Find your investor fit.</h1><p>Filter by sector, fundraising round, and geography—then inspect the actual portfolio and thesis.</p></div><div className="network-tabs">{(["Suggested", "Connections", "Following"] as const).map((tab) => <button key={tab} className={networkTab === tab ? "active" : ""} onClick={() => setNetworkTab(tab)}>{tab}{tab !== "Suggested" && <b>{tab === "Connections" ? connected.size : 6}</b>}</button>)}</div></div><section className="network-filter-bar card"><label><span>Startup area</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option>All sectors</option>{Array.from(new Set(startups.map((item) => item.sector))).map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Raising round</span><select value={stage} onChange={(event) => setStage(event.target.value)}><option>All rounds</option>{Array.from(new Set(startups.map((item) => item.stage))).map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Geography</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option>{Array.from(new Set(startups.map((item) => item.location))).sort().map((item) => <option key={item}>{item}</option>)}</select></label><strong>{people.length} matches</strong></section><div className="network-grid">{people.map((investor) => <article className="person-card card" key={investor.id}><button className="person-profile-hit" onClick={() => setSelected(investor)} aria-label={`View ${investor.name}'s investor profile`}><div className="person-cover" style={{ backgroundImage: `linear-gradient(135deg, ${investor.color}66, rgba(17,29,51,.45)), url(${investor.poster})` }} /><Avatar initials={investor.initials} color={investor.color} size="large" /><h2>{investor.name}</h2><p>{investor.role}</p><span className="thesis-label">CURRENT INVESTMENT FOCUS</span><strong className="thesis">{investor.thesis}</strong><div className="person-stat"><BriefcaseBusiness size={15} /><span><strong>{investor.portfolioStartupIds.length}</strong> visible portfolio companies · {investor.ticket}</span></div></button><div className="person-actions"><button className="secondary-button" onClick={() => setSelected(investor)}>View profile</button><button className={connected.has(investor.id) ? "connected-button" : "connect-button"} onClick={() => toggleConnection(investor.id)}>{connected.has(investor.id) ? <><Check size={15} /> Connected</> : <><UserPlus size={15} /> Connect</>}</button></div></article>)}</div>{!people.length && <div className="card empty-feed"><Users size={30} /><h3>No exact investor match yet</h3><p>Broaden one filter to surface more compatible people.</p></div>}{selected && <InvestorProfileModal investor={selected} onClose={() => setSelected(null)} onMessage={() => onMessage(selected.profileId)} />}</div>;
}

function InvestorProfileModal({ investor, onClose, onMessage }: { investor: Investor; onClose: () => void; onMessage: () => void }) {
  const [scheduling, setScheduling] = useState(false);
  const portfolio = investor.portfolioStartupIds.map((id) => startups.find((startup) => startup.id === id)).filter((startup): startup is Startup => Boolean(startup));
  const matches = startups.filter((startup) => investor.sectors.includes(startup.sector) && investor.stages.includes(startup.stage)).slice(0, 6);
  return <Modal onClose={onClose} wide><div className="investor-detail"><header style={{ backgroundImage: `linear-gradient(110deg, rgba(12,28,48,.92), rgba(12,28,48,.42)), url(${investor.poster})` }}><Avatar initials={investor.initials} color={investor.color} size="large" /><span className="eyebrow">VERIFIED DEMO INVESTOR</span><h1>{investor.name}</h1><p>{investor.role}</p><div><button className="primary-wide" onClick={onMessage}><MessageCircle size={16} /> Send a message</button><button className="secondary-button" onClick={() => setScheduling(true)}><CalendarCheck size={16} /> Schedule meeting</button></div></header><section><div className="investor-thesis"><span className="eyebrow">INVESTMENT MANDATE</span><h2>What {investor.name.split(" ")[0]} wants to back</h2><p>{investor.bio}</p><div className="detail-tags">{[...investor.sectors, ...investor.stages, ...investor.locations].map((item) => <span key={item}>{item}</span>)}</div><strong>Typical first ticket · {investor.ticket}</strong></div><div><span className="eyebrow">SELECT PORTFOLIO</span><h2>{portfolio.length ? "Companies supported" : "No disclosed investments yet"}</h2><div className="mini-startup-grid">{(portfolio.length ? portfolio : matches).map((startup) => <div key={startup.id}><StartupLogo startup={startup} size="small" /><span><strong>{startup.name}</strong><small>{startup.sector} · {startup.stage}</small></span></div>)}</div></div><div className="matched-startups"><span className="eyebrow">MATCHED NOW</span><h2>Startups aligned with this thesis</h2><div className="mini-startup-grid">{matches.map((startup) => <div key={startup.id}><StartupLogo startup={startup} size="small" /><span><strong>{startup.name}</strong><small>{startup.location} · {startup.stage}</small></span></div>)}</div></div></section></div>{scheduling && <ScheduleMeetingModal investor={investor} onClose={() => setScheduling(false)} />}</Modal>;
}

function ScheduleMeetingModal({ investor, onClose, conversationId }: { investor: Investor; onClose: () => void; conversationId?: string }) {
  const [slots, setSlots] = useState<Array<{ id: string; startsAt: number; endsAt: number }>>([]);
  const [selected, setSelected] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Loading available times…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    authenticatedFetch(`/api/meetings?investorProfileId=${encodeURIComponent(investor.profileId)}`).then(async (response) => {
      const payload = await response.json() as { slots?: Array<{ id: string; startsAt: number; endsAt: number }>; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load availability.");
      setSlots(payload.slots ?? []); setStatus(payload.slots?.length ? "Choose a free 30-minute slot." : "No open slots right now.");
    }).catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load availability."));
  }, [investor.profileId]);
  const book = async () => {
    if (!selected) return;
    setBusy(true);
    const response = await authenticatedFetch("/api/meetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slotId: selected, conversationId, notes }) });
    const payload = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) { setStatus(payload.error || "Unable to reserve that time."); return; }
    setStatus("Meeting confirmed. It now appears in both members’ schedules.");
    setSlots([]); setSelected("");
  };
  return <div className="schedule-overlay"><div className="schedule-card"><button className="modal-close" onClick={onClose}><X size={18} /></button><span className="eyebrow">CALENDAR</span><h2>Meet {investor.name}</h2><p>{status}</p><div className="slot-grid">{slots.map((slot) => <button key={slot.id} className={selected === slot.id ? "active" : ""} onClick={() => setSelected(slot.id)}><strong>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(slot.startsAt)}</strong><span>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(slot.startsAt)}</span></button>)}</div>{slots.length > 0 && <label><span>What would you like to discuss?</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="A little context makes the meeting more useful…" /></label>}<button className="primary-wide" disabled={!selected || busy} onClick={book}>{busy ? "Reserving…" : "Confirm meeting"}</button></div></div>;
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
      const raw = caught instanceof Error ? caught.message : "Authentication could not be completed. Please try again.";
      setError(/rate limit|too many requests|email.*exceeded/i.test(raw) ? "Supabase’s demo mailer has reached its 2-emails-per-hour limit. Sign in if you already verified, or try again after the hour resets. Custom SMTP removes this demo bottleneck." : raw);
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
  const [sectors, setSectors] = useState(viewer.sectors.join(", "));
  const [stages, setStages] = useState(viewer.stages.join(", "));
  const [locations, setLocations] = useState(viewer.locations.join(", "));
  const [saving, setSaving] = useState(false);
  const asList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  const save = async () => { setSaving(true); await onSave({ displayName, role, headline, company, bio, sectors: asList(sectors), stages: asList(stages), locations: asList(locations) }); setSaving(false); };
  return <Modal onClose={onClose}><div className="profile-editor"><span className="eyebrow">{required ? "ONE LAST STEP" : "YOUR MEMBER PROFILE"}</span><h2>{required ? "Tell the community who you are." : "Keep your profile current."}</h2><p>Your verified email is <strong>{viewer.email}</strong>. It stays private unless you choose to share it.</p><div className="role-switch compact"><button className={role === "founder" ? "active" : ""} onClick={() => setRole("founder")}><Rocket size={18} /><span><strong>Founder</strong><small>Share a startup</small></span>{role === "founder" && <Check size={15} />}</button><button className={role === "investor" ? "active" : ""} onClick={() => setRole("investor")}><CircleDollarSign size={18} /><span><strong>Investor</strong><small>Discover companies</small></span>{role === "investor" && <Check size={15} />}</button></div><label><span>Your name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} /></label><label><span>{role === "founder" ? "Startup or company" : "Fund or organization"}</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder={role === "founder" ? "e.g. EmberGrid" : "e.g. Northstar Ventures"} maxLength={100} /></label><label><span>Headline</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder={role === "founder" ? "Founder building cleaner industrial heat" : "Seed investor in climate and hard tech"} maxLength={120} /></label><label><span>About you</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What are you building, backing, or hoping to meet people around?" rows={4} maxLength={600} /></label><div className="profile-interest-grid"><label><span>{role === "investor" ? "Sectors you invest in" : "Startup sector"}</span><input value={sectors} onChange={(event) => setSectors(event.target.value)} placeholder="Climate tech, Enterprise AI" /></label><label><span>{role === "investor" ? "Rounds you invest in" : "Current raising round"}</span><input value={stages} onChange={(event) => setStages(event.target.value)} placeholder="Pre-seed, Seed" /></label><label><span>{role === "investor" ? "Geographies you cover" : "Startup geography"}</span><input value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="Bengaluru, Mumbai" /></label></div><small className="profile-routing-note">These fields power investor matching and Primary / Secondary / Requests inbox routing.</small><button className="primary-wide" disabled={saving || !displayName.trim()} onClick={save}>{saving ? "Saving…" : required ? "Create my profile" : "Save profile"}</button></div></Modal>;
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

function StartupModal({ startup, followed, onClose, onFollow, onMessage }: { startup: Startup; followed: boolean; onClose: () => void; onFollow: () => void; onMessage: () => void }) {
  return <Modal onClose={onClose} wide><div className="startup-detail"><div className="startup-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(6,30,21,.92), rgba(6,30,21,.3)), url(${startup.poster})` }}><StartupLogo startup={startup} size="large" /><span>{startup.sector} · {startup.stage}</span><h1>{startup.name}</h1><p>{startup.tagline}</p></div><div className="startup-detail-body"><div className="detail-main"><div className="detail-tags">{startup.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h2>Why now</h2><p>{startup.description}</p><div className="founder-note"><span className="quote-mark">“</span><p>We spent eighteen months inside customer operations before writing the first line of product. The problem is urgent, measurable, and ready for a different approach.</p><div><Avatar initials={startup.initials + "F"} color={startup.color} size="small" /><span><strong>{startup.name} founding team</strong><small>Verified founder profile</small></span></div></div></div><aside className="detail-sidebar"><div className="detail-metrics"><div><Target size={17} /><span>Current round</span><strong>{startup.ask}</strong></div><div><LineChart size={17} /><span>Traction</span><strong>{startup.growth}</strong></div><div><Users size={17} /><span>Team</span><strong>{startup.team}</strong></div><div><CalendarDays size={17} /><span>Founded</span><strong>{startup.founded}</strong></div></div><button className="primary-wide" onClick={onMessage}><Mail size={15} /> Request introduction</button><button className="secondary-button full-width" onClick={onFollow}>{followed ? <><Check size={15} /> Following</> : <><Plus size={15} /> Follow startup</>}</button><small className="verified-note"><BadgeCheck size={14} /> Identity and traction verified by Innovestart</small></aside></div></div></Modal>;
}
