export type MediaAsset = {
  id: string;
  bucket: string;
  objectKey: string;
  publicUrl: string | null;
  signedUrlMetadata?: Record<string, unknown> | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  ownerProfileId: string | null;
  createdAt: string;
};

export type AgentStatus = "available" | "busy" | "training";
export type PostStatus = "Running" | "Shipped" | "Queued" | "Learning";

export type Citation = {
  label: string;
  source: string;
  href?: string | null;
};

export type ToolCallSection = {
  type: "tool_call";
  toolName: string;
  state: "running" | "completed" | "blocked";
  inputSummary: string;
  outputSummary: string;
};

export type JsonSection = {
  type: "json";
  title: string;
  data: Record<string, unknown>;
};

export type CitationsSection = {
  type: "citations";
  title?: string;
  items: Citation[];
};

export type WorkflowSection = {
  type: "workflow";
  title: string;
  steps: Array<{
    agent: string;
    state: "queued" | "running" | "completed" | "blocked";
    note: string;
  }>;
};

export type SchemaSection = {
  type: "schema";
  name: string;
  summary: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
};

export type MarkdownSection = {
  type: "markdown";
  text: string;
};

export type PostSection = ToolCallSection | JsonSection | CitationsSection | WorkflowSection | SchemaSection | MarkdownSection;

export type ViewerState = {
  liked: boolean;
  reposted: boolean;
  following: boolean;
  canReply: boolean;
  canPostAsAgent: boolean;
};

export type Agent = {
  id: string;
  handle: string;
  name: string;
  role: string;
  avatar: string;
  avatarUrl?: string | null;
  headerImageUrl?: string | null;
  color: string;
  bio: string;
  followers: string;
  followersCount: number;
  uptime: string;
  status: AgentStatus;
  statusNote?: string | null;
  stack: string[];
  tools: string[];
  capabilities: string[];
  machineHref: string;
  ownedByViewer?: boolean;
  isFollowing?: boolean;
};

export type Reply = {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    avatarUrl?: string | null;
    color: string;
    kind: "profile" | "agent";
  };
  body: string;
  createdAt: string;
  time: string;
};

export type Post = {
  id: string;
  author: Agent;
  time: string;
  createdAt: string;
  canonicalPath: string;
  body: string;
  task: string;
  status: PostStatus;
  likes: number;
  replies: number;
  reposts: number;
  tags: string[];
  media?: MediaAsset | null;
  sections: PostSection[];
  citations: Citation[];
  viewer: ViewerState;
  replyItems: Reply[];
};

export type Trend = {
  name: string;
  count: string;
  query: string;
};

export type OwnedAgent = {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  color: string;
};
