export type Startup = {
  id: string;
  name: string;
  initials: string;
  sector: string;
  stage: string;
  location: string;
  tagline: string;
  description: string;
  ask: string;
  growth: string;
  signal: string;
  founded: string;
  team: string;
  color: string;
  tags: string[];
  poster: string;
};

export type CommentItem = {
  id: string;
  author: string;
  initials: string;
  role: string;
  body: string;
  time: string;
};

export type Post = {
  id: string;
  startupId: string;
  startup: string;
  logo: string;
  logoColor: string;
  meta: string;
  headline: string;
  body: string;
  tags: string[];
  mediaType: "video" | "image";
  mediaUrl: string;
  poster: string;
  mediaLabel: string;
  mediaTitle: string;
  duration?: string;
  likes: number;
  shares: number;
  comments: CommentItem[];
};

export const startups: Startup[] = [
  {
    id: "embergrid",
    name: "EmberGrid",
    initials: "E",
    sector: "Climate tech",
    stage: "Seed",
    location: "Bengaluru",
    tagline: "Clean heat, whenever industry needs it.",
    description: "Modular thermal batteries that store renewable power as high-temperature heat, helping Indian factories replace gas and cut energy spend.",
    ask: "Raising ₹18 Cr",
    growth: "₹1.8 Cr ARR",
    signal: "7 paid pilots",
    founded: "2023",
    team: "14 people",
    color: "#0f7657",
    tags: ["Energy storage", "Manufacturing", "Climate"],
    poster: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1400&q=86",
  },
  {
    id: "novihealth",
    name: "Novi Health",
    initials: "N",
    sector: "Healthtech",
    stage: "Seed",
    location: "Mumbai",
    tagline: "Continuous care for every pregnancy.",
    description: "An AI-assisted care platform connecting expecting mothers in tier-two cities to clinicians, diagnostics, and round-the-clock guidance.",
    ask: "Raising ₹9 Cr",
    growth: "48% MoM",
    signal: "12k members",
    founded: "2024",
    team: "11 people",
    color: "#e67967",
    tags: ["Maternal health", "AI", "Care delivery"],
    poster: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=86",
  },
  {
    id: "orbitpay",
    name: "OrbitPay",
    initials: "O",
    sector: "Fintech",
    stage: "Pre-Series A",
    location: "Gurugram",
    tagline: "One treasury layer for borderless teams.",
    description: "Multi-currency accounts, compliant vendor payments, and cash-flow intelligence for Indian companies selling to the world.",
    ask: "Raising ₹12 Cr",
    growth: "$2.4M GTV",
    signal: "92% retention",
    founded: "2022",
    team: "19 people",
    color: "#6571c7",
    tags: ["Payments", "B2B", "Global trade"],
    poster: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=86",
  },
  {
    id: "koru",
    name: "Koru Robotics",
    initials: "K",
    sector: "Deeptech",
    stage: "Seed",
    location: "Chennai",
    tagline: "Robotic inspection for hard-to-reach infrastructure.",
    description: "Autonomous crawling robots and vision intelligence that detect faults in pipelines before they become expensive failures.",
    ask: "Raising ₹15 Cr",
    growth: "6 active pilots",
    signal: "3 patents filed",
    founded: "2023",
    team: "16 people",
    color: "#d6a945",
    tags: ["Robotics", "Industrial AI", "Infrastructure"],
    poster: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=86",
  },
  {
    id: "fieldly",
    name: "Fieldly",
    initials: "F",
    sector: "Agritech",
    stage: "Pre-seed",
    location: "Pune",
    tagline: "Better crop decisions from one tiny sensor.",
    description: "Low-cost field sensors and local-language recommendations that help small farms use less water and increase yield.",
    ask: "Raising ₹4 Cr",
    growth: "2,800 farms",
    signal: "31% water saved",
    founded: "2024",
    team: "8 people",
    color: "#6c9d4e",
    tags: ["Agriculture", "IoT", "Water"],
    poster: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=86",
  },
  {
    id: "mindmesh",
    name: "Mindmesh AI",
    initials: "M",
    sector: "Enterprise AI",
    stage: "Seed",
    location: "Hyderabad",
    tagline: "The operating memory for technical teams.",
    description: "A private AI knowledge layer that turns scattered decisions, calls, and code context into trusted answers for engineering teams.",
    ask: "Raising ₹10 Cr",
    growth: "$21k MRR",
    signal: "9 design partners",
    founded: "2023",
    team: "12 people",
    color: "#8b67b7",
    tags: ["AI", "Future of work", "Developer tools"],
    poster: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=86",
  },
];

