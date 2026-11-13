(function () {
  'use strict';

  const article = document.getElementById('doc-content');
  const outline = document.getElementById('outline-nav');
  const outlineBox = document.querySelector('.outline');
  const outlineToggle = document.getElementById('outline-toggle');
  const progress = document.getElementById('reading-progress');
  const backToTop = document.getElementById('back-to-top');
  const copyLink = document.getElementById('copy-link');
  const documentPath = document.body.dataset.document || 'document.md';
  const navAnchors = Array.from(document.querySelectorAll('.document-nav a[href^="#"]'));
  let outlineAnchors = [];

  function slugify(text, index) {
    const normalized = text
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]/g, '')
      .toLowerCase();
    return `section-${normalized || 'content'}-${index + 1}`;
  }

  function specialSectionId(label) {
    if (label.includes('接口全景')) return 'section-map';
    if (label.includes('P0 阻塞项')) return 'section-blockers';
    if (label.includes('对客确认清单')) return 'section-confirmation';
    if (label.includes('验收门槛')) return 'section-acceptance';
    return '';
  }

  function buildOutline() {
    const headings = Array.from(article.querySelectorAll('h2, h3'));
    const items = [];

    headings.forEach((heading, index) => {
      const label = heading.textContent.trim();
      const id = specialSectionId(label) || slugify(label, index);
      heading.id = id;

      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${id}`;
      anchor.textContent = label;
      heading.replaceChildren(anchor);

      items.push({ id, label, level: Number(heading.tagName.slice(1)) });
    });

    outline.innerHTML = items.map(item => {
      const levelClass = item.level === 3 ? ' class="level-3"' : '';
      return `<a${levelClass} href="#${item.id}" data-section="${item.id}">${item.label}</a>`;
    }).join('');
    outlineAnchors = Array.from(outline.querySelectorAll('a'));

    outlineAnchors.forEach(anchor => {
      anchor.addEventListener('click', () => {
        outlineBox.classList.remove('open');
        outlineToggle?.setAttribute('aria-expanded', 'false');
        if (outlineToggle) outlineToggle.textContent = '展开';
      });
    });

    updateActiveSection();
  }

  function markSectionActive(sectionId) {
    outlineAnchors.forEach(anchor => {
      anchor.classList.toggle('active', anchor.dataset.section === sectionId);
    });
    navAnchors.forEach(anchor => {
      anchor.classList.toggle('active', anchor.getAttribute('href') === `#${sectionId}`);
    });
  }

  function updateActiveSection() {
    let current = outlineAnchors[0]?.dataset.section || '';
    const probe = window.innerHeight * 0.22;

    document.querySelectorAll('.doc-content h2, .doc-content h3').forEach(heading => {
      if (heading.getBoundingClientRect().top <= probe) current = heading.id;
    });

    markSectionActive(current);
  }

  function scrollToHash(hash, smooth) {
    if (!hash || !hash.startsWith('#')) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }

  function bindNavigation() {
    [...navAnchors, ...outlineAnchors].forEach(anchor => {
      anchor.addEventListener('click', event => {
        const href = anchor.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        event.preventDefault();
        history.pushState(null, '', href);
        scrollToHash(href, true);
        markSectionActive(href.slice(1));
        window.setTimeout(updateActiveSection, 850);
      });
    });
  }

  function bindScrollEffects() {
    let scheduled = false;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;
      progress.style.width = `${ratio * 100}%`;
      backToTop.classList.toggle('show', window.scrollY > 720);
      updateActiveSection();
      scheduled = false;
    };

    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function bindOutlineToggle() {
    outlineToggle?.addEventListener('click', () => {
      const isOpen = outlineBox.classList.toggle('open');
      outlineToggle.setAttribute('aria-expanded', String(isOpen));
      outlineToggle.textContent = isOpen ? '收起' : '展开';
    });
  }

  async function copyCurrentLink() {
    const buttonLabel = copyLink.textContent;
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyLink.textContent = '已复制';
    } catch (error) {
      const helper = document.createElement('textarea');
      helper.value = window.location.href;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      copyLink.textContent = '已复制';
    }
    window.setTimeout(() => { copyLink.textContent = buttonLabel; }, 1600);
  }

  async function render() {
    try {
      const response = await fetch(documentPath, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      article.innerHTML = marked.parse(markdown, { gfm: true, breaks: false });
      article.setAttribute('aria-busy', 'false');

      article.querySelector('h1')?.remove();

      article.querySelectorAll('table').forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-scroll';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });

      buildOutline();
      bindNavigation();
      bindScrollEffects();
      bindOutlineToggle();

      if (window.location.hash) {
        requestAnimationFrame(() => scrollToHash(window.location.hash, false));
      }
    } catch (error) {
      article.setAttribute('aria-busy', 'false');
      article.innerHTML = '<div class="loading-state"><strong>文档加载失败</strong><p>请刷新页面重试，或直接打开 Markdown 原文。</p></div>';
      console.error('Document render failed:', error);
    }
  }

  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  copyLink?.addEventListener('click', copyCurrentLink);
  render();
}());
