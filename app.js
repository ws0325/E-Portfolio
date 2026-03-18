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

    // --- Fetch Blog Posts (Blogger JSON Feed) ---
    async function loadBlogPosts() {
        const blogContainer = document.getElementById('blogContainer');
        if (!blogContainer) return;

        try {
            // Using Blogger's internal JSON feed alternative format
            const feedUrl = "https://wangsai0367388.blogspot.com/feeds/posts/default?alt=json&max-results=3";
            const response = await fetch(feedUrl);
            const data = await response.json();
            const entries = data.feed.entry || [];

            if (entries.length === 0) {
                blogContainer.innerHTML = `<p class="text-muted" data-i18n="blog_empty">No recent posts found.</p>`;
                return;
            }

            let htmlToInject = '';
            entries.forEach((entry, index) => {
                const title = entry.title.$t;
                // Parse date
                const publishedStr = entry.published.$t;
                const d = new Date(publishedStr);
                const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

                // Find link to post
                const linkObj = entry.link.find(l => l.rel === 'alternate');
                const postUrl = linkObj ? linkObj.href : '#';

                // Create minimal snippet from content
                const rawContent = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : "");
                // Strip HTML
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = rawContent;
                let textContent = tempDiv.textContent || tempDiv.innerText || "";
                textContent = textContent.slice(0, 80) + '...';

                htmlToInject += `
                    <div class="blog-card reveal" style="transition-delay: ${index * 0.1}s;">
                        <div class="blog-date">${dateStr}</div>
                        <h3><a href="${postUrl}" target="_blank">${title}</a></h3>
                        <p>${textContent}</p>
                        <a href="${postUrl}" target="_blank" class="blog-link effect-slide">Read More &rarr;</a>
                    </div>
                `;
            });

            blogContainer.innerHTML = htmlToInject;

            // Re-bind intersection observer and click interactions to new elements
            document.querySelectorAll('#blogContainer .reveal').forEach(el => revealObserver.observe(el));
            attachClickEffect('#blogContainer .effect-slide', 'slide-active', 200);

            // Make sure custom cursor hooks on new links
            document.querySelectorAll('#blogContainer a, #blogContainer .blog-card').forEach(el => {
                el.addEventListener('mouseenter', () => { customCursor.classList.add('hover-active'); glowDiv.style.width = '200px'; glowDiv.style.height = '200px'; glowDiv.style.background = 'radial-gradient(circle, rgba(255, 87, 34, 0.5) 0%, rgba(255, 87, 34, 0.15) 40%, transparent 80%)'; });
                el.addEventListener('mouseleave', () => { customCursor.classList.remove('hover-active'); glowDiv.style.width = '150px'; glowDiv.style.height = '150px'; glowDiv.style.background = 'radial-gradient(circle, rgba(255, 87, 34, 0.4) 0%, rgba(255, 87, 34, 0.1) 40%, transparent 80%)'; });
            });

        } catch (error) {
            console.error("Failed to fetch blog:", error);
            blogContainer.innerHTML = `<p class="text-muted">Error loading blog posts. Please check back later.</p>`;
        }
    }

    // Start fetch
    loadBlogPosts();

    // --- Interactive Click Effects ---
    const tiltElements = document.querySelectorAll('[data-tilt]');

    tiltElements.forEach(el => {
        el.addEventListener('mousemove', handleTilt);
        el.addEventListener('mouseleave', resetTilt);
    });

    function handleTilt(e) {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation based on cursor position relative to center
        // Tweak the divisor to increase/decrease tilt amount (higher = less tilt)
        const rotateX = ((centerY - y) / 10).toFixed(2);
        const rotateY = ((x - centerX) / 10).toFixed(2);

        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function resetTilt(e) {
        const el = e.currentTarget;
        el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        el.style.transition = 'transform 0.5s ease';

        // Remove the transition after it completes to not interfere with hover tracking
        setTimeout(() => {
            el.style.transition = '';
        }, 500);
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
    const translations = {
        en: {
            logo: "WS<span class='accent'>.</span>",
            nav_about: "About",
            nav_projects: "Projects",
            nav_blog: "Blog",
            nav_contact: "Contact",
            hero_greeting: "Hello, I'm",
            hero_name: "Wang Sai",
            hero_role: "Creative Developer & Designer",
            hero_desc: "I build interactive, aesthetically pleasing digital experiences crafted with precision and passion.",
            hero_btn_work: "View Work",
            hero_btn_contact: "Contact Me",
            about_title: "About Me",
            about_p1: "I am a passionate developer focusing on building modern web applications. I strive to create web experiences that are not only performant but also visually striking.",
            about_p2: "With an eye for design and a love for code, I bridge the gap between aesthetics and functionality. Welcome to my digital portfolio.",
            skill_1: "JavaScript (ES6+)",
            skill_2: "HTML5 & UI/UX",
            skill_3: "Vanilla CSS Styling",
            skill_4: "Interactive Animations",
            projects_title: "Selected Works",
            project_img1: "Project 1",
            project_1_title: "ISD 60504 - FLY ME To THE MOON",
            project_1_desc: "A 2-player interactive hand-tracking game using p5.js and ml5.js.",
            project_link: "View Details &rarr;",
            project_img2: "Project 2",
            project_2_title: "E-Commerce Interface",
            project_2_desc: "A modern shopping experience with seamless animations.",
            project_img3: "Project 3",
            project_3_title: "Immersive Landing Page",
            project_3_desc: "An interactive product landing page using web technologies.",
            blog_title: "Taylor's Journey",
            bento_badge: "Learning Blog",
            bento_title: "My Academic Progress",
            bento_desc: "Dive into my reflections, project documentation, and creative process developed during my time at Taylor's University.",
            bento_link: 'Explore Blog <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            contact_title: "Let's Connect",
            contact_desc: "Click the button below to send me an email directly. I'll try my best to get back to you!",
            contact_submit: "Email Me",
            contact_success: "Message sent! (Simulation)",
            footer_text: "Wang Sai. Built with passion.",
            // Project 1 specific translations
            p1_back_btn: "Back to Selected Works",
            p1_play_now: "Play Now",
            p1_overview_title: "1. Project Overview & Context",
            p1_overview_desc: "A real-time interactive 2-player experience developed for the ISD 60504 curriculum at Taylor's University. The project explores the intersection of computer vision (CV), digital physics, and immersive game design.",
            p1_content_title: "Core Mechanics",
            p1_content_p1_title: "Player 1 (Expedition):",
            p1_content_p1_desc: "Leverages hand-tracking via Mediapipe/ML5 to navigate a rocket towards Lunar orbit.",
            p1_content_p2_title: "Player 2 (Intervention):",
            p1_content_p2_desc: "Utilizes vertical hand-tracking to control a defensive UFO, employing logic-based interference.",
            p1_content_win_title: "Win Condition:",
            p1_content_win_desc: "Player 1 must maintain 100% capacity to successfully complete the mission.",
            p1_tech_title: "Technical Architecture & Implementation",
            p1_tech_1_title: "1. Gesture-to-Coordinate Mapping",
            p1_tech_1_desc: "To ensure low-latency responsiveness, raw webcam input is transformed into a normalized game-space, accommodating mirror-view ergonomics.",
            p1_tech_2_title: "2. Dynamic Kinematics & Physics Simulation",
            p1_tech_2_desc: "The propulsion system follows classical kinetic models, where maximum velocity is dynamically calculated as a function of the vessel's integrity (HP).",
            p1_tech_3_title: "3. State-Driven Scene Transitions",
            p1_tech_3_desc: "Transitions between Phases (Lunar Approach vs. Earth Return) are managed via a robust state machine, handling seamless orbit animations and perspective shifts.",
            p1_tech_3_list_1_title: "Phase 1:",
            p1_tech_3_list_1_desc: "Primary objective involves navigation and collection.",
            p1_tech_3_list_2_title: "Orbit:",
            p1_tech_3_list_2_desc: "Automated orbital mechanics provide an immersive perspective transition.",
            p1_tech_3_list_3_title: "Phase 2:",
            p1_tech_3_list_3_desc: "Emergency Earth return under high-stakes intervention.",
            p1_launch_btn: "Launch Game Fullscreen"
        },
        zh: {
            logo: "汪塞<span class='accent'>.</span>",
            nav_about: "关于我",
            nav_projects: "项目展示",
            nav_blog: "博客",
            nav_contact: "联系我",
            hero_greeting: "你好，我是",
            hero_name: "汪塞",
            hero_role: "创意开发者与设计师",
            hero_desc: "我致力于用代码与对细节的热情，构建具有交互性且兼具美感的数字体验。",
            hero_btn_work: "查看作品",
            hero_btn_contact: "联系我",
            about_title: "关于我",
            about_p1: "我是一名充满热情的开发者，专注于构建现代化的网络应用。我致力于创造不仅性能优异且视觉效果出众的网页体验。",
            about_p2: "带着对设计敏锐的眼光和对代码的热爱，我将美学与功能完美结合。欢迎来到我的数字简历。",
            skill_1: "JavaScript (ES6+)",
            skill_2: "HTML5 & UI/UX设计",
            skill_3: "原生 CSS 样式设计",
            skill_4: "交互式动画",
            projects_title: "精选作品",
            project_img1: "项目 一",
            project_1_title: "带我飞向月球 (ISD 60504)",
            project_1_desc: "基于 p5.js 和 ml5.js 开发的双人互动基于手势追踪的游戏。",
            project_link: "查看详情 &rarr;",
            project_img2: "项目 二",
            project_2_title: "电商交互界面",
            project_2_desc: "一个具有流畅动画的现代购物体验网。",
            project_img3: "项目 三",
            project_3_title: "沉浸式着陆页",
            project_3_desc: "采用现代网页技术打造的交互式产品着陆页。",
            blog_title: "泰莱大学之旅",
            bento_badge: "学习博客",
            bento_title: "我的学术进展",
            bento_desc: "深入了解我在泰莱大学（Taylor's University）期间的反思、项目文档以及创意发展过程。",
            bento_link: '阅读博客 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            contact_title: "保持联系",
            contact_desc: "点击下方的按钮直接通过邮件与我联系。我会尽快回复您！",
            contact_submit: "邮件联系我",
            contact_success: "留言成功发送！（演示）",
            footer_text: "汪塞. 倾心打造.",
            // 项目 1 专用翻译
            p1_back_btn: "返回精选作品",
            p1_play_now: "立即开始",
            p1_overview_title: "1. 项目概览与背景",
            p1_overview_desc: "这是为泰莱大学 ISD 60504 课程开发的多人实时交互体验。该项目探索了计算机视觉（CV）、数字物理模拟与沉浸式游戏设计的交汇点。",
            p1_content_title: "核心机制",
            p1_content_p1_title: "玩家 1 (远征):",
            p1_content_p1_desc: "利用 Mediapipe/ML5 手势追踪技术，操控飞船向月球轨道进发。",
            p1_content_p2_title: "玩家 2 (干预):",
            p1_content_p2_desc: "通过垂直方向的手势追踪控制防御 UFO，进行逻辑干扰。",
            p1_content_win_title: "获胜条件:",
            p1_content_win_desc: "玩家 1 必须保持 100% 的能量负载才能成功完成任务。",
            p1_tech_title: "技术架构与实现",
            p1_tech_1_title: "1. 手势与坐标映射",
            p1_tech_1_desc: "为了确保低延迟响应，原始摄像头输入被转换并映射到归一化的游戏空间，并适配了镜像视觉人体工程学。",
            p1_tech_2_title: "2. 动态运动学与物理模拟",
            p1_tech_2_desc: "推进系统遵循经典运动学模型，其最大速度根据飞船的完好度（HP）动态计算得出。",
            p1_tech_3_title: "3. 状态驱动的场景切换",
            p1_tech_3_desc: "不同阶段（登月与返航）之间的切换由稳定的状态机管理，处理流畅的轨道动画与透视视角切换。",
            p1_tech_3_list_1_title: "第一阶段:",
            p1_tech_3_list_1_desc: "主要目标涉及航行与球体收集。",
            p1_tech_3_list_2_title: "轨道阶段:",
            p1_tech_3_list_2_desc: "自动化的轨道力学计算提供沉浸式的视角过渡动画。",
            p1_tech_3_list_3_title: "第二阶段:",
            p1_tech_3_list_3_desc: "在高压干预下的紧急返航阶段。",
            p1_launch_btn: "全屏启动游戏"
        }
    };

    let currentLang = 'en';
    const langToggleBtn = document.getElementById('langToggle');

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'zh' : 'en';
            langToggleBtn.textContent = currentLang === 'en' ? 'EN / 中文' : '中文 / EN';

            // Update all translatable elements (innerHTML)
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[currentLang][key]) {
                    el.innerHTML = translations[currentLang][key]; // use innerHTML to support span.accent
                }
            });

            // Update inputs with placeholder translations
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (translations[currentLang][key]) {
                    el.setAttribute('placeholder', translations[currentLang][key]);
                }
            });
        });
    }

    // Initial call to set correct placeholders on load just in case
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.setAttribute('placeholder', translations[currentLang][key]);
        }
    });

    // Handle Direct Email Tracker (Optional - No form to handle now)

});