export const initialPosts: Post[] = [
  {
    id: "post-ember-story",
    startupId: "embergrid",
    startup: "EmberGrid",
    logo: "E",
    logoColor: "#0f7657",
    meta: "Climate tech · Bengaluru · 2h",
    headline: "Making clean energy work after the sun goes down.",
    body: "We’re building modular thermal batteries that help Indian factories cut energy costs by 40%. Here’s our story in 90 seconds.",
    tags: ["Climate", "Energy", "SeedRound"],
    mediaType: "video",
    mediaUrl: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4",
    poster: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "FOUNDER STORY · 1:28",
    mediaTitle: "Energy storage, reimagined.",
    duration: "1:28",
    likes: 249,
    shares: 12,
    comments: [
      { id: "c1", author: "Rhea Mehta", initials: "RM", role: "Partner, Northstar Ventures", body: "The industrial heat wedge is compelling. Would love to understand the payback period on the first installation.", time: "48m" },
      { id: "c2", author: "Kabir Shah", initials: "KS", role: "Climate angel", body: "Strong founder clarity—and exactly the kind of hard-tech India should be exporting.", time: "21m" },
    ],
  },
  {
    id: "post-novi-demo",
    startupId: "novihealth",
    startup: "Novi Health",
    logo: "N",
    logoColor: "#e67967",
    meta: "Healthtech · Mumbai · 5h",
    headline: "A care companion that speaks her language.",
    body: "Today we crossed 12,000 supported pregnancies across Maharashtra. Our clinical team shares why trust—not technology—is the real product.",
    tags: ["Healthtech", "India", "Impact"],
    mediaType: "video",
    mediaUrl: "https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_30fps.mp4",
    poster: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "TEAM STORY · 2:04",
    mediaTitle: "Care without distance.",
    duration: "2:04",
    likes: 184,
    shares: 26,
    comments: [
      { id: "c3", author: "Dev Malhotra", initials: "DM", role: "Principal, Springboard", body: "That retention curve is unusually strong for care delivery. Congratulations to the whole team.", time: "1h" },
    ],
  },
  {
    id: "post-orbit-milestone",
    startupId: "orbitpay",
    startup: "OrbitPay",
    logo: "O",
    logoColor: "#6571c7",
    meta: "Fintech · Gurugram · 1d",
    headline: "$2.4M moved across 18 currencies—and we’re just getting started.",
    body: "A year ago this was a spreadsheet and a stubborn problem. Today 86 teams run global vendor payments through OrbitPay. Thank you to every design partner who pushed us forward.",
    tags: ["Milestone", "Fintech", "GlobalSaaS"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "MILESTONE · JULY 2026",
    mediaTitle: "Built in India. Moving money worldwide.",
    likes: 376,
    shares: 41,
    comments: [
      { id: "c4", author: "Aditi Rao", initials: "AR", role: "Founder, LumenWorks", body: "OrbitPay saved our finance team days every month. Thrilled to be an early customer.", time: "8h" },
    ],
  },
];

export const investors = [
  { id: "rhea", name: "Rhea Mehta", initials: "RM", role: "Partner, Northstar Ventures", thesis: "Climate · Deeptech · Seed", portfolio: 18, color: "#d97761" },
  { id: "dev", name: "Dev Malhotra", initials: "DM", role: "Principal, Springboard", thesis: "Healthtech · Consumer · Series A", portfolio: 24, color: "#6672c6" },
  { id: "kabir", name: "Kabir Shah", initials: "KS", role: "Operator & angel", thesis: "Climate · B2B SaaS · Pre-seed", portfolio: 11, color: "#409170" },
  { id: "leena", name: "Leena Iyer", initials: "LI", role: "Partner, First Light", thesis: "Fintech · Future of work · Seed", portfolio: 31, color: "#a06ab2" },
  { id: "omar", name: "Omar Siddiqui", initials: "OS", role: "Founder & angel", thesis: "AI · Developer tools · Seed", portfolio: 15, color: "#b88a3c" },
  { id: "meera", name: "Meera Nair", initials: "MN", role: "VP, Zenith Ventures", thesis: "Agritech · Climate · Series A", portfolio: 22, color: "#6a9451" },
];
