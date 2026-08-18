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
  mediaType: "video" | "image" | "none";
  mediaUrl: string;
  mediaAssetId?: string;
  poster: string;
  mediaLabel: string;
  mediaTitle: string;
  duration?: string;
  likes: number;
  shares: number;
  comments: CommentItem[];
  ownedByViewer?: boolean;
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
    mediaUrl: "/videos/founder-room.mp4",
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
    mediaUrl: "/videos/startup-meeting.mp4",
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
  {
    id: "post-koru-workshop",
    startupId: "koru",
    startup: "Koru Robotics",
    logo: "K",
    logoColor: "#f0b74f",
    meta: "Deeptech · Chennai · 1d",
    headline: "What six months inside a refinery taught us about robot design.",
    body: "The best prototype wasn’t the smartest one. It was the one an inspection crew could repair with the tools already in their van. A quick look inside this week’s field review.",
    tags: ["Robotics", "BuildInPublic", "IndustrialTech"],
    mediaType: "video",
    mediaUrl: "/videos/team-brainstorm.mp4",
    poster: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "FROM THE WORKSHOP · 0:42",
    mediaTitle: "Designed with the people who use it.",
    duration: "0:42",
    likes: 218,
    shares: 17,
    comments: [
      { id: "c5", author: "Leena Iyer", initials: "LI", role: "Partner, First Light", body: "This is the kind of customer empathy that becomes a technical moat.", time: "5h" },
      { id: "c6", author: "Omar Siddiqui", initials: "OS", role: "Founder & angel", body: "Would love to see the before-and-after inspection time.", time: "3h" },
    ],
  },
  {
    id: "post-fieldly-water",
    startupId: "fieldly",
    startup: "Fieldly",
    logo: "F",
    logoColor: "#6c9d4e",
    meta: "Agritech · Pune · 2d",
    headline: "2,800 farms. One lesson: recommendations must arrive at the right moment.",
    body: "Our sensors matter, but timing matters more. We rebuilt Fieldly around crop moments—not dashboards—and water usage dropped another 8% this season.",
    tags: ["Agritech", "Water", "ProductLearning"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "FIELD NOTE · MAHARASHTRA",
    mediaTitle: "Better decisions, right when they matter.",
    likes: 302,
    shares: 34,
    comments: [
      { id: "c7", author: "Meera Nair", initials: "MN", role: "VP, Zenith Ventures", body: "The shift from information to timely action is exactly right. Strong progress.", time: "1d" },
    ],
  },
  {
    id: "post-mindmesh-demo",
    startupId: "mindmesh",
    startup: "Mindmesh AI",
    logo: "M",
    logoColor: "#8b67b7",
    meta: "Enterprise AI · Hyderabad · 2d",
    headline: "Your team already has the answer. We help them find it.",
    body: "Watch Mindmesh connect a six-month-old architecture decision to today’s incident—in under thirty seconds, with every source attached.",
    tags: ["EnterpriseAI", "DeveloperTools", "Demo"],
    mediaType: "video",
    mediaUrl: "/videos/startup-meeting.mp4",
    poster: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "PRODUCT DEMO · 1:06",
    mediaTitle: "The context your team thought it lost.",
    duration: "1:06",
    likes: 421,
    shares: 63,
    comments: [
      { id: "c8", author: "Kabir Shah", initials: "KS", role: "Operator & angel", body: "Source-backed answers are the important distinction here. Clean demo.", time: "1d" },
      { id: "c9", author: "Aarav Sethi", initials: "AS", role: "CTO, Stackframe", body: "We’ve been using this for incident reviews. It genuinely changes the meeting.", time: "18h" },
    ],
  },
  {
    id: "post-rhea-thesis",
    startupId: "investor-rhea",
    startup: "Rhea Mehta",
    logo: "RM",
    logoColor: "#4f6ff3",
    meta: "Partner, Northstar Ventures · 3d",
    headline: "What I’m looking for in climate founders this quarter.",
    body: "Not another carbon dashboard. I’m excited by teams turning proven science into products operators can deploy without changing how their entire business works. Pre-seed to Seed, India-first with global potential.",
    tags: ["InvestorThesis", "Climate", "OpenToPitches"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "INVESTOR NOTE · AUGUST",
    mediaTitle: "Climate products operators actually want.",
    likes: 518,
    shares: 86,
    comments: [
      { id: "c10", author: "Mira Joshi", initials: "MJ", role: "Founder, EmberGrid", body: "This framing around deployment friction really resonates.", time: "2d" },
    ],
  },
  {
    id: "post-novi-hiring",
    startupId: "novihealth",
    startup: "Novi Health",
    logo: "N",
    logoColor: "#ef806d",
    meta: "Healthtech · Mumbai · 3d",
    headline: "We’re hiring our first Head of Clinical Operations.",
    body: "This person will shape how compassionate, protocol-led care reaches the next 100,000 mothers. Healthcare operations experience matters; curiosity and humility matter more.",
    tags: ["Hiring", "Healthtech", "Mumbai"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "JOIN THE TEAM · MUMBAI",
    mediaTitle: "Help us make care feel closer.",
    likes: 267,
    shares: 72,
    comments: [
      { id: "c11", author: "Sana Kapoor", initials: "SK", role: "Healthcare operator", body: "Sharing this with two exceptional operators in my network.", time: "2d" },
    ],
  },
  {
    id: "post-fieldly-founder",
    startupId: "fieldly",
    startup: "Fieldly",
    logo: "F",
    logoColor: "#6c9d4e",
    meta: "Agritech · Pune · 4d",
    headline: "The first version failed in a field before lunch.",
    body: "Our founder, Nikhil, tells the story of the broken enclosure that forced us to rethink how hardware for Indian farms should actually be built.",
    tags: ["FounderStory", "Hardware", "Agritech"],
    mediaType: "video",
    mediaUrl: "/videos/founder-room.mp4",
    poster: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "FOUNDER STORY · 1:34",
    mediaTitle: "Failure was the first field test.",
    duration: "1:34",
    likes: 193,
    shares: 21,
    comments: [
      { id: "c12", author: "Dev Malhotra", initials: "DM", role: "Principal, Springboard", body: "The best founder stories are this specific. Rooting for the team.", time: "3d" },
    ],
  },
  {
    id: "post-dev-question",
    startupId: "investor-dev",
    startup: "Dev Malhotra",
    logo: "DM",
    logoColor: "#ff6b4a",
    meta: "Principal, Springboard · 4d",
    headline: "Founders: what’s one metric investors consistently misunderstand?",
    body: "I’m putting together next week’s office-hours session and want to make it useful. Share the metric, why it’s misleading, and what we should ask instead.",
    tags: ["FounderQuestion", "OfficeHours", "Fundraising"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "COMMUNITY QUESTION",
    mediaTitle: "Help investors ask better questions.",
    likes: 349,
    shares: 45,
    comments: [
      { id: "c13", author: "Anya Rao", initials: "AR", role: "Founder, Loomly Labs", body: "For marketplaces: repeat GMV without separating supply-acquisition incentives.", time: "3d" },
      { id: "c14", author: "Rohan Batra", initials: "RB", role: "Founder, Cartwise", body: "Logo retention without showing expansion by customer maturity cohort.", time: "3d" },
    ],
  },
  {
    id: "post-koru-pilot",
    startupId: "koru",
    startup: "Koru Robotics",
    logo: "K",
    logoColor: "#f0b74f",
    meta: "Deeptech · Chennai · 5d",
    headline: "Pilot number six is live—and this one is 40 metres underground.",
    body: "Our crawler completed its first autonomous inspection inside a live utility tunnel. Zero shutdown hours, 2.3 kilometres mapped, and one very proud field team.",
    tags: ["Milestone", "Robotics", "Infrastructure"],
    mediaType: "image",
    mediaUrl: "",
    poster: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "MILESTONE · PILOT 06",
    mediaTitle: "2.3 km mapped without a shutdown.",
    likes: 612,
    shares: 104,
    comments: [
      { id: "c15", author: "Omar Siddiqui", initials: "OS", role: "Founder & angel", body: "Hard-earned milestone. The field footage must have been incredible.", time: "4d" },
    ],
  },
  {
    id: "post-ember-people",
    startupId: "embergrid",
    startup: "EmberGrid",
    logo: "E",
    logoColor: "#ff6b4a",
    meta: "Climate tech · Bengaluru · 6d",
    headline: "A company is the conversations it keeps having.",
    body: "This week: thermal models, factory-floor constraints, three terrible coffee experiments, and the decision that finally made our next module 18% easier to install.",
    tags: ["Team", "BehindTheScenes", "ClimateTech"],
    mediaType: "video",
    mediaUrl: "/videos/team-brainstorm.mp4",
    poster: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=86",
    mediaLabel: "BEHIND THE BUILD · 0:38",
    mediaTitle: "The week between the milestones.",
    duration: "0:38",
    likes: 286,
    shares: 19,
    comments: [
      { id: "c16", author: "Leena Iyer", initials: "LI", role: "Partner, First Light", body: "Love seeing the unpolished middle. That’s where companies are made.", time: "5d" },
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
