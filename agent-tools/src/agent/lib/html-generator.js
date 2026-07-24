export function extractTOC(content) {
  const headingLines = content.match(/^#{2,3}\s+.+/gm) || [];
  return headingLines.map((line) => {
    const level = line.startsWith('###') ? 3 : 2;
    const title = line.replace(/^#{2,3}\s+/, '').trim();
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    return { id, title, level };
  });
}

export function generateArticleHTML(article, images) {
  const canonicalUrl = `https://www.spdrenovation.in/${article.slug}.html`;
  const tocItems = article.tableOfContents && article.tableOfContents.length > 0
    ? article.tableOfContents
    : extractTOC(article.content);

  // Convert markdown content to structured HTML body
  let htmlBody = article.content
    .replace(/^#\s+(.+)$/gm, '') // Remove H1 as it is in hero
    .replace(/^##\s+Table of Contents[\s\S]*?(?=^##\s+)/m, '') // Remove markdown TOC
    .replace(/^##\s+Frequently Asked Questions[\s\S]*?(?=^##\s+|$)/m, '') // Remove FAQs markdown section
    .replace(/^##\s+(.+)$/gm, (match, heading) => {
      const id = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `<h2 id="${id}">${heading}</h2>`;
    })
    .replace(/^###\s+(.+)$/gm, (match, heading) => {
      const id = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `<h3 id="${id}">${heading}</h3>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Convert paragraphs and lists
  const paragraphs = htmlBody.split('\n\n');
  htmlBody = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h2') || p.startsWith('<h3') || p.startsWith('<table') || p.startsWith('<ul') || p.startsWith('<ol')) {
      return p;
    }
    if (p.startsWith('- ')) {
      const items = p.split('\n- ').map(item => `<li>${item.replace(/^- /, '')}</li>`).join('');
      return `<ul class="article-list">${items}</ul>`;
    }
    if (p.startsWith('1. ')) {
      const items = p.split(/\n\d+\.\s+/).map(item => item ? `<li>${item}</li>` : '').join('');
      return `<ol class="article-list">${items}</ol>`;
    }
    return `<p>${p}</p>`;
  }).join('\n\n');

  // Build Table of Contents list
  const tocHTML = tocItems
    .map(item => `<li><a href="#${item.id}"><i class="fa-solid fa-chevron-right"></i> ${item.title}</a></li>`)
    .join('\n');

  // Build FAQs accordion HTML
  const faqs = article.faqs || [];
  const faqsHTML = faqs
    .map((faq, index) => `
      <div class="faq-item">
        <button class="faq-question ${index === 0 ? 'active' : ''}" onclick="toggleFaq(this)">
          <span><i class="fa-solid fa-circle-question"></i> ${faq.question}</span>
          <i class="fa-solid fa-chevron-down faq-icon"></i>
        </button>
        <div class="faq-answer" style="${index === 0 ? 'display: block;' : 'display: none;'}">
          <p>${faq.answer}</p>
        </div>
      </div>
    `).join('\n');

  // Build JSON-LD schemas
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "image": [images.featuredImage],
    "author": {
      "@type": "Organization",
      "name": "SPD Electriction & Renovation"
    },
    "publisher": {
      "@type": "Organization",
      "name": "SPD Electriction & Renovation",
      "url": "https://www.spdrenovation.in",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.spdrenovation.in/favicon.png"
      }
    },
    "datePublished": article.publishedDate,
    "dateModified": article.publishedDate,
    "mainEntityOfPage": canonicalUrl,
    "url": canonicalUrl
  };

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} | SPD Renovation</title>

    <!-- SEO Meta Tags -->
    <meta name="description" content="${article.description}">
    <meta name="keywords" content="${article.tags ? article.tags.join(', ') : 'Renovation, Thane, Mumbai'}">
    <meta name="author" content="SPD Electriction & Renovation">
    <meta name="robots" content="index, follow">
    <meta name="language" content="English">
    <meta name="geo.region" content="IN-MH">
    <meta name="geo.placename" content="Thane">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${images.featuredImage}">
    <meta property="og:site_name" content="SPD Electriction & Renovation">
    <meta property="og:locale" content="en_IN">

    <link rel="canonical" href="${canonicalUrl}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="css/style.css">

    <script type="application/ld+json">
    ${JSON.stringify(articleSchema, null, 2)}
    </script>
    ${faqSchema ? `<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>` : ''}

    <style>
        .post-header {
            margin-top: 80px;
            padding: 80px 0 60px;
            background: linear-gradient(135deg, var(--secondary) 0%, #0d145c 100%);
            color: white;
            position: relative;
        }
        .post-category-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(230, 81, 0, 0.2);
            border: 1px solid rgba(230, 81, 0, 0.4);
            color: #FF833A;
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        .post-h1 {
            font-size: 2.5rem;
            color: white;
            line-height: 1.25;
            margin-bottom: 20px;
        }
        .post-meta {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
        }
        .post-layout {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 40px;
            padding: 60px 0 90px;
        }
        .featured-img-box img {
            width: 100%;
            height: auto;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .toc-box {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            position: sticky;
            top: 100px;
            box-shadow: var(--shadow-sm);
        }
        .toc-box h3 {
            font-size: 1.1rem;
            color: var(--secondary);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .toc-box ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toc-box a {
            color: var(--text-color);
            font-size: 0.9rem;
            text-decoration: none;
            transition: var(--transition);
        }
        .toc-box a:hover {
            color: var(--primary);
        }
        .post-body {
            font-size: 1.05rem;
            line-height: 1.8;
            color: #334155;
        }
        .post-body h2 {
            font-size: 1.8rem;
            color: var(--secondary);
            margin: 40px 0 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(230, 81, 0, 0.15);
        }
        .post-body h3 {
            font-size: 1.35rem;
            color: #1e293b;
            margin: 28px 0 12px;
        }
        .post-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .post-body th, .post-body td {
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 0.95rem;
        }
        .post-body th {
            background: #f8fafc;
            font-weight: 700;
        }
        .cta-box {
            background: linear-gradient(135deg, #0d145c 0%, #1A237E 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 20px;
            text-align: center;
            margin: 50px 0;
        }
        .cta-box h3 {
            color: white;
            font-size: 1.8rem;
            margin-bottom: 12px;
        }
        .faq-section {
            margin-top: 50px;
        }
        .faq-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        .faq-question {
            width: 100%;
            padding: 18px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            border: none;
            cursor: pointer;
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--secondary);
            text-align: left;
        }
        .faq-answer {
            padding: 0 24px 20px;
            color: #475569;
            line-height: 1.7;
        }
        @media (max-width: 992px) {
            .post-layout {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

    <!-- Header Navigation -->
    <header class="header">
        <div class="container">
            <nav class="nav">
                <a href="index.html" class="logo">
                    <div>SPD <span>Reno</span></div>
                    <small>Electriction & Renovation</small>
                </a>

                <ul class="nav-links">
                    <li><a href="index.html" class="nav-link">Home</a></li>
                    <li><a href="civil-work.html" class="nav-link">Civil</a></li>
                    <li><a href="electrical.html" class="nav-link">Electrical</a></li>
                    <li><a href="plumbing.html" class="nav-link">Plumbing</a></li>
                    <li><a href="interior-design.html" class="nav-link">Interiors</a></li>
                    <li><a href="renovation.html" class="nav-link">Renovation</a></li>
                    <li><a href="waterproofing.html" class="nav-link">Waterproofing</a></li>
                    <li><a href="blog.html" class="nav-link active">Blog</a></li>
                </ul>

                <div class="nav-actions">
                    <a href="tel:+918828444461" class="contact-phone">
                        <i class="fa-solid fa-phone-volume"></i> +91 8828 444 461
                    </a>
                    <a href="https://wa.me/918828444461" class="btn btn-primary"><i class="fa-brands fa-whatsapp"></i> Chat</a>
                </div>
            </nav>
        </div>
    </header>

    <!-- Post Header -->
    <section class="post-header">
        <div class="container">
            <div class="post-header-inner">
                <span class="post-category-badge">
                    <i class="fa-solid fa-hammer"></i> ${article.category}
                </span>
                <h1 class="post-h1">${article.title}</h1>
                <div class="post-meta">
                    <span><i class="fa-solid fa-user"></i> ${article.author}</span>
                    <span><i class="fa-solid fa-calendar"></i> ${article.publishedDate}</span>
                    <span><i class="fa-solid fa-clock"></i> ${article.readingTime || 8} min</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Content Layout -->
    <section class="container">
        <div class="post-layout">
            <main class="post-body">
                <div class="featured-img-box">
                    <img src="${images.featuredImage}" alt="${images.featuredImageAlt}">
                </div>

                ${htmlBody}

                <!-- FAQ Section -->
                <section class="faq-section">
                    <h2>Frequently Asked Questions</h2>
                    <div class="faq-list">
                        ${faqsHTML}
                    </div>
                </section>

                <!-- Call to Action Box -->
                <div class="cta-box">
                    <h3>Need renovation services in Thane or Mumbai?</h3>
                    <p style="margin-bottom: 24px; color: #e2e8f0; font-size: 1.1rem;">
                        Contact SPD Renovation today for a free site visit and quotation.
                    </p>
                    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                        <a href="tel:+918828444461" class="btn btn-primary" style="padding: 14px 28px;">
                            <i class="fa-solid fa-phone"></i> Call +91 8828 444 461
                        </a>
                        <a href="https://wa.me/918828444461" class="btn" style="background: #25D366; color: white; padding: 14px 28px;">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp Quote
                        </a>
                    </div>
                </div>
            </main>

            <!-- Table of Contents Sidebar -->
            <aside>
                <div class="toc-box">
                    <h3><i class="fa-solid fa-list"></i> Table of Contents</h3>
                    <ul>
                        ${tocHTML}
                    </ul>
                </div>
            </aside>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>© ${new Date().getFullYear()} SPD Electriction & Renovation. Serving Thane, Mumbai & Navi Mumbai. All rights reserved.</p>
        </div>
    </footer>

    <script>
        function toggleFaq(button) {
            const answer = button.nextElementSibling;
            const isOpen = answer.style.display === 'block';
            answer.style.display = isOpen ? 'none' : 'block';
            button.classList.toggle('active');
        }
    </script>
</body>
</html>
`;
}
