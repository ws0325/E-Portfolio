document.addEventListener('DOMContentLoaded', () => {

    // --- Modern Fluid & Magnetic Cursor Logic ---
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');

    let mouse = { x: -100, y: -100 }; // Start off-screen
    let ringPos = { x: -100, y: -100 };
    let isHovering = false;

    // Smooth lerp function
    const lerp = (start, end, amount) => (1 - amount) * start + amount * end;

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // Immediate dot position
        if (cursorDot) {
            cursorDot.style.left = `${mouse.x}px`;
            cursorDot.style.top = `${mouse.y}px`;
        }

        // Update CSS variables for Bento card spotlights
        // We do this globally to avoid too many listeners
        const cards = document.querySelectorAll('.bento-card, .btn');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // Hide/Show cursor on window leave/enter
    document.addEventListener('mouseleave', () => {
        cursorDot.classList.add('cursor-hidden');
        cursorRing.classList.add('cursor-hidden');
    });
    document.addEventListener('mouseenter', () => {
        cursorDot.classList.remove('cursor-hidden');
        cursorRing.classList.remove('cursor-hidden');
    });

    // Animation loop for the ring (Fluid lag effect)
    function animateCursor() {
        // Smoothly follow the mouse
        ringPos.x = lerp(ringPos.x, mouse.x, 0.15);
        ringPos.y = lerp(ringPos.y, mouse.y, 0.15);

        if (cursorRing) {
            cursorRing.style.left = `${ringPos.x}px`;
            cursorRing.style.top = `${ringPos.y}px`;
        }

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover interactions for all links and buttons
    const interactive = document.querySelectorAll('a, button, .bento-card, .effect-scale');
    interactive.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorRing.classList.add('active');
            cursorDot.classList.add('active');
        });
        el.addEventListener('mouseleave', () => {
            cursorRing.classList.remove('active');
            cursorDot.classList.remove('active');
        });
    });

    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

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

    // --- Motion settings shared by the scroll parallax and the particles ---
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const smallScreen = window.matchMedia('(max-width: 768px)');
    // Parallax strength: full on desktop, half on phones, off when the visitor asks for reduced motion
    const parallaxStrength = () => (reducedMotion.matches ? 0 : (smallScreen.matches ? 0.5 : 1));

    // --- Scroll Parallax: background grid depth + hero layers ---
    // Only inner layers move (through the `translate` property, a CSS variable and opacity), so the
    // cards' own hover lift and the scroll-reveal transforms are left untouched.
    const bgGrid = document.querySelector('.bg-grid');
    const hero = document.getElementById('hero');
    const heroBg = hero ? hero.querySelector('.hero-node-bg') : null;
    const heroContent = hero ? hero.querySelector('.hero-bento-split') : null;
    const heroAvatar = hero ? hero.querySelector('.premium-avatar-container') : null;
    const stackedHero = window.matchMedia('(max-width: 1024px)'); // the avatar sits above the text here
    const GRID_PARALLAX = 0.2; // the dot grid follows 20% of the scroll
    const GRID_TILE = 40;      // must match the grid's background-size in styles.css

    if (bgGrid || hero) {
        let heroEnd = 1;           // scroll position where the hero has fully left the screen
        let lastHeroDistance = -1;

        const measureHero = () => {
            if (hero) heroEnd = Math.max(1, hero.offsetTop + hero.offsetHeight);
            lastHeroDistance = -1;
        };

        const clearParallax = () => {
            if (bgGrid) bgGrid.style.removeProperty('--grid-shift');
            [heroBg, heroContent, heroAvatar].forEach(el => {
                if (el) {
                    el.style.translate = '';
                    el.style.opacity = '';
                }
            });
            lastHeroDistance = -1;
        };

        const updateParallax = () => {
            const strength = parallaxStrength();
            if (strength === 0) {
                clearParallax();
                return;
            }
            const scrollY = Math.max(0, window.scrollY);

            if (bgGrid) {
                // Slide within one tile: the pattern repeats, so it reads as endless slow movement
                const shift = (scrollY * GRID_PARALLAX * strength) % GRID_TILE;
                bgGrid.style.setProperty('--grid-shift', `${-shift}px`);
            }

            // Once the hero is off screen its layers stay where they are
            const distance = Math.min(scrollY, heroEnd) * strength;
            if (hero && distance !== lastHeroDistance) {
                lastHeroDistance = distance;
                // The node graph lags furthest behind, the avatar a little; the text floats up and fades
                if (heroBg) heroBg.style.translate = `0 ${(distance * 0.45).toFixed(1)}px`;
                if (heroAvatar) {
                    heroAvatar.style.translate = stackedHero.matches ? '' : `0 ${(distance * 0.2).toFixed(1)}px`;
                }
                if (heroContent) {
                    heroContent.style.translate = `0 ${(-distance * 0.1).toFixed(1)}px`;
                    const progress = Math.min(1, scrollY / heroEnd);
                    const fade = Math.min(1, Math.max(0, (progress - 0.25) / 0.75));
                    heroContent.style.opacity = (1 - fade * 0.85).toFixed(3);
                }
            }
        };

        let parallaxQueued = false;
        const queueParallax = () => {
            if (parallaxQueued) return;
            parallaxQueued = true;
            requestAnimationFrame(() => {
                parallaxQueued = false;
                updateParallax();
            });
        };
        const remeasure = () => {
            measureHero();
            queueParallax();
        };

        measureHero();
        updateParallax();
        window.addEventListener('scroll', queueParallax, { passive: true });
        window.addEventListener('resize', remeasure);
        [reducedMotion, smallScreen, stackedHero].forEach(query => query.addEventListener('change', remeasure));
    }

    // --- Background Particles ---
    // Slow-drifting dots in three depth layers, with faint links between neighbours of the same layer
    // (echoing the hero node graph). When scrolling, far layers follow less of the scroll than near ones.
    const particleCanvas = document.getElementById('bg-particles');

    if (particleCanvas && particleCanvas.getContext) {
        const ctx = particleCanvas.getContext('2d');
        const LINK_DISTANCE = 130;
        const WRAP_MARGIN = 10;
        // Far to near: share of the dots, how much of the scroll the layer follows, dot size and brightness
        const DEPTH_LAYERS = [
            { share: 0.5, parallax: 0.08, rMin: 0.4, rMax: 0.9, alpha: 0.25 },
            { share: 0.3, parallax: 0.18, rMin: 0.7, rMax: 1.4, alpha: 0.4 },
            { share: 0.2, parallax: 0.32, rMin: 1.2, rMax: 2.0, alpha: 0.6 }
        ];
        let particles = [];
        let viewW = 0;
        let viewH = 0;
        let rafId = 0;

        const pickLayer = () => {
            let roll = Math.random();
            for (const layer of DEPTH_LAYERS) {
                if (roll < layer.share) return layer;
                roll -= layer.share;
            }
            return DEPTH_LAYERS[0];
        };

        // Keep a coordinate on screen (plus a small margin) by wrapping it around the edges
        const wrap = (value, size) => {
            const span = size + WRAP_MARGIN * 2;
            return ((value + WRAP_MARGIN) % span + span) % span - WRAP_MARGIN;
        };

        const setupParticles = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            // Use the canvas's displayed size (the viewport minus any scrollbar)
            viewW = particleCanvas.clientWidth;
            viewH = particleCanvas.clientHeight;
            particleCanvas.width = Math.round(viewW * dpr);
            particleCanvas.height = Math.round(viewH * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Scale the count with screen area so phones stay light
            const count = Math.min(70, Math.round((viewW * viewH) / 20000));
            particles = Array.from({ length: count }, () => {
                const layer = pickLayer();
                return {
                    x: Math.random() * viewW,
                    y: Math.random() * viewH,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    r: layer.rMin + Math.random() * (layer.rMax - layer.rMin),
                    layer,
                    accent: Math.random() < 0.15,
                    sy: 0 // on-screen y after the scroll parallax
                };
            });
        };

        const drawParticles = () => {
            // Each layer follows its own share of the scroll; wrapping keeps the screen filled
            const scrollShift = Math.max(0, window.scrollY) * parallaxStrength();
            for (const p of particles) {
                p.sy = wrap(p.y - scrollShift * p.layer.parallax, viewH);
            }

            ctx.clearRect(0, 0, viewW, viewH);

            // Faint lines between nearby particles of the same layer (nearer layers a bit brighter)
            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    if (a.layer !== b.layer) continue;
                    const dist = Math.hypot(a.x - b.x, a.sy - b.sy);
                    if (dist < LINK_DISTANCE) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * a.layer.alpha * (1 - dist / LINK_DISTANCE)})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.sy);
                        ctx.lineTo(b.x, b.sy);
                        ctx.stroke();
                    }
                }
            }

            // Dots: bigger and brighter the nearer the layer, a few of them in the accent orange
            for (const p of particles) {
                const alpha = p.accent ? Math.min(1, p.layer.alpha * 1.5) : p.layer.alpha;
                ctx.fillStyle = p.accent ? `rgba(255, 87, 34, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.sy, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const moveParticles = () => {
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                // Wrap around the screen edges
                if (p.x < -10) p.x = viewW + 10;
                else if (p.x > viewW + 10) p.x = -10;
                if (p.y < -10) p.y = viewH + 10;
                else if (p.y > viewH + 10) p.y = -10;
            }
        };

        const tick = () => {
            moveParticles();
            drawParticles();
            rafId = requestAnimationFrame(tick);
        };

        // Visitors who ask for reduced motion get a still frame instead of an animation
        const startParticles = () => {
            cancelAnimationFrame(rafId);
            if (reducedMotion.matches) {
                drawParticles();
            } else {
                rafId = requestAnimationFrame(tick);
            }
        };

        setupParticles();
        startParticles();
        reducedMotion.addEventListener('change', startParticles);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                setupParticles();
                if (reducedMotion.matches) drawParticles();
            }, 200);
        });
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
            project_1_title: "带我飞向月球 (ISD 60504)",
            project_1_desc: "基于 p5.js 和 ml5.js 开发的双人互动基于手势追踪的游戏。",
            project_2_title: "ChoraNomad - 3D 房间原型",
            project_2_desc: "用 Three.js 制作的街边玻璃共享工作间原型：预约、付款、扫码进门，并在 3D 空间里体验线上会议。",
            project_3_title: "AutoFigma-AppDesign（Figma 自动设计）",
            project_3_desc: "一个 Claude Code 技能：参考真实的 Behance 作品，在 Figma 里设计整个 iOS App，并避免“AI 味”。",
            bento_badge: "学习博客",
            bento_title: "我的学术进展",
            bento_desc: "深入了解我在泰莱大学（Taylor's University）期间的反思、项目文档以及创意发展过程。",
            bento_link: '阅读博客 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
