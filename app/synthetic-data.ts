export type Startup = {
  id: string;
  founderProfileId: string;
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
  createdAt: number;
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
  createdAt: number;
  sourceLabel?: string;
  sourceUrl?: string;
  ownedByViewer?: boolean;
};

export type Investor = {
  id: string;
  profileId: string;
  name: string;
  initials: string;
  role: string;
  firm: string;
  bio: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  thesis: string;
  portfolioStartupIds: string[];
  ticket: string;
  color: string;
  poster: string;
};

export type DemoMember = {
  id: string;
  name: string;
  role: "founder" | "investor";
  headline: string;
  company: string;
  bio: string;
  color: string;
  sectors: string[];
  stages: string[];
  locations: string[];
  portfolioStartupIds: string[];
};

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 18, 8, 0, 0);
const colors = ["#19745c", "#db6b56", "#5567d8", "#c49331", "#875cb0", "#44844e", "#167f92", "#c55779", "#536a7f", "#a65b40"];
const photoIds = [3184465, 3184292, 3861969, 3184436, 3184338, 3184325, 3760263, 3823488, 3861458, 7656743, 6476584, 5905445, 7688336, 1181406, 1181675, 3184418, 3184287, 3182773, 3184423, 3184398, 373543, 269077, 6153354, 7567443, 325229, 1591447, 2280571, 2280551, 3862370, 3183197, 3183150, 3182765, 3182826, 3764014, 3768126, 3769021, 4050315, 7413915, 3184657, 1181396];
const pexelsPhoto = (index: number, width = 1400) => `https://images.pexels.com/photos/${photoIds[index % photoIds.length]}/pexels-photo-${photoIds[index % photoIds.length]}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

const startupSeeds = [
  ["embergrid", "EmberGrid", "Climate tech", "Seed", "Bengaluru", "Clean heat, whenever industry needs it."],
  ["novihealth", "Novi Health", "Healthtech", "Seed", "Mumbai", "Continuous care for every pregnancy."],
  ["orbitpay", "OrbitPay", "Fintech", "Pre-Series A", "Gurugram", "One treasury layer for borderless teams."],
  ["koru", "Koru Robotics", "Deeptech", "Seed", "Chennai", "Robotic inspection for critical infrastructure."],
  ["fieldly", "Fieldly", "Agritech", "Pre-seed", "Pune", "Better crop decisions from one tiny sensor."],
  ["mindmesh", "Mindmesh AI", "Enterprise AI", "Seed", "Hyderabad", "The operating memory for technical teams."],
  ["aerovault", "AeroVault", "Deeptech", "Series A", "Bengaluru", "Autonomous inventory for high-throughput warehouses."],
  ["circularly", "Circularly", "Climate tech", "Pre-Series A", "Delhi", "Traceable materials for a circular supply chain."],
  ["medlane", "MedLane", "Healthtech", "Series A", "Jaipur", "Specialist care that reaches smaller cities."],
  ["ledgerleaf", "LedgerLeaf", "Fintech", "Seed", "Ahmedabad", "Cash-flow clarity for India’s small manufacturers."],
  ["quillai", "Quill AI", "Enterprise AI", "Pre-seed", "Kochi", "Compliance work that writes itself—with receipts."],
  ["sunharvest", "SunHarvest", "Agritech", "Seed", "Nashik", "Solar cold rooms that protect every harvest."],
  ["bluecurrent", "BlueCurrent", "Climate tech", "Series A", "Goa", "Water intelligence for fast-growing cities."],
  ["craftlane", "CraftLane", "Consumer", "Seed", "Jaipur", "Independent Indian makers, discovered globally."],
  ["railbird", "Railbird", "Mobility", "Pre-Series A", "Chennai", "Predictive maintenance for urban rail networks."],
  ["learnloop", "LearnLoop", "Edtech", "Seed", "Noida", "Career practice that feels like the real job."],
  ["fluxcharge", "FluxCharge", "Mobility", "Series A", "Pune", "Reliable charging for commercial EV fleets."],
  ["prismbio", "PrismBio", "Biotech", "Seed", "Hyderabad", "Faster diagnostics from programmable proteins."],
  ["dockstack", "DockStack", "B2B SaaS", "Pre-seed", "Bengaluru", "The command centre for modern freight teams."],
  ["homeward", "Homeward", "Proptech", "Seed", "Mumbai", "Trusted rental operations for every building."],
  ["safesight", "SafeSight", "Deeptech", "Pre-Series A", "Chennai", "Computer vision that makes factory floors safer."],
  ["rootwise", "Rootwise", "Agritech", "Seed", "Indore", "Biological crop protection built for the tropics."],
  ["tandemcare", "TandemCare", "Healthtech", "Pre-seed", "Kolkata", "Care coordination for families managing chronic illness."],
  ["papercut", "Papercut", "Fintech", "Seed", "Gurugram", "Invoices paid on time, without awkward follow-ups."],
  ["nimbusops", "NimbusOps", "B2B SaaS", "Series A", "Bengaluru", "Cloud reliability for teams without a platform army."],
  ["kindred", "Kindred", "Consumer", "Pre-seed", "Mumbai", "Small-group travel designed around real friendships."],
  ["terraframe", "TerraFrame", "Climate tech", "Seed", "Surat", "Low-carbon building panels made from crop residue."],
  ["voicebridge", "VoiceBridge", "Enterprise AI", "Pre-Series A", "Hyderabad", "Voice agents that understand Indian businesses."],
  ["orbitclass", "OrbitClass", "Edtech", "Seed", "Bhubaneswar", "Live science labs for schools without laboratories."],
  ["cargokite", "CargoKite", "Mobility", "Seed", "Kochi", "Electric coastal logistics for a cleaner supply chain."],
] as const;

const askByStage: Record<string, string> = { "Pre-seed": "Raising ₹4 Cr", Seed: "Raising ₹10 Cr", "Pre-Series A": "Raising ₹18 Cr", "Series A": "Raising ₹35 Cr" };

export const startups: Startup[] = startupSeeds.map(([id, name, sector, stage, location, tagline], index) => ({
  id,
  founderProfileId: `demo-founder-${String(index + 1).padStart(2, "0")}`,
  name,
  initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2),
  sector,
  stage,
  location,
  tagline,
  description: `${name} is a synthetic Fayvar demo company building practical ${sector.toLowerCase()} infrastructure for fast-growing teams and communities. Its traction and fundraising figures are illustrative, not investment claims.`,
  ask: askByStage[stage],
  growth: index % 3 === 0 ? `${12 + index * 2}% MoM` : index % 3 === 1 ? `${4 + index} paid pilots` : `₹${(1.2 + index * .18).toFixed(1)} Cr ARR`,
  signal: index % 2 ? `${82 + (index % 13)}% retention` : `${3 + (index % 9)} design partners`,
  founded: String(2021 + (index % 5)),
  team: `${7 + index} people`,
  color: colors[index % colors.length],
  tags: [sector.replace(/\s+/g, ""), stage.replace(/\W/g, ""), location],
  poster: pexelsPhoto(index),
  createdAt: NOW - index * DAY,
}));

const investorSeeds = [
  ["rhea", "Rhea Mehta", "Partner", "Northstar Ventures", ["Climate tech", "Deeptech"], ["Pre-seed", "Seed"], ["Bengaluru", "Mumbai"]],
  ["dev", "Dev Malhotra", "Principal", "Springboard Capital", ["Healthtech", "Consumer"], ["Seed", "Series A"], ["Mumbai", "Delhi"]],
  ["kabir", "Kabir Shah", "Operator & angel", "Independent", ["Climate tech", "B2B SaaS"], ["Pre-seed", "Seed"], ["Bengaluru", "Pune"]],
  ["leena", "Leena Iyer", "Partner", "First Light", ["Fintech", "Enterprise AI"], ["Seed", "Pre-Series A"], ["Gurugram", "Bengaluru"]],
  ["omar", "Omar Siddiqui", "Founder & angel", "Operator Collective", ["Enterprise AI", "Deeptech"], ["Pre-seed", "Seed"], ["Hyderabad", "Chennai"]],
  ["meera", "Meera Nair", "VP", "Zenith Ventures", ["Agritech", "Climate tech"], ["Seed", "Series A"], ["Pune", "Bengaluru"]],
  ["anika", "Anika Bose", "Managing Partner", "Riverline Partners", ["Healthtech", "Biotech"], ["Seed", "Pre-Series A"], ["Kolkata", "Hyderabad"]],
  ["arjun", "Arjun Menon", "Investment Director", "Harbour Peak", ["Mobility", "Climate tech"], ["Pre-Series A", "Series A"], ["Chennai", "Kochi"]],
  ["sana", "Sana Kapoor", "Partner", "Mosaic Seed", ["Consumer", "Edtech"], ["Pre-seed", "Seed"], ["Mumbai", "Delhi"]],
  ["vikram", "Vikram Rao", "Principal", "Foundry Ventures", ["Deeptech", "B2B SaaS"], ["Seed", "Pre-Series A"], ["Bengaluru", "Chennai"]],
  ["tara", "Tara Joseph", "Angel investor", "Independent", ["Healthtech", "Consumer"], ["Pre-seed", "Seed"], ["Kochi", "Bengaluru"]],
  ["neel", "Neel Batra", "Partner", "Vector Lake", ["Fintech", "B2B SaaS"], ["Seed", "Series A"], ["Gurugram", "Mumbai"]],
  ["ishita", "Ishita Sen", "Principal", "Daybreak Fund", ["Agritech", "Climate tech"], ["Pre-seed", "Seed"], ["Indore", "Pune"]],
  ["rohan", "Rohan Kulkarni", "Managing Director", "Latitude Capital", ["Enterprise AI", "Fintech"], ["Pre-Series A", "Series A"], ["Bengaluru", "Hyderabad"]],
  ["maya", "Maya Thomas", "Partner", "Juniper Ventures", ["Edtech", "Healthtech"], ["Seed", "Pre-Series A"], ["Noida", "Mumbai"]],
  ["aditya", "Aditya Khanna", "Angel investor", "Operator Syndicate", ["Mobility", "Deeptech"], ["Pre-seed", "Seed"], ["Delhi", "Chennai"]],
  ["naina", "Naina Patel", "Principal", "Crescent Seed", ["Consumer", "Fintech"], ["Pre-seed", "Seed"], ["Ahmedabad", "Mumbai"]],
  ["farhan", "Farhan Ali", "Partner", "Meridian Labs", ["Biotech", "Deeptech"], ["Seed", "Series A"], ["Hyderabad", "Bengaluru"]],
  ["priya", "Priya Desai", "Investment Director", "Good Ground", ["Climate tech", "Agritech"], ["Pre-Series A", "Series A"], ["Surat", "Pune"]],
  ["samir", "Samir Jain", "Venture Partner", "Signal House", ["B2B SaaS", "Enterprise AI"], ["Seed", "Pre-Series A"], ["Bengaluru", "Gurugram"]],
] as const;

export const investors: Investor[] = investorSeeds.map(([id, name, role, firm, sectors, stages, locations], index) => {
  const portfolioStartupIds = startups.filter((startup, startupIndex) => sectors.some((sector) => sector === startup.sector) && startupIndex % 4 === index % 4).slice(0, 5).map((startup) => startup.id);
  return {
    id,
    profileId: `demo-investor-${String(index + 1).padStart(2, "0")}`,
    name,
    initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2),
    role: `${role}, ${firm}`,
    firm,
    bio: `Backs thoughtful founders turning complex ${sectors.join(" and ").toLowerCase()} problems into durable, category-defining companies. Synthetic demo profile.`,
    sectors: [...sectors],
    stages: [...stages],
    locations: [...locations],
    thesis: `${sectors.join(" · ")} · ${stages.join(" / ")}`,
    portfolioStartupIds,
    ticket: index % 3 === 0 ? "₹50L–₹2Cr" : index % 3 === 1 ? "₹2Cr–₹8Cr" : "₹8Cr–₹20Cr",
    color: colors[(index + 2) % colors.length],
    poster: pexelsPhoto(index + 20, 900),
  };
});

const founderNames = [
  "Mira Joshi", "Aarav Sethi", "Nikhil Rao", "Anya Bose", "Karan Gill", "Ira Menon", "Ritvik Shah", "Suhani Das", "Vihaan Reddy", "Aditi Khanna",
  "Reyansh Kapoor", "Nandini Iyer", "Arnav Bhat", "Kiara Sen", "Dhruv Kulkarni", "Myra Joseph", "Yash Patel", "Avni Mehra", "Neil Fernandes", "Riya Chawla",
  "Kabir Anand", "Tara Mukherjee", "Samar Jain", "Leher Desai", "Arjun Pillai", "Zoya Qureshi", "Devika Nair", "Rohan Basu", "Mehul Arora", "Sanya Thomas",
] as const;

export const demoMembers: DemoMember[] = [
  ...startups.map((startup, index) => ({
    id: startup.founderProfileId,
    name: founderNames[index],
    role: "founder" as const,
    headline: `Founder building ${startup.tagline.toLowerCase()}`,
    company: startup.name,
    bio: startup.description,
    color: startup.color,
    sectors: [startup.sector],
    stages: [startup.stage],
    locations: [startup.location],
    portfolioStartupIds: [],
  })),
  ...investors.map((investor) => ({
    id: investor.profileId,
    name: investor.name,
    role: "investor" as const,
    headline: investor.role,
    company: investor.firm,
    bio: investor.bio,
    color: investor.color,
    sectors: investor.sectors,
    stages: investor.stages,
    locations: investor.locations,
    portfolioStartupIds: investor.portfolioStartupIds,
  })),
];

const headlines = [
  "The customer conversation that changed our roadmap.",
  "What we learned shipping the uncomfortable first version.",
  "A milestone worth sharing—and the work behind it.",
  "Why this market is moving faster than it looks.",
  "Three numbers from our latest operating review.",
  "The small product decision that unlocked adoption.",
  "A field note from the people using this every day.",
  "We are opening our next round to aligned partners.",
];
const bodies = [
  "We spent this week with customers, not slides. The clearest lesson: remove one step, make the value visible, and let trust compound.",
  "The graph is encouraging, but the best signal was hearing a customer explain the product to a new teammate without us in the room.",
  "Building in public means sharing the middle: the experiments that failed, the decision that held, and what we will test next.",
  "We are looking for partners who understand the problem deeply and can help us build a durable company—not simply close a round.",
];

type DemoVideo = {
  mediaUrl: string;
  sourceUrl: string;
};

// Keep demo footage remote so thirty real clips do not add several gigabytes to
// the application bundle. Every item links back to its individual Pexels page.
export const pexelsVideoCatalog: DemoVideo[] = [
  { mediaUrl: "https://videos.pexels.com/video-files/5684385/5684385-hd_1080_1920_25fps.mp4", sourceUrl: "https://www.pexels.com/video/young-men-in-office-using-laptop-5684385/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6805175/6805175-uhd_4096_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/a-young-man-working-with-a-computer-6805175/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7439783/7439783-uhd_2160_4096_25fps.mp4", sourceUrl: "https://www.pexels.com/video/video-of-people-working-in-the-office-7439783/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6563850/6563850-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/people-working-in-the-office-6563850/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7180172/7180172-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/start-up-meeting-7180172/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6804647/6804647-uhd_4096_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/young-workers-in-tech-office-6804647/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7966579/7966579-uhd_3840_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/people-working-in-the-office-7966579/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6325841/6325841-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/people-working-together-6325841/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7148578/7148578-uhd_3840_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/business-people-working-in-the-office-7148578/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6804114/6804114-uhd_4096_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/programmers-at-work-6804114/" },
  { mediaUrl: "https://videos.pexels.com/video-files/8853531/8853531-hd_1920_1080_24fps.mp4", sourceUrl: "https://www.pexels.com/video/man-safely-checking-the-installation-of-solar-panels-8853531/" },
  { mediaUrl: "https://videos.pexels.com/video-files/32386527/13814779_3840_2160_100fps.mp4", sourceUrl: "https://www.pexels.com/video/advanced-solar-panel-manufacturing-process-32386527/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7593895/7593895-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/a-man-making-a-presentation-on-the-whiteboard-7593895/" },
  { mediaUrl: "https://videos.pexels.com/video-files/32386624/13814677_3840_2160_100fps.mp4", sourceUrl: "https://www.pexels.com/video/automated-warehouse-with-robotics-in-action-32386624/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6898026/6898026-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/man-using-cellphone-while-holding-his-credit-card-6898026/" },
  { mediaUrl: "https://videos.pexels.com/video-files/9573916/9573916-uhd_2160_4096_25fps.mp4", sourceUrl: "https://www.pexels.com/video/medical-technologists-working-in-a-laboratory-9573916/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6898014/6898014-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/a-person-using-a-cellphone-to-make-an-online-purchase-6898014/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7669651/7669651-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/cashless-transaction-7669651/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7535094/7535094-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/a-person-holding-a-credit-card-and-a-cellphone-7535094/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7669661/7669661-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/a-debit-card-swiped-in-a-payment-terminal-7669661/" },
  { mediaUrl: "https://videos.pexels.com/video-files/7535099/7535099-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/person-holding-cellphone-and-card-7535099/" },
  { mediaUrl: "https://videos.pexels.com/video-files/5240898/5240898-hd_1920_1080_25fps.mp4", sourceUrl: "https://www.pexels.com/video/customer-transacting-payment-5240898/" },
  { mediaUrl: "https://videos.pexels.com/video-files/35313954/14961313_2160_3840_50fps.mp4", sourceUrl: "https://www.pexels.com/video/women-using-phone-for-card-transaction-indoors-35313954/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6803583/6803583-uhd_4096_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/four-men-working-in-an-office-6803583/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6804109/6804109-uhd_4096_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/people-coding-on-computer-6804109/" },
  { mediaUrl: "https://videos.pexels.com/video-files/8632604/8632604-uhd_3840_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/people-working-at-the-office-8632604/" },
  { mediaUrl: "https://videos.pexels.com/video-files/34182415/14490106_3840_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/drone-technology-advancing-modern-farming-34182415/" },
  { mediaUrl: "https://videos.pexels.com/video-files/5200865/5200865-uhd_3840_2160_30fps.mp4", sourceUrl: "https://www.pexels.com/video/aerial-shot-of-agricultural-farms-5200865/" },
  { mediaUrl: "https://videos.pexels.com/video-files/34182418/14490142_3840_2160_25fps.mp4", sourceUrl: "https://www.pexels.com/video/aerial-drone-spraying-technology-on-farm-field-34182418/" },
  { mediaUrl: "https://videos.pexels.com/video-files/6196141/6196141-uhd_3840_2160_30fps.mp4", sourceUrl: "https://www.pexels.com/video/drone-shot-of-farmland-6196141/" },
];

export const videoPosts: Post[] = startups.map((startup, index) => {
  const footage = pexelsVideoCatalog[index];
  return {
    id: `video-story-${String(index + 1).padStart(2, "0")}`,
    startupId: startup.id,
    startup: startup.name,
    logo: startup.initials,
    logoColor: startup.color,
    meta: `${startup.sector} · ${startup.location} · ${index + 1}h`,
    headline: headlines[index % headlines.length],
    body: `${startup.tagline} Meet the synthetic founding team and see the problem they are determined to solve.`,
    tags: startup.tags,
    mediaType: "video",
    mediaUrl: footage.mediaUrl,
    poster: startup.poster,
    mediaLabel: `FOUNDER STORY · ${index + 1}/30`,
    mediaTitle: startup.tagline,
    duration: ["0:38", "1:06", "1:28", "0:52"][index % 4],
    likes: 84 + index * 17,
    shares: 4 + index * 3,
    comments: index % 6 === 0 ? [{ id: `video-comment-${index}`, author: investors[index % investors.length].name, initials: investors[index % investors.length].initials, role: investors[index % investors.length].role, body: "Clear story and a thoughtful wedge. I would like to understand the next operating milestone.", time: `${index + 1}h` }] : [],
    createdAt: NOW - index * 3_600_000,
    sourceLabel: "Video on Pexels · synthetic company",
    sourceUrl: footage.sourceUrl,
  };
});

export const imagePosts: Post[] = Array.from({ length: 200 }, (_, index) => {
  const startup = startups[index % startups.length];
  const createdAt = NOW - (index + 2) * 2_700_000;
  return {
    id: `photo-update-${String(index + 1).padStart(3, "0")}`,
    startupId: startup.id,
    startup: startup.name,
    logo: startup.initials,
    logoColor: startup.color,
    meta: `${startup.sector} · ${startup.location} · ${Math.max(1, Math.floor((NOW - createdAt) / 3_600_000))}h`,
    headline: headlines[(index + 2) % headlines.length],
    body: bodies[index % bodies.length],
    tags: startup.tags,
    mediaType: "image" as const,
    mediaUrl: "",
    poster: pexelsPhoto(index + 3),
    mediaLabel: index % 4 === 0 ? "BUILDING IN PUBLIC" : index % 4 === 1 ? "TEAM NOTE" : index % 4 === 2 ? "CUSTOMER STORY" : "MILESTONE",
    mediaTitle: `${startup.name} · update ${index + 1}`,
    likes: 28 + ((index * 31) % 540),
    shares: 2 + ((index * 7) % 74),
    comments: [],
    createdAt,
    sourceLabel: "Photo by Pexels · synthetic company",
    sourceUrl: "https://www.pexels.com/",
  };
});

export const initialPosts: Post[] = [...videoPosts, ...imagePosts].sort((a, b) => b.createdAt - a.createdAt);

export const freshStartups: Startup[] = Array.from(new Set(initialPosts.map((post) => post.startupId)))
  .map((id) => startups.find((startup) => startup.id === id))
  .filter((startup): startup is Startup => Boolean(startup));
