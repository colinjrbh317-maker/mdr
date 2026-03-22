import { useState, useRef, useEffect } from "react";

interface Post {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  category?: { title: string; slug: string };
  tags?: string[];
  featuredImage?: any;
}

interface BlogSearchProps {
  posts: Post[];
}

export default function BlogSearch({ posts }: BlogSearchProps) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);

    if (!value.trim()) {
      setFiltered([]);
      setIsOpen(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      const q = value.toLowerCase();
      const results = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.category?.title.toLowerCase().includes(q)
      );
      setFiltered(results);
      setIsOpen(true);
    }, 250);
  }

  return (
    <div ref={containerRef} className="relative max-w-md mx-auto">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.trim() && filtered.length > 0 && setIsOpen(true)}
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? (
            <ul className="py-2">
              {filtered.map((post) => (
                <li key={post._id}>
                  <a
                    href={`/blog/${post.slug}`}
                    className="block px-4 py-3 hover:bg-bg-light transition-colors"
                  >
                    <p className="text-text-primary text-sm font-medium">{post.title}</p>
                    {post.category?.title && (
                      <p className="text-text-dim text-xs mt-1">{post.category.title}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-text-dim text-sm">
              No articles found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
