"use client";

import { useState, useEffect } from "react";
import { GitCommit, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { date: string };
  };
  html_url: string;
}

const APP_VERSION = "0.1.0";
const REPO = "juswa2415/fintrack";

function formatCommitMessage(msg: string): { title: string; type: string } {
  // Parse conventional commit format: "feat: ...", "fix: ...", "refactor: ..."
  const match = msg.split("\n")[0].match(/^(feat|fix|refactor|chore|docs|style|perf|security)(!)?:\s*(.+)/i);
  if (match) {
    const typeMap: Record<string, string> = {
      feat: "Feature",
      fix: "Bug Fix",
      refactor: "Improvement",
      chore: "Maintenance",
      docs: "Documentation",
      style: "Style",
      perf: "Performance",
      security: "Security",
    };
    return {
      type: typeMap[match[1].toLowerCase()] ?? match[1],
      title: match[3],
    };
  }
  return { type: "Update", title: msg.split("\n")[0] };
}

function getBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    "Feature": "bg-green-100 text-green-700",
    "Bug Fix": "bg-red-100 text-red-700",
    "Improvement": "bg-blue-100 text-blue-700",
    "Security": "bg-purple-100 text-purple-700",
    "Performance": "bg-orange-100 text-orange-700",
    "Maintenance": "bg-gray-100 text-gray-600",
  };
  return colors[type] ?? "bg-gray-100 text-gray-600";
}

export function ChangelogFooter() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!expanded || commits.length > 0) return;
    setLoading(true);
    fetch(`https://api.github.com/repos/${REPO}/commits?per_page=15`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCommits(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [expanded]);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Footer header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GitCommit className="h-4 w-4 text-indigo-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">What's New</p>
            <p className="text-xs text-gray-400">FinTrack v{APP_VERSION} · View recent updates</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded changelog */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-xs text-gray-400 text-center py-4">
              Could not load changelog.{" "}
              <a href={`https://github.com/${REPO}/commits`} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline">View on GitHub</a>
            </p>
          )}
          {!loading && !error && commits.map((commit) => {
            const { title, type } = formatCommitMessage(commit.commit.message);
            const date = new Date(commit.commit.author.date);
            return (
              <a
                key={commit.sha}
                href={commit.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5 ${getBadgeColor(type)}`}>
                  {type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5" />
              </a>
            );
          })}
          {!loading && !error && (
            <div className="text-center pt-1">
              <a href={`https://github.com/${REPO}/commits`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline">
                View all commits on GitHub →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
