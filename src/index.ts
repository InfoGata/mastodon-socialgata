const pluginName = "mastodon";
const baseUrl = "https://mastodon.social";

// Mastodon API types
interface MastodonAccount {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  url: string;
}

interface MastodonStatus {
  id: string;
  content: string;
  created_at: string;
  account: MastodonAccount;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  url: string;
  media_attachments?: MastodonMediaAttachment[];
  reblog?: MastodonStatus;
}

interface MastodonMediaAttachment {
  id: string;
  type: "image" | "video" | "gifv" | "audio" | "unknown";
  url: string;
  preview_url: string;
}

interface MastodonTag {
  name: string;
  url: string;
  history?: Array<{
    day: string;
    uses: string;
    accounts: string;
  }>;
}

const statusToPost = (status: MastodonStatus): Post => {
  // If this is a reblog, use the original status for content
  const actualStatus = status.reblog ?? status;

  // Get thumbnail from media attachments if available
  const imageAttachment = actualStatus.media_attachments?.find(
    (m) => m.type === "image"
  );
  const videoAttachment = actualStatus.media_attachments?.find(
    (m) => m.type === "video" || m.type === "gifv"
  );

  return {
    apiId: status.id,
    body: actualStatus.content,
    authorName: actualStatus.account.display_name || actualStatus.account.username,
    authorApiId: actualStatus.account.id,
    authorAvatar: actualStatus.account.avatar,
    score: actualStatus.favourites_count,
    numOfComments: actualStatus.replies_count,
    publishedDate: actualStatus.created_at,
    pluginId: pluginName,
    originalUrl: actualStatus.url,
    thumbnailUrl: imageAttachment?.preview_url,
    url: videoAttachment?.url ?? imageAttachment?.url,
    isVideo: !!videoAttachment,
  };
};

// Plugin Methods

const getFeed = async (request?: GetFeedRequest): Promise<GetFeedResponse> => {
  const url = new URL(`${baseUrl}/api/v1/timelines/public`);
  url.searchParams.append("limit", "30");

  if (request?.pageInfo?.page) {
    url.searchParams.append("max_id", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString());
  const statuses: MastodonStatus[] = await response.json();
  const items = statuses.map(statusToPost);

  // Get the last status ID for pagination
  const lastStatus = statuses[statuses.length - 1];

  return {
    items,
    pageInfo: {
      nextPage: lastStatus?.id,
    },
  };
};

const getUser = async (request: GetUserRequest): Promise<GetUserResponse> => {
  // First get the account info
  const accountUrl = `${baseUrl}/api/v1/accounts/${request.apiId}`;
  const accountResponse = await application.networkRequest(accountUrl);
  const account: MastodonAccount = await accountResponse.json();

  // Then get their statuses
  const statusesUrl = new URL(`${baseUrl}/api/v1/accounts/${request.apiId}/statuses`);
  statusesUrl.searchParams.append("limit", "30");

  const statusesResponse = await application.networkRequest(statusesUrl.toString());
  const statuses: MastodonStatus[] = await statusesResponse.json();
  const items = statuses.map(statusToPost);

  return {
    user: {
      apiId: account.id,
      name: account.display_name || account.username,
      avatar: account.avatar,
    },
    items,
  };
};

const getTrendingTopics = async (
  request?: GetTrendingTopicsRequest
): Promise<GetTrendingTopicsResponse> => {
  const limit = request?.limit ?? 10;

  const url = new URL(`${baseUrl}/api/v1/trends/tags`);
  url.searchParams.append("limit", String(limit));

  const response = await application.networkRequest(url.toString());
  const trends: MastodonTag[] = await response.json();

  const items: TrendingTopic[] = trends.map((tag) => ({
    name: tag.name,
    url: tag.url,
    history: tag.history?.map((h) => ({
      day: h.day,
      uses: h.uses,
      accounts: h.accounts,
    })),
  }));

  return {
    items,
  };
};

const getTrendingTopicFeed = async (
  request: GetTrendingTopicFeedRequest
): Promise<GetTrendingTopicFeedResponse> => {
  const tag = request.topicName.replace("#", "");

  const url = new URL(`${baseUrl}/api/v1/timelines/tag/${encodeURIComponent(tag)}`);
  url.searchParams.append("limit", "30");

  if (request.pageInfo?.page) {
    url.searchParams.append("max_id", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString());
  const statuses: MastodonStatus[] = await response.json();
  const items = statuses.map(statusToPost);

  const lastStatus = statuses[statuses.length - 1];

  return {
    items,
    topic: {
      name: request.topicName,
    },
    pageInfo: {
      nextPage: lastStatus?.id,
    },
  };
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  const url = new URL(`${baseUrl}/api/v2/search`);
  url.searchParams.append("q", request.query);
  url.searchParams.append("type", "statuses");
  url.searchParams.append("limit", "30");

  if (request.pageInfo?.offset) {
    url.searchParams.append("offset", String(request.pageInfo.offset));
  }

  const response = await application.networkRequest(url.toString());
  const json = await response.json();
  const statuses: MastodonStatus[] = json.statuses ?? [];
  const items = statuses.map(statusToPost);

  return {
    items,
    pageInfo: {
      offset: (request.pageInfo?.offset ?? 0) + items.length,
    },
  };
};

const getComments = async (
  request: GetCommentsRequest
): Promise<GetCommentsResponse> => {
  if (!request.apiId) {
    return { items: [] };
  }

  // Get the status itself
  const statusUrl = `${baseUrl}/api/v1/statuses/${request.apiId}`;
  const statusResponse = await application.networkRequest(statusUrl);
  const status: MastodonStatus = await statusResponse.json();
  const post = statusToPost(status);

  // Get the context (ancestors and descendants)
  const contextUrl = `${baseUrl}/api/v1/statuses/${request.apiId}/context`;
  const contextResponse = await application.networkRequest(contextUrl);
  const context: { ancestors: MastodonStatus[]; descendants: MastodonStatus[] } =
    await contextResponse.json();

  // Convert descendants to nested comments
  const items = context.descendants.map(statusToPost);

  return {
    items,
    post,
  };
};

// Theme handling
const changeTheme = (theme: Theme) => {
  localStorage.setItem("vite-ui-theme", theme);
};

// Initialize plugin
const init = async () => {
  const theme = await application.getTheme();
  changeTheme(theme);
};

// Wire up plugin handlers
application.onGetFeed = getFeed;
application.onGetUser = getUser;
application.onGetTrendingTopics = getTrendingTopics;
application.onGetTrendingTopicFeed = getTrendingTopicFeed;
application.onSearch = search;
application.onGetComments = getComments;
application.onGetPlatformType = async () => "microblog";

application.onChangeTheme = async (theme: Theme) => {
  changeTheme(theme);
};

init();
