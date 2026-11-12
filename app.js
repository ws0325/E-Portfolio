document.addEventListener('DOMContentLoaded', () => {

    // --- Custom cursor: an orange pixel, with a square frame that trails behind it ---
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');
    const mouse = { x: -100, y: -100, seen: false }; // starts off-screen
    const lerp = (start, end, amount) => (1 - amount) * start + amount * end;

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.seen = true;
        if (cursorDot) {
            cursorDot.style.left = `${mouse.x}px`;
            cursorDot.style.top = `${mouse.y}px`;
        }
    }, { passive: true });

    if (cursorDot && cursorRing) {
        // styles.css only hides the system cursor once this class is set, so the page
        // still has a normal cursor if this script fails to load
        document.documentElement.classList.add('custom-cursor');

        document.addEventListener('mouseleave', () => {
            cursorDot.classList.add('cursor-hidden');
            cursorRing.classList.add('cursor-hidden');
        });
        document.addEventListener('mouseenter', () => {
            cursorDot.classList.remove('cursor-hidden');
            cursorRing.classList.remove('cursor-hidden');
        });

        // The frame follows the pixel with a little lag
        const ringPos = { x: -100, y: -100 };
        const animateCursor = () => {
            ringPos.x = lerp(ringPos.x, mouse.x, 0.18);
            ringPos.y = lerp(ringPos.y, mouse.y, 0.18);
            cursorRing.style.left = `${ringPos.x}px`;
            cursorRing.style.top = `${ringPos.y}px`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        // Grow over anything clickable
        document.querySelectorAll('a, button, .carousel').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorRing.classList.add('active');
                cursorDot.classList.add('active');
            });
            el.addEventListener('mouseleave', () => {
                cursorRing.classList.remove('active');
                cursorDot.classList.remove('active');
            });
        });
    }

    // --- Navbar Scroll Effect ---
    // The home page bar is clear at the top and gains a backdrop once you scroll;
    // project pages ship with the backdrop already on and keep it.
    const navbar = document.querySelector('.navbar');
    if (navbar && !navbar.classList.contains('scrolled')) {
        const updateNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
        updateNavbar();
        window.addEventListener('scroll', updateNavbar, { passive: true });
    }

    // --- Mobile Navigation Menu ---
    // On small screens the nav links are hidden; the hamburger button drops them down.
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('primaryNav');

    if (navToggle && navLinks) {
        const setMenuOpen = (open) => {
            navLinks.classList.toggle('open', open);
            navToggle.setAttribute('aria-expanded', String(open));
        };

        navToggle.addEventListener('click', () => {
            setMenuOpen(!navLinks.classList.contains('open'));
        });

        // Close after picking a section, tapping outside, pressing Escape,
        // or widening the window back to the desktop layout
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenuOpen(false));
        });
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
                setMenuOpen(false);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) {
                setMenuOpen(false);
                navToggle.focus();
            }
        });
        window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
            if (e.matches) setMenuOpen(false);
        });
    }

    // --- Scroll Reveal Animation (Intersection Observer) ---
    const revealElements = document.querySelectorAll('.reveal');

    // Apple-style fade up relies on detecting when element enters view
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed to keep the animation loaded
                // observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // --- Footer Year ---
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // --- Motion settings shared by the background, the parallax and the carousel ---
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const smallScreen = window.matchMedia('(max-width: 768px)');
    // Parallax strength: full on desktop, gentler on phones, off when the visitor asks for reduced motion
    const parallaxStrength = () => (reducedMotion.matches ? 0 : (smallScreen.matches ? 0.6 : 1));

    // --- Pixel field: the page background ---
    // Orange pixel-art sparks (little starbursts, crosses and single pixels) cover the whole page in
    // three depth layers. Each layer follows a different share of the scroll, so near sparks slide past
    // faster than far ones. Where a spark sits is worked out from its grid cell alone, so the pattern
    // is the same on every visit and carries on for as long as the page does.
    let field = document.getElementById('pixel-field');
    if (!field) {
        // Project pages do not carry the canvas in their markup
        field = document.createElement('canvas');
        field.id = 'pixel-field';
        field.setAttribute('aria-hidden', 'true');
        document.body.prepend(field);
    }

    if (field.getContext) {
        const ctx = field.getContext('2d');

        // Sprites, one character per pixel
        const SPRITES = {
            dot: ['#'],
            plus3: [
                '.#.',
                '###',
                '.#.'
            ],
            plus5: [
                '..#..',
                '..#..',
                '#####',
                '..#..',
                '..#..'
            ],
            burst5: [
                '#.#.#',
                '.###.',
                '#####',
                '.###.',
                '#.#.#'
            ],
            spark7: [
                '...#...',
                '.#.#.#.',
                '..###..',
                '#######',
                '..###..',
                '.#.#.#.',
                '...#...'
            ],
            spark9: [
                '....#....',
                '.#..#..#.',
                '..#.#.#..',
                '...###...',
                '#########',
                '...###...',
                '..#.#.#..',
                '.#..#..#.',
                '....#....'
            ],
            spark11: [
                '.....#.....',
                '.#...#...#.',
                '..#..#..#..',
                '...#.#.#...',
                '....###....',
                '###########',
                '....###....',
                '...#.#.#...',
                '..#..#..#..',
                '.#...#...#.',
                '.....#.....'
            ]
        };
        const sprite = (name) => {
            const rows = SPRITES[name];
            const pixels = [];
            rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') pixels.push([x, y]); }));
            return { size: rows.length, pixels };
        };

        // Far to near. px: size of one sprite pixel; cell: grid spacing; speed: share of the scroll the
        // layer follows; fill: how many cells hold a spark; alpha: brightness
        const LAYERS = [
            { px: 2, cell: 46, speed: 0.08, fill: 0.62, alpha: 0.34, sprites: ['dot', 'dot', 'dot', 'plus3'] },
            { px: 3, cell: 104, speed: 0.24, fill: 0.48, alpha: 0.5, sprites: ['plus3', 'burst5', 'plus5', 'dot', 'spark7'] },
            { px: 4, cell: 230, speed: 0.5, fill: 0.4, alpha: 0.85, sprites: ['spark9', 'spark7', 'spark11', 'burst5'] }
        ].map(layer => ({ ...layer, sprites: layer.sprites.map(sprite) }));
        const COLORS = ['#ff6a2b', '#d97757', '#ff8f4d'];
        const GLOW_RADIUS = 170; // sparks light up within this distance of the pointer

        // Repeatable pseudo-random number in [0, 1) for a grid cell
        const hash = (x, y, salt) => {
            let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 362437);
            h = Math.imul(h ^ (h >>> 13), 1274126177);
            return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        };

        let viewW = 0;
        let viewH = 0;
        let shownScroll = window.scrollY; // eased copy of the scroll position
        let lastDrawn = -1;
        let lastTwinkle = 0;
        let pointerMoved = false;

        const resizeField = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            viewW = field.clientWidth;
            viewH = field.clientHeight;
            field.width = Math.round(viewW * dpr);
            field.height = Math.round(viewH * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            lastDrawn = -1;
        };

        const drawField = (time) => {
            const strength = parallaxStrength();
            ctx.clearRect(0, 0, viewW, viewH);

            LAYERS.forEach((layer, li) => {
                const { px, cell } = layer;
                const offset = Math.round(shownScroll * layer.speed * strength);
                const firstRow = Math.floor(offset / cell) - 1;
                const rows = Math.ceil(viewH / cell) + 2;
                const cols = Math.ceil(viewW / cell) + 1;

                for (let r = 0; r < rows; r++) {
                    const row = firstRow + r;
                    for (let col = -1; col < cols; col++) {
                        if (hash(col, row, li) > layer.fill) continue;
                        const sp = layer.sprites[Math.floor(hash(col, row, li + 11) * layer.sprites.length)];
                        // Nudge the spark inside its cell, staying on the layer's pixel grid
                        const room = Math.max(1, Math.floor(cell / px) - sp.size);
                        const x = col * cell + Math.floor(hash(col, row, li + 23) * room) * px;
                        const y = row * cell + Math.floor(hash(col, row, li + 37) * room) * px - offset;
                        const half = (sp.size * px) / 2;
                        if (y > viewH || y + half * 2 < 0) continue;

                        // Twinkle in three steps rather than a smooth fade, to keep the pixel-art feel
                        const phase = hash(col, row, li + 53);
                        const wave = strength === 0 ? 1 : Math.sin(time * (0.5 + phase) + phase * 40);
                        let alpha = layer.alpha * (wave > 0.3 ? 1 : wave > -0.4 ? 0.7 : 0.4);

                        if (mouse.seen) {
                            const near = 1 - Math.hypot(mouse.x - (x + half), mouse.y - (y + half)) / GLOW_RADIUS;
                            if (near > 0) alpha += near * 0.6;
                        }

                        ctx.globalAlpha = Math.min(1, alpha);
                        ctx.fillStyle = COLORS[Math.floor(hash(col, row, li + 71) * COLORS.length)];
                        for (const [sx, sy] of sp.pixels) ctx.fillRect(x + sx * px, y + sy * px, px, px);
                    }
                }
            });
            ctx.globalAlpha = 1;
        };

        const tickField = (now) => {
            // Ease towards the real scroll position so the layers glide instead of jumping
            const target = window.scrollY;
            shownScroll = Math.abs(target - shownScroll) < 0.5 ? target : lerp(shownScroll, target, 0.14);

            const twinkleDue = !reducedMotion.matches && now - lastTwinkle > 110;
            if (shownScroll !== lastDrawn || twinkleDue || pointerMoved) {
                if (twinkleDue) lastTwinkle = now;
                lastDrawn = shownScroll;
                pointerMoved = false;
                drawField(now / 1000);
            }
            requestAnimationFrame(tickField);
        };

        resizeField();
        requestAnimationFrame(tickField);
        window.addEventListener('resize', resizeField);
        window.addEventListener('mousemove', () => { pointerMoved = true; }, { passive: true });
        [reducedMotion, smallScreen].forEach(query => query.addEventListener('change', () => { lastDrawn = -1; }));
    }

    // --- Scroll progress bar and hero parallax ---
    // The hero text drifts up and fades as you scroll away, and the photo lags a little behind it.
    // Only the `translate` property and opacity are touched, so the scroll-reveal transforms are left alone.
    const progressBar = document.getElementById('scrollProgress');
    const hero = document.getElementById('hero');
    const heroText = hero ? hero.querySelector('.hero-text') : null;
    const heroAvatar = hero ? hero.querySelector('.hero-avatar') : null;
    const heroCue = hero ? hero.querySelector('.scroll-cue') : null;
    const stackedHero = window.matchMedia('(max-width: 1024px)'); // the photo sits above the text here

    if (progressBar || hero) {
        const updateScrollEffects = () => {
            const scrollY = Math.max(0, window.scrollY);

            if (progressBar) {
                const range = document.documentElement.scrollHeight - window.innerHeight;
                progressBar.style.setProperty('--progress', range > 0 ? Math.min(1, scrollY / range).toFixed(4) : '0');
            }

            if (!hero) return;
            const strength = parallaxStrength();
            if (strength === 0) {
                [heroText, heroAvatar, heroCue].forEach(el => {
                    if (el) {
                        el.style.translate = '';
                        el.style.opacity = '';
                    }
                });
                return;
            }
            const heroEnd = Math.max(1, hero.offsetTop + hero.offsetHeight);
            const progress = Math.min(1, scrollY / heroEnd);
            const distance = Math.min(scrollY, heroEnd) * strength;
            if (heroText) {
                heroText.style.translate = `0 ${(-distance * 0.16).toFixed(1)}px`;
                heroText.style.opacity = (1 - Math.max(0, (progress - 0.2) / 0.7)).toFixed(3);
            }
            if (heroAvatar) {
                heroAvatar.style.translate = stackedHero.matches ? '' : `0 ${(distance * 0.14).toFixed(1)}px`;
                heroAvatar.style.opacity = (1 - Math.max(0, (progress - 0.35) / 0.6)).toFixed(3);
            }
            if (heroCue) heroCue.style.opacity = (1 - Math.min(1, progress * 6)).toFixed(3);
        };

        let effectsQueued = false;
        const queueScrollEffects = () => {
            if (effectsQueued) return;
            effectsQueued = true;
            requestAnimationFrame(() => {
                effectsQueued = false;
                updateScrollEffects();
            });
        };

        updateScrollEffects();
        window.addEventListener('scroll', queueScrollEffects, { passive: true });
        window.addEventListener('resize', queueScrollEffects);
        [reducedMotion, smallScreen, stackedHero].forEach(query => query.addEventListener('change', queueScrollEffects));
    }

    // --- Navigation: mark the link of the section on screen ---
    const sectionLinks = new Map();
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
        const section = document.getElementById(link.getAttribute('href').slice(1));
        if (section) sectionLinks.set(section, link);
    });
    if (sectionLinks.size) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                sectionLinks.forEach(link => link.classList.remove('active'));
                sectionLinks.get(entry.target).classList.add('active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sectionLinks.forEach((link, section) => sectionObserver.observe(section));
        // Above the first section (in the hero) no link is marked
        if (hero) {
            new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) sectionLinks.forEach(link => link.classList.remove('active'));
            }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
        }
    }

    // --- Projects carousel ---
    // Move between projects with the arrow buttons, the dots, the keyboard arrows, a swipe or
    // trackpad scroll, or by dragging with the mouse.
    const carousel = document.getElementById('projCarousel');
    if (carousel) {
        const slides = Array.from(carousel.querySelectorAll('.slide'));
        const prevBtn = document.getElementById('projPrev');
        const nextBtn = document.getElementById('projNext');
        const countEl = document.getElementById('projCount');
        const dotsEl = document.getElementById('projDots');
        const pad = (n) => String(n).padStart(2, '0');
        let current = 0;

        // Scroll position at which a slide sits at the left edge
        const slideLeft = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
        const nearestSlide = () => {
            let best = 0;
            slides.forEach((slide, i) => {
                if (Math.abs(slideLeft(i) - carousel.scrollLeft) < Math.abs(slideLeft(best) - carousel.scrollLeft)) best = i;
            });
            return best;
        };

        const dots = slides.map((slide, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', `Project ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            if (dotsEl) dotsEl.appendChild(dot);
            return dot;
        });

        const render = () => {
            slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
            dots.forEach((dot, i) => {
                dot.classList.toggle('is-active', i === current);
                dot.setAttribute('aria-current', i === current ? 'true' : 'false');
            });
            if (countEl) countEl.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
            if (prevBtn) prevBtn.disabled = current === 0;
            if (nextBtn) nextBtn.disabled = current === slides.length - 1;
        };

        function goTo(i) {
            current = Math.max(0, Math.min(slides.length - 1, i));
            render();
            carousel.scrollTo({ left: slideLeft(current), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }

        if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goTo(current + 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goTo(current - 1);
            }
        });

        // Swipes and trackpad scrolling move the strip themselves; follow along once it settles
        let settleTimer;
        carousel.addEventListener('scroll', () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
                if (drag.active) return;
                const nearest = nearestSlide();
                if (nearest !== current) {
                    current = nearest;
                    render();
                }
            }, 90);
        }, { passive: true });

        // Drag with the mouse (touch already scrolls natively)
        const drag = { active: false, moved: false, startX: 0, startScroll: 0 };
        carousel.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            drag.active = true;
            drag.moved = false;
            drag.startX = e.clientX;
            drag.startScroll = carousel.scrollLeft;
        });
        window.addEventListener('pointermove', (e) => {
            if (!drag.active) return;
            const dx = e.clientX - drag.startX;
            if (!drag.moved && Math.abs(dx) > 5) {
                drag.moved = true;
                carousel.classList.add('is-dragging');
            }
            if (drag.moved) carousel.scrollLeft = drag.startScroll - dx;
        });
        const endDrag = (e) => {
            if (!drag.active) return;
            drag.active = false;
            if (!drag.moved) return;
            const dx = e.clientX - drag.startX;
            // A decisive pull moves one project on; a small one settles on whichever is nearest
            const target = dx < -70 ? current + 1 : dx > 70 ? current - 1 : nearestSlide();
            // Leave the drag styling on until the glide starts, so scroll snapping does not jump first
            requestAnimationFrame(() => {
                goTo(target);
                carousel.classList.remove('is-dragging');
            });
        };
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
        // A drag that ends over a link must not open it
        carousel.addEventListener('click', (e) => {
            if (drag.moved) {
                e.preventDefault();
                e.stopPropagation();
                drag.moved = false;
            }
        }, true);

        window.addEventListener('resize', () => carousel.scrollTo({ left: slideLeft(current), behavior: 'auto' }));
        render();
    }

    // --- Interactive Click Effects ---
    const attachClickEffect = (selector, activeClass, duration) => {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('click', function (e) {
                // Remove class if it exists to allow re-triggering
                this.classList.remove(activeClass);
                // Trigger reflow
                void this.offsetWidth;
                this.classList.add(activeClass);
                setTimeout(() => {
                    this.classList.remove(activeClass);
                }, duration);
            });
        });
    };

    attachClickEffect('.effect-pop', 'pop-active', 150);
    attachClickEffect('.effect-spin-click', 'spin-active', 500);
    attachClickEffect('.effect-slide', 'slide-active', 200);
    attachClickEffect('.effect-bounce', 'bounce-active', 200);

    // Special Ripple Effect
    document.querySelectorAll('.effect-ripple').forEach(btn => {
        btn.addEventListener('click', function (e) {
            let x = e.clientX - e.target.getBoundingClientRect().left;
            let y = e.clientY - e.target.getBoundingClientRect().top;

            let ripples = document.createElement('span');
            ripples.className = 'ripple-element';
            ripples.style.left = x + 'px';
            ripples.style.top = y + 'px';

            const size = Math.max(this.clientWidth, this.clientHeight);
            ripples.style.width = size + 'px';
            ripples.style.height = size + 'px';
            ripples.style.transform = `translate(-50%, -50%) scale(0)`;

            this.appendChild(ripples);

            setTimeout(() => {
                ripples.remove();
            }, 600);
        });
    });

    // --- Language Switcher ---
    // English lives in the HTML itself. Each element's original markup is remembered on load,
    // so switching back to English restores exactly what the page shipped with (icons included).
    const translations = {
        zh: {
            // Home page
            logo: "汪塞<span class='accent'>.</span>",
            nav_about: "关于我",
            nav_projects: "项目展示",
            nav_blog: "博客",
            nav_contact: "联系我",
            hero_status: "开放工作机会",
            hero_greeting: "你好，我是",
            hero_name: "汪塞",
            hero_role: "创意开发者与设计师",
            hero_desc: "我致力于用代码与对细节的热情，构建具有交互性且兼具美感的数字体验。",
            hero_btn_work: "查看作品",
            about_title: "关于我",
            about_p1: "我是一名充满热情的开发者，专注于构建现代化的网络应用。我致力于创造不仅性能优异且视觉效果出众的网页体验。",
            about_p2: "带着对设计敏锐的眼光和对代码的热爱，我将美学与功能完美结合。欢迎来到我的数字简历。",
            skill_1: "JavaScript (ES6+)",
            skill_2: "HTML5 & UI/UX设计",
            skill_3: "原生 CSS 样式设计",
            skill_4: "交互式动画",
            projects_title: "精选作品",
            projects_hint: "拖动、滑动或点击箭头切换",
            project_view: "查看项目",
            hero_scroll: "向下滚动",
            project_1_title: "带我飞向月球 (ISD 60504)",
            project_1_desc: "基于 p5.js 和 ml5.js 开发的双人互动基于手势追踪的游戏。",
            project_2_title: "ChoraNomad - 3D 房间原型",
            project_2_desc: "用 Three.js 制作的雨夜街边玻璃共享工作间原型：预约、付款、扫码进门，并在 3D 空间里体验线上会议。",
            project_3_title: "AutoFigma-AppDesign（Figma 自动设计）",
            project_3_desc: "一个 Claude Code 技能：参考真实的 Behance 作品，在 Figma 里设计整个 iOS App，并避免“AI 味”。",
            bento_badge: "学习博客",
            bento_title: "我的学术进展",
            bento_desc: "深入了解我在泰莱大学（Taylor's University）期间的反思、项目文档以及创意发展过程。",
            bento_link: '阅读博客 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
            contact_title: "保持联系",
            contact_desc: "点击下方的按钮直接通过邮件与我联系。我会尽快回复您！",
            contact_submit: "邮件联系我",
            footer_text: "汪塞. 倾心打造.",

            // Project 1 page
            p1_back_btn: "返回精选作品",
            p1_subtitle: "一次关于交互式计算机视觉与数字物理的深度实践。",
            p1_play_now: "启动互动体验",
            p1_overview_title: "1. 项目背景",
            p1_overview_desc: "这是为泰莱大学 ISD 60504 课程开发的双人实时互动体验。项目探索了计算机视觉（CV）、数字物理模拟与沉浸式游戏设计的交汇点，拓展了基于网页的空间交互的可能性。",
            p1_role_label: "角色",
            p1_role_value: "创意开发者 & UI/UX 设计师",
            p1_stack_label: "技术栈",
            p1_timeline_label: "开发周期",
            p1_timeline_value: "4 周",
            p1_content_title: "核心机制",
            p1_content_p1_title: "玩家 1 (远征):",
            p1_content_p1_desc: "利用 Mediapipe/ML5 的低延迟手势追踪，操控火箭飞向月球轨道。",
            p1_content_p2_title: "玩家 2 (干预):",
            p1_content_p2_desc: "通过垂直方向的手势追踪控制防御 UFO，进行逻辑干扰。",
            p1_content_win_title: "获胜条件:",
            p1_content_win_desc: "玩家 1 必须保持 100% 的能量负载才能成功完成任务。",
            p1_tech_title: "技术架构",
            p1_tech_1_title: "1. 手势与坐标映射",
            p1_tech_1_desc: "为了确保低延迟响应，原始摄像头输入被转换并映射到归一化的游戏空间，并适配了镜像视角的空间人体工程学，让操作更直观。",
            p1_tech_2_title: "2. 动态运动学模拟",
            p1_tech_2_desc: "推进系统遵循经典运动学模型，其最大速度根据飞船的结构完好度（HP）动态计算得出。",
            p1_tech_3_title: "3. 状态驱动的场景切换",
            p1_tech_3_desc: "不同阶段（登月与返航）之间的切换由稳定的状态机管理，处理流畅的轨道动画与透视视角切换。",
            p1_launch_btn: "全屏启动体验",
            p1_footer_text: "汪塞. 精心打造.",
            p3_subtitle: "只要描述你想要的 App：它会研究三个真实的 Behance 案例，写出每个数值都有出处的设计规范，再在 Figma 里画出每一个页面。",
            p3_overview_desc: "如果只对 AI 说“设计一个健身 App”，得到的往往是训练数据的平均值：卡片套卡片、每个区块都有描边和阴影、紫蓝渐变、空洞的文案。<strong>figma-app-design-builder</strong> 反过来做：先向真实作品学习，把每个风格选择交给使用者决定，最后严格按约定的规则来设计。",
            p3_role_value: "作者：构思、技能设计与示例演练",
            p3_license_label: "许可证",
            p3_license_value: "MIT，开源",
            p3_flow_title: "2. 工作流程",
            p3_step0_title: "0 · 需求简述：",
            p3_step0_desc: "询问 App 的目标用户、必备功能和气质，起草页面地图并与你确认。",
            p3_step1_title: "1 · 在 Behance 选 3 个：",
            p3_step1_desc: "从“最受赞赏”“最多浏览”“最多讨论”三个榜单取前列作品，按热度打分，选出三个风格明显不同的。",
            p3_step2_title: "2 · 提取数值：",
            p3_step2_desc: "作品自带风格指南就直接采用；其余部分在“一格等于一个设计像素”的网格上实测。",
            p3_step3_title: "3 · DESIGN.md：",
            p3_step3_desc: "把三个作品逐项并排对比，每个数值都标明来源。",
            p3_step4_title: "4 · 你来选择：",
            p3_step4_desc: "2–3 轮选择题，每个选项都写明具体数值和出处。",
            p3_step5_title: "5 · Figma 页面：",
            p3_step5_desc: "先建立变量、文字样式和组件，再逐页绘制，并按 Apple HIG 与尼尔森十大可用性原则检查。",
            p3_step6_title: "6 · 走查审计：",
            p3_step6_desc: "把每个主要任务从头走到尾，报告单个页面看不出来的问题。",
            p3_feat_title: "3. 核心特性",
            p3_feat1_title: "每个结论都有出处：",
            p3_feat1_desc: "每个数值和判断都带标签：Behance 作品、实测、作者的风格指南、Apple HIG、尼尔森原则、使用者的选择，或者坦白标注的“AI 建议”。",
            p3_feat2_title: "三个辅助脚本：",
            p3_feat2_desc: "<code>rank_candidates.py</code> 给候选作品打分，<code>grid_extract.py</code> 按“一格一像素”测量页面，<code>contrast.py</code> 按 HIG 阈值检查 WCAG 对比度。",
            p3_feat3_title: "反“AI 味”清单：",
            p3_feat3_desc: "列出视觉、结构、文案、数据四类常见症状，以及优秀设计的替代做法；既是设计时的约束，也是审查清单。",
            p3_grid_caption: "grid_extract.py：对一个示例页面做网格总览与放大。",
            p3_install_title: "4. 安装与使用",
            p3_install_desc: "作为 Claude Code 插件安装，重启后直接描述你想要的 App 即可。需要 Claude Code、Figma MCP 服务器，以及用来读取 Behance 的浏览器工具。",
            p3_example_title: "5. 示例：Repwise",
            p3_example_desc: "仓库里附有 Repwise（一款演示用的力量训练记录 App）的完整演练：从 32 个候选中选出 3 个 Behance 参考、带出处的 DESIGN.md、18 个高保真 Figma 页面（含深色版本），以及修复了 8 个问题的走查审计。",
            p3_screens_caption: "示例 App 的关键页面（浅色模式）。",
            p3_dark_caption: "同样的页面（深色模式）。",
            p3_disclaimer: "独立项目，与 Apple、Adobe、Behance、Figma、Nielsen Norman Group 无关联，也未获其背书。Behance 作品归作者所有，本技能只研究版式规律和可测量的数值。",
            p3_github_btn: "在 GitHub 查看"
        }
    };

    const LANG_STORAGE_KEY = 'ws-portfolio-lang';
    const langToggleBtn = document.getElementById('langToggle');
    const i18nElements = document.querySelectorAll('[data-i18n]');
    const originalMarkup = new Map();
    i18nElements.forEach(el => originalMarkup.set(el, el.innerHTML));
    let currentLang = 'en';

    const applyLanguage = (lang) => {
        currentLang = lang;
        i18nElements.forEach(el => {
            const zhText = translations.zh[el.getAttribute('data-i18n')];
            el.innerHTML = (lang === 'zh' && zhText) ? zhText : originalMarkup.get(el);
        });
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        if (langToggleBtn) {
            langToggleBtn.textContent = lang === 'zh' ? '中文 / EN' : 'EN / 中文';
        }
    };

    // Remember the choice across reloads and pages (storage can be blocked, e.g. in private mode)
    const loadSavedLanguage = () => {
        try { return localStorage.getItem(LANG_STORAGE_KEY); } catch (e) { return null; }
    };
    const saveLanguage = (lang) => {
        try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) { /* not critical */ }
    };

    if (loadSavedLanguage() === 'zh') {
        applyLanguage('zh');
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            const nextLang = currentLang === 'en' ? 'zh' : 'en';
            applyLanguage(nextLang);
            saveLanguage(nextLang);
        });
    }

});
