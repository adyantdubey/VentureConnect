"use client";

/* eslint-disable jsx-a11y/media-has-caption, @next/next/no-img-element */

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
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Dialog, Popover } from "radix-ui";
import { freshStartups, initialPosts, investors, Post, startups, videoPosts, type CommentItem, type Investor, type Startup } from "./synthetic-data";
import { calculateTam, investorIntelligence, marketSources, MATCH_MODEL_METADATA, MATCH_MODEL_VERSION, recommendationsForFounder, recommendationsForInvestor, startupIntelligence, type InvestorIntelligence, type MatchResult, type StartupIntelligence } from "./intelligence";
import { authenticatedFetch } from "./supabase-client";
import { DEMO_LOGINS } from "./demo-logins";

type View = "home" | "reels" | "discover" | "intelligence" | "messages" | "network";
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
type CallPayload = { id: string; callerProfileId: string; calleeProfileId: string; callerName?: string; callerColor?: string; conversationId?: string; mode: "voice" | "video"; status: "ringing" | "active" | "declined" | "ended"; offer?: RTCSessionDescriptionInit | null; answer?: RTCSessionDescriptionInit | null };

function viewerFromProfile(profile: ProfilePayload): Viewer {
  const initials = profile.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";
  const fallback = profile.role === "founder" ? (profile.company ? `Founder · ${profile.company}` : "Startup founder") : (profile.company ? `Investor · ${profile.company}` : "Startup investor");
  return { id: profile.id, email: profile.email, name: profile.displayName, initials, title: profile.headline || fallback, role: profile.role, headline: profile.headline, company: profile.company, bio: profile.bio, avatarColor: profile.avatarColor, sectors: profile.sectors, stages: profile.stages, locations: profile.locations, portfolioStartupIds: profile.portfolioStartupIds, onboardingComplete: profile.onboardingComplete };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <svg className="brand-mark" width="33" height="33" viewBox="0 0 48 48" aria-hidden="true" style={{ background: "transparent", boxShadow: "none" }}>
        <defs>
          <linearGradient id="fvA" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0F3FAE" />
            <stop offset="1" stopColor="#1769FF" />
          </linearGradient>
          <linearGradient id="fvB" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#1769FF" />
            <stop offset="1" stopColor="#5A93FF" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="11" fill="#05070B" />
        <polygon points="11,38 19.5,38 33.5,10 25,10" fill="url(#fvA)" />
        <polygon points="24.5,38 33,38 40,24 31.5,24" fill="url(#fvB)" />
        <circle cx="37" cy="13.5" r="3.4" fill="#7FA9FF" />
      </svg>
      {!compact && <span>Fay<span className="brand-accent">var</span></span>}
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

function Portal({ children }: { children: React.ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content className={`modal-panel ${wide ? "modal-wide" : ""}`}>
          <Dialog.Title className="sr-only">Fayvar dialog</Dialog.Title>
          <Dialog.Description className="sr-only">Focused Fayvar workspace dialog</Dialog.Description>
          <Dialog.Close asChild><button className="modal-close" aria-label="Close"><X size={19} /></button></Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ChoiceMenu({ label, value, options, onChange, icon, compact = false }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; icon?: React.ReactNode; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value)?.label ?? value;
  const visible = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
  return <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}><div className={`choice-menu ${compact ? "compact" : ""}`}><span className="choice-label">{icon}{label}</span><Popover.Trigger asChild><button type="button" className="choice-trigger" aria-label={`${label}: ${selected}`}><span>{selected}</span><ChevronDown size={15} /></button></Popover.Trigger><Popover.Portal><Popover.Content className="choice-popover" sideOffset={8} align="start"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} /></label><div role="listbox" aria-label={label}>{visible.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); setQuery(""); }}><span>{option.label}</span>{option.value === value && <Check size={15} />}</button>)}{!visible.length && <p>No matching option</p>}</div></Popover.Content></Popover.Portal></div></Popover.Root>;
}

