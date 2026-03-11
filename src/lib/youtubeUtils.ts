/**
 * Extract YouTube video ID from any YouTube URL
 */
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);
}

/**
 * Convert any YouTube URL to full embed URL (ready to use in iframe src)
 */
export function convertYoutubeUrl(url: string): string | null {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Get YouTube thumbnail from video ID or URL
 */
export function getYoutubeThumbnail(urlOrId: string): string {
  const videoId = extractYoutubeId(urlOrId) || urlOrId;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
