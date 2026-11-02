'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { HelpBreadcrumbs, protectedSupportHref } from '@/components/help/HelpSubnav';
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  viewCount: number;
  category?: { id: string; slug: string; title: string };
  updatedAt: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const { isAuthenticated, isGuest } = useAuth();
  const categorySlug = params?.categorySlug as string;
  const articleSlug = params?.articleSlug as string;

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [articleLoadError, setArticleLoadError] = useState<string | null>(null);
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ yes: 0, no: 0 });

  useEffect(() => {
    let active = true;
    async function fetchArticle() {
      if (!articleSlug) return;
      setLoading(true);
      setArticleLoadError(null);
      try {
        const data = await api.getHelpArticle(articleSlug);
        if (!active) return;
        setArticle(data);
        if (data.category?.slug) {
          try {
            const related = await api.getHelpArticles({ category: data.category.slug });
            if (active) {
              setRelatedArticles(related.filter((item: ArticleData) => item.slug !== data.slug).slice(0, 3));
            }
          } catch {
            if (active) setRelatedArticles([]);
          }
        }
        if (active) {
          setVoteCounts({
            yes: data.helpfulCount || 0,
            no: data.notHelpfulCount || 0,
          });
        }
      } catch (error) {
        if (active) {
          setArticle(null);
          setArticleLoadError(error instanceof Error ? error.message : 'Unable to load this help article.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchArticle();
    return () => {
      active = false;
    };
  }, [articleSlug]);

  const handleVote = async (isHelpful: boolean) => {
    if (voted || !article) return;
    setVoted(isHelpful ? 'yes' : 'no');
    setVoteCounts((prev) => ({
      yes: isHelpful ? prev.yes + 1 : prev.yes,
      no: !isHelpful ? prev.no + 1 : prev.no,
    }));
    try {
      await api.voteHelpArticle(article.id, isHelpful);
    } catch {
      // Ignore background vote failure
    }
  };

  const articleUnavailable = Boolean(
    articleLoadError && !/not found|404/i.test(articleLoadError),
  );

  const guidedFlowUrl = protectedSupportHref(
    `/help/guided-flow?fromArticle=${encodeURIComponent(articleSlug)}`,
    isAuthenticated && !isGuest,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HelpBreadcrumbs category={categorySlug.replace(/-/g, ' ')} article={articleSlug.replace(/-/g, ' ')} />
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HelpBreadcrumbs category={categorySlug.replace(/-/g, ' ')} article={articleSlug.replace(/-/g, ' ')} />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {articleUnavailable ? 'Help content temporarily unavailable' : 'Help Article Not Found'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {articleUnavailable
              ? 'We could not load this article right now. Please try again later or contact support.'
              : 'The article you are looking for may have moved or been updated.'}
          </p>
          <Link href="/help" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
            Return to Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <HelpBreadcrumbs category={article.category?.title || 'Policies'} article={article.title} />

      {/* ── Main Article Card ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
          {/* Category Tag & Title */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3">
              {article.category?.title || 'Policy & Guidelines'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {article.title}
            </h1>
            {article.summary && (
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                {article.summary}
              </p>
            )}
          </div>

          {/* Formatted Markdown Body */}
          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed space-y-4">
            {article.content.split('\n\n').map((block, idx) => {
              if (block.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-lg font-bold text-slate-900 mt-6 mb-2">
                    {block.replace('### ', '')}
                  </h3>
                );
              }
              if (block.startsWith('#### ')) {
                return (
                  <h4 key={idx} className="text-base font-bold text-slate-800 mt-4 mb-2">
                    {block.replace('#### ', '')}
                  </h4>
                );
              }
              if (block.startsWith('|')) {
                // Table block
                const rows = block.split('\n').filter((r) => r.trim().startsWith('|'));
                return (
                  <div key={idx} className="overflow-x-auto my-4 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <tbody>
                        {rows.map((row, rIdx) => {
                          const cols = row.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
                          const isHeader = rIdx === 0;
                          const isDivider = row.includes('---');
                          if (isDivider) return null;
                          return (
                            <tr key={rIdx} className={isHeader ? 'bg-slate-100 font-bold' : 'border-t border-slate-100'}>
                              {cols.map((col, cIdx) => (
                                <td key={cIdx} className="p-3">
                                  {col.trim()}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (block.startsWith('- ') || block.startsWith('1. ')) {
                const items = block.split('\n');
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-1.5 text-slate-700">
                    {items.map((item, iIdx) => (
                      <li key={iIdx}>
                        {item.replace(/^- |\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-slate-700 leading-relaxed">
                  {block.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              );
            })}
          </div>

          {/* ── Was this helpful? Interactive Voting Box ── */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Was this article helpful?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {voteCounts.yes} {voteCounts.yes === 1 ? 'person' : 'people'} found this helpful
              </p>
            </div>

            <div className="flex items-center gap-3">
              {voted ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Thank you for your feedback!
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleVote(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                    Yes
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                    No
                  </button>
                </>
              )}
            </div>
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 id="related-articles-heading" className="mb-4 text-base font-bold text-slate-900">Related articles</h2>
            <ul className="space-y-3">
              {relatedArticles.map((related) => (
                <li key={related.id}>
                  <Link href={`/help/${related.category?.slug || categorySlug}/${related.slug}`} className="text-sm font-semibold text-blue-700 hover:underline">
                    {related.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Still need help? Guided Flow Banner ── */}
        <section className="bg-[#0B1F4B] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg">
          <div>
            <h3 className="text-lg font-bold">Still need help with your issue?</h3>
            <p className="text-xs text-blue-200 mt-1 max-w-lg">
              Select an order and issue to review support options or send a request to our team.
            </p>
          </div>
          <Link
            href={guidedFlowUrl}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-white text-[#0B1F4B] font-bold text-xs rounded-xl shadow-md hover:bg-slate-100 transition"
          >
            Start Guided Flow <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