export default function FayvarApp() {
  const [view, setView] = useState<View>("home");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
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
  const [incomingCall, setIncomingCall] = useState<CallPayload | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => { root.style.scrollBehavior = previous; });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  const loadViewer = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/profile");
      if (!response.ok) {
        if (response.status === 401) setViewer(null);
        return null;
      }
      const payload = await response.json() as { profile?: ProfilePayload };
      if (!payload.profile) return null;
      const nextViewer = viewerFromProfile(payload.profile);
      setViewer(nextViewer);
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
      await loadViewer();
      await loadPosts();
      if (active) setAuthChecking(false);
    };
    initialize().catch(() => active && setAuthChecking(false));
    return () => { active = false; };
  }, [loadPosts, loadViewer]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!viewer || incomingCall) return;
    let active = true;
    const poll = async () => {
      const response = await authenticatedFetch("/api/calls");
      if (!response.ok || !active) return;
      const payload = await response.json() as { incoming?: CallPayload | null };
      if (payload.incoming) setIncomingCall(payload.incoming);
    };
    const kickoff = window.setTimeout(poll, 0);
    const timer = window.setInterval(poll, 3_000);
    return () => { active = false; window.clearTimeout(kickoff); window.clearInterval(timer); };
  }, [incomingCall, viewer]);

  const requireAuth = () => {
    if (viewer) return true;
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
    setToast("Welcome to Fayvar");
  };

  const signOut = async () => {
    await fetch("/api/demo-auth", { method: "DELETE" });
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
    const shareData = { title: `${post.startup} on Fayvar`, text: post.headline, url: window.location.href };
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
      setProfileOpen(false);
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
    <MotionConfig reducedMotion="user" transition={{ duration: .28, ease: [.22, 1, .36, 1] }}>
    <main className="app-shell">
      <header className="topbar liquid-topbar">
        <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu((current) => !current)}><Menu size={20} /></button>
        <button className="logo-button" onClick={() => goTo("home")} aria-label="Fayvar home"><Logo /></button>
        <nav className={`main-nav ${mobileMenu ? "mobile-open" : ""}`} aria-label="Primary navigation">
          <NavButton active={view === "home"} icon={<Home />} label={viewer?.role === "investor" ? "Deal flow" : "Workspace"} onClick={() => goTo("home")} />
          <NavButton active={view === "reels"} icon={<Play />} label="Reels" onClick={() => goTo("reels")} />
          <NavButton active={view === "discover"} icon={<Compass />} label={viewer?.role === "investor" ? "Startups" : "Discover"} onClick={() => goTo("discover")} />
          {viewer && <NavButton active={view === "intelligence"} icon={<Sparkles />} label={viewer.role === "investor" ? "Intelligence" : "AI matches"} onClick={() => goTo("intelligence")} />}
          <NavButton active={view === "messages"} icon={<MessageCircle />} label="Messages" onClick={() => goTo("messages")} />
          <NavButton active={view === "network"} icon={<Users />} label={viewer?.role === "founder" ? "Investors" : "Network"} onClick={() => goTo("network")} />
        </nav>
        <div className="top-actions">
          <div className="global-search">
            <Search size={16} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder={viewer?.role === "investor" ? "Search companies, markets…" : "Search investors, companies…"} aria-label="Search" />
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
              <button className="profile-chip" onClick={() => { setAccountOpen((current) => !current); setNotificationsOpen(false); }}><Avatar initials={viewer.initials} size="small" /><span>{viewer.name.split(" ")[0]}<small>{viewer.role}</small></span><ChevronDown size={14} /></button>
              {accountOpen && <div className="account-popover"><div><Avatar initials={viewer.initials} /><span><strong>{viewer.name}</strong><small>{viewer.title}</small></span></div><button onClick={() => { setAccountOpen(false); setProfileOpen(true); }}><Sparkles size={15} /> Edit my profile</button><button onClick={() => { setAccountOpen(false); goTo("network"); }}><Users size={15} /> View my network</button><button onClick={() => { setAccountOpen(false); signOut(); }}><ArrowUpRight size={15} /> Sign out</button></div>}
            </div>
          ) : <button className="header-signin" disabled={authChecking} onClick={() => setAuthOpen(true)}>{authChecking ? "Checking…" : "Sign in"}</button>}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
      <motion.section
        className="view-stage"
        key={`${viewer?.role ?? "guest"}-${view}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: .2, ease: [.22, 1, .36, 1] }}
      >
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
          onAuth={() => setAuthOpen(true)}
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
      {view === "intelligence" && <IntelligenceView viewer={viewer} onAuth={() => setAuthOpen(true)} onStartup={setSelectedStartup} onMessage={(profileId) => { window.localStorage.setItem("fayvar-message-recipient", profileId); goTo("messages"); }} onToast={setToast} />}
      {view === "messages" && <MessagesView viewer={viewer} onAuth={() => setAuthOpen(true)} />}
      {view === "network" && <NetworkView viewer={viewer} onAuth={() => setAuthOpen(true)} onStartup={setSelectedStartup} onMessage={(profileId) => { window.localStorage.setItem("fayvar-message-recipient", profileId); goTo("messages"); }} />}
      </motion.section>
      </AnimatePresence>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={authenticated} />}
      {profileOpen && viewer && <ProfileModal viewer={viewer} required={!viewer.onboardingComplete} onClose={() => viewer.onboardingComplete && setProfileOpen(false)} onSave={saveProfile} />}
      {composerOpen && viewer && <ComposerModal viewer={viewer} onClose={() => setComposerOpen(false)} onSubmit={submitPost} />}
      {selectedStartup && <StartupModal startup={selectedStartup} followed={following.has(selectedStartup.id)} onClose={() => setSelectedStartup(null)} onFollow={() => toggleFollow(selectedStartup.id, selectedStartup.name)} onMessage={() => { if (requireAuth()) { setSelectedStartup(null); goTo("messages"); setToast(`Conversation with ${selectedStartup.name} opened`); } }} />}
      {incomingCall && <CallModal target={{ id: incomingCall.callerProfileId, name: incomingCall.callerName || "Incoming member", color: incomingCall.callerColor || "#536ed7" }} mode={incomingCall.mode} incomingCall={incomingCall} conversationId={incomingCall.conversationId} onClose={() => setIncomingCall(null)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
    </MotionConfig>
  );
}

function LiquidIndicator({ layoutId, className = "" }: { layoutId: string; className?: string }) {
  return <motion.span aria-hidden="true" className={`button-liquid-indicator ${className}`} layoutId={layoutId} transition={{ duration: .2, ease: [.22, 1, .36, 1] }} />;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{active && <LiquidIndicator layoutId="primary-nav-active" className="nav-liquid-indicator" />}<span>{icon}</span><b>{label}</b></button>;
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
          <button onClick={() => props.viewer?.role === "investor" ? props.onNavigate("intelligence") : props.onUtility(`${props.saved.size || 14} saved opportunities are ready to review`)}><Bookmark size={17} /> {props.viewer?.role === "investor" ? "Deal pipeline" : "Saved opportunities"} <b>{props.saved.size || 14}</b></button>
          <button onClick={() => props.onUtility(props.viewer?.role === "investor" ? "Your next diligence call is Thursday" : "Your next investor meeting is Thursday")}><CalendarDays size={17} /> Upcoming meetings <b>3</b></button>
          <button onClick={() => props.onNavigate(props.viewer ? "intelligence" : "discover")}><Sparkles size={17} /> {props.viewer?.role === "investor" ? "AI deal flow" : "Investor matches"}</button>
        </section>
        <div className="mini-promo">
          <span><Sparkles size={14} /> INVESTOR OFFICE HOURS</span>
          <strong>Pitch feedback with Northstar</strong>
          <small>Thursday · 5:00 PM IST</small>
          <button onClick={() => props.onUtility("Seat reserved for Thursday’s office hours")}>Reserve a seat <ArrowUpRight size={13} /></button>
        </div>
      </aside>

      <section className="feed-column">
        {props.viewer && <RoleSnapshot viewer={props.viewer} onNavigate={props.onNavigate} />}
        <div className="feed-heading">
          <div><span className="eyebrow">{props.viewer?.role === "investor" ? "LATEST FROM YOUR DEAL FLOW" : props.viewer?.role === "founder" ? "FOUNDER SIGNAL" : "TODAY ON FAYVAR"}</span><h1>{props.viewer ? props.viewer.role === "investor" ? `Companies worth a closer look, ${props.viewer.name.split(" ")[0]}.` : `Build the round with better context, ${props.viewer.name.split(" ")[0]}.` : "Meet the people building what’s next."}</h1></div>
          <ChoiceMenu compact label="Feed" value={props.feedFilter} icon={<SlidersHorizontal size={13} />} options={[{ value: "For you", label: "Curated for you" }, { value: "Following", label: "People you follow" }, { value: "Newest", label: "Newest first" }]} onChange={(value) => props.onFilter(value as HomeViewProps["feedFilter"])} />
        </div>

        <section className="story-tray" aria-label="Fresh stories">
          <div className="story-tray-title"><span>Fresh from founders</span><small>Tap a company to explore</small></div>
          <div className="story-list">{freshStartups.slice(0, 10).map((startup, index) => <button key={startup.id} onClick={() => props.onStartup(startup)}><span className={`story-ring story-${index % 4}`}><StartupLogo startup={startup} size="small" /></span><strong>{startup.name}</strong><small>{index % 3 === 0 ? "New pitch" : index % 3 === 1 ? "Milestone" : "Founder note"}</small></button>)}</div>
        </section>

        <section className="composer card">
          <div className="composer-top"><Avatar initials={props.viewer?.initials ?? "YOU"} /><button onClick={props.onCompose}>{props.viewer?.role === "investor" ? "Share a thesis note or market observation…" : "What changed in your company this week?"}</button></div>
          <div className="composer-actions">
            <button onClick={props.onCompose}><span className="action-symbol lilac"><Video size={14} /></span> {props.viewer?.role === "investor" ? "Market note" : "Video pitch"}</button>
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
        <p className="footer-links">About · Trust & safety · Help · Privacy<br />© 2026 Fayvar</p>
      </aside>
    </div>
  );
}

function RoleSnapshot({ viewer, onNavigate }: { viewer: Viewer; onNavigate: (view: View) => void }) {
  if (viewer.role === "investor") {
    const matches = recommendationsForInvestor(viewer.id, 3);
    return <section className="role-snapshot investor-snapshot"><div><span className="eyebrow">INVESTOR CONTROL ROOM</span><h2>Three companies moved into range.</h2><p>Ranked against your thesis, stage, cheque, geography and portfolio context.</p><button onClick={() => onNavigate("intelligence")}>Open AI deal flow <ArrowUpRight size={15} /></button></div><div className="snapshot-matches">{matches.map(({ startup, match }) => <article key={startup.startupId}><span>{match.reciprocalScore}</span><div><strong>{startup.name}</strong><small>{startup.sector} · {startup.stage}</small></div></article>)}</div></section>;
  }
  const matches = recommendationsForFounder(viewer.id, 3);
  return <section className="role-snapshot founder-snapshot"><div><span className="eyebrow">FUNDRAISING WORKSPACE</span><h2>Your investor map is taking shape.</h2><p>See reciprocal fit, likely objections and the strongest route into each conversation.</p><button onClick={() => onNavigate("intelligence")}>Review investor matches <ArrowUpRight size={15} /></button></div><div className="snapshot-matches">{matches.map(({ investor, match }) => <article key={investor.profileId}><span>{match.reciprocalScore}</span><div><strong>{investor.name}</strong><small>{investor.firm} · {match.inboxTier}</small></div></article>)}</div></section>;
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

function ReelVideo({ post, index }: { post: Post; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const stream = video.closest(".reels-stream");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        video.play().catch(() => setPlaying(false));
      } else {
        video.pause();
      }
    }, { root: stream, threshold: [0, 0.6, 1] });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <><video ref={videoRef} controls playsInline muted={muted} loop autoPlay={index === 0} preload={index < 2 ? "auto" : "metadata"} poster={post.poster} aria-label={`${post.startup}: ${post.mediaTitle}`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><source src={post.mediaUrl} type="video/mp4" /></video><button className="reel-sound-control" type="button" onClick={() => setMuted((current) => !current)} aria-label={muted ? "Turn sound on" : "Mute video"}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}<span>{muted ? "Sound off" : "Sound on"}</span><i className={playing ? "playing" : ""} /></button></>;
}

function ReelsView({ posts, liked, saved, onLike, onSave, onShare, onStartup }: { posts: Post[]; liked: Set<string>; saved: Set<string>; onLike: (id: string) => void; onSave: (id: string) => void; onShare: (post: Post) => void; onStartup: (startup: Startup) => void }) {
  return <div className="reels-page reels-focus"><h1 className="sr-only">Startup reels</h1><section className="reels-stream" aria-label="Startup reels">{posts.map((post, index) => { const startup = startups.find((item) => item.id === post.startupId); return <article className="reel-card" key={post.id}><ReelVideo post={post} index={index} /><div className="reel-shade" /><div className="reel-copy"><button onClick={() => startup && onStartup(startup)}><span className="startup-logo logo-small" style={{ background: post.logoColor }}>{post.logo}</span><span><strong>{post.startup} <BadgeCheck size={14} /></strong><small>{post.meta.split(" · ").slice(0, 2).join(" · ")}</small></span></button><h2>{post.mediaTitle}</h2><p>{post.body}</p><div>{post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><small>{post.sourceUrl ? <a href={post.sourceUrl} target="_blank" rel="noreferrer">{post.sourceLabel}</a> : post.sourceLabel}</small></div><aside className="reel-actions"><button className={liked.has(post.id) ? "active" : ""} onClick={() => onLike(post.id)}><Heart size={21} fill={liked.has(post.id) ? "currentColor" : "none"} /><span>{post.likes + (liked.has(post.id) ? 1 : 0)}</span></button><button onClick={() => onShare(post)}><Share2 size={21} /><span>Share</span></button><button className={saved.has(post.id) ? "active" : ""} onClick={() => onSave(post.id)}><Bookmark size={21} fill={saved.has(post.id) ? "currentColor" : "none"} /><span>Save</span></button></aside><span className="reel-count">{String(index + 1).padStart(2, "0")} / 30</span></article>; })}</section></div>;
}

function DiscoverView({ following, onFollow, onStartup }: { following: Set<string>; onFollow: (id: string, name: string) => void; onStartup: (startup: Startup) => void }) {
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const [sortMode, setSortMode] = useState<"Recommended" | "Trending" | "Recently added">("Recommended");
  const filtered = startups
    .filter((startup) => (sector === "All sectors" || startup.sector === sector) && (stage === "All stages" || startup.stage === stage))
    .sort((a, b) => sortMode === "Trending" ? b.signal.localeCompare(a.signal) : sortMode === "Recently added" ? b.founded.localeCompare(a.founded) : a.name.localeCompare(b.name));
  const sectorOptions = [{ value: "All sectors", label: "Every sector" }, ...Array.from(new Set(startups.map((item) => item.sector))).map((item) => ({ value: item, label: item }))];
  const stageOptions = [{ value: "All stages", label: "Every stage" }, ...Array.from(new Set(startups.map((item) => item.stage))).map((item) => ({ value: item, label: item }))];
  return <div className="workspace-page"><section className="discover-hero"><div><span className="eyebrow">SIGNAL BEFORE CONSENSUS</span><h1>Find momentum<br />before the crowd.</h1><p>Move from founder story to traction, context, and a thoughtful first conversation—without losing the human signal.</p></div><div className="hero-proof"><div><strong>30</strong><span>Complete companies</span></div><div><strong>20</strong><span>Active investors</span></div><div><strong>600</strong><span>Modelled matches</span></div></div></section><div className="discover-toolbar"><div>{(["Recommended", "Trending", "Recently added"] as const).map((mode) => <button key={mode} className={sortMode === mode ? "active" : ""} onClick={() => setSortMode(mode)}>{sortMode === mode && <LiquidIndicator layoutId="discover-sort-active" />}{mode === "Recommended" ? <Sparkles size={15} /> : mode === "Trending" ? <TrendingUp size={15} /> : <Clock3 size={15} />}<span>{mode === "Recommended" ? "Best fit" : mode === "Recently added" ? "Just joined" : mode}</span></button>)}</div><div className="filter-group"><ChoiceMenu label="Sector" value={sector} options={sectorOptions} onChange={setSector} /><ChoiceMenu label="Stage" value={stage} options={stageOptions} onChange={setStage} /></div></div><div className="startup-card-grid">{filtered.map((startup) => <article className="startup-card card" key={startup.id}><button className="startup-card-image" style={{ backgroundImage: `url(${startup.poster})` }} onClick={() => onStartup(startup)}><div><StartupLogo startup={startup} /><span>{startup.stage}</span></div><strong>{startup.tagline}</strong></button><div className="startup-card-body"><div className="startup-card-title"><button onClick={() => onStartup(startup)}><h2>{startup.name} <BadgeCheck size={16} /></h2><p><MapPin size={12} /> {startup.location} · Founded {startup.founded}</p></button><button className={`round-follow ${following.has(startup.id) ? "active" : ""}`} onClick={() => onFollow(startup.id, startup.name)}>{following.has(startup.id) ? <Check size={15} /> : <Plus size={16} />}</button></div><p>{startup.description}</p><div className="startup-metrics"><div><span>ROUND</span><strong>{startup.ask.replace("Raising ", "")}</strong></div><div><span>TRACTION</span><strong>{startup.growth}</strong></div><div><span>SIGNAL</span><strong>{startup.signal}</strong></div></div><div className="card-tag-row">{startup.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}</div></div>;
}

type InvestorRecommendation = { startup: Startup; intelligence: StartupIntelligence; match: MatchResult; market: ReturnType<typeof calculateTam> };
type FounderRecommendation = { investor: Investor; intelligence: InvestorIntelligence; match: MatchResult };

function IntelligenceView({ viewer, onAuth, onStartup, onMessage, onToast }: { viewer: Viewer | null; onAuth: () => void; onStartup: (startup: Startup) => void; onMessage: (profileId: string) => void; onToast: (message: string) => void }) {
  const [tab, setTab] = useState<"matches" | "pipeline" | "market">("matches");
  const [investorRecommendations, setInvestorRecommendations] = useState<InvestorRecommendation[]>([]);
  const [founderRecommendations, setFounderRecommendations] = useState<FounderRecommendation[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, string>>({});
  const [scenario, setScenario] = useState<"bear" | "base" | "bull">("base");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer) return;
    let active = true;
    authenticatedFetch("/api/intelligence").then(async (response) => {
      if (!response.ok) throw new Error("Unable to load Intelligence");
      const payload = await response.json() as { recommendations?: Array<InvestorRecommendation | FounderRecommendation>; pipeline?: Array<{ startupId: string; stage: string }> };
      if (!active) return;
      if (viewer.role === "investor") setInvestorRecommendations((payload.recommendations ?? []) as InvestorRecommendation[]);
      else setFounderRecommendations((payload.recommendations ?? []) as FounderRecommendation[]);
      setPipeline(Object.fromEntries((payload.pipeline ?? []).map((item) => [item.startupId, item.stage])));
    }).catch(() => {
      if (!active) return;
      if (viewer.role === "investor") setInvestorRecommendations(recommendationsForInvestor(viewer.id, 18).map(({ startup, match }) => ({ startup: startups.find((item) => item.id === startup.startupId)!, intelligence: startup, match, market: calculateTam(startup) })));
      else setFounderRecommendations(recommendationsForFounder(viewer.id, 18).map(({ investor, match }) => ({ investor: investors.find((item) => item.profileId === investor.profileId)!, intelligence: investor, match })));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [viewer]);

  if (!viewer) return <GatedView icon={<Sparkles size={30} />} title="Intelligence built around your mandate." body="Sign in to see reciprocal matches, explanations, market sizing and role-specific recommendations." onAuth={onAuth} />;

  const updatePipeline = async (startupId: string, stage: "saved" | "reviewing" | "meeting" | "diligence" | "passed") => {
    setPipeline((current) => ({ ...current, [startupId]: stage }));
    const response = await authenticatedFetch("/api/intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "pipeline", startupId, stage }) });
    if (!response.ok) { onToast("Pipeline could not be updated"); return; }
    onToast(stage === "passed" ? "Startup moved to Passed" : `Startup moved to ${stage}`);
  };

  const tabs = viewer.role === "investor" ? (["matches", "pipeline", "market"] as const) : (["matches", "market"] as const);
  return <div className="workspace-page intelligence-page"><section className="intelligence-hero"><div><span className="eyebrow">FAYVAR MATCH · {MATCH_MODEL_VERSION}</span><h1>{viewer.role === "investor" ? "A sharper view of what deserves attention." : "Know who fits—and why—before you reach out."}</h1><p>{viewer.role === "investor" ? "A reciprocal ranking system combining mandate, cheque, geography, thesis language, portfolio context and company evidence." : "Investor recommendations balance their likelihood of interest with the value they can bring to your company."}</p></div><div className="model-proof"><div><strong>50</strong><span>Complete profiles</span></div><div><strong>600</strong><span>Evaluated pairs</span></div><div><strong>10</strong><span>Explainable features</span></div><div><strong>{(MATCH_MODEL_METADATA.metrics.auc * 100).toFixed(1)}%</strong><span>Synthetic holdout AUC</span></div></div></section><nav className="intelligence-tabs" aria-label="Intelligence sections">{tabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{tab === item && <LiquidIndicator layoutId="intelligence-tab-active" />}<span>{item === "matches" ? viewer.role === "investor" ? "Recommended companies" : "Investor matches" : item === "pipeline" ? "Deal pipeline" : viewer.role === "investor" ? "Market map" : "TAM intelligence"}</span></button>)}</nav>{loading ? <div className="intelligence-loading card"><Sparkles size={22} /><strong>Scoring reciprocal matches…</strong><span>Applying mandate, thesis, stage, cheque and market features.</span></div> : viewer.role === "investor" ? <InvestorIntelligenceContent tab={tab} recommendations={investorRecommendations} pipeline={pipeline} onStartup={onStartup} onPipeline={updatePipeline} /> : <FounderIntelligenceContent tab={tab} viewer={viewer} recommendations={founderRecommendations} scenario={scenario} onScenario={setScenario} onMessage={onMessage} />}</div>;
}

function InvestorIntelligenceContent({ tab, recommendations, pipeline, onStartup, onPipeline }: { tab: "matches" | "pipeline" | "market"; recommendations: InvestorRecommendation[]; pipeline: Record<string, string>; onStartup: (startup: Startup) => void; onPipeline: (startupId: string, stage: "saved" | "reviewing" | "meeting" | "diligence" | "passed") => void }) {
  if (tab === "market") return <MarketMap />;
  const visible = tab === "pipeline" ? recommendations.filter((item) => pipeline[item.startup.id] && pipeline[item.startup.id] !== "passed") : recommendations;
  return <><div className="intelligence-section-head"><div><span className="eyebrow">{tab === "pipeline" ? "ACTIVE REVIEW" : "RECIPROCAL RANKING"}</span><h2>{tab === "pipeline" ? `${visible.length} companies in your pipeline` : "Best current thesis matches"}</h2></div><p>{tab === "pipeline" ? "Move companies through a focused review workflow without losing the original match explanation." : "Scores update from declared preferences now and real interaction signals as the network grows."}</p></div><div className="recommendation-grid">{visible.map(({ startup, intelligence, match, market }, index) => <article className="recommendation-card card" key={startup.id}><header><div><span className="rank-number">#{String(index + 1).padStart(2, "0")}</span><StartupLogo startup={startup} /><span><strong>{startup.name}</strong><small>{startup.sector} · {startup.stage} · {startup.location}</small></span></div><div className={`match-score tier-${match.inboxTier}`}><strong>{match.reciprocalScore}</strong><span>match</span></div></header><button className="recommendation-image" style={{ backgroundImage: `url(${startup.poster})` }} onClick={() => onStartup(startup)} aria-label={`View ${startup.name}`}><span>{intelligence.businessModel}</span><strong>{startup.tagline}</strong></button><div className="score-strip"><div><span>Investor interest</span><strong>{match.investorProbability}%</strong></div><div><span>Founder benefit</span><strong>{match.founderProbability}%</strong></div><div><span>Market CAGR</span><strong>{market.cagr}%</strong></div></div><div className="match-explanation"><span>WHY IT RANKS</span>{match.reasons.slice(0, 3).map((reason) => <p key={reason}><Check size={13} />{reason}</p>)}{match.concerns[0] && <p className="concern"><Target size={13} />{match.concerns[0]}</p>}</div><footer><button className="secondary-button" onClick={() => onStartup(startup)}>Review company</button><button className="pipeline-button" onClick={() => onPipeline(startup.id, pipeline[startup.id] === "reviewing" ? "diligence" : "reviewing")}><Bookmark size={15} />{pipeline[startup.id] ? pipeline[startup.id] : "Save to pipeline"}</button></footer></article>)}</div>{!visible.length && <div className="empty-intelligence card"><BriefcaseBusiness size={30} /><h3>Your review queue is clear.</h3><p>Save a recommended company to begin a structured deal-flow review.</p></div>}</>;
}

function FounderIntelligenceContent({ tab, viewer, recommendations, scenario, onScenario, onMessage }: { tab: "matches" | "pipeline" | "market"; viewer: Viewer; recommendations: FounderRecommendation[]; scenario: "bear" | "base" | "bull"; onScenario: (scenario: "bear" | "base" | "bull") => void; onMessage: (profileId: string) => void }) {
  const startup = startupIntelligence.find((item) => item.founderProfileId === viewer.id) ?? startupIntelligence[0];
  if (tab === "market") {
    const analysis = calculateTam(startup, scenario);
    const marketLayers = [
      { label: "TAM", value: analysis.tamCr, note: "Entire addressable demand", width: 100 },
      { label: "SAM", value: analysis.samCr, note: `${Math.round(analysis.serviceableRate * 100)}% currently serviceable`, width: Math.max(24, analysis.serviceableRate * 100) },
      { label: "SOM", value: analysis.somCr, note: `${(analysis.obtainableRate * 100).toFixed(1)}% obtainable share`, width: Math.max(12, analysis.obtainableRate * 100) },
    ];
    return <div className="tam-workspace"><div className="tam-summary card"><div className="tam-head"><div><span className="eyebrow">BOTTOM-UP MARKET MODEL</span><h2>{startup.name} market intelligence</h2><p>Transparent scenarios based on an addressable-unit model—not an unsupported generated number.</p></div><div className="scenario-switch">{(["bear", "base", "bull"] as const).map((item) => <button className={scenario === item ? "active" : ""} key={item} onClick={() => onScenario(item)}>{item}</button>)}</div></div><div className="tam-numbers">{marketLayers.map((layer) => <article key={layer.label}><span>{layer.label}</span><strong>₹{layer.value.toLocaleString("en-IN")} Cr</strong><small>{layer.note}</small></article>)}</div><div className="tam-funnel" aria-label="TAM, SAM and SOM opportunity funnel">{marketLayers.map((layer) => <div key={layer.label}><span><strong>{layer.label}</strong><small>{layer.note}</small></span><i><b style={{ width: `${layer.width}%` }} /></i><strong>₹{layer.value.toLocaleString("en-IN")} Cr</strong></div>)}</div><div className="tam-method"><span>CALCULATION</span><strong>{analysis.formula}</strong><p>Scenario: {scenario} · Referenced CAGR: {analysis.cagr}% · Confidence: {analysis.source.confidence}</p></div></div><aside className="source-card card"><span className="eyebrow">SOURCE RECORD</span><h3>{analysis.source.title}</h3><p>{analysis.source.sourceMetric}</p><dl><div><dt>Publisher</dt><dd>{analysis.source.publisher}</dd></div><div><dt>Reference period</dt><dd>{analysis.source.asOf}</dd></div><div><dt>Accessed</dt><dd>18 Aug 2026</dd></div></dl><a href={analysis.source.url} target="_blank" rel="noreferrer">Open primary source <ArrowUpRight size={14} /></a></aside></div>;
  }
  return <><div className="intelligence-section-head"><div><span className="eyebrow">RECIPROCAL INVESTOR FIT</span><h2>Investors aligned with {startup.name}</h2></div><p>Ranking balances likely investor interest with cheque, portfolio and operating value for your company.</p></div><div className="founder-match-list">{recommendations.map(({ investor, intelligence, match }, index) => <article className="founder-match-card card" key={investor.profileId}><div className="match-rank"><span>#{String(index + 1).padStart(2, "0")}</span><div className={`match-score tier-${match.inboxTier}`}><strong>{match.reciprocalScore}</strong><small>match</small></div></div><Avatar initials={investor.initials} color={investor.color} size="large" /><div className="founder-match-main"><span className="eyebrow">{intelligence.investorType} · {intelligence.leadPreference}</span><h2>{investor.name}</h2><p>{investor.role}</p><blockquote>{intelligence.thesis}</blockquote><div className="match-facts"><span>₹{intelligence.ticketMinCr}–₹{intelligence.ticketMaxCr} Cr</span><span>{intelligence.stages.join(" / ")}</span><span>{intelligence.responseRate}% response rate</span></div><div className="match-reasons">{match.reasons.slice(0, 2).map((reason) => <span key={reason}><Check size={13} />{reason}</span>)}</div></div><div className="founder-match-action"><span className={`routing-pill tier-${match.inboxTier}`}>{match.inboxTier} route</span><small>{match.investorProbability}% investor interest</small><button onClick={() => onMessage(investor.profileId)}><MessageCircle size={15} /> Message investor</button></div></article>)}</div></>;
}

function MarketMap() {
  const leadingMarkets = [...marketSources].sort((a, b) => b.cagr - a.cagr).slice(0, 6);
  const maxCagr = Math.max(...leadingMarkets.map((source) => source.cagr));
  return <div className="market-map"><div className="intelligence-section-head"><div><span className="eyebrow">SOURCE-BACKED OPPORTUNITY MAP</span><h2>Markets represented in your deal flow</h2></div><p>Primary and government sources anchor the market context. Startup-specific TAM remains assumption-driven and reviewable.</p></div><section className="market-visual card"><div><span className="eyebrow">GROWTH SIGNAL</span><h3>Fastest-moving markets</h3><p>CAGR comparison across the primary-source market records used by the recommendation model.</p></div><div className="market-bars">{leadingMarkets.map((source) => <div key={source.id}><span><strong>{source.sector}</strong><small>{source.cagr}% CAGR</small></span><i><b style={{ width: `${(source.cagr / maxCagr) * 100}%` }} /></i></div>)}</div></section><div className="market-table card"><header><span>Sector</span><span>Source signal</span><span>CAGR</span><span>Companies</span><span>Source</span></header>{marketSources.map((source) => <div key={source.id}><strong>{source.sector}</strong><p>{source.sourceMetric}</p><b>{source.cagr}%</b><span>{startups.filter((startup) => startup.sector === source.sector).length}</span><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}<ArrowUpRight size={13} /></a></div>)}</div></div>;
}

function MessagesView({ viewer, onAuth }: { viewer: Viewer | null; onAuth: () => void }) {
  type Contact = { id: string; name: string; role: Role; headline: string; company: string; color: string; sectors?: string[]; stages?: string[]; locations?: string[] };
  type Conversation = { id: string; inboxTier: "primary" | "secondary" | "request"; routingScore?: number; routingReasons?: string[]; routingModelVersion?: string; lastMessageAt: number; other: Contact; preview: string; unreadCount: number };
  type MessageItem = { id: string; senderProfileId: string; recipientProfileId: string; senderName: string; body: string; createdAt: number };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [target, setTarget] = useState<Contact | null>(null);
  const [tier, setTier] = useState<"all" | "unread" | "primary" | "secondary" | "request">(viewer?.role === "founder" ? "all" : "primary");
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading conversations…");
  const [meetingInvestor, setMeetingInvestor] = useState<Investor | null>(null);
  const [call, setCall] = useState<{ target: Contact; mode: "voice" | "video" } | null>(null);
  const loadInbox = useCallback(async () => {
    const response = await authenticatedFetch("/api/messages");
    if (!response.ok) return;
    const payload = await response.json() as { conversations?: Conversation[]; contacts?: Contact[] };
    const nextConversations = payload.conversations ?? [];
    setConversations(nextConversations);
    setContacts(payload.contacts ?? []);
    setActiveId((current) => current || nextConversations[0]?.id || "");
    setStatus(nextConversations.length ? "" : "Start a focused founder–investor conversation.");
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
    const pending = window.localStorage.getItem("fayvar-message-recipient");
    const contact = contacts.find((item) => item.id === pending);
    if (!contact) return;
    const kickoff = window.setTimeout(() => { setTarget(contact); setComposing(false); setMessages([]); window.localStorage.removeItem("fayvar-message-recipient"); const existing = conversations.find((item) => item.other.id === contact.id); setActiveId(existing?.id ?? ""); }, 0);
    return () => window.clearTimeout(kickoff);
  }, [contacts, conversations, viewer]);
  if (!viewer) return <GatedView icon={<MessageCircle size={30} />} title="Turn interest into a conversation." body="Sign in to message founders, ask useful questions, and keep every promising connection in one place." onAuth={onAuth} />;
  const filteredConversations = viewer.role === "founder"
    ? conversations.filter((item) => tier === "unread" ? item.unreadCount > 0 : true)
    : conversations.filter((item) => item.inboxTier === tier);
  const activeConversation = conversations.find((item) => item.id === activeId);
  const activeContact = target ?? activeConversation?.other ?? null;
  const send = async () => {
    if (!draft.trim() || !activeContact) return;
    const body = draft.trim(); setDraft("");
    const response = await authenticatedFetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: activeId || undefined, recipientProfileId: activeContact.id, body }) });
    const payload = await response.json() as { message?: MessageItem & { conversationId: string }; error?: string; inboxTier?: string; routing?: { score?: number; reasons?: string[] } };
    if (!response.ok || !payload.message) { setStatus(payload.error || "Unable to send the message."); setDraft(body); return; }
    const displayedTier = payload.inboxTier === "secondary" ? "general" : payload.inboxTier ?? "primary";
    setMessages((current) => [...current, payload.message!]); setActiveId(payload.message.conversationId); setTarget(activeContact); setStatus(viewer.role === "investor" ? "Delivered directly to the founder" : `Routed to ${displayedTier} · ${payload.routing?.score ?? 0}% thesis fit`); await loadInbox();
  };
  const availableContacts = contacts.filter((item) => item.role !== viewer.role && `${item.name} ${item.company} ${item.headline}`.toLowerCase().includes(query.toLowerCase()));
  const investorFor = activeContact?.role === "investor" ? investors.find((item) => item.profileId === activeContact.id) ?? { profileId: activeContact.id, name: activeContact.name } : null;
  const inboxTabs = viewer.role === "founder" ? (["all", "unread"] as const) : (["primary", "secondary", "request"] as const);
  const inboxTierLabel = (value: "all" | "unread" | "primary" | "secondary" | "request") => value === "secondary" ? "General" : value === "request" ? "Requests" : `${value[0].toUpperCase()}${value.slice(1)}`;
  return <div className="workspace-page"><div className="page-title-row"><div><span className="eyebrow">{viewer.role === "investor" ? "RELEVANCE-RANKED INBOX" : "FOUNDER INBOX"}</span><h1>Messages</h1><p>{viewer.role === "investor" ? "Protect your attention with explainable Primary, General and Request routing." : "Every investor message arrives directly—no hidden request folders or relevance tiers."}</p></div><button className="primary-wide" onClick={() => setComposing(true)}><Plus size={15} /> New message</button></div><section className="messages-shell card"><aside className="chat-list"><div className="inbox-tier-tabs">{inboxTabs.map((item) => <button key={item} className={tier === item ? "active" : ""} onClick={() => setTier(item)}>{inboxTierLabel(item)}<b>{item === "all" ? conversations.length : item === "unread" ? conversations.filter((chat) => chat.unreadCount > 0).length : conversations.filter((chat) => chat.inboxTier === item).length}</b></button>)}</div><div className="chat-list-head"><strong>Inbox</strong><button aria-label="Find a conversation" onClick={() => setComposing(true)}><Search size={16} /></button></div>{filteredConversations.map((item) => <button className={`chat-row ${activeId === item.id ? "active" : ""}`} key={item.id} onClick={() => { setActiveId(item.id); setTarget(item.other); }}><Avatar initials={initials(item.other.name)} color={item.other.color} /><span><strong>{item.other.name}</strong><small>{item.preview}</small></span><time>{relativeTimeLabel(item.lastMessageAt)}{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</time></button>)}{!filteredConversations.length && <p className="empty-inbox">No {tier === "secondary" ? "general" : tier} conversations yet.</p>}</aside><div className="conversation">{activeContact ? <><header><Avatar initials={initials(activeContact.name)} color={activeContact.color} /><div><strong>{activeContact.name}</strong><span><i /> {activeContact.headline || activeContact.company}</span></div><div className="call-actions"><button aria-label="Start voice call" onClick={() => setCall({ target: activeContact, mode: "voice" })}><Phone size={17} /></button><button aria-label="Start video call" onClick={() => setCall({ target: activeContact, mode: "video" })}><Camera size={18} /></button>{investorFor && <button aria-label="Schedule meeting" onClick={() => setMeetingInvestor(investorFor)}><CalendarDays size={18} /></button>}</div></header>{viewer.role === "investor" && activeConversation?.routingScore ? <div className="routing-explanation"><Sparkles size={15} /><span><strong>{activeConversation.routingScore}% relevance · {inboxTierLabel(activeConversation.inboxTier).toLowerCase()}</strong><small>{activeConversation.routingReasons?.slice(0, 2).join(" · ")}</small></span></div> : null}<div className="message-thread">{messages.length > 0 && <div className="message-day">PRIVATE THREAD</div>}{messages.map((item) => <div className={`message ${item.senderProfileId === viewer.id ? "outgoing" : "incoming"}`} key={item.id}>{item.body}<time>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(item.createdAt)}</time></div>)}{messages.length > 0 && messages.length < 3 && <div className="conversation-coach"><span className="eyebrow">NEXT USEFUL STEP</span><strong>{viewer.role === "founder" ? "Turn the introduction into a focused investor update." : "Move from interest to a concrete diligence question."}</strong><p>{viewer.role === "founder" ? "Share one proof point, your current raise, and the decision you would like from this investor." : "Ask for the metric or customer evidence that would change your view of this company."}</p><div><button onClick={() => setDraft(viewer.role === "founder" ? "Quick context: our strongest recent proof point is " : "Could you share the metric that best demonstrates repeatable demand?")}>{viewer.role === "founder" ? "Share proof point" : "Ask for evidence"}</button><button onClick={() => setDraft(viewer.role === "founder" ? "Would a 20-minute intro next week be useful?" : "Would you be open to a 20-minute diligence call next week?")}>Suggest next step</button></div></div>}{!messages.length && <div className="conversation-empty"><MessageCircle size={30} /><h3>Start with context.</h3><p>{viewer.role === "founder" ? "Explain why your company fits this investor. Fayvar will route the first message using the match model." : "Investor outreach is delivered directly to the founder’s inbox."}</p></div>}</div><div className="message-delivery-note">{status}</div><div className="message-composer"><button aria-label="Add attachment"><Plus size={18} /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder={`Message ${activeContact.name}…`} /><button className="send-button" aria-label="Send message" onClick={send}><Send size={17} /></button></div></> : <div className="conversation-empty full"><MessageCircle size={34} /><h3>Select a conversation</h3><p>Or start a new founder–investor introduction.</p></div>}</div></section>{composing && <div className="new-message-popover card"><div><strong>New conversation</strong><button aria-label="Close new conversation" onClick={() => setComposing(false)}><X size={16} /></button></div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${viewer.role === "founder" ? "investors" : "startups"}…`} /></label><div>{availableContacts.slice(0, 30).map((contact) => <button key={contact.id} onClick={() => { setTarget(contact); setMessages([]); setActiveId(conversations.find((item) => item.other.id === contact.id)?.id ?? ""); setComposing(false); }}><Avatar initials={initials(contact.name)} color={contact.color} /><span><strong>{contact.name}</strong><small>{contact.headline || contact.company}</small></span><ArrowUpRight size={15} /></button>)}</div></div>}{meetingInvestor && <ScheduleMeetingModal investor={meetingInvestor} conversationId={activeId} onClose={() => setMeetingInvestor(null)} />}{call && <CallModal target={call.target} mode={call.mode} conversationId={activeId} onClose={() => setCall(null)} />}</div>;
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
  return <Portal><div className="call-overlay"><section className={`call-panel ${mode}`}><div className="call-remote"><video ref={remoteVideo} autoPlay playsInline /><div className={`call-identity ${started ? "connected" : "waiting"}`}><Avatar initials={initials(target.name)} color={target.color} size="large" /><span><h2>{target.name}</h2><p>{state}</p></span></div></div><video className="call-local" ref={localVideo} autoPlay playsInline muted /><div className="call-controls">{!started ? <><button className="decline" aria-label={incomingCall ? "Decline call" : "Cancel call"} onClick={() => finish(incomingCall ? "declined" : "ended")}><PhoneOff size={20} /></button><button className="accept" onClick={begin}>{incomingCall ? <Phone size={20} /> : mode === "video" ? <Camera size={20} /> : <Phone size={20} />}<span>{incomingCall ? "Accept" : "Start"}</span></button></> : <><button className={muted ? "off" : ""} aria-label={muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleMute}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>{mode === "video" && <button className={cameraOff ? "off" : ""} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} onClick={toggleCamera}>{cameraOff ? <VideoOff size={20} /> : <Video size={20} />}</button>}<button className="decline" aria-label="End call" onClick={() => finish()}><PhoneOff size={21} /></button></>}</div><small><i /> WebRTC peer-to-peer media · encrypted in transit</small></section></div></Portal>;
}

