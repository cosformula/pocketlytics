"use client";

import { useState } from "react";
import { CheckCircle, Copy, Loader2 } from "lucide-react";

export function PrivacyPolicyForm() {
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [generatedPolicy, setGeneratedPolicy] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const generatePolicy = async () => {
    if (!websiteName || !websiteUrl || !contactEmail || !siteDescription) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");
    setGeneratedPolicy("");

    try {
      const response = await fetch("/api/tools/generate-privacy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteName,
          websiteUrl,
          contactEmail,
          siteDescription,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate policy");
      }

      const data = await response.json();
      setGeneratedPolicy(data.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedPolicy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPolicy = () => {
    const blob = new Blob([generatedPolicy], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacy-policy.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Tool Section */}
      <div className="mb-16">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Website Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={websiteName}
              onChange={e => setWebsiteName(e.target.value)}
              placeholder="Acme Inc."
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Website URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="privacy@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Describe Your Website <span className="text-red-500">*</span>
            </label>
            <textarea
              value={siteDescription}
              onChange={e => setSiteDescription(e.target.value)}
              placeholder="We run an e-commerce store selling handmade jewelry. We collect email addresses for newsletters, process payments through Stripe, and use cookies for shopping cart functionality..."
              disabled={isLoading}
              rows={6}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Describe what your site does, what data you collect, how you use it, and any third-party services
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            onClick={generatePolicy}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Policy...
              </>
            ) : (
              "Generate Privacy Policy"
            )}
          </button>

          {remainingRequests !== null && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {remainingRequests} requests remaining this minute
            </p>
          )}

          {generatedPolicy && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-neutral-900 dark:text-white">
                  Your Generated Privacy Policy
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={downloadPolicy}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                <pre className="text-xs text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap font-mono">
                  {generatedPolicy}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
