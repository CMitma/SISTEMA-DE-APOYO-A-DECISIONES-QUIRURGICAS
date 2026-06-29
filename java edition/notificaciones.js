// ==========================================
// NOTIFICACIONES
// ==========================================
function initNotificaciones() {

    const btnNotif = document.getElementById('btn-notificaciones');
    const dropdown = document.getElementById('notif-dropdown');
    const badge = document.getElementById('notif-badge-count');
    const notifItems = document.querySelectorAll('.notif-item');
    const filterAll = document.getElementById('filter-all');
    const filterUnread = document.getElementById('filter-unread');
    const btnOptions = document.getElementById('btn-notif-options');
    const menuOptions = document.getElementById('notif-options-menu');
    const btnMarkRead = document.getElementById('btn-mark-all-read');

    btnNotif.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); menuOptions.classList.add('hidden'); });
    btnOptions.addEventListener('click', (e) => { e.stopPropagation(); menuOptions.classList.toggle('hidden'); });

    function updateNotifVisibility() {
        const isUnreadFilter = filterUnread.classList.contains('active');
        const showCriticalOnly = document.getElementById('check-alertas-criticas').checked;
        let visibleCount = 0;
        notifItems.forEach(item => {
            const isUnread = item.classList.contains('unread');
            const isCritical = item.classList.contains('critical-alert');
            let shouldShow = true;
            if (isUnreadFilter && !isUnread) shouldShow = false;
            if (showCriticalOnly && !isCritical) shouldShow = false;
            item.style.display = shouldShow ? 'flex' : 'none';
            if (isUnread && shouldShow && !showCriticalOnly) visibleCount++;
            if (isUnread && showCriticalOnly && isCritical) visibleCount++;
        });
    }

    filterAll.addEventListener('click', (e) => { e.stopPropagation(); filterAll.classList.add('active'); filterUnread.classList.remove('active'); updateNotifVisibility(); });
    filterUnread.addEventListener('click', (e) => { e.stopPropagation(); filterUnread.classList.add('active'); filterAll.classList.remove('active'); updateNotifVisibility(); });

    btnMarkRead.addEventListener('click', (e) => {
        e.stopPropagation();
        notifItems.forEach(i => i.classList.remove('unread'));
        badge.style.display = 'none';
        menuOptions.classList.add('hidden');
        updateNotifVisibility();
    });

    notifItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            if(this.classList.contains('unread')) {
                this.classList.remove('unread');
                let c = parseInt(badge.textContent);
                if(c > 0) { c--; badge.textContent = c; if(c===0) badge.style.display = 'none'; }
                updateNotifVisibility();
            }
            dropdown.classList.add('hidden');
        });
    });

    return { dropdown, menuOptions, updateNotifVisibility };
}