function NetworkView({ viewer, onAuth, onMessage, onStartup }: { viewer: Viewer | null; onAuth: () => void; onMessage: (profileId: string) => void; onStartup: (startup: Startup) => void }) {
  const [connected, setConnected] = useState<Set<string>>(new Set(["demo-investor-01", "demo-founder-01"]));
  const [section, setSection] = useState<"founders" | "investors">(viewer?.role === "investor" ? "founders" : "investors");
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All rounds");
  const [location, setLocation] = useState("All locations");
  const [selected, setSelected] = useState<Investor | null>(null);
  if (!viewer) return <GatedView icon={<Users size={30} />} title="Build a circle that opens doors." body="Sign in to explore founders and investors in separate, role-aware networks." onAuth={onAuth} />;
  const sectorOptions = [{ value: "All sectors", label: "Every sector" }, ...Array.from(new Set(startups.map((item) => item.sector))).map((item) => ({ value: item, label: item }))];
  const stageOptions = [{ value: "All rounds", label: "Every round" }, ...Array.from(new Set(startups.map((item) => item.stage))).map((item) => ({ value: item, label: item }))];
  const locationOptions = [{ value: "All locations", label: "Every market" }, ...Array.from(new Set(startups.map((item) => item.location))).sort().map((item) => ({ value: item, label: item }))];
  const filteredInvestors = investors.filter((investor) => (sector === "All sectors" || investor.sectors.includes(sector)) && (stage === "All rounds" || investor.stages.includes(stage)) && (location === "All locations" || investor.locations.includes(location)));
  const filteredFounders = startupIntelligence.filter((startup) => (sector === "All sectors" || startup.sector === sector) && (stage === "All rounds" || startup.stage === stage) && (location === "All locations" || startup.location === location));
  const investorMatches = new Map(recommendationsForFounder(viewer.id, 20).map((item) => [item.investor.profileId, item.match]));
  const startupMatches = new Map(recommendationsForInvestor(viewer.id, 30).map((item) => [item.startup.startupId, item.match]));
  const toggleConnection = (id: string) => setConnected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <div className="workspace-page network-page"><div className="page-title-row"><div><span className="eyebrow">ROLE-AWARE NETWORK</span><h1>{section === "investors" ? "Capital, with the mandate visible." : "Founders, with the operating signal attached."}</h1><p>{section === "investors" ? "See the thesis, stage, cheque and portfolio before opening a profile." : "Filter companies by sector, round and market, then move directly into diligence or conversation."}</p></div><div className="network-tabs role-tabs">{(["founders", "investors"] as const).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item === "founders" ? <Rocket size={15} /> : <CircleDollarSign size={15} />}{item[0].toUpperCase() + item.slice(1)}<b>{item === "founders" ? startups.length : investors.length}</b></button>)}</div></div><section className="network-filter-bar card"><ChoiceMenu label="Sector" icon={<Compass size={13} />} value={sector} options={sectorOptions} onChange={setSector} /><ChoiceMenu label="Funding stage" icon={<Target size={13} />} value={stage} options={stageOptions} onChange={setStage} /><ChoiceMenu label="Market" icon={<MapPin size={13} />} value={location} options={locationOptions} onChange={setLocation} /><strong><Sparkles size={14} /> {section === "investors" ? filteredInvestors.length : filteredFounders.length} visible matches</strong></section>{section === "investors" ? <div className="network-grid investor-network-grid">{filteredInvestors.map((investor) => { const intelligence = investorIntelligence.find((item) => item.profileId === investor.profileId)!; const match = investorMatches.get(investor.profileId); return <article className="person-card investor-card card" key={investor.id}><div className="person-cover" style={{ backgroundImage: `url(${investor.poster})` }} /><div className="investor-card-head"><Avatar initials={investor.initials} color={investor.color} size="large" /><span className={`routing-pill tier-${match?.inboxTier ?? "secondary"}`}>{match ? `${match.reciprocalScore}% fit` : "Investor"}</span></div><h2>{investor.name}</h2><p>{investor.role}</p><div className="thesis-front"><span>INVESTMENT THESIS</span><blockquote>{intelligence.thesis}</blockquote></div><div className="investor-criteria"><span>{investor.ticket}</span><span>{investor.stages.join(" / ")}</span><span>{intelligence.leadPreference}</span></div><div className="person-stat"><BriefcaseBusiness size={15} /><span><strong>{investor.portfolioStartupIds.length}</strong> portfolio companies · {intelligence.responseRate}% response rate</span></div><div className="person-actions"><button className="secondary-button" onClick={() => setSelected(investor)}>Open thesis</button><button className={connected.has(investor.profileId) ? "connected-button" : "connect-button"} onClick={() => toggleConnection(investor.profileId)}>{connected.has(investor.profileId) ? <><Check size={15} /> Connected</> : <><UserPlus size={15} /> Connect</>}</button></div></article>; })}</div> : <div className="founder-network-grid">{filteredFounders.map((record) => { const startup = startups.find((item) => item.id === record.startupId)!; const match = startupMatches.get(record.startupId); return <article className="founder-network-card card" key={record.startupId}><button className="founder-network-image" style={{ backgroundImage: `url(${startup.poster})` }} onClick={() => onStartup(startup)}><span>{record.stage}</span><strong>{startup.tagline}</strong></button><div className="founder-network-body"><div><StartupLogo startup={startup} /><span><h2>{record.name}</h2><p>{record.founderName} · {record.location}</p></span><div className={`match-score tier-${match?.inboxTier ?? "secondary"}`}><strong>{match?.reciprocalScore ?? 0}</strong><small>fit</small></div></div><p>{record.problem}</p><div className="founder-signal-row"><span>₹{record.arrCr} Cr ARR</span><span>{record.growthPercent}% growth</span><span>{record.customers} customers</span></div><footer><button className="secondary-button" onClick={() => onStartup(startup)}>View company</button>{viewer.role === "investor" && <button className="connect-button" onClick={() => onMessage(record.founderProfileId)}><MessageCircle size={15} /> Message founder</button>}</footer></div></article>; })}</div>}{section === "investors" && selected && <InvestorProfileModal investor={selected} onClose={() => setSelected(null)} onMessage={() => onMessage(selected.profileId)} />}</div>;
}

