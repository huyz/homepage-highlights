/**
 * 2025-07-13 Second version by @CV8R at https://github.com/gethomepage/homepage/discussions/4619#discussioncomment-13747561
 */

function WatchItem(service, container, threshold) {
    this.service = service;
    this.container = container;

    // Parse operator and value from the threshold string, e.g., ">0"
    const match = threshold.match(/(==|!=|>=|<=|>|<)(.+)/);
    if (!match) throw new Error(`Invalid threshold format: ${threshold}`);

    this.operator = match[1];
    this.threshold = match[2].trim();
}

const watchItems = [
    new WatchItem('UPS', 0, "!=On-Line"),
    new WatchItem('UPS', 1, ">80"),
    new WatchItem('UPS', 2, "<100"),
    new WatchItem('UPS', 3, ">40"),
    new WatchItem('Proxmox PBS1', 0, ">80"),
    new WatchItem('Proxmox PBS1', 1, ">0"),
    new WatchItem('Proxmox PBS1', 2, ">80"),
    new WatchItem('Proxmox PBS1', 3, ">80"),
    new WatchItem('Proxmox Cluster', 2, ">80"),
    new WatchItem('Proxmox Cluster', 3, ">80"),
    new WatchItem('TrueNAS', 2, ">0"),
    new WatchItem('BackupTrueNAS', 2, ">0"),
    new WatchItem('Portainer Docker PVE VM1', 1, ">0"),
    new WatchItem('Portainer Docker PVE VM2', 1, ">0"),
    new WatchItem('Portainer Docker TN VM1', 1, ">0"),
    new WatchItem('Portainer Docker TN VM2', 1, ">0"),
    new WatchItem('Zabbix', 2, ">0"),
    new WatchItem('Zabbix', 3, ">0"),
];

function compareValues(current, threshold, operator) {
    // Try to coerce to numbers; fallback to strings
    const numCurrent = parseFloat(current);
    const numThreshold = parseFloat(threshold);

    const useNumbers = !isNaN(numCurrent) && !isNaN(numThreshold);

    const a = useNumbers ? numCurrent : current;
    const b = useNumbers ? numThreshold : threshold;

    switch (operator) {
        case "==": return a == b;
        case "!=": return a != b;
        case ">":  return a > b;
        case "<":  return a < b;
        case ">=": return a >= b;
        case "<=": return a <= b;
        default:
            console.error(`Unsupported operator: ${operator}`);
            return false;
    }
}

async function observeItem(item) {
    await waitForItem(item);

    item.element = document
        .querySelector(`[data-name='${item.service}']`)
        .querySelector(".service-container")
        .children[item.container];

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            const currentValue = mutation.target.data;

            if (compareValues(currentValue, item.threshold, item.operator)) {
                item.element.classList.add("fail-bg");
            } else {
                item.element.classList.remove("fail-bg");
            }
        });
    });

    observer.observe(item.element, { subtree: true, characterData: true });
}

function waitForItem(item) {
    return new Promise(resolve => {
        const observer = new MutationObserver(() => {
            const container = document.querySelector(`[data-name='${item.service}']`)?.querySelector(".service-container");
            if (container) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Start observers
watchItems.forEach(observeItem);
