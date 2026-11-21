// 给文档树文档添加颜色 + 同级置顶（适配思源 3.8+ 虚拟化文档树）
// 原脚本参考：https://github.com/yekavania/special-telegram
// 本版在用户 2026-11-21 的纯颜色版基础上增加“同级置顶”：
// - 不是原生“置顶”：原生置顶是全局置顶区（data/storage/pinned-docs.json），
//   会把文档提到文档面板最上面，与层级无关。
// - “同级置顶”是调用官方 /api/filetree/reorderDocs，把文档移到它所在
//   父目录的第一个同级位置，不跨级、不克隆、不改名。
// - 名字改成“同级置顶”只是为了和原生“置顶”区分开，改名本身不改变行为，
//   行为靠 reorderDocs 决定。
// - 前置条件：该父目录的排序方式要是“自定义排序”，否则按名称/时间排序
//   会立刻把它排回去。先在文档树里把排序切到自定义，再用这个菜单。
// 存储文件：颜色仍用 /data/storage/tree_colors.json / tree_colors_user_config.json
// 同级置顶不另存文件，顺序直接写进思源的 sort.json，随同步走。
(async () => {
    let colors = {
        "default": {
            "light": {
                "level-1": {"style": "color:#D32F2F;font-weight:bold;", "description": "最重要"},
                "level-2": {"style": "color:#FF5722;font-weight:bold;", "description": "较重要"},
                "level-3": {"style": "color:#FF9800;font-weight:bold;", "description": "重要"},
                "level-4": {"style": "color:#1976D2;font-weight:bold;", "description": "一般"},
                "level-5": {"style": "color:#4CAF50;font-weight:bold;", "description": "不重要"},
                "level-6": {"style": "color:#8BC34A;font-weight:bold;", "description": "较不重要"},
                "level-7": {"style": "color:#9E9E9E;font-weight:bold;", "description": "最不重要"},
                "---1": {},
                "now": {"style": "color:#1D4ED8;font-weight:bold;", "description": "NOW"},
                "important": {"style": "color:#B91C1C;font-weight:bold;", "description": "重要"},
                "completed": {"style": "color:#15803D;font-weight:bold;", "description": "完成"},
                "todo": {"style": "color:#D97706;font-weight:bold;", "description": "TODO"},
                "pass": {"style": "color:#8E8E8E;font-weight:bold;", "description": "PASS"},
                "like": {"style": "color:#9333EA;font-weight:bold;", "description": "喜欢"},
                "special": {"style": "color:#D946EF;font-weight:bold;", "description": "特别"},
                "---2": {},
                "draft": {"style": "color:#FF9800;font-weight:bold;", "description": "草稿"},
                "being_edited": {"style": "color:#9C27B0;font-weight:bold;", "description": "修改中"},
                "scheduled": {"style": "color:#2196F3;font-weight:bold;", "description": "待发布"},
                "published": {"style": "color:#4CAF50;font-weight:bold;", "description": "已发布"},
                "archived": {"style": "color:#9E9E9E;font-weight:bold;", "description": "存档"},
                "deleted": {"style": "color:#f6b6b2;font-weight:bold;text-decoration:line-through;", "description": "已删除"}
            },
            "dark": {
                "level-1": {"style": "color:#FF4444;font-weight:bold;", "description": "最重要"},
                "level-2": {"style": "color:#FF6F61;font-weight:bold;", "description": "较重要"},
                "level-3": {"style": "color:#FFB300;font-weight:bold;", "description": "重要"},
                "level-4": {"style": "color:#42A5F5;font-weight:bold;", "description": "一般"},
                "level-5": {"style": "color:#66BB6A;font-weight:bold;", "description": "不重要"},
                "level-6": {"style": "color:#689F38;font-weight:bold;", "description": "较不重要"},
                "level-7": {"style": "color:#757575;font-weight:bold;", "description": "最不重要"},
                "---1": {},
                "now": {"style": "color:#42A5F5;font-weight:bold;", "description": "NOW"},
                "important": {"style": "color:#FF5252;font-weight:bold;", "description": "重要"},
                "completed": {"style": "color:#66BB6A;font-weight:bold;", "description": "完成"},
                "todo": {"style": "color:#FFB300;font-weight:bold;", "description": "TODO"},
                "pass": {"style": "color:#8E8E8E;font-weight:bold;", "description": "PASS"},
                "like": {"style": "color:#E040FB;font-weight:bold;", "description": "喜欢"},
                "special": {"style": "color:#CE93D8;font-weight:bold;", "description": "特别"},
                "---2": {},
                "draft": {"style": "color:#FFB300;font-weight:bold;", "description": "草稿"},
                "being_edited": {"style": "color:#AB47BC;font-weight:bold;", "description": "修改中"},
                "scheduled": {"style": "color:#29B6F6;font-weight:bold;", "description": "待发布"},
                "published": {"style": "color:#66BB6A;font-weight:bold;", "description": "已发布"},
                "archived": {"style": "color:#B0BEC5;font-weight:bold;", "description": "存档"},
                "deleted": {"style": "color:#c07070;font-weight:bold;text-decoration:line-through;", "description": "已删除"}
            }
        }
    };

    const originColors = JSON.parse(JSON.stringify(colors));
    let colorData = safeParseJSON(await getFile('/data/storage/tree_colors.json') || '{}');
    if (colorData.code && colorData.code !== 0) colorData = {};
    let colorConfig = safeParseJSON(await getFile('/data/storage/tree_colors_user_config.json') || '{}');
    if (colorConfig.code && colorConfig.code !== 0) colorConfig = {};
    if (isEmptyObject(colorConfig)) {
        putFile('/data/storage/tree_colors_user_config.json', JSON.stringify(colors, null, 4));
    }
    let topData = safeParseJSON(await getFile('/data/storage/tree_same_level_top.json') || '{}');
    if (topData.code && topData.code !== 0) topData = {};
    genColors();
    genStyle();

    const treeSelector = isMobile() ? '#sidebar .b3-list--mobile' : '.sy__file';
    whenElementExist(treeSelector).then((fileTree) => {
        const onMenuShow = (event) => {
            const currLi = event.target.closest('li.b3-list-item:not([data-type="navigation-root"])');
            if (!currLi || !currLi.dataset.nodeId) return;
            window.siyuan.menus.menu.remove();
            whenElementExist('button[data-id="rename"]').then((renameBtn) => {
                if (document.querySelector('#sy_file_sp_color_top')) return;
                genSameLevelTopMenu(renameBtn, currLi);
                genColorMenus(renameBtn, currLi);
                genSeparator(renameBtn);
            }).catch(() => {});
        };
        if (isMobile()) {
            fileTree.addEventListener('touchend', (event) => {
                if (event.target.closest('span[data-type="more-file"]')) onMenuShow(event);
            });
        } else {
            fileTree.addEventListener('mouseup', (event) => {
                if (event.target.closest('span[data-type="more-file"]')) onMenuShow(event);
            });
            fileTree.addEventListener('contextmenu', onMenuShow);
        }
    }).catch(() => {});

    observeThemeChange(() => { genColors(); genStyle(); });

    setTimeout(() => {
        if (!window.siyuan?.ws?.ws) return;
        window.siyuan.ws.ws.addEventListener('message', async (event) => {
            let msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }
            if (msg.cmd === 'syncing' && msg.msg !== window.siyuan.languages._kernel[81]) {
                colorData = safeParseJSON(await getFile('/data/storage/tree_colors.json') || '{}');
                if (colorData.code && colorData.code !== 0) colorData = {};
                topData = safeParseJSON(await getFile('/data/storage/tree_same_level_top.json') || '{}');
                if (topData.code && topData.code !== 0) topData = {};
                genStyle();
            }
        });
    }, 5000);

    function safeParseJSON(text) {
        try { return JSON.parse(text || '{}'); } catch (e) { return {}; }
    }

    function genColors() {
        const mode = siyuan.config.appearance.mode === 0 ? 'light' : 'dark';
        const theme = siyuan.config.appearance.mode === 0 ? siyuan.config.appearance.themeLight : siyuan.config.appearance.themeDark;
        const defaultDefaultColors = originColors['default'][mode] || {};
        const defaultThemeColors = originColors[theme] ? (originColors[theme][mode] || {}) : {};
        const defaultColors = { ...defaultDefaultColors, ...defaultThemeColors };
        const userDefaultColors = colorConfig['default'] ? (colorConfig['default'][mode] || {}) : {};
        const userThemeColors = colorConfig[theme] ? (colorConfig[theme][mode] || {}) : {};
        const userColors = { ...userDefaultColors, ...userThemeColors };
        colors = !isEmptyObject(userColors) ? userColors : defaultColors;
    }

    // 同级置顶：调用官方 /api/filetree/reorderDocs，移到同父目录的第一个同级之前
    // 取消：同级置顶是一次真实移动，不是状态开关，所以要自己记“原来排在谁后面”，
    // 存在 /data/storage/tree_same_level_top.json，第二次点就按记录移回去。
    function genSameLevelTopMenu(beforeBtn, currLi) {
        const nodeId0 = currLi.dataset.nodeId;
        const label = topData[nodeId0] ? '取消同级置顶' : '同级置顶';
        const html = `<button data-id="sy-same-level-top" class="b3-menu__item"><svg class="b3-menu__icon"><use xlink:href="#iconUp"></use></svg><span class="b3-menu__label">${label}</span></button>`;
        beforeBtn.insertAdjacentHTML('beforebegin', html);
        const btn = beforeBtn.parentElement.querySelector('button[data-id="sy-same-level-top"]');
        if (!btn) return;
        btn.onclick = async () => {
            closeMenu();
            const nodeId = currLi.dataset.nodeId;
            if (!nodeId) { showMessage('同级置顶失败：取不到文档 ID', true); return; }
            console.log('[同级置顶] 点击', nodeId);
            try {
                let boxId = currLi.dataset.box || currLi.dataset.notebook || currLi.closest('[data-url]')?.dataset?.url || '';
                let path = currLi.dataset.path || '';
                if (!boxId || !path) {
                    const pathRes = await fetchPost('/api/filetree/getPathByID', { id: nodeId });
                    console.log('[同级置顶] getPathByID', pathRes);
                    if (pathRes?.code === 0 && pathRes?.data) {
                        boxId = boxId || pathRes.data.notebook || '';
                        path = path || pathRes.data.path || '';
                    }
                }
                if (!boxId || !path) { showMessage('同级置顶失败：无法获取文档所在笔记本或路径', true); return; }
                const parts = path.split('/').filter(Boolean);
                const parentPath = parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
                if (topData[nodeId]) {
                    const rec = topData[nodeId];
                    try {
                        if (rec.prevId) {
                            const r = await fetchPost('/api/filetree/reorderDocs', { sourceIDs: [nodeId], targetID: rec.prevId, position: 'after' });
                            if (r?.code !== 0) throw new Error(r?.msg || ('code ' + r?.code));
                        } else if (rec.nextId) {
                            const r = await fetchPost('/api/filetree/reorderDocs', { sourceIDs: [nodeId], targetID: rec.nextId, position: 'before' });
                            if (r?.code !== 0) throw new Error(r?.msg || ('code ' + r?.code));
                        }
                    } catch (cancelErr) {
                        // 原相邻文档被删/移走：reorder 会失败，别卡在“取消同级置顶”状态，清掉这条记录
                        delete topData[nodeId];
                        await putFile('/data/storage/tree_same_level_top.json', JSON.stringify(topData));
                        showMessage('取消失败：原相邻文档已删除/移动，已清除这条置顶记录', true);
                        return;
                    }
                    delete topData[nodeId];
                    await putFile('/data/storage/tree_same_level_top.json', JSON.stringify(topData));
                    showMessage('已取消同级置顶');
                    return;
                }
                if (parentPath !== '/') {
                    const parentId = parts[parts.length - 2].replace(/\.sy$/, '');
                    const sortRes = await fetchPost('/api/filetree/setDocSortMode', { id: parentId, sortMode: 6 });
                    console.log('[同级置顶] setDocSortMode', sortRes);
                    if (sortRes?.code !== 0) showMessage('注意：切自定义排序失败（' + (sortRes?.msg || sortRes?.code) + '），置顶可能排回去', true);
                } else {
                    showMessage('顶层文档：请先在笔记本上把排序切到“自定义排序”，否则置顶会被排回去', true);
                }
                const list = await fetchPost('/api/filetree/listDocsByPath', { notebook: boxId, path: parentPath });
                console.log('[同级置顶] listDocsByPath', list);
                const files = list?.data?.files || [];
                if (!files.length) { showMessage('同级置顶失败：同级列表为空', true); return; }
                const idx = files.findIndex(f => f.id === nodeId);
                if (idx === 0) { showMessage('已经在同级最上面了'); return; }
                const pendingTop = idx > 0 ? { prevId: files[idx - 1].id, nextId: files[idx + 1]?.id || null, parentPath, boxId } : null;
                const targetId = files[0].id;
                const res = await fetchPost('/api/filetree/reorderDocs', { sourceIDs: [nodeId], targetID: targetId, position: 'before' });
                console.log('[同级置顶] reorderDocs', res);
                if (res?.code !== 0) throw new Error(res?.msg || ('code ' + res?.code));
                if (res?.data?.changed === false) { showMessage('内核返回 changed=false，没移动：这个目录排序不是自定义，先手动切到自定义排序再试', true); return; }
                if (pendingTop) topData[nodeId] = pendingTop;
                await putFile('/data/storage/tree_same_level_top.json', JSON.stringify(topData));
                showMessage('同级置顶完成');
            } catch (e) {
                console.error('[同级置顶] 失败', e);
                showMessage('同级置顶失败：' + (e?.message || e), true);
            }
        };
    }

    function genColorMenus(beforeBtn, currLi) {
        const html = `<button data-id="sy-doc-color" class="b3-menu__item"><svg class="b3-menu__icon"><use xlink:href="#iconTheme"></use></svg><span class="b3-menu__label">文档颜色</span><svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg><div class="b3-menu__submenu"><div class="b3-menu__items"></div></div></button>`;
        beforeBtn.insertAdjacentHTML('beforebegin', html);
        const colorMenu = beforeBtn.parentElement.querySelector('button[data-id="sy-doc-color"]');
        let subMenus = '';
        const menuColors = colorData[currLi.dataset.nodeId]
            ? { none: { style: 'color:var(--b3-theme-on-background);', description: '取消颜色' }, ...colors }
            : { ...colors };
        for (const code in menuColors) {
            const item = menuColors[code];
            if (code.startsWith('---')) {
                subMenus += `<button data-id="separator_${code.replace('---', '').trim()}" class="b3-menu__separator"></button>`;
            } else {
                subMenus += `<button class="b3-menu__item" data-code="${code}"><span class="b3-menu__label" data-code="${code}" style="${item.style}">${item.description}</span></button>`;
            }
        }
        colorMenu.querySelector('.b3-menu__submenu .b3-menu__items').innerHTML = subMenus;
        colorMenu.onclick = (event) => {
            const target = event.target.closest('[data-code]');
            if (!target) return;
            const code = target.dataset.code;
            if (code === 'none') delete colorData[currLi.dataset.nodeId];
            else {
                if (!colors[code]) return;
                colorData[currLi.dataset.nodeId] = code;
            }
            putFile('/data/storage/tree_colors.json', JSON.stringify(colorData));
            genStyle();
            closeMenu();
        };
    }

    function genSeparator(beforeBtn) {
        const html = `<button data-id="separator_sy_color_top" id="sy_file_sp_color_top" class="b3-menu__separator"></button>`;
        beforeBtn.insertAdjacentHTML('beforebegin', html);
    }

    function genStyle() {
        let colorStyle = '';
        for (const docId in colorData) {
            if (!Object.prototype.hasOwnProperty.call(colorData, docId)) continue;
            const code = colorData[docId];
            if (!colors[code]?.style) continue;
            colorStyle += `:where(.sy__file, #sidebar .b3-list--mobile) li[data-node-id="${docId}"] span.b3-list-item__text { ${colors[code].style}; }\n`;
        }
        const id = 'sy_file_doc_top_color_style';
        let styleElement = document.getElementById(id);
        if (styleElement) styleElement.innerHTML = colorStyle;
        else {
            const newStyle = document.createElement('style');
            newStyle.id = id;
            newStyle.innerHTML = colorStyle;
            document.head.appendChild(newStyle);
        }
    }

    function whenElementExist(selector, node, timeout = 5000) {
        return new Promise((resolve, reject) => {
            let isResolved = false, requestId, timeoutId;
            const check = () => {
                try {
                    const el = typeof selector === 'function' ? selector() : (node || document).querySelector(selector);
                    if (el) { isResolved = true; cancelAnimationFrame(requestId); if (timeoutId) clearTimeout(timeoutId); resolve(el); }
                    else if (!isResolved) requestId = requestAnimationFrame(check);
                } catch (e) { isResolved = true; cancelAnimationFrame(requestId); clearTimeout(timeoutId); reject(e); }
            };
            check();
            timeoutId = setTimeout(() => { if (!isResolved) { isResolved = true; cancelAnimationFrame(requestId); reject(new Error('Timeout: ' + selector)); } }, timeout);
        });
    }

    async function fetchPost(url, data) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
        return res.json();
    }

    async function getFile(path) {
        return fetch('/api/file/getFile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
            .then((r) => { if (r.ok) return r.text(); throw new Error('Failed to get file'); }).catch(() => '{}');
    }

    async function putFile(path, content = '', isDir = false) {
        const formData = new FormData();
        formData.append('path', path); formData.append('isDir', isDir); formData.append('file', new Blob([content]));
        const result = await fetch('/api/file/putFile', { method: 'POST', body: formData });
        return result.json();
    }

    function showMessage(message, isError = false, delay = 7000) {
        return fetch('/api/notification/' + (isError ? 'pushErrMsg' : 'pushMsg'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg: message, timeout: delay }) });
    }

    function closeMenu() { window.siyuan.menus.menu.remove(); }
    function isMobile() { return !!document.getElementById('sidebar'); }
    function isEmptyObject(obj) { return obj == null || Object.keys(obj).length === 0; }

    function observeThemeChange(callback) {
        const targetElement = document.documentElement;
        const observer = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                if (mutation.type === 'attributes' && ['data-theme-mode', 'data-light-theme', 'data-dark-theme'].includes(mutation.attributeName)) {
                    callback(mutation.attributeName, targetElement.getAttribute(mutation.attributeName));
                }
            });
        });
        observer.observe(targetElement, { attributes: true, attributeFilter: ['data-theme-mode', 'data-light-theme', 'data-dark-theme'] });
    }
})();