function InvestorProfileModal({ investor, onClose, onMessage }: { investor: Investor; onClose: () => void; onMessage: () => void }) {
  const [scheduling, setScheduling] = useState(false);
  const intelligence = investorIntelligence.find((item) => item.profileId === investor.profileId)!;
  const portfolio = investor.portfolioStartupIds.map((id) => startups.find((startup) => startup.id === id)).filter((startup): startup is Startup => Boolean(startup));
  const matches = startups.filter((startup) => investor.sectors.includes(startup.sector) && investor.stages.includes(startup.stage)).slice(0, 6);
  return <Modal onClose={onClose} wide><div className="thesis-sheet"><aside style={{ backgroundImage: `url(${investor.poster})` }}><div><Avatar initials={investor.initials} color={investor.color} size="large" /><span className="eyebrow">VERIFIED INVESTOR</span><h1>{investor.name}</h1><p>{investor.role}</p></div><div className="thesis-actions"><button className="primary-wide" onClick={onMessage}><MessageCircle size={16} /> Send message</button><button className="secondary-button" onClick={() => setScheduling(true)}><CalendarCheck size={16} /> Schedule</button></div></aside><main><section className="thesis-primary"><span className="eyebrow">INVESTMENT THESIS</span><h2>What {investor.name.split(" ")[0]} is actively looking for</h2><blockquote>{intelligence.thesis}</blockquote><div className="thesis-criteria-grid"><div><span>First cheque</span><strong>₹{intelligence.ticketMinCr}–₹{intelligence.ticketMaxCr} Cr</strong></div><div><span>Stage</span><strong>{intelligence.stages.join(" / ")}</strong></div><div><span>Geography</span><strong>{intelligence.locations.join(" · ")}</strong></div><div><span>Role</span><strong>{intelligence.leadPreference}</strong></div></div><div className="detail-tags">{[...intelligence.primarySectors, ...intelligence.adjacentSectors.slice(0, 2)].map((item) => <span key={item}>{item}</span>)}</div></section><section className="thesis-secondary"><div><span className="eyebrow">PORTFOLIO EVIDENCE</span><h3>{portfolio.length ? `${portfolio.length} disclosed companies` : "Building a first portfolio"}</h3><div className="mini-startup-grid">{(portfolio.length ? portfolio.slice(0, 4) : matches.slice(0, 4)).map((startup) => <div key={startup.id}><StartupLogo startup={startup} size="small" /><span><strong>{startup.name}</strong><small>{startup.sector} · {startup.stage}</small></span></div>)}</div></div><div className="investor-operating-data"><span className="eyebrow">OPERATING SIGNAL</span><p><strong>{intelligence.responseRate}%</strong> response rate</p><p><strong>₹{intelligence.availableCapitalCr} Cr</strong> available mandate</p><p><strong>{intelligence.businessModels.join(" · ")}</strong> preferred models</p></div></section></main></div>{scheduling && <ScheduleMeetingModal investor={investor} onClose={() => setScheduling(false)} />}</Modal>;
}

