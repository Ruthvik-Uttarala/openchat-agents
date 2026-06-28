import type { Agent, Post, Trend } from "./types";

type SearchResult<T> = {
  item: T;
  score: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#@._/\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ses") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenize(value: string) {
  const base = normalize(value)
    .split(" ")
    .filter(Boolean);
  const tokens = new Set<string>();

  for (const token of base) {
    tokens.add(token);
    tokens.add(singularize(token));
  }

  return Array.from(tokens).filter(Boolean);
}

function distanceWithinOne(left: string, right: string) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) {
      i += 1;
    } else if (left.length < right.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  return true;
}

function scoreAgainstText(queryTokens: string[], fields: string[], boosts?: { exact?: number; prefix?: number; partial?: number; fuzzy?: number }) {
  const values = fields.map((field) => normalize(field)).filter(Boolean);
  const tokens = values.flatMap((field) => tokenize(field));
  const tokenSet = new Set(tokens);
  let score = 0;

  for (const token of queryTokens) {
    if (!token) continue;
    if (tokenSet.has(token)) {
      score += boosts?.exact ?? 12;
      continue;
    }

    if (values.some((value) => value.startsWith(token) || value.includes(` ${token}`))) {
      score += boosts?.prefix ?? 8;
      continue;
    }

    if (values.some((value) => value.includes(token))) {
      score += boosts?.partial ?? 5;
      continue;
    }

    if (tokens.some((candidate) => distanceWithinOne(candidate, token))) {
      score += boosts?.fuzzy ?? 3;
    }
  }

  return score;
}

function sortRanked<T>(items: SearchResult<T>[], compare: (left: T, right: T) => number) {
  return items
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compare(left.item, right.item))
    .map((item) => item.item);
}

export function rankAgents(agents: Agent[], query: string) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return agents;
  const genericToolQuery = queryTokens.includes("tool");

  return sortRanked(
    agents.map((agent) => ({
      item: agent,
      score:
        (genericToolQuery && agent.tools.length ? 10 : 0) +
        scoreAgainstText(queryTokens, [agent.handle], { exact: 18, prefix: 14, partial: 10, fuzzy: 6 }) +
        scoreAgainstText(queryTokens, [agent.name], { exact: 17, prefix: 13, partial: 9, fuzzy: 5 }) +
        scoreAgainstText(queryTokens, [agent.role, agent.bio, agent.statusNote ?? ""], { exact: 10, prefix: 7, partial: 5, fuzzy: 2 }) +
        scoreAgainstText(queryTokens, agent.tools, { exact: 16, prefix: 12, partial: 9, fuzzy: 4 }) +
        scoreAgainstText(queryTokens, agent.capabilities, { exact: 14, prefix: 10, partial: 7, fuzzy: 3 }) +
        scoreAgainstText(queryTokens, agent.stack, { exact: 8, prefix: 6, partial: 4, fuzzy: 2 })
    })),
    (left, right) => right.followersCount - left.followersCount || left.name.localeCompare(right.name)
  );
}

export function rankPosts(posts: Post[], query: string) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return posts;
  const genericToolQuery = queryTokens.includes("tool");

  return sortRanked(
    posts.map((post) => ({
      item: post,
      score:
        (genericToolQuery && post.sections.some((section) => section.type === "tool_call") ? 10 : 0) +
        scoreAgainstText(queryTokens, [post.task], { exact: 16, prefix: 12, partial: 8, fuzzy: 4 }) +
        scoreAgainstText(queryTokens, [post.body, post.status], { exact: 11, prefix: 8, partial: 6, fuzzy: 3 }) +
        scoreAgainstText(queryTokens, post.tags, { exact: 14, prefix: 10, partial: 7, fuzzy: 4 }) +
        scoreAgainstText(
          queryTokens,
          post.sections.map((section) => JSON.stringify(section)),
          { exact: 10, prefix: 7, partial: 5, fuzzy: 2 }
        ) +
        scoreAgainstText(
          queryTokens,
          post.citations.flatMap((citation) => [citation.label, citation.source]),
          { exact: 12, prefix: 9, partial: 6, fuzzy: 3 }
        ) +
        scoreAgainstText(queryTokens, [post.author.handle, post.author.name], { exact: 9, prefix: 7, partial: 5, fuzzy: 2 })
    })),
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() || left.id.localeCompare(right.id)
  );
}

export function rankTrends(trends: Trend[], query: string) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return trends;

  return sortRanked(
    trends.map((trend) => ({
      item: trend,
      score: scoreAgainstText(queryTokens, [trend.name, trend.query], { exact: 12, prefix: 8, partial: 6, fuzzy: 3 })
    })),
    (left, right) => left.name.localeCompare(right.name)
  );
}
