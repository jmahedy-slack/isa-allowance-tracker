#!/usr/bin/env node
/**
 * Sync Homepage.html, Plan, and unified diff to a Slack Code channel.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

if (!SLACK_BOT_TOKEN || !CHANNEL_ID) {
  console.error("SLACK_BOT_TOKEN and SLACK_CHANNEL_ID are required.");
  process.exit(1);
}

const branch =
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf8" }).trim();

const commitSha = (
  process.env.GITHUB_SHA || execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim()
).slice(0, 7);

const repoName = process.env.GITHUB_REPOSITORY || "jmahedy-slack/isa-allowance-tracker";

async function slack(method, payload) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const htmlContent = readFileSync(join(ROOT, "Homepage.html"), "utf8");

const planBlocks = [
  { type: "header", text: { type: "plain_text", text: "Plan: ISA Allowance Tracker" } },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Delivered*\n• Self-contained `Homepage.html` (Ninety One dark theme)\n• Contribution list with tax-year grey-out\n• Summary card + SVG progress ring\n• `src/engine/isa-allowance.js` + unit tests",
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Repo:* <https://github.com/${repoName}|${repoName}>\n*Tax year:* 2026/27 (6 Apr 2026 – 5 Apr 2027)`,
    },
  },
];

let diffContent = "";
try {
  if (branch !== "main") {
    try {
      diffContent = execSync("git diff origin/main...HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {
      diffContent = execSync("git diff main...HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
    }
  } else {
    diffContent = execSync("git diff HEAD~1..HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  }
} catch (_) {}

await slack("agents.conversations.setView", {
  channel_id: CHANNEL_ID,
  type: "block_kit",
  view_key: "plan",
  name: "Plan",
  blocks: planBlocks,
});

await slack("agents.conversations.setView", {
  channel_id: CHANNEL_ID,
  type: "html",
  view_key: "homepage.html",
  name: "Homepage",
  content: htmlContent,
});

if (diffContent) {
  await slack("agents.conversations.setView", {
    channel_id: CHANNEL_ID,
    type: "diff",
    content: diffContent,
    base_branch: "main",
    head_branch: branch,
  });
}

await slack("agents.conversations.setProperties", {
  channel_id: CHANNEL_ID,
  code_channel: {
    host: "github.com",
    repo: repoName,
    branch,
    base_branch: "main",
    language: "html",
    context_bar_items: [
      { key: "repo", label: repoName, icon: "folder", url: `https://github.com/${repoName}` },
      { key: "branch", label: branch, icon: "branch", url: `https://github.com/${repoName}/tree/${branch}` },
      { key: "tokens", label: `commit ${commitSha}`, icon: "terminal" },
    ],
  },
});

console.log("Slack Code views synced.");
