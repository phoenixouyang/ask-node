export interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    heading: string;
    breadcrumb: string;
  };
}

// Remove HTML comments, which Node docs use for metadata
function cleanMarkdown(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

export function chunkMarkdown(text: string, source: string): Chunk[] {
  const lines = cleanMarkdown(text).split('\n');
  const chunks: Chunk[] = [];

  let currentHeading = 'Introduction';
  let breadcrumbs: string[] = [currentHeading];
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Don't split inside code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Detect headings (only if not in code block)
    const headingMatch = !inCodeBlock && line.match(/^(#{1,6})\s+(.*)/);

    if (headingMatch) {
      // 1. Save the previous section as a chunk
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        // Skip empty or very short sections
        if (content.length > 50) {
          chunks.push({
            id: `${source}-${chunks.length}`,
            // Inject breadcrumbs into content, for better embedding
            content: `${breadcrumbs.join(' > ')}\n\n${content}`,
            metadata: {
              source,
              heading: currentHeading,
              breadcrumb: breadcrumbs.join(' > '),
            },
          });
        }
      }

      // 2. Update state for new section
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      currentHeading = title;

      // Update breadcrumb stack based on heading level
      if (level === 1) {
        breadcrumbs = [title];
      } else {
        // Truncate stack to current level and add new title
        breadcrumbs = breadcrumbs.slice(0, level - 1);
        breadcrumbs.push(title);
      }

      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Add the final chunk
  if (currentContent.length > 0) {
    chunks.push({
      id: `${source}-${chunks.length}`,
      content: `${breadcrumbs.join(' > ')}\n\n${currentContent.join('\n').trim()}`,
      metadata: { source, heading: currentHeading, breadcrumb: breadcrumbs.join(' > ') },
    });
  }

  return chunks;
}