function ScheduleMeetingModal({ investor, onClose, conversationId }: { investor: Pick<Investor, "profileId" | "name">; onClose: () => void; conversationId?: string }) {
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
  return <Portal><div className="schedule-overlay"><div className="schedule-card"><button className="modal-close" aria-label="Close scheduling" onClick={onClose}><X size={18} /></button><span className="eyebrow">CALENDAR</span><h2>Meet {investor.name}</h2><p>{status}</p><div className="slot-grid">{slots.map((slot) => <button key={slot.id} className={selected === slot.id ? "active" : ""} onClick={() => setSelected(slot.id)}><strong>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(slot.startsAt)}</strong><span>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(slot.startsAt)}</span></button>)}</div>{slots.length > 0 && <label><span>What would you like to discuss?</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="A little context makes the meeting more useful…" /></label>}<button className="primary-wide" disabled={!selected || busy} onClick={book}>{busy ? "Reserving…" : "Confirm meeting"}</button></div></div></Portal>;
}

function GatedView({ icon, title, body, onAuth }: { icon: React.ReactNode; title: string; body: string; onAuth: () => void }) {
  return <div className="gated-page"><div className="gated-glow" /><section className="gated-card card"><div className="gated-icon">{icon}</div><span className="eyebrow">MEMBERS ONLY</span><h1>{title}</h1><p>{body}</p><button className="google-button" onClick={onAuth}><Mail size={16} /> Sign in with email</button><small>Real member accounts are free during early access.</small></section></div>;
}

function AuthModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => Promise<void> }) {
  type DemoPersona = { id: string; email: string; password: string; displayName: string; role: Role; headline: string; company: string; scenario: string; featured: boolean };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [personaRole, setPersonaRole] = useState<Role>("founder");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/demo-auth").then((response) => response.json()).then((payload: { accounts?: DemoPersona[] }) => setPersonas(payload.accounts ?? [])).catch(() => undefined);
  }, []);

  const fillDemoLogin = (kind: keyof typeof DEMO_LOGINS) => {
    const demo = DEMO_LOGINS[kind];
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    setMessage(`${demo.label} credentials are ready. Select Sign in securely.`);
  };

  const selectPersona = (persona: DemoPersona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setError("");
    setMessage(`${persona.displayName} selected · ${persona.scenario}`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/demo-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json() as { error?: string };
      if (response.status === 404) throw new Error("Choose one of the 50 Fayvar demo identities.");
      if (!response.ok) throw new Error(payload.error || "Demo sign-in could not be completed.");
      await onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const visiblePersonas = personas.filter((persona) => persona.role === personaRole && (showAll || persona.featured));
  return <Modal onClose={onClose} wide><div className="auth-layout auth-2"><section className="auth-story"><Logo /><span className="auth-kicker"><Sparkles size={14} /> 50 TESTABLE IDENTITIES</span><h2>Test the network<br />from every side.</h2><p>Each identity has structured sector, stage, market, cheque and portfolio information for real routing and recommendation scenarios.</p><div className="auth-proof"><div className="proof-avatars"><Avatar initials="MJ" color="#65d6a6" size="small" /><Avatar initials="RM" color="#f3f1ea" size="small" /><Avatar initials="AM" color="#78838f" size="small" /></div><div><strong>30 founders · 20 investors</strong><span>Persistent messages, meetings and role permissions</span></div></div></section><section className="auth-form"><span className="auth-step">SCENARIO ACCESS</span><h1>Choose a test identity.</h1><p>Featured accounts cover the main routing cases. Open all accounts to inspect the complete synthetic network.</p><div className="persona-role-tabs"><button className={personaRole === "founder" ? "active" : ""} onClick={() => setPersonaRole("founder")}><Rocket size={15} /> Founders <b>30</b></button><button className={personaRole === "investor" ? "active" : ""} onClick={() => setPersonaRole("investor")}><CircleDollarSign size={15} /> Investors <b>20</b></button></div><div className="persona-list">{visiblePersonas.map((persona) => <button type="button" className={email === persona.email ? "selected" : ""} key={persona.id} onClick={() => selectPersona(persona)}><Avatar initials={initials(persona.displayName)} color={persona.role === "founder" ? "#2a6954" : "#465363"} size="small" /><span><strong>{persona.displayName}</strong><small>{persona.company} · {persona.scenario}</small></span>{email === persona.email ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>)}</div><button className="show-all-personas" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show featured scenarios" : `Browse all ${personaRole === "founder" ? 30 : 20} accounts`}</button>{!personas.length && <div className="demo-account-grid" aria-label="Primary demo accounts"><button type="button" onClick={() => fillDemoLogin("founder")}><span className="demo-account-icon founder"><Rocket size={15} /></span><span><strong>Founder demo</strong><small>{DEMO_LOGINS.founder.email}</small></span></button><button type="button" onClick={() => fillDemoLogin("investor")}><span className="demo-account-icon investor"><CircleDollarSign size={15} /></span><span><strong>Investor demo</strong><small>{DEMO_LOGINS.investor.email}</small></span></button></div>}<form className="auth-email-form compact-auth" onSubmit={submit}><label className="auth-field"><span>Demo email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Choose an identity above" required /></label><label className="auth-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Filled automatically" required minLength={8} /></label>{error && <p className="auth-alert auth-error" role="alert">{error}</p>}{message && <p className="auth-alert auth-message" role="status"><BadgeCheck size={15} />{message}</p>}<button className="primary-wide auth-submit" disabled={busy}>{busy ? "Opening workspace…" : "Enter Fayvar"}</button></form><div className="demo-note secure-note"><BadgeCheck size={14} /><span><strong>Server-validated demo access</strong>All 50 identities use expiring HttpOnly sessions. Demo credentials are intentionally visible.</span></div></section></div></Modal>;
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
      for (let offset = 0, part = 0; offset < file.size; offset += chunkSize, part += 1) {
        const chunk = file.slice(offset, Math.min(file.size, offset + chunkSize));
        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("PUT", `/api/uploads?id=${encodeURIComponent(uploadId)}&part=${part}`);
          request.setRequestHeader("content-type", "application/octet-stream");
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
  return <Modal onClose={onClose} wide><div className="startup-detail"><div className="startup-detail-hero" style={{ backgroundImage: `url(${startup.poster})` }}><StartupLogo startup={startup} size="large" /><span>{startup.sector} · {startup.stage}</span><h1>{startup.name}</h1><p>{startup.tagline}</p></div><div className="startup-detail-body"><div className="detail-main"><div className="detail-tags">{startup.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h2>Why now</h2><p>{startup.description}</p><div className="founder-note"><span className="quote-mark">“</span><p>We spent eighteen months inside customer operations before writing the first line of product. The problem is urgent, measurable, and ready for a different approach.</p><div><Avatar initials={startup.initials + "F"} color={startup.color} size="small" /><span><strong>{startup.name} founding team</strong><small>Verified founder profile</small></span></div></div></div><aside className="detail-sidebar"><div className="detail-metrics"><div><Target size={17} /><span>Current round</span><strong>{startup.ask}</strong></div><div><LineChart size={17} /><span>Traction</span><strong>{startup.growth}</strong></div><div><Users size={17} /><span>Team</span><strong>{startup.team}</strong></div><div><CalendarDays size={17} /><span>Founded</span><strong>{startup.founded}</strong></div></div><button className="primary-wide" onClick={onMessage}><Mail size={15} /> Request introduction</button><button className="secondary-button full-width" onClick={onFollow}>{followed ? <><Check size={15} /> Following</> : <><Plus size={15} /> Follow startup</>}</button><small className="verified-note"><BadgeCheck size={14} /> Identity and traction verified by Fayvar</small></aside></div></div></Modal>;
}
